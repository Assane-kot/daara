import { TestBed } from '@angular/core/testing';
import { Badge } from './badge';

describe('Badge', () => {
    it('utilise la variante primaire par défaut', async () => {
        const fixture = TestBed.createComponent(Badge);
        await fixture.whenStable();

        expect((fixture.nativeElement as HTMLElement).className).toContain('text-primary-700');
    });

    it('applique les couleurs accessibles de la variante', async () => {
        const fixture = TestBed.createComponent(Badge);
        fixture.componentRef.setInput('variante', 'danger');
        await fixture.whenStable();
        const classes = (fixture.nativeElement as HTMLElement).className;

        expect(classes).toContain('bg-danger-light');
        expect(classes).toContain('text-danger-strong');
        expect(classes).toContain('dark:text-danger-soft');
    });
});
