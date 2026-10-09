import { Routes } from '@angular/router';
import { anonymeGuard, authGuard } from '../../core/auth/auth.guards';

/** Pages /auth/* (LLD §2 « Routage », §7.0), affichées dans le layout « cover ». */
export const AUTH_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'connexion' },
    {
        path: 'connexion',
        title: 'titres.connexion',
        canActivate: [anonymeGuard],
        loadComponent: () => import('./pages/connexion/connexion-page').then((m) => m.ConnexionPage),
    },
    {
        path: 'inscription',
        title: 'titres.inscription',
        canActivate: [anonymeGuard],
        loadComponent: () => import('./pages/inscription/inscription-page').then((m) => m.InscriptionPage),
    },
    {
        path: 'confirmation',
        title: 'titres.confirmation',
        canActivate: [anonymeGuard],
        loadComponent: () => import('./pages/confirmation/confirmation-page').then((m) => m.ConfirmationPage),
    },
    {
        path: 'mot-de-passe-oublie',
        title: 'titres.mot_de_passe_oublie',
        canActivate: [anonymeGuard],
        loadComponent: () => import('./pages/mot-de-passe-oublie/mot-de-passe-oublie-page').then((m) => m.MotDePasseOubliePage),
    },
    {
        path: 'code-acces',
        title: 'titres.code_acces',
        canActivate: [anonymeGuard],
        loadComponent: () => import('./pages/code-acces/code-acces-page').then((m) => m.CodeAccesPage),
    },
    {
        path: 'mfa',
        title: 'titres.mfa',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/mfa/mfa-page').then((m) => m.MfaPage),
    },
];
