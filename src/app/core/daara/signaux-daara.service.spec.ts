import { DestroyRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CurrentDaaraService } from './current-daara.service';
import { SignauxDaaraService } from './signaux-daara.service';

describe('SignauxDaaraService', () => {
    let recevoir: (message: { payload: Record<string, unknown> }) => void;
    let statut: (s: string) => void;
    const canal = {
        on: vi.fn((_type: string, _filtre: unknown, rappel: typeof recevoir) => {
            recevoir = rappel;
            return canal;
        }),
        subscribe: vi.fn((rappel: typeof statut) => {
            statut = rappel;
            return canal;
        }),
    };
    const client = { channel: vi.fn(() => canal), removeChannel: vi.fn(), realtime: { setAuth: vi.fn(() => Promise.resolve()) } };
    const daaraId = signal<string | null>('d1');
    const auth = { rechargerDaaraCourante: vi.fn() };
    const destroy = { onDestroy: vi.fn() } as unknown as DestroyRef;
    let service: SignauxDaaraService;

    async function attendre(ms = 0): Promise<void> {
        await vi.advanceTimersByTimeAsync(ms);
    }

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        daaraId.set('d1');
        TestBed.configureTestingModule({
            providers: [
                { provide: SupabaseService, useValue: { client } },
                { provide: CurrentDaaraService, useValue: { id: daaraId } },
                { provide: AuthService, useValue: auth },
            ],
        });
        service = TestBed.inject(SignauxDaaraService);
        TestBed.tick();
        await attendre();
    });

    afterEach(() => vi.useRealTimers());

    it('canal privé de la daara courante', () => {
        expect(client.realtime.setAuth).toHaveBeenCalled();
        expect(client.channel).toHaveBeenCalledWith('daara:d1', { config: { private: true } });
    });

    it('recharge une seule fois pour plusieurs signaux rapprochés, seulement pour les tables suivies', async () => {
        const action = vi.fn();
        service.surveiller(['apprenants', 'inscriptions'], action, destroy);
        recevoir({ payload: { table: 'matieres' } });
        await attendre(500);
        expect(action).not.toHaveBeenCalled();
        recevoir({ payload: { table: 'apprenants' } });
        recevoir({ payload: { table: 'inscriptions' } });
        recevoir({ payload: { table: 'apprenants' } });
        await attendre(500);
        expect(action).toHaveBeenCalledTimes(1);
    });

    it('modules, daara ou membres modifiés : contexte de la daara rechargé (menus, rôles)', async () => {
        recevoir({ payload: { table: 'daara_modules' } });
        await attendre(500);
        expect(auth.rechargerDaaraCourante).toHaveBeenCalledTimes(1);
    });

    it('reconnexion : tout recharger', async () => {
        const action = vi.fn();
        service.surveiller(['matieres'], action, destroy);
        statut('SUBSCRIBED');
        await attendre(500);
        expect(action).not.toHaveBeenCalled();
        statut('SUBSCRIBED');
        await attendre(500);
        expect(action).toHaveBeenCalledTimes(1);
    });

    it('changement de daara : ancien canal fermé, nouveau canal ouvert', async () => {
        daaraId.set('d2');
        TestBed.tick();
        await attendre();
        expect(client.removeChannel).toHaveBeenCalledWith(canal);
        expect(client.channel).toHaveBeenLastCalledWith('daara:d2', { config: { private: true } });
    });
});
