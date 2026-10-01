import { Environment } from './environment.model';

/**
 * Développement : Supabase local (`npm run db:start`). Clé publishable par défaut de tout Supabase local,
 * publique par conception. En production, remplacé par `environment.prod.ts` généré par `scripts/set-env.mjs`.
 */
export const environment: Environment = {
    production: false,
    supabaseUrl: 'http://127.0.0.1:54321',
    supabaseAnonKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
};
