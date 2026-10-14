import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SignauxDaaraService } from '../../../core/daara/signaux-daara.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { Badge, BadgeVariante } from '../../../shared/ui/badge/badge';
import { Absence, AbsencesService, ErreurAbsences, EtatJustification } from '../data/absences.service';
import { JustifierDialogService } from './justifier-dialog';

const VARIANTES: Readonly<Record<EtatJustification, BadgeVariante>> = {
    aucune: 'warning',
    envoyee: 'info',
    justifiee: 'success',
    non_justifiee: 'danger',
};

/** Variante du badge d'état d'une justification. */
export function varianteEtat(etat: EtatJustification): BadgeVariante {
    return VARIANTES[etat];
}

/** « mer. 14 oct. 2026 » (+ « matin » / « après-midi »). */
export function dateAbsence(iso: string, langue: string): string {
    return new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(`${iso}T12:00:00Z`));
}

/**
 * Absences d'un élève (S5.2) : date, absent / en retard, état de la justification, motif. Parent : « Justifier » (ou
 * corriger le motif) tant que ce n'est pas décidé ; équipe : « Justifiée » / « Non justifiée » si l'utilisateur est admin
 * ou titulaire de la classe. Mise à jour automatique (S5.0b).
 */
@Component({
    selector: 'app-historique-absences',
    imports: [TranslatePipe, Badge],
    template: `
        <section [attr.aria-label]="'absences.historique' | translate">
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
            @if (chargement()) {
                <p class="m-0 text-muted dark:text-night-muted">{{ 'commun.chargement' | translate }}</p>
            } @else if (absences().length === 0) {
                <p class="m-0 text-muted dark:text-night-muted">{{ 'absences.aucune' | translate: { prenom: prenom() } }}</p>
            } @else {
                <ul class="m-0 grid list-none gap-2 p-0">
                    @for (a of absences(); track a.id) {
                        <li class="flex flex-wrap items-center gap-3 rounded-md border border-white-light p-3 dark:border-night-border">
                            <div class="min-w-0 flex-1 basis-56">
                                <p class="m-0 flex flex-wrap items-center gap-2 font-semibold text-black dark:text-white-light">
                                    {{ date(a.date) }}{{ a.creneau !== 'journee' ? ' · ' + ('appel.creneaux.' + a.creneau | translate) : '' }}
                                    <app-badge [variante]="a.type === 'absence' ? 'danger' : 'warning'">{{
                                        'appel.presences.' + a.type | translate
                                    }}</app-badge>
                                    <app-badge [variante]="variante(a.etat)">{{ 'absences.etats.' + a.etat | translate }}</app-badge>
                                </p>
                                @if (a.motif) {
                                    <p class="m-0 mt-1 text-sm text-muted dark:text-night-muted">« {{ a.motif }} »</p>
                                }
                            </div>
                            @if (mode() === 'parent' && (a.etat === 'aucune' || a.etat === 'envoyee')) {
                                <button type="button" class="btn btn-sm btn-primary min-h-11" [disabled]="enCours()" (click)="justifier(a)">
                                    {{ (a.etat === 'aucune' ? 'absences.justifier.bouton' : 'absences.justifier.modifier') | translate }}
                                </button>
                            }
                            @if (mode() === 'equipe' && a.peutDecider) {
                                <div class="flex flex-wrap gap-2">
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
                        </li>
                    }
                </ul>
            }
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoriqueAbsences implements OnInit {
    readonly apprenantId = input.required<string>();
    readonly prenom = input.required<string>();
    readonly mode = input<'parent' | 'equipe'>('equipe');

    private readonly service = inject(AbsencesService);
    private readonly dialogue = inject(JustifierDialogService);
    private readonly translate = inject(TranslateService);
    private readonly langue = inject(LanguageService).langue;

    protected readonly absences = signal<Absence[]>([]);
    protected readonly chargement = signal(true);
    protected readonly enCours = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);
    protected readonly variante = varianteEtat;

    constructor() {
        inject(SignauxDaaraService).surveiller(['absences', 'appels'], () => this.charger());
    }

    ngOnInit(): void {
        void this.charger();
    }

    protected date(iso: string): string {
        return dateAbsence(iso, this.langue());
    }

    protected async justifier(a: Absence): Promise<void> {
        this.succes.set(null);
        const titre = this.translate.instant(a.type === 'absence' ? 'absences.justifier.titre_absence' : 'absences.justifier.titre_retard', {
            prenom: this.prenom(),
            date: this.date(a.date),
        });
        if (await this.dialogue.ouvrir({ titre, motif: a.motif, envoyer: (motif) => this.service.justifier(a.id, motif) })) {
            this.succes.set('absences.justifier.envoye');
            await this.charger();
        }
    }

    protected async decider(a: Absence, justifiee: boolean): Promise<void> {
        this.enCours.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await this.service.decider(a.id, justifiee);
            this.succes.set(justifiee ? 'absences.decider.ok_justifiee' : 'absences.decider.ok_non_justifiee');
            await this.charger();
        } catch (e) {
            this.erreur.set(e instanceof ErreurAbsences ? e.cle : 'absences.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }

    private async charger(): Promise<void> {
        try {
            this.absences.set(await this.service.historique(this.apprenantId()));
        } catch (e) {
            this.erreur.set(e instanceof ErreurAbsences ? e.cle : 'absences.erreurs.inattendue');
        } finally {
            this.chargement.set(false);
        }
    }
}
