import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { cleErreurAuth } from '../../../core/auth/erreurs-auth';
import { CodeOtp } from '../../../shared/ui/code-otp/code-otp';
import { FormField, FormFieldControl } from '../../../shared/ui/form-field/form-field';
import { codeValidateur, identiqueA, motDePasseValidateur } from '../../../shared/ui/form-field/validateurs';
import { CompteService, ErreurCompte } from '../data/compte.service';

/**
 * Mon compte → Mot de passe (S2.7, ADR-006). Connexion ancienne (`secure_password_change`) : compte avec e-mail → code
 * de réauthentification envoyé par e-mail ; compte téléphone (aucun SMS, ADR-009) → se reconnecter puis réessayer.
 */
@Component({
    selector: 'app-mot-de-passe-page',
    imports: [ReactiveFormsModule, TranslatePipe, FormField, FormFieldControl, CodeOtp],
    template: `
        <div class="panel max-w-2xl">
            <form class="grid gap-4" [formGroup]="form" (ngSubmit)="enregistrer()" novalidate>
                <app-form-field [label]="'auth.champs.nouveau_mot_de_passe' | translate" [aide]="'auth.champs.aide_mot_de_passe' | translate">
                    <input appFormControl class="form-input" type="password" formControlName="motDePasse" autocomplete="new-password" />
                </app-form-field>
                <app-form-field [label]="'auth.champs.confirmation_mot_de_passe' | translate">
                    <input appFormControl class="form-input" type="password" formControlName="confirmation" autocomplete="new-password" />
                </app-form-field>

                @if (codeDemande()) {
                    <div>
                        <p id="code-reauth-libelle" class="mb-1.5 font-semibold">{{ 'compte.mot_de_passe.code' | translate }}</p>
                        <p class="mt-0 mb-2 text-sm text-muted dark:text-night-muted">
                            {{ 'compte.mot_de_passe.code_envoye' | translate: { email: email() } }}
                        </p>
                        <app-code-otp [formControl]="code" libelleId="code-reauth-libelle" [invalide]="code.touched && code.invalid" />
                    </div>
                }

                @if (erreur(); as erreur) {
                    <div
                        class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                        role="alert"
                    >
                        {{ erreur | translate }}
                    </div>
                }
                @if (succes()) {
                    <div class="rounded-md border border-primary/30 bg-primary/10 p-3.5 text-black dark:text-white-light" role="status">
                        {{ 'compte.mot_de_passe.succes' | translate }}
                    </div>
                }
                <div>
                    <button class="btn btn-primary" type="submit" [disabled]="envoi()">
                        @if (envoi()) {
                            <span class="auth-spinner ltr:mr-2 rtl:ml-2" aria-hidden="true"></span>
                        }
                        {{ 'compte.mot_de_passe.bouton' | translate }}
                    </button>
                </div>
            </form>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotDePassePage {
    private readonly service = inject(CompteService);
    private readonly auth = inject(AuthService);
    private readonly fb = inject(NonNullableFormBuilder);

    protected readonly email = this.auth.email;
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal(false);
    protected readonly codeDemande = signal(false);
    protected readonly form = this.fb.group({
        motDePasse: ['', [Validators.required, motDePasseValidateur]],
        confirmation: ['', [Validators.required, identiqueA('motDePasse')]],
    });
    protected readonly code = this.fb.control('', [Validators.required, codeValidateur]);

    constructor() {
        this.form.controls.motDePasse.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.form.controls.confirmation.updateValueAndValidity());
    }

    protected async enregistrer(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.codeDemande()) {
            this.code.markAsTouched();
        }
        if (this.form.invalid || (this.codeDemande() && this.code.invalid) || this.envoi()) {
            return;
        }
        this.envoi.set(true);
        this.erreur.set(null);
        this.succes.set(false);
        try {
            await this.service.changerMotDePasse(this.form.getRawValue().motDePasse, this.codeDemande() ? this.code.value : undefined);
            this.form.reset();
            this.code.reset();
            this.codeDemande.set(false);
            this.succes.set(true);
        } catch (e) {
            await this.traiterErreur(e);
        } finally {
            this.envoi.set(false);
        }
    }

    private async traiterErreur(e: unknown): Promise<void> {
        if (e instanceof ErreurCompte && e.code === 'reauthentification') {
            if (!this.email()) {
                // Compte téléphone : aucun code ne peut lui être envoyé.
                this.erreur.set('compte.mot_de_passe.reconnexion');
                return;
            }
            try {
                await this.service.demanderCodeReauthentification();
                this.codeDemande.set(true);
            } catch (envoi) {
                this.erreur.set(cleErreurAuth(envoi));
            }
            return;
        }
        if (e instanceof ErreurCompte) {
            this.code.reset();
            this.erreur.set(`compte.erreurs.${e.code}`);
            return;
        }
        this.erreur.set(cleErreurAuth(e));
    }
}
