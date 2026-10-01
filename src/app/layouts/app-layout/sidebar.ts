import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconCaretsDown } from '../../shared/icon/icon-carets-down';
import { IconMenuDashboard } from '../../shared/icon/icon-menu-dashboard';
import { LayoutService } from '../layout.service';

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive, IconCaretsDown, IconMenuDashboard],
    templateUrl: './sidebar.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
    protected readonly layout = inject(LayoutService);
}
