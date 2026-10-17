import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { dateCourte, aujourdhui } from '../../../core/dates';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SignauxDaaraService } from '../../../core/daara/signaux-daara.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { Badge } from '../../../shared/ui/badge/badge';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { EvaluationDialogService } from '../components/evaluation-dialog';
import {
    ClasseNotes,
    ContexteNotes,
    ErreurEvaluation,
    Evaluation,
    EvaluationsService,
    MatiereNotes,
    PeriodeNotes,
    SaisieEvaluation,
    dateParDefaut,
    periodeParDefaut,
} from '../data/evaluations.service';

/**
 * `/d/:slug/notes` (S6.2, enseignant et admin, module `notes`) : classe, matière (les siennes ; toutes pour l'admin) et
 * période (celle d'aujourd'hui par défaut), gardées dans l'adresse ; évaluations de la période, « Nouvelle évaluation »,
 * modification, suppression. Période clôturée : lecture seule. Mise à jour automatique (S5.0b).
 */
@Component({
    selector: 'app-notes-page',
    imports: [RouterLink, TranslatePipe, Badge, EmptyState, PageHeader, Skeleton],
    template: `
        <app-page-header [titre]="'notes.titre' | translate" />
        @if (chargement()) {
            <div class="panel"><app-skeleton [lignes]="4" /></div>
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
        } @else if (ctx().classes.length === 0 || ctx().periodes.length === 0) {
            <div class="panel">
                <app-empty-state
                    [titre]="(ctx().classes.length === 0 ? 'notes.vide_classes_titre' : 'notes.vide_periodes_titre') | translate"
                    [message]="
                        (ctx().classes.length === 0
                            ? admin()
                                ? 'notes.vide_classes_admin'
                                : 'notes.vide_classes_enseignant'
                            : admin()
                              ? 'notes.vide_periodes_admin'
                              : 'notes.vide_periodes_enseignant'
                        ) | translate
                    "
                >
                    @if (admin()) {
                        <a class="btn btn-primary" [routerLink]="ctx().classes.length === 0 ? '../structure/classes' : '../structure/annees'">{{
                            (ctx().classes.length === 0 ? 'notes.voir_classes' : 'notes.voir_periodes') | translate
                        }}</a>
                    }
                </app-empty-state>
            </div>
        } @else {
            <div class="panel mb-4 grid gap-3 sm:grid-cols-3">
                <label class="mb-0! grid gap-1 font-semibold">
                    {{ 'notes.classe' | translate }}
                    <select class="form-select min-h-11 font-normal" (change)="choisir({ classe: $any($event.target).value, matiere: null })">
                        @for (c of ctx().classes; track c.id) {
                            <option [value]="c.id" [selected]="c.id === classe()?.id">{{ c.nom }}</option>
                        }
                    </select>
                </label>
                <label class="mb-0! grid gap-1 font-semibold">
                    {{ 'notes.matiere' | translate }}
                    <select
                        class="form-select min-h-11 font-normal"
                        [disabled]="!classe()?.matieres?.length"
                        (change)="choisir({ matiere: $any($event.target).value })"
                    >
                        @for (m of classe()?.matieres ?? []; track m.id) {
                            <option [value]="m.id" [selected]="m.id === matiere()?.id">{{ m.nom }}</option>
                        }
                    </select>
                </label>
                <label class="mb-0! grid gap-1 font-semibold">
                    {{ 'notes.periode' | translate }}
                    <select class="form-select min-h-11 font-normal" (change)="choisir({ periode: $any($event.target).value })">
                        @for (p of ctx().periodes; track p.id) {
                            <option [value]="p.id" [selected]="p.id === periode()?.id">
                                {{ p.libelle }}{{ p.cloturee ? ' · ' + ('notes.cloturee' | translate) : '' }}
                            </option>
                        }
                    </select>
                </label>
            </div>

            @if (succes(); as succes) {
                <div class="mb-4 rounded-md border border-primary/30 bg-primary/10 p-3.5 text-black dark:text-white-light" role="status">
                    {{ succes | translate }}
                </div>
            }
            @if (erreur(); as erreur) {
                <div
                    class="mb-4 rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                    role="alert"
                >
                    {{ erreur | translate }}
                </div>
            }

            @if (!matiere()) {
                <div class="panel">
                    <app-empty-state [titre]="'notes.vide_matieres_titre' | translate" [message]="'notes.vide_matieres' | translate">
                        @if (admin()) {
                            <a class="btn btn-primary" [routerLink]="['../structure/classes', classe()?.id]">{{ 'notes.ajouter_matieres' | translate }}</a>
                        }
                    </app-empty-state>
                </div>
            } @else {
                <div class="panel">
                    @if (periode()?.cloturee) {
                        <p class="m-0 mb-4 rounded-md bg-gray-50 p-3 text-muted dark:bg-night-hover dark:text-night-muted">
                            {{ 'notes.periode_cloturee' | translate }}
                        </p>
                    }
                    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 class="m-0 text-lg font-bold text-black dark:text-white-light">
                            {{ 'notes.evaluations_de' | translate: { matiere: matiere()?.nom, periode: periode()?.libelle } }}
                        </h2>
                        @if (ecriture() && evaluations().length > 0) {
                            <button type="button" class="btn btn-primary" (click)="creer()">{{ 'notes.nouvelle' | translate }}</button>
                        }
                    </div>
                    @if (chargementListe()) {
                        <app-skeleton [lignes]="3" />
                    } @else if (evaluations().length === 0) {
                        <app-empty-state
                            [titre]="'notes.vide_titre' | translate"
                            [message]="(ecriture() ? 'notes.vide_message' : 'notes.vide_lecture') | translate"
                        >
                            @if (ecriture()) {
                                <button type="button" class="btn btn-primary" (click)="creer()">{{ 'notes.creer_premiere' | translate }}</button>
                            }
                        </app-empty-state>
                    } @else {
                        <ul class="m-0 grid list-none gap-2 p-0">
                            @for (e of evaluations(); track e.id) {
                                <li class="flex flex-wrap items-center gap-3 rounded-md border border-white-light p-3 dark:border-night-border">
                                    <div class="min-w-0 flex-1 basis-56">
                                        <p class="m-0 flex flex-wrap items-center gap-2 font-semibold text-black dark:text-white-light">
                                            {{ e.libelle }}
                                            @if (e.publiee) {
                                                <app-badge variante="success">{{ 'notes.etats.publiee' | translate }}</app-badge>
                                            } @else {
                                                <app-badge variante="warning">{{ 'notes.etats.a_saisir' | translate }}</app-badge>
                                            }
                                        </p>
                                        <p class="m-0 text-sm text-muted dark:text-night-muted">
                                            {{ e.typeNom }} · {{ date(e.date) }} ·
                                            {{ 'notes.sur_coef' | translate: { bareme: nombre(e.bareme), coef: nombre(e.coefficient) } }}
                                        </p>
                                    </div>
                                    @if (ecriture()) {
                                        <div class="flex flex-wrap gap-2">
                                            <button type="button" class="btn btn-sm btn-outline-primary min-h-11" [disabled]="enCours()" (click)="modifier(e)">
                                                {{ 'notes.modifier' | translate }}
                                            </button>
                                            @if (!e.publiee) {
                                                <button
                                                    type="button"
                                                    class="btn btn-sm btn-outline-danger min-h-11"
                                                    [disabled]="enCours()"
                                                    (click)="supprimer(e)"
                                                >
                                                    {{ 'notes.supprimer' | translate }}
                                                </button>
                                            }
                                        </div>
                                    }
                                </li>
                            }
                        </ul>
                    }
                </div>
            }
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPage implements OnInit {
    private readonly service = inject(EvaluationsService);
    private readonly dialogue = inject(EvaluationDialogService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly langue = inject(LanguageService).langue;
    private readonly courante = inject(CurrentDaaraService);

    protected readonly admin = computed(() => this.courante.roles().includes('admin'));
    protected readonly ctx = signal<ContexteNotes>({ classes: [], periodes: [], types: [], bareme: 20 });
    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal<string | null>(null);
    protected readonly chargementListe = signal(false);
    protected readonly evaluations = signal<Evaluation[]>([]);
    protected readonly enCours = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);

    /** Choix gardés dans l'adresse (retour sur la page au même endroit). */
    private readonly choix = signal<{ classe: string | null; matiere: string | null; periode: string | null }>({
        classe: this.route.snapshot.queryParamMap.get('classe'),
        matiere: this.route.snapshot.queryParamMap.get('matiere'),
        periode: this.route.snapshot.queryParamMap.get('periode'),
    });
    protected readonly classe = computed<ClasseNotes | null>(() => {
        const classes = this.ctx().classes;
        return classes.find((c) => c.id === this.choix().classe) ?? classes[0] ?? null;
    });
    protected readonly matiere = computed<MatiereNotes | null>(() => {
        const matieres = this.classe()?.matieres ?? [];
        return matieres.find((m) => m.id === this.choix().matiere) ?? matieres[0] ?? null;
    });
    protected readonly periode = computed<PeriodeNotes | null>(() => {
        const periodes = this.ctx().periodes;
        return periodes.find((p) => p.id === this.choix().periode) ?? periodeParDefaut(periodes, aujourdhui());
    });
    /** La matière affichée est celle de l'utilisateur (filtrée par le service) ; période clôturée : lecture seule. */
    protected readonly ecriture = computed(() => !!this.matiere() && !this.periode()?.cloturee);

    constructor() {
        inject(SignauxDaaraService).surveiller(['evaluations'], () => this.chargerListe(true));
        inject(SignauxDaaraService).surveiller(
            ['classes', 'classe_matieres', 'periodes', 'annees_scolaires', 'types_evaluation', 'reglages_notes', 'daaras'],
            () => this.charger(true),
        );
    }

    ngOnInit(): void {
        void this.charger();
    }

    protected async charger(silencieux = false): Promise<void> {
        if (!silencieux) {
            this.chargement.set(true);
        }
        this.erreurChargement.set(null);
        try {
            this.ctx.set(await this.service.contexte());
        } catch (e) {
            this.erreurChargement.set(e instanceof ErreurEvaluation ? e.cle : 'notes.erreurs.chargement');
        } finally {
            this.chargement.set(false);
        }
        await this.chargerListe(silencieux);
    }

    protected choisir(c: { classe?: string; matiere?: string | null; periode?: string }): void {
        this.choix.update((x) => ({ ...x, ...c }));
        this.erreur.set(null);
        this.succes.set(null);
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { classe: this.classe()?.id, matiere: this.matiere()?.id, periode: this.periode()?.id },
            replaceUrl: true,
        });
        void this.chargerListe();
    }

    protected date(iso: string): string {
        return dateCourte(iso, this.langue());
    }

    protected nombre(n: number): string {
        return n.toLocaleString(this.langue() === 'en' ? 'en-GB' : 'fr-FR');
    }

    protected async creer(): Promise<void> {
        const [classe, matiere, periode] = [this.classe(), this.matiere(), this.periode()];
        if (!classe || !matiere || !periode) {
            return;
        }
        await this.saisir(undefined, (s) => this.service.creer(classe.id, matiere.id, periode.id, s), 'notes.creee');
    }

    protected async modifier(e: Evaluation): Promise<void> {
        await this.saisir(e, (s) => this.service.modifier(e.id, s), 'notes.enregistree');
    }

    protected async supprimer(e: Evaluation): Promise<void> {
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('notes.confirmer_suppression', { libelle: e.libelle }),
            message: this.translate.instant('notes.confirmer_suppression_message'),
            libelleConfirmer: this.translate.instant('notes.supprimer'),
            danger: true,
        });
        if (!confirme) {
            return;
        }
        this.enCours.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await this.service.supprimer(e.id);
            this.succes.set('notes.supprimee');
            await this.chargerListe(true);
        } catch (err) {
            this.erreur.set(err instanceof ErreurEvaluation ? err.cle : 'notes.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }

    private async saisir(evaluation: Evaluation | undefined, enregistrer: (s: SaisieEvaluation) => Promise<void>, succes: string): Promise<void> {
        const [classe, matiere, periode] = [this.classe(), this.matiere(), this.periode()];
        if (!classe || !matiere || !periode) {
            return;
        }
        this.erreur.set(null);
        this.succes.set(null);
        const ok = await this.dialogue.ouvrir({
            titre: `${classe.nom} · ${matiere.nom}`,
            periode,
            types: this.ctx().types,
            existantes: this.evaluations(),
            bareme: this.ctx().bareme,
            date: dateParDefaut(periode, aujourdhui()),
            evaluation,
            enregistrer,
        });
        if (ok) {
            this.succes.set(succes);
            await this.chargerListe(true);
        }
    }

    private async chargerListe(silencieux = false): Promise<void> {
        const [matiere, periode] = [this.matiere(), this.periode()];
        if (!matiere || !periode) {
            this.evaluations.set([]);
            return;
        }
        if (!silencieux) {
            this.chargementListe.set(true);
        }
        try {
            this.evaluations.set(await this.service.lister(matiere.id, periode.id));
        } catch (e) {
            this.erreur.set(e instanceof ErreurEvaluation ? e.cle : 'notes.erreurs.chargement');
        } finally {
            this.chargementListe.set(false);
        }
    }
}
