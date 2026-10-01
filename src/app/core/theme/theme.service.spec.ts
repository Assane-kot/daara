import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

const STORAGE_KEY = 'daara.theme';

/** Simule `prefers-color-scheme: dark` (jsdom ne fournit pas `matchMedia`). */
function mockSystemDark(matches: boolean): void {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: (query: string) => ({ matches, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }),
    });
}

function createService(): ThemeService {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    return service;
}

describe('ThemeService', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.classList.remove('dark');
        mockSystemDark(false);
        TestBed.resetTestingModule();
    });

    it('démarre en mode clair sans préférence mémorisée', () => {
        const service = createService();

        expect(service.mode()).toBe('light');
        expect(document.body.classList.contains('dark')).toBe(false);
    });

    it('restaure la préférence mémorisée', () => {
        localStorage.setItem(STORAGE_KEY, 'dark');

        const service = createService();

        expect(service.mode()).toBe('dark');
        expect(document.body.classList.contains('dark')).toBe(true);
    });

    it('ignore une valeur mémorisée invalide', () => {
        localStorage.setItem(STORAGE_KEY, 'violet');

        expect(createService().mode()).toBe('light');
    });

    it('applique et mémorise le mode choisi', () => {
        const service = createService();

        service.setMode('dark');
        TestBed.tick();

        expect(document.body.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    });

    it('suit le thème du système en mode système', () => {
        mockSystemDark(true);
        const service = createService();

        service.setMode('system');
        TestBed.tick();

        expect(service.isDark()).toBe(true);
        expect(document.body.classList.contains('dark')).toBe(true);
    });

    it('enchaîne clair → sombre → système → clair', () => {
        const service = createService();
        const modes: string[] = [];

        for (let i = 0; i < 3; i++) {
            service.cycleMode();
            modes.push(service.mode());
        }

        expect(modes).toEqual(['dark', 'system', 'light']);
    });
});
