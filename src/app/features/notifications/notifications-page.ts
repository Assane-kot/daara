import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { aujourdhui } from '../../core/dates';
import { LanguageService } from '../../core/i18n/language.service';
import { messageNotification } from '../../core/notifications/message-notification';
import { Notification, NotificationsService } from '../../core/notifications/notifications.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';

const TAILLE = 20;

/**
 * `/d/:slug/notifications` (S5.3) : toutes les notifications de la daara ouverte, non lues en gras ; un toucher ouvre le
 * lien et marque lue ; « Tout marquer comme lu » ; « Voir plus ». Nouvelles notifications ajoutées en direct.
 */
@Component({
    selector: 'app-notifications-page',
    imports: [TranslatePipe, EmptyState, PageHeader, Skeleton],
    template: `
        <app-page-header [titre]="'notifications.titre' | translate">
            @if (service.nonLues() > 0) {
                <button actions type="button" class="btn btn-outline-primary" (click)="toutLire()">{{ 'notifications.tout_lu' | translate }}</button>
            }
        </app-page-header>
        <div class="panel">
            @if (chargement()) {
                <app-skeleton [lignes]="5" />
            } @else if (erreur()) {
                <p class="m-0" role="alert">{{ 'notifications.erreur' | translate }}</p>
            } @else if (lignes().length === 0) {
                <app-empty-state [titre]="'notifications.vide_titre' | translate" [message]="'notifications.vide_message' | translate" />
            } @else {
                <ul class="m-0 grid list-none gap-2 p-0">
                    @for (n of lignes(); track n.id) {
                        <li>
                            <button
                                type="button"
                                class="flex min-h-14 w-full items-start gap-3 rounded-md border border-white-light px-3 py-2.5 text-left hover:border-primary/50 dark:border-night-border"
                                (click)="ouvrir(n)"
                            >
                                <span
                                    class="mt-2 h-2.5 w-2.5 shrink-0 rounded-full"
                                    [class]="n.lue ? 'bg-transparent' : 'bg-primary'"
                                    aria-hidden="true"
                                ></span>
                                <span class="min-w-0 flex-1">
                                    <span
                                        class="block"
                                        [class]="n.lue ? 'text-muted dark:text-night-muted' : 'font-semibold text-black dark:text-white-light'"
                                        >{{ message(n) }}</span
                                    >
                                    <span class="block text-xs text-muted dark:text-night-muted">{{ depuis(n.creeLe) }}</span>
                                </span>
                                @if (!n.lue) {
                                    <span class="sr-only">{{ 'notifications.non_lue' | translate }}</span>
                                }
                            </button>
                        </li>
                    }
                </ul>
                @if (lignes().length < total()) {
                    <div class="mt-4 text-center">
                        <button type="button" class="btn btn-outline-primary" (click)="plus()">{{ 'notifications.voir_plus' | translate }}</button>
                    </div>
                }
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
    protected readonly service = inject(NotificationsService);
    private readonly translate = inject(TranslateService);
    private readonly langue = inject(LanguageService).langue;
    private readonly router = inject(Router);

    protected readonly lignes = signal<Notification[]>([]);
    protected readonly total = signal(0);
    protected readonly chargement = signal(true);
    protected readonly erreur = signal(false);

    constructor() {
        // Au chargement, puis à chaque nouvelle notification (signal Realtime) : relire ce qui est affiché.
        effect(() => {
            this.service.version();
            void this.charger(
                Math.max(
                    TAILLE,
                    untracked(() => this.lignes().length),
                ),
            );
        });
    }

    protected message(n: Notification): string {
        return messageNotification(n, this.translate, this.langue(), aujourdhui());
    }

    protected depuis(iso: string): string {
        return new Intl.DateTimeFormat(this.langue() === 'en' ? 'en-GB' : 'fr-FR', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Africa/Dakar',
        }).format(new Date(iso));
    }

    protected async ouvrir(n: Notification): Promise<void> {
        await this.service.marquerLue(n);
        await this.router.navigate(this.service.lien(n));
    }

    protected async toutLire(): Promise<void> {
        await this.service.toutMarquerLu();
        await this.charger(Math.max(TAILLE, this.lignes().length));
    }

    protected async plus(): Promise<void> {
        await this.charger(this.lignes().length + TAILLE);
    }

    private async charger(nombre: number): Promise<void> {
        try {
            const r = await this.service.page(0, nombre);
            this.lignes.set(r.lignes);
            this.total.set(r.total);
            this.erreur.set(false);
        } catch {
            this.erreur.set(true);
        } finally {
            this.chargement.set(false);
        }
    }
}
