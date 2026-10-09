import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { FormField, FormFieldControl } from '../../../shared/ui/form-field/form-field';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { MfaPanel } from '../../auth/components/mfa-panel';
import { Appareil, CompteService, ErreurCompte } from '../data/compte.service';

/**
 * Mon compte → Sécurité (S2.7, ADR-006) : appareils de double authentification (TOTP). Ajout d'un appareil nommé
 * (panneau d'enrôlement du sprint 1), retrait confirmé. Un admin garde au moins un appareil (contrôle d'interface : s'il
 * le contournait, `has_role` exigeant aal2 lui retirerait ses droits d'admin jusqu'au réenrôlement).
 */
@Component({
    selector: 'app-securite-page',
    imports: [ReactiveFormsModule, TranslatePipe, FormField, FormFieldControl, Skeleton, MfaPanel],
    template: `
        <div class="panel max-w-2xl">
            <h2 class="mt-0 mb-1 text-lg font-bold dark:text-white-light">{{ 'compte.securite.titre' | translate }}</h2>
            <p class="mt-0 mb-4 text-muted dark:text-night-muted">
                {{ (admin() ? 'compte.securite.intro_admin' : 'compte.securite.intro') | translate }}
            </p>

            @if (chargement()) {
                <app-skeleton [lignes]="3" />
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
                @if (erreur(); as erreur) {
                    <div
                        class="mb-4 rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                        role="alert"
                    >
                        {{ erreur | translate }}
                    </div>
                }
                @if (succes(); as succes) {
                    <div class="mb-4 rounded-md border border-primary/30 bg-primary/10 p-3.5 text-black dark:text-white-light" role="status">
                        {{ succes | translate }}
                    </div>
                }

                @if (appareils().length === 0) {
                    <p class="m-0 mb-4 font-semibold">{{ 'compte.securite.aucun' | translate }}</p>
                } @else {
                    <ul class="m-0 mb-4 grid list-none gap-3 p-0">
                        @for (appareil of appareils(); track appareil.id) {
                            <li class="flex flex-wrap items-center gap-3 rounded-md border border-white-light p-3 dark:border-night-border">
                                <div class="min-w-0 flex-1">
                                    <p class="m-0 truncate font-semibold text-black dark:text-white-light">
                                        {{ appareil.nom || ('compte.securite.premier_appareil' | translate) }}
                                    </p>
                                    <p class="m-0 text-sm text-muted dark:text-night-muted">
                                        {{ 'compte.securite.ajoute_le' | translate: { date: date(appareil.ajouteLe) } }}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    class="btn btn-sm btn-outline-danger min-h-11"
                                    [disabled]="enCours() || dernierProtege()"
                                    [attr.aria-describedby]="dernierProtege() ? 'appareil-dernier' : null"
                                    (click)="retirer(appareil)"
                                >
                                    {{ 'compte.securite.retirer' | translate }}
                                </button>
                            </li>
                        }
                    </ul>
                    @if (dernierProtege()) {
                        <p id="appareil-dernier" class="mt-0 mb-4 text-sm text-muted dark:text-night-muted">
                            {{ 'compte.securite.dernier_admin' | translate }}
                        </p>
                    }
                }

                @if (ajout(); as nom) {
                    <div class="rounded-md border border-white-light p-4 dark:border-night-border">
                        <p class="mt-0 mb-3 font-semibold">{{ 'compte.securite.ajout_titre' | translate: { nom: nom } }}</p>
                        <app-mfa-panel [nomAppareil]="nom" (valide)="appareilAjoute()" />
                        <button type="button" class="btn btn-outline-primary mt-3" (click)="ajout.set(null)">{{ 'commun.annuler' | translate }}</button>
                    </div>
                } @else {
                    <form class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" [formGroup]="form" (ngSubmit)="commencerAjout()" novalidate>
                        <app-form-field [label]="'compte.securite.nom_appareil' | translate" [aide]="'compte.securite.aide_nom' | translate">
                            <input appFormControl class="form-input" type="text" formControlName="nom" autocomplete="off" maxlength="40" />
                        </app-form-field>
                        <button class="btn btn-primary sm:mt-7" type="submit">{{ 'compte.securite.ajouter' | translate }}</button>
                    </form>
                }
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecuritePage implements OnInit {
    private readonly service = inject(CompteService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);
    private readonly langue = inject(LanguageService).langue;

    protected readonly appareils = signal<Appareil[]>([]);
    protected readonly admin = signal(false);
    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal(false);
    protected readonly enCours = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);
    /** Nom de l'appareil en cours d'ajout (panneau d'enrôlement affiché). */
    protected readonly ajout = signal<string | null>(null);
    protected readonly dernierProtege = computed(() => this.admin() && this.appareils().length <= 1);

    private readonly nomLibre = (c: AbstractControl<string>): ValidationErrors | null =>
        this.appareils().some((a) => a.nom.toLowerCase() === c.value.trim().toLowerCase()) ? { nomPris: true } : null;
    protected readonly form = inject(NonNullableFormBuilder).group({
        nom: ['', [Validators.required, Validators.maxLength(40), this.nomLibre]],
    });

    ngOnInit(): void {
        void this.charger();
    }

    protected async charger(): Promise<void> {
        this.chargement.set(true);
        this.erreurChargement.set(false);
        try {
            const [appareils, admin] = await Promise.all([this.service.appareils(), this.service.estAdmin()]);
            this.appareils.set(appareils);
            this.admin.set(admin);
        } catch {
            this.erreurChargement.set(true);
        } finally {
            this.chargement.set(false);
        }
    }

    protected date(iso: string): string {
        return new Intl.DateTimeFormat(this.langue() === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'medium', timeZone: 'Africa/Dakar' }).format(new Date(iso));
    }

    protected commencerAjout(): void {
        this.form.markAllAsTouched();
        if (this.form.invalid) {
            return;
        }
        this.erreur.set(null);
        this.succes.set(null);
        this.ajout.set(this.form.getRawValue().nom.trim());
    }

    protected async appareilAjoute(): Promise<void> {
        this.ajout.set(null);
        this.form.reset();
        this.succes.set('compte.securite.ajoute');
        this.appareils.set(await this.service.appareils().catch(() => this.appareils()));
    }

    protected async retirer(appareil: Appareil): Promise<void> {
        if (this.dernierProtege()) {
            return;
        }
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('compte.securite.confirmer_titre', {
                nom: appareil.nom || this.translate.instant('compte.securite.premier_appareil'),
            }),
            message: this.translate.instant(this.appareils().length === 1 ? 'compte.securite.confirmer_dernier' : 'compte.securite.confirmer_message'),
            libelleConfirmer: this.translate.instant('compte.securite.retirer'),
            danger: true,
        });
        if (!confirme) {
            return;
        }
        this.enCours.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await this.service.retirerAppareil(appareil.id);
            this.appareils.update((as) => as.filter((a) => a.id !== appareil.id));
            this.succes.set('compte.securite.retire');
        } catch (e) {
            this.erreur.set(`compte.erreurs.${e instanceof ErreurCompte ? e.code : 'retrait'}`);
        } finally {
            this.enCours.set(false);
        }
    }
}
