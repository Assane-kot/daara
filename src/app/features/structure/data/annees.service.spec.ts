import { erreurStructure, periodesModele } from './annees.service';

describe('periodesModele', () => {
    const annee = { dateDebut: '2026-10-01', dateFin: '2027-07-31' };

    it('3 trimestres contigus couvrant toute l’année', () => {
        const p = periodesModele(annee, 'trimestres', (n) => `T${n}`);
        expect(p.map((x) => [x.libelle, x.ordre, x.dateDebut, x.dateFin])).toEqual([
            ['T1', 1, '2026-10-01', '2027-01-09'],
            ['T2', 2, '2027-01-10', '2027-04-20'],
            ['T3', 3, '2027-04-21', '2027-07-31'],
        ]);
    });

    it('2 semestres : le second commence le lendemain de la fin du premier', () => {
        const [s1, s2] = periodesModele(annee, 'semestres', (n) => `S${n}`);
        const lendemain = new Date(Date.parse(`${s1.dateFin}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
        expect([s1.dateDebut, s2.dateDebut, s2.dateFin]).toEqual(['2026-10-01', lendemain, '2027-07-31']);
    });
});

describe('erreurStructure', () => {
    it('traduit les erreurs de la base', () => {
        expect(erreurStructure({ code: '42501' }).cle).toBe('structure.erreurs.droits');
        expect(erreurStructure({ code: '23505' }).cle).toBe('structure.erreurs.doublon');
        expect(erreurStructure({ code: '23514', message: 'periodes_chevauchement' }).cle).toBe('structure.erreurs.periodes_chevauchement');
        expect(erreurStructure({ code: '23514', message: 'new row violates check constraint "annees_dates_check"' }).cle).toBe('structure.erreurs.dates');
        expect(erreurStructure({ code: '23514', message: 'autre contrainte' }).cle).toBe('structure.erreurs.donnee_invalide');
        expect(erreurStructure({ code: 'XX000' }).cle).toBe('structure.erreurs.inattendue');
    });
});
