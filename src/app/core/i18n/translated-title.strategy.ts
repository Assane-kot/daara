import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

const APP_NAME = 'DAARA';

/**
 * Titre de l'onglet : `title` des routes = clé de traduction (ex. `titres.tableau_de_bord`),
 * suffixée par « | DAARA » et retraduite à chaque changement de langue.
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
    private readonly title = inject(Title);
    private readonly translate = inject(TranslateService);
    private titleKey: string | undefined;

    constructor() {
        super();
        this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe(() => this.applyTitle());
    }

    override updateTitle(snapshot: RouterStateSnapshot): void {
        this.titleKey = this.buildTitle(snapshot);
        this.applyTitle();
    }

    private applyTitle(): void {
        this.title.setTitle(this.titleKey ? `${this.translate.instant(this.titleKey)} | ${APP_NAME}` : APP_NAME);
    }
}
