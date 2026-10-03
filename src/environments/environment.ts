import { ENVIRONNEMENT_LOCAL } from './environment.local';
import { Environment } from './environment.model';

/**
 * Développement : Supabase local (`npm run db:start`), valeurs dans `environment.local.ts`. En production, remplacé
 * par `environment.prod.ts` généré par `scripts/set-env.mjs`.
 */
export const environment: Environment = ENVIRONNEMENT_LOCAL;
