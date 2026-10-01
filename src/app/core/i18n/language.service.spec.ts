import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { LanguageService } from './language.service';

const STORAGE_KEY = 'daara.langue';

function createService(): LanguageService {
    TestBed.configureTestingModule({ providers: [provideTranslateTesting()] });
    return TestBed.inject(LanguageService);
}

describe('LanguageService', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.lang = '';
        TestBed.resetTestingModule();
    });

    it('démarre en français sans préférence mémorisée', async () => {
        const service = createService();

        await service.init();

        expect(service.langue()).toBe('fr');
        expect(document.documentElement.lang).toBe('fr');
    });

    it('restaure la langue mémorisée', async () => {
        localStorage.setItem(STORAGE_KEY, 'en');
        const service = createService();

        await service.init();

        expect(service.langue()).toBe('en');
        expect(TestBed.inject(TranslateService).instant('menu.tableau_de_bord')).toBe('Dashboard');
    });

    it('ignore une langue mémorisée non prise en charge', async () => {
        localStorage.setItem(STORAGE_KEY, 'ar');
        const service = createService();

        await service.init();

        expect(service.langue()).toBe('fr');
    });

    it('bascule français ↔ anglais, met à jour <html lang> et mémorise le choix', async () => {
        const service = createService();
        await service.init();

        await service.basculer();

        expect(service.langue()).toBe('en');
        expect(service.autreLangue()).toBe('fr');
        expect(document.documentElement.lang).toBe('en');
        expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
    });
});
