import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../core/theme/theme.service';
import { IconLaptop } from '../../shared/icon/icon-laptop';
import { IconMenu } from '../../shared/icon/icon-menu';
import { IconMoon } from '../../shared/icon/icon-moon';
import { IconSun } from '../../shared/icon/icon-sun';
import { LayoutService } from '../layout.service';

@Component({
    // Sélecteur sur l'élément <header> : le CSS Vristo `.navbar-sticky header` le rend collant.
    selector: 'header[appHeader]',
    imports: [RouterLink, IconMenu, IconSun, IconMoon, IconLaptop],
    templateUrl: './header.html',
    host: { class: 'z-40 shadow-sm' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
    protected readonly layout = inject(LayoutService);
    protected readonly theme = inject(ThemeService);

    // Libellés provisoires : passeront dans les fichiers de traduction en S0.3.
    protected readonly themeLabels = {
        light: 'Thème clair (passer en sombre)',
        dark: 'Thème sombre (suivre le système)',
        system: 'Thème du système (passer en clair)',
    } as const;
}
