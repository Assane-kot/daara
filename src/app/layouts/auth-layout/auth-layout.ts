import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { ThemeService } from '../../core/theme/theme.service';
import { IconLaptop } from '../../shared/icon/icon-laptop';
import { IconMoon } from '../../shared/icon/icon-moon';
import { IconSun } from '../../shared/icon/icon-sun';

/**
 * Layout « cover » des pages publiques et de l'onboarding (maquette validée le 2026-10-03) : panneau de
 * présentation vert profond avec motif géométrique or (étoile à 8 branches du logo), formulaire à droite.
 * En mobile, le panneau se réduit à un bandeau au-dessus du formulaire.
 */
@Component({
    selector: 'app-auth-layout',
    imports: [RouterOutlet, TranslatePipe, IconSun, IconMoon, IconLaptop],
    templateUrl: './auth-layout.html',
    styleUrl: './auth-layout.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
    protected readonly theme = inject(ThemeService);
    protected readonly language = inject(LanguageService);
}
