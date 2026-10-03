import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { cleErreurAuth } from '../../../../core/auth/erreurs-auth';
import { IconEye } from '../../../../shared/icon/icon-eye';
import { IconEyeOff } from '../../../../shared/icon/icon-eye-off';
import { IconLockDots } from '../../../../shared/icon/icon-lock-dots';
import { IconMail } from '../../../../shared/icon/icon-mail';
import { FormField, FormFieldControl } from '../../../../shared/ui/form-field/form-field';
import { motDePasseValidateur } from '../../../../shared/ui/form-field/validateurs';
import { Turnstile } from '../../../../shared/ui/turnstile/turnstile';

/** Nombre de critères remplis (longueur, lettre, chiffre) : jauge visuelle sous le mot de passe. */
export function forceMotDePasse(valeur: string): number {
    return [valeur.length >= 8, /\p{L}/u.test(valeur), /\d/.test(valeur)].filter(Boolean).length;
}

/** Inscription (LLD §7.0) : signUp avec Turnstile, puis écran du code de confirmation. */
@Component({
    selector: 'app-inscription-page',
    imports: [ReactiveFormsModule, RouterLink, TranslatePipe, FormField, FormFieldControl, Turnstile, IconMail, IconLockDots, IconEye, IconEyeOff],
    templateUrl: './inscription-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InscriptionPage {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly form = inject(NonNullableFormBuilder).group({
        prenom: ['', [Validators.required, Validators.maxLength(100)]],
        nom: ['', [Validators.required, Validators.maxLength(100)]],
        email: ['', [Validators.required, Validators.email]],
        motDePasse: ['', [Validators.required, motDePasseValidateur]],
    });
    private readonly motDePasse = toSignal(this.form.controls.motDePasse.valueChanges, { initialValue: '' });
    protected readonly force = computed(() => forceMotDePasse(this.motDePasse()));
    protected readonly captcha = signal<string | null>(null);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly voirMotDePasse = signal(false);
    private readonly turnstile = viewChild.required(Turnstile);

    protected async inscrire(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi()) {
            return;
        }
        const captcha = this.captcha();
        if (!captcha) {
            this.erreur.set('auth.erreurs.captcha_requis');
            return;
        }
        const saisie = this.form.getRawValue();
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await this.auth.inscrire({
                prenom: saisie.prenom.trim(),
                nom: saisie.nom.trim(),
                email: saisie.email.trim(),
                motDePasse: saisie.motDePasse,
                captcha,
            });
            await this.router.navigateByUrl('/auth/confirmation');
        } catch (erreur) {
            this.erreur.set(cleErreurAuth(erreur));
            this.turnstile().reinitialiser();
        } finally {
            this.envoi.set(false);
        }
    }
}
