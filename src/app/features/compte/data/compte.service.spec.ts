import { TestBed } from '@angular/core/testing';
import { AuthError } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth/auth.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { CompteService, ErreurCompte } from './compte.service';

describe('CompteService', () => {
    const authApi = {
        updateUser: vi.fn(),
        reauthenticate: vi.fn(),
        mfa: { listFactors: vi.fn(), unenroll: vi.fn() },
    };
    const requete = { select: vi.fn(), update: vi.fn(), eq: vi.fn(), single: vi.fn() };
    const client = { auth: authApi, from: vi.fn(() => requete) };
    const auth = { user: () => ({ id: 'u-1' }), rolesActifs: vi.fn() };
    let service: CompteService;

    beforeEach(() => {
        vi.resetAllMocks();
        client.from.mockImplementation(() => requete);
        requete.select.mockReturnValue(requete);
        requete.update.mockReturnValue(requete);
        requete.eq.mockReturnValue(requete);
        TestBed.configureTestingModule({
            providers: [
                { provide: SupabaseService, useValue: { client } },
                { provide: AuthService, useValue: auth },
            ],
        });
        service = TestBed.inject(CompteService);
    });

    it('mot de passe : réauthentification exigée, puis code invalide', async () => {
        authApi.updateUser.mockResolvedValueOnce({ error: new AuthError('x', 400, 'reauthentication_needed') });
        await expect(service.changerMotDePasse('daara2026')).rejects.toEqual(new ErreurCompte('reauthentification'));
        authApi.updateUser.mockResolvedValueOnce({ error: new AuthError('x', 400, 'reauthentication_not_valid') });
        await expect(service.changerMotDePasse('daara2026', '123456')).rejects.toEqual(new ErreurCompte('code_reauthentification'));
        expect(authApi.updateUser).toHaveBeenLastCalledWith({ password: 'daara2026', nonce: '123456' });
    });

    it('mot de passe : autre erreur Auth relancée telle quelle', async () => {
        const erreur = new AuthError('x', 422, 'same_password');
        authApi.updateUser.mockResolvedValue({ error: erreur });
        await expect(service.changerMotDePasse('daara2026')).rejects.toBe(erreur);
    });

    it('appareils : facteurs TOTP vérifiés seulement, du plus ancien au plus récent', async () => {
        authApi.mfa.listFactors.mockResolvedValue({
            data: {
                all: [
                    { id: 'f2', factor_type: 'totp', status: 'verified', friendly_name: 'Tablette', created_at: '2026-10-09T10:00:00Z' },
                    { id: 'f3', factor_type: 'totp', status: 'unverified', friendly_name: 'Abandon', created_at: '2026-10-09T11:00:00Z' },
                    { id: 'f1', factor_type: 'totp', status: 'verified', friendly_name: 'Téléphone', created_at: '2026-10-01T10:00:00Z' },
                ],
            },
            error: null,
        });
        expect((await service.appareils()).map((a) => a.id)).toEqual(['f1', 'f2']);
    });

    it('retrait d’un appareil : les autres sessions sont fermées ensuite', async () => {
        authApi.mfa.unenroll.mockResolvedValue({ error: null });
        const signOut = vi.fn().mockResolvedValue({ error: null });
        (authApi as unknown as { signOut: typeof signOut }).signOut = signOut;
        await service.retirerAppareil('f2');
        expect(authApi.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'f2' });
        expect(signOut).toHaveBeenCalledWith({ scope: 'others' });

        signOut.mockResolvedValue({ error: new AuthError('x', 500) });
        await expect(service.retirerAppareil('f2')).rejects.toEqual(new ErreurCompte('sessions'));
    });

    it('profil : aucune ligne mise à jour = refus ; langue copiée dans les métadonnées Auth', async () => {
        requete.select.mockResolvedValueOnce({ data: [], error: null });
        const profil = { prenom: 'Awa', nom: 'Diop', telephone: null, langue: 'en' as const };
        await expect(service.enregistrerProfil(profil)).rejects.toEqual(new ErreurCompte('enregistrement'));

        requete.select.mockResolvedValueOnce({ data: [{ id: 'u-1' }], error: null });
        authApi.updateUser.mockResolvedValue({ error: null });
        await service.enregistrerProfil(profil);
        expect(requete.update).toHaveBeenLastCalledWith({ prenom: 'Awa', nom: 'Diop', telephone: null, langue: 'en' });
        expect(authApi.updateUser).toHaveBeenCalledWith({ data: { langue: 'en' } });
    });
});
