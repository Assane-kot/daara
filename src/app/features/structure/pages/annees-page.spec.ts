import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { DatesDialogService } from '../components/dates-dialog';
import { Annee, AnneesService, ErreurStructure } from '../data/annees.service';
import { AnneesPage } from './annees-page';

describe('AnneesPage', () => {
    let fixture: ComponentFixture<AnneesPage>;
    let element: HTMLElement;
    const service = { lister: vi.fn(), activerAnnee: vi.fn(), creerPeriodes: vi.fn(), cloturerPeriode: vi.fn(), supprimerAnnee: vi.fn() };
    const confirmation = { confirmer: vi.fn() };
    const dates = { ouvrir: vi.fn() };
    const active: Annee = {
        id: 'a1',
        libelle: '2026-2027',
        dateDebut: '2026-10-01',
        dateFin: '2027-07-31',
        active: true,
        periodes: [{ id: 'p1', anneeId: 'a1', libelle: 'Trimestre 1', ordre: 1, dateDebut: '2026-10-01', dateFin: '2026-12-20', cloturee: false }],
    };
    const suivante: Annee = { id: 'a2', libelle: '2027-2028', dateDebut: '2027-10-01', dateFin: '2028-07-31', active: false, periodes: [] };

    async function stable(): Promise<void> {
        await new Promise((r) => setTimeout(r));
        await fixture.whenStable();
    }
    const bouton = (texte: string, section = 0) =>
        [...element.querySelectorAll('section')[section].querySelectorAll('button')].find((b) => b.textContent!.trim() === texte) as HTMLButtonElement;

    beforeEach(async () => {
        vi.resetAllMocks();
        service.lister.mockResolvedValue([suivante, active]);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                { provide: AnneesService, useValue: service },
                { provide: ConfirmDialogService, useValue: confirmation },
                { provide: DatesDialogService, useValue: dates },
            ],
        });
        fixture = TestBed.createComponent(AnneesPage);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    });

    it('affiche les années, l’année active sans bouton de suppression, et ses périodes', () => {
        expect(element.querySelectorAll('section').length).toBe(2);
        expect(element.querySelectorAll('section')[1].textContent).toContain('Active');
        // Année active : ni « Rendre active » ni suppression de l'année (le seul « Supprimer » est celui de la période).
        expect(bouton('Rendre active', 1)).toBeUndefined();
        expect([...element.querySelectorAll('section')[1].querySelectorAll('button')].filter((b) => b.textContent!.trim() === 'Supprimer').length).toBe(1);
        expect(element.querySelectorAll('section')[1].textContent).toContain('Trimestre 1');
    });

    it('année sans période : le modèle « 3 trimestres » crée trois périodes', async () => {
        service.creerPeriodes.mockResolvedValue(undefined);
        bouton('3 trimestres').click();
        await stable();
        const [anneeId, saisies] = service.creerPeriodes.mock.calls[0];
        expect(anneeId).toBe('a2');
        expect(saisies.map((s: { libelle: string }) => s.libelle)).toEqual(['Trimestre 1', 'Trimestre 2', 'Trimestre 3']);
        expect(element.querySelector('[role=status]')?.textContent).toContain('Périodes créées');
    });

    it('rendre active puis erreur de la base affichée', async () => {
        service.activerAnnee.mockRejectedValue(new ErreurStructure('structure.erreurs.droits'));
        bouton('Rendre active').click();
        await stable();
        expect(service.activerAnnee).toHaveBeenCalledWith('a2');
        expect(element.querySelector('[role=alert]')?.textContent).toContain('Seul un administrateur');
    });

    it('période clôturée : seule la réouverture est proposée', async () => {
        service.lister.mockResolvedValue([{ ...active, periodes: [{ ...active.periodes[0], cloturee: true }] }]);
        fixture = TestBed.createComponent(AnneesPage);
        element = fixture.nativeElement as HTMLElement;
        await stable();
        const boutons = [...element.querySelectorAll('li button')].map((b) => b.textContent!.trim());
        expect(boutons).toEqual(['Rouvrir']);
    });

    it('clôturer une période : confirmation puis service appelé', async () => {
        confirmation.confirmer.mockResolvedValue(true);
        service.cloturerPeriode.mockResolvedValue(undefined);
        bouton('Clôturer', 1).click();
        await stable();
        expect(service.cloturerPeriode).toHaveBeenCalledWith('p1', true);
    });
});
