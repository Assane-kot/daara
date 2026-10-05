import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../shared/ui/page-header/page-header';

/** Onglets des paramètres de la daara (admin) : Général (S2.3) et Modules (S2.2, ADR-008). */
export const ONGLETS_PARAMETRES = [{ route: 'modules', cle: 'parametres.onglets.modules' }] as const;

@Component({
    selector: 'app-parametres-page',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, PageHeader],
    template: `
        <app-page-header [titre]="'parametres.titre' | translate" />
        <nav class="mb-5 flex gap-2 border-b border-white-light dark:border-night-border" [attr.aria-label]="'parametres.titre' | translate">
            @for (onglet of onglets; track onglet.route) {
                <a
                    [routerLink]="onglet.route"
                    routerLinkActive="border-primary! text-primary"
                    ariaCurrentWhenActive="page"
                    class="-mb-px flex min-h-11 items-center border-b-2 border-transparent px-3 font-semibold text-muted hover:text-primary dark:text-night-muted"
                >
                    {{ onglet.cle | translate }}
                </a>
            }
        </nav>
        <router-outlet />
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametresPage {
    protected readonly onglets = ONGLETS_PARAMETRES;
}
