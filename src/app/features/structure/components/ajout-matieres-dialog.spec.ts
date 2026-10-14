import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { AjoutMatieresDialog, coefficientValide } from './ajout-matieres-dialog';

describe('AjoutMatieresDialog', () => {
    let fixture: ComponentFixture<AjoutMatieresDialog>;
    let element: HTMLElement;
    const ref = { close: vi.fn() };
    const ajouter = vi.fn();
    const bouton = (debut: string) => [...element.querySelectorAll('button')].find((b) => b.textContent!.trim().startsWith(debut)) as HTMLButtonElement;
    const cases = () => [...element.querySelectorAll('ul input[type=checkbox]')] as HTMLInputElement[];
    async function stable(): Promise<void> {
        await new Promise((r) => setTimeout(r));
        await fixture.whenStable();
    }
    function saisir(champ: HTMLInputElement | HTMLSelectElement, valeur: string, evenement = 'input'): void {
        champ.value = valeur;
        champ.dispatchEvent(new Event(evenement));
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        ajouter.mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                { provide: DialogRef, useValue: ref },
                {
                    provide: DIALOG_DATA,
                    useValue: {
                        classeNom: 'CE1 A',
                        matieres: [
                            { id: 'm1', nom: 'Coran', code: 'COR', type: 'coran', archivee: false },
                            { id: 'm2', nom: 'Éducation islamique', code: 'EDU', type: 'religieux', archivee: false },
                            { id: 'm3', nom: 'Français', code: 'FR', type: 'scolaire', archivee: false },
                        ],
                        enseignants: [
                            { id: 'e1', nom: 'Modou Fall', actif: true },
                            { id: 'e2', nom: 'Ancien', actif: false },
                        ],
                        ajouter,
                    },
                },
            ],
        });
        fixture = TestBed.createComponent(AjoutMatieresDialog);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    });

    it('coefficient : 0,5 à 20 par demi-points', () => {
        expect([0.5, 1, 2.5, 20].every(coefficientValide)).toBe(true);
        expect([0, 0.25, 20.5, Number.NaN].some(coefficientValide)).toBe(false);
    });

    it('plusieurs matières en un envoi, chacune avec son coefficient et son enseignant', async () => {
        expect(bouton('Ajouter 0').disabled).toBe(true);
        cases()[0].click();
        cases()[2].click();
        await stable();
        const coefficients = [...element.querySelectorAll('input[type=number]')] as HTMLInputElement[];
        expect(coefficients.length).toBe(2);
        saisir(coefficients[0], '3');
        saisir(element.querySelector('select') as HTMLSelectElement, 'e1', 'change');
        await stable();
        bouton('Ajouter 2').click();
        await stable();
        expect(ajouter).toHaveBeenCalledWith([
            { matiereId: 'm1', coefficient: 3, enseignantId: 'e1' },
            { matiereId: 'm3', coefficient: 1, enseignantId: null },
        ]);
        expect(ref.close).toHaveBeenCalledWith(true);
    });

    it('recherche sans accents, « Tout sélectionner » sur les matières affichées, coefficient invalide bloquant', async () => {
        saisir(element.querySelector('input[type=search]') as HTMLInputElement, 'educ');
        await stable();
        expect(cases().length).toBe(1);
        (element.querySelector('label input[type=checkbox]') as HTMLInputElement).click();
        await stable();
        saisir(element.querySelector('input[type=number]') as HTMLInputElement, '25');
        await stable();
        expect(element.textContent).toContain('Coefficient de 0,5 à 20');
        expect(bouton('Ajouter 1').disabled).toBe(true);
        // Les enseignants désactivés ne sont pas proposés.
        expect(element.querySelector('select')!.textContent).not.toContain('Ancien');
    });
});
