import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideSignauxTesting } from '../../../../testing/signaux-testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { AppelService, ErreurAppel, aujourdhui, creneauParDefaut, presenceSuivante } from '../data/appel.service';
import { decalerDate } from './appel-classes-page';
import { AppelClassePage } from './appel-classe-page';

describe('appel : règles', () => {
    it('toucher : présent → absent → en retard → présent', () => {
        expect(presenceSuivante('present')).toBe('absence');
        expect(presenceSuivante('absence')).toBe('retard');
        expect(presenceSuivante('retard')).toBe('present');
    });

    it('date du jour à Dakar, décalage de dates, créneau proposé selon l’heure', () => {
        expect(aujourdhui(new Date('2026-10-14T23:30:00Z'))).toBe('2026-10-14');
        expect(decalerDate('2026-10-03', -7)).toBe('2026-09-26');
        expect(creneauParDefaut(false)).toBe('journee');
        expect(creneauParDefaut(true, new Date('2026-10-14T09:00:00Z'))).toBe('matin');
        expect(creneauParDefaut(true, new Date('2026-10-14T15:00:00Z'))).toBe('apres_midi');
    });
});

describe('AppelClassePage', () => {
    let fixture: ComponentFixture<AppelClassePage>;
    let element: HTMLElement;
    const service = { feuille: vi.fn(), ouvrir: vi.fn(), marquer: vi.fn(), terminer: vi.fn() };
    const confirmation = { confirmer: vi.fn() };
    const eleve = (nom: string) => [...element.querySelectorAll('ul button')].find((b) => b.textContent!.includes(nom)) as HTMLButtonElement;
    async function stable(): Promise<void> {
        for (let i = 0; i < 5; i++) {
            await new Promise((r) => setTimeout(r));
        }
        await fixture.whenStable();
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        service.feuille.mockResolvedValue({
            classeNom: 'CE1 A',
            appelId: null,
            termine: false,
            eleves: [
                { apprenantId: 'a1', prenom: 'Awa', nom: 'Ndiaye', presence: 'present', absenceId: null },
                { apprenantId: 'a2', prenom: 'Modou', nom: 'Diop', presence: 'present', absenceId: null },
            ],
        });
        service.ouvrir.mockResolvedValue('appel-1');
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                provideSignauxTesting(),
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({ classeId: 'c1' }),
                            queryParamMap: convertToParamMap({ date: '2026-10-14', creneau: 'journee' }),
                        },
                    },
                },
                { provide: AppelService, useValue: service },
                { provide: ConfirmDialogService, useValue: confirmation },
            ],
        });
        fixture = TestBed.createComponent(AppelClassePage);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    });

    it('tout le monde présent ; un toucher ouvre l’appel et marque absent, un second en retard', async () => {
        expect(service.feuille).toHaveBeenCalledWith('c1', '2026-10-14', 'journee');
        expect(element.textContent).toContain('2 présent(s)');
        service.marquer.mockResolvedValueOnce('abs-1').mockResolvedValueOnce('abs-1');
        eleve('Awa').click();
        await stable();
        expect(service.ouvrir).toHaveBeenCalledWith('c1', '2026-10-14', 'journee');
        expect(service.marquer).toHaveBeenLastCalledWith('appel-1', expect.objectContaining({ apprenantId: 'a1', presence: 'present' }), 'absence');
        expect(eleve('Awa').textContent).toContain('Absent');
        expect(element.textContent).toContain('1 absent(s)');
        eleve('Awa').click();
        await stable();
        expect(service.marquer).toHaveBeenLastCalledWith('appel-1', expect.objectContaining({ absenceId: 'abs-1', presence: 'absence' }), 'retard');
        expect(eleve('Awa').textContent).toContain('En retard');
    });

    it('échec de l’enregistrement : l’élève revient à son état et le message explique', async () => {
        service.marquer.mockRejectedValue(new ErreurAppel('appel.erreurs.appel_trop_ancien'));
        eleve('Modou').click();
        await stable();
        expect(eleve('Modou').textContent).toContain('Présent');
        expect(element.textContent).toContain('7 jours en arrière');
    });

    it('« Terminer l’appel » : résumé confirmé, appel clos, retour à la liste', async () => {
        const navigation = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        confirmation.confirmer.mockResolvedValue(true);
        service.terminer.mockResolvedValue(undefined);
        ([...element.querySelectorAll('button')].find((b) => b.textContent!.includes('Terminer l’appel')) as HTMLButtonElement).click();
        await stable();
        expect(confirmation.confirmer.mock.calls[0][0].message).toContain('Tous les élèves sont présents');
        expect(service.terminer).toHaveBeenCalledWith('appel-1');
        expect(navigation).toHaveBeenCalledWith(['..'], expect.objectContaining({ queryParams: { fait: 'CE1 A' } }));
    });
});
