import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';
import { CurrentDaaraService } from '../../../../core/daara/current-daara.service';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ErreurParametres, ParametresDaaraService } from '../../data/parametres-daara.service';
import { GeneralPage } from './general-page';

describe('GeneralPage', () => {
    let fixture: ComponentFixture<GeneralPage>;
    let element: HTMLElement;
    let courante: CurrentDaaraService;
    const service = { charger: vi.fn(), enregistrer: vi.fn(), deposerLogo: vi.fn(), retirerLogo: vi.fn() };
    const confirmation = { confirmer: vi.fn() };
    const infos = { nom: 'Daara Touba', ville: 'Touba', telephone: '', langueDefaut: 'fr', bareme: 20 };

    function champ(nom: string): HTMLInputElement {
        return element.querySelector(`[formcontrolname="${nom}"]`) as HTMLInputElement;
    }

    async function saisir(nom: string, valeur: string): Promise<void> {
        const input = champ(nom);
        input.value = valeur;
        input.dispatchEvent(new Event('input'));
        await fixture.whenStable();
    }

    function bouton(texte: string): HTMLButtonElement {
        return [...element.querySelectorAll('button')].find((b) => b.textContent?.includes(texte)) as HTMLButtonElement;
    }

    async function creer(): Promise<void> {
        fixture = TestBed.createComponent(GeneralPage);
        element = fixture.nativeElement as HTMLElement;
        await fixture.whenStable();
    }

    beforeEach(() => {
        vi.resetAllMocks();
        service.charger.mockResolvedValue(infos);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                { provide: ParametresDaaraService, useValue: service },
                { provide: ConfirmDialogService, useValue: confirmation },
            ],
        });
        courante = TestBed.inject(CurrentDaaraService);
        courante.definir({ id: 'd-1', slug: 'daara', nom: 'Daara Touba', ville: null, logoPath: null, logoUrl: null, roles: ['admin'], modules: [] });
    });

    it('pré-remplit le formulaire ; « Enregistrer » inactif tant que rien ne change', async () => {
        await creer();
        expect(champ('nom').value).toBe('Daara Touba');
        expect(champ('ville').value).toBe('Touba');
        expect(bouton('Enregistrer').disabled).toBe(true);
    });

    it('échec du chargement : message et bouton Réessayer', async () => {
        service.charger.mockRejectedValueOnce(new Error('réseau'));
        await creer();
        expect(element.querySelector('[role=alert]')?.textContent).toContain('n’ont pas pu être chargées');

        bouton('Réessayer').click();
        await fixture.whenStable();
        expect(champ('nom').value).toBe('Daara Touba');
    });

    it('valide avant d’enregistrer (nom trop court, téléphone invalide)', async () => {
        await creer();
        await saisir('nom', 'D');
        await saisir('telephone', 'abc');
        bouton('Enregistrer').click();
        await fixture.whenStable();

        expect(service.enregistrer).not.toHaveBeenCalled();
        expect(element.textContent).toContain('Au moins 2 caractères.');
        expect(element.textContent).toContain('Format invalide.');
    });

    it('enregistre et confirme', async () => {
        service.enregistrer.mockResolvedValue(undefined);
        await creer();
        await saisir('ville', 'Thiès');
        bouton('Enregistrer').click();
        await fixture.whenStable();

        expect(service.enregistrer).toHaveBeenCalledWith({ ...infos, ville: 'Thiès' });
        expect(element.querySelector('[role=status]')?.textContent).toContain('sont enregistrées');
        expect(bouton('Enregistrer').disabled).toBe(true);
    });

    it('affiche l’erreur traduite de la base', async () => {
        service.enregistrer.mockRejectedValue(new ErreurParametres('parametres.general.erreurs.droits'));
        await creer();
        await saisir('ville', 'Thiès');
        bouton('Enregistrer').click();
        await fixture.whenStable();

        expect(element.querySelector('[role=alert]')?.textContent).toContain('Seul un administrateur');
    });

    it('dépose le logo choisi et signale une erreur de format', async () => {
        await creer();
        const input = element.querySelector('input[type=file]') as HTMLInputElement;
        expect(input.accept).toBe('image/png,image/jpeg,image/webp');
        const fichier = new File(['x'], 'logo.svg', { type: 'image/svg+xml' });
        Object.defineProperty(input, 'files', { value: [fichier] });
        service.deposerLogo.mockRejectedValue(new ErreurParametres('parametres.general.erreurs.logo_type'));

        input.dispatchEvent(new Event('change'));
        await fixture.whenStable();

        expect(service.deposerLogo).toHaveBeenCalledWith(fichier);
        expect(element.querySelector('[role=alert]')?.textContent).toContain('Format non accepté');
    });

    it('retirer le logo demande une confirmation', async () => {
        courante.definir({ ...courante.daara()!, logoPath: 'd-1/logo.png', logoUrl: 'http://x/logo.png?v=1' });
        confirmation.confirmer.mockResolvedValue(true);
        service.retirerLogo.mockResolvedValue(undefined);
        await creer();
        expect(element.querySelector('img')?.getAttribute('alt')).toBe('Logo de Daara Touba');

        bouton('Retirer le logo').click();
        await fixture.whenStable();

        expect(confirmation.confirmer).toHaveBeenCalled();
        expect(service.retirerLogo).toHaveBeenCalled();
    });
});
