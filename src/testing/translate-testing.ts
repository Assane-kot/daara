import { Provider } from '@angular/core';
import { TranslateLoader, TranslationObject, provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import en from '../../public/i18n/en.json';
import fr from '../../public/i18n/fr.json';

/** Traductions réelles de l'application, servies sans HTTP pour les tests unitaires. */
export const TRADUCTIONS: Readonly<Record<string, TranslationObject>> = { fr, en };

class StaticTranslateLoader implements TranslateLoader {
    getTranslation(lang: string): Observable<TranslationObject> {
        return of(TRADUCTIONS[lang] ?? {});
    }
}

/** À ajouter aux `providers` de TestBed pour tout composant qui utilise le pipe `translate`. */
export function provideTranslateTesting(): Provider[] {
    return provideTranslateService({
        lang: 'fr',
        fallbackLang: 'fr',
        loader: provideTranslateLoader(StaticTranslateLoader),
    });
}
