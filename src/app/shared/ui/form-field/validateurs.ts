import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Téléphone : même règle que les contraintes `daaras.telephone` et `profiles.telephone`. */
export const MOTIF_TELEPHONE = /^\+?[0-9][0-9 .-]{5,19}$/;

/**
 * Mot de passe DAARA (ADR-006) : au moins 8 caractères, une lettre et un chiffre. Même règle que Supabase Auth
 * (`password_requirements = "letters_digits"`), qui reste le contrôle de référence.
 */
export const motDePasseValidateur: ValidatorFn = (controle: AbstractControl<string | null>): ValidationErrors | null => {
    const valeur = controle.value ?? '';
    if (!valeur) {
        return null;
    }
    // Lettre ASCII (règle `letters_digits` d'Auth) ; 72 octets au plus (bcrypt).
    return valeur.length >= 8 && new TextEncoder().encode(valeur).length <= 72 && /[A-Za-z]/.test(valeur) && /\d/.test(valeur) ? null : { motDePasse: true };
};

/** Code à 6 chiffres (e-mail ou application d'authentification). */
export const codeValidateur: ValidatorFn = (controle: AbstractControl<string | null>): ValidationErrors | null => {
    const valeur = controle.value ?? '';
    if (!valeur) {
        return null;
    }
    return /^\d{6}$/.test(valeur) ? null : { code: true };
};

/** Code d'accès remis par l'admin (S2.6) : 8 caractères sans 0 / O / 1 / I, tiret et espaces tolérés. */
export const codeAccesValidateur: ValidatorFn = (controle: AbstractControl<string | null>): ValidationErrors | null => {
    const valeur = controle.value ?? '';
    if (!valeur) {
        return null;
    }
    return normaliserCodeAcces(valeur) ? null : { codeAcces: true };
};

/** Code d'accès normalisé (majuscules, sans tiret ni espace), ou null s'il est invalide. */
export function normaliserCodeAcces(valeur: string): string | null {
    const code = valeur.replace(/[\s-]/g, '').toUpperCase();
    return /^[A-HJ-NP-Z2-9]{8}$/.test(code) ? code : null;
}

/** Identique au champ « confirmation » d'un autre contrôle du même groupe. */
export function identiqueA(nomAutre: string): ValidatorFn {
    return (controle: AbstractControl<string | null>): ValidationErrors | null => {
        const autre = controle.parent?.get(nomAutre)?.value;
        return !controle.value || controle.value === autre ? null : { different: true };
    };
}
