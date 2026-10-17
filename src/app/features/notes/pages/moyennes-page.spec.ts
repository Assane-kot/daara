import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSignauxTesting } from '../../../../testing/signaux-testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { EvaluationsService } from '../data/evaluations.service';
import { MoyennesService } from '../data/moyennes.service';
import { MoyennesPage } from './moyennes-page';

async function stable(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r));
    }
    await fixture.whenStable();
}

const reponse = {
    bareme: 20,
    seuil: '10.0000',
    matieres: [
        { id: 'cm-1', nom: 'Coran', coefficient: '3.00' },
        { id: 'cm-2', nom: 'Français', coefficient: '2.00' },
    ],
    eleves: [
        { apprenant_id: 'a-1', nom: 'Ndiaye', prenom: 'Awa', matieres: { 'cm-1': 14.5 }, generale: 14.5 },
        { apprenant_id: 'a-2', nom: 'Sow', prenom: 'Bineta', matieres: { 'cm-1': 8, 'cm-2': 9.25 }, generale: 8.5 },
    ],
};

describe('MoyennesService', () => {
    it('convertit la réponse de la base ; moyennes masquées → null', async () => {
        const rpc = vi.fn().mockResolvedValue({ data: reponse, error: null });
        TestBed.configureTestingModule({ providers: [{ provide: SupabaseService, useValue: { client: { rpc } } }] });
        const service = TestBed.inject(MoyennesService);
        const t = await service.calculer('c-1', 'p-1');
        expect(rpc).toHaveBeenCalledWith('moyennes', { p_classe: 'c-1', p_periode: 'p-1', p_apprenant: undefined });
        expect(t?.seuil).toBe(10);
        expect(t?.matieres[0].coefficient).toBe(3);
        expect(t?.eleves[1].matieres['cm-2']).toBe(9.25);
        rpc.mockResolvedValue({ data: { masquees: true }, error: null });
        expect(await service.calculer('c-1', 'p-1')).toBeNull();
    });
});

describe('MoyennesPage', () => {
    it('tableau élèves × matières, « — » sans note, rouge sous le seuil', async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateTesting(),
                provideSignauxTesting(),
                {
                    provide: EvaluationsService,
                    useValue: {
                        contexte: vi.fn().mockResolvedValue({
                            classes: [{ id: 'c-1', nom: 'CE1 A', matieres: [] }],
                            periodes: [{ id: 'p-1', libelle: 'Trimestre 1', debut: '2000-01-01', fin: '2999-12-31', cloturee: false }],
                            types: [],
                            bareme: 20,
                        }),
                    },
                },
                { provide: SupabaseService, useValue: { client: { rpc: vi.fn().mockResolvedValue({ data: reponse, error: null }) } } },
            ],
        });
        const fixture = TestBed.createComponent(MoyennesPage);
        await stable(fixture);
        const lignes = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')];
        expect(lignes.length).toBe(2);
        const cellules = (i: number) => [...lignes[i].querySelectorAll('td')].map((c) => c.textContent!.trim());
        expect(cellules(0)).toEqual(['14,5', '—', '14,5']);
        expect(cellules(1)).toEqual(['8', '9,25', '8,5']);
        expect(lignes[1].querySelector('td')!.className).toContain('text-danger-strong');
        expect(lignes[0].querySelector('td')!.className).not.toContain('text-danger-strong');
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Moyennes sur 20');
    });
});
