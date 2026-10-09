import { Injectable, inject } from '@angular/core';
import { Identifiant } from '../../../core/auth/identifiant';
import { codeErreurFonction } from '../../../core/supabase/erreur-fonction';
import { SupabaseService } from '../../../core/supabase/supabase.service';

/** Codes connus de `use-access-code` (LLD §6) ; tout autre code est « inattendue ». */
const CODES = new Set(['code_invalide', 'mot_de_passe_faible', 'captcha', 'reseau']);

/** Erreur traduite de `/auth/code-acces` (clé `auth.code_acces.erreurs.<code>`). */
export class ErreurCodeAcces extends Error {
    constructor(readonly code: string) {
        super(code);
    }
}

/**
 * Réinitialisation par le code remis par l'admin (S2.6, ADR-006 niveau 2) : l'Edge Function publique `use-access-code`
 * vérifie Turnstile et le code, puis change le mot de passe (sessions révoquées).
 */
@Injectable({ providedIn: 'root' })
export class CodeAccesService {
    private readonly sb = inject(SupabaseService).client;

    async utiliser(saisie: { identifiant: Identifiant; code: string; motDePasse: string; captcha: string }): Promise<void> {
        const { error } = await this.sb.functions.invoke('use-access-code', {
            body: {
                identifiant: 'email' in saisie.identifiant ? saisie.identifiant.email : saisie.identifiant.telephone,
                code: saisie.code,
                mot_de_passe: saisie.motDePasse,
                captcha: saisie.captcha,
            },
        });
        if (error) {
            const code = await codeErreurFonction(error);
            throw new ErreurCodeAcces(CODES.has(code) ? code : 'inattendue');
        }
    }
}
