import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';
import { Turnstile } from '../../../../shared/ui/turnstile/turnstile';
import { CodeAccesService, ErreurCodeAcces } from '../../data/code-acces.service';
import { CodeAccesPage } from './code-acces-page';

@Component({ selector: 'app-turnstile', template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class TurnstileFactice {
    readonly jeton = output<string | null>();
    reinitialiser = vi.fn();
}

describe('CodeAccesPage', () => {
    let fixture: ComponentFixture<CodeAccesPage>;
    let element: HTMLElement;
    const service = { utiliser: vi.fn() };

    beforeEach(async () => {
        vi.resetAllMocks();
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideTranslateTesting(), { provide: CodeAccesService, useValue: service }],
        });
        TestBed.overrideComponent(CodeAccesPage, { remove: { imports: [Turnstile] }, add: { imports: [TurnstileFactice] } });
        fixture = TestBed.createComponent(CodeAccesPage);
        element = fixture.nativeElement as HTMLElement;
        await fixture.whenStable();
    });

    function remplir(identifiant: string, code: string, motDePasse: string, confirmation = motDePasse): void {
        const champs = Array.from(element.querySelectorAll('input'));
        [identifiant, code, motDePasse, confirmation].forEach((valeur, i) => {
            champs[i].value = valeur;
            champs[i].dispatchEvent(new Event('input'));
        });
    }

    async function envoyer(): Promise<void> {
        element.querySelector('form')?.dispatchEvent(new Event('submit'));
        await fixture.whenStable();
    }

    function donnerCaptcha(): TurnstileFactice {
        const page = fixture.componentInstance as unknown as { captcha: { set(v: string): void }; turnstile: () => TurnstileFactice };
        const turnstile = fixture.debugElement.query((n) => n.componentInstance instanceof TurnstileFactice).componentInstance as TurnstileFactice;
        page.captcha.set('jeton');
        page.turnstile = () => turnstile;
        return turnstile;
    }

    it('valide le code (alphabet sans symbole ambigu) et la confirmation sans appeler le serveur', async () => {
        remplir('77 000 99 11', 'ABCD-EFG0', 'daara2026', 'daara2027');
        donnerCaptcha();
        await envoyer();
        expect(element.textContent).toContain('Saisissez les 8 caractères du code');
        expect(element.textContent).toContain('Les deux mots de passe ne sont pas identiques.');
        expect(service.utiliser).not.toHaveBeenCalled();
    });

    it('code bon : identifiant et code normalisés, formulaire vidé, invitation à se connecter', async () => {
        service.utiliser.mockResolvedValue(undefined);
        remplir('77 000 99 11', 'abcd efgh', 'daara2026');
        donnerCaptcha();
        await envoyer();
        expect(service.utiliser).toHaveBeenCalledWith({
            identifiant: { telephone: '+221770009911' },
            code: 'ABCDEFGH',
            motDePasse: 'daara2026',
            captcha: 'jeton',
        });
        expect(element.querySelector('[role=status]')?.textContent).toContain('Connectez-vous avec votre nouveau mot de passe');
        expect(element.querySelector('a[href="/auth/connexion"]')).not.toBeNull();
        expect(element.querySelector('form')).toBeNull();
    });

    it('code refusé : message neutre, Turnstile réinitialisé', async () => {
        service.utiliser.mockRejectedValue(new ErreurCodeAcces('code_invalide'));
        remplir('awa@test.local', 'ABCD-EFGH', 'daara2026');
        const turnstile = donnerCaptcha();
        await envoyer();
        expect(element.querySelector('[role=alert]')?.textContent).toContain('Code invalide ou expiré');
        expect(turnstile.reinitialiser).toHaveBeenCalled();
    });
});
