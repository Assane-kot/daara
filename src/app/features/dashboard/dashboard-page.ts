import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

// Page provisoire : les tableaux de bord par rôle arrivent au sprint 8.
@Component({
    selector: 'app-dashboard-page',
    imports: [TranslatePipe],
    template: `
        <div class="panel">
            <h1 class="text-lg font-semibold dark:text-white-light">{{ 'dashboard.titre' | translate }}</h1>
            <p class="mt-2 text-muted dark:text-night-muted">{{ 'dashboard.bienvenue' | translate }}</p>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {}
