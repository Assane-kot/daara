import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService, ROUTES_AUTH } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ThemeService } from '../../core/theme/theme.service';
import { IconLaptop } from '../../shared/icon/icon-laptop';
import { IconLogout } from '../../shared/icon/icon-logout';
import { IconMenu } from '../../shared/icon/icon-menu';
import { IconMoon } from '../../shared/icon/icon-moon';
import { IconSun } from '../../shared/icon/icon-sun';
import { LayoutService } from '../layout.service';

@Component({
    // Sélecteur sur l'élément <header> : le CSS Vristo `.navbar-sticky header` le rend collant.
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'header[appHeader]',
    imports: [RouterLink, TranslatePipe, CdkMenuTrigger, CdkMenu, CdkMenuItem, IconMenu, IconSun, IconMoon, IconLaptop, IconLogout],
    templateUrl: './header.html',
    host: { class: 'z-40 shadow-sm' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
    protected readonly layout = inject(LayoutService);
    protected readonly theme = inject(ThemeService);
    protected readonly language = inject(LanguageService);
    protected readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    /** Initiale affichée dans le bouton du compte. */
    protected readonly initiale = computed(() => this.auth.email().charAt(0) || '?');

    protected async deconnecter(): Promise<void> {
        try {
            await this.auth.deconnecter();
        } finally {
            await this.router.navigateByUrl(ROUTES_AUTH.connexion);
        }
    }
}
