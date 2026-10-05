import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService, ROUTES_AUTH, routeDaara } from '../auth/auth.service';
import { CurrentDaaraService } from './current-daara.service';
import { RoleMembre } from './daara.model';

/*
 * Guards de la navigation par daara (LLD §7.1 ter). Confort d'interface : la RLS ne renvoie de toute façon que les
 * données des daaras dont l'utilisateur est membre. `inject()` toujours avant le premier `await`.
 */

/** Slug de la daara dans l'URL, lu depuis la route ou l'un de ses parents. */
function slugDe(route: ActivatedRouteSnapshot): string | null {
    for (const r of route.pathFromRoot) {
        const slug = r.paramMap.get('slug');
        if (slug) {
            return slug;
        }
    }
    return null;
}

/** `/` : envoie l'utilisateur vers sa destination (connexion, mfa, onboarding, sa daara ou le sélecteur). */
export const racineGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return router.parseUrl(await auth.destination());
};

/** `/d/:slug` : daara dont l'utilisateur est membre actif, sinon sélecteur avec un message neutre. */
export const daaraGuard: CanActivateFn = async (route) => {
    const auth = inject(AuthService);
    const courante = inject(CurrentDaaraService);
    const router = inject(Router);
    const daaras = await auth.mesDaaras();
    const daara = daaras.find((d) => d.slug === slugDe(route));
    if (daara) {
        courante.definir(daara);
        courante.plusieursDaaras.set(daaras.length > 1);
        return true;
    }
    courante.vider();
    courante.message.set('navigation.daara_inaccessible');
    return router.parseUrl(ROUTES_AUTH.selectionDaara);
};

/** Route réservée à certains rôles dans la daara ouverte ; sinon tableau de bord de la daara avec un message. */
export function roleGuard(roles: RoleMembre[]): CanActivateFn {
    return async (route) => {
        const auth = inject(AuthService);
        const courante = inject(CurrentDaaraService);
        const router = inject(Router);
        const slug = slugDe(route);
        const daara = (await auth.mesDaaras()).find((d) => d.slug === slug);
        if (daara?.roles.some((r) => roles.includes(r))) {
            return true;
        }
        courante.message.set('navigation.acces_refuse');
        return router.parseUrl(daara ? routeDaara(daara.slug) : ROUTES_AUTH.selectionDaara);
    };
}
