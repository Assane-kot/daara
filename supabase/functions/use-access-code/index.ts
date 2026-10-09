// Edge Function `use-access-code` : publique (verify_jwt = false), Turnstile vérifié côté serveur. Logique : logique.ts.

import { envoyerCourriel } from '../_shared/email.ts';
import { servir } from '../_shared/http.ts';
import { courrielMotDePasseChange } from '../_shared/modeles.ts';
import { clientService, env } from '../_shared/supabase.ts';
import { verifierTurnstile } from '../_shared/turnstile.ts';
import { type CompteCode, utiliserCode } from './logique.ts';

const service = clientService();

Deno.serve(
    servir(
        (corps, requete) =>
            utiliserCode(corps, {
                verifierCaptcha: (jeton) => verifierTurnstile(jeton, env, requete.headers.get('cf-connecting-ip')),
                consommer: async (identifiant, code) => {
                    const { data, error } = await service.rpc('consommer_code_acces', { p_identifiant: identifiant, p_code: code });
                    if (error) {
                        throw new Error('consommer_code_acces');
                    }
                    return ((data as CompteCode[] | null) ?? [])[0] ?? null;
                },
                changerMotDePasse: async (userId, motDePasse) => {
                    try {
                        // Révoque aussi les jetons de rafraîchissement : toutes les sessions sont fermées (spike S2.0).
                        return !(await service.auth.admin.updateUserById(userId, { password: motDePasse })).error;
                    } catch {
                        return false;
                    }
                },
                notifier: (email, langue) => envoyerCourriel(courrielMotDePasseChange(email, langue), env),
            }),
        env,
    ),
);
