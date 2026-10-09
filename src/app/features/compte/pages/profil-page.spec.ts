import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { CompteService, ErreurCompte } from '../data/compte.service';
import { ProfilPage } from './profil-page';

describe('ProfilPage', () => {
    let fixture: ComponentFixture<ProfilPage>;
    let element: HTMLElement;
    const service = { chargerProfil: vi.fn(), enregistrerProfil: vi.fn() };
    const language = { setLangue: vi.fn(), langue: () => 'fr' };

    async function stable(): Promise<void> {
        await new Promise((r) => setTimeout(r));
        await fixture.whenStable();
    }

    function saisir(index: number, valeur: string): void {
        const champ = element.querySelectorAll('input')[index];
        champ.value = valeur;
        champ.dispatchEvent(new Event('input'));
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        service.chargerProfil.mockResolvedValue({ prenom: 'Awa', nom: 'Diop', telephone: null, langue: 'fr' });
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                { provide: CompteService, useValue: service },
                { provide: LanguageService, useValue: language },
                { provide: AuthService, useValue: { user: () => ({ email: '', phone: '221770009911' }) } },
            ],
        });
        fixture = TestBed.createComponent(ProfilPage);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    });

    it('affiche le profil et l’identifiant téléphone en lecture seule', () => {
        expect((element.querySelectorAll('input')[0] as HTMLInputElement).value).toBe('Awa');
        expect(element.textContent).toContain('+221770009911');
    });

    it('enregistre (valeurs nettoyées) et applique la langue choisie', async () => {
        service.enregistrerProfil.mockResolvedValue(undefined);
        saisir(0, '  Fatou ');
        saisir(2, '77 123 45 67');
        const select = element.querySelector('select') as HTMLSelectElement;
        select.value = 'en';
        select.dispatchEvent(new Event('change'));
        element.querySelector('form')?.dispatchEvent(new Event('submit'));
        await stable();
        expect(service.enregistrerProfil).toHaveBeenCalledWith({ prenom: 'Fatou', nom: 'Diop', telephone: '77 123 45 67', langue: 'en' });
        expect(language.setLangue).toHaveBeenCalledWith('en');
        expect(element.querySelector('[role=status]')).not.toBeNull();
    });

    it('validation et erreur de la base affichées', async () => {
        saisir(0, '');
        element.querySelector('form')?.dispatchEvent(new Event('submit'));
        await stable();
        expect(service.enregistrerProfil).not.toHaveBeenCalled();

        saisir(0, 'Awa');
        service.enregistrerProfil.mockRejectedValue(new ErreurCompte('donnee_invalide'));
        element.querySelector('form')?.dispatchEvent(new Event('submit'));
        await stable();
        expect(element.querySelector('[role=alert]')?.textContent).toContain('caractères non autorisés');
    });
});
