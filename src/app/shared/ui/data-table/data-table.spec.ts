import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { CarteTable, CelluleTable, ColonneTable, DataTable, PageTable, RequeteTable, motifIlike } from './data-table';

interface Ligne {
    readonly id: string;
    readonly nom: string;
}

const chargeur = vi.fn<(r: RequeteTable) => Promise<PageTable<Ligne>>>();

@Component({
    imports: [DataTable, CelluleTable, CarteTable],
    template: `
        <app-data-table [colonnes]="colonnes" [chargeur]="chargeur" [taille]="2" rechercheLibelle="table.recherche">
            <ng-template appCellule="nom" let-l
                ><b>{{ l.nom }}</b></ng-template
            >
            <ng-template appCarte let-l>{{ l.nom }}</ng-template>
        </app-data-table>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
class Hote {
    readonly colonnes: readonly ColonneTable[] = [
        { cle: 'nom', libelle: 'structure.matieres.nom', triable: true },
        { cle: 'id', libelle: 'structure.matieres.code' },
    ];
    readonly chargeur = chargeur;
    readonly table = viewChild.required(DataTable);
}

describe('DataTable', () => {
    let fixture: ComponentFixture<Hote>;
    let element: HTMLElement;
    const lignes = (n: number): Ligne[] => Array.from({ length: n }, (_, i) => ({ id: `l${i}`, nom: `Nom ${i}` }));

    async function stable(): Promise<void> {
        await new Promise((r) => setTimeout(r));
        await fixture.whenStable();
    }
    const bouton = (texte: string) => [...element.querySelectorAll('button')].find((b) => b.textContent!.trim().startsWith(texte)) as HTMLButtonElement;

    beforeEach(async () => {
        vi.resetAllMocks();
        chargeur.mockImplementation((r) => Promise.resolve({ lignes: lignes(5).slice(r.page * r.taille, (r.page + 1) * r.taille), total: 5 }));
        TestBed.configureTestingModule({ providers: [provideTranslateTesting()] });
        fixture = TestBed.createComponent(Hote);
        element = fixture.nativeElement as HTMLElement;
        await stable();
    });

    it('première page : cellules projetées, valeur brute par défaut, plage affichée', () => {
        expect(chargeur).toHaveBeenCalledWith({ page: 0, taille: 2, tri: null, recherche: '' });
        expect(element.querySelector('tbody td b')?.textContent).toBe('Nom 0');
        expect(element.querySelectorAll('tbody td')[1].textContent?.trim()).toBe('l0');
        expect(element.textContent).toContain('1–2 sur 5');
        expect(bouton('Précédent').disabled).toBe(true);
    });

    it('pagination et tri (retour à la première page, sens inversé au second clic)', async () => {
        bouton('Suivant').click();
        await stable();
        expect(chargeur).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
        expect(element.textContent).toContain('3–4 sur 5');

        bouton('Nom').click();
        await stable();
        expect(chargeur).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, tri: { cle: 'nom', desc: false } }));
        bouton('Nom').click();
        await stable();
        expect(chargeur).toHaveBeenLastCalledWith(expect.objectContaining({ tri: { cle: 'nom', desc: true } }));
        expect(element.querySelector('th')?.getAttribute('aria-sort')).toBe('descending');
    });

    it('recherche différée, réponse périmée ignorée', async () => {
        let resoudreLente: (p: PageTable<Ligne>) => void = () => undefined;
        chargeur.mockImplementationOnce(() => new Promise((r) => (resoudreLente = r)));
        void fixture.componentInstance.table().recharger();
        const champ = element.querySelector('input[type=search]') as HTMLInputElement;
        champ.value = ' nom 4 ';
        champ.dispatchEvent(new Event('input'));
        await new Promise((r) => setTimeout(r, 350));
        await stable();
        expect(chargeur).toHaveBeenLastCalledWith(expect.objectContaining({ recherche: 'nom 4', page: 0 }));
        resoudreLente({ lignes: [{ id: 'x', nom: 'Périmée' }], total: 1 });
        await stable();
        expect(element.textContent).not.toContain('Périmée');
    });

    it('erreur : message et Réessayer ; vide : état vide', async () => {
        chargeur.mockRejectedValueOnce(new Error('réseau'));
        await fixture.componentInstance.table().recharger();
        await stable();
        expect(element.querySelector('[role=alert]')).not.toBeNull();
        chargeur.mockResolvedValueOnce({ lignes: [], total: 0 });
        bouton('Réessayer').click();
        await stable();
        expect(element.textContent).toContain('Aucun résultat');
    });

    it('motifIlike : syntaxe des filtres et jokers neutralisés', () => {
        expect(motifIlike('a,b(c)%d*e')).toBe('%a b c  d e%');
    });
});
