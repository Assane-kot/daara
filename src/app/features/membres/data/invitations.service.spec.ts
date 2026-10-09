import { TestBed } from '@angular/core/testing';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { InvitationsService, lienWhatsapp } from './invitations.service';

describe('InvitationsService', () => {
    let service: InvitationsService;
    const client = { functions: { invoke: vi.fn() }, rpc: vi.fn(), from: vi.fn() };
    const saisie = { role: 'parent' as const, email: null, telephone: '+221771234567', prenom: 'Fatou', nom: '', langue: 'fr' as const };

    beforeEach(() => {
        vi.resetAllMocks();
        TestBed.configureTestingModule({ providers: [{ provide: SupabaseService, useValue: { client } }] });
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
        service = TestBed.inject(InvitationsService);
    });

    it('invite par l’Edge Function et signale le changement', async () => {
        client.functions.invoke.mockResolvedValue({
            data: { lien: 'https://daara.app/invitation#J', email_envoye: false, message_whatsapp: 'msg', telephone: '+221771234567' },
            error: null,
        });
        const r = await service.inviter(saisie);
        expect(client.functions.invoke).toHaveBeenCalledWith('invite-member', { body: { daara_id: 'd-1', ...saisie } });
        expect(r).toEqual({ lien: 'https://daara.app/invitation#J', emailEnvoye: false, messageWhatsapp: 'msg', telephone: '+221771234567' });
        expect(service.version()).toBe(1);
    });

    it('traduit le code { code } de la fonction', async () => {
        const reponse = new Response(JSON.stringify({ code: 'quota_invitations' }), { status: 429 });
        client.functions.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(reponse) });
        await expect(service.inviter(saisie)).rejects.toMatchObject({ cle: 'invitations.erreurs.quota_invitations' });
        expect(service.version()).toBe(0);
    });

    it('révoque par RPC', async () => {
        client.rpc.mockResolvedValue({ error: null });
        await service.revoquer('i-1');
        expect(client.rpc).toHaveBeenCalledWith('revoquer_invitation', { p_invitation: 'i-1' });
    });

    it('lien WhatsApp : chiffres seuls, message encodé', () => {
        expect(lienWhatsapp('+221 77 123', 'Bonjour & bienvenue')).toBe('https://wa.me/22177123?text=Bonjour%20%26%20bienvenue');
    });
});
