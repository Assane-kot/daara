import { Routes } from '@angular/router';
import { moduleGuard, roleGuard } from '../../core/daara/daara.guards';
import { ParametresPage } from './parametres-page';

/** `/d/:slug/parametres` (LLD §2) : admin uniquement ; la base revérifie chaque écriture (aal2). */
export const PARAMETRES_ROUTES: Routes = [
    {
        path: '',
        component: ParametresPage,
        canActivate: [roleGuard(['admin'])],
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'general' },
            {
                path: 'general',
                title: 'titres.parametres_general',
                loadComponent: () => import('./pages/general/general-page').then((m) => m.GeneralPage),
            },
            {
                path: 'absences',
                title: 'titres.parametres_absences',
                canActivate: [moduleGuard('absences')],
                loadComponent: () => import('./pages/absences/absences-reglages-page').then((m) => m.AbsencesReglagesPage),
            },
            {
                path: 'notes',
                title: 'titres.parametres_notes',
                canActivate: [moduleGuard('notes')],
                loadComponent: () => import('./pages/notes/notes-reglages-page').then((m) => m.NotesReglagesPage),
            },
            {
                path: 'modules',
                title: 'titres.parametres_modules',
                loadComponent: () => import('./pages/modules/modules-page').then((m) => m.ModulesPage),
            },
        ],
    },
];
