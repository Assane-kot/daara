import { Database } from '../supabase/database.types';

export type RoleMembre = Database['public']['Enums']['role_membre'];

/**
 * Modules activables par daara (ADR-008). Liste locale jusqu'à la migration de S2.2, qui créera l'enum
 * `module_daara` : ce type sera alors repris de `database.types.ts`.
 */
export const MODULES = ['structure', 'absences', 'notes', 'bulletins', 'coran_cahier', 'coran_recitations', 'coran_nafar', 'notifications'] as const;
export type ModuleDaara = (typeof MODULES)[number];

/** Daara accessible à l'utilisateur, avec ses rôles actifs (lue dans ses propres memberships). */
export interface DaaraAccessible {
    readonly id: string;
    readonly slug: string;
    readonly nom: string;
    readonly ville: string | null;
    readonly logoPath: string | null;
    readonly roles: readonly RoleMembre[];
}

const CLE_DERNIERE_DAARA = 'daara.derniere';

/** Dernière daara ouverte (préférence de confort, toujours revérifiée : LLD §7.1 ter). */
export function lireDerniereDaara(): string | null {
    try {
        return globalThis.localStorage?.getItem(CLE_DERNIERE_DAARA) ?? null;
    } catch {
        return null;
    }
}

/** À la déconnexion : sur un téléphone partagé, la personne suivante ne voit pas la daara fréquentée. */
export function oublierDerniereDaara(): void {
    try {
        globalThis.localStorage?.removeItem(CLE_DERNIERE_DAARA);
    } catch {
        // Stockage indisponible : rien à effacer.
    }
}

export function memoriserDerniereDaara(slug: string): void {
    try {
        globalThis.localStorage?.setItem(CLE_DERNIERE_DAARA, slug);
    } catch {
        // Stockage indisponible (navigation privée) : la préférence n'est pas mémorisée.
    }
}
