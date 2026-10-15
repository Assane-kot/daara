import { situationDuJour } from './situation';

describe('situationDuJour (accueil du parent)', () => {
    const enfant = { id: 'e1', classeId: 'c1' };

    it('sans classe, appel pas encore fait, appel en cours (rien n’est dit avant la fin)', () => {
        expect(situationDuJour({ id: 'e1', classeId: null }, [], []).code).toBe('sans_classe');
        expect(situationDuJour(enfant, [], []).code).toBe('attente');
        expect(
            situationDuJour(enfant, [{ classeId: 'c1', creneau: 'journee', termine: false }], [{ apprenantId: 'e1', type: 'absence', creneau: 'journee' }])
                .code,
        ).toBe('attente');
    });

    it('appel terminé : présent, absent ou en retard', () => {
        const appel = [{ classeId: 'c1', creneau: 'journee' as const, termine: true }];
        expect(situationDuJour(enfant, appel, [])).toEqual({ code: 'present', creneau: 'journee' });
        expect(situationDuJour(enfant, appel, [{ apprenantId: 'e1', type: 'absence', creneau: 'journee' }]).code).toBe('absence');
        expect(situationDuJour(enfant, appel, [{ apprenantId: 'e1', type: 'retard', creneau: 'journee' }]).code).toBe('retard');
        expect(situationDuJour(enfant, appel, [{ apprenantId: 'autre', type: 'absence', creneau: 'journee' }]).code).toBe('present');
    });

    it('matin et après-midi : le créneau le plus récent l’emporte', () => {
        const matin = { classeId: 'c1', creneau: 'matin' as const, termine: true };
        const apresMidi = { classeId: 'c1', creneau: 'apres_midi' as const, termine: true };
        const absentLeMatin = [{ apprenantId: 'e1', type: 'absence' as const, creneau: 'matin' as const }];
        expect(situationDuJour(enfant, [matin], absentLeMatin)).toEqual({ code: 'absence', creneau: 'matin' });
        expect(situationDuJour(enfant, [matin, apresMidi], absentLeMatin)).toEqual({ code: 'present', creneau: 'apres_midi' });
    });
});
