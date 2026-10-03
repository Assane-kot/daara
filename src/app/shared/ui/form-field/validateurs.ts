import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Mot de passe DAARA (ADR-006) : au moins 8 caractères, une lettre et un chiffre. Même règle que Supabase Auth
 * (`password_requirements = "letters_digits"`), qui reste le contrôle de référence.
 */
export const motDePasseValidateur: ValidatorFn = (controle: AbstractControl<string | null>): ValidationErrors | null => {
    const valeur = controle.value ?? '';
    if (!valeur) {
        return null;
    }
    return valeur.length >= 8 && /\p{L}/u.test(valeur) && /\d/.test(valeur) ? null : { motDePasse: true };
};

/** Code à 6 chiffres (e-mail ou application d'authentification). */
export const codeValidateur: ValidatorFn = (controle: AbstractControl<string | null>): ValidationErrors | null => {
    const valeur = controle.value ?? '';
    if (!valeur) {
        return null;
    }
    return /^\d{6}$/.test(valeur) ? null : { code: true };
};

/** Identique au champ « confirmation » d'un autre contrôle du même groupe. */
export function identiqueA(nomAutre: string): ValidatorFn {
    return (controle: AbstractControl<string | null>): ValidationErrors | null => {
        const autre = controle.parent?.get(nomAutre)?.value;
        return !controle.value || controle.value === autre ? null : { different: true };
    };
}
