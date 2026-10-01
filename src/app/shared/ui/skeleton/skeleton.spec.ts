import { TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideTranslateTesting()] });
    });

    it('annonce le chargement aux lecteurs d\'écran', async () => {
        const fixture = TestBed.createComponent(Skeleton);
        await fixture.whenStable();
        const statut = (fixture.nativeElement as HTMLElement).querySelector('[role="status"]');

        expect(statut?.textContent).toContain('Chargement en cours…');
    });

    it('affiche le nombre de lignes demandé, avec un titre optionnel', async () => {
        const fixture = TestBed.createComponent(Skeleton);
        fixture.componentRef.setInput('lignes', 5);
        fixture.componentRef.setInput('avecTitre', true);
        await fixture.whenStable();
        const element = fixture.nativeElement as HTMLElement;

        expect(element.querySelectorAll('.space-y-3 > div').length).toBe(5);
        expect(element.querySelector('.h-5')).not.toBeNull();
    });
});
