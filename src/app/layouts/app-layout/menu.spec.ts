import { EntreeMenu, barreBasseVisible, menuVisible } from './menu';

const MENU_TEST: EntreeMenu[] = [
    { cle: 'tableau', icone: 'tableau', route: '', barreBasse: true },
    { cle: 'membres', icone: 'membres', route: 'membres', roles: ['admin'] },
    { cle: 'notes', icone: 'tableau', route: 'notes', roles: ['admin', 'enseignant', 'parent'], module: 'notes', barreBasse: true },
    { cle: 'coran', icone: 'tableau', route: 'coran', module: 'coran_cahier', barreBasse: true },
    { cle: 'compte', icone: 'compte', route: 'compte', barreBasse: true },
    { cle: 'aide', icone: 'tableau', route: 'aide', barreBasse: true },
];

describe('Menu par rôle et par module', () => {
    it('admin avec tous les modules : tout', () => {
        expect(menuVisible(MENU_TEST, ['admin'], ['notes', 'coran_cahier']).map((e) => e.cle)).toEqual([
            'tableau',
            'membres',
            'notes',
            'coran',
            'compte',
            'aide',
        ]);
    });

    it('parent : pas d’entrée réservée à l’admin', () => {
        expect(menuVisible(MENU_TEST, ['parent'], ['notes', 'coran_cahier']).map((e) => e.cle)).toEqual(['tableau', 'notes', 'coran', 'compte', 'aide']);
    });

    it('module désactivé : entrée masquée pour tous', () => {
        expect(menuVisible(MENU_TEST, ['admin'], ['coran_cahier']).map((e) => e.cle)).not.toContain('notes');
        expect(menuVisible(MENU_TEST, ['admin'], ['notes']).map((e) => e.cle)).not.toContain('coran');
    });

    it('rôles cumulés : union des droits', () => {
        expect(menuVisible(MENU_TEST, ['parent', 'admin'], []).map((e) => e.cle)).toContain('membres');
    });

    it('barre basse : entrées marquées, 4 au plus', () => {
        expect(barreBasseVisible(MENU_TEST, ['parent'], ['notes', 'coran_cahier']).map((e) => e.cle)).toEqual(['tableau', 'notes', 'coran', 'compte']);
        expect(barreBasseVisible(MENU_TEST, ['apprenant'], []).map((e) => e.cle)).toEqual(['tableau', 'compte', 'aide']);
    });
});
