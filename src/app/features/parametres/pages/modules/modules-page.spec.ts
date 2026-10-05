import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';
import { CurrentDaaraService } from '../../../../core/daara/current-daara.service';
import { ModuleDaara } from '../../../../core/daara/daara.model';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ErreurModules, ModulesService, erreurModules } from '../../data/modules.service';
import { ModulesPage } from './modules-page';

describe('ModulesPage', () => {
    let fixture: ComponentFixture<ModulesPage>;
    let element: HTMLElement;
    let courante: CurrentDaaraService;
    const service = { basculer: vi.fn() };
    const confirmation = { confirmer: vi.fn() };

    function ouvrir(modules: ModuleDaara[]): void {
        courante.definir({ id: 'd-1', slug: 'daara', nom: 'Daara', ville: null, logoPath: null, roles: ['admin'], modules });
    }

    function interrupteur(module: ModuleDaara): HTMLInputElement {
        return element.querySelector(`input[aria-labelledby="module-${module}"]`) as HTMLInputElement;
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        TestBed.configureTestingModule({
            providers: [provideTranslateTesting(), { provide: ModulesService, useValue: service }, { provide: ConfirmDialogService, useValue: confirmation }],
        });
        courante = TestBed.inject(CurrentDaaraService);
        ouvrir(['structure', 'notes', 'coran_cahier']);
        fixture = TestBed.createComponent(ModulesPage);
        element = fixture.nativeElement as HTMLElement;
        await fixture.whenStable();
    });

    it('affiche les 8 modules avec leur état', () => {
        expect(element.querySelectorAll('input[role="switch"]')).toHaveLength(8);
        expect(interrupteur('notes').checked).toBe(true);
        expect(interrupteur('bulletins').checked).toBe(false);
    });

    it('un prérequis encore requis ne peut pas être désactivé seul', () => {
        expect(interrupteur('structure').disabled).toBe(true);
        expect(element.textContent).toContain('Requis par : Notes');
        expect(interrupteur('notes').disabled).toBe(false);
    });

    it('activer un module signale les prérequis ajoutés', async () => {
        ouvrir(['coran_cahier']);
        await fixture.whenStable();
        service.basculer.mockResolvedValue(['structure', 'notes', 'bulletins', 'coran_cahier']);

        interrupteur('bulletins').click();
        await fixture.whenStable();

        expect(service.basculer).toHaveBeenCalledWith('bulletins', true);
        expect(confirmation.confirmer).not.toHaveBeenCalled();
        expect(element.querySelector('[role=status]')?.textContent).toContain('Structure scolaire, Notes');
    });

    it('désactiver demande une confirmation ; annulation sans effet', async () => {
        confirmation.confirmer.mockResolvedValue(false);
        interrupteur('coran_cahier').click();
        await fixture.whenStable();

        expect(confirmation.confirmer).toHaveBeenCalled();
        expect(service.basculer).not.toHaveBeenCalled();
        expect(interrupteur('coran_cahier').checked).toBe(true);
    });

    it('désactiver après confirmation', async () => {
        confirmation.confirmer.mockResolvedValue(true);
        service.basculer.mockResolvedValue(['structure', 'notes']);
        interrupteur('coran_cahier').click();
        await fixture.whenStable();

        expect(service.basculer).toHaveBeenCalledWith('coran_cahier', false);
    });

    it('affiche l’erreur de la base en nommant les modules', async () => {
        confirmation.confirmer.mockResolvedValue(true);
        service.basculer.mockRejectedValue(new ErreurModules('parametres.modules.erreurs.requis', { prerequis: 'structure', dependant: 'notes' }));
        interrupteur('coran_cahier').click();
        await fixture.whenStable();

        expect(element.querySelector('[role=alert]')?.textContent).toContain('Structure scolaire est requis par Notes');
    });
});

describe('erreurModules', () => {
    it('traduit les codes de definir_modules', () => {
        const requis = erreurModules({ code: '23514', message: 'module_requis:structure:notes' });
        expect(requis.cle).toBe('parametres.modules.erreurs.requis');
        expect(requis.params).toEqual({ prerequis: 'structure', dependant: 'notes' });
        expect(erreurModules({ code: '42501', message: 'admin_aal2_requis' }).cle).toBe('parametres.modules.erreurs.droits');
        expect(erreurModules({ code: 'XX000' }).cle).toBe('parametres.modules.erreurs.inattendue');
    });
});
