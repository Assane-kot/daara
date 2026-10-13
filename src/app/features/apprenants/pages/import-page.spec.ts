import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { ApprenantsService } from '../data/apprenants.service';
import { ImportPage } from './import-page';

describe('ImportPage', () => {
    let fixture: ComponentFixture<ImportPage>;
    let element: HTMLElement;
    const service = { classesAnneeActive: vi.fn(), importer: vi.fn() };
    const bouton = (debut: string) => [...element.querySelectorAll('button')].find((b) => b.textContent!.trim().startsWith(debut)) as HTMLButtonElement;
    async function stable(): Promise<void> {
        for (let i = 0; i < 5; i++) {
            await new Promise((r) => setTimeout(r));
        }
        await fixture.whenStable();
    }
    async function deposer(contenu: string): Promise<void> {
        const champ = element.querySelector('input[type=file]') as HTMLInputElement;
        Object.defineProperty(champ, 'files', { value: [new File([contenu], 'eleves.csv', { type: 'text/csv' })], configurable: true });
        champ.dispatchEvent(new Event('change'));
        await stable();
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        service.classesAnneeActive.mockResolvedValue([{ id: 'c1', nom: 'CE1 A', anneeId: 'a1' }]);
        TestBed.configureTestingModule({
            providers: [provideTranslateTesting(), provideRouter([]), { provide: ApprenantsService, useValue: service }],
        });
        fixture = TestBed.createComponent(ImportPage);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    });

    it('fichier valide : vérifié par la base (simulation), aperçu, puis import', async () => {
        service.importer.mockResolvedValueOnce({ crees: 0, erreurs: [] }).mockResolvedValueOnce({ crees: 2, erreurs: [] });
        await deposer('Nom;Prénom;Sexe\nNdiaye;Awa;Fille\nDiop;Modou;Garçon\n');
        expect(service.importer).toHaveBeenCalledWith(expect.any(Array), null, true);
        expect(element.textContent).toContain('2 élève(s) prêt(s)');
        bouton('Importer les 2').click();
        await stable();
        expect(service.importer).toHaveBeenLastCalledWith(expect.any(Array), null, false);
        expect(element.textContent).toContain('2 élève(s) importé(s)');
    });

    it('erreurs de la base rapportées au numéro de ligne du fichier, rien importé', async () => {
        service.importer.mockResolvedValue({ crees: 0, erreurs: [{ ligne: 2, champ: 'classe', code: 'inconnue' }] });
        await deposer('Nom;Prénom;Sexe;Classe\nNdiaye;Awa;Fille;CE1 A\n\nDiop;Modou;Garçon;CM9\n');
        expect(element.textContent).toContain('Ligne 4');
        expect(element.textContent).toContain('« CM9 »');
        expect(service.importer).toHaveBeenCalledTimes(1);
    });

    it('erreurs de forme : signalées sans appeler la base', async () => {
        await deposer('Nom;Prénom;Sexe\nNdiaye;Awa;X\n');
        expect(service.importer).not.toHaveBeenCalled();
        expect(element.textContent).toContain('Ligne 2');
    });
});
