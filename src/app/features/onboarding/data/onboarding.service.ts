import { Injectable, inject } from '@angular/core';
import { PostgrestError } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth/auth.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export interface NouvelleDaara {
    readonly nom: string;
    readonly slug: string;
    readonly ville: string;
    readonly telephone: string;
    readonly langueDefaut: 'fr' | 'en';
    readonly bareme: 10 | 20;
}

/** Erreur de création traduite pour l'écran (codes de `creer_daara`, LLD §4 « Fonctions RPC »). */
export class ErreurCreationDaara extends Error {
    constructor(readonly cle: string) {
        super(cle);
    }
}

/** Clé de traduction d'une erreur renvoyée par `creer_daara`. */
export function cleErreurCreation(erreur: Pick<PostgrestError, 'code' | 'message'>): string {
    switch (erreur.code) {
        case '23505':
            return 'onboarding.erreurs.slug_pris';
        case '23514':
            return 'onboarding.erreurs.donnee_invalide';
        case 'P0001':
            return 'onboarding.erreurs.limite';
        case '42501':
            return 'onboarding.erreurs.aal2';
        default:
            return 'onboarding.erreurs.inattendue';
    }
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
    private readonly sb = inject(SupabaseService).client;
    private readonly auth = inject(AuthService);

    /** Crée la daara (le créateur en devient admin) et renvoie son slug. Lève `ErreurCreationDaara`. */
    async creerDaara(daara: NouvelleDaara): Promise<string> {
        const { data, error } = await this.sb.rpc('creer_daara', {
            p_nom: daara.nom,
            p_slug: daara.slug,
            p_ville: daara.ville || undefined,
            p_telephone: daara.telephone || undefined,
            p_langue_defaut: daara.langueDefaut,
            p_bareme: daara.bareme,
        });
        if (error) {
            throw new ErreurCreationDaara(cleErreurCreation(error));
        }
        this.auth.invaliderDaaras();
        return data;
    }
}
