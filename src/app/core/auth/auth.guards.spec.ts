import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { anonymeGuard, authGuard, avecDaaraGuard, mfaGuard, sansDaaraGuard } from './auth.guards';
import { AuthService } from './auth.service';

describe('Guards du parcours d’authentification', () => {
    const auth = {
        sessionActuelle: vi.fn(),
        destination: vi.fn(),
        mfaRequise: vi.fn(),
        rolesActifs: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();
        TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
    });

    async function executer(guard: CanActivateFn): Promise<string | true> {
        const resultat = await TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
        return resultat instanceof UrlTree ? TestBed.inject(Router).serializeUrl(resultat) : (resultat as true);
    }

    it('authGuard : non connecté → connexion', async () => {
        auth.sessionActuelle.mockResolvedValue(null);
        expect(await executer(authGuard)).toBe('/auth/connexion');

        auth.sessionActuelle.mockResolvedValue({});
        expect(await executer(authGuard)).toBe(true);
    });

    it('anonymeGuard : connecté → renvoyé à sa destination', async () => {
        auth.sessionActuelle.mockResolvedValue(null);
        expect(await executer(anonymeGuard)).toBe(true);

        auth.sessionActuelle.mockResolvedValue({});
        auth.destination.mockResolvedValue('/onboarding');
        expect(await executer(anonymeGuard)).toBe('/onboarding');
    });

    it('mfaGuard : admin en aal1 → /auth/mfa', async () => {
        auth.mfaRequise.mockResolvedValue(true);
        expect(await executer(mfaGuard)).toBe('/auth/mfa');

        auth.mfaRequise.mockResolvedValue(false);
        expect(await executer(mfaGuard)).toBe(true);
    });

    it('avecDaaraGuard et sansDaaraGuard : 0 daara → onboarding, sinon espace', async () => {
        auth.rolesActifs.mockResolvedValue([]);
        expect(await executer(avecDaaraGuard)).toBe('/onboarding');
        expect(await executer(sansDaaraGuard)).toBe(true);

        auth.rolesActifs.mockResolvedValue(['parent']);
        expect(await executer(avecDaaraGuard)).toBe(true);
        expect(await executer(sansDaaraGuard)).toBe('/');
    });
});
