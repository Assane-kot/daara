import { Injectable, inject } from '@angular/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Database } from '../../../core/supabase/database.types';
import { SupabaseService } from '../../../core/supabase/supabase.service';

type InsertionNote = Database['public']['Tables']['notes']['Insert'];

export interface LigneNote {
    readonly apprenantId: string;
    readonly prenom: string;
    readonly nom: string;
    /** Ligne `notes` ; absente = pas encore noté. */
    readonly noteId: string | null;
    readonly valeur: number | null;
    readonly absent: boolean;
    readonly appreciation: string | null;
}

export interface FeuilleNotes {
    readonly evaluationId: string;
    readonly libelle: string;
    readonly typeNom: string;
    readonly date: string;
    readonly bareme: number;
    readonly publiee: boolean;
    readonly classeId: string;
    readonly classeNom: string;
    readonly classeMatiereId: string;
    readonly matiereNom: string;
    readonly periodeId: string;
    readonly periodeLibelle: string;
    readonly cloturee: boolean;
    /** L'utilisateur saisit ces notes (matière à lui, période ouverte). */
    readonly ecriture: boolean;
    /** Réglage de la daara : appréciations activées. */
    readonly appreciations: boolean;
    readonly eleves: readonly LigneNote[];
}

/** Saisie d'un élève : une note, « absent », ou rien (note effacée). */
export interface SaisieNote {
    readonly valeur: number | null;
    readonly absent: boolean;
    readonly appreciation: string | null;
}

export class ErreurNote extends Error {
    constructor(readonly cle: string) {
        super(cle);
    }
}

const MESSAGES = ['note_hors_bareme', 'periode_cloturee', 'eleve_hors_classe', 'appreciations_desactivees'];

export function erreurNote(erreur: { code?: string; message?: string } | null): ErreurNote {
    const message = erreur?.message ?? '';
    if (MESSAGES.includes(message)) {
        return new ErreurNote('notes.saisie.erreurs.' + message);
    }
    switch (erreur?.code) {
        case '42501':
            return new ErreurNote('notes.saisie.erreurs.droits');
        case '23514':
            return new ErreurNote('notes.saisie.erreurs.invalide');
        default:
            return new ErreurNote('notes.saisie.erreurs.inattendue');
    }
}

/** Lecture d'une note tapée (« 12 », « 12,5 », « 12.75 ») : vide, valeur, ou clé d'erreur. */
export function lireNote(texte: string, bareme: number): { vide: true } | { valeur: number } | { erreur: string } {
    const t = texte.trim().replace(',', '.');
    if (t === '') {
        return { vide: true };
    }
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) {
        return { erreur: 'notes.saisie.erreurs.format' };
    }
    const valeur = Number(t);
    if (valeur > bareme) {
        return { erreur: 'notes.saisie.erreurs.note_hors_bareme' };
    }
    if (valeur * 4 !== Math.trunc(valeur * 4)) {
        return { erreur: 'notes.saisie.erreurs.quart' };
    }
    return { valeur };
}

/** Résumé de la saisie : notes, absents, élèves sans note. */
export function resumeSaisie(eleves: readonly LigneNote[]): { notes: number; absents: number; manquantes: number } {
    const notes = eleves.filter((e) => e.valeur !== null).length;
    const absents = eleves.filter((e) => e.absent).length;
    return { notes, absents, manquantes: eleves.length - notes - absents };
}

/**
 * Saisie des notes d'une évaluation (S6.3, module `notes`) : élèves inscrits de la classe avec leur note ; enregistrement
 * élève par élève (note vide = ligne supprimée). La base revérifie tout (droits, barème, période, élève de la classe).
 */
