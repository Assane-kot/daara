import { FormControl } from '@angular/forms';
import { proposerSlug, slugValidateur } from './slug';
import { cleErreurCreation } from './data/onboarding.service';

describe('Slug de daara', () => {
    it.each([
        ['Daara Serigne Touba de Mbacké', 'daara-serigne-touba-de-mbacke'],
        ['  École Coranique  N°2 ', 'ecole-coranique-n-2'],
        ['Daara Al-Azhar / Thiès (Sénégal)', 'daara-al-azhar-thies-senegal'],
        ['---', ''],
        ['a'.repeat(49) + ' bcd', 'a'.repeat(49)],
    ])('« %s » → « %s »', (nom, attendu) => {
        expect(proposerSlug(nom)).toBe(attendu);
    });

    it.each([
        ['daara-touba', null],
        ['', null],
        ['ab', { slug: true }],
        ['Daara', { slug: true }],
        ['daara--touba', { slug: true }],
        ['-daara', { slug: true }],
        ['a'.repeat(51), { slug: true }],
    ])('validation de « %s »', (valeur, attendu) => {
        expect(slugValidateur(new FormControl(valeur))).toEqual(attendu);
    });
});

describe('cleErreurCreation', () => {
    it.each([
        ['23505', 'onboarding.erreurs.slug_pris'],
        ['23514', 'onboarding.erreurs.donnee_invalide'],
        ['P0001', 'onboarding.erreurs.limite'],
        ['42501', 'onboarding.erreurs.aal2'],
        ['XX000', 'onboarding.erreurs.inattendue'],
    ])('code %s → %s', (code, cle) => {
        expect(cleErreurCreation({ code, message: '' })).toBe(cle);
    });
});
