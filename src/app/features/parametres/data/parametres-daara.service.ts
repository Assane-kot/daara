import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ImageLogoService } from './image-logo.service';

/** Informations modifiables de la daara (colonnes accordées à `authenticated`, LLD §3.2). */
export interface InfosDaara {
    readonly nom: string;
    readonly ville: string;
    readonly telephone: string;
    readonly langueDefaut: 'fr' | 'en';
    readonly bareme: 10 | 20;
}

/** Erreur traduite de l'écran Paramètres → Général. */
export class ErreurParametres extends Error {
    constructor(readonly cle: string) {
        super(cle);
    }
}

/** Limites du bucket `logos` (migration `logos_daara`), vérifiées ici pour un message clair avant l'envoi. */
export const LOGO_TAILLE_MAX = 512 * 1024;
/** Taille acceptée avant ré-encodage (photo de téléphone). */
export const LOGO_SOURCE_MAX = 10 * 1024 * 1024;
const EXTENSIONS_LOGO: Readonly<Record<string, string>> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
export const TYPES_LOGO = Object.keys(EXTENSIONS_LOGO);

/** Les trois noms possibles du logo d'une daara (politiques `logos_*`). */
function cheminsLogo(daaraId: string): string[] {
    return ['png', 'jpg', 'webp'].map((extension) => `${daaraId}/logo.${extension}`);
}

/** Clé de traduction d'une erreur PostgREST ou Storage. */
export function erreurParametres(erreur: { code?: string; status?: number; statusCode?: string }): ErreurParametres {
    // Storage répond en HTTP 400 avec le vrai code dans `statusCode` (403, 413, 415) : il prime sur `status`.
    const statut = erreur.statusCode ? Number(erreur.statusCode) : erreur.status;
    if (erreur.code === '42501' || statut === 401 || statut === 403) {
        return new ErreurParametres('parametres.general.erreurs.droits');
    }
    if (erreur.code === '23514' || erreur.code === '22001') {
        return new ErreurParametres('parametres.general.erreurs.donnee_invalide');
    }
    if (statut === 413) {
        return new ErreurParametres('parametres.general.erreurs.logo_taille');
    }
    if (statut === 415) {
        return new ErreurParametres('parametres.general.erreurs.logo_type');
    }
    return new ErreurParametres('parametres.general.erreurs.inattendue');
}

/**
 * Paramètres de la daara ouverte (S2.3) : informations générales et logo. La RLS (`daaras_update_admin`, politiques
 * `logos_*` sur `storage.objects`) réserve l'écriture à l'admin `aal2` ; ce service n'en est que le confort.
 */
@Injectable({ providedIn: 'root' })
export class ParametresDaaraService {
    private readonly sb = inject(SupabaseService).client;
    private readonly auth = inject(AuthService);
    private readonly courante = inject(CurrentDaaraService);
    private readonly images = inject(ImageLogoService);

    async charger(): Promise<InfosDaara> {
        const { data, error } = await this.sb.from('daaras').select('nom, ville, telephone, langue_defaut, bareme').eq('id', this.daaraId()).single();
        if (error) {
            throw erreurParametres(error);
        }
        return {
            nom: data.nom,
            ville: data.ville ?? '',
            telephone: data.telephone ?? '',
            langueDefaut: data.langue_defaut === 'en' ? 'en' : 'fr',
            bareme: data.bareme === 10 ? 10 : 20,
        };
    }

    /** Enregistre les informations ; champs facultatifs vides → `null`. */
    async enregistrer(infos: InfosDaara): Promise<void> {
        await this.mettreAJour({
            nom: infos.nom.trim(),
            ville: infos.ville.trim() || null,
            telephone: infos.telephone.trim() || null,
            langue_defaut: infos.langueDefaut,
            bareme: infos.bareme,
        });
        await this.auth.rechargerDaaraCourante();
    }

    /**
     * Dépose le logo : image ré-encodée dans le navigateur (sans métadonnées, 512 px au plus), sous le nom imposé
     * `<daara>/logo.<ext>` (remplacement, pas d'accumulation), chemin enregistré, puis suppression des autres noms
     * possibles (lus sans se fier au cache : un autre admin a pu changer d'extension entre-temps).
     */
    async deposerLogo(fichier: File): Promise<void> {
        if (!EXTENSIONS_LOGO[fichier.type]) {
            throw new ErreurParametres('parametres.general.erreurs.logo_type');
        }
        if (fichier.size > LOGO_SOURCE_MAX) {
            throw new ErreurParametres('parametres.general.erreurs.logo_taille');
        }
        let image: Blob;
        try {
            image = await this.images.reencoder(fichier);
        } catch {
            throw new ErreurParametres('parametres.general.erreurs.logo_illisible');
        }
        const extension = EXTENSIONS_LOGO[image.type];
        if (!extension) {
            throw new ErreurParametres('parametres.general.erreurs.logo_illisible');
        }
        if (image.size > LOGO_TAILLE_MAX) {
            throw new ErreurParametres('parametres.general.erreurs.logo_taille');
        }
        const daaraId = this.daaraId();
        const chemin = `${daaraId}/logo.${extension}`;

        const { error } = await this.sb.storage.from('logos').upload(chemin, image, { upsert: true, contentType: image.type, cacheControl: '300' });
        if (error) {
            throw erreurParametres(error);
        }
        await this.mettreAJour({ logo_path: chemin });
        // Échec toléré : le nouveau logo est en place ; un fichier restant sera supprimé au prochain dépôt ou retrait.
        await this.sb.storage.from('logos').remove(cheminsLogo(daaraId).filter((c) => c !== chemin));
        await this.auth.rechargerDaaraCourante();
    }

    /**
     * Retire le logo : fichiers supprimés d'abord (le bucket est public : un échec est signalé, l'admin peut
     * réessayer), puis la daara n'y fait plus référence.
     */
    async retirerLogo(): Promise<void> {
        const daaraId = this.daaraId();
        const { error } = await this.sb.storage.from('logos').remove(cheminsLogo(daaraId));
        if (error) {
            throw new ErreurParametres('parametres.general.erreurs.logo_suppression');
        }
        await this.mettreAJour({ logo_path: null });
        await this.auth.rechargerDaaraCourante();
    }

    /** Une mise à jour filtrée par la RLS ne lève pas d'erreur : aucune ligne renvoyée = refus. */
    private async mettreAJour(valeurs: {
        nom?: string;
        ville?: string | null;
        telephone?: string | null;
        langue_defaut?: string;
        bareme?: number;
        logo_path?: string | null;
    }): Promise<void> {
        const { data, error } = await this.sb.from('daaras').update(valeurs).eq('id', this.daaraId()).select('id');
        if (error) {
            throw erreurParametres(error);
        }
        if (data.length === 0) {
            throw new ErreurParametres('parametres.general.erreurs.droits');
        }
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurParametres('parametres.general.erreurs.inattendue');
        }
        return id;
    }
}
