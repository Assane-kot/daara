import { Routes } from '@angular/router';
import { moduleGuard, roleGuard } from '../../core/daara/daara.guards';

/** `/d/:slug/appel` (S5.1, module `absences`) : enseignant (ses classes) et admin. La base revérifie tout. */
export const APPEL_ROUTES: Routes = [
    {
        path: '',
        title: 'titres.appel',
        canActivate: [moduleGuard('absences'), roleGuard(['admin', 'enseignant'])],
        loadComponent: () => import('./pages/appel-classes-page').then((m) => m.AppelClassesPage),
    },
    {
        path: ':classeId',
        title: 'titres.appel',
        canActivate: [moduleGuard('absences'), roleGuard(['admin', 'enseignant'])],
        loadComponent: () => import('./pages/appel-classe-page').then((m) => m.AppelClassePage),
    },
];
