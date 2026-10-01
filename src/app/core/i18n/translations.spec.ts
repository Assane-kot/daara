import { TRADUCTIONS } from '../../../testing/translate-testing';
import { LANGUES } from './language.service';

/** Liste les clés « a.b.c » d'un fichier de traduction. */
function cles(objet: unknown, prefixe = ''): string[] {
    if (typeof objet !== 'object' || objet === null) {
        return [prefixe];
    }
    return Object.entries(objet).flatMap(([cle, valeur]) => cles(valeur, prefixe ? `${prefixe}.${cle}` : cle));
}

describe('Fichiers de traduction', () => {
    it("existent pour chaque langue de l'interface", () => {
        for (const langue of LANGUES) {
            expect(TRADUCTIONS[langue]).toBeDefined();
        }
    });

    it('ont exactement les mêmes clés en français et en anglais', () => {
        expect(cles(TRADUCTIONS['en']).sort()).toEqual(cles(TRADUCTIONS['fr']).sort());
    });

    it("n'ont aucune valeur vide", () => {
        for (const langue of LANGUES) {
            const vides = cles(TRADUCTIONS[langue]).filter((cle) => {
                const valeur = cle.split('.').reduce<unknown>((noeud, partie) => (noeud as Record<string, unknown>)[partie], TRADUCTIONS[langue]);
                return typeof valeur !== 'string' || valeur.trim() === '';
            });
            expect(vides, `langue ${langue}`).toEqual([]);
        }
    });
});
