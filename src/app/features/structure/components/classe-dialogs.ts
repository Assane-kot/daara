import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, Type, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { FormField, FormFieldControl } from '../../../shared/ui/form-field/form-field';
import { ErreurStructure } from '../data/annees.service';
import { Affectation, ClasseResume, Enseignant, NIVEAUX_SUGGERES, SaisieAffectation, SaisieClasse } from '../data/classes.service';
import { Matiere } from '../data/matieres.service';

/** Enregistre puis ferme ; une `ErreurStructure` reste affichée dans la modale. */
abstract class ModaleSaisie<T> {
    protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);

    protected async soumettre(valide: boolean, saisie: () => T, enregistrer: (s: T) => Promise<void>): Promise<void> {
        if (!valide || this.envoi()) {
            return;
        }
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await enregistrer(saisie());
            this.ref.close(true);
        } catch (e) {
            this.erreur.set(e instanceof ErreurStructure ? e.cle : 'structure.erreurs.inattendue');
        } finally {
            this.envoi.set(false);
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Classe
// ---------------------------------------------------------------------------------------------------------------
export interface DonneesClasse {
    readonly classe?: ClasseResume;
    readonly enseignants: readonly Enseignant[];
    readonly enregistrer: (s: SaisieClasse) => Promise<void>;
}

/** Modale d'une classe (S3.3) : nom, niveau (suggestions), titulaire (enseignants et admins actifs). */
@Component({
    selector: 'app-classe-dialog',
    imports: [ReactiveFormsModule, TranslatePipe, FormField, FormFieldControl],
    template: `
        <div
            class="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg bg-white text-base text-black shadow-sm dark:bg-night dark:text-white-dark"
        >
            <div class="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 dark:bg-night-hover">
                <h2 id="structure-modale-titre" class="text-lg font-bold dark:text-white-light">
                    {{ (d.classe ? 'structure.classes.modifier' : 'structure.classes.nouvelle') | translate }}
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
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-form-field [label]="'structure.classes.nom' | translate">
                        <input appFormControl class="form-input" type="text" formControlName="nom" maxlength="50" />
                    </app-form-field>
                    <app-form-field [label]="'structure.classes.niveau' | translate" [aide]="'structure.classes.aide_niveau' | translate">
                        <input appFormControl class="form-input" type="text" formControlName="niveau" maxlength="50" list="niveaux-suggeres" />
                    </app-form-field>
                    <datalist id="niveaux-suggeres">
                        @for (niveau of niveaux; track niveau) {
                            <option [value]="niveau"></option>
                        }
                    </datalist>
                </div>
                <app-form-field [label]="'structure.classes.titulaire' | translate">
                    <select appFormControl class="form-select" formControlName="titulaireId">
                        <option value="">{{ 'structure.classes.aucun' | translate }}</option>
                        @for (e of enseignantsProposes; track e.id) {
                            <option [value]="e.id">{{ e.nom || ('membres.sans_nom' | translate) }}</option>
                        }
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
export class ClasseDialog extends ModaleSaisie<SaisieClasse> {
    protected readonly d = inject<DonneesClasse>(DIALOG_DATA);
    protected readonly niveaux = NIVEAUX_SUGGERES;
    /** Actifs, plus le titulaire actuel s'il est désactivé (pour ne pas l'effacer sans le vouloir). */
    protected readonly enseignantsProposes = this.d.enseignants.filter((e) => e.actif || e.id === this.d.classe?.titulaireId);
    protected readonly form = inject(NonNullableFormBuilder).group({
        nom: [this.d.classe?.nom ?? '', [Validators.required, Validators.maxLength(50)]],
        niveau: [this.d.classe?.niveau ?? '', Validators.maxLength(50)],
        titulaireId: [this.d.classe?.titulaireId ?? ''],
    });

    protected valider(): Promise<void> {
        this.form.markAllAsTouched();
        const v = this.form.getRawValue();
        return this.soumettre(
            this.form.valid,
            () => ({ nom: v.nom.trim(), niveau: v.niveau.trim() || null, titulaireId: v.titulaireId || null }),
            this.d.enregistrer,
        );
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Matière enseignée dans une classe
// ---------------------------------------------------------------------------------------------------------------
export interface DonneesAffectation {
    readonly affectation?: Affectation;
    /** Matières proposées à l'ajout : non archivées et pas encore dans la classe. */
    readonly matieres: readonly Matiere[];
    readonly enseignants: readonly Enseignant[];
    readonly enregistrer: (s: SaisieAffectation) => Promise<void>;
}

/** Modale d'une matière de classe (S3.3) : matière (à l'ajout), coefficient (0,5 à 20), enseignant. */
@Component({
    selector: 'app-affectation-dialog',
    imports: [ReactiveFormsModule, TranslatePipe, FormField, FormFieldControl],
    template: `
        <div
            class="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg bg-white text-base text-black shadow-sm dark:bg-night dark:text-white-dark"
        >
            <div class="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 dark:bg-night-hover">
                <h2 id="structure-modale-titre" class="text-lg font-bold dark:text-white-light">
                    {{ (d.affectation ? 'structure.affectations.modifier' : 'structure.affectations.ajouter') | translate }}
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
                @if (d.affectation; as a) {
                    <p class="m-0 font-semibold">{{ a.matiereNom }}</p>
                } @else {
                    <app-form-field [label]="'structure.affectations.matiere' | translate">
                        <select appFormControl class="form-select" formControlName="matiereId">
                            <option value="" disabled>{{ 'structure.affectations.choisir' | translate }}</option>
                            @for (m of d.matieres; track m.id) {
                                <option [value]="m.id">{{ m.nom }} ({{ m.code }})</option>
                            }
                        </select>
                    </app-form-field>
                }
                <div class="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
                    <app-form-field [label]="'structure.affectations.coefficient' | translate">
                        <input appFormControl class="form-input" type="number" formControlName="coefficient" min="0.5" max="20" step="0.5" />
                    </app-form-field>
                    <app-form-field [label]="'structure.affectations.enseignant' | translate">
                        <select appFormControl class="form-select" formControlName="enseignantId">
                            <option value="">{{ 'structure.classes.aucun' | translate }}</option>
                            @for (e of enseignantsProposes; track e.id) {
                                <option [value]="e.id">{{ e.nom || ('membres.sans_nom' | translate) }}</option>
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
export class AffectationDialog extends ModaleSaisie<SaisieAffectation> {
    protected readonly d = inject<DonneesAffectation>(DIALOG_DATA);
    protected readonly enseignantsProposes = this.d.enseignants.filter((e) => e.actif || e.id === this.d.affectation?.enseignantId);
    protected readonly form = inject(NonNullableFormBuilder).group({
        matiereId: [this.d.affectation?.matiereId ?? '', Validators.required],
        coefficient: [this.d.affectation?.coefficient ?? 1, [Validators.required, Validators.min(0.5), Validators.max(20)]],
        enseignantId: [this.d.affectation?.enseignantId ?? ''],
    });

    protected valider(): Promise<void> {
        this.form.markAllAsTouched();
        const v = this.form.getRawValue();
        return this.soumettre(
            this.form.valid,
            () => ({ matiereId: v.matiereId, coefficient: Number(v.coefficient), enseignantId: v.enseignantId || null }),
            this.d.enregistrer,
        );
    }
}

/** Ouvre une modale de saisie de la structure ; résout vrai si l'enregistrement a réussi. */
@Injectable({ providedIn: 'root' })
export class ClasseDialogsService {
    private readonly dialog = inject(Dialog);

    classe(donnees: DonneesClasse): Promise<boolean> {
        return this.ouvrir(ClasseDialog, donnees);
    }

    affectation(donnees: DonneesAffectation): Promise<boolean> {
        return this.ouvrir(AffectationDialog, donnees);
    }

    private async ouvrir<D>(composant: Type<unknown>, donnees: D): Promise<boolean> {
        const ref = this.dialog.open<boolean, D>(composant, {
            data: donnees,
            ariaLabelledBy: 'structure-modale-titre',
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
