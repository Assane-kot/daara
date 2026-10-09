import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { FormField, FormFieldControl } from '../../../shared/ui/form-field/form-field';
import { ErreurStructure } from '../data/annees.service';
import { Matiere, SaisieMatiere, TYPES_MATIERE, TypeMatiere, proposerCode } from '../data/matieres.service';

interface DonneesMatiere {
    readonly matiere?: Matiere;
    /** Enregistre ; une `ErreurStructure` est affichée dans la modale, qui reste ouverte. */
    readonly enregistrer: (saisie: SaisieMatiere) => Promise<void>;
}

/** Modale de saisie d'une matière (S3.2) : nom, code (proposé à partir du nom tant qu'il n'est pas modifié), type. */
@Component({
    selector: 'app-matiere-dialog',
    imports: [ReactiveFormsModule, TranslatePipe, FormField, FormFieldControl],
    template: `
        <div
            class="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg bg-white text-base text-black shadow-sm dark:bg-night dark:text-white-dark"
        >
            <div class="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 dark:bg-night-hover">
                <h2 id="matiere-titre" class="text-lg font-bold dark:text-white-light">
                    {{ (d.matiere ? 'structure.matieres.modifier' : 'structure.matieres.nouvelle') | translate }}
                </h2>
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
                <app-form-field [label]="'structure.matieres.nom' | translate">
                    <input appFormControl class="form-input" type="text" formControlName="nom" maxlength="80" />
                </app-form-field>
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-form-field [label]="'structure.matieres.code' | translate" [aide]="'structure.matieres.aide_code' | translate">
                        <input
                            appFormControl
                            class="form-input font-mono uppercase"
                            type="text"
                            formControlName="code"
                            maxlength="10"
                            (input)="codeModifie = true"
                        />
                    </app-form-field>
                    <app-form-field [label]="'structure.matieres.type' | translate">
                        <select appFormControl class="form-select" formControlName="type">
                            @for (type of types; track type) {
                                <option [value]="type">{{ 'structure.matieres.types.' + type | translate }}</option>
                            }
                        </select>
                    </app-form-field>
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
export class MatiereDialog {
    protected readonly ref = inject<DialogRef<boolean, MatiereDialog>>(DialogRef);
    protected readonly d = inject<DonneesMatiere>(DIALOG_DATA);
    protected readonly types = TYPES_MATIERE;
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    /** Le code suit le nom tant que l'utilisateur ne l'a pas saisi lui-même (création seulement). */
    protected codeModifie = !!this.d.matiere;
    protected readonly form = inject(NonNullableFormBuilder).group({
        nom: [this.d.matiere?.nom ?? '', [Validators.required, Validators.maxLength(80)]],
        code: [this.d.matiere?.code ?? '', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{1,10}$/)]],
        type: [this.d.matiere?.type ?? ('scolaire' as TypeMatiere)],
    });

    constructor() {
        this.form.controls.nom.valueChanges.pipe(takeUntilDestroyed()).subscribe((nom) => {
            if (!this.codeModifie) {
                this.form.controls.code.setValue(proposerCode(nom));
            }
        });
    }

    protected async valider(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi()) {
            return;
        }
        const v = this.form.getRawValue();
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await this.d.enregistrer({ nom: v.nom.trim(), code: v.code.trim().toUpperCase(), type: v.type });
            this.ref.close(true);
        } catch (e) {
            this.erreur.set(e instanceof ErreurStructure ? e.cle : 'structure.erreurs.inattendue');
        } finally {
            this.envoi.set(false);
        }
    }
}

@Injectable({ providedIn: 'root' })
export class MatiereDialogService {
    private readonly dialog = inject(Dialog);

    /** Résout vrai si l'enregistrement a réussi. */
    async ouvrir(donnees: DonneesMatiere): Promise<boolean> {
        const ref = this.dialog.open<boolean, DonneesMatiere, MatiereDialog>(MatiereDialog, {
            data: donnees,
            ariaLabelledBy: 'matiere-titre',
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
