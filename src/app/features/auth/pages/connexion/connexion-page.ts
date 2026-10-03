import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { isAuthError } from '@supabase/supabase-js';
import { AuthService } from '../../../../core/auth/auth.service';
import { cleErreurAuth } from '../../../../core/auth/erreurs-auth';
import { IconEye } from '../../../../shared/icon/icon-eye';
import { IconEyeOff } from '../../../../shared/icon/icon-eye-off';
import { IconLockDots } from '../../../../shared/icon/icon-lock-dots';
import { IconMail } from '../../../../shared/icon/icon-mail';
import { FormField, FormFieldControl } from '../../../../shared/ui/form-field/form-field';
import { Turnstile } from '../../../../shared/ui/turnstile/turnstile';

/** Connexion par e-mail et mot de passe (LLD §7.0), puis routage selon la session (MFA, onboarding, espace). */
@Component({
    selector: 'app-connexion-page',
    imports: [ReactiveFormsModule, RouterLink, TranslatePipe, FormField, FormFieldControl, Turnstile, IconMail, IconLockDots, IconEye, IconEyeOff],
    templateUrl: './connexion-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnexionPage {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly form = inject(NonNullableFormBuilder).group({
        email: ['', [Validators.required, Validators.email]],
        motDePasse: ['', Validators.required],
    });
    protected readonly captcha = signal<string | null>(null);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly emailNonConfirme = signal(false);
    protected readonly voirMotDePasse = signal(false);
    private readonly turnstile = viewChild.required(Turnstile);

    protected async connecter(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi()) {
            return;
        }
        const captcha = this.captcha();
        if (!captcha) {
            this.erreur.set('auth.erreurs.captcha_requis');
            return;
        }
        const { email, motDePasse } = this.form.getRawValue();
        this.envoi.set(true);
        this.erreur.set(null);
        this.emailNonConfirme.set(false);
        try {
            await this.auth.connecter(email.trim(), motDePasse, captcha);
            await this.router.navigateByUrl(await this.auth.destination());
        } catch (erreur) {
            this.erreur.set(cleErreurAuth(erreur));
            if (isAuthError(erreur) && erreur.code === 'email_not_confirmed') {
                this.auth.emailEnAttente.set(email.trim());
                this.emailNonConfirme.set(true);
            }
            // Un jeton Turnstile ne sert qu'une fois.
            this.turnstile().reinitialiser();
        } finally {
            this.envoi.set(false);
        }
    }
}
