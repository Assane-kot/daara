import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SignauxDaaraService } from '../../../core/daara/signaux-daara.service';
import { Badge } from '../../../shared/ui/badge/badge';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { AppelService, ClasseAppel, Creneau, ErreurAppel, aujourdhui, creneauParDefaut } from '../data/appel.service';

/** Décale une date AAAA-MM-JJ de `jours` jours. */
export function decalerDate(iso: string, jours: number): string {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + jours);
    return d.toISOString().slice(0, 10);
}

/**
 * `/d/:slug/appel` (S5.1, enseignant et admin, module `absences`) : classes du jour (les siennes ; toutes pour l'admin)
 * avec l'état de leur appel ; date (aujourd'hui par défaut ; 7 jours en arrière pour l'enseignant) et créneau si la
 * daara fait l'appel matin et après-midi.
 */
@Component({
    selector: 'app-appel-classes-page',
    imports: [RouterLink, TranslatePipe, Badge, EmptyState, PageHeader, Skeleton],
    template: `
        <app-page-header [titre]="'appel.titre' | translate" />
        <div class="panel mb-4 flex flex-wrap items-end gap-3">
            <label class="mb-0! grid gap-1 font-semibold">
                {{ 'appel.date' | translate }}
                <input
                    class="form-input min-h-11 font-normal"
                    type="date"
                    [value]="date()"
                    [min]="dateMin()"
                    [max]="aujourdhui"
                    (change)="choisirDate($any($event.target).value)"
                />
            </label>
            @if (date() !== aujourdhui) {
                <button type="button" class="btn btn-outline-primary min-h-11" (click)="choisirDate(aujourdhui)">{{ 'appel.aujourdhui' | translate }}</button>
            }
            @if (demiJournee()) {
                <div class="grid grid-cols-2 gap-2" role="radiogroup" [attr.aria-label]="'appel.creneau' | translate">
                    @for (c of creneaux; track c) {
                        <label
                            class="mb-0! flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-white-light px-4 font-bold has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary dark:border-night-border"
                        >
                            <input class="sr-only" type="radio" name="creneau" [checked]="creneau() === c" (change)="choisirCreneau(c)" />
                            {{ 'appel.creneaux.' + c | translate }}
                        </label>
                    }
                </div>
            }
        </div>

        @if (fait(); as classe) {
            <div class="mb-4 rounded-md border border-primary/30 bg-primary/10 p-3.5 text-black dark:text-white-light" role="status">
                {{ 'appel.fait_ok' | translate: { classe } }}
            </div>
        }
        @if (chargement()) {
            <div class="panel"><app-skeleton [lignes]="4" /></div>
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
        } @else if (classes().length === 0) {
            <div class="panel">
                <app-empty-state [titre]="'appel.vide_titre' | translate" [message]="(admin() ? 'appel.vide_admin' : 'appel.vide_enseignant') | translate">
                    @if (admin()) {
                        <a class="btn btn-primary" routerLink="../structure/classes">{{ 'appel.voir_classes' | translate }}</a>
                    }
                </app-empty-state>
            </div>
        } @else {
            <ul class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
                @for (c of classes(); track c.id) {
                    <li>
                        <a
                            class="panel flex min-h-20 items-center justify-between gap-3 transition hover:ring-2 hover:ring-primary/40"
                            [routerLink]="[c.id]"
                            [queryParams]="{ date: date(), creneau: creneau() }"
                        >
                            <span class="min-w-0">
                                <span class="block truncate text-lg font-bold text-black dark:text-white-light">{{ c.nom }}</span>
                                @if (c.appel; as a) {
                                    <span class="block text-sm text-muted dark:text-night-muted">{{
                                        'appel.resume' | translate: { absents: a.absents, retards: a.retards }
                                    }}</span>
                                }
                            </span>
                            @if (!c.appel) {
                                <app-badge variante="warning">{{ 'appel.etats.a_faire' | translate }}</app-badge>
                            } @else if (c.appel.termine) {
                                <app-badge variante="success">{{ 'appel.etats.fait' | translate }}</app-badge>
                            } @else {
                                <app-badge variante="info">{{ 'appel.etats.en_cours' | translate }}</app-badge>
                            }
                        </a>
                    </li>
                }
            </ul>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppelClassesPage {
    private readonly service = inject(AppelService);
    private readonly courante = inject(CurrentDaaraService);

    protected readonly aujourdhui = aujourdhui();
    protected readonly creneaux: readonly Creneau[] = ['matin', 'apres_midi'];
    protected readonly admin = computed(() => this.courante.roles().includes('admin'));
    protected readonly demiJournee = computed(() => this.courante.daara()?.appelDemiJournee ?? false);
    /** L'enseignant remonte 7 jours au plus (la base le revérifie) ; l'admin, toute l'année active. */
    protected readonly dateMin = computed(() => (this.admin() ? null : decalerDate(this.aujourdhui, -7)));
    protected readonly date = signal(this.aujourdhui);
    protected readonly creneau = signal<Creneau>(creneauParDefaut(this.courante.daara()?.appelDemiJournee ?? false));
    protected readonly classes = signal<ClasseAppel[]>([]);
    protected readonly chargement = signal(true);
    protected readonly erreur = signal<string | null>(null);
    /** Classe dont l'appel vient d'être terminé (retour de la feuille d'appel). */
    protected readonly fait = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('fait'));

    constructor() {
        // Mise à jour automatique : appels faits par les collègues, classes modifiées (S5.0b).
        inject(SignauxDaaraService).surveiller(['appels', 'absences', 'classes', 'classe_matieres'], () => this.charger(true));
        void this.charger();
    }

    protected choisirDate(date: string): void {
        if (date) {
            this.date.set(date);
            void this.charger();
        }
    }

    protected choisirCreneau(creneau: Creneau): void {
        this.creneau.set(creneau);
        void this.charger();
    }

    protected async charger(silencieux = false): Promise<void> {
        this.chargement.set(!silencieux);
        this.erreur.set(null);
        // Réglage changé entre-temps : un appel par jour ↔ matin et après-midi.
        if (!this.demiJournee() && this.creneau() !== 'journee') {
            this.creneau.set('journee');
        } else if (this.demiJournee() && this.creneau() === 'journee') {
            this.creneau.set(creneauParDefaut(true));
        }
        try {
            this.classes.set(await this.service.classes(this.date(), this.creneau()));
        } catch (e) {
            this.erreur.set(e instanceof ErreurAppel ? e.cle : 'appel.erreurs.inattendue');
        } finally {
            this.chargement.set(false);
        }
    }
}
