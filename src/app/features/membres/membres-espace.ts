import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconUserPlus } from '../../shared/icon/icon-user-plus';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { InviterDialogService } from './components/inviter-dialog';

/** `/d/:slug/membres` : en-tête, bouton « Inviter », onglets Membres et Invitations (spec membres, invitations). */
@Component({
    selector: 'app-membres-espace',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, PageHeader, IconUserPlus],
    template: `
        <app-page-header [titre]="'membres.titre' | translate">
            <button actions type="button" class="btn btn-primary gap-2" (click)="inviter()">
                <icon-user-plus class="h-5 w-5" />
                {{ 'invitations.inviter.ouvrir' | translate }}
            </button>
        </app-page-header>
        <nav class="mb-5 flex gap-2 border-b border-white-light dark:border-night-border" [attr.aria-label]="'membres.titre' | translate">
            @for (onglet of onglets; track onglet.route) {
                <a
                    [routerLink]="onglet.route"
                    routerLinkActive="border-primary! text-primary"
                    [routerLinkActiveOptions]="{ exact: true }"
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
export class MembresEspace {
    private readonly dialog = inject(InviterDialogService);
    protected readonly onglets = [
        { route: './', cle: 'membres.onglets.membres' },
        { route: 'invitations', cle: 'membres.onglets.invitations' },
    ] as const;

    protected inviter(): void {
        void this.dialog.ouvrir();
    }
}
