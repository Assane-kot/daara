import { MODULES } from './daara.model';
import { MODULES_DU_PROFIL, PREREQUIS, avecPrerequis, dependantsActifs } from './modules';

describe('Catalogue des modules (ADR-008)', () => {
    it('MODULES est complet : mêmes modules que PREREQUIS, que TypeScript oblige à couvrir tout l’enum', () => {
        expect([...MODULES].sort()).toEqual(Object.keys(PREREQUIS).sort());
        expect(new Set(MODULES).size).toBe(MODULES.length);
    });

    it('ajoute les prérequis, y compris indirects, dans l’ordre du catalogue', () => {
        expect(avecPrerequis(['bulletins'])).toEqual(['structure', 'notes', 'bulletins']);
        expect(avecPrerequis(['coran_nafar', 'absences'])).toEqual(['structure', 'absences', 'coran_cahier', 'coran_nafar']);
        expect(avecPrerequis([])).toEqual([]);
    });

    it('trouve les modules actifs qui dépendent d’un module', () => {
        const actifs = avecPrerequis(['bulletins', 'absences', 'coran_cahier']);
        expect(dependantsActifs('structure', actifs)).toEqual(['absences', 'notes', 'bulletins']);
        expect(dependantsActifs('notes', actifs)).toEqual(['bulletins']);
        expect(dependantsActifs('bulletins', actifs)).toEqual([]);
        expect(dependantsActifs('coran_cahier', actifs)).toEqual([]);
    });

    it('profils : coranique sans notes ni bulletins, franco-arabe complet, chacun cohérent', () => {
        expect(MODULES_DU_PROFIL.coranique).not.toContain('notes');
        expect(MODULES_DU_PROFIL.coranique).not.toContain('bulletins');
        expect(MODULES_DU_PROFIL.franco_arabe).toEqual(MODULES);
        for (const modules of Object.values(MODULES_DU_PROFIL)) {
            expect(avecPrerequis(modules)).toEqual([...modules]);
        }
    });
});
