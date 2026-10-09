import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { MfaPanel } from '../../auth/components/mfa-panel';
import { Appareil, CompteService } from '../data/compte.service';
import { SecuritePage } from './securite-page';

@Component({ selector: 'app-mfa-panel', template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class MfaPanelFactice {
    readonly nomAppareil = input<string | null>(null);
    readonly valide = output<void>();
}

describe('SecuritePage', () => {
    let fixture: ComponentFixture<SecuritePage>;
    let element: HTMLElement;
    const service = { appareils: vi.fn(), estAdmin: vi.fn(), retirerAppareil: vi.fn() };
    const confirmation = { confirmer: vi.fn() };
    const telephone: Appareil = { id: 'f1', nom: 'Téléphone', ajouteLe: '2026-10-01T10:00:00Z' };
    const tablette: Appareil = { id: 'f2', nom: 'Tablette', ajouteLe: '2026-10-09T10:00:00Z' };

    async function creer(appareils: Appareil[], admin: boolean): Promise<void> {
        service.appareils.mockResolvedValue(appareils);
        service.estAdmin.mockResolvedValue(admin);
        fixture = TestBed.createComponent(SecuritePage);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    }

    /** Laisse finir les promesses enchaînées (chargement parallèle), puis le rendu. */
    async function stable(): Promise<void> {
        await new Promise((r) => setTimeout(r));
        await fixture.whenStable();
    }

    const boutonsRetirer = () => [...element.querySelectorAll('li button')] as HTMLButtonElement[];

    beforeEach(() => {
        vi.resetAllMocks();
        TestBed.configureTestingModule({
            providers: [provideTranslateTesting(), { provide: CompteService, useValue: service }, { provide: ConfirmDialogService, useValue: confirmation }],
        });
        TestBed.overrideComponent(SecuritePage, { remove: { imports: [MfaPanel] }, add: { imports: [MfaPanelFactice] } });
    });

    it('admin avec un seul appareil : retrait impossible, explication affichée', async () => {
        await creer([telephone], true);
        expect(boutonsRetirer()[0].disabled).toBe(true);
        expect(element.textContent).toContain('Un administrateur garde au moins un appareil');
    });

    it('admin avec deux appareils : retrait confirmé puis liste mise à jour', async () => {
        await creer([telephone, tablette], true);
        confirmation.confirmer.mockResolvedValue(true);
        service.retirerAppareil.mockResolvedValue(undefined);
        boutonsRetirer()[1].click();
        await stable();
        expect(service.retirerAppareil).toHaveBeenCalledWith('f2');
        expect(boutonsRetirer().length).toBe(1);
        expect(element.querySelector('[role=status]')?.textContent).toContain('Appareil retiré');
    });

    it('non-admin : peut retirer son dernier appareil, avec un avertissement', async () => {
        await creer([telephone], false);
        confirmation.confirmer.mockResolvedValue(false);
        boutonsRetirer()[0].click();
        await stable();
        expect(confirmation.confirmer).toHaveBeenCalledWith(expect.objectContaining({ danger: true, message: expect.stringContaining('dernier appareil') }));
        expect(service.retirerAppareil).not.toHaveBeenCalled();
    });

    it('ajout : nom déjà utilisé refusé, sinon panneau d’enrôlement avec ce nom', async () => {
        await creer([telephone], true);
        const champ = element.querySelector('form input') as HTMLInputElement;
        champ.value = 'téléphone';
        champ.dispatchEvent(new Event('input'));
        element.querySelector('form')?.dispatchEvent(new Event('submit'));
        await stable();
        expect(element.textContent).toContain('Ce nom est déjà utilisé');

        champ.value = 'Tablette';
        champ.dispatchEvent(new Event('input'));
        element.querySelector('form')?.dispatchEvent(new Event('submit'));
        await stable();
        const panneau = fixture.debugElement.query((n) => n.componentInstance instanceof MfaPanelFactice).componentInstance as MfaPanelFactice;
        expect(panneau.nomAppareil()).toBe('Tablette');
    });
});
