import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { CodeOtp } from '../../../../shared/ui/code-otp/code-otp';
import { FormField, FormFieldControl } from '../../../../shared/ui/form-field/form-field';
import { codeValidateur, identiqueA, motDePasseValidateur } from '../../../../shared/ui/form-field/validateurs';
import { Turnstile } from '../../../../shared/ui/turnstile/turnstile';
import { MfaPanel } from '../../components/mfa-panel';

type Etape = 'email' | 'code' | 'mfa';

/**
 * Mot de passe oublié (ADR-006 niveau 1, LLD §7.0) : e-mail + Turnstile → code à 6 chiffres + nouveau mot de passe
 * → (code TOTP si le compte en a un et que Supabase l'exige) → session ouverte.
 */
@Component({
    selector: 'app-mot-de-passe-oublie-page',
    imports: [
        ReactiveFormsModule,
        RouterLink,
        TranslatePipe,
        FormField,
        FormFieldControl,
        Turnstile,
        CodeOtp,
        MfaPanel,
        IconMail,
        IconLockDots,
        IconEye,
        IconEyeOff,
    ],
    templateUrl: './mot-de-passe-oublie-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotDePasseOubliePage {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly fb = inject(NonNullableFormBuilder);

    protected readonly etape = signal<Etape>('email');
    protected readonly formEmail = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
    protected readonly formCode = this.fb.group({
        code: ['', [Validators.required, codeValidateur]],
        motDePasse: ['', [Validators.required, motDePasseValidateur]],
        confirmation: ['', [Validators.required, identiqueA('motDePasse')]],
    });
    protected readonly captcha = signal<string | null>(null);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly voirMotDePasse = signal(false);
    private readonly turnstile = viewChild(Turnstile);
    /** Le code e-mail n'est utilisable qu'une fois : après succès, seule la modification du mot de passe est rejouée. */
    private codeVerifie = false;

    constructor() {
        this.formCode.controls.motDePasse.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.formCode.controls.confirmation.updateValueAndValidity());
    }

    protected async demanderCode(): Promise<void> {
        this.formEmail.markAllAsTouched();
        if (this.formEmail.invalid || this.envoi()) {
            return;
        }
        const captcha = this.captcha();
        if (!captcha) {
            this.erreur.set('auth.erreurs.captcha_requis');
            return;
        }
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await this.auth.demanderReinitialisation(this.formEmail.getRawValue().email.trim(), captcha);
            this.etape.set('code');
        } catch (erreur) {
            this.erreur.set(cleErreurAuth(erreur));
            this.turnstile()?.reinitialiser();
        } finally {
            // Jeton à usage unique : jamais renvoyé une seconde fois.
            this.captcha.set(null);
            this.envoi.set(false);
        }
    }

    protected async reinitialiser(): Promise<void> {
        this.formCode.markAllAsTouched();
        if (this.formCode.invalid || this.envoi()) {
            return;
        }
        const { code } = this.formCode.getRawValue();
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            if (!this.codeVerifie) {
                await this.auth.verifierCodeReinitialisation(this.formEmail.getRawValue().email.trim(), code);
                this.codeVerifie = true;
            }
            await this.enregistrer();
        } catch (erreur) {
            if (isAuthError(erreur) && erreur.code === 'insufficient_aal') {
                // Compte protégé par TOTP : Supabase exige aal2 pour changer le mot de passe.
                this.etape.set('mfa');
            } else {
                this.erreur.set(cleErreurAuth(erreur));
            }
        } finally {
            this.envoi.set(false);
        }
    }

    /** Après le code TOTP (étape « mfa ») : la session est aal2, le mot de passe peut être changé. */
    protected async apresMfa(): Promise<void> {
        this.erreur.set(null);
        try {
            await this.enregistrer();
        } catch (erreur) {
            this.erreur.set(cleErreurAuth(erreur));
        }
    }

    protected autreAdresse(): void {
        this.codeVerifie = false;
        this.captcha.set(null);
        this.formCode.reset();
        this.erreur.set(null);
        this.etape.set('email');
    }

    private async enregistrer(): Promise<void> {
        await this.auth.changerMotDePasse(this.formCode.getRawValue().motDePasse);
        await this.router.navigateByUrl(await this.auth.destination());
    }
}
