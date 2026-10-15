import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSignauxTesting } from '../../../testing/signaux-testing';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LayoutService } from '../layout.service';
import { AppLayout } from './app-layout';

describe('AppLayout', () => {
    let fixture: ComponentFixture<AppLayout>;
    let element: HTMLElement;

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [AppLayout],
            providers: [provideRouter([]), provideTranslateTesting(), provideSignauxTesting()],
        }).compileComponents();

        await TestBed.inject(LanguageService).init();
        fixture = TestBed.createComponent(AppLayout);
        element = fixture.nativeElement as HTMLElement;
        await fixture.whenStable();
        // Après le démarrage (la session vide remet la daara à zéro) : membre admin d'une daara (le parent n'a pas de « Tableau de bord » : son accueil est « Mes enfants »).
        TestBed.inject(CurrentDaaraService).definir({
            id: 'd1',
            slug: 'ma-daara',
            nom: 'Daara',
            ville: null,
            logoPath: null,
            logoUrl: null,
            appelDemiJournee: false,
            roles: ['admin'],
            modules: [],
        });
        await fixture.whenStable();
    });

    it('affiche la sidebar, le header, le contenu et le footer', () => {
        expect(element.querySelector('nav.sidebar')).not.toBeNull();
        expect(element.querySelector('header')).not.toBeNull();
        expect(element.querySelector('main router-outlet')).not.toBeNull();
        expect(element.querySelector('footer')?.textContent).toContain('DAARA');
    });

    it("reflète l'état de la sidebar sur le conteneur principal", async () => {
        const section = element.querySelector('.main-section');
        expect(section?.classList.contains('toggle-sidebar')).toBe(false);

        TestBed.inject(LayoutService).toggleSidebar();
        await fixture.whenStable();

        expect(section?.classList.contains('toggle-sidebar')).toBe(true);
    });

    it('bascule le thème depuis le bouton du header', async () => {
        const button = element.querySelector<HTMLButtonElement>('header button[aria-label^="Thème"]');
        expect(button).not.toBeNull();

        button?.click();
        await fixture.whenStable();

        expect(document.body.classList.contains('dark')).toBe(true);
    });

    it('affiche les libellés traduits et bascule en anglais sans rechargement', async () => {
        expect(element.querySelector('nav.sidebar')?.textContent).toContain('Tableau de bord');
        const bouton = element.querySelector<HTMLButtonElement>('header button[lang="en"]');
        expect(bouton?.textContent?.trim()).toBe('EN');

        bouton?.click();
        await fixture.whenStable();

        expect(element.querySelector('nav.sidebar')?.textContent).toContain('Dashboard');
        expect(element.querySelector('header button[lang="fr"]')?.textContent?.trim()).toBe('FR');
    });
});
