import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SignauxDaaraService } from '../../../core/daara/signaux-daara.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { AppelService, Creneau, EleveAppel, ErreurAppel, Presence, aujourdhui, presenceSuivante } from '../data/appel.service';

const CRENEAUX: readonly Creneau[] = ['journee', 'matin', 'apres_midi'];

/**
 * `/d/:slug/appel/:classeId?date=&creneau=` (S5.1) : feuille d'appel. Tout le monde est présent par défaut ; un toucher
 * sur un élève → absent, un second → en retard, un troisième → présent. Chaque toucher est enregistré tout de suite
 * (rien à perdre) ; « Terminer l'appel » clôt l'appel (S5.3 : les parents seront prévenus). Corrections possibles ensuite.
 */
@Component({
    selector: 'app-appel-classe-page',
    imports: [RouterLink, TranslatePipe, EmptyState, Skeleton],
    template: `
        <p class="mb-3">
            <a class="font-semibold text-primary hover:underline" routerLink="..">← {{ 'appel.retour' | translate }}</a>
        </p>
        @if (chargement()) {
            <div class="panel"><app-skeleton [lignes]="6" /></div>
        } @else if (erreurChargement(); as erreur) {
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
        } @else {
            <div class="panel mb-24">
                <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <h1 class="m-0 text-xl font-bold text-black dark:text-white-light">{{ classeNom() }}</h1>
                        <p class="m-0 text-muted dark:text-night-muted">
                            {{ dateLisible() }}{{ creneau !== 'journee' ? ' · ' + ('appel.creneaux.' + creneau | translate) : '' }}
                        </p>
                    </div>
                    @if (termine()) {
                        <span class="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{{ 'appel.termine' | translate }}</span>
                    }
                </div>
                <p class="mb-3 flex flex-wrap gap-x-4 gap-y-1 font-semibold" aria-live="polite">
                    <span class="text-primary">{{ 'appel.compte.presents' | translate: { n: compte().present } }}</span>
                    <span class="text-danger-strong dark:text-danger-soft">{{ 'appel.compte.absents' | translate: { n: compte().absence } }}</span>
                    <span class="text-warning-strong dark:text-warning">{{ 'appel.compte.retards' | translate: { n: compte().retard } }}</span>
                </p>
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
                @if (eleves().length === 0) {
                    <app-empty-state [titre]="'appel.aucun_eleve_titre' | translate" [message]="'appel.aucun_eleve_message' | translate" />
                } @else {
                    <p class="mb-3 text-sm text-muted dark:text-night-muted">{{ 'appel.aide' | translate }}</p>
                    <ul class="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                        @for (e of eleves(); track e.apprenantId) {
                            <li>
                                <button
                                    type="button"
                                    class="flex min-h-14 w-full items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition disabled:opacity-60"
                                    [class]="classesPresence(e.presence)"
                                    [disabled]="enCours().has(e.apprenantId)"
                                    [attr.aria-label]="e.prenom + ' ' + e.nom + ' : ' + ('appel.presences.' + e.presence | translate)"
                                    (click)="basculer(e)"
                                >
                                    <span
                                        class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/70 text-sm font-extrabold uppercase dark:bg-black/20"
                                        aria-hidden="true"
                                    >
                                        {{ e.prenom[0] }}{{ e.nom[0] }}
                                    </span>
                                    <span class="min-w-0 flex-1 truncate text-base font-semibold">{{ e.prenom }} {{ e.nom }}</span>
                                    <span class="shrink-0 text-sm font-bold">{{ 'appel.presences.' + e.presence | translate }}</span>
                                </button>
                            </li>
                        }
                    </ul>
                }
            </div>

            @if (eleves().length > 0) {
                <div
                    class="fixed inset-x-0 bottom-0 z-20 border-t border-white-light bg-white/95 px-4 py-3 backdrop-blur ltr:lg:left-[260px] rtl:lg:right-[260px] dark:border-night-border dark:bg-night/95"
                >
                    <div class="mx-auto flex max-w-3xl items-center justify-between gap-3">
                        <span class="text-sm text-muted dark:text-night-muted">{{
                            (termine() ? 'appel.deja_termine' : 'appel.enregistre_auto') | translate
                        }}</span>
                        @if (!termine()) {
                            <button type="button" class="btn btn-primary min-h-11" [disabled]="enCours().size > 0 || fin()" (click)="terminer()">
                                @if (fin()) {
                                    <span class="auth-spinner ltr:mr-2 rtl:ml-2" aria-hidden="true"></span>
                                }
                                {{ 'appel.terminer' | translate }}
                            </button>
                        }
                    </div>
                </div>
            }
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppelClassePage {
    private readonly service = inject(AppelService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);
    private readonly router = inject(Router);
    private readonly langue = inject(LanguageService).langue;
    private readonly route = inject(ActivatedRoute);
    private readonly classeId = this.route.snapshot.paramMap.get('classeId') ?? '';
    private readonly parametres = this.route.snapshot.queryParamMap;
    protected readonly date = /^\d{4}-\d{2}-\d{2}$/.test(this.parametres.get('date') ?? '') ? this.parametres.get('date')! : aujourdhui();
    protected readonly creneau: Creneau = CRENEAUX.find((c) => c === this.parametres.get('creneau')) ?? 'journee';

    protected readonly classeNom = signal('');
    protected readonly eleves = signal<readonly EleveAppel[]>([]);
    protected readonly termine = signal(false);
    private appelId: string | null = null;
    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal<string | null>(null);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);
    /** Élèves dont l'enregistrement est en cours (bouton désactivé). */
    protected readonly enCours = signal<ReadonlySet<string>>(new Set());
    protected readonly fin = signal(false);
    private rechargementEnAttente = false;

    protected readonly compte = computed(() => {
        const c = { present: 0, absence: 0, retard: 0 };
        for (const e of this.eleves()) {
            c[e.presence]++;
        }
        return c;
    });
    protected readonly dateLisible = computed(() =>
        new Intl.DateTimeFormat(this.langue() === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${this.date}T12:00:00Z`)),
    );

    constructor() {
        // Un collègue fait l'appel en même temps, ou l'admin corrige : la feuille suit (S5.0b).
        inject(SignauxDaaraService).surveiller(['appels', 'absences', 'inscriptions'], () => this.charger(true));
        void this.charger();
    }

    protected classesPresence(p: Presence): string {
        return p === 'absence'
            ? 'border-danger bg-danger-light text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft'
            : p === 'retard'
              ? 'border-warning bg-warning-light text-warning-strong dark:bg-warning-dark-light dark:text-warning'
              : 'border-white-light bg-white text-black hover:border-primary/50 dark:border-night-border dark:bg-night dark:text-white-light';
    }

    protected async charger(silencieux = false): Promise<void> {
        // Pas de rechargement pendant qu'un toucher s'enregistre : il est fait juste après.
        if (this.enCours().size > 0) {
            this.rechargementEnAttente = true;
            return;
        }
        this.chargement.set(!silencieux && this.eleves().length === 0);
        try {
            const f = await this.service.feuille(this.classeId, this.date, this.creneau);
            this.classeNom.set(f.classeNom);
            this.eleves.set(f.eleves);
            this.termine.set(f.termine);
            this.appelId = f.appelId;
            this.erreurChargement.set(null);
        } catch (e) {
            this.erreurChargement.set(e instanceof ErreurAppel ? e.cle : 'appel.erreurs.inattendue');
        } finally {
            this.chargement.set(false);
        }
    }

    protected async basculer(touche: EleveAppel): Promise<void> {
        // État courant (pas celui du dernier rendu : un toucher peut arriver juste avant le rafraîchissement de l'écran) ;
        // un seul enregistrement à la fois par élève.
        const eleve = this.eleves().find((e) => e.apprenantId === touche.apprenantId);
        if (!eleve || this.enCours().has(eleve.apprenantId)) {
            return;
        }
        const suivante = presenceSuivante(eleve.presence);
        this.erreur.set(null);
        this.succes.set(null);
        this.remplacer(eleve.apprenantId, { presence: suivante });
        this.enCours.set(new Set(this.enCours()).add(eleve.apprenantId));
        try {
            this.appelId ??= await this.service.ouvrir(this.classeId, this.date, this.creneau);
            const absenceId = await this.service.marquer(this.appelId, eleve, suivante);
            this.remplacer(eleve.apprenantId, { absenceId });
        } catch (e) {
            // Retour à l'état d'avant (rien n'a été enregistré pour cet élève).
            this.remplacer(eleve.apprenantId, { presence: eleve.presence, absenceId: eleve.absenceId });
            this.erreur.set(e instanceof ErreurAppel ? e.cle : 'appel.erreurs.inattendue');
        } finally {
            const s = new Set(this.enCours());
            s.delete(eleve.apprenantId);
            this.enCours.set(s);
            if (s.size === 0 && this.rechargementEnAttente) {
                this.rechargementEnAttente = false;
                void this.charger(true);
            }
        }
    }

    protected async terminer(): Promise<void> {
        const c = this.compte();
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('appel.confirmer_titre', { classe: this.classeNom() }),
            message: this.translate.instant(c.absence + c.retard === 0 ? 'appel.confirmer_tous_presents' : 'appel.confirmer_message', {
                absents: c.absence,
                retards: c.retard,
            }),
            libelleConfirmer: this.translate.instant('appel.terminer'),
        });
        if (!confirme) {
            return;
        }
        this.fin.set(true);
        this.erreur.set(null);
        try {
            this.appelId ??= await this.service.ouvrir(this.classeId, this.date, this.creneau);
            await this.service.terminer(this.appelId);
            await this.router.navigate(['..'], { relativeTo: this.route, queryParams: { fait: this.classeNom() } });
        } catch (e) {
            this.erreur.set(e instanceof ErreurAppel ? e.cle : 'appel.erreurs.inattendue');
        } finally {
            this.fin.set(false);
        }
    }

    private remplacer(apprenantId: string, modif: Partial<EleveAppel>): void {
        this.eleves.set(this.eleves().map((e) => (e.apprenantId === apprenantId ? { ...e, ...modif } : e)));
    }
}
