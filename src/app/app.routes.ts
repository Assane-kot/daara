import { Routes } from '@angular/router';
import { AppLayout } from './layouts/app-layout/app-layout';
import { AuthLayout } from './layouts/auth-layout/auth-layout';

export const routes: Routes = [
    {
        path: '',
        component: AppLayout,
        children: [
            {
                path: '',
                pathMatch: 'full',
                title: 'titres.tableau_de_bord',
                loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
            },
            // Page de référence de la charte (S0.2) : développement uniquement (`ngDevMode` vaut false en build de
            // production, la route et son chunk sont alors supprimés). À retirer après validation.
            ...(ngDevMode
                ? [
                      {
                          path: 'dev/charte',
                          title: 'titres.charte',
                          loadComponent: () => import('./features/dev-charte/charte-page').then((m) => m.ChartePage),
                      },
                  ]
                : []),
        ],
    },
    {
        path: 'auth',
        component: AuthLayout,
        // Pages de connexion, inscription, mot de passe : sprint 1.
        children: [],
    },
    { path: '**', redirectTo: '' },
];
