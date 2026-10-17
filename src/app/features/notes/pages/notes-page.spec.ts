import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSignauxTesting } from '../../../../testing/signaux-testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { aujourdhui } from '../../../core/dates';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EvaluationDialog, EvaluationDialogService } from '../components/evaluation-dialog';
import { ContexteNotes, Evaluation, EvaluationsService } from '../data/evaluations.service';
import { NotesPage } from './notes-page';

async function stable(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r));
    }
    await fixture.whenStable();
}

const texte = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).textContent ?? '';
const bouton = (f: ComponentFixture<unknown>, t: string) =>
    [...(f.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent!.trim() === t) as HTMLButtonElement | undefined;

describe('NotesPage', () => {
    const jour = aujourdhui();
    const ctx = (cloturee: boolean): ContexteNotes => ({
        classes: [{ id: 'c-1', nom: 'CE1 A', matieres: [{ id: 'cm-1', nom: 'Coran' }] }],
        periodes: [{ id: 'p-1', libelle: 'Trimestre 1', debut: '2000-01-01', fin: '2999-12-31', cloturee }],
        types: [{ id: 't-1', nom: 'Devoir', coefficient: 1 }],
        bareme: 20,
    });
    const devoir: Evaluation = {
        id: 'e-1',
        libelle: 'Devoir 1',
        date: '2026-10-14',
        typeId: 't-1',
        typeNom: 'Devoir',
        bareme: 20,
        coefficient: 1,
        publiee: false,
    };
    const service = { contexte: vi.fn(), lister: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() };
    const dialogue = { ouvrir: vi.fn() };
    const confirmation = { confirmer: vi.fn() };

    function creer(): ComponentFixture<NotesPage> {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateTesting(),
                provideSignauxTesting(),
                { provide: EvaluationsService, useValue: service },
                { provide: EvaluationDialogService, useValue: dialogue },
                { provide: ConfirmDialogService, useValue: confirmation },
            ],
        });
        TestBed.inject(CurrentDaaraService).definir({
            id: 'd-1',
            slug: 'daara',
            nom: 'Daara',
            ville: null,
            logoPath: null,
            logoUrl: null,
            appelDemiJournee: false,
            roles: ['enseignant'],
            modules: ['structure', 'notes'],
        });
        return TestBed.createComponent(NotesPage);
    }

    beforeEach(() => vi.resetAllMocks());

    it('période vide : « Créer la première évaluation » ouvre la modale pré-remplie, puis recharge', async () => {
        service.contexte.mockResolvedValue(ctx(false));
        service.lister.mockResolvedValueOnce([]).mockResolvedValue([devoir]);
        dialogue.ouvrir.mockImplementation(async (d: { enregistrer: (s: unknown) => Promise<void> }) => {
            await d.enregistrer({ typeId: 't-1', libelle: 'Devoir 1', date: jour, bareme: 20, coefficient: 1 });
            return true;
        });
        const fixture = creer();
        await stable(fixture);
        expect(service.lister).toHaveBeenCalledWith('cm-1', 'p-1');
        bouton(fixture, 'Créer la première évaluation')!.click();
        await stable(fixture);
        const donnees = dialogue.ouvrir.mock.calls[0][0];
        expect(donnees.titre).toBe('CE1 A · Coran');
        expect(donnees.date).toBe(jour);
        expect(donnees.bareme).toBe(20);
        expect(service.creer).toHaveBeenCalledWith('c-1', 'cm-1', 'p-1', expect.objectContaining({ libelle: 'Devoir 1' }));
        expect(texte(fixture)).toContain('Évaluation créée.');
        expect(texte(fixture)).toContain('Devoir 1');
        expect(texte(fixture)).toContain('sur 20');
    });

    it('période clôturée : lecture seule', async () => {
        service.contexte.mockResolvedValue(ctx(true));
        service.lister.mockResolvedValue([devoir]);
        const fixture = creer();
        await stable(fixture);
        expect(texte(fixture)).toContain('Cette période est clôturée');
        expect(bouton(fixture, 'Nouvelle évaluation')).toBeUndefined();
        expect(bouton(fixture, 'Supprimer')).toBeUndefined();
    });

    it('suppression confirmée', async () => {
        service.contexte.mockResolvedValue(ctx(false));
        service.lister.mockResolvedValue([devoir]);
        confirmation.confirmer.mockResolvedValue(true);
        service.supprimer.mockResolvedValue(undefined);
        const fixture = creer();
        await stable(fixture);
        bouton(fixture, 'Supprimer')!.click();
        await stable(fixture);
        expect(service.supprimer).toHaveBeenCalledWith('e-1');
        expect(texte(fixture)).toContain('Évaluation supprimée.');
    });

    it('enseignant sans matière : message sans action', async () => {
        service.contexte.mockResolvedValue({ ...ctx(false), classes: [] });
        const fixture = creer();
        await stable(fixture);
        expect(texte(fixture)).toContain('Vous n’enseignez encore aucune matière');
    });
});

describe('EvaluationDialog', () => {
    it('le type choisi propose l’intitulé numéroté et son coefficient ; envoi des valeurs saisies', async () => {
        const enregistrer = vi.fn().mockResolvedValue(undefined);
        const ref = { close: vi.fn() };
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                { provide: DialogRef, useValue: ref },
                {
                    provide: DIALOG_DATA,
                    useValue: {
                        titre: 'CE1 A · Coran',
                        periode: { id: 'p-1', libelle: 'Trimestre 1', debut: '2026-10-01', fin: '2026-12-20', cloturee: false },
                        types: [
                            { id: 't-1', nom: 'Devoir', coefficient: 1 },
                            { id: 't-2', nom: 'Composition', coefficient: 2 },
                        ],
                        existantes: [{ typeId: 't-1' }],
                        bareme: 20,
                        date: '2026-10-17',
                        enregistrer,
                    },
                },
            ],
        });
        const fixture = TestBed.createComponent(EvaluationDialog);
        await stable(fixture);
        const element = fixture.nativeElement as HTMLElement;
        const champ = (i: number) => element.querySelectorAll('input:not([type=radio])')[i] as HTMLInputElement;
        expect(champ(0).value).toBe('Devoir 2');
        ([...element.querySelectorAll('label')].find((l) => l.textContent!.trim() === 'Composition')!.querySelector('input') as HTMLInputElement).click();
        await stable(fixture);
        expect(champ(0).value).toBe('Composition 1');
        expect(champ(3).value).toBe('2');
        champ(2).value = '10';
        champ(2).dispatchEvent(new Event('input'));
        bouton(fixture, 'Créer l’évaluation')!.click();
        await stable(fixture);
        expect(enregistrer).toHaveBeenCalledWith({ typeId: 't-2', libelle: 'Composition 1', date: '2026-10-17', bareme: 10, coefficient: 2 });
        expect(ref.close).toHaveBeenCalledWith(true);
    });
});
