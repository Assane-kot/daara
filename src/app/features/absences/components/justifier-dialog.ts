import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ErreurAbsences } from '../data/absences.service';

export interface DonneesJustifier {
    /** Phrase déjà traduite : « Absence d'Awa le 14 octobre (matin) ». */
    readonly titre: string;
    readonly motif: string | null;
    readonly envoyer: (motif: string) => Promise<void>;
}

/** Motifs proposés en un toucher (le parent peut compléter). */
export const MOTIFS_PROPOSES = ['malade', 'medecin', 'famille', 'voyage', 'transport'] as const;

/**
 * « Justifier l'absence » (S5.2, parent) : motifs courants en un toucher ou texte libre (300 caractères), un bouton.
 * La décision (justifiée ou non) revient à l'admin ou au titulaire.
 */
@Component({
    selector: 'app-justifier-dialog',
    imports: [TranslatePipe],
    template: `
        <div
            class="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg bg-white text-base text-black shadow-sm dark:bg-night dark:text-white-dark"
        >
            <div class="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 dark:bg-night-hover">
                <h2 id="justifier-titre" class="text-lg font-bold dark:text-white-light">{{ d.titre }}</h2>
                <button
                    type="button"
                    class="shrink-0 text-3xl leading-7 font-normal text-muted hover:text-black dark:text-night-muted dark:hover:text-white-light"
                    [attr.aria-label]="'commun.fermer' | translate"
                    (click)="ref.close(false)"
                >
                    ×
                </button>
            </div>
            <div class="grid gap-3 overflow-y-auto px-5 py-4">
                <p class="m-0 font-semibold">{{ 'absences.justifier.choisir' | translate }}</p>
                <div class="flex flex-wrap gap-2">
                    @for (m of motifs; track m) {
                        <button type="button" class="btn btn-sm btn-outline-primary min-h-11" (click)="choisir(m)">
                            {{ 'absences.justifier.motifs.' + m | translate }}
                        </button>
                    }
                </div>
                <label class="mb-0! grid gap-1.5 font-semibold" for="motif">{{ 'absences.justifier.motif' | translate }}</label>
                <textarea
                    id="motif"
                    class="form-textarea min-h-24 font-normal"
                    maxlength="300"
                    [value]="motif()"
                    (input)="motif.set($any($event.target).value)"
                ></textarea>
                <p class="m-0 text-xs text-muted dark:text-night-muted">{{ 'absences.justifier.aide' | translate: { n: 300 - motif().length } }}</p>
                @if (erreur(); as erreur) {
                    <div
                        class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                        role="alert"
                    >
                        {{ erreur | translate }}
                    </div>
                }
            </div>
            <div class="flex flex-col-reverse gap-3 border-t border-white-light px-5 py-3 sm:flex-row sm:justify-end dark:border-night-border">
                <button type="button" class="btn btn-outline-primary" (click)="ref.close(false)">{{ 'commun.annuler' | translate }}</button>
                <button type="button" class="btn btn-primary" [disabled]="envoi() || !motif().trim()" (click)="envoyer()">
                    @if (envoi()) {
                        <span class="auth-spinner ltr:mr-2 rtl:ml-2" aria-hidden="true"></span>
                    }
                    {{ 'absences.justifier.envoyer' | translate }}
                </button>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JustifierDialog {
    protected readonly ref = inject<DialogRef<boolean, JustifierDialog>>(DialogRef);
    protected readonly d = inject<DonneesJustifier>(DIALOG_DATA);
    private readonly translate = inject(TranslateService);
    protected readonly motifs = MOTIFS_PROPOSES;
    protected readonly motif = signal(this.d.motif ?? '');
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);

    protected choisir(m: (typeof MOTIFS_PROPOSES)[number]): void {
        const texte = this.libelle(m);
        const actuel = this.motif().trim();
        this.motif.set(actuel && !actuel.includes(texte) ? `${actuel}. ${texte}` : texte);
    }

    protected async envoyer(): Promise<void> {
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await this.d.envoyer(this.motif().trim());
            this.ref.close(true);
        } catch (e) {
            this.erreur.set(e instanceof ErreurAbsences ? e.cle : 'absences.erreurs.inattendue');
        } finally {
            this.envoi.set(false);
        }
    }

    private libelle(m: string): string {
        return this.translate.instant('absences.justifier.motifs.' + m);
    }
}

@Injectable({ providedIn: 'root' })
export class JustifierDialogService {
    private readonly dialog = inject(Dialog);

    async ouvrir(donnees: DonneesJustifier): Promise<boolean> {
        const ref = this.dialog.open<boolean, DonneesJustifier, JustifierDialog>(JustifierDialog, {
            data: donnees,
            ariaLabelledBy: 'justifier-titre',
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            width: 'calc(100% - 2rem)',
            maxWidth: '30rem',
            maxHeight: 'calc(100dvh - 2rem)',
            backdropClass: 'bg-black/60',
        });
        return (await firstValueFrom(ref.closed)) === true;
    }
}
