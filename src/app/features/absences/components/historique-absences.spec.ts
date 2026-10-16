import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideSignauxTesting } from '../../../../testing/signaux-testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { Absence, AbsencesService } from '../data/absences.service';
import { HistoriqueAbsences } from './historique-absences';
import { JustifierDialog, JustifierDialogService } from './justifier-dialog';

const absence = (modif: Partial<Absence>): Absence => ({
    id: 'abs-1',
    date: '2026-10-14',
    creneau: 'journee',
    type: 'absence',
    etat: 'aucune',
    motif: null,
    apprenantId: 'e1',
    eleve: 'Awa Ndiaye',
    classe: 'CE1 A',
    peutDecider: false,
    peutJustifier: true,
    ...modif,
});

async function stable(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r));
    }
    await fixture.whenStable();
}

describe('HistoriqueAbsences', () => {
    const service = { historique: vi.fn(), justifier: vi.fn(), decider: vi.fn() };
    const dialogue = { ouvrir: vi.fn() };

    function creer(mode: 'parent' | 'equipe'): ComponentFixture<HistoriqueAbsences> {
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                provideSignauxTesting(),
                { provide: AbsencesService, useValue: service },
                { provide: JustifierDialogService, useValue: dialogue },
            ],
        });
        const fixture = TestBed.createComponent(HistoriqueAbsences);
        fixture.componentRef.setInput('apprenantId', 'e1');
        fixture.componentRef.setInput('prenom', 'Awa');
        fixture.componentRef.setInput('mode', mode);
        return fixture;
    }
    const bouton = (f: ComponentFixture<unknown>, texte: string) =>
        [...(f.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent!.trim() === texte) as HTMLButtonElement | undefined;

    beforeEach(() => vi.resetAllMocks());

    it('parent : « Justifier » ouvre la saisie du motif ; plus de bouton après décision', async () => {
        service.historique.mockResolvedValue([absence({}), absence({ id: 'abs-2', etat: 'justifiee', motif: 'Malade', peutJustifier: false })]);
        dialogue.ouvrir.mockResolvedValue(true);
        const fixture = creer('parent');
        await stable(fixture);
        const boutons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].filter((b) => b.textContent!.trim() === 'Justifier');
        expect(boutons.length).toBe(1);
        boutons[0].click();
        await stable(fixture);
        expect(dialogue.ouvrir.mock.calls[0][0].titre).toContain('Awa');
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Motif envoyé');
    });

    it('équipe : décision seulement si l’utilisateur peut décider', async () => {
        service.historique.mockResolvedValue([absence({ etat: 'envoyee', motif: 'Malade', peutDecider: true }), absence({ id: 'abs-2', peutDecider: false })]);
        service.decider.mockResolvedValue(undefined);
        const fixture = creer('equipe');
        await stable(fixture);
        expect([...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].filter((b) => b.textContent!.trim() === 'Justifiée').length).toBe(1);
        bouton(fixture, 'Justifiée')!.click();
        await stable(fixture);
        expect(service.decider).toHaveBeenCalledWith('abs-1', true);
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Absence marquée justifiée');
    });
});

describe('JustifierDialog', () => {
    it('un motif proposé en un toucher, puis envoi', async () => {
        const envoyer = vi.fn().mockResolvedValue(undefined);
        const ref = { close: vi.fn() };
        TestBed.configureTestingModule({
            providers: [
                provideTranslateTesting(),
                { provide: DialogRef, useValue: ref },
                { provide: DIALOG_DATA, useValue: { titre: 'Absence d’Awa', motif: null, envoyer } },
            ],
        });
        const fixture = TestBed.createComponent(JustifierDialog);
        await stable(fixture);
        const element = fixture.nativeElement as HTMLElement;
        const b = (t: string) => [...element.querySelectorAll('button')].find((x) => x.textContent!.trim() === t) as HTMLButtonElement;
        expect(b('Envoyer le motif').disabled).toBe(true);
        b('Malade').click();
        await stable(fixture);
        b('Envoyer le motif').click();
        await stable(fixture);
        expect(envoyer).toHaveBeenCalledWith('Malade');
        expect(ref.close).toHaveBeenCalledWith(true);
    });
});
