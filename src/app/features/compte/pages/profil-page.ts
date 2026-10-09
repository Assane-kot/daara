import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { FormField, FormFieldControl } from '../../../shared/ui/form-field/form-field';
import { MOTIF_TELEPHONE } from '../../../shared/ui/form-field/validateurs';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { CompteService, ErreurCompte, LangueCompte } from '../data/compte.service';

/** Mon compte → Profil (S2.7) : prénom, nom, téléphone, langue ; identifiant de connexion en lecture seule. */
@Component({
    selector: 'app-profil-page',
    imports: [ReactiveFormsModule, TranslatePipe, FormField, FormFieldControl, Skeleton],
    template: `
        <div class="panel max-w-2xl">
            @if (chargement()) {
                <app-skeleton [lignes]="4" />
            } @else if (erreurChargement()) {
                <div class="grid gap-4">
                    <div
                        class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                        role="alert"
                    >
                        {{ 'compte.erreurs.chargement' | translate }}
                    </div>
                    <div>
                        <button type="button" class="btn btn-outline-primary" (click)="charger()">{{ 'membres.reessayer' | translate }}</button>
                    </div>
                </div>
            } @else {
                <form class="grid gap-4" [formGroup]="form" (ngSubmit)="enregistrer()" novalidate>
                    <div>
                        <p class="mb-1.5 font-semibold">{{ 'compte.profil.identifiant' | translate }}</p>
                        <p class="m-0 break-all text-muted dark:text-night-muted">{{ identifiant() }}</p>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-form-field [label]="'auth.champs.prenom' | translate">
                            <input appFormControl class="form-input" type="text" formControlName="prenom" autocomplete="given-name" maxlength="100" />
                        </app-form-field>
                        <app-form-field [label]="'auth.champs.nom' | translate">
                            <input appFormControl class="form-input" type="text" formControlName="nom" autocomplete="family-name" maxlength="100" />
                        </app-form-field>
                    </div>
                    <app-form-field [label]="'compte.profil.telephone' | translate" [aide]="'compte.profil.aide_telephone' | translate">
                        <input appFormControl class="form-input" type="tel" formControlName="telephone" autocomplete="tel" inputmode="tel" maxlength="20" />
                    </app-form-field>
                    <app-form-field [label]="'compte.profil.langue' | translate" [aide]="'compte.profil.aide_langue' | translate">
                        <select appFormControl class="form-select" formControlName="langue">
                            <option value="fr" lang="fr">{{ 'onboarding.langues.fr' | translate }}</option>
                            <option value="en" lang="en">{{ 'onboarding.langues.en' | translate }}</option>
                        </select>
                    </app-form-field>

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
                            {{ 'compte.profil.succes' | translate }}
                        </div>
                    }
                    <div>
                        <button class="btn btn-primary" type="submit" [disabled]="envoi() || form.pristine">
                            @if (envoi()) {
                                <span class="auth-spinner ltr:mr-2 rtl:ml-2" aria-hidden="true"></span>
                            }
                            {{ 'compte.enregistrer' | translate }}
                        </button>
                    </div>
                </form>
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilPage implements OnInit {
    private readonly service = inject(CompteService);
    private readonly auth = inject(AuthService);
    private readonly language = inject(LanguageService);

    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal(false);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal(false);
    protected readonly form = inject(NonNullableFormBuilder).group({
        prenom: ['', [Validators.required, Validators.maxLength(100)]],
        nom: ['', [Validators.required, Validators.maxLength(100)]],
        telephone: ['', Validators.pattern(MOTIF_TELEPHONE)],
        langue: ['fr' as LangueCompte],
    });

    /** E-mail, ou téléphone pour un compte sans e-mail (ADR-009). */
    protected identifiant(): string {
        const user = this.auth.user();
        return user?.email || (user?.phone ? `+${user.phone}` : '');
    }

    ngOnInit(): void {
        void this.charger();
    }

    protected async charger(): Promise<void> {
        this.chargement.set(true);
        this.erreurChargement.set(false);
        try {
            const profil = await this.service.chargerProfil();
            this.form.reset({ prenom: profil.prenom, nom: profil.nom, telephone: profil.telephone ?? '', langue: profil.langue });
        } catch {
            this.erreurChargement.set(true);
        } finally {
            this.chargement.set(false);
        }
    }

    protected async enregistrer(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi()) {
            return;
        }
        const s = this.form.getRawValue();
        this.envoi.set(true);
        this.erreur.set(null);
        this.succes.set(false);
        try {
            await this.service.enregistrerProfil({ prenom: s.prenom.trim(), nom: s.nom.trim(), telephone: s.telephone.trim() || null, langue: s.langue });
            await this.language.setLangue(s.langue);
            this.form.markAsPristine();
            this.succes.set(true);
        } catch (e) {
            this.erreur.set(`compte.erreurs.${e instanceof ErreurCompte ? e.code : 'enregistrement'}`);
        } finally {
            this.envoi.set(false);
        }
    }
}
