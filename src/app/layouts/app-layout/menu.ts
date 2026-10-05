import { ModuleDaara, RoleMembre } from '../../core/daara/daara.model';

export type IconeMenu = 'tableau' | 'membres' | 'parametres' | 'compte';

/**
 * Entrée de menu déclarée en données (LLD §2) : affichée seulement si le rôle et le module le permettent.
 * Chaque story ajoute ses entrées ici (membres S2.4, paramètres S2.3, compte S2.7, puis les modules).
 */
export interface EntreeMenu {
    /** Clé de traduction du libellé. */
    readonly cle: string;
    readonly icone: IconeMenu;
    /** Chemin relatif à `/d/:slug` ('' = tableau de bord). */
    readonly route: string;
    /** Rôles autorisés ; absent = tous les membres. */
    readonly roles?: readonly RoleMembre[];
    /** Module requis (ADR-008) ; absent = socle. */
    readonly module?: ModuleDaara;
    /** Présente dans la barre basse mobile des parents et apprenants (4 entrées max). */
    readonly barreBasse?: boolean;
}

export const MENU: readonly EntreeMenu[] = [
    { cle: 'menu.tableau_de_bord', icone: 'tableau', route: '', barreBasse: true },
    { cle: 'menu.parametres', icone: 'parametres', route: 'parametres', roles: ['admin'] },
];

/** Entrées visibles pour des rôles et des modules donnés, dans l'ordre déclaré. */
export function menuVisible(menu: readonly EntreeMenu[], roles: readonly RoleMembre[], modules: readonly ModuleDaara[]): EntreeMenu[] {
    return menu.filter((e) => (!e.roles || e.roles.some((r) => roles.includes(r))) && (!e.module || modules.includes(e.module)));
}

/** Entrées de la barre basse (4 au plus). */
export function barreBasseVisible(menu: readonly EntreeMenu[], roles: readonly RoleMembre[], modules: readonly ModuleDaara[]): EntreeMenu[] {
    return menuVisible(menu, roles, modules)
        .filter((e) => e.barreBasse)
        .slice(0, 4);
}
