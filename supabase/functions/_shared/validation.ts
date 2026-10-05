// Validation des entrées des Edge Functions (LLD §6) : mêmes règles que les contraintes de la base, qui restent la
// référence. Aucune exception : chaque fonction renvoie la valeur normalisée ou null.

export type Role = 'admin' | 'enseignant' | 'parent';
export type Langue = 'fr' | 'en';

const ROLES_INVITABLES: readonly Role[] = ['admin', 'enseignant', 'parent'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Une seule adresse : ni espace ni séparateur ou caractère d'adresse composée (même règle que la contrainte SQL).
const EMAIL = /^[^@\s,;<>"()[\]\\]+@[^@\s,;<>"()[\]\\]+\.[^@\s,;<>"()[\]\\]+$/;
const E164 = /^\+[1-9][0-9]{7,14}$/;
const JETON = /^[A-Za-z0-9_-]{43}$/;
// Caractères de contrôle, invisibles ou bidirectionnels (contrainte « caractères interdits » du socle, LLD §3.2).
const INTERDITS = /[\p{Cc}\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/u;

/** Corps JSON objet, sinon null. */
export function objet(valeur: unknown): Record<string, unknown> | null {
    return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur) ? (valeur as Record<string, unknown>) : null;
}

export function uuid(valeur: unknown): string | null {
    return typeof valeur === 'string' && UUID.test(valeur) ? valeur : null;
}

export function role(valeur: unknown): Role | null {
    return ROLES_INVITABLES.includes(valeur as Role) ? (valeur as Role) : null;
}

export function langue(valeur: unknown): Langue {
    return valeur === 'en' ? 'en' : 'fr';
}

/** E-mail en minuscules, sans espaces autour ; null si absent ou invalide. */
export function email(valeur: unknown): string | null {
    if (typeof valeur !== 'string') {
        return null;
    }
    const e = valeur.trim().toLowerCase();
    return e.length > 0 && e.length <= 254 && EMAIL.test(e) ? e : null;
}

/**
 * Numéro au format E.164. Accepte espaces, points et tirets ; « 00 » devient « + » ; un numéro sénégalais à 9 chiffres
 * (7x ou 3x) reçoit l'indicatif +221 (ADR-009). Null si le résultat n'est pas un numéro E.164.
 */
export function telephone(valeur: unknown): string | null {
    if (typeof valeur !== 'string') {
        return null;
    }
    const brut = valeur.trim();
    if (!/^\+?[0-9 .()-]+$/.test(brut)) {
        return null;
    }
    let chiffres = brut.replace(/[^0-9]/g, '');
    if (brut.startsWith('+')) {
        chiffres = '+' + chiffres;
    } else if (chiffres.startsWith('00')) {
        chiffres = '+' + chiffres.slice(2);
    } else if (/^[37][0-9]{8}$/.test(chiffres)) {
        chiffres = '+221' + chiffres;
    } else {
        chiffres = '+' + chiffres;
    }
    return E164.test(chiffres) ? chiffres : null;
}

/** Nom ou prénom facultatif : texte ≤ 100 caractères sans caractère interdit ; undefined = invalide. */
export function nomFacultatif(valeur: unknown): string | null | undefined {
    if (valeur === undefined || valeur === null || valeur === '') {
        return null;
    }
    if (typeof valeur !== 'string') {
        return undefined;
    }
    const v = valeur.trim();
    return v.length <= 100 && !INTERDITS.test(v) ? v || null : undefined;
}

export function jeton(valeur: unknown): string | null {
    return typeof valeur === 'string' && JETON.test(valeur) ? valeur : null;
}

/** Mot de passe DAARA (ADR-006) : 8 à 72 caractères (limite bcrypt), au moins une lettre et un chiffre. */
export function motDePasse(valeur: unknown): string | null {
    return typeof valeur === 'string' && valeur.length >= 8 && valeur.length <= 72 && /\p{L}/u.test(valeur) && /[0-9]/.test(valeur) ? valeur : null;
}
