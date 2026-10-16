import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { aujourdhui } from '../../core/dates';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { SignauxDaaraService } from '../../core/daara/signaux-daara.service';
import { LanguageService } from '../../core/i18n/language.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { JustifierDialogService } from '../absences/components/justifier-dialog';
import { dateAbsence } from '../absences/components/historique-absences';
import { Absence, AbsencesService } from '../absences/data/absences.service';
import { decalerDate } from '../appel/pages/appel-classes-page';
import { ApprenantsService } from '../apprenants/data/apprenants.service';
import { MonEnfant, ParentsService } from '../apprenants/data/parents.service';
import { Situation, situationDuJour } from './situation';

interface CarteEnfant extends MonEnfant {
    readonly photoUrl: string | null;
    readonly situation: Situation | null;
    /** Absences sans justification (30 derniers jours), les plus récentes d'abord. */
    readonly aJustifier: readonly Absence[];
}

/** Absences récentes considérées sur l'accueil. */
const JOURS = 30;

/**
 * Accueil du parent (S4.3, enrichi en S5.4) : une carte par enfant avec sa situation du jour (présent, absent ce matin,
 * en retard, appel pas encore fait), ses absences à justifier (« Justifier » en deux touchers) et l'accès à son détail.
 * Mise à jour automatique (appel terminé, décision de la daara…).
 */
