import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService, routeDaara } from '../../core/auth/auth.service';
import { cleErreurAuth } from '../../core/auth/erreurs-auth';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { DaaraAccessible } from '../../core/daara/daara.model';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';

/** `/select-daara` : choix de la daara pour un membre de plusieurs daaras (LLD §7.1 ter). */
@Component({
    selector: 'app-select-daara-page',
    imports: [RouterLink, TranslatePipe, Skeleton],
    template: `
        <div class="auth-carte">
            <p class="auth-surtitre">{{ 'select_daara.surtitre' | translate }}</p>
            <h1 class="auth-titre">{{ 'select_daara.titre' | translate }}</h1>
            <p class="auth-intro">{{ 'select_daara.intro' | translate }}</p>

            @if (message(); as message) {
                <div class="auth-info mb-4" role="status">{{ message | translate }}</div>
            }

            @if (chargement()) {
                <app-skeleton [lignes]="4" />
            } @else if (erreur(); as erreur) {
                <div class="grid gap-4">
                    <div class="auth-erreur" role="alert">{{ erreur | translate }}</div>
                    <button type="button" class="btn-auth-secondaire" (click)="charger()">{{ 'auth.mfa.reessayer' | translate }}</button>
                </div>
            } @else {
                <ul class="m-0 grid list-none gap-3 p-0">
                    @for (daara of daaras(); track daara.id) {
                        <li>
                            <a
                                [routerLink]="lien(daara)"
                                class="flex min-h-16 items-center gap-3 rounded-xl border-[1.5px] border-white-light bg-white px-4 py-3 hover:border-primary dark:border-night-border dark:bg-night"
                            >
                                <span
                                    class="grid h-10 w-10 flex-none place-items-center rounded-lg bg-primary/10 text-lg font-black text-primary uppercase"
                                    aria-hidden="true"
                                    >{{ daara.nom.charAt(0) }}</span
                                >
                                <span class="min-w-0 flex-1">
                                    <span class="block truncate font-extrabold text-black dark:text-white-light">{{ daara.nom }}</span>
                                    <span class="block truncate text-sm text-muted dark:text-night-muted">
                                        @for (role of daara.roles; track role; let dernier = $last) {
                                            {{ 'roles.' + role | translate }}{{ dernier ? '' : ', ' }}
                                        }
                                        @if (daara.ville) {
                                            · {{ daara.ville }}
                                        }
                                    </span>
                                </span>
                            </a>
                        </li>
                    }
                </ul>
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectDaaraPage implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly courante = inject(CurrentDaaraService);

    protected readonly daaras = signal<DaaraAccessible[]>([]);
    protected readonly chargement = signal(true);
    protected readonly erreur = signal<string | null>(null);
    /** Message laissé par un guard (daara inaccessible), affiché une seule fois. */
    protected readonly message = signal<string | null>(null);

    ngOnInit(): void {
        this.message.set(this.courante.message());
        this.courante.message.set(null);
        void this.charger();
    }

    protected async charger(): Promise<void> {
        this.chargement.set(true);
        this.erreur.set(null);
        try {
            this.daaras.set(await this.auth.mesDaaras());
        } catch (erreur) {
            this.erreur.set(cleErreurAuth(erreur));
        } finally {
            this.chargement.set(false);
        }
    }

    protected lien(daara: DaaraAccessible): string {
        return routeDaara(daara.slug);
    }
}
