import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { HistoriqueAbsences } from '../absences/components/historique-absences';
import { MonEnfant, ParentsService } from '../apprenants/data/parents.service';

/**
 * `/d/:slug/enfants/:apprenantId` (S5.2, parent) : un enfant et ses absences, avec « Justifier ». S5.4 enrichit
 * l'accueil du parent ; les notes et bulletins s'ajouteront aux sprints 6 et 7.
 */
@Component({
    selector: 'app-enfant-page',
    imports: [RouterLink, TranslatePipe, Skeleton, HistoriqueAbsences],
    template: `
        <p class="mb-3">
            <a class="font-semibold text-primary hover:underline" routerLink="..">← {{ 'enfants.retour' | translate }}</a>
        </p>
        @if (chargement()) {
            <div class="panel"><app-skeleton [lignes]="3" /></div>
        } @else if (enfant(); as e) {
            <div class="panel">
                <h1 class="m-0 text-xl font-bold text-black dark:text-white-light">{{ e.prenom }} {{ e.nom }}</h1>
                <p class="m-0 mb-4 text-muted dark:text-night-muted">{{ e.classe ?? ('enfants.sans_classe' | translate) }}</p>
                @if (absencesActives()) {
                    <h2 class="m-0 mb-3 text-base font-bold dark:text-white-light">{{ 'absences.titre' | translate }}</h2>
                    <app-historique-absences [apprenantId]="e.id" [prenom]="e.prenom" mode="parent" />
                }
            </div>
        } @else {
            <div class="panel">
                <p class="m-0">{{ 'enfants.introuvable' | translate }}</p>
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnfantPage implements OnInit {
    private readonly parents = inject(ParentsService);
    private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('apprenantId') ?? '';
    private readonly courante = inject(CurrentDaaraService);
    protected readonly absencesActives = computed(() => this.courante.moduleActif('absences'));
    protected readonly enfant = signal<MonEnfant | null>(null);
    protected readonly chargement = signal(true);

    ngOnInit(): void {
        void this.charger();
    }

    private async charger(): Promise<void> {
        try {
            this.enfant.set((await this.parents.mesEnfants()).find((e) => e.id === this.id) ?? null);
        } catch {
            this.enfant.set(null);
        } finally {
            this.chargement.set(false);
        }
    }
}
