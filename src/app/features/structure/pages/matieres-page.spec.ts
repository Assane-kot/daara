import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { RoleMembre } from '../../../core/daara/daara.model';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { MatiereDialogService } from '../components/matiere-dialog';
import { ErreurStructure } from '../data/annees.service';
import { Matiere, MatieresService, proposerCode } from '../data/matieres.service';
import { MatieresPage } from './matieres-page';

describe('MatieresPage', () => {
    let fixture: ComponentFixture<MatieresPage>;
    let element: HTMLElement;
    const service = { lister: vi.fn(), archiver: vi.fn(), supprimer: vi.fn() };
    const confirmation = { confirmer: vi.fn() };
    const dialogue = { ouvrir: vi.fn() };
    const roles = signal<RoleMembre[]>(['admin']);
    const matieres: Matiere[] = [
        { id: 'm1', nom: 'Coran', code: 'COR', type: 'coran', archivee: false },
        { id: 'm2', nom: 'Dessin', code: 'DES', type: 'scolaire', archivee: true },
    ];

    async function creer(): Promise<void> {
        fixture = TestBed.createComponent(MatieresPage);
        element = fixture.nativeElement as HTMLElement;
        await new Promise((r) => setTimeout(r));
        await fixture.whenStable();
    }
    const boutons = () => [...element.querySelectorAll('li button')].map((b) => b.textContent!.trim());

    beforeEach(() => {
        vi.resetAllMocks();
        roles.set(['admin']);
        service.lister.mockResolvedValue(matieres);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                { provide: MatieresService, useValue: service },
                { provide: ConfirmDialogService, useValue: confirmation },
                { provide: MatiereDialogService, useValue: dialogue },
                { provide: CurrentDaaraService, useValue: { roles } },
            ],
        });
    });

    it('admin : matières actives seulement par défaut, avec leurs actions ; archivées sur demande', async () => {
        await creer();
        expect(element.querySelectorAll('li').length).toBe(1);
        expect(boutons()).toEqual(['Modifier', 'Archiver', 'Supprimer']);
        (element.querySelector('input[type=checkbox]') as HTMLInputElement).click();
        await fixture.whenStable();
        expect(element.querySelectorAll('li').length).toBe(2);
        expect(element.textContent).toContain('Archivée');
    });

    it('enseignant : lecture seule', async () => {
        roles.set(['enseignant']);
        await creer();
        expect(boutons()).toEqual([]);
        expect(element.textContent).not.toContain('Nouvelle matière');
    });

    it('suppression d’une matière utilisée : message de la base affiché', async () => {
        confirmation.confirmer.mockResolvedValue(true);
        service.supprimer.mockRejectedValue(new ErreurStructure('structure.erreurs.utilisee'));
        await creer();
        ([...element.querySelectorAll('li button')].find((b) => b.textContent!.trim() === 'Supprimer') as HTMLButtonElement).click();
        await new Promise((r) => setTimeout(r));
        await fixture.whenStable();
        expect(service.supprimer).toHaveBeenCalledWith('m1');
        expect(element.querySelector('[role=alert]')?.textContent).toContain('archivez-le plutôt');
    });

    it('code proposé : sans accents, majuscules, 4 caractères', () => {
        expect(proposerCode('Éducation islamique')).toBe('EDUC');
        expect(proposerCode('Arabe')).toBe('ARAB');
    });
});
