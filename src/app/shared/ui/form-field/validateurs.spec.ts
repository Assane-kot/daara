import { FormControl, FormGroup } from '@angular/forms';
import { codeValidateur, identiqueA, motDePasseValidateur } from './validateurs';

describe('Validateurs DAARA', () => {
    it.each([
        ['daara2026', null],
        ['Ndèye2026', null],
        ['', null],
        ['court1', { motDePasse: true }],
        ['seulementdeslettres', { motDePasse: true }],
        ['1234567890', { motDePasse: true }],
    ])('mot de passe « %s »', (valeur, attendu) => {
        expect(motDePasseValidateur(new FormControl(valeur))).toEqual(attendu);
    });

    it.each([
        ['123456', null],
        ['', null],
        ['12345', { code: true }],
        ['12a456', { code: true }],
        ['1234567', { code: true }],
    ])('code « %s »', (valeur, attendu) => {
        expect(codeValidateur(new FormControl(valeur))).toEqual(attendu);
    });

    it('confirmation identique au mot de passe', () => {
        const groupe = new FormGroup({
            motDePasse: new FormControl('daara2026'),
            confirmation: new FormControl('daara2025', identiqueA('motDePasse')),
        });
        expect(groupe.controls.confirmation.errors).toEqual({ different: true });

        groupe.controls.confirmation.setValue('daara2026');
        expect(groupe.controls.confirmation.errors).toBeNull();
    });
});
