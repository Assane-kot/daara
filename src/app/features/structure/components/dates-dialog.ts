import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { FormField, FormFieldControl } from '../../../shared/ui/form-field/form-field';
import { ErreurStructure, SaisiePeriode } from '../data/annees.service';

interface DonneesDates {
    /** Clé de traduction du titre. */
    readonly titre: string;
    /** Période : champ « ordre » affiché. */
    readonly avecOrdre: boolean;
    readonly valeurs?: Partial<SaisiePeriode>;
    /** Enregistre ; une `ErreurStructure` est affichée dans la modale, qui reste ouverte. */
    readonly enregistrer: (saisie: SaisiePeriode) => Promise<void>;
}

/** Fin après le début (contrôlé aussi par la base). */
const datesOrdonnees = (groupe: AbstractControl): ValidationErrors | null => {
    const { dateDebut, dateFin } = groupe.value as { dateDebut: string; dateFin: string };
    return dateDebut && dateFin && dateFin <= dateDebut ? { datesOrdre: true } : null;
};

/** Modale de saisie d'une année scolaire ou d'une période (S3.1) : libellé, (ordre), dates. */
@Component({
    selector: 'app-dates-dialog',
    imports: [ReactiveFormsModule, TranslatePipe, FormField, FormFieldControl],
    template: `
        <div
            class="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg bg-white text-base text-black shadow-sm dark:bg-night dark:text-white-dark"
        >
            <div class="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 dark:bg-night-hover">
                <h2 id="dates-titre" class="text-lg font-bold dark:text-white-light">{{ d.titre | translate }}</h2>
                <button
                    type="button"
                    class="shrink-0 text-3xl leading-7 font-normal text-muted hover:text-black dark:text-night-muted dark:hover:text-white-light"
                    [attr.aria-label]="'commun.fermer' | translate"
                    (click)="ref.close(false)"
                >
                    ×
                </button>
            </div>
            <form class="grid gap-4 overflow-y-auto px-5 py-5" [formGroup]="form" (ngSubmit)="valider()" novalidate>
                <div [class]="d.avecOrdre ? 'grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]' : 'grid gap-4'">
                    <app-form-field [label]="'structure.champs.libelle' | translate">
                        <input appFormControl class="form-input" type="text" formControlName="libelle" [attr.maxlength]="d.avecOrdre ? 40 : 20" />
                    </app-form-field>
                    @if (d.avecOrdre) {
                        <app-form-field [label]="'structure.champs.ordre' | translate">
                            <input appFormControl class="form-input" type="number" formControlName="ordre" min="1" max="12" />
                        </app-form-field>
                    }
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-form-field [label]="'structure.champs.date_debut' | translate">
                        <input appFormControl class="form-input" type="date" formControlName="dateDebut" />
                    </app-form-field>
                    <app-form-field [label]="'structure.champs.date_fin' | translate">
                        <input appFormControl class="form-input" type="date" formControlName="dateFin" />
                    </app-form-field>
                </div>
                @if (form.touched && form.hasError('datesOrdre')) {
                    <p class="m-0 text-danger-strong dark:text-danger-soft" role="alert">{{ 'structure.erreurs.dates' | translate }}</p>
                }
                @if (erreur(); as erreur) {
                    <div
                        class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                        role="alert"
                    >
                        {{ erreur | translate }}
                    </div>
                }
                <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button type="button" class="btn btn-outline-primary" (click)="ref.close(false)">{{ 'commun.annuler' | translate }}</button>
                    <button type="submit" class="btn btn-primary" [disabled]="envoi()">
                        @if (envoi()) {
                            <span class="auth-spinner ltr:mr-2 rtl:ml-2" aria-hidden="true"></span>
                        }
                        {{ 'structure.enregistrer' | translate }}
                    </button>
                </div>
            </form>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatesDialog {
    protected readonly ref = inject<DialogRef<boolean, DatesDialog>>(DialogRef);
    protected readonly d = inject<DonneesDates>(DIALOG_DATA);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly form = inject(NonNullableFormBuilder).group(
        {
            libelle: [this.d.valeurs?.libelle ?? '', [Validators.required, Validators.maxLength(this.d.avecOrdre ? 40 : 20)]],
            ordre: [this.d.valeurs?.ordre ?? 1, [Validators.required, Validators.min(1), Validators.max(12)]],
            dateDebut: [this.d.valeurs?.dateDebut ?? '', Validators.required],
            dateFin: [this.d.valeurs?.dateFin ?? '', Validators.required],
        },
        { validators: datesOrdonnees },
    );

    protected async valider(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi()) {
            return;
        }
        const v = this.form.getRawValue();
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await this.d.enregistrer({ libelle: v.libelle.trim(), ordre: Number(v.ordre), dateDebut: v.dateDebut, dateFin: v.dateFin });
            this.ref.close(true);
        } catch (e) {
            this.erreur.set(e instanceof ErreurStructure ? e.cle : 'structure.erreurs.inattendue');
        } finally {
            this.envoi.set(false);
        }
    }
}

@Injectable({ providedIn: 'root' })
export class DatesDialogService {
    private readonly dialog = inject(Dialog);

    /** Résout vrai si l'enregistrement a réussi. */
    async ouvrir(donnees: DonneesDates): Promise<boolean> {
        const ref = this.dialog.open<boolean, DonneesDates, DatesDialog>(DatesDialog, {
            data: donnees,
            ariaLabelledBy: 'dates-titre',
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            width: 'calc(100% - 2rem)',
            maxWidth: '32rem',
            maxHeight: 'calc(100dvh - 2rem)',
            backdropClass: 'bg-black/60',
        });
        return (await firstValueFrom(ref.closed)) === true;
    }
}
