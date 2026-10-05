import { MODULES, ModuleDaara } from './daara.model';

/*
 * Catalogue des modules (ADR-008) : mêmes prérequis que `prerequis_module()` en base, qui reste la référence
 * (le front s'en sert pour expliquer et prévenir, la base pour refuser).
 */

export const PREREQUIS: Readonly<Record<ModuleDaara, readonly ModuleDaara[]>> = {
    structure: [],
    absences: ['structure'],
    notes: ['structure'],
    bulletins: ['notes'],
    coran_cahier: [],
    coran_recitations: ['coran_cahier'],
    coran_nafar: ['coran_cahier'],
    notifications: [],
};

/** Ensemble complété de tous ses prérequis (bulletins → notes → structure), dans l'ordre du catalogue. */
export function avecPrerequis(modules: Iterable<ModuleDaara>): ModuleDaara[] {
    const ensemble = new Set<ModuleDaara>();
    const ajouter = (m: ModuleDaara): void => {
        if (!ensemble.has(m)) {
            ensemble.add(m);
            PREREQUIS[m].forEach(ajouter);
        }
    };
    [...modules].forEach(ajouter);
    return MODULES.filter((m) => ensemble.has(m));
}

/** Modules actifs qui requièrent `module` (directement ou non) : il ne peut pas être désactivé seul. */
export function dependantsActifs(module: ModuleDaara, actifs: readonly ModuleDaara[]): ModuleDaara[] {
    return actifs.filter((m) => m !== module && avecPrerequis([m]).includes(module));
}

/** Profils proposés à l'onboarding (ADR-008, `docs/features/modules.md`). */
export type ProfilDaara = 'coranique' | 'franco_arabe' | 'personnalise';

export const MODULES_DU_PROFIL: Readonly<Record<Exclude<ProfilDaara, 'personnalise'>, readonly ModuleDaara[]>> = {
    coranique: ['structure', 'absences', 'coran_cahier', 'coran_recitations', 'coran_nafar', 'notifications'],
    franco_arabe: MODULES,
};
