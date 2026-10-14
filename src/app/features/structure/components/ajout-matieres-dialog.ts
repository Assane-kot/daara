import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { sansAccents } from '../../../shared/ui/data-table/data-table';
import { ErreurStructure } from '../data/annees.service';
import { Enseignant, SaisieAffectation } from '../data/classes.service';
import { Matiere } from '../data/matieres.service';

export interface DonneesAjoutMatieres {
    readonly classeNom: string;
    /** Matières proposées : non archivées et pas encore dans la classe. */
    readonly matieres: readonly Matiere[];
    readonly enseignants: readonly Enseignant[];
    readonly ajouter: (saisies: SaisieAffectation[]) => Promise<void>;
}

interface Choix {
    readonly coefficient: number;
    readonly enseignantId: string;
}

/** Coefficient accepté : 0,5 à 20 par pas de 0,5 (contrainte de la base). */
export function coefficientValide(c: number): boolean {
    return Number.isFinite(c) && c >= 0.5 && c <= 20 && Number.isInteger(c * 2);
}

/**
 * « Ajouter des matières » à une classe (S3.3, sélection multiple depuis le 2026-10-13) : recherche, cases à cocher,
 * « Tout sélectionner » ; chaque matière cochée montre son coefficient et son enseignant sur la même ligne ; un seul
 * envoi (tout ou rien).
 */
