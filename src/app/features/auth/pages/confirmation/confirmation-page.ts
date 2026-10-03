import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { cleErreurAuth } from '../../../../core/auth/erreurs-auth';
import { IconMail } from '../../../../shared/icon/icon-mail';
import { CodeOtp } from '../../../../shared/ui/code-otp/code-otp';
import { FormField, FormFieldControl } from '../../../../shared/ui/form-field/form-field';
import { codeValidateur } from '../../../../shared/ui/form-field/validateurs';
import { Turnstile } from '../../../../shared/ui/turnstile/turnstile';

/** Délai avant de pouvoir redemander un code (LLD §7.0 : renvoi limité, minuteur 60 s). */
export const DELAI_RENVOI_S = 60;

/** Confirmation de l'adresse e-mail par code à 6 chiffres (LLD §7.0) : la session s'ouvre à la validation. */
@Component({
    selector: 'app-confirmation-page',
    imports: [ReactiveFormsModule, RouterLink, TranslatePipe, FormField, FormFieldControl, CodeOtp, Turnstile, IconMail],
    templateUrl: './confirmation-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationPage {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    /** Adresse connue (arrivée depuis l'inscription) : pas de champ e-mail à remplir. */
    protected readonly emailConnu = this.auth.emailEnAttente();
    protected readonly form = inject(NonNullableFormBuilder).group({
        email: [this.emailConnu, [Validators.required, Validators.email]],
        code: ['', [Validators.required, codeValidateur]],
    });
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly info = signal<string | null>(null);
    protected readonly attente = signal(this.emailConnu ? DELAI_RENVOI_S : 0);
    /** Jeton Turnstile exigé par Supabase pour le renvoi ; le widget n'apparaît qu'une fois le délai écoulé. */
    protected readonly captcha = signal<string | null>(null);
    private readonly turnstile = viewChild(Turnstile);

    constructor() {
        const minuteur = setInterval(() => this.attente.update((s) => Math.max(0, s - 1)), 1000);
        inject(DestroyRef).onDestroy(() => clearInterval(minuteur));
    }

    protected async confirmer(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi()) {
            return;
        }
        const { email, code } = this.form.getRawValue();
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await this.auth.confirmerEmail(email.trim(), code);
            this.auth.emailEnAttente.set('');
            await this.router.navigateByUrl(await this.auth.destination());
        } catch (erreur) {
            this.erreur.set(cleErreurAuth(erreur));
        } finally {
            this.envoi.set(false);
        }
    }

    protected async renvoyer(): Promise<void> {
        const controle = this.form.controls.email;
        controle.markAsTouched();
        const captcha = this.captcha();
        if (controle.invalid || this.attente() > 0) {
            return;
        }
        if (!captcha) {
            this.erreur.set('auth.erreurs.captcha_requis');
            return;
        }
        this.erreur.set(null);
        this.info.set(null);
        try {
            await this.auth.renvoyerCodeConfirmation(controle.value.trim(), captcha);
            this.info.set('auth.confirmation.renvoye');
            this.attente.set(DELAI_RENVOI_S);
        } catch (erreur) {
            this.erreur.set(cleErreurAuth(erreur));
        } finally {
            // Jeton à usage unique, consommé ou rejeté.
            this.captcha.set(null);
            this.turnstile()?.reinitialiser();
        }
    }
}
