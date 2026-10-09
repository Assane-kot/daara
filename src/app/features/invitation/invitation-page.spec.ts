import { Component, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { AuthService } from '../../core/auth/auth.service';
import { Turnstile } from '../../shared/ui/turnstile/turnstile';
import { ApercuInvitation, ErreurInvitation, InvitationService } from './data/invitation.service';
import { InvitationPage } from './invitation-page';

@Component({ selector: 'app-turnstile', template: '' })
class TurnstileFactice {
    readonly jeton = output<string | null>();
    reinitialiser = vi.fn();
}

const JETON = 'J'.repeat(43);
const APERCU: ApercuInvitation = { daara: 'Daara Touba', role: 'parent', type: 'telephone', contact: '+221 77 *** ** 67', langue: 'fr', etat: 'valide' };

describe('InvitationPage', () => {
    let fixture: ComponentFixture<InvitationPage>;
    let element: HTMLElement;
    const service = { apercu: vi.fn(), creerCompteTelephone: vi.fn() };
    const session = vi.fn();
    const auth = { session, accepterInvitation: vi.fn(), connecter: vi.fn(), destination: vi.fn(), deconnecter: vi.fn() };

    async function ouvrir(): Promise<void> {
        fixture = TestBed.createComponent(InvitationPage);
        element = fixture.nativeElement as HTMLElement;
        await fixture.whenStable();
    }

    function bouton(texte: string): HTMLButtonElement {
        return [...element.querySelectorAll('button')].find((b) => b.textContent?.includes(texte)) as HTMLButtonElement;
    }

    beforeEach(() => {
        vi.resetAllMocks();
        sessionStorage.setItem('daara.invitation', JETON);
        service.apercu.mockResolvedValue(APERCU);
        session.mockReturnValue(null);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateTesting(),
                { provide: InvitationService, useValue: service },
                { provide: AuthService, useValue: auth },
            ],
        });
        TestBed.overrideComponent(InvitationPage, { remove: { imports: [Turnstile] }, add: { imports: [TurnstileFactice] } });
    });

    afterEach(() => sessionStorage.removeItem('daara.invitation'));

    it('affiche l’aperçu ; invité par téléphone non connecté : formulaire du mot de passe', async () => {
        await ouvrir();
        expect(service.apercu).toHaveBeenCalledWith(JETON);
        expect(element.querySelector('h1')?.textContent).toContain('« Daara Touba » vous invite');
        expect(element.textContent).toContain('+221 77 *** ** 67');
        expect(element.querySelector('input[formcontrolname=motDePasse]')).not.toBeNull();
    });

    it('invitation expirée : message dédié et jeton oublié', async () => {
        service.apercu.mockResolvedValue({ ...APERCU, etat: 'expiree' });
        await ouvrir();
        expect(element.querySelector('[role=alert]')?.textContent).toContain('Cette invitation a expiré.');
        expect(sessionStorage.getItem('daara.invitation')).toBeNull();
    });

    it('lien inconnu', async () => {
        service.apercu.mockRejectedValue(new ErreurInvitation('jeton_invalide'));
        await ouvrir();
        expect(element.textContent).toContain('Ce lien d’invitation n’est pas valide.');
    });

    it('sans jeton : lien incomplet', async () => {
        sessionStorage.removeItem('daara.invitation');
        await ouvrir();
        expect(element.textContent).toContain('Lien d’invitation incomplet');
        expect(service.apercu).not.toHaveBeenCalled();
    });

    it('invité par e-mail non connecté : créer un compte ou se connecter', async () => {
        service.apercu.mockResolvedValue({ ...APERCU, type: 'email', contact: 'a***@g***.com' });
        await ouvrir();
        expect(element.querySelector('a[href="/auth/inscription"]')).not.toBeNull();
        expect(element.querySelector('a[href="/auth/connexion"]')).not.toBeNull();
    });

    it('connecté : rejoindre puis aller dans la daara', async () => {
        session.mockReturnValue({ user: { id: 'u-1' } });
        auth.accepterInvitation.mockResolvedValue('daara-touba');
        const navigation = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
        await ouvrir();
        bouton('Rejoindre Daara Touba').click();
        await fixture.whenStable();
        expect(auth.accepterInvitation).toHaveBeenCalledWith(JETON);
        expect(navigation).toHaveBeenCalledWith('/d/daara-touba');
    });

    it('connecté avec un autre compte : message avec le contact attendu', async () => {
        session.mockReturnValue({ user: { id: 'u-1' } });
        auth.accepterInvitation.mockRejectedValue({ code: '42501', message: 'contact_different' });
        await ouvrir();
        bouton('Rejoindre').click();
        await fixture.whenStable();
        expect(element.querySelector('[role=alert]')?.textContent).toContain('Ce lien est destiné à +221 77 *** ** 67');
    });

    it('invitation admin sans double authentification : lien vers l’activation', async () => {
        session.mockReturnValue({ user: { id: 'u-1' } });
        auth.accepterInvitation.mockRejectedValue({ code: '42501', message: 'aal2_requis' });
        await ouvrir();
        bouton('Rejoindre').click();
        await fixture.whenStable();
        expect(element.querySelector('a[href="/auth/mfa"]')).not.toBeNull();
    });

    it('compte créé, connexion en échec : une seule tentative, mot de passe effacé', async () => {
        service.creerCompteTelephone.mockResolvedValue({ slug: 'daara-touba', telephone: '+221771234567' });
        auth.connecter.mockRejectedValue(new Error('429'));
        await ouvrir();
        const page = fixture.componentInstance as unknown as {
            form: { setValue(v: unknown): void; getRawValue(): { motDePasse: string } };
            captcha: { set(v: string): void };
            jetonTurnstile(j: string): Promise<void>;
        };
        page.form.setValue({ prenom: 'Fatou', nom: 'Ba', motDePasse: 'motdepasse1' });
        page.captcha.set('c1');
        (element.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
        await fixture.whenStable();
        expect(page.form.getRawValue().motDePasse).toBe('');

        await page.jetonTurnstile('c2');
        await page.jetonTurnstile('c3');
        await fixture.whenStable();
        expect(auth.connecter).toHaveBeenCalledTimes(1);
        expect(element.querySelector('[role=alert]')?.textContent).toContain('la connexion a échoué');
    });
});
