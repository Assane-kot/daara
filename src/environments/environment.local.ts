import { Environment } from './environment.model';

/**
 * Valeurs du Supabase local (`npm run db:start`), publiques par conception. Fichier distinct de `environment.ts`
 * pour que le build de production hors Cloudflare puisse les reprendre : `environment.ts` y est remplacé par
 * `environment.prod.ts` (fileReplacements), qui ne peut donc pas l'importer sans s'importer lui-même.
 */
export const ENVIRONNEMENT_LOCAL: Environment = {
    production: false,
    supabaseUrl: 'http://127.0.0.1:54321',
    supabaseAnonKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
    // Clé de site de TEST Cloudflare (toujours valide), associée à la clé secrète de test de supabase/config.toml.
    turnstileSiteKey: '1x00000000000000000000AA',
    // Pas de suivi des erreurs en local.
    sentryDsn: null,
    sentryEnvironment: 'development',
    release: 'dev',
};
