import { Routes } from '@angular/router';
import { roleGuard } from '../../core/daara/daara.guards';
import { MembresEspace } from './membres-espace';

/**
 * `/d/:slug/membres` (LLD §2) : admin uniquement (l'enseignant ne lit pas le profil de ses collègues) ; la base
 * revérifie chaque écriture (RPC membres et invitations : admin aal2). Onglets : Membres, Invitations (S2.5c).
 */
export const MEMBRES_ROUTES: Routes = [
    {
        path: '',
        component: MembresEspace,
        canActivate: [roleGuard(['admin'])],
        children: [
            {
                path: '',
                title: 'titres.membres',
                loadComponent: () => import('./pages/liste/membres-page').then((m) => m.MembresPage),
            },
            {
                path: 'invitations',
                title: 'titres.invitations',
                loadComponent: () => import('./pages/invitations/invitations-page').then((m) => m.InvitationsPage),
            },
        ],
    },
];
