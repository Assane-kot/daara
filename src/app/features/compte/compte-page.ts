import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../shared/ui/page-header/page-header';

/** Mon compte (S2.7) : onglets Profil, Mot de passe, Sécurité. */
@Component({
    selector: 'app-compte-page',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, PageHeader],
    template: `
        <app-page-header [titre]="'compte.titre' | translate" />
        <nav class="mb-5 flex gap-2 overflow-x-auto border-b border-white-light dark:border-night-border" [attr.aria-label]="'compte.titre' | translate">
            @for (onglet of onglets; track onglet.route) {
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
export class ComptePage {
    protected readonly onglets = [
        { route: 'profil', cle: 'compte.onglets.profil' },
        { route: 'mot-de-passe', cle: 'compte.onglets.mot_de_passe' },
        { route: 'securite', cle: 'compte.onglets.securite' },
    ] as const;
}
