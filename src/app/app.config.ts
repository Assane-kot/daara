import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideMissingTranslationHandler, provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { LANGUE_PAR_DEFAUT, LanguageService } from './core/i18n/language.service';
import { DevMissingTranslationHandler } from './core/i18n/missing-translation.handler';
import { TranslatedTitleStrategy } from './core/i18n/translated-title.strategy';
import { SupabaseService } from './core/supabase/supabase.service';
import { ThemeService } from './core/theme/theme.service';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideHttpClient(withFetch()),
        provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
        { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
        provideTranslateService({
            fallbackLang: LANGUE_PAR_DEFAUT,
            loader: provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' }),
            missingTranslationHandler: provideMissingTranslationHandler(DevMissingTranslationHandler),
        }),
        // Avant le premier rendu : thème appliqué et traductions chargées (pas d'affichage des clés brutes).
        provideAppInitializer(() => {
            inject(ThemeService);
            if (ngDevMode) {
                // Diagnostic non bloquant : rappelle de lancer la base locale.
                void inject(SupabaseService)
                    .verifierConnexion()
                    .then((ok) => ok || console.warn('[supabase] API injoignable : lancez `npm run db:start` (Docker Desktop requis).'));
            }
            return inject(LanguageService).init();
        }),
    ],
};
