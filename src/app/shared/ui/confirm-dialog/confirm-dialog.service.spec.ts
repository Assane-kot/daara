import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { ConfirmDialogService } from './confirm-dialog.service';

/** Laisse le CDK attacher la modale et appliquer le focus. */
async function stabiliser(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
}

function boutons(): HTMLButtonElement[] {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('app-confirm-dialog button'));
}

function bouton(libelle: string): HTMLButtonElement | undefined {
    return boutons().find((b) => b.textContent?.trim() === libelle);
}

describe('ConfirmDialogService', () => {
    let service: ConfirmDialogService;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideTranslateTesting()] });
        service = TestBed.inject(ConfirmDialogService);
    });

    afterEach(() => {
        TestBed.inject(Dialog).closeAll();
    });

    it('résout true quand l\'utilisateur confirme', async () => {
        const resultat = service.confirmer({ titre: 'Supprimer ?', message: 'Action définitive.' });
        await stabiliser();

        bouton('Confirmer')?.click();

        expect(await resultat).toBe(true);
    });

    it('résout false quand l\'utilisateur annule', async () => {
        const resultat = service.confirmer({ titre: 'Supprimer ?', message: 'Action définitive.' });
        await stabiliser();

        bouton('Annuler')?.click();

        expect(await resultat).toBe(false);
    });

    it('résout false à la fermeture par Échap', async () => {
        const resultat = service.confirmer({ titre: 'Supprimer ?', message: 'Action définitive.' });
        await stabiliser();

        document.querySelector('app-confirm-dialog')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));

        expect(await resultat).toBe(false);
    });

    it('est une alertdialog reliée à son titre et à son message, focus sur « Annuler »', async () => {
        service.confirmer({ titre: 'Publier les bulletins ?', message: 'Les parents seront prévenus.', danger: true, libelleConfirmer: 'Publier' });
        await stabiliser();

        const conteneur = document.querySelector('[role="alertdialog"]');
        const titreId = conteneur?.getAttribute('aria-labelledby') ?? '';
        expect(document.getElementById(titreId)?.textContent).toBe('Publier les bulletins ?');
        expect(document.getElementById(conteneur?.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Les parents seront prévenus.');
        expect(bouton('Publier')?.classList.contains('btn-danger')).toBe(true);
        expect(document.activeElement?.textContent?.trim()).toBe('Annuler');
    });
});
