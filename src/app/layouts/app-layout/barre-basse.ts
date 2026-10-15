import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { IconBell } from '../../shared/icon/icon-bell';
import { IconMenuDashboard } from '../../shared/icon/icon-menu-dashboard';
import { IconUser } from '../../shared/icon/icon-user';
import { MENU, barreBasseVisible } from './menu';

/**
 * Barre de navigation basse des parents et apprenants en mobile (< 640 px), à la place de la sidebar (LLD §2).
 * Affichée par AppLayout seulement pour ces profils ; masquée au-delà de 640 px par CSS.
 */
@Component({
    selector: 'app-barre-basse',
    imports: [RouterLink, RouterLinkActive, TranslatePipe, IconMenuDashboard, IconUser, IconBell],
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
                                @case ('eleves') {
                                    <icon-user class="h-5 w-5" />
                                }
                                @case ('notifications') {
                                    <span class="relative">
                                        <icon-bell class="h-5 w-5" />
                                        @if (notifications.nonLues() > 0) {
                                            <span
                                                class="absolute -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-0.5 text-[10px] leading-none font-bold text-white ltr:-right-2 rtl:-left-2"
                                                aria-hidden="true"
                                                >{{ notifications.nonLues() > 99 ? '99+' : notifications.nonLues() }}</span
                                            >
                                        }
                                    </span>
                                }
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
    protected readonly notifications = inject(NotificationsService);
    protected readonly entrees = computed(() => barreBasseVisible(MENU, this.courante.roles(), this.courante.modules()));
    protected readonly base = computed(() => ['/d', this.courante.slug() ?? '']);
}
