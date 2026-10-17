import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { aujourdhui } from '../../../core/dates';
import { SignauxDaaraService } from '../../../core/daara/signaux-daara.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { ClasseNotes, ContexteNotes, ErreurEvaluation, EvaluationsService, PeriodeNotes, periodeParDefaut } from '../data/evaluations.service';
import { MoyennesService, TableauMoyennes } from '../data/moyennes.service';

/**
 * `/d/:slug/notes/moyennes?classe=&periode=` (S6.4) : élèves × matières et moyenne générale, calculées par la base selon
 * les réglages ; moyennes sous le seuil de réussite en rouge. Tableau au-delà de 640 px, cartes en dessous.
 */
@Component({
    selector: 'app-moyennes-page',
    imports: [RouterLink, TranslatePipe, EmptyState, PageHeader, Skeleton],
    template: `
        <a class="font-semibold text-primary hover:underline" routerLink=".." [queryParams]="{ classe: classe()?.id, periode: periode()?.id }"
            >← {{ 'notes.moyennes.retour' | translate }}</a
        >
        <app-page-header class="mt-3" [titre]="'notes.moyennes.titre' | translate" />
        @if (chargement()) {
            <div class="panel"><app-skeleton [lignes]="5" /></div>
        } @else if (erreur(); as erreur) {
            <div class="panel grid gap-4">
                <div
                    class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                    role="alert"
                >
                    {{ erreur | translate }}
                </div>
                <div>
                    <button type="button" class="btn btn-outline-primary" (click)="charger()">{{ 'membres.reessayer' | translate }}</button>
                </div>
            </div>
        } @else if (ctx().classes.length === 0 || ctx().periodes.length === 0) {
            <div class="panel">
                <app-empty-state [titre]="'notes.moyennes.vide_titre' | translate" [message]="'notes.moyennes.vide_classes' | translate" />
            </div>
        } @else {
            <div class="panel mb-4 grid gap-3 sm:grid-cols-2">
                <label class="mb-0! grid gap-1 font-semibold">
                    {{ 'notes.classe' | translate }}
                    <select class="form-select min-h-11 font-normal" (change)="choisir({ classe: $any($event.target).value })">
                        @for (c of ctx().classes; track c.id) {
                            <option [value]="c.id" [selected]="c.id === classe()?.id">{{ c.nom }}</option>
                        }
                    </select>
                </label>
                <label class="mb-0! grid gap-1 font-semibold">
                    {{ 'notes.periode' | translate }}
                    <select class="form-select min-h-11 font-normal" (change)="choisir({ periode: $any($event.target).value })">
                        @for (p of ctx().periodes; track p.id) {
                            <option [value]="p.id" [selected]="p.id === periode()?.id">{{ p.libelle }}</option>
                        }
                    </select>
                </label>
            </div>
            @if (calcul()) {
                <div class="panel"><app-skeleton [lignes]="5" /></div>
            } @else if (tableau(); as t) {
                @if (t.eleves.length === 0) {
                    <div class="panel">
                        <app-empty-state [titre]="'notes.saisie.vide_titre' | translate" [message]="'notes.saisie.vide' | translate" />
                    </div>
                } @else {
                    <p class="mb-3 text-sm text-muted dark:text-night-muted">
                        {{ 'notes.moyennes.legende' | translate: { bareme: nombre(t.bareme), seuil: nombre(t.seuil) } }}
                    </p>
                    <!-- Au-delà de 640 px : tableau élèves × matières. -->
                    <div class="panel hidden overflow-x-auto p-0! sm:block">
                        <table class="w-full text-left">
                            <thead>
                                <tr class="border-b border-white-light dark:border-night-border">
                                    <th scope="col" class="sticky left-0 bg-inherit p-3">{{ 'notes.moyennes.eleve' | translate }}</th>
                                    @for (m of t.matieres; track m.id) {
                                        <th scope="col" class="p-3 text-center whitespace-nowrap">
                                            {{ m.nom }}
                                            <span class="block text-xs font-normal text-muted dark:text-night-muted">{{
                                                'notes.moyennes.coef' | translate: { coef: nombre(m.coefficient) }
                                            }}</span>
                                        </th>
                                    }
                                    <th scope="col" class="p-3 text-center">{{ 'notes.moyennes.generale' | translate }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (e of t.eleves; track e.apprenantId) {
                                    <tr class="border-b border-white-light last:border-0 dark:border-night-border">
                                        <th scope="row" class="sticky left-0 bg-white p-3 font-semibold whitespace-nowrap dark:bg-night">
                                            {{ e.nom }} {{ e.prenom }}
                                        </th>
                                        @for (m of t.matieres; track m.id) {
                                            <td class="p-3 text-center" [class]="couleur(e.matieres[m.id], t.seuil)">{{ valeur(e.matieres[m.id]) }}</td>
                                        }
                                        <td class="p-3 text-center font-bold" [class]="couleur(e.generale, t.seuil)">{{ valeur(e.generale) }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                    <!-- Mobile : une carte par élève. -->
                    <ul class="m-0 grid list-none gap-3 p-0 sm:hidden">
                        @for (e of t.eleves; track e.apprenantId) {
                            <li class="panel">
                                <p class="m-0 mb-2 flex items-center justify-between gap-2 font-semibold text-black dark:text-white-light">
                                    {{ e.nom }} {{ e.prenom }}
                                    <span class="text-lg font-bold" [class]="couleur(e.generale, t.seuil)">{{ valeur(e.generale) }}</span>
                                </p>
                                <dl class="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
                                    @for (m of t.matieres; track m.id) {
                                        <dt class="text-muted dark:text-night-muted">{{ m.nom }}</dt>
                                        <dd class="m-0 text-right" [class]="couleur(e.matieres[m.id], t.seuil)">{{ valeur(e.matieres[m.id]) }}</dd>
                                    }
                                </dl>
                            </li>
                        }
                    </ul>
                }
            }
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoyennesPage implements OnInit {
    private readonly evaluations = inject(EvaluationsService);
    private readonly service = inject(MoyennesService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly langue = inject(LanguageService).langue;

    protected readonly ctx = signal<ContexteNotes>({ classes: [], periodes: [], types: [], bareme: 20 });
    protected readonly tableau = signal<TableauMoyennes | null>(null);
    protected readonly chargement = signal(true);
    protected readonly calcul = signal(false);
    protected readonly erreur = signal<string | null>(null);
    private readonly choix = signal<{ classe: string | null; periode: string | null }>({
        classe: this.route.snapshot.queryParamMap.get('classe'),
        periode: this.route.snapshot.queryParamMap.get('periode'),
    });
    protected readonly classe = computed<ClasseNotes | null>(
        () => this.ctx().classes.find((c) => c.id === this.choix().classe) ?? this.ctx().classes[0] ?? null,
    );
    protected readonly periode = computed<PeriodeNotes | null>(
        () => this.ctx().periodes.find((p) => p.id === this.choix().periode) ?? periodeParDefaut(this.ctx().periodes, aujourdhui()),
    );

    constructor() {
        // Notes saisies, évaluations ou réglages modifiés : moyennes recalculées (S5.0b, ADR-012).
        inject(SignauxDaaraService).surveiller(['notes', 'evaluations', 'reglages_notes', 'classe_matieres', 'inscriptions', 'daaras', 'absences'], () =>
            this.calculer(true),
        );
    }

    ngOnInit(): void {
        void this.charger();
    }

    protected async charger(): Promise<void> {
        this.chargement.set(true);
        this.erreur.set(null);
        try {
            this.ctx.set(await this.evaluations.contexte());
        } catch (e) {
            this.erreur.set(e instanceof ErreurEvaluation ? e.cle : 'notes.erreurs.chargement');
        } finally {
            this.chargement.set(false);
        }
        await this.calculer();
    }

    protected choisir(c: { classe?: string; periode?: string }): void {
        this.choix.update((x) => ({ ...x, ...c }));
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { classe: this.classe()?.id, periode: this.periode()?.id },
            replaceUrl: true,
        });
        void this.calculer();
    }

    protected nombre(n: number): string {
        return n.toLocaleString(this.langue() === 'en' ? 'en-GB' : 'fr-FR');
    }

    protected valeur(n: number | null | undefined): string {
        return n === null || n === undefined ? '—' : this.nombre(n);
    }

    /** Sous le seuil de réussite : rouge. */
    protected couleur(n: number | null | undefined, seuil: number): string {
        return n !== null && n !== undefined && n < seuil ? 'text-danger-strong dark:text-danger-soft' : '';
    }

    private async calculer(silencieux = false): Promise<void> {
        const [classe, periode] = [this.classe(), this.periode()];
        if (!classe || !periode) {
            return;
        }
        if (!silencieux) {
            this.calcul.set(true);
        }
        try {
            this.tableau.set(await this.service.calculer(classe.id, periode.id));
        } catch (e) {
            this.erreur.set(e instanceof ErreurEvaluation ? e.cle : 'notes.erreurs.chargement');
        } finally {
            this.calcul.set(false);
        }
    }
}
