import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
    let service: SupabaseService;

    beforeEach(() => {
        TestBed.resetTestingModule();
        service = TestBed.inject(SupabaseService);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('fournit une instance unique du client', () => {
        expect(service.client).toBeDefined();
        expect(TestBed.inject(SupabaseService).client).toBe(service.client);
    });

    it('n\'embarque qu\'une clé publique', () => {
        expect(environment.supabaseAnonKey.startsWith('sb_publishable_')).toBe(true);
    });

    it('signale une API joignable', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

        expect(await service.verifierConnexion()).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(`${environment.supabaseUrl}/auth/v1/health`, expect.anything());
    });

    it('signale une API injoignable sans lever d\'erreur', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

        expect(await service.verifierConnexion()).toBe(false);
    });
});
