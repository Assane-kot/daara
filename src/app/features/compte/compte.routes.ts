import { Routes } from '@angular/router';
import { ComptePage } from './compte-page';

/** `/d/:slug/compte` (S2.7) : tout utilisateur connecté, sur son propre compte uniquement. */
export const COMPTE_ROUTES: Routes = [
    {
        path: '',
        component: ComptePage,
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'profil' },
            { path: 'profil', title: 'titres.compte_profil', loadComponent: () => import('./pages/profil-page').then((m) => m.ProfilPage) },
            {
                path: 'mot-de-passe',
                title: 'titres.compte_mot_de_passe',
                loadComponent: () => import('./pages/mot-de-passe-page').then((m) => m.MotDePassePage),
            },
            { path: 'securite', title: 'titres.compte_securite', loadComponent: () => import('./pages/securite-page').then((m) => m.SecuritePage) },
        ],
    },
];
