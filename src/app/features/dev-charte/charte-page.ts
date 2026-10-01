import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Swatch {
    readonly label: string;
    readonly className: string;
}

// Classes écrites en entier pour que Tailwind les génère.
const PRIMARY: readonly Swatch[] = [
    { label: '50', className: 'bg-primary-50' },
    { label: '100', className: 'bg-primary-100' },
    { label: '200', className: 'bg-primary-200' },
    { label: '300', className: 'bg-primary-300' },
    { label: '400', className: 'bg-primary-400' },
    { label: '500', className: 'bg-primary-500' },
    { label: '600', className: 'bg-primary-600' },
    { label: '700', className: 'bg-primary-700' },
    { label: '800', className: 'bg-primary-800' },
    { label: '900', className: 'bg-primary-900' },
    { label: '950', className: 'bg-primary-950' },
];

const SECONDARY: readonly Swatch[] = [
    { label: '50', className: 'bg-secondary-50' },
    { label: '100', className: 'bg-secondary-100' },
    { label: '200', className: 'bg-secondary-200' },
    { label: '300', className: 'bg-secondary-300' },
    { label: '400', className: 'bg-secondary-400' },
    { label: '500', className: 'bg-secondary-500' },
    { label: '600', className: 'bg-secondary-600' },
    { label: '700', className: 'bg-secondary-700' },
    { label: '800', className: 'bg-secondary-800' },
    { label: '900', className: 'bg-secondary-900' },
    { label: '950', className: 'bg-secondary-950' },
];

/**
 * Page de référence de la charte (S0.2), servie uniquement en développement (`/dev/charte`).
 * Sert à valider le rendu clair / sombre ; à retirer une fois la charte validée.
 */
@Component({
    selector: 'app-charte-page',
    templateUrl: './charte-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartePage {
    protected readonly primary = PRIMARY;
    protected readonly secondary = SECONDARY;
}
