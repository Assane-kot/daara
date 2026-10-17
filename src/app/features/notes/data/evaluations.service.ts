import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Database } from '../../../core/supabase/database.types';
import { SupabaseService } from '../../../core/supabase/supabase.service';

type InsertionEvaluation = Database['public']['Tables']['evaluations']['Insert'];

export interface MatiereNotes {
    /** Identifiant de la matière dans la classe (`classe_matieres`). */
    readonly id: string;
    readonly nom: string;
}

export interface ClasseNotes {
    readonly id: string;
    readonly nom: string;
    /** Matières dont l'utilisateur crée les évaluations (toutes pour l'admin). */
    readonly matieres: readonly MatiereNotes[];
}

export interface PeriodeNotes {
    readonly id: string;
    readonly libelle: string;
    readonly debut: string;
    readonly fin: string;
    readonly cloturee: boolean;
}

export interface TypeNotes {
    readonly id: string;
    readonly nom: string;
    readonly coefficient: number;
}

export interface ContexteNotes {
    readonly classes: readonly ClasseNotes[];
    readonly periodes: readonly PeriodeNotes[];
    /** Types d'évaluation proposés (non archivés). */
    readonly types: readonly TypeNotes[];
    /** Barème de la daara (10 ou 20). */
    readonly bareme: number;
}

export interface Evaluation {
    readonly id: string;
    readonly libelle: string;
    readonly date: string;
    readonly typeId: string;
    readonly typeNom: string;
    readonly bareme: number;
    readonly coefficient: number;
    readonly publiee: boolean;
}

export interface SaisieEvaluation {
    readonly typeId: string;
    readonly libelle: string;
    readonly date: string;
    readonly bareme: number;
    readonly coefficient: number;
}

export class ErreurEvaluation extends Error {
    constructor(readonly cle: string) {
        super(cle);
    }
}

const MESSAGES = ['periode_cloturee', 'date_hors_periode', 'periode_invalide', 'type_archive', 'annee_inactive'];

/** Refus de la base (trigger `evaluations_coherentes`, droits, contraintes). */
export function erreurEvaluation(erreur: { code?: string; message?: string } | null): ErreurEvaluation {
    const message = erreur?.message ?? '';
    if (MESSAGES.includes(message)) {
        return new ErreurEvaluation('notes.erreurs.' + message);
    }
    switch (erreur?.code) {
        case '42501':
            return new ErreurEvaluation('notes.erreurs.droits');
        case '23514':
            return new ErreurEvaluation('notes.erreurs.donnee_invalide');
        default:
            return new ErreurEvaluation('notes.erreurs.inattendue');
    }
}

/** Période proposée : celle d'aujourd'hui si elle est ouverte, sinon la première ouverte, sinon la première. */
export function periodeParDefaut(periodes: readonly PeriodeNotes[], jour: string): PeriodeNotes | null {
    return periodes.find((p) => !p.cloturee && p.debut <= jour && jour <= p.fin) ?? periodes.find((p) => !p.cloturee) ?? periodes[0] ?? null;
}

/** Date proposée : aujourd'hui, ramenée dans la période. */
export function dateParDefaut(periode: PeriodeNotes, jour: string): string {
    return jour < periode.debut ? periode.debut : jour > periode.fin ? periode.fin : jour;
}

/** Intitulé proposé : nom du type suivi du numéro suivant (« Devoir 3 » après « Devoir 1 » et « Devoir 2 »). */
export function libelleSuggere(type: TypeNotes, existantes: readonly Evaluation[]): string {
    return `${type.nom} ${existantes.filter((e) => e.typeId === type.id).length + 1}`;
}

/**
 * Évaluations (S6.2, module `notes`) : classes et matières de l'utilisateur (année active), périodes, types ; évaluations
 * d'une matière de classe pour une période ; création, modification, suppression. La base revérifie tout (enseignant de
 * la matière ou titulaire selon le réglage, période non clôturée, date dans la période).
 */
