import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthError } from '@supabase/supabase-js';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { Turnstile } from '../../../../shared/ui/turnstile/turnstile';
import { ConnexionPage } from './connexion-page';

/** Le vrai widget charge un script Cloudflare : remplacé par un composant vide qui expose la même API. */
@Component({ selector: 'app-turnstile', template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class TurnstileFactice {
    readonly jeton = output<string | null>();
    reinitialiser = vi.fn();
}

describe('ConnexionPage', () => {
    let fixture: ComponentFixture<ConnexionPage>;
    let element: HTMLElement;
    const auth = {
        connecter: vi.fn(),
        destination: vi.fn(),
        emailEnAttente: { set: vi.fn() },
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideTranslateTesting(), { provide: AuthService, useValue: auth }],
        });
        TestBed.overrideComponent(ConnexionPage, { remove: { imports: [Turnstile] }, add: { imports: [TurnstileFactice] } });
        fixture = TestBed.createComponent(ConnexionPage);
        element = fixture.nativeElement as HTMLElement;
        await fixture.whenStable();
    });

    function remplir(email: string, motDePasse: string): void {
        const [champEmail, champMdp] = Array.from(element.querySelectorAll('input'));
        champEmail.value = email;
        champEmail.dispatchEvent(new Event('input'));
        champMdp.value = motDePasse;
        champMdp.dispatchEvent(new Event('input'));
    }

    async function envoyer(): Promise<void> {
        element.querySelector('form')?.dispatchEvent(new Event('submit'));
        await fixture.whenStable();
    }

    /** Simule un jeton Turnstile reçu ; la requête `viewChild(Turnstile)` est redirigée vers le composant factice. */
    function donnerCaptcha(): TurnstileFactice {
        const page = fixture.componentInstance as unknown as { captcha: { set(v: string): void }; turnstile: () => TurnstileFactice };
        const turnstile = fixture.debugElement.query((n) => n.componentInstance instanceof TurnstileFactice).componentInstance as TurnstileFactice;
        page.captcha.set('jeton');
        page.turnstile = () => turnstile;
        return turnstile;
    }

    it('affiche les erreurs de validation sans appeler Supabase', async () => {
        await envoyer();
        expect(element.textContent).toContain('Ce champ est obligatoire.');
        expect(auth.connecter).not.toHaveBeenCalled();
    });

    it('attend la vérification anti-robot', async () => {
        remplir('awa@test.local', 'daara2026');
        await envoyer();
        expect(element.querySelector('[role=alert]')?.textContent).toContain('Patientez pendant la vérification anti-robot.');
        expect(auth.connecter).not.toHaveBeenCalled();
    });

    it('se connecte puis navigue vers la destination', async () => {
        const navigation = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
        auth.connecter.mockResolvedValue(undefined);
        auth.destination.mockResolvedValue('/onboarding');
        remplir(' awa@test.local ', 'daara2026');
        donnerCaptcha();

        await envoyer();

        expect(auth.connecter).toHaveBeenCalledWith({ email: 'awa@test.local' }, 'daara2026', 'jeton');
        expect(navigation).toHaveBeenCalledWith('/onboarding');
    });

    it('affiche un message neutre et réinitialise Turnstile en cas d’échec', async () => {
        auth.connecter.mockRejectedValue(new AuthError('Invalid login credentials', 400, 'invalid_credentials'));
        remplir('awa@test.local', 'faux12345');
        const turnstile = donnerCaptcha();

        await envoyer();

        expect(element.querySelector('[role=alert]')?.textContent).toContain('Identifiant ou mot de passe incorrect.');
        expect(turnstile.reinitialiser).toHaveBeenCalled();
    });

    it("propose de saisir le code si l'adresse n'est pas confirmée", async () => {
        auth.connecter.mockRejectedValue(new AuthError('Email not confirmed', 400, 'email_not_confirmed'));
        remplir('awa@test.local', 'daara2026');
        donnerCaptcha();

        await envoyer();

        expect(auth.emailEnAttente.set).toHaveBeenCalledWith('awa@test.local');
        expect(element.querySelector('a[href="/auth/confirmation"]')).not.toBeNull();
    });

    it('se connecte par téléphone : numéro sénégalais à 9 chiffres normalisé', async () => {
        vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
        auth.connecter.mockResolvedValue(undefined);
        auth.destination.mockResolvedValue('/');
        remplir('77 123 45 67', 'daara2026');
        donnerCaptcha();

        await envoyer();

        expect(auth.connecter).toHaveBeenCalledWith({ telephone: '+221771234567' }, 'daara2026', 'jeton');
    });

    it('refuse un identifiant qui n’est ni un e-mail ni un téléphone', async () => {
        remplir('abc', 'daara2026');
        await envoyer();
        expect(element.textContent).toContain('Saisissez une adresse e-mail ou un numéro de téléphone valide.');
        expect(auth.connecter).not.toHaveBeenCalled();
    });
});
