import { Routes } from '@angular/router';
import { roleGuard } from '../../core/daara/daara.guards';

/** `/d/:slug/apprenants` (sprint 4, socle) : admin ; enseignant en lecture (élèves de ses classes, S4.2) ; import CSV (S4.4, admin). La base revérifie tout. */
export const APPRENANTS_ROUTES: Routes = [
    {
        path: '',
        title: 'titres.apprenants',
        canActivate: [roleGuard(['admin', 'enseignant'])],
        loadComponent: () => import('./pages/apprenants-page').then((m) => m.ApprenantsPage),
    },
    {
        path: 'import',
        title: 'titres.import',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./pages/import-page').then((m) => m.ImportPage),
    },
    {
        path: ':apprenantId',
        title: 'titres.apprenant',
        canActivate: [roleGuard(['admin', 'enseignant'])],
        loadComponent: () => import('./pages/apprenant-page').then((m) => m.ApprenantPage),
    },
];
