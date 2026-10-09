import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Badge } from '../../../shared/ui/badge/badge';
import { CarteTable, CelluleTable, ColonneTable, DataTable, PageTable, RequeteTable } from '../../../shared/ui/data-table/data-table';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { ApprenantDialogService } from '../components/apprenant-dialog';
import { Apprenant, ApprenantsService, StatutApprenant } from '../data/apprenants.service';

/**
 * `/d/:slug/apprenants` (S4.1, admin) : élèves de la daara (`data-table` : recherche sans accents prénom / nom /
 * matricule, statut, tri), « Ajouter un élève » (saisie en série). Fiche : `:apprenantId`.
 */
@Component({
    selector: 'app-apprenants-page',
    imports: [RouterLink, TranslatePipe, Badge, PageHeader, DataTable, CelluleTable, CarteTable],
    template: `
        <app-page-header [titre]="'apprenants.titre' | translate">
            @if (admin()) {
                <button actions type="button" class="btn btn-primary" (click)="ajouter()">{{ 'apprenants.ajouter' | translate }}</button>
            }
        </app-page-header>
        <div class="panel">
            @if (succes(); as succes) {
                <div class="mb-4 rounded-md border border-primary/30 bg-primary/10 p-3.5 text-black dark:text-white-light" role="status">
                    {{ succes | translate }}
                </div>
            }
            <app-data-table
                [colonnes]="colonnes"
                [chargeur]="chargeur"
                rechercheLibelle="apprenants.rechercher"
                titreVide="apprenants.vide_titre"
                [actionVide]="admin() ? 'apprenants.ajouter_premier' : null"
                [messageVide]="admin() ? 'apprenants.vide_message' : 'apprenants.vide_enseignant'"
                (actionVideClic)="ajouter()"
            >
                <div filtres class="contents">
                    @if (classes().length > 0) {
                        <label class="mb-0!">
                            <span class="sr-only">{{ 'apprenants.classe' | translate }}</span>
                            <select class="form-select" [value]="classeId()" (change)="choisirClasse($event)">
                                <option value="">{{ 'apprenants.toutes_classes' | translate }}</option>
                                @for (c of classes(); track c.id) {
                                    <option [value]="c.id">{{ c.nom }}</option>
                                }
                            </select>
                        </label>
                    }
                    <label class="mb-0!">
                        <span class="sr-only">{{ 'apprenants.statut' | translate }}</span>
                        <select class="form-select" [value]="statut()" (change)="choisirStatut($event)">
                            <option value="inscrit">{{ 'apprenants.statuts.inscrit_pluriel' | translate }}</option>
                            <option value="parti">{{ 'apprenants.statuts.parti_pluriel' | translate }}</option>
                            <option value="">{{ 'apprenants.statuts.tous' | translate }}</option>
                        </select>
                    </label>
                </div>
                <ng-template appCellule="nom" let-a>
                    <a class="font-semibold text-primary hover:underline" [routerLink]="[a.id]">{{ a.prenom }} {{ a.nom }}</a>
                </ng-template>
                <ng-template appCellule="classe" let-a>{{ a.classe ?? '—' }}</ng-template>
                <ng-template appCellule="dateNaissance" let-a>{{ a.dateNaissance ? date(a.dateNaissance) : '—' }}</ng-template>
                <ng-template appCellule="statut" let-a>
                    <app-badge [variante]="a.statut === 'inscrit' ? 'success' : 'dark'">{{ 'apprenants.statuts.' + a.statut | translate }}</app-badge>
                </ng-template>
                <ng-template appCarte let-a>
                    <a class="font-semibold text-primary hover:underline" [routerLink]="[a.id]">{{ a.prenom }} {{ a.nom }}</a>
                    <p class="m-0 text-sm text-muted dark:text-night-muted">{{ a.matricule }}{{ a.dateNaissance ? ' · ' + date(a.dateNaissance) : '' }}</p>
                    @if (a.statut === 'parti') {
                        <app-badge variante="dark">{{ 'apprenants.statuts.parti' | translate }}</app-badge>
                    }
                </ng-template>
            </app-data-table>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprenantsPage {
    private readonly service = inject(ApprenantsService);
    private readonly dialogue = inject(ApprenantDialogService);
    private readonly courante = inject(CurrentDaaraService);
    private readonly table = viewChild(DataTable);

    protected readonly statut = signal<StatutApprenant | ''>('inscrit');
    protected readonly succes = signal<string | null>(null);
    protected readonly colonnes: readonly ColonneTable[] = [
        { cle: 'nom', libelle: 'apprenants.eleve', triable: true },
        { cle: 'matricule', libelle: 'apprenants.matricule', triable: true },
        { cle: 'classe', libelle: 'apprenants.classe' },
        { cle: 'dateNaissance', libelle: 'apprenants.date_naissance' },
        { cle: 'statut', libelle: 'apprenants.statut' },
    ];
    protected readonly chargeur = (r: RequeteTable): Promise<PageTable<Apprenant>> => this.service.page(r, this.statut(), this.classeId());
    protected readonly admin = computed(() => this.courante.roles().includes('admin'));
    protected readonly classes = signal<readonly { id: string; nom: string }[]>([]);
    protected readonly classeId = signal('');

    constructor() {
        // Classes de l'année active pour le filtre (module structure inactif : pas de filtre).
        void this.service.classesAnneeActive().then(
            (c) => this.classes.set(c),
            () => this.classes.set([]),
        );
    }

    protected choisirClasse(evenement: Event): void {
        this.classeId.set((evenement.target as HTMLSelectElement).value);
        void this.table()?.recharger(true);
    }

    protected date(iso: string): string {
        return new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(
            new Date(`${iso}T00:00:00Z`),
        );
    }

    protected choisirStatut(evenement: Event): void {
        this.statut.set((evenement.target as HTMLSelectElement).value as StatutApprenant | '');
        void this.table()?.recharger(true);
    }

    protected async ajouter(): Promise<void> {
        this.succes.set(null);
        const ok = await this.dialogue.ouvrir({
            enregistrer: async (s) => {
                await this.service.creer(s);
            },
        });
        if (ok) {
            this.succes.set('apprenants.enregistre');
            await this.table()?.recharger();
        }
    }
}
