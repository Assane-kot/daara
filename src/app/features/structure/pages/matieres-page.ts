import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Badge, BadgeVariante } from '../../../shared/ui/badge/badge';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { CarteTable, CelluleTable, ColonneTable, DataTable, PageTable, RequeteTable } from '../../../shared/ui/data-table/data-table';
import { MatiereDialogService } from '../components/matiere-dialog';
import { ErreurStructure } from '../data/annees.service';
import { Matiere, MatieresService, TypeMatiere } from '../data/matieres.service';

const VARIANTE_TYPE: Record<TypeMatiere, BadgeVariante> = { scolaire: 'primary', coran: 'success', religieux: 'secondary' };

/**
 * Structure → Matières (S3.2, `data-table` S3.4) : catalogue de la daara, paginé, trié et cherché côté serveur. Admin :
 * création, modification, archivage, suppression d'une matière inutilisée ; enseignant : lecture seule.
 */
@Component({
    selector: 'app-matieres-page',
    imports: [NgTemplateOutlet, TranslatePipe, Badge, DataTable, CelluleTable, CarteTable],
    template: `
        <div class="panel">
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
                rechercheLibelle="structure.matieres.rechercher"
                titreVide="structure.matieres.vide_titre"
                messageVide="structure.matieres.vide_message"
            >
                <div filtres class="contents">
                    <label class="mb-0! flex min-h-11 cursor-pointer items-center gap-2 font-normal">
                        <input type="checkbox" class="form-checkbox" [checked]="avecArchivees()" (change)="basculerArchivees()" />
                        {{ 'structure.matieres.voir_archivees' | translate }}
                    </label>
                    @if (admin()) {
                        <button type="button" class="btn btn-primary" [disabled]="enCours()" (click)="saisir(undefined)">
                            {{ 'structure.matieres.nouvelle' | translate }}
                        </button>
                    }
                </div>

                <ng-template appCellule="nom" let-m>
                    <span class="font-semibold text-black dark:text-white-light" [class.opacity-60]="m.archivee">{{ m.nom }}</span>
                    @if (m.archivee) {
                        <app-badge variante="warning" class="ltr:ml-2 rtl:mr-2">{{ 'structure.matieres.archivee' | translate }}</app-badge>
                    }
                </ng-template>
                <ng-template appCellule="code" let-m
                    ><app-badge variante="dark">{{ m.code }}</app-badge></ng-template
                >
                <ng-template appCellule="type" let-m>
                    <app-badge [variante]="varianteType(m.type)">{{ 'structure.matieres.types.' + m.type | translate }}</app-badge>
                </ng-template>
                <ng-template appCellule="actions" let-m>
                    <ng-container [ngTemplateOutlet]="actions" [ngTemplateOutletContext]="{ $implicit: m }" />
                </ng-template>
                <ng-template appCarte let-m>
                    <p class="m-0 font-semibold text-black dark:text-white-light" [class.opacity-60]="m.archivee">{{ m.nom }}</p>
                    <div class="mt-1 flex flex-wrap gap-1.5">
                        <app-badge variante="dark">{{ m.code }}</app-badge>
                        <app-badge [variante]="varianteType(m.type)">{{ 'structure.matieres.types.' + m.type | translate }}</app-badge>
                        @if (m.archivee) {
                            <app-badge variante="warning">{{ 'structure.matieres.archivee' | translate }}</app-badge>
                        }
                    </div>
                    @if (admin()) {
                        <div class="mt-3"><ng-container [ngTemplateOutlet]="actions" [ngTemplateOutletContext]="{ $implicit: m }" /></div>
                    }
                </ng-template>
            </app-data-table>
        </div>

        <ng-template #actions let-m>
            <div class="flex flex-wrap gap-2 sm:justify-end">
                <button type="button" class="btn btn-sm btn-outline-primary min-h-11" [disabled]="enCours()" (click)="saisir(m)">
                    {{ 'structure.modifier' | translate }}
                </button>
                <button type="button" class="btn btn-sm btn-outline-primary min-h-11" [disabled]="enCours()" (click)="archiver(m)">
                    {{ (m.archivee ? 'structure.matieres.desarchiver' : 'structure.matieres.archiver') | translate }}
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger min-h-11" [disabled]="enCours()" (click)="supprimer(m)">
                    {{ 'structure.supprimer' | translate }}
                </button>
            </div>
        </ng-template>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatieresPage {
    private readonly service = inject(MatieresService);
    private readonly dialogue = inject(MatiereDialogService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);
    private readonly courante = inject(CurrentDaaraService);
    private readonly table = viewChild(DataTable);

    protected readonly admin = computed(() => this.courante.roles().includes('admin'));
    protected readonly avecArchivees = signal(false);
    protected readonly colonnes = computed<readonly ColonneTable[]>(() => [
        { cle: 'nom', libelle: 'structure.matieres.nom', triable: true },
        { cle: 'code', libelle: 'structure.matieres.code', triable: true },
        { cle: 'type', libelle: 'structure.matieres.type', triable: true },
        ...(this.admin() ? [{ cle: 'actions', libelle: 'membres.colonnes.actions', libelleMasque: true, classe: 'ltr:text-right rtl:text-left' }] : []),
    ]);
    protected readonly chargeur = (r: RequeteTable): Promise<PageTable<Matiere>> => this.service.page(r, this.avecArchivees());
    protected readonly enCours = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);

    /** Contexte des gabarits de cellule non typé (`let-m`) : indexation passée par une méthode typée. */
    protected varianteType(type: TypeMatiere): BadgeVariante {
        return VARIANTE_TYPE[type];
    }

    protected basculerArchivees(): void {
        this.avecArchivees.set(!this.avecArchivees());
        void this.table()?.recharger(true);
    }

    protected async saisir(matiere: Matiere | undefined): Promise<void> {
        this.erreur.set(null);
        this.succes.set(null);
        const ok = await this.dialogue.ouvrir({
            matiere,
            enregistrer: (s) => (matiere ? this.service.modifier(matiere.id, s) : this.service.creer(s)),
        });
        if (ok) {
            this.succes.set('structure.enregistre');
            await this.table()?.recharger();
        }
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

    private async agir(action: () => Promise<void>, succes: string): Promise<void> {
        this.enCours.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await action();
            this.succes.set(succes);
            await this.table()?.recharger();
        } catch (e) {
            this.erreur.set(e instanceof ErreurStructure ? e.cle : 'structure.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }
}
