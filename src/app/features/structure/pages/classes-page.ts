import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { ClasseDialogsService } from '../components/classe-dialogs';
import { ErreurStructure } from '../data/annees.service';
import { AnneeChoix, ClasseResume, ClassesService, Enseignant } from '../data/classes.service';

/**
 * Structure → Classes (S3.3) : classes d'une année (active par défaut), titulaire et nombre de matières. Admin :
 * création, modification, suppression ; enseignant : lecture. Détail : `classes/:classeId`. Pagination serveur en S3.4.
 */
@Component({
    selector: 'app-classes-page',
    imports: [RouterLink, TranslatePipe, EmptyState, Skeleton],
    template: `
        <div class="panel">
            @if (chargement()) {
                <app-skeleton [lignes]="4" />
            } @else if (erreurChargement()) {
                <div class="grid gap-4">
                    <div
                        class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                        role="alert"
                    >
                        {{ 'structure.erreurs.chargement' | translate }}
                    </div>
                    <div>
                        <button type="button" class="btn btn-outline-primary" (click)="charger()">{{ 'membres.reessayer' | translate }}</button>
                    </div>
                </div>
            } @else if (annees().length === 0) {
                <app-empty-state [titre]="'structure.classes.sans_annee_titre' | translate" [message]="'structure.classes.sans_annee_message' | translate" />
            } @else {
                <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <label class="mb-0! grid gap-1.5 font-semibold">
                        {{ 'structure.classes.annee' | translate }}
                        <select class="form-select min-w-48" [value]="anneeId()" (change)="choisirAnnee($event)">
                            @for (a of annees(); track a.id) {
                                <option [value]="a.id">{{ a.libelle }}{{ a.active ? ' — ' + ('structure.annees.active' | translate) : '' }}</option>
                            }
                        </select>
                    </label>
                    @if (admin()) {
                        <button type="button" class="btn btn-primary" [disabled]="enCours()" (click)="nouvelle()">
                            {{ 'structure.classes.nouvelle' | translate }}
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

                @if (classes().length === 0) {
                    <app-empty-state [titre]="'structure.classes.vide_titre' | translate" [message]="'structure.classes.vide_message' | translate" />
                } @else {
                    <ul class="m-0 grid list-none gap-2 p-0">
                        @for (classe of classes(); track classe.id) {
                            <li class="flex flex-wrap items-center gap-3 rounded-md border border-white-light p-3 dark:border-night-border">
                                <div class="min-w-0 flex-1 basis-56">
                                    <a class="font-semibold text-primary hover:underline" [routerLink]="[classe.id]">{{ classe.nom }}</a>
                                    <p class="m-0 text-sm text-muted dark:text-night-muted">
                                        {{ classe.niveau ?? ('structure.classes.sans_niveau' | translate) }} ·
                                        {{ 'structure.classes.titulaire_x' | translate: { nom: nomEnseignant(classe.titulaireId) } }} ·
                                        {{ 'structure.classes.nb_matieres' | translate: { n: classe.nbMatieres } }}
                                    </p>
                                </div>
                                @if (admin()) {
                                    <div class="flex flex-wrap gap-2">
                                        <button type="button" class="btn btn-sm btn-outline-primary min-h-11" [disabled]="enCours()" (click)="modifier(classe)">
                                            {{ 'structure.modifier' | translate }}
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-danger min-h-11" [disabled]="enCours()" (click)="supprimer(classe)">
                                            {{ 'structure.supprimer' | translate }}
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
export class ClassesPage implements OnInit {
    private readonly service = inject(ClassesService);
    private readonly dialogues = inject(ClasseDialogsService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);
    private readonly courante = inject(CurrentDaaraService);

    protected readonly admin = computed(() => this.courante.roles().includes('admin'));
    protected readonly annees = signal<AnneeChoix[]>([]);
    protected readonly anneeId = signal<string | null>(null);
    protected readonly classes = signal<ClasseResume[]>([]);
    private readonly enseignants = signal<Enseignant[]>([]);
    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal(false);
    protected readonly enCours = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);

    ngOnInit(): void {
        void this.charger();
    }

    protected async charger(): Promise<void> {
        this.chargement.set(true);
        this.erreurChargement.set(false);
        try {
            const [annees, enseignants] = await Promise.all([this.service.annees(), this.service.enseignants()]);
            this.annees.set(annees);
            this.enseignants.set(enseignants);
            const choisie = annees.find((a) => a.id === this.anneeId()) ?? annees.find((a) => a.active) ?? annees[0];
            this.anneeId.set(choisie?.id ?? null);
            this.classes.set(choisie ? await this.service.lister(choisie.id) : []);
        } catch {
            this.erreurChargement.set(true);
        } finally {
            this.chargement.set(false);
        }
    }

    protected nomEnseignant(id: string | null): string {
        const e = id ? this.enseignants().find((x) => x.id === id) : undefined;
        return e?.nom || this.translate.instant(id ? 'membres.sans_nom' : 'structure.classes.aucun');
    }

    protected async choisirAnnee(evenement: Event): Promise<void> {
        this.anneeId.set((evenement.target as HTMLSelectElement).value);
        this.succes.set(null);
        await this.recharger();
    }

    protected async nouvelle(): Promise<void> {
        const anneeId = this.anneeId();
        if (anneeId) {
            await this.saisir(undefined, (s) => this.service.creer(anneeId, s));
        }
    }

    protected async modifier(classe: ClasseResume): Promise<void> {
        await this.saisir(classe, (s) => this.service.modifier(classe.id, s));
    }

    protected async supprimer(classe: ClasseResume): Promise<void> {
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('structure.classes.confirmer_suppression', { nom: classe.nom }),
            message: this.translate.instant('structure.classes.confirmer_suppression_message'),
            libelleConfirmer: this.translate.instant('structure.supprimer'),
            danger: true,
        });
        if (!confirme) {
            return;
        }
        this.enCours.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await this.service.supprimer(classe.id);
            this.succes.set('structure.classes.supprimee');
            await this.recharger();
        } catch (e) {
            this.erreur.set(e instanceof ErreurStructure ? e.cle : 'structure.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }

    private async saisir(classe: ClasseResume | undefined, enregistrer: Parameters<ClasseDialogsService['classe']>[0]['enregistrer']): Promise<void> {
        this.erreur.set(null);
        this.succes.set(null);
        if (await this.dialogues.classe({ classe, enseignants: this.enseignants(), enregistrer })) {
            this.succes.set('structure.enregistre');
            await this.recharger();
        }
    }

    private async recharger(): Promise<void> {
        const anneeId = this.anneeId();
        try {
            this.classes.set(anneeId ? await this.service.lister(anneeId) : []);
        } catch (e) {
            this.erreur.set(e instanceof ErreurStructure ? e.cle : 'structure.erreurs.inattendue');
        }
    }
}
