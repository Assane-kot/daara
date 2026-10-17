import { Routes } from '@angular/router';
import { moduleGuard, roleGuard } from '../../core/daara/daara.guards';

/** `/d/:slug/notes` (sprint 6, module `notes`) : enseignant et admin. La base revérifie tout. */
export const NOTES_ROUTES: Routes = [
    {
        path: '',
        title: 'titres.notes',
        canActivate: [moduleGuard('notes'), roleGuard(['admin', 'enseignant'])],
        loadComponent: () => import('./pages/notes-page').then((m) => m.NotesPage),
    },
    {
        path: 'evaluations/:id',
        title: 'titres.saisie_notes',
        canActivate: [moduleGuard('notes'), roleGuard(['admin', 'enseignant'])],
        loadComponent: () => import('./pages/saisie-notes-page').then((m) => m.SaisieNotesPage),
    },
];
