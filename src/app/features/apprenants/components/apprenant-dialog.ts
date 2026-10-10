import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, ElementRef, Injectable, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { FormField, FormFieldControl } from '../../../shared/ui/form-field/form-field';
import { Apprenant, ErreurApprenants, SaisieApprenant, Sexe } from '../data/apprenants.service';

interface DonneesApprenant {
    readonly apprenant?: Apprenant;
    readonly enregistrer: (s: SaisieApprenant) => Promise<void>;
}

/**
 * Modale d'un élève (S4.1) : nom, prénom, date de naissance et sexe facultatifs (ADR-010). Création : « Enregistrer et
 * ajouter un autre » garde la modale ouverte et vide le formulaire (saisie en série, `.claude/rules/ux.md`).
 */
@Component({
    selector: 'app-apprenant-dialog',
    imports: [ReactiveFormsModule, TranslatePipe, FormField, FormFieldControl],
    template: `
        <div
            class="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg bg-white text-base text-black shadow-sm dark:bg-night dark:text-white-dark"
        >
            <div class="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 dark:bg-night-hover">
                <h2 id="apprenant-titre" class="text-lg font-bold dark:text-white-light">
                    {{ (d.apprenant ? 'apprenants.modifier' : 'apprenants.ajouter') | translate }}
                </h2>
                <button
                    type="button"
                    class="shrink-0 text-3xl leading-7 font-normal text-muted hover:text-black dark:text-night-muted dark:hover:text-white-light"
                    [attr.aria-label]="'commun.fermer' | translate"
                    (click)="ref.close(ajoutes() > 0)"
                >
                    ×
                </button>
            </div>
            <form class="grid gap-4 overflow-y-auto px-5 py-5" [formGroup]="form" (ngSubmit)="valider(false)" novalidate>
                @if (ajoutes() > 0) {
                    <div class="rounded-md border border-primary/30 bg-primary/10 p-3 text-black dark:text-white-light" role="status">
                        {{ 'apprenants.ajoutes' | translate: { n: ajoutes() } }}
                    </div>
                }
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-form-field [label]="'auth.champs.prenom' | translate">
                        <input #premierChamp appFormControl class="form-input" type="text" formControlName="prenom" autocomplete="off" maxlength="100" />
                    </app-form-field>
                    <app-form-field [label]="'auth.champs.nom' | translate">
                        <input appFormControl class="form-input" type="text" formControlName="nom" autocomplete="off" maxlength="100" />
                    </app-form-field>
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-form-field [label]="'apprenants.date_naissance' | translate" [aide]="'apprenants.facultatif' | translate">
                        <input appFormControl class="form-input" type="date" formControlName="dateNaissance" [max]="aujourdhui" min="1950-01-01" />
                    </app-form-field>
                    <fieldset class="m-0 border-0 p-0">
                        <legend class="mb-1.5 font-semibold">{{ 'apprenants.sexe' | translate }}</legend>
                        <div class="grid grid-cols-2 gap-2">
                            @for (s of sexes; track s.valeur) {
                                <label
                                    class="mb-0! flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-white-light px-2 text-sm font-bold has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary dark:border-night-border"
                                >
                                    <input class="sr-only" type="radio" formControlName="sexe" [value]="s.valeur" />
                                    {{ s.cle | translate }}
                                </label>
                            }
                        </div>
                        @if (form.controls.sexe.touched && form.controls.sexe.invalid) {
                            <p class="mt-1 mb-0 text-danger-strong dark:text-danger-soft" role="alert">{{ 'apprenants.sexe_requis' | translate }}</p>
                        }
                    </fieldset>
                </div>
                @if (erreur(); as erreur) {
                    <div
                        class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                        role="alert"
                    >
                        {{ erreur | translate }}
                    </div>
                }
                <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button type="button" class="btn btn-outline-primary" (click)="ref.close(ajoutes() > 0)">
                        {{ (ajoutes() > 0 ? 'commun.fermer' : 'commun.annuler') | translate }}
                    </button>
                    @if (!d.apprenant) {
                        <button type="button" class="btn btn-outline-primary" [disabled]="envoi()" (click)="valider(true)">
                            {{ 'apprenants.enregistrer_et_ajouter' | translate }}
                        </button>
                    }
                    <button type="submit" class="btn btn-primary" [disabled]="envoi()">
                        @if (envoi()) {
                            <span class="auth-spinner ltr:mr-2 rtl:ml-2" aria-hidden="true"></span>
                        }
                        {{ 'apprenants.enregistrer' | translate }}
                    </button>
                </div>
            </form>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprenantDialog {
    protected readonly ref = inject<DialogRef<boolean, ApprenantDialog>>(DialogRef);
    protected readonly d = inject<DonneesApprenant>(DIALOG_DATA);
    private readonly premierChamp = viewChild<ElementRef<HTMLInputElement>>('premierChamp');
    protected readonly aujourdhui = new Date().toISOString().slice(0, 10);
    protected readonly sexes: readonly { valeur: Sexe; cle: string }[] = [
        { valeur: 'M', cle: 'apprenants.sexes.M' },
        { valeur: 'F', cle: 'apprenants.sexes.F' },
    ];
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly ajoutes = signal(0);
    protected readonly form = inject(NonNullableFormBuilder).group({
        prenom: [this.d.apprenant?.prenom ?? '', [Validators.required, Validators.maxLength(100)]],
        nom: [this.d.apprenant?.nom ?? '', [Validators.required, Validators.maxLength(100)]],
        dateNaissance: [this.d.apprenant?.dateNaissance ?? ''],
        sexe: [(this.d.apprenant?.sexe ?? '') as Sexe | '', Validators.required],
    });

    protected async valider(continuer: boolean): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi()) {
            return;
        }
        const v = this.form.getRawValue();
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await this.d.enregistrer({ prenom: v.prenom.trim(), nom: v.nom.trim(), dateNaissance: v.dateNaissance || null, sexe: v.sexe as Sexe });
            if (continuer) {
                this.ajoutes.update((n) => n + 1);
                this.form.reset({ prenom: '', nom: v.nom.trim(), dateNaissance: '', sexe: '' });
                this.premierChamp()?.nativeElement.focus();
            } else {
                this.ref.close(true);
            }
        } catch (e) {
            this.erreur.set(e instanceof ErreurApprenants ? e.cle : 'apprenants.erreurs.inattendue');
        } finally {
            this.envoi.set(false);
        }
    }
}

@Injectable({ providedIn: 'root' })
export class ApprenantDialogService {
    private readonly dialog = inject(Dialog);

    /** Résout vrai si au moins un enregistrement a réussi. */
    async ouvrir(donnees: DonneesApprenant): Promise<boolean> {
        const ref = this.dialog.open<boolean, DonneesApprenant, ApprenantDialog>(ApprenantDialog, {
            data: donnees,
            ariaLabelledBy: 'apprenant-titre',
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            width: 'calc(100% - 2rem)',
            maxWidth: '34rem',
            maxHeight: 'calc(100dvh - 2rem)',
            backdropClass: 'bg-black/60',
        });
        return (await firstValueFrom(ref.closed)) === true;
    }
}
