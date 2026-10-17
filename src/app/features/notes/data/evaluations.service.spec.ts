import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { Evaluation, EvaluationsService, PeriodeNotes, dateParDefaut, erreurEvaluation, libelleSuggere, periodeParDefaut } from './evaluations.service';

describe('EvaluationsService', () => {
    let service: EvaluationsService;
    let courante: CurrentDaaraService;
    // Une réponse par table interrogée ; requête PostgREST « thenable ».
    let reponses: Record<string, { data: unknown; error: unknown }>;
    const appels: { table: string; methode: string; args: unknown[] }[] = [];
    function requete(table: string): unknown {
        const r: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'maybeSingle']) {
            r[m] = (...args: unknown[]) => {
                appels.push({ table, methode: m, args });
                return r;
            };
        }
        r['then'] = (resoudre: (v: unknown) => unknown) => resoudre(reponses[table] ?? { data: null, error: null });
        return r;
    }
    const client = { from: (table: string) => requete(table) };

    function ouvrir(roles: ('admin' | 'enseignant')[]): void {
        courante.definir({ id: 'd-1', slug: 'daara', nom: 'Daara', ville: null, logoPath: null, logoUrl: null, appelDemiJournee: false, roles, modules: [] });
    }

    beforeEach(() => {
        appels.length = 0;
        reponses = {
            annees_scolaires: { data: { id: 'a-1' }, error: null },
            types_evaluation: { data: [{ id: 't-1', nom: 'Devoir', coefficient: '1.00' }], error: null },
            reglages_notes: { data: { titulaire_saisit: false }, error: null },
            daaras: { data: { bareme: 20 }, error: null },
            classes: {
                data: [
                    {
                        id: 'c-1',
                        nom: 'CE1 A',
                        titulaire_id: 'moi',
                        classe_matieres: [
                            { id: 'cm-2', enseignant_id: 'autre', matieres: { nom: 'Français' } },
                            { id: 'cm-1', enseignant_id: 'moi', matieres: { nom: 'Coran' } },
                        ],
                    },
                    { id: 'c-2', nom: 'CE2', titulaire_id: null, classe_matieres: [{ id: 'cm-3', enseignant_id: 'autre', matieres: { nom: 'Maths' } }] },
                ],
                error: null,
            },
            periodes: { data: [{ id: 'p-1', libelle: 'T1', date_debut: '2026-10-01', date_fin: '2026-12-20', cloturee: false }], error: null },
        };
        TestBed.configureTestingModule({
            providers: [
                { provide: SupabaseService, useValue: { client } },
                { provide: AuthService, useValue: { user: () => ({ id: 'moi' }) } },
            ],
        });
        service = TestBed.inject(EvaluationsService);
        courante = TestBed.inject(CurrentDaaraService);
    });

    it('enseignant : ses matières seulement, classes sans matière à lui retirées', async () => {
        ouvrir(['enseignant']);
        const ctx = await service.contexte();
        expect(ctx.classes).toEqual([{ id: 'c-1', nom: 'CE1 A', matieres: [{ id: 'cm-1', nom: 'Coran' }] }]);
        expect(ctx.types).toEqual([{ id: 't-1', nom: 'Devoir', coefficient: 1 }]);
        expect(ctx.bareme).toBe(20);
        expect(appels).toContainEqual({ table: 'types_evaluation', methode: 'eq', args: ['archive', false] });
    });

    it('titulaire autorisé par le réglage : toutes les matières de sa classe ; admin : toutes les classes', async () => {
        ouvrir(['enseignant']);
        reponses['reglages_notes'] = { data: { titulaire_saisit: true }, error: null };
        expect((await service.contexte()).classes[0].matieres.map((m) => m.nom)).toEqual(['Coran', 'Français']);
        ouvrir(['admin']);
        expect((await service.contexte()).classes.map((c) => c.matieres.length)).toEqual([2, 1]);
    });

    it('pas d’année active : ni classes ni périodes', async () => {
        ouvrir(['admin']);
        reponses['annees_scolaires'] = { data: null, error: null };
        const ctx = await service.contexte();
        expect(ctx.classes).toEqual([]);
        expect(ctx.periodes).toEqual([]);
    });

    it('crée une évaluation avec la classe, la matière et la période choisies', async () => {
        ouvrir(['enseignant']);
        reponses['evaluations'] = { data: null, error: null };
        await service.creer('c-1', 'cm-1', 'p-1', { typeId: 't-1', libelle: 'Devoir 1', date: '2026-10-17', bareme: 20, coefficient: 1 });
        expect(appels).toContainEqual({
            table: 'evaluations',
            methode: 'insert',
            args: [
                {
                    daara_id: 'd-1',
                    classe_id: 'c-1',
                    classe_matiere_id: 'cm-1',
                    periode_id: 'p-1',
                    type_id: 't-1',
                    libelle: 'Devoir 1',
                    date_eval: '2026-10-17',
                    bareme: 20,
                    coefficient: 1,
                },
            ],
        });
    });

    it('suppression filtrée par la RLS (aucune ligne) : refus', async () => {
        ouvrir(['enseignant']);
        reponses['evaluations'] = { data: [], error: null };
        await expect(service.supprimer('e-1')).rejects.toMatchObject({ cle: 'notes.erreurs.droits' });
    });
});

describe('fonctions des évaluations', () => {
    const periodes: PeriodeNotes[] = [
        { id: 'p-1', libelle: 'T1', debut: '2026-10-01', fin: '2026-12-20', cloturee: true },
        { id: 'p-2', libelle: 'T2', debut: '2027-01-05', fin: '2027-03-30', cloturee: false },
    ];

    it('période proposée : celle du jour si ouverte, sinon la première ouverte', () => {
        expect(periodeParDefaut(periodes, '2027-02-01')?.id).toBe('p-2');
        expect(periodeParDefaut(periodes, '2026-11-01')?.id).toBe('p-2');
        expect(periodeParDefaut([periodes[0]], '2026-11-01')?.id).toBe('p-1');
        expect(periodeParDefaut([], '2026-11-01')).toBeNull();
    });

    it('date proposée ramenée dans la période', () => {
        expect(dateParDefaut(periodes[1], '2026-12-01')).toBe('2027-01-05');
        expect(dateParDefaut(periodes[1], '2027-02-01')).toBe('2027-02-01');
        expect(dateParDefaut(periodes[1], '2027-05-01')).toBe('2027-03-30');
    });

    it('intitulé numéroté par type', () => {
        const e = (typeId: string) => ({ typeId }) as Evaluation;
        expect(libelleSuggere({ id: 't-1', nom: 'Devoir', coefficient: 1 }, [e('t-1'), e('t-2'), e('t-1')])).toBe('Devoir 3');
        expect(libelleSuggere({ id: 't-2', nom: 'Composition', coefficient: 2 }, [])).toBe('Composition 1');
    });

    it('erreurs de la base traduites', () => {
        expect(erreurEvaluation({ code: '23514', message: 'periode_cloturee' }).cle).toBe('notes.erreurs.periode_cloturee');
        expect(erreurEvaluation({ code: '23514', message: 'evaluations_bareme_check' }).cle).toBe('notes.erreurs.donnee_invalide');
        expect(erreurEvaluation({ code: '42501' }).cle).toBe('notes.erreurs.droits');
        expect(erreurEvaluation(null).cle).toBe('notes.erreurs.inattendue');
    });
});
