import { NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Directive,
    OnDestroy,
    OnInit,
    TemplateRef,
    computed,
    contentChild,
    contentChildren,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconSearch } from '../../icon/icon-search';
import { EmptyState } from '../empty-state/empty-state';
import { Skeleton } from '../skeleton/skeleton';

export interface ColonneTable {
    readonly cle: string;
    /** Clé de traduction de l'en-tête. */
    readonly libelle: string;
    readonly triable?: boolean;
    /** En-tête lu par les lecteurs d'écran seulement (colonne d'actions). */
    readonly libelleMasque?: boolean;
    readonly classe?: string;
}

export interface TriTable {
    readonly cle: string;
    readonly desc: boolean;
}

/** Demande transmise au chargeur : page (à partir de 0), taille, tri, recherche (déjà rognée). */
export interface RequeteTable {
    readonly page: number;
    readonly taille: number;
    readonly tri: TriTable | null;
    readonly recherche: string;
}

export interface PageTable<T> {
    readonly lignes: readonly T[];
    readonly total: number;
}

/**
 * Motif `ilike` pour un filtre PostgREST (`.or('nom.ilike.…')`) : les caractères de la syntaxe des filtres et les jokers
 * saisis sont retirés (la recherche reste un simple « contient »).
 */
export function motifIlike(recherche: string): string {
    return `%${recherche.replace(/[,()%*\\:."]/g, ' ').trim()}%`;
}

