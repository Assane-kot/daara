// Edge Function `accept-invitation` : publique (verify_jwt = false), Turnstile vérifié côté serveur. Logique : logique.ts.

import { servir } from '../_shared/http.ts';
import { clientService, env } from '../_shared/supabase.ts';
import { verifierTurnstile } from '../_shared/turnstile.ts';
import { accepter, type InvitationLue } from './logique.ts';

const service = clientService();

Deno.serve(
    servir(
        (corps, requete) =>
            accepter(corps, {
                verifierCaptcha: (jeton) => verifierTurnstile(jeton, env, requete.headers.get('cf-connecting-ip')),
                lireInvitation: async (jeton) => {
                    const { data, error } = await service.rpc('invitation_par_jeton', { p_token: jeton });
                    if (error) {
                        throw new Error('invitation_par_jeton');
                    }
                    return ((data as InvitationLue[] | null) ?? [])[0] ?? null;
                },
                creerCompte: async ({ telephone, motDePasse, invitationId, nom, prenom, langue }) => {
                    try {
                        const { data, error } = await service.auth.admin.createUser({
                            phone: telephone,
                            password: motDePasse,
                            phone_confirm: true,
                            // Marqueur non modifiable par l'utilisateur, exigé par accepter_invitation_nouveau_compte.
                            app_metadata: { invitation: invitationId },
                            user_metadata: { nom: nom ?? '', prenom: prenom ?? '', langue },
                        });
                        if (error || !data.user) {
                            return { erreur: error?.code ?? 'inconnue' };
                        }
                        return { id: data.user.id };
                    } catch {
                        return { erreur: 'inconnue' };
                    }
                },
                rattacher: async (jeton, userId) => {
                    const { data, error } = await service.rpc('accepter_invitation_nouveau_compte', { p_token: jeton, p_user: userId });
                    return { data: data as string | null, error };
                },
                supprimerCompte: async (userId) => {
                    try {
                        return !(await service.auth.admin.deleteUser(userId)).error;
                    } catch {
                        return false;
                    }
                },
            }),
        env,
    ),
);