@Injectable({ providedIn: 'root' })
export class EvaluationsService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);
    private readonly auth = inject(AuthService);

    async contexte(): Promise<ContexteNotes> {
        const daaraId = this.daaraId();
        const [annee, types, reglages, daara] = await Promise.all([
            this.sb.from('annees_scolaires').select('id').eq('daara_id', daaraId).eq('active', true).maybeSingle(),
            this.sb.from('types_evaluation').select('id, nom, coefficient').eq('daara_id', daaraId).eq('archive', false).order('ordre').order('nom'),
            this.sb.from('reglages_notes').select('titulaire_saisit').eq('daara_id', daaraId).maybeSingle(),
            this.sb.from('daaras').select('bareme').eq('id', daaraId).single(),
        ]);
        const erreur = annee.error ?? types.error ?? reglages.error ?? daara.error;
        if (erreur) {
            throw erreurEvaluation(erreur);
        }
        const base = {
            types: (types.data ?? []).map((t) => ({ id: t.id, nom: t.nom, coefficient: Number(t.coefficient) })),
            bareme: daara.data?.bareme ?? 20,
        };
        if (!annee.data) {
            return { ...base, classes: [], periodes: [] };
        }
        const [classes, periodes] = await Promise.all([
            this.sb
                .from('classes')
                .select('id, nom, titulaire_id, classe_matieres(id, enseignant_id, matieres(nom))')
                .eq('annee_id', annee.data.id)
                .order('nom'),
            this.sb.from('periodes').select('id, libelle, date_debut, date_fin, cloturee').eq('annee_id', annee.data.id).order('ordre'),
        ]);
        if (classes.error || periodes.error) {
            throw erreurEvaluation(classes.error ?? periodes.error);
        }
        const moi = this.auth.user()?.id;
        const admin = this.courante.roles().includes('admin');
        const titulaireSaisit = reglages.data?.titulaire_saisit ?? false;
        return {
            ...base,
            classes: classes.data
                .map((c) => {
                    const toutes = admin || (c.titulaire_id === moi && titulaireSaisit);
                    return {
                        id: c.id,
                        nom: c.nom,
                        matieres: c.classe_matieres
                            .filter((cm) => toutes || cm.enseignant_id === moi)
                            .map((cm) => ({ id: cm.id, nom: cm.matieres?.nom ?? '' }))
                            .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
                    };
                })
                .filter((c) => admin || c.matieres.length > 0),
            periodes: periodes.data.map((p) => ({ id: p.id, libelle: p.libelle, debut: p.date_debut, fin: p.date_fin, cloturee: p.cloturee })),
        };
    }

    async lister(classeMatiereId: string, periodeId: string): Promise<Evaluation[]> {
        const { data, error } = await this.sb
            .from('evaluations')
            .select('id, libelle, date_eval, type_id, bareme, coefficient, publiee_at, types_evaluation(nom)')
            .eq('classe_matiere_id', classeMatiereId)
            .eq('periode_id', periodeId)
            .order('date_eval')
            .order('created_at');
        if (error) {
            throw erreurEvaluation(error);
        }
        return data.map((e) => ({
            id: e.id,
            libelle: e.libelle,
            date: e.date_eval,
            typeId: e.type_id,
            typeNom: e.types_evaluation?.nom ?? '',
            bareme: Number(e.bareme),
            coefficient: Number(e.coefficient),
            publiee: !!e.publiee_at,
        }));
    }

    async creer(classeId: string, classeMatiereId: string, periodeId: string, s: SaisieEvaluation): Promise<void> {
        const ligne: InsertionEvaluation = {
            daara_id: this.daaraId(),
            classe_id: classeId,
            classe_matiere_id: classeMatiereId,
            periode_id: periodeId,
            type_id: s.typeId,
            libelle: s.libelle,
            date_eval: s.date,
            bareme: s.bareme,
            coefficient: s.coefficient,
        };
        const { error } = await this.sb.from('evaluations').insert(ligne);
        if (error) {
            throw erreurEvaluation(error);
        }
    }

    async modifier(id: string, s: SaisieEvaluation): Promise<void> {
        const { data, error } = await this.sb
            .from('evaluations')
            .update({ type_id: s.typeId, libelle: s.libelle, date_eval: s.date, bareme: s.bareme, coefficient: s.coefficient })
            .eq('id', id)
            .select('id');
        if (error || !data.length) {
            throw erreurEvaluation(error ?? { code: '42501' });
        }
    }

    async supprimer(id: string): Promise<void> {
        const { data, error } = await this.sb.from('evaluations').delete().eq('id', id).select('id');
        if (error || !data.length) {
            throw erreurEvaluation(error ?? { code: '42501' });
        }
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurEvaluation('notes.erreurs.inattendue');
        }
        return id;
    }
}
