import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ROUTES_AUTH } from '../../core/auth/auth.service';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { IconCaretsDown } from '../../shared/icon/icon-carets-down';
import { IconMenuDashboard } from '../../shared/icon/icon-menu-dashboard';
import { IconSettings } from '../../shared/icon/icon-settings';
import { IconBook } from '../../shared/icon/icon-book';
import { IconUser } from '../../shared/icon/icon-user';
import { IconUsers } from '../../shared/icon/icon-users';
import { LayoutService } from '../layout.service';
import { MENU, menuVisible } from './menu';

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive, TranslatePipe, IconCaretsDown, IconMenuDashboard, IconSettings, IconUsers, IconBook, IconUser],
    templateUrl: './sidebar.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
    protected readonly layout = inject(LayoutService);
    protected readonly courante = inject(CurrentDaaraService);
    protected readonly selectionDaara = ROUTES_AUTH.selectionDaara;

    /** Menu filtré par les rôles et les modules de la daara ouverte (LLD §2). */
    protected readonly entrees = computed(() => menuVisible(MENU, this.courante.roles(), this.courante.modules()));
    protected readonly base = computed(() => ['/d', this.courante.slug() ?? '']);
}
