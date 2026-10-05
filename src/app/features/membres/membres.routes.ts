import { Routes } from '@angular/router';
import { roleGuard } from '../../core/daara/daara.guards';

/**
 * `/d/:slug/membres` (LLD §2) : admin uniquement (l'enseignant ne lit pas le profil de ses collègues) ; la base
 * revérifie chaque écriture (`changer_role`, `definir_actif` : admin aal2). Onglet Invitations : S2.5.
 */
export const MEMBRES_ROUTES: Routes = [
    {
        path: '',
        title: 'titres.membres',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./pages/liste/membres-page').then((m) => m.MembresPage),
    },
];
