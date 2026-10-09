import { Injectable, inject } from '@angular/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Database } from '../../../core/supabase/database.types';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { PageTable, RequeteTable, motifIlike, sansAccents } from '../../../shared/ui/data-table/data-table';
import { ImageLogoService } from '../../parametres/data/image-logo.service';

export type Sexe = Database['public']['Enums']['sexe_apprenant'];
export type StatutApprenant = Database['public']['Enums']['statut_apprenant'];

export interface Apprenant {
    readonly id: string;
    readonly matricule: string;
    readonly nom: string;
    readonly prenom: string;
    readonly dateNaissance: string | null;
    readonly sexe: Sexe | null;
    readonly statut: StatutApprenant;
    readonly photoPath: string | null;
}

export interface SaisieApprenant {
    readonly nom: string;
    readonly prenom: string;
    readonly dateNaissance: string | null;
    readonly sexe: Sexe | null;
}

/** Erreur traduite des apprenants (clé `apprenants.erreurs.*`). */
export class ErreurApprenants extends Error {
    constructor(readonly cle: string) {
        super(cle);
    }
}

export function erreurApprenants(erreur: { code?: string; message?: string } | null): ErreurApprenants {
    switch (erreur?.code) {
        case '42501':
            return new ErreurApprenants('apprenants.erreurs.droits');
        case '23514':
            return new ErreurApprenants('apprenants.erreurs.donnee_invalide');
        case '23503':
            return new ErreurApprenants('apprenants.erreurs.utilise');
        default:
            return new ErreurApprenants('apprenants.erreurs.inattendue');
    }
}

const COLONNES = 'id, matricule, nom, prenom, date_naissance, sexe, statut, photo_path';
interface Ligne {
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    date_naissance: string | null;
    sexe: Sexe | null;
    statut: StatutApprenant;
    photo_path: string | null;
}

function versApprenant(a: Ligne): Apprenant {
    return {
        id: a.id,
        matricule: a.matricule,
        nom: a.nom,
        prenom: a.prenom,
        dateNaissance: a.date_naissance,
        sexe: a.sexe,
        statut: a.statut,
        photoPath: a.photo_path,
    };
}

/**
 * Fiches des apprenants de la daara ouverte (S4.1, ADR-010) : écritures directes sous RLS (admin aal2), matricule
 * attribué par la base, photo dans le bucket privé `photos` (ré-encodée, URL signée d'une heure).
 */
@Injectable({ providedIn: 'root' })
export class ApprenantsService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);
    private readonly images = inject(ImageLogoService);

    /** Page pour `data-table` : recherche sans accents (prénom, nom, matricule), filtre statut, tri nom / matricule. */
    async page(r: RequeteTable, statut: StatutApprenant | ''): Promise<PageTable<Apprenant>> {
        let q = this.sb.from('apprenants').select(COLONNES, { count: 'exact' }).eq('daara_id', this.daaraId());
        if (statut) {
            q = q.eq('statut', statut);
        }
        if (r.recherche) {
            q = q.ilike('recherche', motifIlike(sansAccents(r.recherche)));
        }
        const tri = r.tri && ['nom', 'matricule'].includes(r.tri.cle) ? r.tri : { cle: 'nom', desc: false };
        const debut = r.page * r.taille;
        let triee = q.order(tri.cle, { ascending: !tri.desc });
        if (tri.cle === 'nom') {
            triee = triee.order('prenom', { ascending: !tri.desc });
        }
        const { data, error, count } = await triee.order('id').range(debut, debut + r.taille - 1);
        if (error) {
            throw erreurApprenants(error);
        }
        return { lignes: data.map(versApprenant), total: count ?? 0 };
    }

    async detail(id: string): Promise<Apprenant> {
        const { data, error } = await this.sb.from('apprenants').select(COLONNES).eq('id', id).maybeSingle();
        if (error) {
            throw erreurApprenants(error);
        }
        if (!data) {
            throw new ErreurApprenants('apprenants.erreurs.introuvable');
        }
        return versApprenant(data);
    }

    /** Crée la fiche et renvoie son identifiant (matricule attribué par la base). */
    async creer(s: SaisieApprenant): Promise<string> {
        const { data, error } = await this.sb
            .from('apprenants')
            .insert({ daara_id: this.daaraId(), nom: s.nom, prenom: s.prenom, date_naissance: s.dateNaissance, sexe: s.sexe })
            .select('id')
            .single();
        if (error) {
            throw erreurApprenants(error);
        }
        return data.id;
    }

    async modifier(id: string, s: SaisieApprenant): Promise<void> {
        await this.ecrire(
            this.sb.from('apprenants').update({ nom: s.nom, prenom: s.prenom, date_naissance: s.dateNaissance, sexe: s.sexe }).eq('id', id).select('id'),
        );
    }

    async changerStatut(id: string, statut: StatutApprenant): Promise<void> {
        await this.ecrire(this.sb.from('apprenants').update({ statut }).eq('id', id).select('id'));
    }

    async supprimer(a: Apprenant): Promise<void> {
        await this.ecrire(this.sb.from('apprenants').delete().eq('id', a.id).select('id'));
        if (a.photoPath) {
            // Fichier orphelin sans conséquence s'il reste (bucket privé) ; retiré au mieux.
            await this.sb.storage.from('photos').remove([a.photoPath]);
        }
    }

    /** Photo ré-encodée (512 px, EXIF retiré) puis déposée à l'emplacement imposé par la base. */
    async deposerPhoto(a: Apprenant, fichier: File): Promise<void> {
        let image: Blob;
        try {
            image = await this.images.reencoder(fichier);
        } catch {
            throw new ErreurApprenants('apprenants.erreurs.photo_illisible');
        }
        const extension = image.type === 'image/png' ? 'png' : 'webp';
        const chemin = `${this.daaraId()}/apprenants/${a.id}.${extension}`;
        const { error } = await this.sb.storage.from('photos').upload(chemin, image, { upsert: true, contentType: image.type, cacheControl: '60' });
        if (error) {
            throw new ErreurApprenants('apprenants.erreurs.photo');
        }
        await this.ecrire(this.sb.from('apprenants').update({ photo_path: chemin }).eq('id', a.id).select('id'));
        if (a.photoPath && a.photoPath !== chemin) {
            await this.sb.storage.from('photos').remove([a.photoPath]);
        }
    }

    async retirerPhoto(a: Apprenant): Promise<void> {
        if (!a.photoPath) {
            return;
        }
        const { error } = await this.sb.storage.from('photos').remove([a.photoPath]);
        if (error) {
            throw new ErreurApprenants('apprenants.erreurs.photo');
        }
        await this.ecrire(this.sb.from('apprenants').update({ photo_path: null }).eq('id', a.id).select('id'));
    }

    /** URL signée d'une heure (bucket privé) ; null si absente ou illisible. */
    async urlPhoto(chemin: string | null): Promise<string | null> {
        if (!chemin) {
            return null;
        }
        const { data } = await this.sb.storage.from('photos').createSignedUrl(chemin, 3600);
        return data?.signedUrl ?? null;
    }

    /** Aucune ligne renvoyée = refus RLS. */
    private async ecrire(requete: PromiseLike<{ data: unknown[] | null; error: { code?: string; message?: string } | null }>): Promise<void> {
        const { data, error } = await requete;
        if (error) {
            throw erreurApprenants(error);
        }
        if (!data?.length) {
            throw new ErreurApprenants('apprenants.erreurs.droits');
        }
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurApprenants('apprenants.erreurs.inattendue');
        }
        return id;
    }
}
