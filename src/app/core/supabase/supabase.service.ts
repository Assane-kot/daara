import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Database } from './database.types';

/**
 * Instance unique du client Supabase (LLD §2). Seuls les services de feature l'utilisent :
 * jamais d'appel `supabase.from()` dans un composant (règles Angular).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
    readonly client: SupabaseClient<Database> = createClient<Database>(environment.supabaseUrl, environment.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

    /** Vérifie que l'API Auth répond (diagnostic au démarrage en développement). */
    async verifierConnexion(): Promise<boolean> {
        try {
            const reponse = await fetch(`${environment.supabaseUrl}/auth/v1/health`, {
                headers: { apikey: environment.supabaseAnonKey },
            });
            return reponse.ok;
        } catch {
            return false;
        }
    }
}
