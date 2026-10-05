// Edge Function `invitation-apercu` : publique (verify_jwt = false), le jeton fait office d'autorisation. Logique : logique.ts.

import { servir } from '../_shared/http.ts';
import { clientService, env } from '../_shared/supabase.ts';
import { apercevoir, type Apercu } from './logique.ts';

const service = clientService();

Deno.serve(
    servir(
        (corps) =>
            apercevoir(corps, {
                lireInvitation: async (jeton) => {
                    const { data, error } = await service.rpc('invitation_par_jeton', { p_token: jeton });
                    if (error) {
                        throw new Error('invitation_par_jeton');
                    }
                    return ((data as Apercu[] | null) ?? [])[0] ?? null;
                },
            }),
        env,
    ),
);
