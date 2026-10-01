import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconCaretsDown } from '../../shared/icon/icon-carets-down';
import { IconMenuDashboard } from '../../shared/icon/icon-menu-dashboard';
import { LayoutService } from '../layout.service';

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive, TranslatePipe, IconCaretsDown, IconMenuDashboard],
    templateUrl: './sidebar.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
    protected readonly layout = inject(LayoutService);
}
