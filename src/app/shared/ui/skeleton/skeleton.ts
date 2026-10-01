import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/** Largeurs des lignes, en alternance, pour un rendu proche d'un texte réel. */
const LARGEURS = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3'] as const;

/**
 * Squelette de chargement (remplace le loader plein écran de Vristo) : annoncé aux lecteurs d'écran,
 * animation désactivée si l'utilisateur préfère réduire les animations.
 */
@Component({
    selector: 'app-skeleton',
    imports: [TranslatePipe],
    template: `
        <div class="motion-safe:animate-pulse" role="status" aria-live="polite">
            <span class="sr-only">{{ 'commun.chargement' | translate }}</span>
            @if (avecTitre()) {
                <div class="mb-4 h-5 w-1/3 rounded bg-white-light dark:bg-night-raised"></div>
            }
            <div class="space-y-3">
                @for (largeur of largeurs(); track $index) {
                    <div class="h-3.5 rounded bg-white-light dark:bg-night-raised" [class]="largeur"></div>
                }
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
    readonly lignes = input(3);
    readonly avecTitre = input(false);

    protected readonly largeurs = computed(() => Array.from({ length: this.lignes() }, (_, i) => LARGEURS[i % LARGEURS.length]));
}
