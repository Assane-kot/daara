import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initialiserSentry, signalerErreur } from './app/core/errors/sentry';
import { environment } from './environments/environment';

// Chargement différé du SDK (sans effet en local) ; les erreurs survenues avant sont mises en file.
void initialiserSentry(environment);

bootstrapApplication(App, appConfig).catch((err) => {
    console.error(err);
    signalerErreur(err);
});