@Component({
    selector: 'app-mes-enfants-page',
    imports: [RouterLink, TranslatePipe, EmptyState, PageHeader, Skeleton],
    template: `
        <app-page-header [titre]="'enfants.titre' | translate" />
        @if (succes(); as succes) {
            <div class="mb-4 rounded-md border border-primary/30 bg-primary/10 p-3.5 text-black dark:text-white-light" role="status">
                {{ succes | translate }}
            </div>
        }
        @if (chargement()) {
            <div class="panel"><app-skeleton [lignes]="3" /></div>
        } @else if (erreur()) {
            <div class="panel grid gap-4">
                <div
                    class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                    role="alert"
                >
                    {{ 'enfants.erreur' | translate }}
                </div>
                <div>
                    <button type="button" class="btn btn-outline-primary" (click)="charger()">{{ 'membres.reessayer' | translate }}</button>
                </div>
            </div>
        } @else if (enfants().length === 0) {
            <div class="panel"><app-empty-state [titre]="'enfants.vide_titre' | translate" [message]="'enfants.vide_message' | translate" /></div>
        } @else {
            <ul class="m-0 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
                @for (e of enfants(); track e.id) {
                    <li class="panel grid content-start gap-3">
                        <a class="flex items-center gap-4" [routerLink]="[e.id]">
                            <div
                                class="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-xl font-extrabold text-primary uppercase"
                            >
                                @if (e.photoUrl) {
                                    <img [src]="e.photoUrl" [alt]="'apprenants.photo_de' | translate: { nom: e.prenom }" class="h-full w-full object-cover" />
                                } @else {
                                    {{ e.prenom[0] }}{{ e.nom[0] }}
                                }
                            </div>
                            <div class="min-w-0">
                                <p class="m-0 truncate text-lg font-bold text-black dark:text-white-light">{{ e.prenom }} {{ e.nom }}</p>
                                <p class="m-0 text-muted dark:text-night-muted">{{ e.classe ?? ('enfants.sans_classe' | translate) }}</p>
                            </div>
                        </a>

                        @if (absencesActives() && e.situation; as s) {
                            @if (s.code !== 'sans_classe') {
                                <p class="m-0 rounded-md px-3 py-2.5 font-bold" [class]="classesSituation(s.code)" role="status">{{ texteSituation(e, s) }}</p>
                            }
                        }

                        @if (e.aJustifier.length > 0) {
                            <div class="grid gap-2">
                                <p class="m-0 text-sm font-semibold">{{ 'enfants.a_justifier' | translate: { n: e.aJustifier.length } }}</p>
                                @for (a of e.aJustifier.slice(0, 3); track a.id) {
                                    <div
                                        class="flex items-center justify-between gap-2 rounded-md border border-white-light px-3 py-2 dark:border-night-border"
                                    >
                                        <span class="text-sm"
                                            >{{ date(a.date) }}{{ a.creneau !== 'journee' ? ' · ' + ('appel.creneaux.' + a.creneau | translate) : '' }} ·
                                            {{ 'appel.presences.' + a.type | translate }}</span
                                        >
                                        <button type="button" class="btn btn-sm btn-primary min-h-11 shrink-0" (click)="justifier(e, a)">
                                            {{ 'absences.justifier.bouton' | translate }}
                                        </button>
                                    </div>
                                }
                            </div>
                        }

                        <a class="text-sm font-semibold text-primary hover:underline" [routerLink]="[e.id]"
                            >{{ 'enfants.voir_detail' | translate: { prenom: e.prenom } }} →</a
                        >
                    </li>
                }
            </ul>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MesEnfantsPage implements OnInit {
    private readonly parents = inject(ParentsService);
    private readonly apprenants = inject(ApprenantsService);
    private readonly absences = inject(AbsencesService);
    private readonly dialogue = inject(JustifierDialogService);
    private readonly translate = inject(TranslateService);
    private readonly langue = inject(LanguageService).langue;
    private readonly courante = inject(CurrentDaaraService);

    protected readonly absencesActives = computed(() => this.courante.moduleActif('absences'));
    protected readonly enfants = signal<CarteEnfant[]>([]);
    protected readonly chargement = signal(true);
    protected readonly erreur = signal(false);
    protected readonly succes = signal<string | null>(null);

    constructor() {
        // Mise à jour automatique : appel terminé, absence corrigée, décision de la daara, enfant relié (S5.0b).
        inject(SignauxDaaraService).surveiller(['parent_links', 'apprenants', 'inscriptions', 'classes', 'appels', 'absences'], () => this.charger(true));
    }

    ngOnInit(): void {
        void this.charger();
    }

    protected date(iso: string): string {
        return dateAbsence(iso, this.langue());
    }

    protected classesSituation(code: Situation['code']): string {
        return code === 'present'
            ? 'bg-success-light text-success-strong dark:bg-success-dark-light dark:text-success'
            : code === 'absence'
              ? 'bg-danger-light text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft'
              : code === 'retard'
                ? 'bg-warning-light text-warning-strong dark:bg-warning-dark-light dark:text-warning'
                : 'bg-white-light/60 text-muted dark:bg-night-border dark:text-night-muted';
    }

    protected texteSituation(e: CarteEnfant, s: Situation): string {
        const quand = this.translate.instant('notifications.quand.' + (s.creneau ?? 'journee'));
        return this.translate.instant('enfants.situation.' + s.code, { prenom: e.prenom, quand, e: e.sexe === 'F' ? 'e' : '' });
    }

    protected async justifier(e: CarteEnfant, a: Absence): Promise<void> {
        this.succes.set(null);
        const titre = this.translate.instant(a.type === 'absence' ? 'absences.justifier.titre_absence' : 'absences.justifier.titre_retard', {
            prenom: e.prenom,
            date: this.date(a.date),
        });
        if (await this.dialogue.ouvrir({ titre, motif: a.motif, envoyer: (motif) => this.absences.justifier(a.id, motif) })) {
            this.succes.set('absences.justifier.envoye');
            await this.charger(true);
        }
    }

    protected async charger(silencieux = false): Promise<void> {
        this.chargement.set(!silencieux);
        this.erreur.set(false);
        try {
            const enfants = await this.parents.mesEnfants();
            const jour = aujourdhui();
            const situation = this.absencesActives()
                ? await this.absences.situation(
                      enfants.map((e) => e.id),
                      enfants.flatMap((e) => (e.classeId ? [e.classeId] : [])),
                      jour,
                      decalerDate(jour, -JOURS),
                  )
                : { appels: [], absences: [] };
            const duJour = situation.absences.filter((a) => a.date === jour);
            this.enfants.set(
                await Promise.all(
                    enfants.map(async (e) => ({
                        ...e,
                        photoUrl: await this.apprenants.urlPhoto(e.photoPath),
                        situation: this.absencesActives() ? situationDuJour(e, situation.appels, duJour) : null,
                        aJustifier: situation.absences.filter((a) => a.apprenantId === e.id && a.etat === 'aucune' && a.peutJustifier),
                    })),
                ),
            );
        } catch {
            this.erreur.set(true);
        } finally {
            this.chargement.set(false);
        }
    }
}
