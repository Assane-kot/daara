import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SignauxDaaraService } from '../../../core/daara/signaux-daara.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { Badge } from '../../../shared/ui/badge/badge';
import { CarteTable, CelluleTable, ColonneTable, DataTable, PageTable, RequeteTable } from '../../../shared/ui/data-table/data-table';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { AppelService, ClasseAppel, aujourdhui, creneauParDefaut } from '../../appel/data/appel.service';
import { decalerDate } from '../../appel/pages/appel-classes-page';
import { dateAbsence, varianteEtat } from '../components/historique-absences';
import { Absence, AbsencesService, ErreurAbsences, FiltresAbsences, Statistiques } from '../data/absences.service';

type Periode = 'semaine' | 'mois' | 'annee';

/**
 * `/d/:slug/absences` (S5.2, admin ; enseignant : ses classes) : appels à faire aujourd'hui, justifications à décider,
 * liste filtrée (période, classe, état), décision en un toucher (admin ou titulaire), statistiques simples.
 */
@Component({
    selector: 'app-absences-page',
    imports: [NgTemplateOutlet, RouterLink, TranslatePipe, Badge, PageHeader, DataTable, CelluleTable, CarteTable],
    template: `
        <app-page-header [titre]="'absences.titre' | translate" />

        @if (aFaire().length > 0) {
            <div class="panel mb-4" role="status">
                <p class="m-0 mb-2 font-bold text-warning-strong dark:text-warning">{{ 'absences.appels_a_faire' | translate: { n: aFaire().length } }}</p>
                <div class="flex flex-wrap gap-2">
                    @for (c of aFaire(); track c.id) {
                        <a
                            class="btn btn-sm btn-outline-primary min-h-11"
                            [routerLink]="['../appel', c.id]"
                            [queryParams]="{ date: aujourdhui, creneau: creneau }"
                            >{{ c.nom }}</a
                        >
                    }
                </div>
            </div>
        }

        <div class="panel mb-4">
            @if (erreur(); as erreur) {
                <div
                    class="mb-3 rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                    role="alert"
                >
                    {{ erreur | translate }}
                </div>
            }
            @if (succes(); as succes) {
                <div class="mb-3 rounded-md border border-primary/30 bg-primary/10 p-3.5 text-black dark:text-white-light" role="status">
                    {{ succes | translate }}
                </div>
            }
            <app-data-table [colonnes]="colonnes" [chargeur]="chargeur" titreVide="absences.vide_titre" messageVide="absences.vide_message">
                <div filtres class="contents">
                    <label class="mb-0!">
                        <span class="sr-only">{{ 'absences.filtres.periode' | translate }}</span>
                        <select class="form-select" (change)="choisirPeriode($any($event.target).value)">
                            @for (p of periodes; track p) {
                                <option [value]="p" [selected]="p === periode()">{{ 'absences.periodes.' + p | translate }}</option>
                            }
                        </select>
                    </label>
                    @if (classes().length > 1) {
                        <label class="mb-0!">
                            <span class="sr-only">{{ 'absences.filtres.classe' | translate }}</span>
                            <select class="form-select" (change)="choisirClasse($any($event.target).value)">
                                <option value="" [selected]="!classeId()">{{ 'absences.filtres.toutes_classes' | translate }}</option>
                                @for (c of classes(); track c.id) {
                                    <option [value]="c.id" [selected]="c.id === classeId()">{{ c.nom }}</option>
                                }
                            </select>
                        </label>
                    }
                    <label class="mb-0!">
                        <span class="sr-only">{{ 'absences.filtres.etat' | translate }}</span>
                        <select class="form-select" (change)="choisirEtat($any($event.target).value)">
                            @for (e of etats; track e) {
                                <option [value]="e" [selected]="e === etat()">{{ 'absences.filtres.etats.' + (e || 'tous') | translate }}</option>
                            }
                        </select>
                    </label>
                </div>
                <ng-template appCellule="date" let-a
                    >{{ date(a.date) }}{{ a.creneau !== 'journee' ? ' · ' + ('appel.creneaux.' + a.creneau | translate) : '' }}</ng-template
                >
                <ng-template appCellule="eleve" let-a>
                    @if (a.eleve) {
                        <a class="font-semibold text-primary hover:underline" [routerLink]="['../apprenants', a.apprenantId]">{{ a.eleve }}</a>
                    } @else {
                        —
                    }
                </ng-template>
                <ng-template appCellule="type" let-a>
                    <app-badge [variante]="a.type === 'absence' ? 'danger' : 'warning'">{{ 'appel.presences.' + a.type | translate }}</app-badge>
                </ng-template>
                <ng-template appCellule="etat" let-a>
                    <app-badge [variante]="variante(a)">{{ 'absences.etats.' + a.etat | translate }}</app-badge>
                    @if (a.motif) {
                        <p class="m-0 mt-1 max-w-64 truncate text-xs text-muted dark:text-night-muted" [title]="a.motif">« {{ a.motif }} »</p>
                    }
                </ng-template>
                <ng-template appCellule="actions" let-a>
                    <ng-container *ngTemplateOutlet="actions; context: { $implicit: a }" />
                </ng-template>
                <ng-template appCarte let-a>
                    <p class="m-0 font-semibold text-black dark:text-white-light">{{ a.eleve || '—' }} · {{ a.classe }}</p>
                    <p class="m-0 text-sm text-muted dark:text-night-muted">{{ date(a.date) }}</p>
                    <div class="mt-1 flex flex-wrap gap-1.5">
                        <app-badge [variante]="a.type === 'absence' ? 'danger' : 'warning'">{{ 'appel.presences.' + a.type | translate }}</app-badge>
                        <app-badge [variante]="variante(a)">{{ 'absences.etats.' + a.etat | translate }}</app-badge>
                    </div>
                    @if (a.motif) {
                        <p class="m-0 mt-1 text-sm text-muted dark:text-night-muted">« {{ a.motif }} »</p>
                    }
                    <div class="mt-2"><ng-container *ngTemplateOutlet="actions; context: { $implicit: a }" /></div>
                </ng-template>
            </app-data-table>
            <ng-template #actions let-a>
                @if (a.peutDecider) {
                    <div class="flex flex-wrap gap-2 ltr:justify-end rtl:justify-start">
                        @if (a.etat !== 'justifiee') {
                            <button type="button" class="btn btn-sm btn-outline-success min-h-11" [disabled]="enCours()" (click)="decider(a, true)">
                                {{ 'absences.decider.justifiee' | translate }}
                            </button>
                        }
                        @if (a.etat !== 'non_justifiee') {
                            <button type="button" class="btn btn-sm btn-outline-danger min-h-11" [disabled]="enCours()" (click)="decider(a, false)">
                                {{ 'absences.decider.non_justifiee' | translate }}
                            </button>
                        }
                    </div>
                }
            </ng-template>
        </div>

        @if (stats(); as s) {
            @if (s.classes.length > 0) {
                <div class="panel">
                    <h2 class="m-0 mb-3 text-base font-bold dark:text-white-light">
                        {{ 'absences.stats.titre' | translate: { periode: ('absences.periodes.' + periode() | translate) } }}
                    </h2>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr>
                                    <th>{{ 'absences.stats.classe' | translate }}</th>
                                    <th>{{ 'absences.stats.appels' | translate }}</th>
                                    <th>{{ 'absences.stats.absences' | translate }}</th>
                                    <th>{{ 'absences.stats.retards' | translate }}</th>
                                    <th>{{ 'absences.stats.non_justifiees' | translate }}</th>
                                    <th>{{ 'absences.stats.taux' | translate }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (c of s.classes; track c.classe_id) {
                                    <tr>
                                        <td class="font-semibold">{{ c.nom }}</td>
                                        <td>{{ c.appels }}</td>
                                        <td>{{ c.absences }}</td>
                                        <td>{{ c.retards }}</td>
                                        <td>{{ c.non_justifiees }}</td>
                                        <td>{{ c.taux }} %</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                    @if (s.eleves.length > 0) {
                        <h3 class="m-0 mt-4 mb-2 text-sm font-bold dark:text-white-light">{{ 'absences.stats.plus_absents' | translate }}</h3>
                        <ol class="m-0 grid gap-1 ltr:pl-5 rtl:pr-5">
                            @for (e of s.eleves; track e.apprenantId) {
                                <li>
                                    <span class="font-semibold">{{ e.nom || '—' }}</span> ·
                                    {{ 'appel.resume' | translate: { absents: e.absences, retards: e.retards } }}
                                </li>
                            }
                        </ol>
                    }
                </div>
            }
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbsencesPage {
    private readonly service = inject(AbsencesService);
    private readonly appels = inject(AppelService);
    private readonly courante = inject(CurrentDaaraService);
    private readonly langue = inject(LanguageService).langue;
    private readonly table = viewChild(DataTable);

    protected readonly aujourdhui = aujourdhui();
    protected readonly creneau = creneauParDefaut(this.courante.daara()?.appelDemiJournee ?? false);
    protected readonly periodes: readonly Periode[] = ['semaine', 'mois', 'annee'];
    protected readonly etats: readonly FiltresAbsences['etat'][] = ['', 'a_decider', 'aucune', 'justifiee', 'non_justifiee'];
    protected readonly periode = signal<Periode>('semaine');
    protected readonly classeId = signal('');
    protected readonly etat = signal<FiltresAbsences['etat']>('');
    protected readonly classes = signal<ClasseAppel[]>([]);
    protected readonly aFaire = computed(() => this.classes().filter((c) => !c.appel?.termine));
    protected readonly stats = signal<Statistiques | null>(null);
    protected readonly enCours = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);
    protected readonly colonnes: readonly ColonneTable[] = [
        { cle: 'date', libelle: 'absences.colonnes.date', triable: true },
        { cle: 'eleve', libelle: 'absences.colonnes.eleve' },
        { cle: 'classe', libelle: 'absences.colonnes.classe' },
        { cle: 'type', libelle: 'absences.colonnes.type' },
        { cle: 'etat', libelle: 'absences.colonnes.etat' },
        { cle: 'actions', libelle: 'membres.colonnes.actions', libelleMasque: true, classe: 'ltr:text-right rtl:text-left' },
    ];
    protected readonly chargeur = (r: RequeteTable): Promise<PageTable<Absence>> => this.service.page(r, this.filtres());

    constructor() {
        inject(SignauxDaaraService).surveiller(['absences', 'appels'], () => this.toutRecharger());
        void this.chargerClasses();
        void this.chargerStats();
    }

    protected date(iso: string): string {
        return dateAbsence(iso, this.langue());
    }

    protected variante(a: Absence): ReturnType<typeof varianteEtat> {
        return varianteEtat(a.etat);
    }

    protected choisirPeriode(p: Periode): void {
        this.periode.set(p);
        void this.table()?.recharger(true);
        void this.chargerStats();
    }

    protected choisirClasse(id: string): void {
        this.classeId.set(id);
        void this.table()?.recharger(true);
        void this.chargerStats();
    }

    protected choisirEtat(e: FiltresAbsences['etat']): void {
        this.etat.set(e);
        void this.table()?.recharger(true);
    }

    protected async decider(a: Absence, justifiee: boolean): Promise<void> {
        this.enCours.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await this.service.decider(a.id, justifiee);
            this.succes.set(justifiee ? 'absences.decider.ok_justifiee' : 'absences.decider.ok_non_justifiee');
            await this.table()?.recharger();
        } catch (e) {
            this.erreur.set(e instanceof ErreurAbsences ? e.cle : 'absences.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }

    private filtres(): FiltresAbsences {
        const jours = this.periode() === 'semaine' ? 6 : this.periode() === 'mois' ? 29 : 400;
        return { debut: decalerDate(this.aujourdhui, -jours), fin: this.aujourdhui, classeId: this.classeId(), etat: this.etat() };
    }

    private toutRecharger(): void {
        void this.table()?.recharger();
        void this.chargerClasses();
        void this.chargerStats();
    }

    private async chargerClasses(): Promise<void> {
        try {
            this.classes.set(await this.appels.classes(this.aujourdhui, this.creneau));
        } catch {
            this.classes.set([]);
        }
    }

    private async chargerStats(): Promise<void> {
        const f = this.filtres();
        try {
            this.stats.set(await this.service.statistiques(f.debut, f.fin, f.classeId));
        } catch {
            this.stats.set(null);
        }
    }
}
