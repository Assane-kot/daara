import { ChangeDetectionStrategy, Component, Input, OnInit, TemplateRef, ViewChild, ViewContainerRef, inject } from '@angular/core';

// Icône Vristo : le contenu SVG remplace l'élément hôte (comportement du thème, pour que les classes s'appliquent au SVG).
@Component({
    selector: 'icon-user',
    template: `
        <ng-template #template>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" [class]="class">
                <circle cx="12" cy="6" r="4" stroke="currentColor" stroke-width="1.5" />
                <path
                    opacity="0.5"
                    d="M20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5C4 15.0147 7.58172 13 12 13C16.4183 13 20 15.0147 20 17.5Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                />
            </svg>
        </ng-template>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconUser implements OnInit {
    @Input() class = '';
    @ViewChild('template', { static: true }) private template!: TemplateRef<unknown>;
    private readonly viewContainerRef = inject(ViewContainerRef);

    ngOnInit(): void {
        this.viewContainerRef.createEmbeddedView(this.template);
        this.viewContainerRef.element.nativeElement.remove();
    }
}
