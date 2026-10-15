import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { DemarrageGuide } from './demarrage-guide';

// Page provisoire : les tableaux de bord par rôle arrivent au sprint 8. Admin : démarrage guidé (S4.5).
@Component({
    selector: 'app-dashboard-page',
    imports: [TranslatePipe, PageHeader, DemarrageGuide],
    template: `
        <app-page-header [titre]="courante.daara()?.nom ?? ('dashboard.titre' | translate)" />
        @if (message(); as message) {
            <div
                class="mb-4 rounded-md border border-warning/40 bg-warning-light p-3.5 text-warning-strong dark:bg-warning-dark-light dark:text-warning"
                role="status"
            >
                {{ message | translate }}
            </div>
        }
        @if (courante.hasRole('admin')) {
            <app-demarrage-guide />
        }
        <div class="panel">
            <p class="text-muted dark:text-night-muted">{{ 'dashboard.bienvenue' | translate }}</p>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
    protected readonly courante = inject(CurrentDaaraService);
    /** Message laissé par un guard (accès refusé), affiché une seule fois. */
    protected readonly message = signal<string | null>(null);

    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    ngOnInit(): void {
        // Parent : son accueil est « Mes enfants » (S5.4), sauf s'il faut d'abord lui montrer un message d'accès refusé.
        if (this.courante.famille() && this.courante.hasRole('parent') && !this.courante.message()) {
            void this.router.navigate(['enfants'], { relativeTo: this.route, replaceUrl: true });
            return;
        }
        this.message.set(this.courante.message());
        this.courante.message.set(null);
    }
}
