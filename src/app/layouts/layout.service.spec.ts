import { TestBed } from '@angular/core/testing';
import { LayoutService } from './layout.service';

function setViewportWidth(width: number): void {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

describe('LayoutService', () => {
    let service: LayoutService;

    beforeEach(() => {
        TestBed.resetTestingModule();
        service = TestBed.inject(LayoutService);
    });

    it('bascule la sidebar', () => {
        expect(service.sidebarToggled()).toBe(false);

        service.toggleSidebar();
        expect(service.sidebarToggled()).toBe(true);

        service.toggleSidebar();
        expect(service.sidebarToggled()).toBe(false);
    });

    it('referme la sidebar après navigation en mobile', () => {
        setViewportWidth(375);
        service.toggleSidebar();

        service.closeSidebarOnMobile();

        expect(service.sidebarToggled()).toBe(false);
    });

    it('ne touche pas à la sidebar repliée sur grand écran', () => {
        setViewportWidth(1280);
        service.toggleSidebar();

        service.closeSidebarOnMobile();

        expect(service.sidebarToggled()).toBe(true);
    });
});
