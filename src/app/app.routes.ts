import { Routes } from '@angular/router';
import { authGuard, avecDaaraGuard, mfaGuard, sansDaaraGuard } from './core/auth/auth.guards';

export const routes: Routes = [
    {
        path: '',
        // Chargé à la demande comme le layout « cover » : chacun n'embarque que son layout (CDK Menu du header).
        loadComponent: () => import('./layouts/app-layout/app-layout').then((m) => m.AppLayout),
        // Session, double authentification si requise (admin : aal2), au moins une daara (LLD §7.0).
        canActivate: [authGuard, mfaGuard, avecDaaraGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                title: 'titres.tableau_de_bord',
                loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
            },
            // Page de référence de la charte (S0.2) : développement uniquement (`ngDevMode` vaut false en build de
            // production, la route et son chunk sont alors supprimés). À retirer après validation.
            // Forme `typeof … || ngDevMode` : la variable n'est définie qu'à la première définition de composant, après
            // l'évaluation de ce fichier quand les layouts sont chargés à la demande.
            ...(typeof ngDevMode === 'undefined' || ngDevMode
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
        // Layout « cover » chargé à la demande : absent du chargement initial de l'espace connecté.
        loadComponent: () => import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
    },
    {
        path: 'onboarding',
        loadComponent: () => import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
        canActivate: [authGuard, sansDaaraGuard],
        children: [
            {
                path: '',
                title: 'titres.onboarding',
                loadComponent: () => import('./features/onboarding/onboarding-page').then((m) => m.OnboardingPage),
            },
        ],
    },
    { path: '**', redirectTo: '' },
];
