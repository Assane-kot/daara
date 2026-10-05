import { authGuard, mfaGuard, sansDaaraGuard } from './core/auth/auth.guards';
import { daaraGuard } from './core/daara/daara.guards';
import { routes } from './app.routes';

describe('Routes', () => {
    const route = (chemin: string) => routes.find((r) => r.path === chemin);

    it("/onboarding : double authentification vérifiée avant de juger l'absence de daara (audit S2.1)", () => {
        expect(route('onboarding')?.canActivate).toEqual([authGuard, mfaGuard, sansDaaraGuard]);
    });

    it('/d/:slug : session, double authentification, daara', () => {
        expect(route('d/:slug')?.canActivate).toEqual([authGuard, mfaGuard, daaraGuard]);
    });
});
