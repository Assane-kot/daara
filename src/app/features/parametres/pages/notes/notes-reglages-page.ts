import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SignauxDaaraService } from '../../../../core/daara/signaux-daara.service';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { ErreurReglages, ReglagesNotes, ReglagesNotesService, TypeEvaluation } from '../../data/reglages-notes.service';

interface Choix {
    readonly champ: keyof ReglagesNotes;
    readonly options: readonly (string | boolean)[];
    /** Le réglage change le calcul des moyennes (avertissement avant d'enregistrer). */
    readonly calcul: boolean;
}

/** Réglages présentés en tuiles (une phrase d'explication et un libellé par option, ADR-012). */
const CHOIX: readonly Choix[] = [
    { champ: 'absenceEvaluation', options: ['ignorer', 'zero', 'zero_si_non_justifiee'], calcul: true },
    { champ: 'moyenneGenerale', options: ['ponderee', 'simple'], calcul: true },
    { champ: 'arrondi', options: ['centieme', 'dixieme', 'quart', 'demi'], calcul: true },
    { champ: 'titulaireSaisit', options: [false, true], calcul: false },
    { champ: 'visibilite', options: ['publication', 'saisie'], calcul: false },
    { champ: 'moyennesVisibles', options: [true, false], calcul: false },
    { champ: 'appreciations', options: [true, false], calcul: false },
];

/**
 * Paramètres → Notes (S6.1, admin, module `notes`, ADR-012) : types d'évaluation (coefficient, ajout, archivage) et
 * réglages du calcul et de l'affichage des notes, chacun expliqué par une phrase ; valeurs par défaut posées par la base.
 */
