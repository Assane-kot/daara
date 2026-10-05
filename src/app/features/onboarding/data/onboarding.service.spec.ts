import { TestBed } from '@angular/core/testing';
import { ClientFactice, clientFactice, sessionFactice } from '../../../../testing/supabase-factice';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { MODULES_DU_PROFIL } from '../../../core/daara/modules';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ErreurCreationDaara, OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
    let client: ClientFactice;
    let service: OnboardingService;

    beforeEach(() => {
        client = clientFactice(sessionFactice());
        TestBed.configureTestingModule({ providers: [provideTranslateTesting(), { provide: SupabaseService, useValue: { client } }] });
        service = TestBed.inject(OnboardingService);
    });

    it('crée la daara avec les modules du profil choisi (ADR-008)', async () => {
        client.rpc.mockResolvedValue({ data: 'daara-keur-thies', error: null });

        const slug = await service.creerDaara({
            nom: 'Daara Keur Thiès',
            slug: 'daara-keur-thies',
            ville: '',
            telephone: '',
            langueDefaut: 'fr',
            bareme: 20,
            modules: MODULES_DU_PROFIL.coranique,
        });

        expect(slug).toBe('daara-keur-thies');
        expect(client.rpc).toHaveBeenCalledWith('creer_daara', {
            p_nom: 'Daara Keur Thiès',
            p_slug: 'daara-keur-thies',
            p_ville: undefined,
            p_telephone: undefined,
            p_langue_defaut: 'fr',
            p_bareme: 20,
            p_modules: [...MODULES_DU_PROFIL.coranique],
        });
    });

    it('traduit le slug déjà pris', async () => {
        client.rpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });
        await expect(service.creerDaara({ nom: 'Daara', slug: 'pris', ville: '', telephone: '', langueDefaut: 'fr', bareme: 20, modules: [] })).rejects.toEqual(
            new ErreurCreationDaara('onboarding.erreurs.slug_pris'),
        );
    });
});
