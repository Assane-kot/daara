import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Badge, BadgeVariante } from '../../../shared/ui/badge/badge';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { MatiereDialogService } from '../components/matiere-dialog';
import { ErreurStructure } from '../data/annees.service';
import { Matiere, MatieresService, TypeMatiere } from '../data/matieres.service';

const VARIANTE_TYPE: Record<TypeMatiere, BadgeVariante> = { scolaire: 'primary', coran: 'success', religieux: 'secondary' };

/**
 * Structure → Matières (S3.2) : catalogue de la daara. Admin : création, modification, archivage, suppression d'une
 * matière inutilisée ; enseignant : lecture seule. La pagination serveur (`data-table`) arrive en S3.4.
 */
@Component({
    selector: 'app-matieres-page',
    imports: [TranslatePipe, Badge, EmptyState, Skeleton],
    template: `
        @if (chargement()) {
            <div class="panel"><app-skeleton [lignes]="4" /></div>
        } @else if (erreurChargement()) {
            <div class="panel grid gap-4">
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
        } @else {
            <div class="panel">
                <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <label class="mb-0! flex min-h-11 cursor-pointer items-center gap-2 font-normal">
                        <input type="checkbox" class="form-checkbox" [checked]="avecArchivees()" (change)="avecArchivees.set(!avecArchivees())" />
                        {{ 'structure.matieres.voir_archivees' | translate }}
                    </label>
                    @if (admin()) {
                        <button type="button" class="btn btn-primary" [disabled]="enCours()" (click)="nouvelle()">
                            {{ 'structure.matieres.nouvelle' | translate }}
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

                @if (visibles().length === 0) {
                    <app-empty-state [titre]="'structure.matieres.vide_titre' | translate" [message]="'structure.matieres.vide_message' | translate" />
                } @else {
                    <ul class="m-0 grid list-none gap-2 p-0">
                        @for (matiere of visibles(); track matiere.id) {
                            <li class="flex flex-wrap items-center gap-3 rounded-md border border-white-light p-3 dark:border-night-border">
                                <div class="min-w-0 flex-1 basis-56">
                                    <p class="m-0 font-semibold text-black dark:text-white-light" [class.opacity-60]="matiere.archivee">{{ matiere.nom }}</p>
                                    <div class="mt-1 flex flex-wrap gap-1.5">
                                        <app-badge variante="dark">{{ matiere.code }}</app-badge>
                                        <app-badge [variante]="variante[matiere.type]">{{ 'structure.matieres.types.' + matiere.type | translate }}</app-badge>
                                        @if (matiere.archivee) {
                                            <app-badge variante="warning">{{ 'structure.matieres.archivee' | translate }}</app-badge>
                                        }
                                    </div>
                                </div>
                                @if (admin()) {
                                    <div class="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-outline-primary min-h-11"
                                            [disabled]="enCours()"
                                            (click)="modifier(matiere)"
                                        >
                                            {{ 'structure.modifier' | translate }}
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-outline-primary min-h-11"
                                            [disabled]="enCours()"
                                            (click)="archiver(matiere)"
                                        >
                                            {{ (matiere.archivee ? 'structure.matieres.desarchiver' : 'structure.matieres.archiver') | translate }}
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-outline-danger min-h-11"
                                            [disabled]="enCours()"
                                            (click)="supprimer(matiere)"
                                        >
                                            {{ 'structure.supprimer' | translate }}
                                        </button>
                                    </div>
                                }
                            </li>
                        }
                    </ul>
                }
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatieresPage implements OnInit {
    private readonly service = inject(MatieresService);
    private readonly dialogue = inject(MatiereDialogService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);

    private readonly courante = inject(CurrentDaaraService);

    protected readonly admin = computed(() => this.courante.roles().includes('admin'));
    protected readonly matieres = signal<Matiere[]>([]);
    protected readonly avecArchivees = signal(false);
    protected readonly visibles = computed(() => this.matieres().filter((m) => this.avecArchivees() || !m.archivee));
    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal(false);
    protected readonly enCours = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);
    protected readonly variante = VARIANTE_TYPE;

    ngOnInit(): void {
        void this.charger();
    }

    protected async charger(): Promise<void> {
        this.erreurChargement.set(false);
        try {
            this.matieres.set(await this.service.lister());
        } catch {
            this.erreurChargement.set(true);
        } finally {
            this.chargement.set(false);
        }
    }

    protected async nouvelle(): Promise<void> {
        await this.saisir(undefined);
    }

    protected async modifier(matiere: Matiere): Promise<void> {
        await this.saisir(matiere);
    }

    protected async archiver(matiere: Matiere): Promise<void> {
        await this.agir(
            () => this.service.archiver(matiere.id, !matiere.archivee),
            matiere.archivee ? 'structure.matieres.desarchivee' : 'structure.matieres.archivee_ok',
        );
    }

    protected async supprimer(matiere: Matiere): Promise<void> {
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('structure.matieres.confirmer_suppression', { nom: matiere.nom }),
            message: this.translate.instant('structure.matieres.confirmer_suppression_message'),
            libelleConfirmer: this.translate.instant('structure.supprimer'),
            danger: true,
        });
        if (confirme) {
            await this.agir(() => this.service.supprimer(matiere.id), 'structure.matieres.supprimee');
        }
    }

    private async saisir(matiere: Matiere | undefined): Promise<void> {
        this.erreur.set(null);
        this.succes.set(null);
        const ok = await this.dialogue.ouvrir({
            matiere,
            enregistrer: (s) => (matiere ? this.service.modifier(matiere.id, s) : this.service.creer(s)),
        });
        if (ok) {
            this.succes.set('structure.enregistre');
            await this.charger();
        }
    }

    private async agir(action: () => Promise<void>, succes: string): Promise<void> {
        this.enCours.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await action();
            this.succes.set(succes);
            await this.charger();
        } catch (e) {
            this.erreur.set(e instanceof ErreurStructure ? e.cle : 'structure.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }
}
