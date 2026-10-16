import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideSignauxTesting } from '../../../../../testing/signaux-testing';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';
import { ReglagesAbsencesService } from '../../data/reglages-absences.service';
import { AbsencesReglagesPage } from './absences-reglages-page';

describe('AbsencesReglagesPage', () => {
    let fixture: ComponentFixture<AbsencesReglagesPage>;
    let element: HTMLElement;
    const service = { charger: vi.fn(), enregistrer: vi.fn() };
    async function stable(): Promise<void> {
        for (let i = 0; i < 4; i++) {
            await new Promise((r) => setTimeout(r));
        }
        await fixture.whenStable();
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        service.charger.mockResolvedValue({ appelDemiJournee: false, delaiCorrection: 7, decideur: 'admin_titulaire', justificationParent: true });
        service.enregistrer.mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [provideTranslateTesting(), provideSignauxTesting(), { provide: ReglagesAbsencesService, useValue: service }],
        });
        fixture = TestBed.createComponent(AbsencesReglagesPage);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    });

    it('réglages chargés, modifiés et enregistrés (délai, décideur, justification par les parents)', async () => {
        const choisir = (texte: string) =>
            ([...element.querySelectorAll('label')].find((l) => l.textContent!.trim() === texte)!.querySelector('input') as HTMLInputElement).click();
        const delai = element.querySelector('#delai') as HTMLInputElement;
        expect(delai.value).toBe('7');
        delai.value = '3';
        delai.dispatchEvent(new Event('input'));
        choisir('L’administrateur seulement');
        choisir('Non');
        await stable();
        ([...element.querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Enregistrer les réglages') as HTMLButtonElement).click();
        await stable();
        expect(service.enregistrer).toHaveBeenCalledWith({ appelDemiJournee: false, delaiCorrection: 3, decideur: 'admin', justificationParent: false });
        expect(element.textContent).toContain('Réglages enregistrés');
    });
});