@Component({
    selector: 'app-ajout-matieres-dialog',
    imports: [TranslatePipe],
    template: `
        <div
            class="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg bg-white text-base text-black shadow-sm dark:bg-night dark:text-white-dark"
        >
            <div class="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 dark:bg-night-hover">
                <h2 id="ajout-matieres-titre" class="text-lg font-bold dark:text-white-light">
                    {{ 'structure.affectations.ajouter_dans' | translate: { classe: d.classeNom } }}
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
            <div class="grid min-h-0 gap-3 overflow-y-auto px-5 py-4">
                <input
                    type="search"
                    class="form-input"
                    [placeholder]="'structure.affectations.rechercher' | translate"
                    [attr.aria-label]="'structure.affectations.rechercher' | translate"
                    (input)="filtre.set($any($event.target).value)"
                />
                <label class="mb-0! flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
                    <input type="checkbox" class="form-checkbox" [checked]="tousCoches()" (change)="toutCocher()" />
                    {{ 'structure.affectations.tout_selectionner' | translate: { n: visibles().length } }}
                </label>
                <ul class="m-0 grid list-none gap-1 p-0">
                    @for (m of visibles(); track m.id) {
                        <li [class]="choix().has(m.id) ? 'rounded-md bg-primary/5' : 'rounded-md'">
                            <label class="mb-0! flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 font-normal hover:bg-primary/10">
                                <input type="checkbox" class="form-checkbox" [checked]="choix().has(m.id)" (change)="basculer(m.id)" />
                                <span class="min-w-0 flex-1 truncate">{{ m.nom }}</span>
                                <span class="font-mono text-xs text-muted dark:text-night-muted">{{ m.code }}</span>
                            </label>
                            @if (choix().get(m.id); as c) {
                                <div class="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2 px-2 pb-2 ltr:pl-9 rtl:pr-9">
                                    <label class="mb-0! grid gap-1 text-xs font-semibold">
                                        {{ 'structure.affectations.coefficient' | translate }}
                                        <input
                                            class="form-input min-h-11 font-normal"
                                            type="number"
                                            inputmode="decimal"
                                            min="0.5"
                                            max="20"
                                            step="0.5"
                                            [value]="c.coefficient"
                                            [attr.aria-invalid]="!coefficientValide(c.coefficient)"
                                            (input)="changer(m.id, { coefficient: +$any($event.target).value })"
                                        />
                                    </label>
                                    <label class="mb-0! grid gap-1 text-xs font-semibold">
                                        {{ 'structure.affectations.enseignant' | translate }}
                                        <select
                                            class="form-select min-h-11 font-normal"
                                            [value]="c.enseignantId"
                                            (change)="changer(m.id, { enseignantId: $any($event.target).value })"
                                        >
                                            <option value="">{{ 'structure.classes.aucun' | translate }}</option>
                                            @for (e of enseignantsActifs; track e.id) {
                                                <option [value]="e.id">{{ e.nom || ('membres.sans_nom' | translate) }}</option>
                                            }
                                        </select>
                                    </label>
                                    @if (!coefficientValide(c.coefficient)) {
                                        <p class="col-span-2 m-0 text-xs text-danger-strong dark:text-danger-soft">
                                            {{ 'structure.affectations.coefficient_invalide' | translate }}
                                        </p>
                                    }
                                </div>
                            }
                        </li>
                    } @empty {
                        <li class="px-2 text-muted dark:text-night-muted">{{ 'structure.affectations.aucune_trouvee' | translate }}</li>
                    }
                </ul>
                @if (erreur(); as erreur) {
                    <div
                        class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                        role="alert"
                    >
                        {{ erreur | translate }}
                    </div>
                }
            </div>
            <div class="flex flex-col-reverse gap-3 border-t border-white-light px-5 py-3 sm:flex-row sm:justify-end dark:border-night-border">
                <button type="button" class="btn btn-outline-primary" (click)="ref.close(false)">{{ 'commun.annuler' | translate }}</button>
                <button type="button" class="btn btn-primary" [disabled]="envoi() || choix().size === 0 || !tousValides()" (click)="valider()">
                    @if (envoi()) {
                        <span class="auth-spinner ltr:mr-2 rtl:ml-2" aria-hidden="true"></span>
                    }
                    {{ 'structure.affectations.ajouter_n' | translate: { n: choix().size } }}
                </button>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AjoutMatieresDialog {
    protected readonly ref = inject<DialogRef<boolean, AjoutMatieresDialog>>(DialogRef);
    protected readonly d = inject<DonneesAjoutMatieres>(DIALOG_DATA);
    protected readonly enseignantsActifs = this.d.enseignants.filter((e) => e.actif);
    protected readonly coefficientValide = coefficientValide;
    protected readonly filtre = signal('');
    protected readonly choix = signal<ReadonlyMap<string, Choix>>(new Map());
    protected readonly visibles = computed(() => {
        const f = sansAccents(this.filtre().trim());
        return this.d.matieres.filter((m) => !f || sansAccents(`${m.nom} ${m.code}`).includes(f));
    });
    protected readonly tousCoches = computed(() => this.visibles().length > 0 && this.visibles().every((m) => this.choix().has(m.id)));
    protected readonly tousValides = computed(() => [...this.choix().values()].every((c) => coefficientValide(c.coefficient)));
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);

    protected basculer(id: string): void {
        const m = new Map(this.choix());
        if (!m.delete(id)) {
            m.set(id, { coefficient: 1, enseignantId: '' });
        }
        this.choix.set(m);
    }

    protected toutCocher(): void {
        const m = new Map(this.choix());
        const cocher = !this.tousCoches();
        for (const v of this.visibles()) {
            if (!cocher) {
                m.delete(v.id);
            } else if (!m.has(v.id)) {
                m.set(v.id, { coefficient: 1, enseignantId: '' });
            }
        }
        this.choix.set(m);
    }

    protected changer(id: string, valeur: Partial<Choix>): void {
        const actuel = this.choix().get(id);
        if (actuel) {
            this.choix.set(new Map(this.choix()).set(id, { ...actuel, ...valeur }));
        }
    }

    protected async valider(): Promise<void> {
        if (this.choix().size === 0 || !this.tousValides()) {
            return;
        }
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            // Dans l'ordre de la liste (catalogue), pas dans l'ordre des clics.
            const saisies = this.d.matieres
                .filter((m) => this.choix().has(m.id))
                .map((m) => {
                    const c = this.choix().get(m.id)!;
                    return { matiereId: m.id, coefficient: c.coefficient, enseignantId: c.enseignantId || null };
                });
            await this.d.ajouter(saisies);
            this.ref.close(true);
        } catch (e) {
            this.erreur.set(e instanceof ErreurStructure ? e.cle : 'structure.erreurs.inattendue');
        } finally {
            this.envoi.set(false);
        }
    }
}

@Injectable({ providedIn: 'root' })
export class AjoutMatieresDialogService {
    private readonly dialog = inject(Dialog);

    async ouvrir(donnees: DonneesAjoutMatieres): Promise<boolean> {
        const ref = this.dialog.open<boolean, DonneesAjoutMatieres, AjoutMatieresDialog>(AjoutMatieresDialog, {
            data: donnees,
            ariaLabelledBy: 'ajout-matieres-titre',
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            width: 'calc(100% - 2rem)',
            maxWidth: '36rem',
            maxHeight: 'calc(100dvh - 2rem)',
            backdropClass: 'bg-black/60',
        });
        return (await firstValueFrom(ref.closed)) === true;
    }
}
