import { ChangeDetectionStrategy, Component, Input, OnInit, TemplateRef, ViewChild, ViewContainerRef, inject } from '@angular/core';

// Icône Vristo : le contenu SVG remplace l'élément hôte (comportement du thème, pour que les classes s'appliquent au SVG).
@Component({
    selector: 'icon-user-plus',
    template: `
        <ng-template #template>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" [class]="class">
                <circle cx="10" cy="6" r="4" stroke="currentColor" stroke-width="1.5" />
                <path
                    opacity="0.5"
                    d="M18 17.5C18 19.9853 18 22 10 22C2 22 2 19.9853 2 17.5C2 15.0147 5.58172 13 10 13C14.4183 13 18 15.0147 18 17.5Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                />
                <path d="M21 10H19M19 10H17M19 10L19 8M19 10L19 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
        </ng-template>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconUserPlus implements OnInit {
    @Input() class = '';
    @ViewChild('template', { static: true }) private template!: TemplateRef<unknown>;
    private readonly viewContainerRef = inject(ViewContainerRef);

    ngOnInit(): void {
        this.viewContainerRef.createEmbeddedView(this.template);
        this.viewContainerRef.element.nativeElement.remove();
    }
}
