import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { FormField, FormFieldControl } from '../../../shared/ui/form-field/form-field';
import { ErreurEvaluation, Evaluation, PeriodeNotes, SaisieEvaluation, TypeNotes, libelleSuggere } from '../data/evaluations.service';

interface DonneesEvaluation {
    /** Titre de la modale (classe, matière). */
    readonly titre: string;
    readonly periode: PeriodeNotes;
    readonly types: readonly TypeNotes[];
    /** Évaluations déjà créées (numérotation de l'intitulé proposé). */
    readonly existantes: readonly Evaluation[];
    readonly bareme: number;
    readonly date: string;
    /** Évaluation modifiée ; absente pour une création. */
    readonly evaluation?: Evaluation;
    /** Enregistre ; une `ErreurEvaluation` est affichée dans la modale, qui reste ouverte. */
    readonly enregistrer: (saisie: SaisieEvaluation) => Promise<void>;
}

/** Quart de point : 0,25 ; 0,5 ; 0,75… */
const QUART = /^\d+([.,](0|00|25|5|50|75))?$/;

/**
 * Modale d'une évaluation (S6.2) : type en un toucher (intitulé « Devoir 2 » et coefficient du type proposés tant qu'ils
 * ne sont pas modifiés), date (aujourd'hui dans la période), barème (celui de la daara), coefficient.
 */
@Component({
    selector: 'app-evaluation-dialog',
    imports: [ReactiveFormsModule, TranslatePipe, FormField, FormFieldControl],
    template: `
        <div
            class="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg bg-white text-base text-black shadow-sm dark:bg-night dark:text-white-dark"
        >
            <div class="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 dark:bg-night-hover">
                <div class="min-w-0">
                    <h2 id="evaluation-titre" class="text-lg font-bold dark:text-white-light">
                        {{ (d.evaluation ? 'notes.evaluation.modifier' : 'notes.evaluation.nouvelle') | translate }}
                    </h2>
                    <p class="m-0 truncate text-sm text-muted dark:text-night-muted">{{ d.titre }} · {{ d.periode.libelle }}</p>
                </div>
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
                <fieldset class="m-0 border-0 p-0">
                    <legend class="mb-1.5 font-semibold text-black dark:text-white-light">{{ 'notes.evaluation.type' | translate }}</legend>
                    <div class="grid grid-cols-2 gap-2">
                        @for (t of d.types; track t.id) {
                            <label
                                class="mb-0! flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-white-light px-3 py-2 text-center font-bold has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary dark:border-night-border"
                            >
                                <input class="sr-only" type="radio" formControlName="typeId" [value]="t.id" />
                                {{ t.nom }}
                            </label>
                        }
                    </div>
                </fieldset>
                <app-form-field [label]="'notes.evaluation.libelle' | translate">
                    <input appFormControl class="form-input" type="text" formControlName="libelle" maxlength="60" (input)="libelleModifie = true" />
                </app-form-field>
                <app-form-field [label]="'notes.evaluation.date' | translate" [aide]="'notes.evaluation.aide_date' | translate: { periode: d.periode.libelle }">
                    <input appFormControl class="form-input" type="date" formControlName="date" [min]="d.periode.debut" [max]="d.periode.fin" />
                </app-form-field>
                <div class="grid grid-cols-2 gap-4">
                    <app-form-field [label]="'notes.evaluation.bareme' | translate" [aide]="'notes.evaluation.aide_bareme' | translate">
                        <input appFormControl class="form-input" type="text" inputmode="decimal" formControlName="bareme" />
                    </app-form-field>
                    <app-form-field [label]="'notes.evaluation.coefficient' | translate">
                        <input
                            appFormControl
                            class="form-input"
                            type="text"
                            inputmode="decimal"
                            formControlName="coefficient"
                            (input)="coefficientModifie = true"
                        />
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
                        {{ (d.evaluation ? 'notes.evaluation.enregistrer' : 'notes.evaluation.creer') | translate }}
                    </button>
                </div>
            </form>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationDialog {
    protected readonly ref = inject<DialogRef<boolean, EvaluationDialog>>(DialogRef);
    protected readonly d = inject<DonneesEvaluation>(DIALOG_DATA);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    /** Intitulé et coefficient suivent le type tant que l'utilisateur ne les a pas saisis (création seulement). */
    protected libelleModifie = !!this.d.evaluation;
    protected coefficientModifie = !!this.d.evaluation;

    private readonly typeInitial = this.d.evaluation ? this.d.types.find((t) => t.id === this.d.evaluation!.typeId) : this.d.types[0];

    protected readonly form = inject(NonNullableFormBuilder).group({
        typeId: [this.d.evaluation?.typeId ?? this.typeInitial?.id ?? '', Validators.required],
        libelle: [
            this.d.evaluation?.libelle ?? (this.typeInitial ? libelleSuggere(this.typeInitial, this.d.existantes) : ''),
            [Validators.required, Validators.maxLength(60)],
        ],
        date: [this.d.evaluation?.date ?? this.d.date, Validators.required],
        bareme: [String(this.d.evaluation?.bareme ?? this.d.bareme), [Validators.required, Validators.pattern(QUART)]],
        coefficient: [String(this.d.evaluation?.coefficient ?? this.typeInitial?.coefficient ?? 1), [Validators.required, Validators.pattern(QUART)]],
    });

    constructor() {
        this.form.controls.typeId.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => {
            const type = this.d.types.find((t) => t.id === id);
            if (!type) {
                return;
            }
            if (!this.libelleModifie) {
                this.form.controls.libelle.setValue(libelleSuggere(type, this.d.existantes));
            }
            if (!this.coefficientModifie) {
                this.form.controls.coefficient.setValue(String(type.coefficient));
            }
        });
    }

    protected async valider(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi()) {
            return;
        }
        const v = this.form.getRawValue();
        const bareme = Number(v.bareme.replace(',', '.'));
        const coefficient = Number(v.coefficient.replace(',', '.'));
        if (bareme < 1 || bareme > 100) {
            this.erreur.set('notes.erreurs.bareme');
            return;
        }
        if (coefficient < 0.25 || coefficient > 20) {
            this.erreur.set('notes.erreurs.coefficient');
            return;
        }
        if (v.date < this.d.periode.debut || v.date > this.d.periode.fin) {
            this.erreur.set('notes.erreurs.date_hors_periode');
            return;
        }
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await this.d.enregistrer({ typeId: v.typeId, libelle: v.libelle.trim(), date: v.date, bareme, coefficient });
            this.ref.close(true);
        } catch (e) {
            this.erreur.set(e instanceof ErreurEvaluation ? e.cle : 'notes.erreurs.inattendue');
        } finally {
            this.envoi.set(false);
        }
    }
}

@Injectable({ providedIn: 'root' })
export class EvaluationDialogService {
    private readonly dialog = inject(Dialog);

    /** Résout vrai si l'enregistrement a réussi. */
    async ouvrir(donnees: DonneesEvaluation): Promise<boolean> {
        const ref = this.dialog.open<boolean, DonneesEvaluation, EvaluationDialog>(EvaluationDialog, {
            data: donnees,
            ariaLabelledBy: 'evaluation-titre',
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
