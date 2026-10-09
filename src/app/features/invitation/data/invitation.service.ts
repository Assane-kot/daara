import { Injectable, inject } from '@angular/core';
import { RoleMembre } from '../../../core/daara/daara.model';
import { codeErreurFonction } from '../../../core/supabase/erreur-fonction';
import { SupabaseService } from '../../../core/supabase/supabase.service';

/** Aperçu public d'une invitation (Edge Function `invitation-apercu`, LLD §6). Contact masqué. */
export interface ApercuInvitation {
    readonly daara: string;
    readonly role: RoleMembre;
    readonly type: 'email' | 'telephone';
    readonly contact: string;
    readonly langue: 'fr' | 'en';
    readonly etat: 'valide' | 'expiree' | 'utilisee' | 'revoquee' | 'suspendue';
}

/** Erreur traduite de la page `/invitation` (clé `invitation.erreurs.<code>`). */
export class ErreurInvitation extends Error {
    constructor(readonly code: string) {
        super(code);
    }
}

/** Codes connus des fonctions et de `accepter_invitation` ; tout autre code est « inattendue ». */
const CODES = new Set([
    'jeton_invalide',
    'invitation_expiree',
    'invitation_utilisee',
    'invitation_revoquee',
    'invitation_suspendue',
    'invitation_email',
    'compte_existant',
    'mot_de_passe_faible',
    'captcha',
    'contact_different',
    'aal2_requis',
    'daara_suspendue',
    'donnee_invalide',
    'reseau',
]);

export function erreurInvitation(code: string | undefined): ErreurInvitation {
    return new ErreurInvitation(code && CODES.has(code) ? code : 'inattendue');
}

/** Page publique `/invitation` : aperçu, puis création du compte d'un invité par téléphone (ADR-009). */
@Injectable({ providedIn: 'root' })
export class InvitationService {
    private readonly sb = inject(SupabaseService).client;

    async apercu(jeton: string): Promise<ApercuInvitation> {
        const { data, error } = await this.sb.functions.invoke<ApercuInvitation>('invitation-apercu', { body: { jeton } });
        if (error || !data) {
            throw erreurInvitation(error ? await codeErreurFonction(error) : undefined);
        }
        return data;
    }

    /**
     * Invité par téléphone sans compte : `accept-invitation` crée le compte et le rattache à la daara ; renvoie le numéro
     * (E.164) pour la connexion qui suit.
     */
    async creerCompteTelephone(saisie: {
        jeton: string;
        motDePasse: string;
        prenom: string;
        nom: string;
        langue: 'fr' | 'en';
        captcha: string;
    }): Promise<{ slug: string; telephone: string }> {
        const { data, error } = await this.sb.functions.invoke<{ slug: string; telephone: string }>('accept-invitation', {
            body: {
                jeton: saisie.jeton,
                mot_de_passe: saisie.motDePasse,
                prenom: saisie.prenom,
                nom: saisie.nom,
                langue: saisie.langue,
                captcha: saisie.captcha,
            },
        });
        if (error || !data) {
            throw erreurInvitation(error ? await codeErreurFonction(error) : undefined);
        }
        return data;
    }
}
