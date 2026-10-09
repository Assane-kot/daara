import { Routes } from '@angular/router';
import { authGuard, avecDaaraGuard, mfaGuard, sansDaaraGuard } from './core/auth/auth.guards';
import { daaraGuard, racineGuard } from './core/daara/daara.guards';

/*
 * Routage (LLD §2, §7.1 ter). Layouts chargés à la demande : chacun n'embarque que le sien (CDK Menu du header).
 * Guards : session, double authentification si requise, puis daara.
 */
export const routes: Routes = [
    {
        // Redirection vers la destination de l'utilisateur : connexion, mfa, onboarding, sa daara ou le sélecteur.
        path: '',
        pathMatch: 'full',
        canActivate: [racineGuard],
        children: [],
    },
    {
        path: 'd/:slug',
        loadComponent: () => import('./layouts/app-layout/app-layout').then((m) => m.AppLayout),
        canActivate: [authGuard, mfaGuard, daaraGuard],
        // Les mêmes enfants pour une autre daara : le layout et ses guards sont réévalués au changement de slug.
        runGuardsAndResolvers: 'paramsChange',
        children: [
            {
                path: '',
                pathMatch: 'full',
                title: 'titres.tableau_de_bord',
                loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
            },
            {
                path: 'membres',
                loadChildren: () => import('./features/membres/membres.routes').then((m) => m.MEMBRES_ROUTES),
            },
            {
                path: 'parametres',
                loadChildren: () => import('./features/parametres/parametres.routes').then((m) => m.PARAMETRES_ROUTES),
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
        path: 'select-daara',
        loadComponent: () => import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
        canActivate: [authGuard, mfaGuard, avecDaaraGuard],
        children: [
            {
                path: '',
                title: 'titres.select_daara',
                loadComponent: () => import('./features/select-daara/select-daara-page').then((m) => m.SelectDaaraPage),
            },
        ],
    },
    // Lien d'invitation (S2.5c) : public, connecté ou non ; le jeton est dans le fragment (LLD §7.1).
    {
        path: 'invitation',
        loadComponent: () => import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
        children: [
            {
                path: '',
                title: 'titres.invitation',
                loadComponent: () => import('./features/invitation/invitation-page').then((m) => m.InvitationPage),
            },
        ],
    },
    {
        path: 'auth',
        loadComponent: () => import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
    },
    {
        path: 'onboarding',
        loadComponent: () => import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
        // mfaGuard d'abord : en aal1 avec un facteur, la daara n'est pas lisible et sansDaaraGuard croirait à tort
        // l'utilisateur sans daara (audit S2.1, M1).
        canActivate: [authGuard, mfaGuard, sansDaaraGuard],
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
