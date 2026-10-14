import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { provideSignauxTesting } from '../../../testing/signaux-testing';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { DemarrageGuide } from './demarrage-guide';
import { DemarrageService, EtatDaara, etapesDemarrage } from './demarrage.service';

const VIDE: EtatDaara = { anneeActive: false, matieres: 0, classes: 0, eleves: 0, inscrits: 0, enseignants: 0, parents: 0 };

describe('etapesDemarrage', () => {
    it('école franco-arabe (structure + notes) : 7 étapes dans l’ordre', () => {
        expect(etapesDemarrage(VIDE, { structure: true, notes: true }).map((e) => e.cle)).toEqual([
            'annee',
            'matieres',
            'classes',
            'eleves',
            'inscriptions',
            'enseignants',
            'parents',
        ]);
    });

    it('daara coranique (sans structure) : élèves, enseignants, parents', () => {
        expect(etapesDemarrage(VIDE, { structure: false, notes: false }).map((e) => e.cle)).toEqual(['eleves', 'enseignants', 'parents']);
    });

    it('étapes faites d’après les comptages', () => {
        const etapes = etapesDemarrage({ ...VIDE, anneeActive: true, classes: 2, eleves: 30 }, { structure: true, notes: false });
        expect(etapes.filter((e) => e.faite).map((e) => e.cle)).toEqual(['annee', 'classes', 'eleves']);
    });
});

describe('DemarrageGuide', () => {
    let fixture: ComponentFixture<DemarrageGuide>;
    let element: HTMLElement;
    const service = { etat: vi.fn() };
    const courante = { id: () => 'd1', slug: () => 'ma-daara', moduleActif: (m: string) => m === 'structure' };
    async function stable(): Promise<void> {
        for (let i = 0; i < 3; i++) {
            await new Promise((r) => setTimeout(r));
        }
        await fixture.whenStable();
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        localStorage.removeItem('daara.demarrage-masque.d1');
        service.etat.mockResolvedValue({ ...VIDE, anneeActive: true });
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                provideSignauxTesting(),
                provideRouter([]),
                { provide: DemarrageService, useValue: service },
                { provide: CurrentDaaraService, useValue: courante },
            ],
        });
        fixture = TestBed.createComponent(DemarrageGuide);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    });

    it('avancement et un seul bouton principal vers la prochaine étape', () => {
        expect(element.textContent).toContain('1 étape(s) sur 6 faites');
        const principal = element.querySelectorAll('a.btn-primary');
        expect(principal.length).toBe(1);
        expect(principal[0].textContent!.trim()).toBe('Créer les classes');
        expect(principal[0].getAttribute('href')).toBe('/d/ma-daara/structure/classes');
    });

    it('« Masquer ce guide » est mémorisé, « Afficher » le rétablit', async () => {
        ([...element.querySelectorAll('button')].find((b) => b.textContent!.includes('Masquer')) as HTMLButtonElement).click();
        await stable();
        expect(element.querySelector('section')).toBeNull();
        expect(localStorage.getItem('daara.demarrage-masque.d1')).toBe('1');
        ([...element.querySelectorAll('button')].find((b) => b.textContent!.includes('Afficher')) as HTMLButtonElement).click();
        await stable();
        expect(element.querySelector('section')).not.toBeNull();
        expect(localStorage.getItem('daara.demarrage-masque.d1')).toBeNull();
    });
});
