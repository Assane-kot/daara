import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Badge } from '../../../../shared/ui/badge/badge';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { InviterDialogService } from '../../components/inviter-dialog';
import { ErreurInvitations, InvitationListee, InvitationsService } from '../../data/invitations.service';
import { VARIANTE_ROLE } from '../liste/membres-page';

/** Onglet Invitations : en attente et expirées ; Renvoyer (nouveau lien) et Révoquer (confirmation). */
@Component({
    selector: 'app-invitations-page',
    imports: [TranslatePipe, Badge, Skeleton, EmptyState],
    template: `
        <div class="panel">
            @if (chargement()) {
                <app-skeleton [lignes]="4" />
            } @else if (erreurChargement()) {
                <div class="grid gap-4">
                    <div
                        class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                        role="alert"
                    >
                        {{ 'invitations.erreurs.chargement' | translate }}
                    </div>
                    <div>
                        <button type="button" class="btn btn-outline-primary" (click)="charger()">{{ 'membres.reessayer' | translate }}</button>
                    </div>
                </div>
            } @else {
                @if (erreur(); as erreur) {
                    <div
                        class="mb-4 rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                        role="alert"
                    >
                        {{ erreur | translate }}
                    </div>
                }
                @if (invitations().length === 0) {
                    <app-empty-state [titre]="'invitations.vide.titre' | translate" [message]="'invitations.vide.message' | translate" />
                } @else {
                    <ul class="m-0 grid list-none gap-3 p-0">
                        @for (inv of invitations(); track inv.id) {
                            <li class="flex flex-wrap items-center gap-3 rounded-md border border-white-light p-3 dark:border-night-border">
                                <div class="min-w-0 flex-1">
                                    <p class="m-0 truncate font-semibold text-black dark:text-white-light">{{ nom(inv) }}</p>
                                    <p class="m-0 truncate text-sm text-muted dark:text-night-muted">{{ inv.email ?? inv.telephone }}</p>
                                    <div class="mt-2 flex flex-wrap gap-1.5">
                                        <app-badge [variante]="variante[inv.role]">{{ 'roles.' + inv.role | translate }}</app-badge>
                                        <app-badge [variante]="inv.expiree ? 'warning' : 'info'">{{
                                            (inv.expiree ? 'invitations.etat.expiree' : 'invitations.etat.en_attente') | translate: { date: date(inv.expireLe) }
                                        }}</app-badge>
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <button
                                        type="button"
                                        class="btn btn-sm btn-outline-primary min-h-11"
                                        [disabled]="enCours() !== null"
                                        (click)="renvoyer(inv)"
                                    >
                                        {{ 'invitations.actions.renvoyer' | translate }}
                                    </button>
                                    <button
                                        type="button"
                                        class="btn btn-sm btn-outline-danger min-h-11"
                                        [disabled]="enCours() !== null"
                                        (click)="revoquer(inv)"
                                    >
                                        {{ 'invitations.actions.revoquer' | translate }}
                                    </button>
                                </div>
                            </li>
                        }
                    </ul>
                }
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationsPage {
    private readonly service = inject(InvitationsService);
    private readonly dialog = inject(InviterDialogService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);
    private readonly langue = inject(LanguageService).langue;

    protected readonly invitations = signal<InvitationListee[]>([]);
    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly enCours = signal<string | null>(null);
    protected readonly variante = VARIANTE_ROLE;

    constructor() {
        // Recharge à l'ouverture et après chaque invitation créée ou révoquée (modale « Inviter » comprise).
        effect(() => {
            this.service.version();
            void this.charger();
        });
    }

    protected async charger(): Promise<void> {
        this.erreurChargement.set(false);
        try {
            this.invitations.set(await this.service.lister());
        } catch {
            this.erreurChargement.set(true);
        } finally {
            this.chargement.set(false);
        }
    }

    protected nom(inv: InvitationListee): string {
        return `${inv.prenom ?? ''} ${inv.nom ?? ''}`.trim() || this.translate.instant('invitations.sans_nom');
    }

    protected date(iso: string): string {
        return new Intl.DateTimeFormat(this.langue() === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'medium', timeZone: 'Africa/Dakar' }).format(new Date(iso));
    }

    protected async renvoyer(inv: InvitationListee): Promise<void> {
        await this.agir(inv, async () => {
            const resultat = await this.service.renvoyer(inv);
            void this.dialog.ouvrir({ resultat, destinataire: inv.email ?? inv.telephone ?? '' });
        });
    }

    protected async revoquer(inv: InvitationListee): Promise<void> {
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('invitations.confirmer.titre', { nom: this.nom(inv) }),
            message: this.translate.instant('invitations.confirmer.message'),
            libelleConfirmer: this.translate.instant('invitations.actions.revoquer'),
            danger: true,
        });
        if (confirme) {
            await this.agir(inv, () => this.service.revoquer(inv.id));
        }
    }

    private async agir(inv: InvitationListee, action: () => Promise<void>): Promise<void> {
        this.enCours.set(inv.id);
        this.erreur.set(null);
        try {
            await action();
        } catch (e) {
            this.erreur.set(e instanceof ErreurInvitations ? e.cle : 'invitations.erreurs.inattendue');
        } finally {
            this.enCours.set(null);
        }
    }
}
