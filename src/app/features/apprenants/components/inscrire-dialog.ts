import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { sansAccents } from '../../../shared/ui/data-table/data-table';
import { ErreurApprenants } from '../data/apprenants.service';
import { Candidat } from '../data/inscriptions.service';

interface DonneesInscrire {
    readonly classeNom: string;
    readonly candidats: readonly Candidat[];
    readonly inscrire: (ids: readonly string[]) => Promise<void>;
}

/**
 * « Inscrire des élèves » (S4.2) : élèves sans classe cette année, recherche sans accents, cases à cocher, « Tout
 * sélectionner », un seul clic pour inscrire la sélection.
 */
@Component({
    selector: 'app-inscrire-dialog',
    imports: [TranslatePipe],
    template: `
        <div
            class="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg bg-white text-base text-black shadow-sm dark:bg-night dark:text-white-dark"
        >
            <div class="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 dark:bg-night-hover">
                <h2 id="inscrire-titre" class="text-lg font-bold dark:text-white-light">
                    {{ 'inscriptions.inscrire_dans' | translate: { classe: d.classeNom } }}
                </h2>
                <button
                    type="button"
                    class="shrink-0 text-3xl leading-7 font-normal text-muted hover:text-black dark:text-night-muted dark:hover:text-white-light"
                    [attr.aria-label]="'commun.fermer' | translate"
                    (click)="ref.close(false)"
                >
                    ×
                </button>
            </div>
            <div class="grid min-h-0 gap-3 overflow-y-auto px-5 py-4">
                @if (d.candidats.length === 0) {
                    <p class="m-0">{{ 'inscriptions.aucun_candidat' | translate }}</p>
                } @else {
                    <input
                        type="search"
                        class="form-input"
                        [placeholder]="'apprenants.rechercher' | translate"
                        [attr.aria-label]="'apprenants.rechercher' | translate"
                        (input)="filtre.set($any($event.target).value)"
                    />
                    <label class="mb-0! flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
                        <input type="checkbox" class="form-checkbox" [checked]="tousCoches()" (change)="toutCocher()" />
                        {{ 'inscriptions.tout_selectionner' | translate: { n: visibles().length } }}
                    </label>
                    <ul class="m-0 grid max-h-80 list-none gap-1 overflow-y-auto p-0">
                        @for (c of visibles(); track c.id) {
                            <li>
                                <label class="mb-0! flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 font-normal hover:bg-primary/10">
                                    <input type="checkbox" class="form-checkbox" [checked]="choisis().has(c.id)" (change)="basculer(c.id)" />
                                    <span class="min-w-0 flex-1 truncate">{{ c.prenom }} {{ c.nom }}</span>
                                    <span class="font-mono text-xs text-muted dark:text-night-muted">{{ c.matricule }}</span>
                                </label>
                            </li>
                        }
                    </ul>
                }
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
                <button type="button" class="btn btn-primary" [disabled]="envoi() || choisis().size === 0" (click)="valider()">
                    @if (envoi()) {
                        <span class="auth-spinner ltr:mr-2 rtl:ml-2" aria-hidden="true"></span>
                    }
                    {{ 'inscriptions.inscrire_n' | translate: { n: choisis().size } }}
                </button>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InscrireDialog {
    protected readonly ref = inject<DialogRef<boolean, InscrireDialog>>(DialogRef);
    protected readonly d = inject<DonneesInscrire>(DIALOG_DATA);
    protected readonly filtre = signal('');
    protected readonly choisis = signal<ReadonlySet<string>>(new Set());
    protected readonly visibles = computed(() => {
        const f = sansAccents(this.filtre().trim());
        return this.d.candidats.filter((c) => !f || sansAccents(`${c.prenom} ${c.nom} ${c.matricule}`).includes(f));
    });
    protected readonly tousCoches = computed(() => this.visibles().length > 0 && this.visibles().every((c) => this.choisis().has(c.id)));
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);

    protected basculer(id: string): void {
        const s = new Set(this.choisis());
        if (!s.delete(id)) {
            s.add(id);
        }
        this.choisis.set(s);
    }

    protected toutCocher(): void {
        const s = new Set(this.choisis());
        const cocher = !this.tousCoches();
        for (const c of this.visibles()) {
            if (cocher) {
                s.add(c.id);
            } else {
                s.delete(c.id);
            }
        }
        this.choisis.set(s);
    }

    protected async valider(): Promise<void> {
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await this.d.inscrire([...this.choisis()]);
            this.ref.close(true);
        } catch (e) {
            this.erreur.set(e instanceof ErreurApprenants ? e.cle : 'inscriptions.erreurs.inattendue');
        } finally {
            this.envoi.set(false);
        }
    }
}

@Injectable({ providedIn: 'root' })
export class InscrireDialogService {
    private readonly dialog = inject(Dialog);

    async ouvrir(donnees: DonneesInscrire): Promise<boolean> {
        const ref = this.dialog.open<boolean, DonneesInscrire, InscrireDialog>(InscrireDialog, {
            data: donnees,
            ariaLabelledBy: 'inscrire-titre',
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            width: 'calc(100% - 2rem)',
            maxWidth: '34rem',
            maxHeight: 'calc(100dvh - 2rem)',
            backdropClass: 'bg-black/60',
        });
        return (await firstValueFrom(ref.closed)) === true;
    }
}
