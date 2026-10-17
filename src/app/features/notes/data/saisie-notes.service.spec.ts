import { TestBed } from '@angular/core/testing';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { FeuilleNotes, LigneNote, SaisieNotesService, erreurNote, lireNote, resumeSaisie } from './saisie-notes.service';

describe('lireNote', () => {
    it('lit les notes tapées avec virgule ou point', () => {
        expect(lireNote(' 12 ', 20)).toEqual({ valeur: 12 });
        expect(lireNote('12,5', 20)).toEqual({ valeur: 12.5 });
        expect(lireNote('7.75', 10)).toEqual({ valeur: 7.75 });
        expect(lireNote('', 20)).toEqual({ vide: true });
    });

    it('refuse format, dépassement du barème et quart de point', () => {
        expect(lireNote('douze', 20)).toEqual({ erreur: 'notes.saisie.erreurs.format' });
        expect(lireNote('-1', 20)).toEqual({ erreur: 'notes.saisie.erreurs.format' });
        expect(lireNote('10,5', 10)).toEqual({ erreur: 'notes.saisie.erreurs.note_hors_bareme' });
        expect(lireNote('12,3', 20)).toEqual({ erreur: 'notes.saisie.erreurs.quart' });
    });
});

describe('resumeSaisie et erreurNote', () => {
    it('compte notes, absents et élèves sans note', () => {
        const l = (valeur: number | null, absent = false) => ({ valeur, absent }) as LigneNote;
        expect(resumeSaisie([l(12), l(null, true), l(null), l(0)])).toEqual({ notes: 2, absents: 1, manquantes: 1 });
    });

    it('traduit les refus de la base', () => {
        expect(erreurNote({ code: '23514', message: 'note_hors_bareme' }).cle).toBe('notes.saisie.erreurs.note_hors_bareme');
        expect(erreurNote({ code: '42501' }).cle).toBe('notes.saisie.erreurs.droits');
        expect(erreurNote({ code: '23514', message: 'notes_valeur_check' }).cle).toBe('notes.saisie.erreurs.invalide');
    });
});

describe('SaisieNotesService.enregistrer', () => {
    let service: SaisieNotesService;
    const appels: { methode: string; args: unknown[] }[] = [];
    let reponses: { data: unknown; error: unknown }[];
    function requete(): unknown {
        const r: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'insert', 'update', 'delete', 'single', 'maybeSingle']) {
            r[m] = (...args: unknown[]) => {
                appels.push({ methode: m, args });
                return r;
            };
        }
        r['then'] = (resoudre: (v: unknown) => unknown) => resoudre(reponses.shift() ?? { data: null, error: null });
        return r;
    }
    const f = { evaluationId: 'e-1', classeId: 'c-1', classeMatiereId: 'cm-1' } as FeuilleNotes;
    const ligne = (noteId: string | null) => ({ apprenantId: 'a-1', noteId, valeur: 12, absent: false, appreciation: null }) as LigneNote;

    beforeEach(() => {
        appels.length = 0;
        TestBed.configureTestingModule({ providers: [{ provide: SupabaseService, useValue: { client: { from: () => requete() } } }] });
        service = TestBed.inject(SaisieNotesService);
        TestBed.inject(CurrentDaaraService).definir({
            id: 'd-1',
            slug: 'daara',
            nom: 'Daara',
            ville: null,
            logoPath: null,
            logoUrl: null,
            appelDemiJournee: false,
            roles: ['enseignant'],
            modules: [],
        });
    });

    it('première note : insertion avec la classe et la matière de l’évaluation', async () => {
        reponses = [{ data: { id: 'n-1' }, error: null }];
        expect(await service.enregistrer(f, ligne(null), { valeur: 14.5, absent: false, appreciation: ' ' })).toBe('n-1');
        expect(appels.find((a) => a.methode === 'insert')?.args[0]).toEqual({
            daara_id: 'd-1',
            evaluation_id: 'e-1',
            apprenant_id: 'a-1',
            classe_id: 'c-1',
            classe_matiere_id: 'cm-1',
            valeur: 14.5,
            absent: false,
            appreciation: null,
        });
    });

    it('déjà saisie par un collègue entre-temps (23505) : mise à jour', async () => {
        reponses = [
            { data: null, error: { code: '23505' } },
            { data: { id: 'n-9' }, error: null },
            { data: [{ id: 'n-9' }], error: null },
        ];
        expect(await service.enregistrer(f, ligne(null), { valeur: 10, absent: false, appreciation: null })).toBe('n-9');
        expect(appels.find((a) => a.methode === 'update')?.args[0]).toEqual({ valeur: 10, absent: false, appreciation: null });
    });

    it('absent : valeur nulle ; note effacée : ligne supprimée', async () => {
        reponses = [{ data: [{ id: 'n-1' }], error: null }];
        await service.enregistrer(f, ligne('n-1'), { valeur: 12, absent: true, appreciation: null });
        expect(appels.find((a) => a.methode === 'update')?.args[0]).toEqual({ valeur: null, absent: true, appreciation: null });
        reponses = [{ data: null, error: null }];
        expect(await service.enregistrer(f, ligne('n-1'), { valeur: null, absent: false, appreciation: null })).toBeNull();
        expect(appels.some((a) => a.methode === 'delete')).toBe(true);
    });
});
