import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

/**
 * Clé de traduction du message à afficher pour une erreur d'authentification (LLD §8). Messages neutres :
 * on ne révèle jamais si un compte existe, ni lequel de l'e-mail ou du mot de passe est faux.
 */
export function cleErreurAuth(erreur: unknown): string {
    if (isAuthRetryableFetchError(erreur) || erreur instanceof TypeError) {
        return 'auth.erreurs.reseau';
    }
    if (!isAuthError(erreur)) {
        return 'auth.erreurs.inattendue';
    }
    switch (erreur.code) {
        case 'invalid_credentials':
            return 'auth.erreurs.identifiants';
        case 'email_not_confirmed':
            return 'auth.erreurs.email_non_confirme';
        case 'otp_expired':
        case 'mfa_verification_failed':
        case 'mfa_challenge_expired':
            return 'auth.erreurs.code_invalide';
        case 'weak_password':
            return 'auth.erreurs.mot_de_passe_faible';
        case 'same_password':
            return 'auth.erreurs.meme_mot_de_passe';
        case 'captcha_failed':
            return 'auth.erreurs.captcha';
        case 'over_request_rate_limit':
        case 'over_email_send_rate_limit':
            return 'auth.erreurs.trop_de_tentatives';
        case 'insufficient_aal':
            return 'auth.erreurs.mfa_requise';
        case 'session_not_found':
        case 'session_expired':
        case 'refresh_token_not_found':
            return 'auth.erreurs.session_expiree';
        default:
            return 'auth.erreurs.inattendue';
    }
}
