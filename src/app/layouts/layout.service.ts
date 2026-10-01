import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/** Largeur à partir de laquelle la sidebar est affichée en permanence (breakpoint `lg` de Tailwind). */
const LG_BREAKPOINT = 1024;

/**
 * État de la sidebar. Sous `lg`, `sidebarToggled` = sidebar ouverte ;
 * à partir de `lg`, `sidebarToggled` = sidebar repliée (comportement Vristo).
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
    private readonly document = inject(DOCUMENT);
    private readonly toggled = signal(false);

    readonly sidebarToggled = this.toggled.asReadonly();

    toggleSidebar(): void {
        this.toggled.update((value) => !value);
    }

    /** Referme la sidebar après un clic sur un lien, uniquement en mobile. */
    closeSidebarOnMobile(): void {
        if ((this.document.defaultView?.innerWidth ?? 0) < LG_BREAKPOINT) {
            this.toggled.set(false);
        }
    }
}
