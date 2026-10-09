import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { RoleMembre } from '../../../core/daara/daara.model';
import { InscriptionsService } from '../../apprenants/data/inscriptions.service';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ClasseDialogsService } from '../components/classe-dialogs';
import { ClasseDetail, ClassesService } from '../data/classes.service';
import { MatieresService } from '../data/matieres.service';
import { ClasseDetailPage } from './classe-detail-page';
import { ClassesPage } from './classes-page';

const roles = signal<RoleMembre[]>(['admin']);
const service = { annees: vi.fn(), enseignants: vi.fn(), page: vi.fn(), detail: vi.fn(), supprimer: vi.fn() };
const matieresService = { lister: vi.fn() };
const dialogues = { classe: vi.fn(), affectation: vi.fn() };

async function stable(fixture: ComponentFixture<unknown>): Promise<void> {
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
}

function configurer(): void {
    vi.resetAllMocks();
    roles.set(['admin']);
    service.annees.mockResolvedValue([
        { id: 'a2', libelle: '2027-2028', active: false },
        { id: 'a1', libelle: '2026-2027', active: true },
    ]);
    service.enseignants.mockResolvedValue([
        { id: 'e1', nom: 'Modou Fall', actif: true },
        { id: 'e2', nom: 'Ancien Maître', actif: false },
    ]);
    TestBed.configureTestingModule({
        providers: [
            provideTranslateTesting(),
            provideRouter([]),
            { provide: ClassesService, useValue: service },
            { provide: MatieresService, useValue: matieresService },
            { provide: ClasseDialogsService, useValue: dialogues },
            { provide: ConfirmDialogService, useValue: { confirmer: vi.fn() } },
            { provide: CurrentDaaraService, useValue: { roles, slug: () => 'd' } },
            { provide: InscriptionsService, useValue: { eleves: () => Promise.resolve([]) } },
        ],
    });
}

describe('ClassesPage', () => {
    beforeEach(() => {
        configurer();
        service.page.mockResolvedValue({ lignes: [{ id: 'c1', nom: 'CE1 A', niveau: 'CE1', titulaireId: 'e1', nbMatieres: 3 }], total: 1 });
    });

    it('année active choisie par défaut ; titulaire et nombre de matières affichés', async () => {
        const fixture = TestBed.createComponent(ClassesPage);
        await stable(fixture);
        const element = fixture.nativeElement as HTMLElement;
        expect(service.page.mock.calls[0][0]).toBe('a1');
        expect(element.querySelector('li')?.textContent).toContain('Titulaire : Modou Fall');
        expect(element.querySelector('li')?.textContent).toContain('3 matière(s)');
        expect(element.textContent).toContain('Nouvelle classe');
    });

    it('changement d’année : classes rechargées ; enseignant en lecture seule', async () => {
        roles.set(['enseignant']);
        const fixture = TestBed.createComponent(ClassesPage);
        await stable(fixture);
        const element = fixture.nativeElement as HTMLElement;
        const select = element.querySelector('select') as HTMLSelectElement;
        select.value = 'a2';
        select.dispatchEvent(new Event('change'));
        await stable(fixture);
        expect(service.page.mock.lastCall?.[0]).toBe('a2');
        expect(element.querySelectorAll('li button').length).toBe(0);
        expect(element.textContent).not.toContain('Nouvelle classe');
    });
});

describe('ClasseDetailPage', () => {
    const classe: ClasseDetail = {
        id: 'c1',
        nom: 'CE1 A',
        niveau: 'CE1',
        titulaireId: 'e2',
        anneeId: 'a1',
        anneeLibelle: '2026-2027',
        affectations: [{ id: 'cm1', matiereId: 'm1', matiereNom: 'Coran', matiereCode: 'COR', matiereType: 'coran', coefficient: 2, enseignantId: null }],
    };

    beforeEach(() => {
        configurer();
        TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: { paramMap: new Map([['classeId', 'c1']]) } } });
        service.detail.mockResolvedValue(classe);
        matieresService.lister.mockResolvedValue([
            { id: 'm1', nom: 'Coran', code: 'COR', type: 'coran', archivee: false },
            { id: 'm2', nom: 'Dessin', code: 'DES', type: 'scolaire', archivee: true },
            { id: 'm3', nom: 'Arabe', code: 'AR', type: 'scolaire', archivee: false },
        ]);
    });

    it('affiche la classe ; à l’ajout, seules les matières non archivées et absentes sont proposées', async () => {
        dialogues.affectation.mockResolvedValue(false);
        const fixture = TestBed.createComponent(ClasseDetailPage);
        await stable(fixture);
        const element = fixture.nativeElement as HTMLElement;
        expect(service.detail).toHaveBeenCalledWith('c1');
        expect(element.textContent).toContain('Titulaire : Ancien Maître');
        expect(element.textContent).toContain('Coefficient 2');
        expect(element.textContent).toContain('Sans enseignant');
        ([...element.querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Ajouter une matière') as HTMLButtonElement).click();
        await stable(fixture);
        expect(dialogues.affectation.mock.calls[0][0].matieres.map((m: { id: string }) => m.id)).toEqual(['m3']);
    });
});
