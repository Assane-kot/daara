import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideSignauxTesting } from '../../../../testing/signaux-testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { FeuilleNotes, LigneNote, SaisieNotesService } from '../data/saisie-notes.service';
import { SaisieNotesPage } from './saisie-notes-page';

async function stable(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r));
    }
    await fixture.whenStable();
}

const eleve = (apprenantId: string, prenom: string, modif: Partial<LigneNote> = {}): LigneNote => ({
    apprenantId,
    prenom,
    nom: 'Ndiaye',
    noteId: null,
    valeur: null,
    absent: false,
    appreciation: null,
    ...modif,
});

const feuille = (modif: Partial<FeuilleNotes> = {}): FeuilleNotes => ({
    evaluationId: 'e-1',
    libelle: 'Devoir 1',
    typeNom: 'Devoir',
    date: '2026-10-17',
    bareme: 20,
    publiee: false,
    classeId: 'c-1',
    classeNom: 'CE1 A',
    classeMatiereId: 'cm-1',
    matiereNom: 'Coran',
    periodeId: 'p-1',
    periodeLibelle: 'Trimestre 1',
    cloturee: false,
    ecriture: true,
    appreciations: true,
    eleves: [eleve('a-1', 'Awa'), eleve('a-2', 'Bineta', { noteId: 'n-2', valeur: 15 })],
    ...modif,
});

describe('SaisieNotesPage', () => {
    const service = { feuille: vi.fn(), enregistrer: vi.fn() };

    function creer(): ComponentFixture<SaisieNotesPage> {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateTesting(),
                provideSignauxTesting(),
                { provide: SaisieNotesService, useValue: service },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'e-1' }) } } },
            ],
        });
        const fixture = TestBed.createComponent(SaisieNotesPage);
        document.body.appendChild(fixture.nativeElement);
        return fixture;
    }
    const champ = (f: ComponentFixture<unknown>, i: number) => (f.nativeElement as HTMLElement).querySelector(`#note-${i}`) as HTMLInputElement;
    const texte = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).textContent ?? '';

    beforeEach(() => vi.resetAllMocks());

    it('note tapée puis Entrée : élève suivant, note enregistrée, résumé à jour', async () => {
        service.feuille.mockResolvedValue(feuille());
        service.enregistrer.mockResolvedValue('n-1');
        const fixture = creer();
        await stable(fixture);
        expect(texte(fixture)).toContain('1 note(s) · 0 absent(s) · 1 sans note');
        expect(champ(fixture, 1).value).toBe('15');
        champ(fixture, 0).focus();
        champ(fixture, 0).value = '12,5';
        champ(fixture, 0).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        await stable(fixture);
        expect(document.activeElement).toBe(champ(fixture, 1));
        expect(service.enregistrer).toHaveBeenCalledWith(expect.objectContaining({ evaluationId: 'e-1' }), expect.objectContaining({ apprenantId: 'a-1' }), {
            valeur: 12.5,
            absent: false,
            appreciation: null,
        });
        expect(texte(fixture)).toContain('Enregistré');
        expect(texte(fixture)).toContain('2 note(s) · 0 absent(s) · 0 sans note');
        fixture.nativeElement.remove();
    });

    it('note invalide : message sur la ligne, rien d’envoyé', async () => {
        service.feuille.mockResolvedValue(feuille());
        const fixture = creer();
        await stable(fixture);
        champ(fixture, 0).value = '25';
        champ(fixture, 0).dispatchEvent(new Event('blur'));
        await stable(fixture);
        expect(service.enregistrer).not.toHaveBeenCalled();
        expect(texte(fixture)).toContain('La note dépasse le barème.');
        fixture.nativeElement.remove();
    });

    it('« Absent » en un toucher ; période clôturée : lecture seule', async () => {
        service.feuille.mockResolvedValue(feuille());
        service.enregistrer.mockResolvedValue('n-1');
        const fixture = creer();
        await stable(fixture);
        ([...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Absent') as HTMLButtonElement).click();
        await stable(fixture);
        expect(service.enregistrer.mock.calls[0][2]).toEqual({ valeur: null, absent: true, appreciation: null });
        expect(champ(fixture, 0).disabled).toBe(true);
        fixture.nativeElement.remove();

        TestBed.resetTestingModule();
        service.feuille.mockResolvedValue(feuille({ cloturee: true, ecriture: false }));
        const lecture = creer();
        await stable(lecture);
        expect(texte(lecture)).toContain('Cette période est clôturée');
        expect(champ(lecture, 0).disabled).toBe(true);
        expect([...(lecture.nativeElement as HTMLElement).querySelectorAll('button')].some((b) => b.textContent!.trim() === 'Absent')).toBe(false);
        lecture.nativeElement.remove();
    });
});
