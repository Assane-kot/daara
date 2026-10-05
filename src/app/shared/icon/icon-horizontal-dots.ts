import { ChangeDetectionStrategy, Component, Input, OnInit, TemplateRef, ViewChild, ViewContainerRef, inject } from '@angular/core';

// Icône Vristo : le contenu SVG remplace l'élément hôte (comportement du thème, pour que les classes s'appliquent au SVG).
@Component({
    selector: 'icon-horizontal-dots',
    template: `
        <ng-template #template>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" [class]="class">
                <circle cx="5" cy="12" r="2" stroke="currentColor" stroke-width="1.5" />
                <circle opacity="0.5" cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.5" />
                <circle cx="19" cy="12" r="2" stroke="currentColor" stroke-width="1.5" />
            </svg>
        </ng-template>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconHorizontalDots implements OnInit {
    @Input() class = '';
    @ViewChild('template', { static: true }) private template!: TemplateRef<unknown>;
    private readonly viewContainerRef = inject(ViewContainerRef);

    ngOnInit(): void {
        this.viewContainerRef.createEmbeddedView(this.template);
        this.viewContainerRef.element.nativeElement.remove();
    }
}
