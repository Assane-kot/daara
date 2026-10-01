import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconInfoCircle } from '../../icon/icon-info-circle';

/**
 * État vide d'une liste ou d'un écran (markup Vristo « No data available ») :
 * `<app-empty-state titre="..." message="..."><button ...>Ajouter</button></app-empty-state>`.
 */
@Component({
    selector: 'app-empty-state',
    imports: [IconInfoCircle],
    template: `
        <div class="grid min-h-[200px] place-content-center justify-items-center gap-2 px-4 py-8 text-center">
            <div class="mb-2 rounded-full text-primary ring-4 ring-primary/30">
                <icon-info-circle class="h-10 w-10" />
            </div>
            <p class="text-lg font-semibold text-black dark:text-white-light">{{ titre() }}</p>
            @if (message()) {
                <p class="max-w-md text-muted dark:text-night-muted">{{ message() }}</p>
            }
            <div class="mt-3">
                <ng-content />
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
    /** Textes déjà traduits. */
    readonly titre = input.required<string>();
    readonly message = input<string>();
}
