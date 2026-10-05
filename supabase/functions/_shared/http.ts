// Réponses et CORS communs (LLD §6) : réponses `{ code }` (clé d'erreur traduite par le front), CORS limité aux origines
// de l'application.

export interface Reponse {
    readonly status: number;
    readonly corps: Record<string, unknown>;
}

export const ok = (corps: Record<string, unknown>): Reponse => ({ status: 200, corps });
export const erreur = (status: number, code: string): Reponse => ({ status, corps: { code } });

/** Origines autorisées : `ORIGINES_AUTORISEES` (séparées par des virgules), sinon `APP_URL`. */
export function originesAutorisees(env: (nom: string) => string | undefined): string[] {
    const liste = env('ORIGINES_AUTORISEES') ?? env('APP_URL') ?? '';
    return liste
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean);
}

export function entetesCors(origine: string | null, autorisees: readonly string[]): Record<string, string> {
    const entetes: Record<string, string> = {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        Vary: 'Origin',
    };
    if (origine && autorisees.includes(origine)) {
        entetes['Access-Control-Allow-Origin'] = origine;
    }
    return entetes;
}

/**
 * Enveloppe commune d'une Edge Function : CORS, POST uniquement, corps JSON, erreurs inattendues sans détail
 * (aucune donnée personnelle dans les journaux).
 */
export function servir(
    traiter: (corps: unknown, requete: Request) => Promise<Reponse>,
    env: (nom: string) => string | undefined,
): (requete: Request) => Promise<Response> {
    const autorisees = originesAutorisees(env);
    return async (requete) => {
        const cors = entetesCors(requete.headers.get('Origin'), autorisees);
        const repondre = (r: Reponse) => new Response(JSON.stringify(r.corps), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
        if (requete.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }
        if (requete.method !== 'POST') {
            return repondre(erreur(405, 'methode'));
        }
        let corps: unknown;
        try {
            corps = await requete.json();
        } catch {
            return repondre(erreur(400, 'donnee_invalide'));
        }
        try {
            return repondre(await traiter(corps, requete));
        } catch (e) {
            console.error('erreur_inattendue', e instanceof Error ? e.name : typeof e);
            return repondre(erreur(500, 'inattendue'));
        }
    };
}

/** Code PostgREST / RPC → réponse : le message de la RPC est déjà une clé (`admin_aal2_requis`, `deja_membre`…). */
export function erreurRpc(e: { code?: string; message?: string }): Reponse {
    const message = /^[a-z_0-9]+$/.test(e.message ?? '') ? (e.message as string) : 'inattendue';
    switch (e.code) {
        case '42501':
            return erreur(403, message);
        case '22023':
            return erreur(message.startsWith('invitation_') ? 410 : 400, message);
        case '23505':
            return erreur(409, message);
        case '23514':
            return erreur(400, 'donnee_invalide');
        case 'P0001':
            return erreur(429, message);
        default:
            return erreur(500, 'inattendue');
    }
}
