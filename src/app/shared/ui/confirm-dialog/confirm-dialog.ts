import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface ConfirmationOptions {
    /** Textes déjà traduits. */
    readonly titre: string;
    readonly message: string;
    /** Libellés des boutons ; par défaut « Confirmer » / « Annuler » traduits. */
    readonly libelleConfirmer?: string;
    readonly libelleAnnuler?: string;
    /** Action destructrice (suppression…) : bouton de confirmation rouge. */
    readonly danger?: boolean;
}

export interface ConfirmDialogData extends ConfirmationOptions {
    readonly titreId: string;
    readonly messageId: string;
}

/**
 * Contenu de la modale de confirmation (markup des modales Vristo), ouverte par `ConfirmDialogService`.
 * Le focus initial va sur « Annuler » (`data-autofocus`) : une validation accidentelle au clavier est évitée.
 */
@Component({
    selector: 'app-confirm-dialog',
    imports: [TranslatePipe],
    template: `
        <div class="relative overflow-hidden rounded-lg bg-white text-base text-black shadow-sm dark:bg-night dark:text-white-dark">
            <div class="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 dark:bg-night-hover">
                <h2 class="text-lg font-bold dark:text-white-light" [id]="data.titreId">{{ data.titre }}</h2>
                <button
                    type="button"
                    class="shrink-0 text-3xl leading-7 font-normal text-muted hover:text-black dark:text-night-muted dark:hover:text-white-light"
                    [attr.aria-label]="'commun.fermer' | translate"
                    (click)="fermer(false)"
                >
                    ×
                </button>
            </div>
            <div class="px-5 pt-5">
                <p [id]="data.messageId">{{ data.message }}</p>
            </div>
            <div class="mt-8 flex flex-col-reverse gap-3 px-5 pb-5 sm:flex-row sm:justify-end">
                <button type="button" class="btn btn-outline-primary" data-autofocus (click)="fermer(false)">
                    {{ data.libelleAnnuler ?? ('commun.annuler' | translate) }}
                </button>
                <button type="button" class="btn" [class]="data.danger ? 'btn-danger' : 'btn-primary'" (click)="fermer(true)">
                    {{ data.libelleConfirmer ?? ('commun.confirmer' | translate) }}
                </button>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
    protected readonly data = inject<ConfirmDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject<DialogRef<boolean, ConfirmDialog>>(DialogRef);

    protected fermer(confirme: boolean): void {
        this.dialogRef.close(confirme);
    }
}
