// Vérification Cloudflare Turnstile côté serveur (fonctions publiques qui créent un compte). Secret : `TURNSTILE_SECRET`
// (clé de test en local, déclarée dans config.toml ; vraie clé en secret Supabase en cloud).

import type { Fetch } from './email.ts';

/** Clés secrètes de TEST publiées par Cloudflare (tout jeton passe ou rien ne passe) : refusées hors du local. */
const SECRET_DE_TEST = /^[123]x0{31}AA$/;

/** Supabase local (passerelle Kong, poste du développeur). */
export function estLocal(supabaseUrl: string | undefined): boolean {
    try {
        const hote = new URL(supabaseUrl ?? '').hostname;
        return ['kong', 'localhost', '127.0.0.1', 'host.docker.internal'].includes(hote);
    } catch {
        return false;
    }
}

export async function verifierTurnstile(jeton: unknown, env: (nom: string) => string | undefined, ip: string | null, fetchFn: Fetch = fetch): Promise<boolean> {
    const secret = env('TURNSTILE_SECRET');
    if (!secret || typeof jeton !== 'string' || jeton.length === 0 || jeton.length > 2048) {
        return false;
    }
    if (SECRET_DE_TEST.test(secret) && !estLocal(env('SUPABASE_URL'))) {
        console.error('turnstile_secret_de_test_refuse');
        return false;
    }
    const formulaire = new URLSearchParams({ secret, response: jeton });
    if (ip) {
        formulaire.set('remoteip', ip);
    }
    try {
        const r = await fetchFn('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: formulaire });
        const resultat = (await r.json()) as { success?: boolean; hostname?: string };
        if (resultat.success !== true) {
            return false;
        }
        // Jeton obtenu sur une autre application : refusé (hors clés de test, dont le nom d'hôte est fictif).
        const hotes = (env('ORIGINES_AUTORISEES') ?? env('APP_URL') ?? '')
            .split(',')
            .map((o) => {
                try {
                    return new URL(o.trim()).hostname;
                } catch {
                    return '';
                }
            })
            .filter(Boolean);
        return SECRET_DE_TEST.test(secret) || hotes.length === 0 || hotes.includes(resultat.hostname ?? '');
    } catch (e) {
        console.error('turnstile_erreur', e instanceof Error ? e.name : typeof e);
        return false;
    }
}
