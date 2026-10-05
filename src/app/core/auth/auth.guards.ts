import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, ROUTES_AUTH } from './auth.service';

/*
 * Guards du parcours d'authentification (LLD §7.0). Confort d'interface uniquement : la RLS reste la vraie
 * protection (aucune donnée sans session, aucun droit d'admin sans `aal2`).
 * `inject()` est appelé avant tout `await` : après, on n'est plus dans le contexte d'injection.
 */

/** Session requise, sinon écran de connexion. */
export const authGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return (await auth.sessionActuelle()) ? true : router.parseUrl(ROUTES_AUTH.connexion);
};

/** Pages réservées aux visiteurs (connexion, inscription…) : un utilisateur connecté est renvoyé où il doit aller. */
export const anonymeGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!(await auth.sessionActuelle())) {
        return true;
    }
    return router.parseUrl(await auth.destination());
};

/** Double authentification faite si elle est requise (facteur vérifié, ou admin d'une daara : ADR-006). */
export const mfaGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return (await auth.mfaRequise()) ? router.parseUrl(ROUTES_AUTH.mfa) : true;
};

/** Espace de l'application : au moins une daara, sinon création de la sienne. */
export const avecDaaraGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return (await auth.rolesActifs()).length > 0 ? true : router.parseUrl(ROUTES_AUTH.onboarding);
};

/** Onboarding : uniquement sans daara (sprint 2 : rejoindre ou créer une autre daara depuis le sélecteur). */
export const sansDaaraGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return (await auth.rolesActifs()).length === 0 ? true : router.parseUrl(ROUTES_AUTH.racine);
};
