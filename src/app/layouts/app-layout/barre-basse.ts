import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { IconMenuDashboard } from '../../shared/icon/icon-menu-dashboard';
import { MENU, barreBasseVisible } from './menu';

/**
 * Barre de navigation basse des parents et apprenants en mobile (< 640 px), à la place de la sidebar (LLD §2).
 * Affichée par AppLayout seulement pour ces profils ; masquée au-delà de 640 px par CSS.
 */
@Component({
    selector: 'app-barre-basse',
    imports: [RouterLink, RouterLinkActive, TranslatePipe, IconMenuDashboard],
    template: `
        <nav
            class="fixed inset-x-0 bottom-0 z-40 border-t border-white-light bg-white pb-[env(safe-area-inset-bottom)] sm:hidden dark:border-night-border dark:bg-night"
            [attr.aria-label]="'layout.navigation_mobile' | translate"
        >
            <ul class="m-0 flex list-none p-0">
                @for (entree of entrees(); track entree.route) {
                    <li class="flex-1">
                        <a
                            [routerLink]="entree.route ? [...base(), entree.route] : base()"
                            routerLinkActive="text-primary"
                            [routerLinkActiveOptions]="{ exact: !entree.route }"
                            class="flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold text-muted dark:text-night-muted"
                        >
                            @switch (entree.icone) {
                                @default {
                                    <icon-menu-dashboard class="h-5 w-5" />
                                }
                            }
                            <span>{{ entree.cle | translate }}</span>
                        </a>
                    </li>
                }
            </ul>
        </nav>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarreBasse {
    private readonly courante = inject(CurrentDaaraService);
    protected readonly entrees = computed(() => barreBasseVisible(MENU, this.courante.roles(), this.courante.modules()));
    protected readonly base = computed(() => ['/d', this.courante.slug() ?? '']);
}
