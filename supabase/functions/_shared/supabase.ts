// Clients Supabase des Edge Functions (LLD §6). La clé service_role n'existe que dans l'environnement des fonctions
// (fournie par Supabase) ; jamais dans le front ni dans Git.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.0';

export const env = (nom: string): string | undefined => Deno.env.get(nom);

function requis(nom: string): string {
    const valeur = env(nom);
    if (!valeur) {
        throw new Error(`variable manquante : ${nom}`);
    }
    return valeur;
}

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Client agissant avec le JWT de l'appelant (RLS et RPC vérifient ses droits). */
export function clientUtilisateur(autorisation: string): SupabaseClient {
    return createClient(requis('SUPABASE_URL'), requis('SUPABASE_ANON_KEY'), {
        ...options,
        global: { headers: { Authorization: autorisation } },
    });
}

/** Client service_role : uniquement pour les fonctions internes réservées à service_role. */
export function clientService(): SupabaseClient {
    return createClient(requis('SUPABASE_URL'), requis('SUPABASE_SERVICE_ROLE_KEY'), options);
}

/** URL de l'application pour les liens envoyés (sans « / » final). */
export function appUrl(): string {
    return requis('APP_URL').replace(/\/$/, '');
}
