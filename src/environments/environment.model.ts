/**
 * Configuration publique du front. Ne contient JAMAIS de secret : uniquement l'URL du projet Supabase
 * et sa clé publique (anon / publishable), protégée par la RLS (règles de sécurité, ADR-001), et le DSN
 * Sentry, public par conception (il ne permet que d'envoyer des erreurs).
 */
export interface Environment {
    readonly production: boolean;
    readonly supabaseUrl: string;
    readonly supabaseAnonKey: string;
    /** `null` : suivi des erreurs désactivé (développement, builds hors Cloudflare). */
    readonly sentryDsn: string | null;
    /** `production` (branche main), `preview` (autres branches), `development`. */
    readonly sentryEnvironment: string;
    /** Version déployée (commit), pour relier une erreur à un déploiement. */
    readonly release: string;
}
