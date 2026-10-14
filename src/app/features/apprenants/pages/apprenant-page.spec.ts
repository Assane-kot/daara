import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { provideSignauxTesting } from '../../../../testing/signaux-testing';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { ParentsService } from '../data/parents.service';
import { ApprenantsService } from '../data/apprenants.service';
import { InscriptionsService } from '../data/inscriptions.service';
import { ApprenantPage } from './apprenant-page';

describe('ApprenantPage', () => {
    let fixture: ComponentFixture<ApprenantPage>;
    const service = { detail: vi.fn(), urlPhoto: vi.fn(), anneeActive: vi.fn(), classesAnneeActive: vi.fn() };
    const inscriptions = { deLEleve: vi.fn() };

    beforeEach(async () => {
        vi.resetAllMocks();
        service.detail.mockResolvedValue({
            id: 'e1',
            matricule: '2026-0001',
            nom: 'Diop',
            prenom: 'Mamadou',
            dateNaissance: null,
            sexe: 'M',
            statut: 'inscrit',
            photoPath: null,
        });
        service.urlPhoto.mockResolvedValue(null);
        service.anneeActive.mockResolvedValue('a1');
        service.classesAnneeActive.mockResolvedValue([
            { id: 'c1', nom: '3ème A', anneeId: 'a1' },
            { id: 'c2', nom: '4ème A', anneeId: 'a1' },
        ]);
        inscriptions.deLEleve.mockResolvedValue([{ id: 'i1', classeId: 'c2', classeNom: '4ème A', anneeId: 'a1' }]);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                provideSignauxTesting(),
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['apprenantId', 'e1']]) } } },
                { provide: ApprenantsService, useValue: service },
                { provide: InscriptionsService, useValue: inscriptions },
                { provide: ParentsService, useValue: { parentsDe: vi.fn().mockResolvedValue([]) } },
                { provide: CurrentDaaraService, useValue: { roles: () => ['admin'], id: () => 'd1', slug: () => 'ma-daara', moduleActif: () => false } },
            ],
        });
        fixture = TestBed.createComponent(ApprenantPage);
        for (let i = 0; i < 5; i++) {
            await new Promise((r) => setTimeout(r));
        }
        await fixture.whenStable();
    });

    it('élève inscrit : sa classe est choisie dans la liste (pas « Pas encore de classe »)', () => {
        const select = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;
        expect(select.selectedOptions[0].textContent!.trim()).toBe('4ème A');
    });
});