/** Texte de recherche comparé à une colonne `recherche` (minuscules, sans accents, comme `sans_accents` en base). */
export function sansAccents(texte: string): string {
    return texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Contenu d'une cellule : `<ng-template appCellule="nom" let-ligne>…</ng-template>`. */
@Directive({ selector: 'ng-template[appCellule]' })
export class CelluleTable {
    readonly appCellule = input.required<string>();
    readonly template = inject(TemplateRef);
}

/** Carte d'une ligne sous 640 px : `<ng-template appCarte let-ligne>…</ng-template>`. */
@Directive({ selector: 'ng-template[appCarte]' })
export class CarteTable {
    readonly template = inject(TemplateRef);
}

/**
 * Tableau de données (S3.4, LLD §2) : pagination, tri et recherche côté serveur (le chargeur interroge Supabase avec
 * `range`, `order`, `ilike` ou une RPC), tableau à partir de 640 px et cartes en dessous, états chargement / erreur /
 * vide. Les filtres propres à l'écran sont projetés (`[filtres]`) ; l'écran appelle `recharger()` quand ils changent ou
 * après une écriture. Les réponses périmées (recherche tapée vite) sont ignorées.
 */
@Component({
    selector: 'app-data-table',
    imports: [NgTemplateOutlet, TranslatePipe, IconSearch, EmptyState, Skeleton],
    template: `
        <div [class]="rechercheLibelle() ? 'mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]' : 'mb-4 grid gap-3'">
            @if (rechercheLibelle(); as libelle) {
                <label class="relative mb-0!">
                    <span class="sr-only">{{ libelle | translate }}</span>
                    <input
                        type="search"
                        class="form-input ltr:pl-10 rtl:pr-10"
                        maxlength="100"
                        [placeholder]="libelle | translate"
                        [value]="recherche()"
                        (input)="saisir($event)"
                    />
                    <icon-search
                        class="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted ltr:left-3 rtl:right-3 dark:text-night-muted"
                    />
                </label>
            }
            <div class="flex flex-wrap items-center gap-3">
                <ng-content select="[filtres]" />
            </div>
        </div>

        @if (erreur()) {
            <div class="grid gap-4">
                <div
                    class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                    role="alert"
                >
                    {{ 'table.erreur' | translate }}
                </div>
                <div>
                    <button type="button" class="btn btn-outline-primary" (click)="recharger()">{{ 'table.reessayer' | translate }}</button>
                </div>
            </div>
        } @else if (premierChargement()) {
            <app-skeleton [lignes]="5" />
        } @else if (total() === 0) {
            <app-empty-state [titre]="titreVide() | translate" [message]="messageVide() | translate" />
            @if (actionVide() && !recherche()) {
                <div class="mt-2 text-center">
                    <button type="button" class="btn btn-primary" (click)="actionVideClic.emit()">{{ actionVide()! | translate }}</button>
                </div>
            }
        } @else {
            <div [attr.aria-busy]="chargement()" [class.opacity-60]="chargement()">
                <div class="table-responsive hidden sm:block">
                    <table>
                        <thead>
                            <tr>
                                @for (col of colonnes(); track col.cle) {
                                    <th scope="col" [class]="col.classe ?? ''" [attr.aria-sort]="ariaTri(col)">
                                        @if (col.libelleMasque) {
                                            <span class="sr-only">{{ col.libelle | translate }}</span>
                                        } @else if (col.triable) {
                                            <button
                                                type="button"
                                                class="inline-flex min-h-11 items-center gap-1 font-semibold hover:text-primary"
                                                (click)="trier(col.cle)"
                                            >
                                                {{ col.libelle | translate }}
                                                <span aria-hidden="true">{{ fleche(col.cle) }}</span>
                                            </button>
                                        } @else {
                                            {{ col.libelle | translate }}
                                        }
                                    </th>
                                }
                            </tr>
                        </thead>
                        <tbody>
                            @for (ligne of lignes(); track identifiant()(ligne)) {
                                <tr>
                                    @for (col of colonnes(); track col.cle) {
                                        <td [class]="col.classe ?? ''">
                                            @if (cellule(col.cle); as tpl) {
                                                <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: ligne }" />
                                            } @else {
                                                {{ valeur(ligne, col.cle) }}
                                            }
                                        </td>
                                    }
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <ul class="m-0 grid list-none gap-3 p-0 sm:hidden">
                    @for (ligne of lignes(); track identifiant()(ligne)) {
                        <li class="rounded-md border border-white-light p-3 dark:border-night-border">
                            @if (carte(); as c) {
                                <ng-container [ngTemplateOutlet]="c.template" [ngTemplateOutletContext]="{ $implicit: ligne }" />
                            }
                        </li>
                    }
                </ul>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p class="m-0 text-sm text-muted dark:text-night-muted" aria-live="polite">
                    {{ 'table.plage' | translate: { debut: debut(), fin: fin(), total: total() } }}
                </p>
                <div class="flex gap-2">
                    <button
                        type="button"
                        class="btn btn-sm btn-outline-primary min-h-11"
                        [disabled]="page() === 0 || chargement()"
                        (click)="allerA(page() - 1)"
                    >
                        {{ 'table.precedent' | translate }}
                    </button>
                    <button
                        type="button"
                        class="btn btn-sm btn-outline-primary min-h-11"
                        [disabled]="fin() >= total() || chargement()"
                        (click)="allerA(page() + 1)"
                    >
                        {{ 'table.suivant' | translate }}
                    </button>
                </div>
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable<T> implements OnInit, OnDestroy {
    readonly colonnes = input.required<readonly ColonneTable[]>();
    readonly chargeur = input.required<(requete: RequeteTable) => Promise<PageTable<T>>>();
    readonly identifiant = input<(ligne: T) => string>((ligne) => (ligne as { id: string }).id);
    readonly taille = input(20);
    readonly triInitial = input<TriTable | null>(null);
    /** Clé de traduction du champ de recherche ; null = pas de recherche. */
    readonly rechercheLibelle = input<string | null>(null);
    readonly titreVide = input('table.vide_titre');
    readonly messageVide = input('table.vide_message');
    /** Libellé (clé) d'un bouton proposé quand la liste est vide sans recherche (ergonomie : guider). */
    readonly actionVide = input<string | null>(null);
    readonly actionVideClic = output<void>();

    private readonly cellules = contentChildren(CelluleTable);
    protected readonly carte = contentChild(CarteTable);

    protected readonly lignes = signal<readonly T[]>([]);
    protected readonly total = signal(0);
    protected readonly page = signal(0);
    protected readonly tri = signal<TriTable | null>(null);
    protected readonly recherche = signal('');
    protected readonly chargement = signal(false);
    protected readonly premierChargement = signal(true);
    protected readonly erreur = signal(false);
    protected readonly debut = computed(() => (this.total() === 0 ? 0 : this.page() * this.taille() + 1));
    protected readonly fin = computed(() => Math.min((this.page() + 1) * this.taille(), this.total()));

    private sequence = 0;
    private minuterie: ReturnType<typeof setTimeout> | undefined;

    ngOnInit(): void {
        this.tri.set(this.triInitial());
        void this.charger();
    }

    ngOnDestroy(): void {
        clearTimeout(this.minuterie);
    }

    /** Recharge la page courante (après une écriture) ou revient à la première (filtres changés). */
    async recharger(premierePage = false): Promise<void> {
        if (premierePage) {
            this.page.set(0);
        }
        await this.charger();
    }

    protected cellule(cle: string): TemplateRef<unknown> | null {
        return this.cellules().find((c) => c.appCellule() === cle)?.template ?? null;
    }

    protected valeur(ligne: T, cle: string): string {
        const v = (ligne as Record<string, unknown>)[cle];
        return v === null || v === undefined ? '' : String(v);
    }

    protected fleche(cle: string): string {
        const tri = this.tri();
        return tri?.cle === cle ? (tri.desc ? '↓' : '↑') : '';
    }

    protected ariaTri(col: ColonneTable): string | null {
        const tri = this.tri();
        return !col.triable ? null : tri?.cle !== col.cle ? 'none' : tri.desc ? 'descending' : 'ascending';
    }

    protected trier(cle: string): void {
        const tri = this.tri();
        this.tri.set({ cle, desc: tri?.cle === cle ? !tri.desc : false });
        void this.recharger(true);
    }

    protected saisir(evenement: Event): void {
        this.recherche.set((evenement.target as HTMLInputElement).value);
        clearTimeout(this.minuterie);
        this.minuterie = setTimeout(() => void this.recharger(true), 300);
    }

    protected allerA(page: number): void {
        this.page.set(Math.max(0, page));
        void this.charger();
    }

    private async charger(): Promise<void> {
        const numero = ++this.sequence;
        this.chargement.set(true);
        this.erreur.set(false);
        try {
            const resultat = await this.chargeur()({ page: this.page(), taille: this.taille(), tri: this.tri(), recherche: this.recherche().trim() });
            if (numero !== this.sequence) {
                return;
            }
            // Page devenue vide (dernière ligne supprimée) : revenir à la précédente.
            if (resultat.lignes.length === 0 && resultat.total > 0 && this.page() > 0) {
                this.page.set(Math.floor((resultat.total - 1) / this.taille()));
                await this.charger();
                return;
            }
            this.lignes.set(resultat.lignes);
            this.total.set(resultat.total);
        } catch {
            if (numero === this.sequence) {
                this.erreur.set(true);
            }
        } finally {
            if (numero === this.sequence) {
                this.chargement.set(false);
                this.premierChargement.set(false);
            }
        }
    }
}
