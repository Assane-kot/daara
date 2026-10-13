import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, OnInit, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { InviterDialogService } from '../../membres/components/inviter-dialog';
import { ErreurApprenants } from '../data/apprenants.service';
import { LIENS_PARENT, LienParent, ParentMembre, ParentRelie, ParentsService } from '../data/parents.service';

interface DonneesRelier {
    readonly enfant: string;
    readonly parents: readonly ParentMembre[];
}

/** Choix de la modale « Ajouter un parent » : un parent existant, ou une invitation (avec le lien choisi). */
export type ChoixParent =
    { readonly mode: 'existant'; readonly parentId: string; readonly lien: LienParent } | { readonly mode: 'inviter'; readonly lien: LienParent };

/** Modale « Ajouter un parent » (S4.3) : lien (père, mère, tuteur), parent déjà inscrit ou « Inviter un nouveau parent ». */
@Component({
    selector: 'app-relier-parent-dialog',
    imports: [TranslatePipe],
    template: `
        <div
            class="relative flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg bg-white text-base text-black shadow-sm dark:bg-night dark:text-white-dark"
        >
            <div class="flex items-center justify-between gap-4 bg-gray-50 px-5 py-3 dark:bg-night-hover">
                <h2 id="relier-titre" class="text-lg font-bold dark:text-white-light">{{ 'parents.ajouter_pour' | translate: { nom: d.enfant } }}</h2>
                <button
                    type="button"
                    class="shrink-0 text-3xl leading-7 font-normal text-muted hover:text-black dark:text-night-muted dark:hover:text-white-light"
                    [attr.aria-label]="'commun.fermer' | translate"
                    (click)="ref.close()"
                >
                    ×
                </button>
            </div>
            <div class="grid gap-4 overflow-y-auto px-5 py-5">
                <fieldset class="m-0 border-0 p-0">
                    <legend class="mb-1.5 font-semibold">{{ 'parents.lien' | translate }}</legend>
                    <div class="grid grid-cols-3 gap-2">
                        @for (l of liens; track l) {
                            <label
                                class="mb-0! flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-white-light text-sm font-bold has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary dark:border-night-border"
                            >
                                <input class="sr-only" type="radio" name="lien" [value]="l" [checked]="lien() === l" (change)="lien.set(l)" />
                                {{ 'parents.liens.' + l | translate }}
                            </label>
                        }
                    </div>
                </fieldset>

                @if (d.parents.length > 0) {
                    <label class="mb-0! grid gap-1.5 font-semibold">
                        {{ 'parents.parent_inscrit' | translate }}
                        <select class="form-select font-normal" [value]="parentId()" (change)="parentId.set($any($event.target).value)">
                            <option value="">{{ 'parents.choisir_parent' | translate }}</option>
                            @for (p of d.parents; track p.userId) {
                                <option [value]="p.userId">{{ p.nom || ('membres.sans_nom' | translate) }}{{ p.telephone ? ' · ' + p.telephone : '' }}</option>
                            }
                        </select>
                    </label>
                    <button type="button" class="btn btn-primary" [disabled]="!lien() || !parentId()" (click)="relier()">
                        {{ 'parents.relier' | translate }}
                    </button>
                    <p class="m-0 text-center text-sm text-muted dark:text-night-muted">{{ 'parents.ou' | translate }}</p>
                }
                <button type="button" class="btn btn-outline-primary" [disabled]="!lien()" (click)="inviter()">
                    {{ 'parents.inviter_nouveau' | translate }}
                </button>
                @if (!lien()) {
                    <p class="m-0 text-sm text-muted dark:text-night-muted">{{ 'parents.choisir_lien' | translate }}</p>
                }
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelierParentDialog {
    protected readonly ref = inject<DialogRef<ChoixParent, RelierParentDialog>>(DialogRef);
    protected readonly d = inject<DonneesRelier>(DIALOG_DATA);
    protected readonly liens = LIENS_PARENT;
    protected readonly lien = signal<LienParent | null>(null);
    protected readonly parentId = signal('');

    protected relier(): void {
        const lien = this.lien();
        if (lien && this.parentId()) {
            this.ref.close({ mode: 'existant', parentId: this.parentId(), lien });
        }
    }

    protected inviter(): void {
        const lien = this.lien();
        if (lien) {
            this.ref.close({ mode: 'inviter', lien });
        }
    }
}

@Injectable({ providedIn: 'root' })
export class RelierParentDialogService {
    private readonly dialog = inject(Dialog);

    async ouvrir(donnees: DonneesRelier): Promise<ChoixParent | undefined> {
        const ref = this.dialog.open<ChoixParent, DonneesRelier, RelierParentDialog>(RelierParentDialog, {
            data: donnees,
            ariaLabelledBy: 'relier-titre',
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            width: 'calc(100% - 2rem)',
            maxWidth: '30rem',
            maxHeight: 'calc(100dvh - 2rem)',
            backdropClass: 'bg-black/60',
        });
        return firstValueFrom(ref.closed);
    }
}

/**
 * Parents d'un enfant, sur sa fiche (S4.3, admin) : liste (lien, téléphone), « Ajouter un parent » (parent déjà inscrit
 * ou invitation : l'enfant est relié à l'acceptation), « Retirer ».
 */
@Component({
    selector: 'app-parents-enfant',
    imports: [TranslatePipe],
    template: `
        <section class="mt-6 border-t border-white-light pt-5 dark:border-night-border" aria-labelledby="parents-titre">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 id="parents-titre" class="m-0 text-base font-bold dark:text-white-light">{{ 'parents.titre' | translate }}</h3>
                <button type="button" class="btn btn-sm btn-primary min-h-11" [disabled]="enCours()" (click)="ajouter()">
                    {{ 'parents.ajouter' | translate }}
                </button>
            </div>
            @if (erreur(); as erreur) {
                <div
                    class="mb-3 rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                    role="alert"
                >
                    {{ erreur | translate }}
                </div>
            }
            @if (succes(); as succes) {
                <div class="mb-3 rounded-md border border-primary/30 bg-primary/10 p-3.5 text-black dark:text-white-light" role="status">
                    {{ succes | translate }}
                </div>
            }
            @if (parents().length === 0) {
                <p class="m-0 text-muted dark:text-night-muted">{{ 'parents.aucun' | translate }}</p>
            } @else {
                <ul class="m-0 grid list-none gap-2 p-0">
                    @for (p of parents(); track p.lienId) {
                        <li class="flex flex-wrap items-center gap-3 rounded-md border border-white-light p-3 dark:border-night-border">
                            <div class="min-w-0 flex-1 basis-48">
                                <p class="m-0 font-semibold text-black dark:text-white-light">{{ p.nom || ('membres.sans_nom' | translate) }}</p>
                                <p class="m-0 text-sm text-muted dark:text-night-muted">
                                    {{ 'parents.liens.' + p.lien | translate }}{{ p.telephone ? ' · ' + p.telephone : '' }}
                                </p>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-danger min-h-11" [disabled]="enCours()" (click)="retirer(p)">
                                {{ 'parents.retirer' | translate }}
                            </button>
                        </li>
                    }
                </ul>
            }
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentsEnfant implements OnInit {
    readonly apprenantId = input.required<string>();
    readonly nomEnfant = input.required<string>();

    private readonly service = inject(ParentsService);
    private readonly relierDialog = inject(RelierParentDialogService);
    private readonly inviterDialog = inject(InviterDialogService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);

    protected readonly parents = signal<ParentRelie[]>([]);
    protected readonly enCours = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);
    private readonly dejaRelies = computed(() => new Set(this.parents().map((p) => p.parentId)));

    ngOnInit(): void {
        void this.charger();
    }

    protected async ajouter(): Promise<void> {
        this.erreur.set(null);
        this.succes.set(null);
        this.enCours.set(true);
        try {
            const membres = (await this.service.parentsMembres()).filter((p) => !this.dejaRelies().has(p.userId));
            const choix = await this.relierDialog.ouvrir({ enfant: this.nomEnfant(), parents: membres });
            if (choix?.mode === 'existant') {
                await this.service.relier(this.apprenantId(), choix.parentId, choix.lien);
                this.succes.set('parents.relie_ok');
                await this.charger();
            } else if (choix?.mode === 'inviter') {
                const invite = await this.inviterDialog.ouvrir({
                    pourEnfant: {
                        nom: this.nomEnfant(),
                        apresInvitation: (invitation) => this.service.rattacherInvitation(invitation.id, this.apprenantId(), choix.lien),
                    },
                });
                if (invite) {
                    this.succes.set('parents.invite_ok');
                }
            }
        } catch (e) {
            this.erreur.set(e instanceof ErreurApprenants ? e.cle : 'parents.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }

    protected async retirer(p: ParentRelie): Promise<void> {
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('parents.confirmer_retrait', { nom: p.nom, enfant: this.nomEnfant() }),
            message: this.translate.instant('parents.confirmer_retrait_message'),
            libelleConfirmer: this.translate.instant('parents.retirer'),
        });
        if (!confirme) {
            return;
        }
        this.enCours.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await this.service.delier(p.lienId);
            this.succes.set('parents.retire_ok');
            await this.charger();
        } catch (e) {
            this.erreur.set(e instanceof ErreurApprenants ? e.cle : 'parents.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }

    private async charger(): Promise<void> {
        try {
            this.parents.set(await this.service.parentsDe(this.apprenantId()));
        } catch (e) {
            this.erreur.set(e instanceof ErreurApprenants ? e.cle : 'parents.erreurs.inattendue');
        }
    }
}
