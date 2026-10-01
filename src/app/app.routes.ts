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
                title: 'Tableau de bord | DAARA',
                loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
            },
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
