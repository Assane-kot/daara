import { TestBed } from '@angular/core/testing';
import { CurrentDaaraService } from './current-daara.service';
import { DaaraAccessible, MODULES } from './daara.model';

const daara = (roles: DaaraAccessible['roles']): DaaraAccessible => ({
    id: 'd-1',
    slug: 'daara-touba',
    nom: 'Daara Touba',
    ville: null,
    logoPath: null,
    roles,
    modules: MODULES,
});

describe('CurrentDaaraService', () => {
    let service: CurrentDaaraService;

    beforeEach(() => {
        localStorage.clear();
        service = TestBed.inject(CurrentDaaraService);
    });

    it('expose la daara ouverte, ses rôles et ses modules', () => {
        expect(service.daara()).toBeNull();
        expect(service.modules()).toEqual([]);

        service.definir(daara(['admin', 'enseignant']));

        expect(service.id()).toBe('d-1');
        expect(service.slug()).toBe('daara-touba');
        expect(service.hasRole('admin')).toBe(true);
        expect(service.hasRole('parent')).toBe(false);
        expect(service.modules()).toEqual(MODULES);
        expect(service.moduleActif('bulletins')).toBe(true);
        expect(localStorage.getItem('daara.derniere')).toBe('daara-touba');
    });

    it('famille : parents et apprenants uniquement', () => {
        service.definir(daara(['parent']));
        expect(service.famille()).toBe(true);
        service.definir(daara(['parent', 'apprenant']));
        expect(service.famille()).toBe(true);
        service.definir(daara(['parent', 'enseignant']));
        expect(service.famille()).toBe(false);
    });

    it('vider ferme la daara', () => {
        service.definir(daara(['parent']));
        service.vider();
        expect(service.daara()).toBeNull();
        expect(service.famille()).toBe(false);
    });
});
