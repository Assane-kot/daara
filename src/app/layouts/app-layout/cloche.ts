import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { aujourdhui } from '../../core/dates';
import { LanguageService } from '../../core/i18n/language.service';
import { messageNotification } from '../../core/notifications/message-notification';
import { Notification, NotificationsService } from '../../core/notifications/notifications.service';
import { IconBell } from '../../shared/icon/icon-bell';

/**
 * Cloche de l'en-tête (S5.3, module `notifications`) : pastille du nombre de non lues, 10 dernières notifications
 * (un toucher ouvre le lien et marque lue), « Tout marquer comme lu », « Voir toutes les notifications ».
 */
@Component({
    selector: 'app-cloche',
    imports: [RouterLink, TranslatePipe, CdkMenuTrigger, CdkMenu, CdkMenuItem, IconBell],
    template: `
        @if (service.actif()) {
            <button
                type="button"
                class="icon-btn relative"
                [cdkMenuTriggerFor]="menu"
                [attr.aria-label]="'notifications.cloche' | translate: { n: service.nonLues() }"
            >
                <icon-bell />
                @if (service.nonLues() > 0) {
                    <span
                        class="absolute -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] leading-none font-bold text-white ltr:-right-0.5 rtl:-left-0.5"
                        aria-hidden="true"
                        >{{ service.nonLues() > 99 ? '99+' : service.nonLues() }}</span
                    >
                }
            </button>
            <ng-template #menu>
                <div
                    cdkMenu
                    class="mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-white-light bg-white p-1.5 shadow-lg dark:border-night-border dark:bg-night-raised"
                >
                    <div class="flex items-center justify-between gap-2 px-2 py-1.5">
                        <span class="font-bold text-black dark:text-white-light">{{ 'notifications.titre' | translate }}</span>
                        @if (service.nonLues() > 0) {
                            <button
                                type="button"
                                cdkMenuItem
                                class="min-h-11 text-sm font-semibold text-primary hover:underline"
                                (cdkMenuItemTriggered)="toutLire()"
                            >
                                {{ 'notifications.tout_lu' | translate }}
                            </button>
                        }
                    </div>
                    @for (n of service.recentes(); track n.id) {
                        <button
                            type="button"
                            cdkMenuItem
                            class="flex min-h-11 w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-primary/10"
                            (cdkMenuItemTriggered)="ouvrir(n)"
                        >
                            <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" [class]="n.lue ? 'bg-transparent' : 'bg-primary'" aria-hidden="true"></span>
                            <span [class]="n.lue ? 'text-muted dark:text-night-muted' : 'font-semibold text-black dark:text-white-light'">{{
                                message(n)
                            }}</span>
                        </button>
                    } @empty {
                        <p class="m-0 px-2 py-3 text-sm text-muted dark:text-night-muted">{{ 'notifications.vide' | translate }}</p>
                    }
                    <a
                        cdkMenuItem
                        class="mt-1 block rounded-md px-2 py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary/10"
                        [routerLink]="lienPage()"
                    >
                        {{ 'notifications.voir_tout' | translate }}
                    </a>
                </div>
            </ng-template>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cloche {
    protected readonly service = inject(NotificationsService);
    private readonly translate = inject(TranslateService);
    private readonly langue = inject(LanguageService).langue;
    private readonly router = inject(Router);

    protected message(n: Notification): string {
        return messageNotification(n, this.translate, this.langue(), aujourdhui());
    }

    protected lienPage(): unknown[] {
        return this.service.lienPage();
    }

    protected async ouvrir(n: Notification): Promise<void> {
        await this.service.marquerLue(n);
        await this.router.navigate(this.service.lien(n));
    }

    protected async toutLire(): Promise<void> {
        await this.service.toutMarquerLu();
    }
}
