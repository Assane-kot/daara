import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ParentsService } from './parents.service';

describe('ParentsService.mesEnfants', () => {
    it('ne lit que les enfants reliés au parent connecté (même s’il est aussi admin ou enseignant)', async () => {
        const select = vi.fn<(colonnes: string) => unknown>();
        const eq = vi.fn();
        const requete = { select, eq, order: vi.fn(() => Promise.resolve({ data: [], error: null })) };
        select.mockReturnValue(requete);
        eq.mockReturnValue(requete);
        TestBed.configureTestingModule({
            providers: [
                { provide: SupabaseService, useValue: { client: { from: () => requete } } },
                { provide: CurrentDaaraService, useValue: { id: () => 'd1' } },
                { provide: AuthService, useValue: { user: () => ({ id: 'u1' }) } },
            ],
        });
        await TestBed.inject(ParentsService).mesEnfants();
        expect(select).toHaveBeenCalledWith(expect.stringContaining('parent_links!inner(parent_user_id)'));
        expect(eq).toHaveBeenCalledWith('parent_links.parent_user_id', 'u1');
        expect(eq).toHaveBeenCalledWith('daara_id', 'd1');
    });
});
