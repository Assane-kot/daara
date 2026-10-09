import { Routes } from '@angular/router';
import { moduleGuard, roleGuard } from '../../core/daara/daara.guards';
import { StructurePage } from './structure-page';

/**
 * `/d/:slug/structure` (sprint 3, module `structure`, ADR-008) : admin (écriture) et enseignant (lecture) ; Années
 * réservées à l'admin. La base revérifie chaque écriture (admin aal2).
 */
export const STRUCTURE_ROUTES: Routes = [
    {
        path: '',
        component: StructurePage,
        canActivate: [moduleGuard('structure'), roleGuard(['admin', 'enseignant'])],
        children: [
            // Onglet ouvert aux deux rôles (une redirection s'évalue avant les guards : rôles pas encore chargés).
            { path: '', pathMatch: 'full', redirectTo: 'classes' },
            {
                path: 'annees',
                title: 'titres.structure_annees',
                canActivate: [roleGuard(['admin'])],
                loadComponent: () => import('./pages/annees-page').then((m) => m.AnneesPage),
            },
            {
                path: 'classes',
                title: 'titres.structure_classes',
                loadComponent: () => import('./pages/classes-page').then((m) => m.ClassesPage),
            },
            {
                path: 'classes/:classeId',
                title: 'titres.structure_classe',
                loadComponent: () => import('./pages/classe-detail-page').then((m) => m.ClasseDetailPage),
            },
            {
                path: 'matieres',
                title: 'titres.structure_matieres',
                loadComponent: () => import('./pages/matieres-page').then((m) => m.MatieresPage),
            },
        ],
    },
];