@Injectable({ providedIn: 'root' })
export class SaisieNotesService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);

    async feuille(evaluationId: string): Promise<FeuilleNotes> {
        const daaraId = this.daaraId();
        const { data: e, error } = await this.sb
            .from('evaluations')
            .select(
                'id, libelle, date_eval, bareme, publiee_at, classe_id, classe_matiere_id, periode_id, types_evaluation(nom), periodes(libelle, cloturee), classes(nom), classe_matieres(matieres(nom))',
            )
            .eq('id', evaluationId)
            .maybeSingle();
        if (error || !e) {
            throw error ? erreurNote(error) : new ErreurNote('notes.saisie.erreurs.introuvable');
        }
        const [inscrits, notes, ecriture, reglages] = await Promise.all([
            this.sb
                .from('inscriptions')
                .select('apprenant_id, apprenants!inner(prenom, nom, statut)')
                .eq('classe_id', e.classe_id)
                .eq('apprenants.statut', 'inscrit'),
            this.sb.from('notes').select('id, apprenant_id, valeur, absent, appreciation').eq('evaluation_id', evaluationId),
            this.sb.rpc('peut_ecrire_evaluation', { p_daara: daaraId, p_classe_matiere: e.classe_matiere_id }),
            this.sb.from('reglages_notes').select('appreciations').eq('daara_id', daaraId).maybeSingle(),
        ]);
        const err = inscrits.error ?? notes.error ?? ecriture.error ?? reglages.error;
        if (err) {
            throw erreurNote(err);
        }
        const cloturee = e.periodes?.cloturee ?? false;
        return {
            evaluationId: e.id,
            libelle: e.libelle,
            typeNom: e.types_evaluation?.nom ?? '',
            date: e.date_eval,
            bareme: Number(e.bareme),
            publiee: !!e.publiee_at,
            classeId: e.classe_id,
            classeNom: e.classes?.nom ?? '',
            classeMatiereId: e.classe_matiere_id,
            matiereNom: e.classe_matieres?.matieres?.nom ?? '',
            periodeId: e.periode_id,
            periodeLibelle: e.periodes?.libelle ?? '',
            cloturee,
            ecriture: ecriture.data === true && !cloturee,
            appreciations: reglages.data?.appreciations ?? true,
            eleves: (inscrits.data ?? [])
                .map((i): LigneNote => {
                    const n = (notes.data ?? []).find((x) => x.apprenant_id === i.apprenant_id);
                    return {
                        apprenantId: i.apprenant_id,
                        prenom: i.apprenants.prenom,
                        nom: i.apprenants.nom,
                        noteId: n?.id ?? null,
                        valeur: n?.valeur === null || n?.valeur === undefined ? null : Number(n.valeur),
                        absent: n?.absent ?? false,
                        appreciation: n?.appreciation ?? null,
                    };
                })
                .sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr')),
        };
    }

    /** Enregistre la saisie d'un élève ; renvoie l'identifiant de la note (null si effacée). */
    async enregistrer(f: FeuilleNotes, ligne: LigneNote, s: SaisieNote): Promise<string | null> {
        const appreciation = s.appreciation?.trim() || null;
        if (s.valeur === null && !s.absent) {
            if (ligne.noteId) {
                const { error } = await this.sb.from('notes').delete().eq('id', ligne.noteId);
                if (error) {
                    throw erreurNote(error);
                }
            }
            return null;
        }
        const champs = { valeur: s.absent ? null : s.valeur, absent: s.absent, appreciation };
        if (ligne.noteId) {
            return this.modifier(ligne.noteId, champs);
        }
        const nouvelle: InsertionNote = {
            daara_id: this.daaraId(),
            evaluation_id: f.evaluationId,
            apprenant_id: ligne.apprenantId,
            classe_id: f.classeId,
            classe_matiere_id: f.classeMatiereId,
            ...champs,
        };
        const { data, error } = await this.sb.from('notes').insert(nouvelle).select('id').single();
        if (error?.code === '23505') {
            // Saisie faite entre-temps par un collègue (titulaire et enseignant de la matière) : mise à jour.
            const { data: existante } = await this.sb
                .from('notes')
                .select('id')
                .eq('evaluation_id', f.evaluationId)
                .eq('apprenant_id', ligne.apprenantId)
                .maybeSingle();
            if (existante) {
                return this.modifier(existante.id, champs);
            }
        }
        if (error || !data) {
            throw erreurNote(error);
        }
        return data.id;
    }

    private async modifier(id: string, champs: { valeur: number | null; absent: boolean; appreciation: string | null }): Promise<string> {
        const { data, error } = await this.sb.from('notes').update(champs).eq('id', id).select('id');
        if (error || !data.length) {
            throw erreurNote(error ?? { code: '42501' });
        }
        return id;
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurNote('notes.saisie.erreurs.inattendue');
        }
        return id;
    }
}
