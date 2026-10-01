import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { ThemeService } from '../../core/theme/theme.service';
import { IconLaptop } from '../../shared/icon/icon-laptop';
import { IconMenu } from '../../shared/icon/icon-menu';
import { IconMoon } from '../../shared/icon/icon-moon';
import { IconSun } from '../../shared/icon/icon-sun';
import { LayoutService } from '../layout.service';

@Component({
    // Sélecteur sur l'élément <header> : le CSS Vristo `.navbar-sticky header` le rend collant.
    selector: 'header[appHeader]',
    imports: [RouterLink, TranslatePipe, IconMenu, IconSun, IconMoon, IconLaptop],
    templateUrl: './header.html',
    host: { class: 'z-40 shadow-sm' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
    protected readonly layout = inject(LayoutService);
    protected readonly theme = inject(ThemeService);
    protected readonly language = inject(LanguageService);
}
