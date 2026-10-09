import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Identifiant, identifiantValidateur, lireIdentifiant } from '../../../../core/auth/identifiant';
import { IconEye } from '../../../../shared/icon/icon-eye';
import { IconEyeOff } from '../../../../shared/icon/icon-eye-off';
import { IconLockDots } from '../../../../shared/icon/icon-lock-dots';
import { IconMail } from '../../../../shared/icon/icon-mail';
import { FormField, FormFieldControl } from '../../../../shared/ui/form-field/form-field';
import { codeAccesValidateur, identiqueA, motDePasseValidateur, normaliserCodeAcces } from '../../../../shared/ui/form-field/validateurs';
import { Turnstile } from '../../../../shared/ui/turnstile/turnstile';
import { CodeAccesService, ErreurCodeAcces } from '../../data/code-acces.service';

/**
 * `/auth/code-acces` (S2.6, ADR-006 niveau 2) : identifiant, code remis par l'admin, nouveau mot de passe, Turnstile →
 * mot de passe changé, sessions fermées → l'utilisateur se connecte (TOTP s'il en a un : le code ne le contourne pas).
 */
@Component({
    selector: 'app-code-acces-page',
    imports: [ReactiveFormsModule, RouterLink, TranslatePipe, FormField, FormFieldControl, Turnstile, IconMail, IconLockDots, IconEye, IconEyeOff],
    templateUrl: './code-acces-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeAccesPage {
    private readonly service = inject(CodeAccesService);

    protected readonly form = inject(NonNullableFormBuilder).group({
        identifiant: ['', [Validators.required, identifiantValidateur]],
        code: ['', [Validators.required, codeAccesValidateur]],
        motDePasse: ['', [Validators.required, motDePasseValidateur]],
        confirmation: ['', [Validators.required, identiqueA('motDePasse')]],
    });
    protected readonly captcha = signal<string | null>(null);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal(false);
    protected readonly voirMotDePasse = signal(false);
    private readonly turnstile = viewChild(Turnstile);

    constructor() {
        // La confirmation suit le mot de passe.
        this.form.controls.motDePasse.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.form.controls.confirmation.updateValueAndValidity());
    }

    protected async valider(): Promise<void> {
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
            await this.service.utiliser({
                identifiant: lireIdentifiant(saisie.identifiant) as Identifiant,
                code: normaliserCodeAcces(saisie.code) as string,
                motDePasse: saisie.motDePasse,
                captcha,
            });
            // Rien ne reste en mémoire : l'utilisateur se connecte avec son nouveau mot de passe.
            this.form.reset();
            this.succes.set(true);
        } catch (erreur) {
            this.erreur.set(`auth.code_acces.erreurs.${erreur instanceof ErreurCodeAcces ? erreur.code : 'inattendue'}`);
            // Un jeton Turnstile ne sert qu'une fois.
            this.captcha.set(null);
            this.turnstile()?.reinitialiser();
        } finally {
            this.envoi.set(false);
        }
    }
}
