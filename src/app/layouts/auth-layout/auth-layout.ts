import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Layout des pages publiques (connexion, inscription, mot de passe) : sans sidebar ni header. */
@Component({
    selector: 'app-auth-layout',
    imports: [RouterOutlet],
    template: `
        <div class="main-section relative font-nunito text-sm font-normal antialiased">
            <div class="min-h-screen text-black dark:text-white-dark">
                <router-outlet />
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {}
