import { ChangeDetectionStrategy, Component, Input, OnInit, TemplateRef, ViewChild, ViewContainerRef, inject } from '@angular/core';

// Icône Vristo : le contenu SVG remplace l'élément hôte (comportement du thème, pour que les classes s'appliquent au SVG).
@Component({
    selector: 'icon-search',
    template: `
        <ng-template #template>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" [class]="class">
                <circle cx="11.5" cy="11.5" r="9.5" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
                <path d="M18.5 18.5L22 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
        </ng-template>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconSearch implements OnInit {
    @Input() class = '';
    @ViewChild('template', { static: true }) private template!: TemplateRef<unknown>;
    private readonly viewContainerRef = inject(ViewContainerRef);

    ngOnInit(): void {
        this.viewContainerRef.createEmbeddedView(this.template);
        this.viewContainerRef.element.nativeElement.remove();
    }
}
