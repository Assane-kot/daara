import { Database } from '../supabase/database.types';

export type RoleMembre = Database['public']['Enums']['role_membre'];

/** Modules activables par daara (ADR-008), enum `module_daara`. */
export type ModuleDaara = Database['public']['Enums']['module_daara'];

/** Tous les modules, dans l'ordre de l'enum (et de l'écran Modules). */
export const MODULES: readonly ModuleDaara[] = [
    'structure',
    'absences',
    'notes',
    'bulletins',
    'coran_cahier',
    'coran_recitations',
    'coran_nafar',
    'notifications',
];

/** Daara accessible à l'utilisateur, avec ses rôles actifs (lue dans ses propres memberships). */
export interface DaaraAccessible {
    readonly id: string;
    readonly slug: string;
    readonly nom: string;
    readonly ville: string | null;
    readonly logoPath: string | null;
    /** URL publique du logo (bucket `logos`), avec `?v=` qui change à chaque modification de la daara (anti-cache). */
    readonly logoUrl: string | null;
    readonly roles: readonly RoleMembre[];
    /** Modules actifs de la daara (ADR-008). */
    readonly modules: readonly ModuleDaara[];
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
