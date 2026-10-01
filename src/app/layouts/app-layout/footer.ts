import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    // Sélecteur sur l'élément <footer> (sémantique HTML, poussé en bas par `mt-auto`).
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'footer[appFooter]',
    template: `<div class="p-6 pt-0 text-center dark:text-white-dark ltr:sm:text-left rtl:sm:text-right">© {{ year }} DAARA</div>`,
    host: { class: 'mt-auto' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
    protected readonly year = new Date().getFullYear();
}
