import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { SignauxDaaraService } from '../../../../core/daara/signaux-daara.service';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { ErreurReglagesAbsences, ReglagesAbsences, ReglagesAbsencesService } from '../../data/reglages-absences.service';

const TUILES: readonly { readonly champ: 'appelDemiJournee' | 'decideur' | 'justificationParent'; readonly options: readonly (string | boolean)[] }[] = [
    { champ: 'appelDemiJournee', options: [false, true] },
    { champ: 'decideur', options: ['admin_titulaire', 'admin'] },
    { champ: 'justificationParent', options: [true, false] },
];

/**
 * Paramètres → Absences (S6.1b, admin, module `absences`, ADR-012) : appel une fois par jour ou matin et après-midi, délai
 * de correction de l'enseignant, qui décide d'une justification, justification par les parents.
 */
@Component({
    selector: 'app-absences-reglages-page',
    imports: [ReactiveFormsModule, TranslatePipe, Skeleton],
    template: `
        @if (chargement()) {
            <div class="panel"><app-skeleton [lignes]="5" /></div>
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
            <form class="panel grid gap-6" [formGroup]="form" (ngSubmit)="enregistrer()">
                @for (t of tuiles; track t.champ; let i = $index) {
                    <fieldset class="m-0 border-0 p-0">
                        <legend class="mb-0.5 font-bold text-black dark:text-white-light">
                            {{ 'reglages_absences.' + cle(t.champ) + '.titre' | translate }}
                        </legend>
                        <p class="m-0 mb-2 text-sm text-muted dark:text-night-muted">{{ 'reglages_absences.' + cle(t.champ) + '.aide' | translate }}</p>
                        <div class="grid gap-2 sm:grid-cols-2">
                            @for (o of t.options; track o) {
                                <label
                                    class="mb-0! flex min-h-11 cursor-pointer items-center rounded-md border border-white-light px-3 py-2 font-bold has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary dark:border-night-border"
                                >
                                    <input class="sr-only" type="radio" [formControlName]="t.champ" [value]="o" />
                                    {{ 'reglages_absences.' + cle(t.champ) + '.' + o | translate }}
                                </label>
                            }
                        </div>
                    </fieldset>
                    @if (i === 0) {
                        <div>
                            <label class="mb-0! font-bold text-black dark:text-white-light" for="delai">{{
                                'reglages_absences.delai.titre' | translate
                            }}</label>
                            <p class="m-0 mb-2 text-sm text-muted dark:text-night-muted">{{ 'reglages_absences.delai.aide' | translate }}</p>
                            <div class="flex items-center gap-2">
                                <input
                                    id="delai"
                                    class="form-input w-24"
                                    type="number"
                                    inputmode="numeric"
                                    min="0"
                                    max="30"
                                    formControlName="delaiCorrection"
                                />
                                <span>{{ 'reglages_absences.delai.jours' | translate }}</span>
                            </div>
                        </div>
                    }
                }
                <div class="flex justify-end">
                    <button type="submit" class="btn btn-primary" [disabled]="envoi() || form.pristine || form.invalid">
                        @if (envoi()) {
                            <span class="auth-spinner ltr:mr-2 rtl:ml-2" aria-hidden="true"></span>
                        }
                        {{ 'reglages_absences.enregistrer' | translate }}
                    </button>
                </div>
            </form>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbsencesReglagesPage implements OnInit {
    private readonly service = inject(ReglagesAbsencesService);
    protected readonly tuiles = TUILES;
    protected readonly chargement = signal(true);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);

    protected readonly form = inject(NonNullableFormBuilder).group({
        appelDemiJournee: [false],
        delaiCorrection: [7, [Validators.required, Validators.min(0), Validators.max(30)]],
        decideur: ['admin_titulaire' as ReglagesAbsences['decideur']],
        justificationParent: [true],
    });

    constructor() {
        inject(SignauxDaaraService).surveiller(['reglages_absences', 'daaras'], () => this.charger(this.form.dirty));
    }

    ngOnInit(): void {
        void this.charger();
    }

    /** Clé de traduction du réglage (l'appel est rangé sous `appel`). */
    protected cle(champ: string): string {
        return champ === 'appelDemiJournee' ? 'appel' : champ;
    }

    protected async enregistrer(): Promise<void> {
        this.envoi.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            const v = this.form.getRawValue();
            await this.service.enregistrer({ ...v, delaiCorrection: Math.round(Number(v.delaiCorrection)) });
            this.form.markAsPristine();
            this.succes.set('reglages_absences.enregistres');
        } catch (e) {
            this.erreur.set(e instanceof ErreurReglagesAbsences ? e.cle : 'reglages_absences.erreurs.inattendue');
        } finally {
            this.envoi.set(false);
        }
    }

    private async charger(garderSaisie = false): Promise<void> {
        try {
            const r = await this.service.charger();
            if (!garderSaisie) {
                this.form.reset(r);
            }
        } catch (e) {
            this.erreur.set(e instanceof ErreurReglagesAbsences ? e.cle : 'reglages_absences.erreurs.inattendue');
        } finally {
            this.chargement.set(false);
        }
    }
}
