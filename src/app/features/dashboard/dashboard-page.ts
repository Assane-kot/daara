import { ChangeDetectionStrategy, Component } from '@angular/core';

// Page provisoire : les tableaux de bord par rôle arrivent au sprint 8. Libellés traduits en S0.3.
@Component({
    selector: 'app-dashboard-page',
    template: `
        <div class="panel">
            <h1 class="text-lg font-semibold dark:text-white-light">Tableau de bord</h1>
            <p class="mt-2 text-white-dark">Bienvenue sur DAARA.</p>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {}
