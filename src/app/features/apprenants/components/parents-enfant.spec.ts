import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { RelierParentDialog } from './parents-enfant';

describe('RelierParentDialog', () => {
    let fixture: ComponentFixture<RelierParentDialog>;
    let element: HTMLElement;
    const ref = { close: vi.fn() };
    const bouton = (debut: string) => [...element.querySelectorAll('button')].find((b) => b.textContent!.trim().startsWith(debut)) as HTMLButtonElement;
    async function stable(): Promise<void> {
        await new Promise((r) => setTimeout(r));
        await fixture.whenStable();
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                { provide: DialogRef, useValue: ref },
                { provide: DIALOG_DATA, useValue: { enfant: 'Awa Ndiaye', parents: [{ userId: 'p1', nom: 'Fatou Ndiaye', telephone: '+221770000000' }] } },
            ],
        });
        fixture = TestBed.createComponent(RelierParentDialog);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    });

    it('le lien est demandé d’abord ; parent déjà inscrit relié en un clic', async () => {
        expect(bouton('Relier ce parent').disabled).toBe(true);
        expect(bouton('Inviter un nouveau parent').disabled).toBe(true);
        (element.querySelectorAll('input[type=radio]')[1] as HTMLInputElement).click();
        const select = element.querySelector('select') as HTMLSelectElement;
        select.value = 'p1';
        select.dispatchEvent(new Event('change'));
        await stable();
        bouton('Relier ce parent').click();
        expect(ref.close).toHaveBeenCalledWith({ mode: 'existant', parentId: 'p1', lien: 'mere' });
    });

    it('« Inviter un nouveau parent » renvoie le lien choisi', async () => {
        (element.querySelectorAll('input[type=radio]')[2] as HTMLInputElement).click();
        await stable();
        bouton('Inviter un nouveau parent').click();
        expect(ref.close).toHaveBeenCalledWith({ mode: 'inviter', lien: 'tuteur' });
    });
});
