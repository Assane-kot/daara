import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { CarteTable, CelluleTable, ColonneTable, DataTable, PageTable, RequeteTable } from '../../../shared/ui/data-table/data-table';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { ClasseDialogsService } from '../components/classe-dialogs';
import { ErreurStructure } from '../data/annees.service';
import { AnneeChoix, ClasseResume, ClassesService, Enseignant } from '../data/classes.service';

/**
 * Structure → Classes (S3.3, `data-table` S3.4) : classes d'une année (active par défaut), paginées, triées et cherchées
 * côté serveur ; titulaire et nombre de matières. Admin : création, modification, suppression ; enseignant : lecture.
 */
@Component({
    selector: 'app-classes-page',
    imports: [NgTemplateOutlet, RouterLink, TranslatePipe, EmptyState, Skeleton, DataTable, CelluleTable, CarteTable],
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

                <app-data-table
                    [colonnes]="colonnes()"
                    [chargeur]="chargeur"
                    rechercheLibelle="structure.classes.rechercher"
                    titreVide="structure.classes.vide_titre"
                    messageVide="structure.classes.vide_message"
                >
                    <div filtres class="contents">
                        <label class="mb-0!">
                            <span class="sr-only">{{ 'structure.classes.annee' | translate }}</span>
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

                    <ng-template appCellule="nom" let-c>
                        <a class="font-semibold text-primary hover:underline" [routerLink]="[c.id]">{{ c.nom }}</a>
                    </ng-template>
                    <ng-template appCellule="niveau" let-c>{{ c.niveau ?? '—' }}</ng-template>
                    <ng-template appCellule="titulaire" let-c>{{ nomEnseignant(c.titulaireId) }}</ng-template>
                    <ng-template appCellule="nbMatieres" let-c>{{ c.nbMatieres }}</ng-template>
                    <ng-template appCellule="actions" let-c>
                        <ng-container [ngTemplateOutlet]="actions" [ngTemplateOutletContext]="{ $implicit: c }" />
                    </ng-template>
                    <ng-template appCarte let-c>
                        <a class="font-semibold text-primary hover:underline" [routerLink]="[c.id]">{{ c.nom }}</a>
                        <p class="m-0 text-sm text-muted dark:text-night-muted">
                            {{ c.niveau ?? ('structure.classes.sans_niveau' | translate) }} ·
                            {{ 'structure.classes.titulaire_x' | translate: { nom: nomEnseignant(c.titulaireId) } }} ·
                            {{ 'structure.classes.nb_matieres' | translate: { n: c.nbMatieres } }}
                        </p>
                        @if (admin()) {
                            <div class="mt-3"><ng-container [ngTemplateOutlet]="actions" [ngTemplateOutletContext]="{ $implicit: c }" /></div>
                        }
                    </ng-template>
                </app-data-table>
            }
        </div>

        <ng-template #actions let-c>
            <div class="flex flex-wrap gap-2 sm:justify-end">
                <button type="button" class="btn btn-sm btn-outline-primary min-h-11" [disabled]="enCours()" (click)="modifier(c)">
                    {{ 'structure.modifier' | translate }}
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger min-h-11" [disabled]="enCours()" (click)="supprimer(c)">
                    {{ 'structure.supprimer' | translate }}
                </button>
            </div>
        </ng-template>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassesPage implements OnInit {
    private readonly service = inject(ClassesService);
    private readonly dialogues = inject(ClasseDialogsService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);
    private readonly courante = inject(CurrentDaaraService);
    private readonly table = viewChild(DataTable);

    protected readonly admin = computed(() => this.courante.roles().includes('admin'));
    protected readonly annees = signal<AnneeChoix[]>([]);
    protected readonly anneeId = signal<string | null>(null);
    private readonly enseignants = signal<Enseignant[]>([]);
    protected readonly colonnes = computed<readonly ColonneTable[]>(() => [
        { cle: 'nom', libelle: 'structure.classes.nom', triable: true },
        { cle: 'niveau', libelle: 'structure.classes.niveau', triable: true },
        { cle: 'titulaire', libelle: 'structure.classes.titulaire' },
        { cle: 'nbMatieres', libelle: 'structure.classes.matieres' },
        ...(this.admin() ? [{ cle: 'actions', libelle: 'membres.colonnes.actions', libelleMasque: true, classe: 'ltr:text-right rtl:text-left' }] : []),
    ]);
    protected readonly chargeur = (r: RequeteTable): Promise<PageTable<ClasseResume>> => {
        const anneeId = this.anneeId();
        return anneeId ? this.service.page(anneeId, r) : Promise.resolve({ lignes: [], total: 0 });
    };
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
            this.anneeId.set((annees.find((a) => a.active) ?? annees[0])?.id ?? null);
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

    protected choisirAnnee(evenement: Event): void {
        this.anneeId.set((evenement.target as HTMLSelectElement).value);
        this.succes.set(null);
        void this.table()?.recharger(true);
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
            await this.table()?.recharger();
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
            await this.table()?.recharger();
        }
    }
}
