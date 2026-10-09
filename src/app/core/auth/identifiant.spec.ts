import { lireIdentifiant, normaliserTelephone } from './identifiant';

describe('identifiant de connexion (ADR-009)', () => {
    it('normalise les numéros comme les Edge Functions', () => {
        expect(normaliserTelephone('77 123 45 67')).toBe('+221771234567');
        expect(normaliserTelephone('+221 77-123.45.67')).toBe('+221771234567');
        expect(normaliserTelephone('00221771234567')).toBe('+221771234567');
        expect(normaliserTelephone('+33 6 12 34 56 78')).toBe('+33612345678');
        expect(normaliserTelephone('12')).toBeNull();
        expect(normaliserTelephone('77 abc')).toBeNull();
    });

    it('distingue e-mail et téléphone', () => {
        expect(lireIdentifiant(' Awa@Test.SN ')).toEqual({ email: 'awa@test.sn' });
        expect(lireIdentifiant('771234567')).toEqual({ telephone: '+221771234567' });
        expect(lireIdentifiant('awa@')).toBeNull();
        expect(lireIdentifiant('abc')).toBeNull();
    });
});
