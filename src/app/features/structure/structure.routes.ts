import { Routes } from '@angular/router';
import { moduleGuard, roleGuard } from '../../core/daara/daara.guards';
import { StructurePage } from './structure-page';

/** `/d/:slug/structure` (sprint 3, module `structure`, ADR-008) : la base revérifie chaque écriture (admin aal2). */
export const STRUCTURE_ROUTES: Routes = [
    {
        path: '',
        component: StructurePage,
        canActivate: [moduleGuard('structure'), roleGuard(['admin'])],
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'annees' },
            {
                path: 'annees',
                title: 'titres.structure_annees',
                loadComponent: () => import('./pages/annees-page').then((m) => m.AnneesPage),
            },
        ],
    },
];
