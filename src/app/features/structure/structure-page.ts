import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { RoleMembre } from '../../core/daara/daara.model';
import { PageHeader } from '../../shared/ui/page-header/page-header';

const ONGLETS: readonly { route: string; cle: string; roles: readonly RoleMembre[] }[] = [
    { route: 'annees', cle: 'structure.onglets.annees', roles: ['admin'] },
    { route: 'matieres', cle: 'structure.onglets.matieres', roles: ['admin', 'enseignant'] },
];

/** Onglets de la structure scolaire (sprint 3) filtrés par rôle : Années (S3.1, admin), Matières (S3.2) ; Classes (S3.3). */
@Component({
    selector: 'app-structure-page',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, PageHeader],
    template: `
        <app-page-header [titre]="'structure.titre' | translate" />
        <nav class="mb-5 flex gap-2 overflow-x-auto border-b border-white-light dark:border-night-border" [attr.aria-label]="'structure.titre' | translate">
            @for (onglet of onglets(); track onglet.route) {
                <a
                    [routerLink]="onglet.route"
                    routerLinkActive="border-primary! text-primary"
                    ariaCurrentWhenActive="page"
                    class="-mb-px flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 font-semibold text-muted hover:text-primary dark:text-night-muted"
                >
                    {{ onglet.cle | translate }}
                </a>
            }
        </nav>
        <router-outlet />
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StructurePage {
    private readonly courante = inject(CurrentDaaraService);
    protected readonly onglets = computed(() => ONGLETS.filter((o) => o.roles.some((r) => this.courante.roles().includes(r))));
}
