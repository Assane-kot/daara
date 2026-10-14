import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Database } from '../../../core/supabase/database.types';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { PageTable, RequeteTable } from '../../../shared/ui/data-table/data-table';
import { Creneau, TypeAbsence } from '../../appel/data/appel.service';

export type EtatJustification = Database['public']['Enums']['etat_justification'];

export interface Absence {
    readonly id: string;
    readonly date: string;
    readonly creneau: Creneau;
    readonly type: TypeAbsence;
    readonly etat: EtatJustification;
    readonly motif: string | null;
    readonly apprenantId: string;
    /** Vide si l'élève n'est plus lisible (enseignant : élève d'une année passée). */
    readonly eleve: string;
    readonly classe: string;
    /** L'utilisateur peut décider (admin, ou titulaire de la classe). */
    readonly peutDecider: boolean;
}

export interface FiltresAbsences {
    readonly debut: string;
    readonly fin: string;
    readonly classeId: string;
    readonly etat: EtatJustification | 'a_decider' | '';
}

export interface StatClasse {
    readonly classe_id: string;
    readonly nom: string;
    readonly eleves: number;
    readonly appels: number;
    readonly absences: number;
    readonly retards: number;
    readonly non_justifiees: number;
    readonly taux: number;
}

export interface Statistiques {
    readonly classes: readonly StatClasse[];
    readonly eleves: readonly { readonly apprenantId: string; readonly nom: string; readonly absences: number; readonly retards: number }[];
}

export class ErreurAbsences extends Error {
    constructor(readonly cle: string) {
        super(cle);
    }
}

export function erreurAbsences(erreur: { code?: string; message?: string } | null): ErreurAbsences {
    const message = erreur?.message ?? '';
    if (['motif_invalide', 'deja_decidee'].includes(message)) {
        return new ErreurAbsences('absences.erreurs.' + message);
    }
    return new ErreurAbsences(erreur?.code === '42501' ? 'absences.erreurs.droits' : 'absences.erreurs.inattendue');
}

const COLONNES = 'id, date_absence, creneau, type, etat, motif, apprenant_id, apprenants(prenom, nom), classes(nom, titulaire_id)';

/**
 * Suivi des absences (S5.2) : liste filtrée (admin : toutes ; enseignant : ses classes, RLS), historique d'un élève,
 * motif envoyé par le parent, décision de l'admin ou du titulaire, statistiques simples.
 */
@Injectable({ providedIn: 'root' })
export class AbsencesService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);
    private readonly auth = inject(AuthService);

    async page(r: RequeteTable, f: FiltresAbsences): Promise<PageTable<Absence>> {
        let q = this.sb
            .from('absences')
            .select(COLONNES, { count: 'exact' })
            .eq('daara_id', this.daaraId())
            .gte('date_absence', f.debut)
            .lte('date_absence', f.fin);
        if (f.classeId) {
            q = q.eq('classe_id', f.classeId);
        }
        if (f.etat === 'a_decider') {
            q = q.eq('etat', 'envoyee');
        } else if (f.etat) {
            q = q.eq('etat', f.etat);
        }
        const desc = r.tri?.cle !== 'date' || r.tri.desc;
        const { data, error, count } = await q
            .order('date_absence', { ascending: !desc })
            .order('creneau')
            .range(r.page * r.taille, r.page * r.taille + r.taille - 1);
        if (error) {
            throw erreurAbsences(error);
        }
        return { lignes: data.map((a) => this.versAbsence(a)), total: count ?? 0 };
    }

    /** Toutes les absences d'un élève (fiche élève, espace parent), les plus récentes d'abord. */
    async historique(apprenantId: string): Promise<Absence[]> {
        const { data, error } = await this.sb
            .from('absences')
            .select(COLONNES)
            .eq('apprenant_id', apprenantId)
            .order('date_absence', { ascending: false })
            .order('creneau')
            .limit(200);
        if (error) {
            throw erreurAbsences(error);
        }
        return data.map((a) => this.versAbsence(a));
    }

    async justifier(absenceId: string, motif: string): Promise<void> {
        const { error } = await this.sb.rpc('justifier_absence', { p_absence: absenceId, p_motif: motif });
        if (error) {
            throw erreurAbsences(error);
        }
    }

    async decider(absenceId: string, justifiee: boolean): Promise<void> {
        const { error } = await this.sb.rpc('decider_justification', { p_absence: absenceId, p_justifiee: justifiee });
        if (error) {
            throw erreurAbsences(error);
        }
    }

    async statistiques(debut: string, fin: string, classeId: string): Promise<Statistiques> {
        const { data, error } = await this.sb.rpc('statistiques_absences', {
            p_daara: this.daaraId(),
            p_debut: debut,
            p_fin: fin,
            p_classe: classeId || undefined,
        });
        if (error) {
            throw erreurAbsences(error);
        }
        const brut = data as unknown as { classes: StatClasse[]; eleves: { apprenant_id: string; absences: number; retards: number }[] };
        // Noms des élèves lus avec les droits de l'utilisateur (aucun nom dans la réponse de la fonction).
        const ids = brut.eleves.map((e) => e.apprenant_id);
        const { data: noms } = ids.length ? await this.sb.from('apprenants').select('id, prenom, nom').in('id', ids) : { data: [] };
        return {
            classes: brut.classes,
            eleves: brut.eleves.map((e) => {
                const n = noms?.find((x) => x.id === e.apprenant_id);
                return { apprenantId: e.apprenant_id, nom: n ? `${n.prenom} ${n.nom}` : '', absences: e.absences, retards: e.retards };
            }),
        };
    }

    private versAbsence(a: {
        id: string;
        date_absence: string;
        creneau: Creneau;
        type: TypeAbsence;
        etat: EtatJustification;
        motif: string | null;
        apprenant_id: string;
        apprenants: { prenom: string; nom: string } | null;
        classes: { nom: string; titulaire_id: string | null } | null;
    }): Absence {
        const admin = this.courante.roles().includes('admin');
        const moi = this.auth.user()?.id;
        return {
            id: a.id,
            date: a.date_absence,
            creneau: a.creneau,
            type: a.type,
            etat: a.etat,
            motif: a.motif,
            apprenantId: a.apprenant_id,
            eleve: a.apprenants ? `${a.apprenants.prenom} ${a.apprenants.nom}` : '',
            classe: a.classes?.nom ?? '',
            peutDecider: admin || (!!moi && a.classes?.titulaire_id === moi && this.courante.roles().includes('enseignant')),
        };
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurAbsences('absences.erreurs.inattendue');
        }
        return id;
    }
}
