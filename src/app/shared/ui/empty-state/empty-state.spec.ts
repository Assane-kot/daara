import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

@Component({
    imports: [EmptyState],
    template: `
        <app-empty-state titre="Aucun apprenant" message="Ajoutez un premier apprenant pour commencer.">
            <button type="button">Ajouter</button>
        </app-empty-state>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
class HoteTest {}

describe('EmptyState', () => {
    it("affiche le titre, le message et l'action projetée", async () => {
        const fixture = TestBed.createComponent(HoteTest);
        await fixture.whenStable();
        const texte = (fixture.nativeElement as HTMLElement).textContent ?? '';

        expect(texte).toContain('Aucun apprenant');
        expect(texte).toContain('Ajoutez un premier apprenant pour commencer.');
        expect((fixture.nativeElement as HTMLElement).querySelector('button')?.textContent?.trim()).toBe('Ajouter');
    });
});
