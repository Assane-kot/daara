import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LayoutService } from '../layout.service';
import { AppLayout } from './app-layout';

describe('AppLayout', () => {
    let fixture: ComponentFixture<AppLayout>;
    let element: HTMLElement;

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [AppLayout],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(AppLayout);
        element = fixture.nativeElement as HTMLElement;
        await fixture.whenStable();
    });

    it('affiche la sidebar, le header, le contenu et le footer', () => {
        expect(element.querySelector('nav.sidebar')).not.toBeNull();
        expect(element.querySelector('header')).not.toBeNull();
        expect(element.querySelector('main router-outlet')).not.toBeNull();
        expect(element.querySelector('footer')?.textContent).toContain('DAARA');
    });

    it('reflète l\'état de la sidebar sur le conteneur principal', async () => {
        const section = element.querySelector('.main-section');
        expect(section?.classList.contains('toggle-sidebar')).toBe(false);

        TestBed.inject(LayoutService).toggleSidebar();
        await fixture.whenStable();

        expect(section?.classList.contains('toggle-sidebar')).toBe(true);
    });

    it('bascule le thème depuis le bouton du header', async () => {
        const button = element.querySelector<HTMLButtonElement>('header button[aria-label^="Thème"]');

        button?.click();
        await fixture.whenStable();

        expect(document.body.classList.contains('dark')).toBe(true);
    });
});
