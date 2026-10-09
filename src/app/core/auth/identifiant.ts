import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Identifiant de connexion (ADR-009) : e-mail, ou téléphone au format E.164. */
export type Identifiant = { readonly email: string } | { readonly telephone: string };

const E164 = /^\+[1-9][0-9]{7,14}$/;

/**
 * Numéro au format E.164 : espaces, points et tirets acceptés ; « 00 » devient « + » ; un numéro sénégalais à 9 chiffres
 * (7x ou 3x) reçoit +221. Même règle que les Edge Functions (`_shared/validation.ts`). Null si invalide.
 */
export function normaliserTelephone(texte: string): string | null {
    const brut = texte.trim();
    if (!/^\+?[0-9 .()-]+$/.test(brut)) {
        return null;
    }
    const chiffres = brut.replace(/[^0-9]/g, '');
    let numero: string;
    if (brut.startsWith('+')) {
        numero = '+' + chiffres;
    } else if (chiffres.startsWith('00')) {
        numero = '+' + chiffres.slice(2);
    } else if (/^[37][0-9]{8}$/.test(chiffres)) {
        numero = '+221' + chiffres;
    } else {
        numero = '+' + chiffres;
    }
    return E164.test(numero) ? numero : null;
}

/** Un « @ » : e-mail ; sinon téléphone. Null si ni l'un ni l'autre n'est valide. */
export function lireIdentifiant(texte: string): Identifiant | null {
    const t = texte.trim();
    if (t.includes('@')) {
        return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t) ? { email: t.toLowerCase() } : null;
    }
    const telephone = normaliserTelephone(t);
    return telephone ? { telephone } : null;
}

export const identifiantValidateur: ValidatorFn = (controle: AbstractControl<string | null>): ValidationErrors | null =>
    !controle.value || lireIdentifiant(controle.value) ? null : { identifiant: true };