@Component({
    selector: 'app-notes-reglages-page',
    imports: [ReactiveFormsModule, RouterLink, TranslatePipe, Skeleton],
    template: `
        @if (chargement()) {
            <div class="panel"><app-skeleton [lignes]="6" /></div>
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

            <section class="panel mb-5" aria-labelledby="types-titre">
                <h2 id="types-titre" class="m-0 text-lg font-bold dark:text-white-light">{{ 'reglages.types.titre' | translate }}</h2>
                <p class="m-0 mb-1 text-muted dark:text-night-muted">{{ 'reglages.types.aide' | translate }}</p>
                <p class="m-0 mb-4 text-sm text-muted dark:text-night-muted">
                    {{ 'reglages.bareme' | translate: { bareme: bareme() } }}
                    <a class="font-semibold text-primary hover:underline" routerLink="../general">{{ 'reglages.bareme_lien' | translate }}</a>
                </p>
                <ul class="m-0 grid list-none gap-2 p-0">
                    @for (t of types(); track t.id) {
                        <li
                            class="flex flex-wrap items-end gap-2 rounded-md border border-white-light p-3 dark:border-night-border"
                            [class.opacity-60]="t.archive"
                        >
                            <label class="mb-0! grid min-w-40 flex-1 gap-1 text-xs font-semibold">
                                {{ 'reglages.types.nom' | translate }}
                                <input
                                    class="form-input min-h-11 font-normal"
                                    maxlength="40"
                                    [value]="t.nom"
                                    (change)="modifier(t, { nom: $any($event.target).value })"
                                />
                            </label>
                            <label class="mb-0! grid w-28 gap-1 text-xs font-semibold">
                                {{ 'reglages.types.coefficient' | translate }}
                                <input
                                    class="form-input min-h-11 font-normal"
                                    type="number"
                                    inputmode="decimal"
                                    min="0.25"
                                    max="20"
                                    step="0.25"
                                    [value]="t.coefficient"
                                    (change)="modifier(t, { coefficient: +$any($event.target).value })"
                                />
                            </label>
                            <button type="button" class="btn btn-sm btn-outline-dark min-h-11" (click)="modifier(t, { archive: !t.archive })">
                                {{ (t.archive ? 'reglages.types.reactiver' : 'reglages.types.archiver') | translate }}
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger min-h-11" (click)="supprimer(t)">
                                {{ 'reglages.types.supprimer' | translate }}
                            </button>
                        </li>
                    }
                </ul>
                <form class="mt-3 flex flex-wrap items-end gap-2" (submit)="$event.preventDefault(); ajouter(nouveauNom.value, +nouveauCoef.value)">
                    <label class="mb-0! grid min-w-40 flex-1 gap-1 text-xs font-semibold">
                        {{ 'reglages.types.nouveau' | translate }}
                        <input #nouveauNom class="form-input min-h-11 font-normal" maxlength="40" [placeholder]="'reglages.types.exemple' | translate" />
                    </label>
                    <label class="mb-0! grid w-28 gap-1 text-xs font-semibold">
                        {{ 'reglages.types.coefficient' | translate }}
                        <input
                            #nouveauCoef
                            class="form-input min-h-11 font-normal"
                            type="number"
                            inputmode="decimal"
                            min="0.25"
                            max="20"
                            step="0.25"
                            value="1"
                        />
                    </label>
                    <button type="submit" class="btn btn-primary min-h-11">{{ 'reglages.types.ajouter' | translate }}</button>
                </form>
            </section>

            <form class="panel grid gap-6" [formGroup]="form" (ngSubmit)="enregistrer()">
                @for (c of choix; track c.champ) {
                    <fieldset class="m-0 border-0 p-0">
                        <legend class="mb-0.5 font-bold text-black dark:text-white-light">{{ 'reglages.' + c.champ + '.titre' | translate }}</legend>
                        <p class="m-0 mb-2 text-sm text-muted dark:text-night-muted">{{ 'reglages.' + c.champ + '.aide' | translate }}</p>
                        <div class="grid gap-2" [class]="c.options.length > 2 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'">
                            @for (o of c.options; track o) {
                                <label
                                    class="mb-0! flex min-h-11 cursor-pointer flex-col justify-center rounded-md border border-white-light px-3 py-2 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary dark:border-night-border"
                                >
                                    <input class="sr-only" type="radio" [formControlName]="c.champ" [value]="o" />
                                    <span class="font-bold">{{ 'reglages.' + c.champ + '.' + o | translate }}</span>
                                </label>
                            }
                        </div>
                    </fieldset>
                }
                <div>
                    <label class="mb-0! grid max-w-xs gap-1 font-bold" for="seuil">{{ 'reglages.seuil.titre' | translate }}</label>
                    <p class="m-0 mb-2 text-sm text-muted dark:text-night-muted">{{ 'reglages.seuil.aide' | translate: { moitie: bareme() / 2 } }}</p>
                    <input
                        id="seuil"
                        class="form-input max-w-40"
                        type="number"
                        inputmode="decimal"
                        min="0"
                        [max]="bareme()"
                        step="0.25"
                        formControlName="seuilReussite"
                        [placeholder]="bareme() / 2"
                    />
                </div>
                <div class="flex justify-end">
                    <button type="submit" class="btn btn-primary" [disabled]="envoi() || form.pristine">
                        @if (envoi()) {
                            <span class="auth-spinner ltr:mr-2 rtl:ml-2" aria-hidden="true"></span>
                        }
                        {{ 'reglages.enregistrer' | translate }}
                    </button>
                </div>
            </form>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesReglagesPage implements OnInit {
    private readonly service = inject(ReglagesNotesService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);

    protected readonly choix = CHOIX;
    protected readonly bareme = signal(20);
    protected readonly types = signal<TypeEvaluation[]>([]);
    protected readonly chargement = signal(true);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);
    private enregistre: ReglagesNotes | null = null;

    protected readonly form = inject(NonNullableFormBuilder).group({
        absenceEvaluation: ['ignorer' as ReglagesNotes['absenceEvaluation']],
        moyenneGenerale: ['ponderee' as ReglagesNotes['moyenneGenerale']],
        arrondi: ['centieme' as ReglagesNotes['arrondi']],
        seuilReussite: [null as number | null],
        titulaireSaisit: [false],
        visibilite: ['publication' as ReglagesNotes['visibilite']],
        moyennesVisibles: [true],
        appreciations: [true],
    });

    constructor() {
        // Un autre admin change les réglages : relire (sans écraser une saisie en cours).
        inject(SignauxDaaraService).surveiller(['reglages_notes', 'types_evaluation'], () => this.charger(this.form.dirty));
    }

    ngOnInit(): void {
        void this.charger();
    }

    protected async enregistrer(): Promise<void> {
        const valeur = this.form.getRawValue();
        const seuil = valeur.seuilReussite === null || `${valeur.seuilReussite}` === '' ? null : Number(valeur.seuilReussite);
        const calculChange = !!this.enregistre && CHOIX.some((c) => c.calcul && this.enregistre![c.champ] !== valeur[c.champ]);
        if (
            calculChange &&
            !(await this.confirmation.confirmer({
                titre: this.translate.instant('reglages.confirmer_titre'),
                message: this.translate.instant('reglages.confirmer_message'),
                libelleConfirmer: this.translate.instant('reglages.enregistrer'),
            }))
        ) {
            return;
        }
        this.envoi.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            const r: ReglagesNotes = { ...valeur, seuilReussite: seuil };
            await this.service.enregistrer(r);
            this.enregistre = r;
            this.form.markAsPristine();
            this.succes.set('reglages.enregistres');
        } catch (e) {
            this.erreur.set(e instanceof ErreurReglages ? e.cle : 'reglages.erreurs.inattendue');
        } finally {
            this.envoi.set(false);
        }
    }

    protected async ajouter(nom: string, coefficient: number): Promise<void> {
        if (!nom.trim()) {
            return;
        }
        await this.agir(() => this.service.ajouterType(nom, coefficient || 1, this.types().length + 1), 'reglages.types.ajoute');
    }

    protected async modifier(t: TypeEvaluation, modif: { nom?: string; coefficient?: number; archive?: boolean }): Promise<void> {
        await this.agir(() => this.service.modifierType(t.id, modif), 'reglages.types.modifie');
    }

    protected async supprimer(t: TypeEvaluation): Promise<void> {
        const ok = await this.confirmation.confirmer({
            titre: this.translate.instant('reglages.types.confirmer_suppression', { nom: t.nom }),
            message: this.translate.instant('reglages.types.confirmer_suppression_message'),
            libelleConfirmer: this.translate.instant('reglages.types.supprimer'),
            danger: true,
        });
        if (ok) {
            await this.agir(() => this.service.supprimerType(t.id), 'reglages.types.supprime');
        }
    }

    private async agir(action: () => Promise<void>, succes: string): Promise<void> {
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await action();
            this.succes.set(succes);
        } catch (e) {
            this.erreur.set(e instanceof ErreurReglages ? e.cle : 'reglages.erreurs.inattendue');
        }
        await this.charger(true);
    }

    private async charger(garderSaisie = false): Promise<void> {
        try {
            const { reglages, types, bareme } = await this.service.charger();
            this.types.set(types);
            this.bareme.set(bareme);
            this.enregistre = reglages;
            if (!garderSaisie) {
                this.form.reset(reglages);
            }
        } catch (e) {
            this.erreur.set(e instanceof ErreurReglages ? e.cle : 'reglages.erreurs.inattendue');
        } finally {
            this.chargement.set(false);
        }
    }
}
