import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ErreurMembres, Membre, MembresService } from '../../data/membres.service';
import { MembresPage } from './membres-page';

describe('MembresPage', () => {
    let fixture: ComponentFixture<MembresPage>;
    let element: HTMLElement;
    const service = { lister: vi.fn(), changerRole: vi.fn(), definirActif: vi.fn() };
    const confirmation = { confirmer: vi.fn() };

    const m = (id: string, nom: string, role: Membre['role'], actif = true, moi = false): Membre => ({
        id,
        userId: `u-${id}`,
        role,
        actif,
        nom,
        telephone: null,
        depuis: '2026-10-05T10:00:00Z',
        moi,
    });
    const membres = [
        m('1', 'Awa Diop', 'admin', true, true),
        m('2', 'Ibou Sarr', 'enseignant'),
        m('3', 'Fatou Ndiaye', 'parent', false),
        m('4', 'Élodie Faye', 'parent'),
    ];

    /** Lignes du tableau (≥ 640 px) : nom de chaque membre affiché. */
    function noms(): string[] {
        return [...element.querySelectorAll('tbody tr td:first-child > span:first-child')].map((e) => e.textContent!.trim());
    }

    function selectionner(index: number, valeur: string): void {
        const select = element.querySelectorAll('select')[index];
        select.value = valeur;
        select.dispatchEvent(new Event('change'));
    }

    /** Ouvre le menu d'actions d'une ligne du tableau et renvoie ses entrées. */
    async function menu(nom: string): Promise<HTMLButtonElement[]> {
        const bouton = element.querySelector(`tbody button[aria-label="Actions pour ${nom}"]`) as HTMLButtonElement;
        bouton.click();
        await fixture.whenStable();
        return [...document.querySelectorAll('[cdkmenuitem], [role=menuitem]')] as HTMLButtonElement[];
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        service.lister.mockResolvedValue(membres);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                provideRouter([]),
                { provide: MembresService, useValue: service },
                { provide: ConfirmDialogService, useValue: confirmation },
            ],
        });
        fixture = TestBed.createComponent(MembresPage);
        element = fixture.nativeElement as HTMLElement;
        await fixture.whenStable();
    });

    afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((e) => (e.innerHTML = '')));

    it('affiche les membres actifs par défaut, avec « (vous) »', () => {
        expect(noms()).toEqual(['Awa Diop', 'Ibou Sarr', 'Élodie Faye']);
        expect(element.textContent).toContain('(vous)');
        expect(element.textContent).toContain('3 membre(s) affiché(s) sur 4');
    });

    it('filtre par état, par rôle et par recherche sans accents', async () => {
        selectionner(1, 'desactives');
        await fixture.whenStable();
        expect(noms()).toEqual(['Fatou Ndiaye']);

        selectionner(1, 'tous');
        selectionner(0, 'parent');
        await fixture.whenStable();
        expect(noms()).toEqual(['Fatou Ndiaye', 'Élodie Faye']);

        const recherche = element.querySelector('input[type=search]') as HTMLInputElement;
        recherche.value = 'elodie';
        recherche.dispatchEvent(new Event('input'));
        await fixture.whenStable();
        expect(noms()).toEqual(['Élodie Faye']);
    });

    it('aucun résultat : état vide', async () => {
        const recherche = element.querySelector('input[type=search]') as HTMLInputElement;
        recherche.value = 'zzz';
        recherche.dispatchEvent(new Event('input'));
        await fixture.whenStable();
        expect(element.textContent).toContain('Aucun membre ne correspond');
    });

    it('échec du chargement : message et Réessayer', async () => {
        service.lister.mockRejectedValueOnce(new Error('réseau'));
        fixture = TestBed.createComponent(MembresPage);
        element = fixture.nativeElement as HTMLElement;
        await fixture.whenStable();
        expect(element.querySelector('[role=alert]')?.textContent).toContain('n’a pas pu être chargée');
    });

    it('menu : rôles proposés autres que le rôle actuel, puis désactiver', async () => {
        const entrees = await menu('Ibou Sarr');
        expect(entrees.map((e) => e.textContent!.trim())).toEqual(['Passer en Administrateur', 'Passer en Parent', 'Désactiver']);
    });

    it('passer en parent : sans confirmation, message de succès, liste rechargée', async () => {
        service.changerRole.mockResolvedValue(undefined);
        const entrees = await menu('Ibou Sarr');
        entrees[1].click();
        await fixture.whenStable();

        expect(confirmation.confirmer).not.toHaveBeenCalled();
        expect(service.changerRole).toHaveBeenCalledWith(membres[1], 'parent');
        expect(element.querySelector('[role=status]')?.textContent).toContain('Ibou Sarr est maintenant Parent');
        expect(service.lister).toHaveBeenCalledTimes(2);
    });

    it('promouvoir admin demande une confirmation ; annulation sans effet', async () => {
        confirmation.confirmer.mockResolvedValue(false);
        const entrees = await menu('Ibou Sarr');
        entrees[0].click();
        await fixture.whenStable();

        expect(confirmation.confirmer).toHaveBeenCalled();
        expect(service.changerRole).not.toHaveBeenCalled();
    });

    it('désactiver : confirmation puis erreur « dernier admin » affichée', async () => {
        confirmation.confirmer.mockResolvedValue(true);
        service.definirActif.mockRejectedValue(new ErreurMembres('membres.erreurs.dernier_admin'));
        const entrees = await menu('Awa Diop');
        entrees.at(-1)!.click();
        await fixture.whenStable();

        expect(confirmation.confirmer.mock.calls[0][0].message).toContain('Vous perdrez immédiatement');
        expect(element.querySelector('[role=alert]')?.textContent).toContain('au moins un administrateur actif');
    });

    it('un admin qui se retire ses droits quitte l’écran', async () => {
        const router = TestBed.inject(Router);
        const navigation = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
        confirmation.confirmer.mockResolvedValue(true);
        service.changerRole.mockResolvedValue(undefined);
        const entrees = await menu('Awa Diop');
        entrees[0].click();
        await fixture.whenStable();

        expect(service.changerRole).toHaveBeenCalledWith(membres[0], 'enseignant');
        expect(navigation).toHaveBeenCalledWith('/');
    });
});
