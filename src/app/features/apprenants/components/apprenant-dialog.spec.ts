import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { ApprenantDialog } from './apprenant-dialog';

describe('ApprenantDialog', () => {
    let fixture: ComponentFixture<ApprenantDialog>;
    let element: HTMLElement;
    const enregistrer = vi.fn();
    const ref = { close: vi.fn() };

    function saisir(index: number, valeur: string): void {
        const champ = element.querySelectorAll('input')[index];
        champ.value = valeur;
        champ.dispatchEvent(new Event('input'));
    }
    const bouton = (texte: string) => [...element.querySelectorAll('button')].find((b) => b.textContent!.trim() === texte) as HTMLButtonElement;
    async function stable(): Promise<void> {
        await new Promise((r) => setTimeout(r));
        await fixture.whenStable();
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        enregistrer.mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [provideTranslateTesting(), { provide: DialogRef, useValue: ref }, { provide: DIALOG_DATA, useValue: { enregistrer } }],
        });
        fixture = TestBed.createComponent(ApprenantDialog);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    });

    it('« Enregistrer et ajouter un autre » : modale ouverte, prénom vidé, nom gardé (fratrie), compteur', async () => {
        saisir(0, ' Awa ');
        saisir(1, 'Ndiaye');
        bouton('Enregistrer et ajouter un autre').click();
        await stable();

        expect(enregistrer).toHaveBeenCalledWith({ prenom: 'Awa', nom: 'Ndiaye', dateNaissance: null, sexe: null });
        expect(ref.close).not.toHaveBeenCalled();
        expect((element.querySelectorAll('input')[0] as HTMLInputElement).value).toBe('');
        expect((element.querySelectorAll('input')[1] as HTMLInputElement).value).toBe('Ndiaye');
        expect(element.querySelector('[role=status]')?.textContent).toContain('1 élève(s) ajouté(s)');
        // Fermer après une saisie en série : la liste doit être rechargée.
        bouton('Fermer').click();
        expect(ref.close).toHaveBeenCalledWith(true);
    });

    it('« Enregistrer » : ferme la modale ; champs obligatoires contrôlés', async () => {
        element.querySelector('form')?.dispatchEvent(new Event('submit'));
        await stable();
        expect(enregistrer).not.toHaveBeenCalled();

        saisir(0, 'Modou');
        saisir(1, 'Fall');
        element.querySelector('form')?.dispatchEvent(new Event('submit'));
        await stable();
        expect(ref.close).toHaveBeenCalledWith(true);
    });
});
