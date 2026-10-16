import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { ModuleDaara } from '../../core/daara/daara.model';
import { PageHeader } from '../../shared/ui/page-header/page-header';

/** Onglets des paramètres de la daara (admin) : Général (S2.3), Modules (S2.2, ADR-008), réglages des modules (ADR-012). */
export const ONGLETS_PARAMETRES: readonly { route: string; cle: string; module?: ModuleDaara }[] = [
    { route: 'general', cle: 'parametres.onglets.general' },
    { route: 'modules', cle: 'parametres.onglets.modules' },
    // Réglages par module (ADR-012) : onglet visible si le module est actif.
    { route: 'absences', cle: 'parametres.onglets.absences', module: 'absences' },
    { route: 'notes', cle: 'parametres.onglets.notes', module: 'notes' },
];

@Component({
    selector: 'app-parametres-page',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, PageHeader],
    template: `
        <app-page-header [titre]="'parametres.titre' | translate" />
        <nav class="mb-5 flex gap-2 border-b border-white-light dark:border-night-border" [attr.aria-label]="'parametres.titre' | translate">
            @for (onglet of onglets(); track onglet.route) {
                <a
                    [routerLink]="onglet.route"
                    routerLinkActive="border-primary! text-primary"
                    ariaCurrentWhenActive="page"
                    class="-mb-px flex min-h-11 items-center border-b-2 border-transparent px-3 font-semibold text-muted hover:text-primary dark:text-night-muted"
                >
                    {{ onglet.cle | translate }}
                </a>
            }
        </nav>
        <router-outlet />
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametresPage {
    private readonly courante = inject(CurrentDaaraService);
    protected readonly onglets = computed(() => ONGLETS_PARAMETRES.filter((o) => !o.module || this.courante.moduleActif(o.module)));
}
