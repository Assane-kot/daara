/**
 * Configuration publique du front. Ne contient JAMAIS de secret : uniquement l'URL du projet Supabase
 * et sa clé publique (anon / publishable), protégée par la RLS (règles de sécurité, ADR-001).
 */
export interface Environment {
    readonly production: boolean;
    readonly supabaseUrl: string;
    readonly supabaseAnonKey: string;
}
