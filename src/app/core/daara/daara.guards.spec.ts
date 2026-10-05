import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CurrentDaaraService } from './current-daara.service';
import { DaaraAccessible } from './daara.model';
import { daaraGuard, moduleGuard, racineGuard, roleGuard } from './daara.guards';

const TOUBA: DaaraAccessible = {
    id: 'd-1',
    slug: 'daara-touba',
    nom: 'Daara Touba',
    ville: 'Touba',
    logoPath: null,
    logoUrl: null,
    roles: ['enseignant'],
    modules: ['structure', 'notes'],
};
const THIES: DaaraAccessible = {
    id: 'd-2',
    slug: 'daara-thies',
    nom: 'Daara Thiès',
    ville: null,
    logoPath: null,
    logoUrl: null,
    roles: ['parent'],
    modules: ['coran_cahier'],
};

/** Route enfant de `/d/:slug`, comme celles que l'on protège. */
function routeDans(slug: string): ActivatedRouteSnapshot {
    const parent = { paramMap: convertToParamMap({ slug }) } as ActivatedRouteSnapshot;
    const enfant = { paramMap: convertToParamMap({}) } as ActivatedRouteSnapshot;
    Object.defineProperty(enfant, 'pathFromRoot', { value: [{ paramMap: convertToParamMap({}) }, parent, enfant] });
    return enfant;
}

describe('Guards de la navigation par daara', () => {
    const auth = { destination: vi.fn(), mesDaaras: vi.fn() };
    let courante: CurrentDaaraService;

    beforeEach(() => {
        vi.resetAllMocks();
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
        courante = TestBed.inject(CurrentDaaraService);
    });

    async function executer(guard: CanActivateFn, route: ActivatedRouteSnapshot): Promise<string | true> {
        const resultat = await TestBed.runInInjectionContext(() => guard(route, {} as RouterStateSnapshot));
        return resultat instanceof UrlTree ? TestBed.inject(Router).serializeUrl(resultat) : (resultat as true);
    }

    it('racineGuard : redirige vers la destination', async () => {
        auth.destination.mockResolvedValue('/d/daara-touba');
        expect(await executer(racineGuard, routeDans(''))).toBe('/d/daara-touba');
    });

    it('daaraGuard : daara de l’utilisateur → ouverte et mémorisée', async () => {
        auth.mesDaaras.mockResolvedValue([TOUBA, THIES]);
        expect(await executer(daaraGuard, routeDans('daara-touba'))).toBe(true);
        expect(courante.slug()).toBe('daara-touba');
        expect(courante.plusieursDaaras()).toBe(true);
        expect(localStorage.getItem('daara.derniere')).toBe('daara-touba');
    });

    it('daaraGuard : daara inconnue ou non membre → sélecteur avec un message neutre', async () => {
        auth.mesDaaras.mockResolvedValue([TOUBA]);
        expect(await executer(daaraGuard, routeDans('daara-autre'))).toBe('/select-daara');
        expect(courante.daara()).toBeNull();
        expect(courante.message()).toBe('navigation.daara_inaccessible');
    });

    it('roleGuard : rôle autorisé dans cette daara seulement', async () => {
        auth.mesDaaras.mockResolvedValue([TOUBA, THIES]);
        const enseignants = roleGuard(['admin', 'enseignant']);

        expect(await executer(enseignants, routeDans('daara-touba'))).toBe(true);
        // Parent dans l'autre daara : renvoyé au tableau de bord de cette daara.
        expect(await executer(enseignants, routeDans('daara-thies'))).toBe('/d/daara-thies');
        expect(courante.message()).toBe('navigation.acces_refuse');
    });

    it('moduleGuard : module actif dans cette daara seulement', async () => {
        auth.mesDaaras.mockResolvedValue([TOUBA, THIES]);
        const notes = moduleGuard('notes');

        expect(await executer(notes, routeDans('daara-touba'))).toBe(true);
        expect(await executer(notes, routeDans('daara-thies'))).toBe('/d/daara-thies');
        expect(courante.message()).toBe('navigation.module_inactif');
    });
});
