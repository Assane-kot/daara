import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutService } from '../layout.service';
import { Footer } from './footer';
import { Header } from './header';
import { Sidebar } from './sidebar';

/** Hauteur de défilement (px) à partir de laquelle le bouton « Remonter » apparaît. */
const SCROLL_TOP_THRESHOLD = 50;

@Component({
    selector: 'app-app-layout',
    imports: [RouterOutlet, Header, Sidebar, Footer],
    templateUrl: './app-layout.html',
    host: { '(window:scroll)': 'onScroll()' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
    protected readonly layout = inject(LayoutService);
    private readonly document = inject(DOCUMENT);
    protected readonly showTopButton = signal(false);

    protected onScroll(): void {
        this.showTopButton.set((this.document.defaultView?.scrollY ?? 0) > SCROLL_TOP_THRESHOLD);
    }

    protected goToTop(): void {
        this.document.defaultView?.scrollTo({ top: 0 });
    }
}
