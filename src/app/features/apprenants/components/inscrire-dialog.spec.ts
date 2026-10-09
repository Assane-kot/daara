import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { InscrireDialog } from './inscrire-dialog';

describe('InscrireDialog', () => {
    let fixture: ComponentFixture<InscrireDialog>;
    let element: HTMLElement;
    const inscrire = vi.fn();
    const ref = { close: vi.fn() };
    const candidats = [
        { id: 'a1', prenom: 'Awa', nom: 'Ndiaye', matricule: '2026-0001' },
        { id: 'a2', prenom: 'Élodie', nom: 'Faye', matricule: '2026-0002' },
        { id: 'a3', prenom: 'Modou', nom: 'Fall', matricule: '2026-0003' },
    ];
    async function stable(): Promise<void> {
        await new Promise((r) => setTimeout(r));
        await fixture.whenStable();
    }
    const bouton = (debut: string) => [...element.querySelectorAll('button')].find((b) => b.textContent!.trim().startsWith(debut)) as HTMLButtonElement;

    beforeEach(async () => {
        vi.resetAllMocks();
        inscrire.mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                { provide: DialogRef, useValue: ref },
                { provide: DIALOG_DATA, useValue: { classeNom: 'CE1', candidats, inscrire } },
            ],
        });
        fixture = TestBed.createComponent(InscrireDialog);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    });

    it('recherche sans accents, « Tout sélectionner » sur les élèves visibles, inscription de la sélection', async () => {
        expect(bouton('Inscrire (').disabled).toBe(true);
        const recherche = element.querySelector('input[type=search]') as HTMLInputElement;
        recherche.value = 'elodie';
        recherche.dispatchEvent(new Event('input'));
        await stable();
        expect(element.querySelectorAll('li').length).toBe(1);

        (element.querySelector('label input[type=checkbox]') as HTMLInputElement).click();
        await stable();
        recherche.value = '';
        recherche.dispatchEvent(new Event('input'));
        await stable();
        (element.querySelectorAll('li input')[0] as HTMLInputElement).click();
        await stable();
        expect(bouton('Inscrire (').textContent).toContain('Inscrire (2)');

        bouton('Inscrire (').click();
        await stable();
        expect(inscrire).toHaveBeenCalledWith(['a2', 'a1']);
        expect(ref.close).toHaveBeenCalledWith(true);
    });
});
