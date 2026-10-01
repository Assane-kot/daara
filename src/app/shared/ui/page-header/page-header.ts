import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

export interface FilAriane {
    /** Libellé déjà traduit. */
    readonly libelle: string;
    /** Lien ; absent pour la page courante (dernier élément). */
    readonly lien?: string;
}

/**
 * En-tête de page : fil d'Ariane (markup Vristo « breadcrumbs »), titre et zone d'actions projetée
 * (`<app-page-header titre="..."><button actions ...></button></app-page-header>`).
 */
@Component({
    selector: 'app-page-header',
    imports: [RouterLink, TranslatePipe],
    template: `
        @if (filAriane().length) {
            <nav [attr.aria-label]="'layout.fil_ariane' | translate">
                <ol class="flex flex-wrap font-semibold text-muted dark:text-night-muted">
                    @for (element of filAriane(); track $index; let premier = $first, dernier = $last) {
                        <li>
                            @if (!premier) {
                                <span class="px-1.5" aria-hidden="true">/</span>
                            }
                            @if (element.lien && !dernier) {
                                <a [routerLink]="element.lien" class="text-primary hover:underline">{{ element.libelle }}</a>
                            } @else {
                                <span [attr.aria-current]="dernier ? 'page' : null">{{ element.libelle }}</span>
                            }
                        </li>
                    }
                </ol>
            </nav>
        }
        <div class="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 class="text-xl font-semibold text-black dark:text-white-light">{{ titre() }}</h1>
            <div class="flex flex-wrap items-center gap-2">
                <ng-content select="[actions]" />
            </div>
        </div>
    `,
    host: { class: 'mb-5 block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
    /** Titre de la page, déjà traduit. */
    readonly titre = input.required<string>();
    readonly filAriane = input<readonly FilAriane[]>([]);
}
