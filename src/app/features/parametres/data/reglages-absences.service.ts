import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Database } from '../../../core/supabase/database.types';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export interface ReglagesAbsences {
    readonly appelDemiJournee: boolean;
    readonly delaiCorrection: number;
    readonly decideur: Database['public']['Enums']['decideur_justification'];
    readonly justificationParent: boolean;
}

export class ErreurReglagesAbsences extends Error {
    constructor(readonly cle: string) {
        super(cle);
    }
}

function erreur(e: { code?: string } | null): ErreurReglagesAbsences {
    return new ErreurReglagesAbsences(
        e?.code === '42501'
            ? 'reglages_absences.erreurs.droits'
            : e?.code === '23514'
              ? 'reglages_absences.erreurs.donnee_invalide'
              : 'reglages_absences.erreurs.inattendue',
    );
}

/** Paramètres → Absences (S6.1b, ADR-012) : appel (sur `daaras`) et `reglages_absences` ; admin aal2, la base revérifie. */
@Injectable({ providedIn: 'root' })
export class ReglagesAbsencesService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);
    private readonly auth = inject(AuthService);

    async charger(): Promise<ReglagesAbsences> {
        const id = this.daaraId();
        const [r, d] = await Promise.all([
            this.sb.from('reglages_absences').select('delai_correction, decideur, justification_parent').eq('daara_id', id).single(),
            this.sb.from('daaras').select('appel_demi_journee').eq('id', id).single(),
        ]);
        if (r.error || d.error) {
            throw erreur(r.error ?? d.error);
        }
        return {
            appelDemiJournee: d.data.appel_demi_journee,
            delaiCorrection: r.data.delai_correction,
            decideur: r.data.decideur,
            justificationParent: r.data.justification_parent,
        };
    }

    async enregistrer(r: ReglagesAbsences): Promise<void> {
        const id = this.daaraId();
        const [a, d] = await Promise.all([
            this.sb
                .from('reglages_absences')
                .update({ delai_correction: r.delaiCorrection, decideur: r.decideur, justification_parent: r.justificationParent })
                .eq('daara_id', id)
                .select('daara_id'),
            this.sb.from('daaras').update({ appel_demi_journee: r.appelDemiJournee }).eq('id', id).select('id'),
        ]);
        const e = a.error ?? d.error;
        if (e || !a.data?.length || !d.data?.length) {
            throw erreur(e ?? { code: '42501' });
        }
        // Le créneau d'appel est porté par la daara ouverte (écrans d'appel).
        await this.auth.rechargerDaaraCourante();
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurReglagesAbsences('reglages_absences.erreurs.inattendue');
        }
        return id;
    }
}
