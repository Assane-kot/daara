import { Dialog } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData, ConfirmationOptions } from './confirm-dialog';

let prochainId = 0;

/**
 * Demande de confirmation accessible (CDK Dialog : focus piégé, Échap, retour du focus, scroll bloqué).
 *
 * ```ts
 * if (await this.confirmation.confirmer({ titre, message, danger: true })) { ... }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
    private readonly dialog = inject(Dialog);

    /** Résout `true` si l'utilisateur confirme ; `false` s'il annule, ferme ou appuie sur Échap. */
    async confirmer(options: ConfirmationOptions): Promise<boolean> {
        const id = ++prochainId;
        const data: ConfirmDialogData = { ...options, titreId: `confirmation-titre-${id}`, messageId: `confirmation-message-${id}` };

        const ref = this.dialog.open<boolean, ConfirmDialogData, ConfirmDialog>(ConfirmDialog, {
            data,
            role: 'alertdialog',
            ariaLabelledBy: data.titreId,
            ariaDescribedBy: data.messageId,
            autoFocus: '[data-autofocus]',
            restoreFocus: true,
            width: 'calc(100% - 2rem)',
            maxWidth: '32rem',
            backdropClass: 'bg-black/60',
        });

        return (await firstValueFrom(ref.closed)) === true;
    }
}
