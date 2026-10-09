import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { Membre, MembresService, erreurMembres } from './membres.service';

describe('MembresService', () => {
    let service: MembresService;
    const auth = { user: vi.fn(), rechargerDaaraCourante: vi.fn() };
    const client = { rpc: vi.fn() };

    const membre = (moi: boolean): Membre => ({ id: 'm-1', userId: 'u-1', role: 'admin', actif: true, nom: 'Awa Diop', telephone: null, depuis: '', moi });

    beforeEach(() => {
        vi.clearAllMocks();
        auth.user.mockReturnValue({ id: 'u-1' });
        client.rpc.mockResolvedValue({ data: null, error: null });
        TestBed.configureTestingModule({
            providers: [
                { provide: SupabaseService, useValue: { client } },
                { provide: AuthService, useValue: auth },
            ],
        });
        TestBed.inject(CurrentDaaraService).definir({
            id: 'd-1',
            slug: 'd',
            nom: 'D',
            ville: null,
            logoPath: null,
            logoUrl: null,
            roles: ['admin'],
            modules: [],
        });
        service = TestBed.inject(MembresService);
    });

    it('page de membres : paramètres de la RPC (tri, filtres, pagination) et « moi »', async () => {
        client.rpc.mockResolvedValueOnce({
            data: [
                { id: 'm-1', user_id: 'u-1', role: 'admin', actif: true, nom: 'Awa Diop', telephone: '77', depuis: 't1', total: 12 },
                { id: 'm-2', user_id: 'u-2', role: 'parent', actif: false, nom: 'Fatou Ndiaye', telephone: null, depuis: 't2', total: 12 },
            ],
            error: null,
        });
        const page = await service.page({ page: 2, taille: 5, tri: { cle: 'nom', desc: true }, recherche: 'awa' }, '', 'tous');

        expect(client.rpc).toHaveBeenCalledWith('rechercher_membres', {
            p_daara: 'd-1',
            p_texte: 'awa',
            p_role: null,
            p_etat: 'tous',
            p_tri: '-nom',
            p_offset: 10,
            p_limite: 5,
        });
        expect(page.total).toBe(12);
        expect(page.lignes.map((m) => [m.nom, m.moi])).toEqual([
            ['Awa Diop', true],
            ['Fatou Ndiaye', false],
        ]);
    });

    it('change un rôle et désactive par RPC', async () => {
        await service.changerRole(membre(false), 'enseignant');
        await service.definirActif(membre(false), false);

        expect(client.rpc).toHaveBeenCalledWith('changer_role', { p_membership: 'm-1', p_role: 'enseignant' });
        expect(client.rpc).toHaveBeenCalledWith('definir_actif', { p_membership: 'm-1', p_actif: false });
        expect(auth.rechargerDaaraCourante).not.toHaveBeenCalled();
    });

    it('recharge la daara courante quand l’admin modifie son propre membership', async () => {
        await service.changerRole(membre(true), 'enseignant');
        expect(auth.rechargerDaaraCourante).toHaveBeenCalled();
    });

    it('traduit les erreurs des RPC', async () => {
        client.rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'dernier_admin' } });
        await expect(service.definirActif(membre(true), false)).rejects.toMatchObject({ cle: 'membres.erreurs.dernier_admin' });
        expect(auth.rechargerDaaraCourante).not.toHaveBeenCalled();

        expect(erreurMembres({ code: '42501' }).cle).toBe('membres.erreurs.droits');
        expect(erreurMembres({ code: '23505' }).cle).toBe('membres.erreurs.role_deja_attribue');
        expect(erreurMembres({ code: '22023' }).cle).toBe('membres.erreurs.role_invalide');
        expect(erreurMembres({ code: '23514', message: 'autre' }).cle).toBe('membres.erreurs.inattendue');
    });
});
