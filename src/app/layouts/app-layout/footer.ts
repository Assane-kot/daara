import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'footer[appFooter]',
    template: `<div class="p-6 pt-0 text-center dark:text-white-dark ltr:sm:text-left rtl:sm:text-right">© {{ year }} DAARA</div>`,
    host: { class: 'mt-auto' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
    protected readonly year = new Date().getFullYear();
}
