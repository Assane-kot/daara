import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeVariante = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark';

/*
 * Badges « doux » (fond teinté + texte foncé) : les badges pleins Vristo (blanc sur vert, rouge, orange, bleu)
 * n'atteignent pas le contraste AA en petit texte (2,3 à 3,7). Contrastes mesurés ≥ 4,7 en clair et en sombre.
 * Classes écrites en entier pour que Tailwind les génère.
 */
const CLASSES: Record<BadgeVariante, string> = {
    primary: 'bg-primary-light text-primary-700 dark:bg-primary-dark-light dark:text-primary',
    secondary: 'bg-secondary-light text-secondary-800 dark:bg-secondary-dark-light dark:text-secondary',
    success: 'bg-success-light text-success-strong dark:bg-success-dark-light dark:text-success',
    danger: 'bg-danger-light text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft',
    warning: 'bg-warning-light text-warning-strong dark:bg-warning-dark-light dark:text-warning',
    info: 'bg-info-light text-info-strong dark:bg-info-dark-light dark:text-info',
    dark: 'bg-dark-light text-dark dark:bg-dark-dark-light dark:text-dark-soft',
};

/** Badge de statut : `<app-badge variante="success">Présent</app-badge>`. */
@Component({
    selector: 'app-badge',
    template: '<ng-content />',
    host: { '[class]': 'classes()' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
    readonly variante = input<BadgeVariante>('primary');

    protected readonly classes = computed(() => `inline-block rounded px-2 py-0.5 text-xs font-semibold ${CLASSES[this.variante()]}`);
}
