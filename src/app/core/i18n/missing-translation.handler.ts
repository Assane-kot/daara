import { Injectable } from '@angular/core';
import { MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';

/** Clé absente des fichiers de traduction : signalée dans la console en développement, clé affichée telle quelle. */
@Injectable()
export class DevMissingTranslationHandler implements MissingTranslationHandler {
    handle(params: MissingTranslationHandlerParams): string {
        if (ngDevMode) {
            console.warn(`[i18n] Clé de traduction manquante : ${params.key}`);
        }
        return params.key;
    }
}
