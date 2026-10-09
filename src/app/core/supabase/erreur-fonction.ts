import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * Code d'erreur `{ code }` renvoyé par une Edge Function (LLD §6), ou `reseau` / `inattendue`. Le code est une clé
 * courte (`jeton_invalide`, `quota_invitations`…) que l'appelant traduit.
 */
export async function codeErreurFonction(erreur: unknown): Promise<string> {
    if (erreur instanceof FunctionsHttpError) {
        try {
            const corps = (await (erreur.context as Response).json()) as { code?: unknown };
            return typeof corps.code === 'string' && /^[a-z_0-9]+$/.test(corps.code) ? corps.code : 'inattendue';
        } catch {
            return 'inattendue';
        }
    }
    const nom = (erreur as { name?: string } | null)?.name;
    return nom === 'FunctionsFetchError' || nom === 'FunctionsRelayError' || erreur instanceof TypeError ? 'reseau' : 'inattendue';
}
