import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { PageHeader } from './page-header';

@Component({
    imports: [PageHeader],
    template: `
        <app-page-header titre="Absences" [filAriane]="[{ libelle: 'Accueil', lien: '/' }, { libelle: 'Absences' }]">
            <button actions type="button">Ajouter</button>
        </app-page-header>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
class HoteTest {}

describe('PageHeader', () => {
    let element: HTMLElement;

    beforeEach(async () => {
        TestBed.configureTestingModule({ providers: [provideRouter([]), provideTranslateTesting()] });
        const fixture = TestBed.createComponent(HoteTest);
        element = fixture.nativeElement as HTMLElement;
        await fixture.whenStable();
    });

    it('affiche le titre dans un h1', () => {
        expect(element.querySelector('h1')?.textContent?.trim()).toBe('Absences');
    });

    it('affiche le fil d\'Ariane : liens puis page courante', () => {
        const nav = element.querySelector('nav');
        expect(nav?.getAttribute('aria-label')).toBe('Fil d’Ariane');
        expect(nav?.querySelector('a')?.textContent?.trim()).toBe('Accueil');
        expect(nav?.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Absences');
    });

    it('projette les actions', () => {
        expect(element.querySelector('button')?.textContent?.trim()).toBe('Ajouter');
    });
});
