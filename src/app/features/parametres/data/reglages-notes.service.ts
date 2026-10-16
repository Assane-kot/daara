import { Injectable, inject } from '@angular/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Database } from '../../../core/supabase/database.types';
import { SupabaseService } from '../../../core/supabase/supabase.service';

type Enums = Database['public']['Enums'];

export interface ReglagesNotes {
    readonly absenceEvaluation: Enums['regle_absence_eval'];
    readonly moyenneGenerale: Enums['mode_moyenne'];
    readonly arrondi: Enums['arrondi_note'];
    /** Null : la moitié du barème. */
    readonly seuilReussite: number | null;
    readonly titulaireSaisit: boolean;
    readonly visibilite: Enums['visibilite_notes'];
    readonly moyennesVisibles: boolean;
    readonly appreciations: boolean;
}

export interface TypeEvaluation {
    readonly id: string;
    readonly nom: string;
    readonly coefficient: number;
    readonly ordre: number;
    readonly archive: boolean;
}

export class ErreurReglages extends Error {
    constructor(readonly cle: string) {
        super(cle);
    }
}

export function erreurReglages(erreur: { code?: string } | null): ErreurReglages {
    switch (erreur?.code) {
        case '42501':
            return new ErreurReglages('reglages.erreurs.droits');
        case '23505':
            return new ErreurReglages('reglages.erreurs.nom_pris');
        case '23503':
            return new ErreurReglages('reglages.erreurs.type_utilise');
        case '23514':
            return new ErreurReglages('reglages.erreurs.donnee_invalide');
        default:
            return new ErreurReglages('reglages.erreurs.inattendue');
    }
}

/** Réglages des notes de la daara et types d'évaluation (S6.1, ADR-012) ; la base revérifie tout (admin aal2 + module). */
@Injectable({ providedIn: 'root' })
export class ReglagesNotesService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);

    async charger(): Promise<{ reglages: ReglagesNotes; types: TypeEvaluation[]; bareme: number }> {
        const daaraId = this.daaraId();
        const [r, t, d] = await Promise.all([
            this.sb
                .from('reglages_notes')
                .select('absence_evaluation, moyenne_generale, arrondi, seuil_reussite, titulaire_saisit, visibilite, moyennes_visibles, appreciations')
                .eq('daara_id', daaraId)
                .single(),
            this.sb.from('types_evaluation').select('id, nom, coefficient, ordre, archive').eq('daara_id', daaraId).order('ordre').order('nom'),
            this.sb.from('daaras').select('bareme').eq('id', daaraId).single(),
        ]);
        if (r.error || t.error) {
            throw erreurReglages(r.error ?? t.error);
        }
        return {
            reglages: {
                absenceEvaluation: r.data.absence_evaluation,
                moyenneGenerale: r.data.moyenne_generale,
                arrondi: r.data.arrondi,
                seuilReussite: r.data.seuil_reussite,
                titulaireSaisit: r.data.titulaire_saisit,
                visibilite: r.data.visibilite,
                moyennesVisibles: r.data.moyennes_visibles,
                appreciations: r.data.appreciations,
            },
            types: t.data.map((x) => ({ id: x.id, nom: x.nom, coefficient: Number(x.coefficient), ordre: x.ordre, archive: x.archive })),
            bareme: d.data?.bareme === 10 ? 10 : 20,
        };
    }

    async enregistrer(r: ReglagesNotes): Promise<void> {
        await this.ecrire(
            this.sb
                .from('reglages_notes')
                .update({
                    absence_evaluation: r.absenceEvaluation,
                    moyenne_generale: r.moyenneGenerale,
                    arrondi: r.arrondi,
                    seuil_reussite: r.seuilReussite,
                    titulaire_saisit: r.titulaireSaisit,
                    visibilite: r.visibilite,
                    moyennes_visibles: r.moyennesVisibles,
                    appreciations: r.appreciations,
                })
                .eq('daara_id', this.daaraId())
                .select('daara_id'),
        );
    }

    async ajouterType(nom: string, coefficient: number, ordre: number): Promise<void> {
        await this.ecrire(this.sb.from('types_evaluation').insert({ daara_id: this.daaraId(), nom: nom.trim(), coefficient, ordre }).select('id'));
    }

    async modifierType(id: string, modif: { nom?: string; coefficient?: number; archive?: boolean }): Promise<void> {
        await this.ecrire(
            this.sb
                .from('types_evaluation')
                .update({ ...modif, nom: modif.nom?.trim() })
                .eq('id', id)
                .select('id'),
        );
    }

    async supprimerType(id: string): Promise<void> {
        await this.ecrire(this.sb.from('types_evaluation').delete().eq('id', id).select('id'));
    }

    /** Aucune ligne renvoyée = refus RLS. */
    private async ecrire(requete: PromiseLike<{ data: unknown[] | null; error: { code?: string } | null }>): Promise<void> {
        const { data, error } = await requete;
        if (error) {
            throw erreurReglages(error);
        }
        if (!data?.length) {
            throw new ErreurReglages('reglages.erreurs.droits');
        }
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurReglages('reglages.erreurs.inattendue');
        }
        return id;
    }
}
