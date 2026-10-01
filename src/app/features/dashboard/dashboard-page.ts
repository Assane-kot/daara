import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../shared/ui/page-header/page-header';

// Page provisoire : les tableaux de bord par rôle arrivent au sprint 8.
@Component({
    selector: 'app-dashboard-page',
    imports: [TranslatePipe, PageHeader],
    template: `
        <app-page-header [titre]="'dashboard.titre' | translate" />
        <div class="panel">
            <p class="text-muted dark:text-night-muted">{{ 'dashboard.bienvenue' | translate }}</p>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {}
