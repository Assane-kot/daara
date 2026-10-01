import { ErrorHandler, Injectable } from '@angular/core';
import { signalerErreur } from './sentry';

/**
 * Gestionnaire d'erreurs global : journal dans la console (comme le gestionnaire par défaut d'Angular)
 * et transmission à Sentry lorsqu'il est actif (Cloudflare). Les données personnelles sont retirées
 * avant envoi (`nettoyerEvenement`).
 */
@Injectable()
export class DaaraErrorHandler implements ErrorHandler {
    handleError(erreur: unknown): void {
        console.error(erreur);
        signalerErreur(erreur);
    }
}
