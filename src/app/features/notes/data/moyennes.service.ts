import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ErreurEvaluation, erreurEvaluation } from './evaluations.service';

export interface MatiereMoyenne {
    /** Identifiant de la matière dans la classe (`classe_matieres`). */
    readonly id: string;
    readonly nom: string;
    readonly coefficient: number;
}

export interface EleveMoyennes {
    readonly apprenantId: string;
    readonly nom: string;
    readonly prenom: string;
    /** Moyenne par matière de la classe ; absente = aucune note comptée. */
    readonly matieres: Readonly<Record<string, number>>;
    readonly generale: number | null;
}

export interface TableauMoyennes {
    readonly bareme: number;
    readonly seuil: number;
    readonly matieres: readonly MatiereMoyenne[];
    readonly eleves: readonly EleveMoyennes[];
}

interface ReponseMoyennes {
    readonly masquees?: boolean;
    readonly bareme: number;
    readonly seuil: number;
    readonly matieres: readonly { id: string; nom: string; coefficient: number }[];
    readonly eleves: readonly { apprenant_id: string; nom: string; prenom: string; matieres: Record<string, number>; generale: number | null }[];
}

/** Moyennes d'une classe pour une période (S6.4) : calculées par la base selon les réglages (`moyennes`, ADR-012). */
@Injectable({ providedIn: 'root' })
export class MoyennesService {
    private readonly sb = inject(SupabaseService).client;

    /** Null si la daara masque les moyennes (parents). */
    async calculer(classeId: string, periodeId: string, apprenantId?: string): Promise<TableauMoyennes | null> {
        const { data, error } = await this.sb.rpc('moyennes', { p_classe: classeId, p_periode: periodeId, p_apprenant: apprenantId });
        if (error || !data) {
            throw error ? erreurEvaluation(error) : new ErreurEvaluation('notes.erreurs.inattendue');
        }
        const r = data as unknown as ReponseMoyennes;
        if (r.masquees) {
            return null;
        }
        return {
            bareme: Number(r.bareme),
            seuil: Number(r.seuil),
            matieres: r.matieres.map((m) => ({ id: m.id, nom: m.nom, coefficient: Number(m.coefficient) })),
            eleves: r.eleves.map((e) => ({
                apprenantId: e.apprenant_id,
                nom: e.nom,
                prenom: e.prenom,
                matieres: Object.fromEntries(Object.entries(e.matieres).map(([k, v]) => [k, Number(v)])),
                generale: e.generale === null ? null : Number(e.generale),
            })),
        };
    }
}
