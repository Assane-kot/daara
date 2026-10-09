import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Badge } from '../../../shared/ui/badge/badge';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { ClasseDialogsService } from '../components/classe-dialogs';
import { ErreurStructure } from '../data/annees.service';
import { Affectation, ClasseDetail, ClassesService, Enseignant } from '../data/classes.service';
import { Matiere, MatieresService } from '../data/matieres.service';

/**
 * Structure → Classes → détail (S3.3) : informations de la classe et matières enseignées (coefficient, enseignant).
 * Admin : ajout, modification, retrait ; enseignant : lecture. Une classe inconnue ou d'une autre daara est
 * indiscernable (aucune ligne lisible).
 */
@Component({
    selector: 'app-classe-detail-page',
    imports: [RouterLink, TranslatePipe, Badge, EmptyState, Skeleton],
    template: `
        <p class="mt-0 mb-3">
            <a class="font-semibold text-primary hover:underline" routerLink="..">← {{ 'structure.classes.retour' | translate }}</a>
        </p>
        <div class="panel">
            @if (chargement()) {
                <app-skeleton [lignes]="4" />
            } @else if (erreurChargement(); as cle) {
                <div
                    class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                    role="alert"
                >
                    {{ cle | translate }}
                </div>
            } @else if (classe(); as c) {
                <h2 class="mt-0 mb-1 text-lg font-bold dark:text-white-light">{{ c.nom }}</h2>
                <p class="mt-0 mb-5 text-muted dark:text-night-muted">
                    {{ c.anneeLibelle }} · {{ c.niveau ?? ('structure.classes.sans_niveau' | translate) }} ·
                    {{ 'structure.classes.titulaire_x' | translate: { nom: nomEnseignant(c.titulaireId) } }}
                </p>

                <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h3 class="m-0 text-base font-bold dark:text-white-light">{{ 'structure.affectations.titre' | translate }}</h3>
                    @if (admin()) {
                        <button type="button" class="btn btn-sm btn-primary min-h-11" [disabled]="enCours() || proposables().length === 0" (click)="ajouter(c)">
                            {{ 'structure.affectations.ajouter' | translate }}
                        </button>
                    }
                </div>

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

                @if (c.affectations.length === 0) {
                    <app-empty-state [titre]="'structure.affectations.vide_titre' | translate" [message]="'structure.affectations.vide_message' | translate" />
                } @else {
                    <ul class="m-0 grid list-none gap-2 p-0">
                        @for (a of c.affectations; track a.id) {
                            <li class="flex flex-wrap items-center gap-3 rounded-md border border-white-light p-3 dark:border-night-border">
                                <div class="min-w-0 flex-1 basis-56">
                                    <p class="m-0 flex flex-wrap items-center gap-2 font-semibold text-black dark:text-white-light">
                                        {{ a.matiereNom }}
                                        <app-badge variante="dark">{{ a.matiereCode }}</app-badge>
                                    </p>
                                    <p class="m-0 text-sm text-muted dark:text-night-muted">
                                        {{ 'structure.affectations.coef_x' | translate: { coef: a.coefficient } }} ·
                                        {{ nomEnseignant(a.enseignantId) }}
                                    </p>
                                </div>
                                @if (admin()) {
                                    <div class="flex flex-wrap gap-2">
                                        <button type="button" class="btn btn-sm btn-outline-primary min-h-11" [disabled]="enCours()" (click)="modifier(a)">
                                            {{ 'structure.modifier' | translate }}
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-danger min-h-11" [disabled]="enCours()" (click)="retirer(a)">
                                            {{ 'structure.affectations.retirer' | translate }}
                                        </button>
                                    </div>
                                }
                            </li>
                        }
                    </ul>
                }
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClasseDetailPage implements OnInit {
    private readonly classeId = signal(inject(ActivatedRoute).snapshot.paramMap.get('classeId') ?? '');

    private readonly service = inject(ClassesService);
    private readonly matieresService = inject(MatieresService);
    private readonly dialogues = inject(ClasseDialogsService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);
    private readonly courante = inject(CurrentDaaraService);

    protected readonly admin = computed(() => this.courante.roles().includes('admin'));
    protected readonly classe = signal<ClasseDetail | null>(null);
    private readonly enseignants = signal<Enseignant[]>([]);
    private readonly matieres = signal<Matiere[]>([]);
    /** Matières proposées à l'ajout : non archivées, pas encore dans la classe. */
    protected readonly proposables = computed(() => {
        const presentes = new Set(this.classe()?.affectations.map((a) => a.matiereId));
        return this.matieres().filter((m) => !m.archivee && !presentes.has(m.id));
    });
    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal<string | null>(null);
    protected readonly enCours = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);

    ngOnInit(): void {
        void this.charger();
    }

    protected async charger(): Promise<void> {
        try {
            const [classe, enseignants, matieres] = await Promise.all([
                this.service.detail(this.classeId()),
                this.service.enseignants(),
                this.admin() ? this.matieresService.lister() : Promise.resolve([]),
            ]);
            this.classe.set(classe);
            this.enseignants.set(enseignants);
            this.matieres.set(matieres);
        } catch (e) {
            this.erreurChargement.set(e instanceof ErreurStructure ? e.cle : 'structure.erreurs.chargement');
        } finally {
            this.chargement.set(false);
        }
    }

    protected nomEnseignant(id: string | null): string {
        const e = id ? this.enseignants().find((x) => x.id === id) : undefined;
        return e?.nom || this.translate.instant(id ? 'membres.sans_nom' : 'structure.affectations.sans_enseignant');
    }

    protected async ajouter(classe: ClasseDetail): Promise<void> {
        await this.saisir(undefined, (s) => this.service.affecter(classe.id, s));
    }

    protected async modifier(a: Affectation): Promise<void> {
        await this.saisir(a, (s) => this.service.modifierAffectation(a.id, s));
    }

    protected async retirer(a: Affectation): Promise<void> {
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('structure.affectations.confirmer_retrait', { nom: a.matiereNom }),
            message: this.translate.instant('structure.affectations.confirmer_retrait_message'),
            libelleConfirmer: this.translate.instant('structure.affectations.retirer'),
            danger: true,
        });
        if (!confirme) {
            return;
        }
        this.enCours.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await this.service.retirerAffectation(a.id);
            this.succes.set('structure.affectations.retiree');
            this.classe.set(await this.service.detail(this.classeId()));
        } catch (e) {
            this.erreur.set(e instanceof ErreurStructure ? e.cle : 'structure.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }

    private async saisir(affectation: Affectation | undefined, enregistrer: Parameters<ClasseDialogsService['affectation']>[0]['enregistrer']): Promise<void> {
        this.erreur.set(null);
        this.succes.set(null);
        if (await this.dialogues.affectation({ affectation, matieres: this.proposables(), enseignants: this.enseignants(), enregistrer })) {
            this.succes.set('structure.enregistre');
            try {
                this.classe.set(await this.service.detail(this.classeId()));
            } catch (e) {
                this.erreur.set(e instanceof ErreurStructure ? e.cle : 'structure.erreurs.inattendue');
            }
        }
    }
}
