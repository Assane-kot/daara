import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSignauxTesting } from '../../../../../testing/signaux-testing';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ReglagesNotes, ReglagesNotesService } from '../../data/reglages-notes.service';
import { NotesReglagesPage } from './notes-reglages-page';

const DEFAUT: ReglagesNotes = {
    absenceEvaluation: 'ignorer',
    moyenneGenerale: 'ponderee',
    arrondi: 'centieme',
    seuilReussite: null,
    titulaireSaisit: false,
    visibilite: 'publication',
    moyennesVisibles: true,
    appreciations: true,
};

describe('NotesReglagesPage', () => {
    let fixture: ComponentFixture<NotesReglagesPage>;
    let element: HTMLElement;
    const service = { charger: vi.fn(), enregistrer: vi.fn(), ajouterType: vi.fn(), modifierType: vi.fn(), supprimerType: vi.fn() };
    const confirmation = { confirmer: vi.fn() };
    async function stable(): Promise<void> {
        for (let i = 0; i < 4; i++) {
            await new Promise((r) => setTimeout(r));
        }
        await fixture.whenStable();
    }
    const radio = (texte: string) =>
        [...element.querySelectorAll('label')].find((l) => l.textContent!.trim() === texte)!.querySelector('input') as HTMLInputElement;
    const bouton = (texte: string) => [...element.querySelectorAll('button')].find((b) => b.textContent!.trim() === texte) as HTMLButtonElement;

    beforeEach(async () => {
        vi.resetAllMocks();
        service.charger.mockResolvedValue({
            reglages: DEFAUT,
            types: [
                { id: 't1', nom: 'Devoir', coefficient: 1, ordre: 1, archive: false },
                { id: 't2', nom: 'Composition', coefficient: 2, ordre: 2, archive: false },
            ],
            bareme: 20,
        });
        service.enregistrer.mockResolvedValue(undefined);
        service.ajouterType.mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                provideSignauxTesting(),
                provideRouter([]),
                { provide: ReglagesNotesService, useValue: service },
                { provide: ConfirmDialogService, useValue: confirmation },
            ],
        });
        fixture = TestBed.createComponent(NotesReglagesPage);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    });

    it('réglage d’affichage : enregistré sans avertissement', async () => {
        radio('Dès qu’elles sont saisies').click();
        await stable();
        bouton('Enregistrer les réglages').click();
        await stable();
        expect(confirmation.confirmer).not.toHaveBeenCalled();
        expect(service.enregistrer).toHaveBeenCalledWith({ ...DEFAUT, visibilite: 'saisie' });
        expect(element.textContent).toContain('Réglages enregistrés');
    });

    it('réglage de calcul : avertissement avant d’enregistrer (annulé = rien d’enregistré)', async () => {
        confirmation.confirmer.mockResolvedValue(false);
        radio('Compte 0').click();
        await stable();
        bouton('Enregistrer les réglages').click();
        await stable();
        expect(confirmation.confirmer).toHaveBeenCalled();
        expect(service.enregistrer).not.toHaveBeenCalled();
    });

    it('ajout d’un type d’évaluation avec son coefficient', async () => {
        const [nom, coef] = [...element.querySelectorAll('form input')].slice(0, 2) as HTMLInputElement[];
        nom.value = 'Interrogation';
        coef.value = '0.5';
        bouton('Ajouter').click();
        await stable();
        expect(service.ajouterType).toHaveBeenCalledWith('Interrogation', 0.5, 3);
    });
});
