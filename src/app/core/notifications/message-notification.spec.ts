import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { Cloche } from '../../layouts/app-layout/cloche';
import { messageNotification } from './message-notification';
import { Notification, NotificationsService } from './notifications.service';

const notif = (modif: Partial<Notification>): Notification => ({
    id: 'n1',
    type: 'absence',
    apprenantId: 'e1',
    prenom: 'Awa',
    date: '2026-10-15',
    creneau: 'journee',
    lue: false,
    creeLe: '2026-10-15T08:00:00Z',
    justifiee: null,
    fille: true,
    ...modif,
});

describe('messageNotification', () => {
    let translate: TranslateService;
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideTranslateTesting()] });
        translate = TestBed.inject(TranslateService);
    });
    const m = (n: Notification) => messageNotification(n, translate, 'fr', '2026-10-15');

    it('absence et retard du jour, avec le créneau', () => {
        expect(m(notif({}))).toBe('Awa était absente aujourd’hui.');
        expect(m(notif({ prenom: 'Modou', fille: false }))).toBe('Modou était absent aujourd’hui.');
        expect(m(notif({ type: 'retard', creneau: 'matin' }))).toBe('Awa est arrivée en retard ce matin.');
    });

    it('autre jour, absence annulée, décision justifiée ou non, prénom illisible', () => {
        expect(m(notif({ type: 'absence_annulee', date: '2026-10-13', creneau: 'apres_midi' }))).toContain('le mar. 13 oct. (Après-midi) a été annulée');
        expect(m(notif({ type: 'justification_decidee', justifiee: true }))).toBe('L’absence de Awa aujourd’hui est justifiée.');
        expect(m(notif({ type: 'justification_decidee', justifiee: false }))).toBe('L’absence de Awa aujourd’hui n’est pas justifiée.');
        expect(m(notif({ type: 'justification_envoyee', prenom: '' }))).toContain('un élève');
    });
});

describe('Cloche', () => {
    it('pastille des non lues ; un toucher marque lue et ouvre le lien', async () => {
        const service = {
            actif: () => true,
            nonLues: () => 3,
            recentes: () => [notif({})],
            marquerLue: vi.fn().mockResolvedValue(undefined),
            toutMarquerLu: vi.fn(),
            lien: () => ['/d', 'ma-daara', 'enfants', 'e1'],
            lienPage: () => ['/d', 'ma-daara', 'notifications'],
        };
        TestBed.configureTestingModule({ providers: [provideTranslateTesting(), provideRouter([]), { provide: NotificationsService, useValue: service }] });
        const fixture = TestBed.createComponent(Cloche);
        await fixture.whenStable();
        const element = fixture.nativeElement as HTMLElement;
        expect(element.textContent).toContain('3');
        expect(element.querySelector('button')!.getAttribute('aria-label')).toBe('Notifications (3 non lue(s))');
        (element.querySelector('button') as HTMLButtonElement).click();
        await fixture.whenStable();
        const item = [...document.querySelectorAll('[cdkmenuitem], .cdk-menu-item, button')].find((b) =>
            b.textContent!.includes('Awa était absente'),
        ) as HTMLElement;
        expect(item).toBeTruthy();
        item.click();
        await fixture.whenStable();
        expect(service.marquerLue).toHaveBeenCalled();
    });
});
