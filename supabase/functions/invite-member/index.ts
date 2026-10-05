// Edge Function `invite-member` : JWT de l'admin exigé (verify_jwt) et transmis à la RPC. Logique : logique.ts.

import { envoyerCourriel } from '../_shared/email.ts';
import { erreur, servir } from '../_shared/http.ts';
import { appUrl, clientUtilisateur, env } from '../_shared/supabase.ts';
import { inviter } from './logique.ts';

Deno.serve(
    servir(async (corps, requete) => {
        const autorisation = requete.headers.get('Authorization');
        if (!autorisation?.startsWith('Bearer ')) {
            return erreur(401, 'non_authentifie');
        }
        const client = clientUtilisateur(autorisation);
        return await inviter(corps, {
            creerInvitation: async (params) => {
                const { data, error } = await client.rpc('creer_invitation', params);
                return { data: data as { id: string; jeton: string }[] | null, error };
            },
            nomDaara: async (daaraId) => {
                const { data } = await client.from('daaras').select('nom').eq('id', daaraId).maybeSingle();
                return (data as { nom: string } | null)?.nom ?? null;
            },
            envoyer: (courriel) => envoyerCourriel(courriel, env),
            appUrl: appUrl(),
        });
    }, env),
);
