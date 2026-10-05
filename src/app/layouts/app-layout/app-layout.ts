import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { LayoutService } from '../layout.service';
import { BarreBasse } from './barre-basse';
import { Footer } from './footer';
import { Header } from './header';
import { Sidebar } from './sidebar';

/** Hauteur de défilement (px) à partir de laquelle le bouton « Remonter » apparaît. */
const SCROLL_TOP_THRESHOLD = 50;

@Component({
    selector: 'app-app-layout',
    imports: [RouterOutlet, TranslatePipe, Header, Sidebar, Footer, BarreBasse],
    templateUrl: './app-layout.html',
    host: { '(window:scroll)': 'onScroll()' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
    protected readonly layout = inject(LayoutService);
    /** Parents et apprenants : barre basse en mobile à la place de la sidebar (LLD §2). */
    protected readonly famille = inject(CurrentDaaraService).famille;
    private readonly document = inject(DOCUMENT);
    protected readonly showTopButton = signal(false);

    protected onScroll(): void {
        this.showTopButton.set((this.document.defaultView?.scrollY ?? 0) > SCROLL_TOP_THRESHOLD);
    }

    protected goToTop(): void {
        this.document.defaultView?.scrollTo({ top: 0 });
    }
}
