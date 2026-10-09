import { Injectable, inject } from '@angular/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export interface Periode {
    readonly id: string;
    readonly anneeId: string;
    readonly libelle: string;
    readonly ordre: number;
    readonly dateDebut: string;
    readonly dateFin: string;
    readonly cloturee: boolean;
}

export interface Annee {
    readonly id: string;
    readonly libelle: string;
    readonly dateDebut: string;
    readonly dateFin: string;
    readonly active: boolean;
    /** Triées par ordre. */
    readonly periodes: readonly Periode[];
}

/** Saisie d'une année ou d'une période (dates `AAAA-MM-JJ`). */
export interface SaisieDates {
    readonly libelle: string;
    readonly dateDebut: string;
    readonly dateFin: string;
}

export interface SaisiePeriode extends SaisieDates {
    readonly ordre: number;
}

export type ModelePeriodes = 'trimestres' | 'semestres';

/** Erreur traduite de la structure scolaire (clé `structure.erreurs.*`). */
export class ErreurStructure extends Error {
    constructor(readonly cle: string) {
        super(cle);
    }
}

const MESSAGES_METIER = new Set([
    'periode_hors_annee',
    'periodes_chevauchement',
    'periode_cloturee',
    'annee_active',
    'autre_daara',
    'enseignant_invalide',
    'matiere_archivee',
]);

export function erreurStructure(erreur: { code?: string; message?: string } | null): ErreurStructure {
    const message = erreur?.message ?? '';
    switch (erreur?.code) {
        case '42501':
            return new ErreurStructure('structure.erreurs.droits');
        case '23505':
            return new ErreurStructure('structure.erreurs.doublon');
        case '23503':
            return new ErreurStructure('structure.erreurs.utilisee');
        case '23514':
            if (MESSAGES_METIER.has(message)) {
                return new ErreurStructure(`structure.erreurs.${message}`);
            }
            if (message.includes('_coefficient_check')) {
                return new ErreurStructure('structure.erreurs.coefficient');
            }
            return new ErreurStructure(message.includes('_dates_check') ? 'structure.erreurs.dates' : 'structure.erreurs.donnee_invalide');
        default:
            return new ErreurStructure('structure.erreurs.inattendue');
    }
}

/**
 * Découpe une année en périodes contiguës de durées égales (modèles « 3 trimestres » / « 2 semestres ») ; dates
 * modifiables ensuite. Fonction pure, dates au format `AAAA-MM-JJ` (calcul en UTC).
 */
export function periodesModele(annee: Pick<Annee, 'dateDebut' | 'dateFin'>, modele: ModelePeriodes, libelle: (n: number) => string): SaisiePeriode[] {
    const n = modele === 'trimestres' ? 3 : 2;
    const jour = 86_400_000;
    const debut = Date.parse(`${annee.dateDebut}T00:00:00Z`);
    const fin = Date.parse(`${annee.dateFin}T00:00:00Z`);
    const jours = Math.round((fin - debut) / jour) + 1;
    const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
    return Array.from({ length: n }, (_, i) => {
        const d = debut + Math.floor((jours * i) / n) * jour;
        const f = i === n - 1 ? fin : debut + (Math.floor((jours * (i + 1)) / n) - 1) * jour;
        return { libelle: libelle(i + 1), ordre: i + 1, dateDebut: iso(d), dateFin: iso(f) };
    });
}

/**
 * Années scolaires et périodes de la daara ouverte (S3.1, module `structure`). Écritures directes sous RLS (admin aal2,
 * module actif) ; l'année active change uniquement par la RPC `activer_annee`.
 */
@Injectable({ providedIn: 'root' })
export class AnneesService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);

    async lister(): Promise<Annee[]> {
        const { data, error } = await this.sb
            .from('annees_scolaires')
            .select('id, libelle, date_debut, date_fin, active, periodes(id, annee_id, libelle, ordre, date_debut, date_fin, cloturee)')
            .eq('daara_id', this.daaraId())
            .order('date_debut', { ascending: false });
        if (error) {
            throw erreurStructure(error);
        }
        return data.map((a) => ({
            id: a.id,
            libelle: a.libelle,
            dateDebut: a.date_debut,
            dateFin: a.date_fin,
            active: a.active,
            periodes: a.periodes
                .map((p) => ({
                    id: p.id,
                    anneeId: p.annee_id,
                    libelle: p.libelle,
                    ordre: p.ordre,
                    dateDebut: p.date_debut,
                    dateFin: p.date_fin,
                    cloturee: p.cloturee,
                }))
                .sort((x, y) => x.ordre - y.ordre),
        }));
    }

    async creerAnnee(s: SaisieDates): Promise<void> {
        const { error } = await this.sb
            .from('annees_scolaires')
            .insert({ daara_id: this.daaraId(), libelle: s.libelle, date_debut: s.dateDebut, date_fin: s.dateFin });
        if (error) {
            throw erreurStructure(error);
        }
    }

    async modifierAnnee(id: string, s: SaisieDates): Promise<void> {
        const { data, error } = await this.sb
            .from('annees_scolaires')
            .update({ libelle: s.libelle, date_debut: s.dateDebut, date_fin: s.dateFin })
            .eq('id', id)
            .select('id');
        this.verifier(data, error);
    }

    async supprimerAnnee(id: string): Promise<void> {
        const { data, error } = await this.sb.from('annees_scolaires').delete().eq('id', id).select('id');
        this.verifier(data, error);
    }

    async activerAnnee(id: string): Promise<void> {
        const { error } = await this.sb.rpc('activer_annee', { p_annee: id });
        if (error) {
            throw erreurStructure(error);
        }
    }

    async creerPeriodes(anneeId: string, saisies: readonly SaisiePeriode[]): Promise<void> {
        const daaraId = this.daaraId();
        const { error } = await this.sb.from('periodes').insert(
            saisies.map((s) => ({
                daara_id: daaraId,
                annee_id: anneeId,
                libelle: s.libelle,
                ordre: s.ordre,
                date_debut: s.dateDebut,
                date_fin: s.dateFin,
            })),
        );
        if (error) {
            throw erreurStructure(error);
        }
    }

    async modifierPeriode(id: string, s: SaisiePeriode): Promise<void> {
        const { data, error } = await this.sb
            .from('periodes')
            .update({ libelle: s.libelle, ordre: s.ordre, date_debut: s.dateDebut, date_fin: s.dateFin })
            .eq('id', id)
            .select('id');
        this.verifier(data, error);
    }

    /** Clôture (notes verrouillées au sprint 6) ou réouverture d'une période. */
    async cloturerPeriode(id: string, cloturee: boolean): Promise<void> {
        const { data, error } = await this.sb.from('periodes').update({ cloturee }).eq('id', id).select('id');
        this.verifier(data, error);
    }

    async supprimerPeriode(id: string): Promise<void> {
        const { data, error } = await this.sb.from('periodes').delete().eq('id', id).select('id');
        this.verifier(data, error);
    }

    /** Aucune ligne renvoyée = refus RLS (autre daara, droits, module désactivé). */
    private verifier(data: unknown[] | null, error: { code?: string; message?: string } | null): void {
        if (error) {
            throw erreurStructure(error);
        }
        if (!data?.length) {
            throw new ErreurStructure('structure.erreurs.droits');
        }
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurStructure('structure.erreurs.inattendue');
        }
        return id;
    }
}
