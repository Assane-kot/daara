import { SignauxDaaraService } from '../../core/daara/signaux-daara.service';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { ApprenantsService } from '../apprenants/data/apprenants.service';
import { MonEnfant, ParentsService } from '../apprenants/data/parents.service';

interface CarteEnfant extends MonEnfant {
    readonly photoUrl: string | null;
}

/**
 * « Mes enfants » (S4.3, parent) : une carte par enfant relié (photo, nom, classe de l'année). Les absences, notes et
 * bulletins s'y ajouteront aux sprints 5 à 7.
 */
@Component({
    selector: 'app-mes-enfants-page',
    imports: [TranslatePipe, EmptyState, PageHeader, Skeleton],
    template: `
        <app-page-header [titre]="'enfants.titre' | translate" />
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
            <ul class="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
                @for (e of enfants(); track e.id) {
                    <li class="panel flex items-center gap-4">
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

    constructor() {
        // Mise à jour automatique quand un autre profil modifie ces données (S5.0b).
        inject(SignauxDaaraService).surveiller(['parent_links', 'apprenants', 'inscriptions', 'classes'], () => this.charger(true));
    }

    protected readonly enfants = signal<CarteEnfant[]>([]);
    protected readonly chargement = signal(true);
    protected readonly erreur = signal(false);

    ngOnInit(): void {
        void this.charger();
    }

    protected async charger(silencieux = false): Promise<void> {
        this.chargement.set(!silencieux);
        this.erreur.set(false);
        try {
            const enfants = await this.parents.mesEnfants();
            this.enfants.set(await Promise.all(enfants.map(async (e) => ({ ...e, photoUrl: await this.apprenants.urlPhoto(e.photoPath) }))));
        } catch {
            this.erreur.set(true);
        } finally {
            this.chargement.set(false);
        }
    }
}
