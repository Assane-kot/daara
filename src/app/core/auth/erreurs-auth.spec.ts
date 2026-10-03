import { AuthError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { cleErreurAuth } from './erreurs-auth';

describe('cleErreurAuth', () => {
    it.each([
        ['invalid_credentials', 'auth.erreurs.identifiants'],
        ['email_not_confirmed', 'auth.erreurs.email_non_confirme'],
        ['otp_expired', 'auth.erreurs.code_invalide'],
        ['mfa_verification_failed', 'auth.erreurs.code_invalide'],
        ['weak_password', 'auth.erreurs.mot_de_passe_faible'],
        ['captcha_failed', 'auth.erreurs.captcha'],
        ['over_email_send_rate_limit', 'auth.erreurs.trop_de_tentatives'],
        ['insufficient_aal', 'auth.erreurs.mfa_requise'],
        ['code_inconnu', 'auth.erreurs.inattendue'],
    ])('code %s → %s', (code, cle) => {
        expect(cleErreurAuth(new AuthError('message', 400, code))).toBe(cle);
    });

    it('erreur réseau', () => {
        expect(cleErreurAuth(new AuthRetryableFetchError('Failed to fetch', 0))).toBe('auth.erreurs.reseau');
        expect(cleErreurAuth(new TypeError('Failed to fetch'))).toBe('auth.erreurs.reseau');
    });

    it('erreur non Supabase', () => {
        expect(cleErreurAuth(new Error('autre'))).toBe('auth.erreurs.inattendue');
    });
});
