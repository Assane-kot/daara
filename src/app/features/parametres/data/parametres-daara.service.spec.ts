import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ImageLogoService } from './image-logo.service';
import { ErreurParametres, LOGO_SOURCE_MAX, LOGO_TAILLE_MAX, ParametresDaaraService, erreurParametres } from './parametres-daara.service';

describe('ParametresDaaraService', () => {
    let service: ParametresDaaraService;
    let courante: CurrentDaaraService;
    const auth = { rechargerDaaraCourante: vi.fn() };
    const bucket = { upload: vi.fn(), remove: vi.fn() };
    const images = { reencoder: vi.fn() };
    const reencodee = new Blob([new Uint8Array(100)], { type: 'image/webp' });
    // Requête PostgREST « thenable » : `resultat` est renvoyé à la fin de la chaîne.
    let resultat: { data: unknown; error: unknown };
    const requete = {
        select: vi.fn(() => requete),
        update: vi.fn(() => requete),
        eq: vi.fn(() => requete),
        single: vi.fn(() => requete),
        then: (resoudre: (valeur: unknown) => unknown) => resoudre(resultat),
    };
    const client = { from: vi.fn(() => requete), storage: { from: vi.fn(() => bucket) } };

    function ouvrir(logoPath: string | null): void {
        courante.definir({ id: 'd-1', slug: 'daara', nom: 'Daara', ville: null, logoPath, logoUrl: null, roles: ['admin'], modules: [] });
    }

    function image(type: string, taille = 1000): File {
        return new File([new Uint8Array(taille)], 'mon logo.png', { type });
    }

    beforeEach(() => {
        vi.clearAllMocks();
        resultat = { data: [{ id: 'd-1' }], error: null };
        bucket.upload.mockResolvedValue({ data: {}, error: null });
        bucket.remove.mockResolvedValue({ data: [], error: null });
        images.reencoder.mockResolvedValue(reencodee);
        TestBed.configureTestingModule({
            providers: [
                { provide: SupabaseService, useValue: { client } },
                { provide: AuthService, useValue: auth },
                { provide: ImageLogoService, useValue: images },
            ],
        });
        service = TestBed.inject(ParametresDaaraService);
        courante = TestBed.inject(CurrentDaaraService);
        ouvrir(null);
    });

    it('charge les informations de la daara ouverte (vides → chaînes vides)', async () => {
        resultat = { data: { nom: 'Daara', ville: null, telephone: '77 000 00 00', langue_defaut: 'en', bareme: 10 }, error: null };
        expect(await service.charger()).toEqual({ nom: 'Daara', ville: '', telephone: '77 000 00 00', langueDefaut: 'en', bareme: 10 });
        expect(requete.eq).toHaveBeenCalledWith('id', 'd-1');
    });

    it('enregistre (espaces retirés, vides → null) puis recharge la daara courante', async () => {
        await service.enregistrer({ nom: '  Daara Touba ', ville: ' ', telephone: '', langueDefaut: 'fr', bareme: 20 });
        expect(requete.update).toHaveBeenCalledWith({ nom: 'Daara Touba', ville: null, telephone: null, langue_defaut: 'fr', bareme: 20 });
        expect(auth.rechargerDaaraCourante).toHaveBeenCalled();
    });

    it('une mise à jour filtrée par la RLS (aucune ligne) est un refus', async () => {
        resultat = { data: [], error: null };
        await expect(service.enregistrer({ nom: 'Daara', ville: '', telephone: '', langueDefaut: 'fr', bareme: 20 })).rejects.toMatchObject({
            cle: 'parametres.general.erreurs.droits',
        });
        expect(auth.rechargerDaaraCourante).not.toHaveBeenCalled();
    });

    it('dépose le logo ré-encodé sous le nom imposé, enregistre le chemin, supprime les autres noms', async () => {
        const source = image('image/jpeg');
        await service.deposerLogo(source);

        expect(images.reencoder).toHaveBeenCalledWith(source);
        expect(bucket.upload).toHaveBeenCalledWith('d-1/logo.webp', reencodee, { upsert: true, contentType: 'image/webp', cacheControl: '300' });
        expect(requete.update).toHaveBeenCalledWith({ logo_path: 'd-1/logo.webp' });
        expect(bucket.remove).toHaveBeenCalledWith(['d-1/logo.png', 'd-1/logo.jpg']);
        expect(auth.rechargerDaaraCourante).toHaveBeenCalled();
    });

    it('navigateur sans encodeur WebP : PNG', async () => {
        images.reencoder.mockResolvedValue(new Blob([new Uint8Array(10)], { type: 'image/png' }));
        await service.deposerLogo(image('image/webp'));
        expect(bucket.upload).toHaveBeenCalledWith('d-1/logo.png', expect.any(Blob), expect.objectContaining({ contentType: 'image/png' }));
        expect(bucket.remove).toHaveBeenCalledWith(['d-1/logo.jpg', 'd-1/logo.webp']);
    });

    it('refuse SVG, fichier source trop lourd et faux PNG avant tout envoi', async () => {
        await expect(service.deposerLogo(image('image/svg+xml'))).rejects.toMatchObject({ cle: 'parametres.general.erreurs.logo_type' });
        await expect(service.deposerLogo(image('image/png', LOGO_SOURCE_MAX + 1))).rejects.toMatchObject({ cle: 'parametres.general.erreurs.logo_taille' });
        images.reencoder.mockRejectedValue(new DOMException('The source image could not be decoded.', 'InvalidStateError'));
        await expect(service.deposerLogo(image('image/png'))).rejects.toMatchObject({ cle: 'parametres.general.erreurs.logo_illisible' });
        expect(bucket.upload).not.toHaveBeenCalled();
    });

    it('image ré-encodée encore trop lourde : refusée', async () => {
        images.reencoder.mockResolvedValue(new Blob([new Uint8Array(LOGO_TAILLE_MAX + 1)], { type: 'image/webp' }));
        await expect(service.deposerLogo(image('image/png'))).rejects.toMatchObject({ cle: 'parametres.general.erreurs.logo_taille' });
        expect(bucket.upload).not.toHaveBeenCalled();
    });

    it('échec du dépôt : le chemin n’est pas enregistré', async () => {
        bucket.upload.mockResolvedValue({ data: null, error: { status: 400, statusCode: '403', message: 'new row violates row-level security policy' } });
        await expect(service.deposerLogo(image('image/png'))).rejects.toMatchObject({ cle: 'parametres.general.erreurs.droits' });
        expect(requete.update).not.toHaveBeenCalled();
    });

    it('retire le logo : les trois noms supprimés, puis chemin effacé', async () => {
        await service.retirerLogo();
        expect(bucket.remove).toHaveBeenCalledWith(['d-1/logo.png', 'd-1/logo.jpg', 'd-1/logo.webp']);
        expect(requete.update).toHaveBeenCalledWith({ logo_path: null });
    });

    it('retrait : un échec de suppression est signalé et la daara n’est pas modifiée', async () => {
        bucket.remove.mockResolvedValue({ data: null, error: { status: 500 } });
        await expect(service.retirerLogo()).rejects.toMatchObject({ cle: 'parametres.general.erreurs.logo_suppression' });
        expect(requete.update).not.toHaveBeenCalled();
    });
});

describe('erreurParametres', () => {
    it('traduit les erreurs PostgREST et Storage', () => {
        expect(erreurParametres({ code: '42501' }).cle).toBe('parametres.general.erreurs.droits');
        expect(erreurParametres({ code: '23514' }).cle).toBe('parametres.general.erreurs.donnee_invalide');
        expect(erreurParametres({ status: 400, statusCode: '413' }).cle).toBe('parametres.general.erreurs.logo_taille');
        expect(erreurParametres({ status: 400, statusCode: '415' }).cle).toBe('parametres.general.erreurs.logo_type');
        expect(erreurParametres({ status: 400, statusCode: '403' }).cle).toBe('parametres.general.erreurs.droits');
        expect(erreurParametres({ status: 415 }).cle).toBe('parametres.general.erreurs.logo_type');
        expect(erreurParametres({ code: 'XX000' })).toBeInstanceOf(ErreurParametres);
        expect(erreurParametres({ code: 'XX000' }).cle).toBe('parametres.general.erreurs.inattendue');
    });
});
