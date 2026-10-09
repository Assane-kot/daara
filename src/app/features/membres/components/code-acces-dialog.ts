import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { IconCopy } from '../../../shared/icon/icon-copy';
import { lienWhatsapp } from '../data/invitations.service';

interface DonneesCode {
    readonly nom: string;
    readonly code: string;
    readonly telephone: string | null;
}

/**
 * Code d'accès créé pour un membre (S2.6, ADR-006 niveau 2) : affiché une seule fois, Copier, WhatsApp (numéro du profil
 * s'il est connu, sinon l'admin choisit le contact), rappel de la validité. Aucun envoi automatique.
 */
@Component({
    selector: 'app-code-acces-dialog',
    imports: [TranslatePipe, IconCopy],
    template: `
        <div
            class="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg bg-white text-base text-black shadow-sm dark:bg-night dark:text-white-dark"
        >
            <div class="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 dark:bg-night-hover">
                <h2 id="code-acces-titre" class="text-lg font-bold dark:text-white-light">{{ 'membres.code.titre' | translate: { nom: d.nom } }}</h2>
                <button
                    type="button"
                    class="shrink-0 text-3xl leading-7 font-normal text-muted hover:text-black dark:text-night-muted dark:hover:text-white-light"
                    [attr.aria-label]="'commun.fermer' | translate"
                    (click)="fermer()"
                >
                    ×
                </button>
            </div>
            <div class="grid gap-4 overflow-y-auto px-5 py-5">
                <p class="m-0">{{ 'membres.code.intro' | translate: { nom: d.nom } }}</p>
                <p
                    class="m-0 rounded-md border border-white-light bg-gray-50 py-4 text-center font-mono text-3xl font-bold tracking-[0.2em] text-black select-all dark:border-night-border dark:bg-night-input dark:text-white-light"
                    translate="no"
                >
                    {{ d.code }}
                </p>
                <p class="m-0 text-sm text-muted dark:text-night-muted">{{ 'membres.code.validite' | translate }}</p>
                <div class="flex flex-col gap-3 sm:flex-row">
                    <button type="button" class="btn btn-outline-primary gap-2" (click)="copier()">
                        <icon-copy class="h-4 w-4" />
                        {{ (copie() ? 'membres.code.copie' : 'membres.code.copier') | translate }}
                    </button>
                    <a class="btn btn-primary" [href]="whatsapp()" target="_blank" rel="noopener noreferrer">{{ 'membres.code.whatsapp' | translate }}</a>
                </div>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeAccesDialog {
    private readonly dialogRef = inject(DialogRef);
    private readonly translate = inject(TranslateService);
    protected readonly d = inject<DonneesCode>(DIALOG_DATA);
    protected readonly copie = signal(false);

    protected readonly whatsapp = computed(() => {
        const message = this.translate.instant('membres.code.message', { code: this.d.code, lien: `${location.origin}/auth/code-acces` });
        return this.d.telephone ? lienWhatsapp(this.d.telephone, message) : `https://wa.me/?text=${encodeURIComponent(message)}`;
    });

    protected async copier(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.d.code);
            this.copie.set(true);
        } catch {
            // Presse-papiers refusé : le code reste affiché et sélectionnable.
            this.copie.set(false);
        }
    }

    protected fermer(): void {
        this.dialogRef.close();
    }
}

@Injectable({ providedIn: 'root' })
export class CodeAccesDialogService {
    private readonly dialog = inject(Dialog);

    async ouvrir(donnees: DonneesCode): Promise<void> {
        const ref = this.dialog.open(CodeAccesDialog, {
            data: donnees,
            ariaLabelledBy: 'code-acces-titre',
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            width: 'calc(100% - 2rem)',
            maxWidth: '30rem',
            maxHeight: 'calc(100dvh - 2rem)',
            backdropClass: 'bg-black/60',
        });
        await firstValueFrom(ref.closed);
    }
}
