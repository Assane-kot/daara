import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService, ROUTES_AUTH } from '../../../../core/auth/auth.service';
import { MfaPanel, ModeMfa } from '../../components/mfa-panel';

/** /auth/mfa : code TOTP après connexion, ou enrôlement imposé à un admin sans facteur (ADR-006). */
@Component({
    selector: 'app-mfa-page',
    imports: [TranslatePipe, MfaPanel],
    template: `
        <div class="auth-carte">
            <p class="auth-surtitre">{{ 'auth.mfa.surtitre' | translate }}</p>
            @if (mode() === 'enrolement') {
                <h1 class="auth-titre">{{ 'auth.mfa.titre_enrolement' | translate }}</h1>
                <p class="auth-intro">{{ 'auth.mfa.intro_enrolement' | translate }}</p>
            } @else {
                <h1 class="auth-titre">{{ 'auth.mfa.titre_verification' | translate }}</h1>
                <p class="auth-intro">{{ 'auth.mfa.intro_verification' | translate }}</p>
            }

            <app-mfa-panel (mode)="mode.set($event)" (valide)="continuer()" />

            <p class="auth-bas">
                <button type="button" class="auth-lien min-h-11" (click)="changerDeCompte()">{{ 'auth.mfa.autre_compte' | translate }}</button>
            </p>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaPage {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly mode = signal<ModeMfa>('verification');

    protected async continuer(): Promise<void> {
        await this.router.navigateByUrl(await this.auth.destination());
    }

    protected async changerDeCompte(): Promise<void> {
        try {
            await this.auth.deconnecter();
        } finally {
            await this.router.navigateByUrl(ROUTES_AUTH.connexion);
        }
    }
}
