import { Injectable, inject } from '@angular/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Database } from '../../../core/supabase/database.types';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { PageTable, RequeteTable, motifIlike, sansAccents } from '../../../shared/ui/data-table/data-table';
import { ErreurStructure, erreurStructure } from './annees.service';

export type TypeMatiere = Database['public']['Enums']['type_matiere'];
export const TYPES_MATIERE: readonly TypeMatiere[] = ['scolaire', 'coran', 'religieux'];

export interface Matiere {
    readonly id: string;
    readonly nom: string;
    readonly code: string;
    readonly type: TypeMatiere;
    readonly archivee: boolean;
}

export interface SaisieMatiere {
    readonly nom: string;
    readonly code: string;
    readonly type: TypeMatiere;
}

/** Code proposé à partir du nom : 4 premières lettres sans accents, en majuscules (modifiable). */
export function proposerCode(nom: string): string {
    return nom
        .normalize('NFD')
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase()
        .slice(0, 4);
}

/**
 * Catalogue des matières de la daara ouverte (S3.2, module `structure`) : réutilisé d'une année à l'autre ; une
 * matière utilisée dans une classe ne se supprime pas (clé étrangère `restrict`) : on l'archive.
 */
@Injectable({ providedIn: 'root' })
export class MatieresService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);

    async lister(): Promise<Matiere[]> {
        const { data, error } = await this.sb.from('matieres').select('id, nom, code, type, archivee').eq('daara_id', this.daaraId()).order('nom');
        if (error) {
            throw erreurStructure(error);
        }
        return data;
    }

    /** Page du catalogue pour `data-table` : recherche sur le nom et le code, tri nom / code / type (S3.4). */
    async page(r: RequeteTable, avecArchivees: boolean): Promise<PageTable<Matiere>> {
        let q = this.sb.from('matieres').select('id, nom, code, type, archivee', { count: 'exact' }).eq('daara_id', this.daaraId());
        if (!avecArchivees) {
            q = q.eq('archivee', false);
        }
        if (r.recherche) {
            // Colonne générée en base : nom et code en minuscules, sans accents.
            q = q.ilike('recherche', motifIlike(sansAccents(r.recherche)));
        }
        const tri = r.tri && ['nom', 'code', 'type'].includes(r.tri.cle) ? r.tri : { cle: 'nom', desc: false };
        const debut = r.page * r.taille;
        const { data, error, count } = await q
            .order(tri.cle, { ascending: !tri.desc })
            .order('id')
            .range(debut, debut + r.taille - 1);
        if (error) {
            throw erreurStructure(error);
        }
        return { lignes: data, total: count ?? 0 };
    }

    async creer(s: SaisieMatiere): Promise<void> {
        const { error } = await this.sb.from('matieres').insert({ daara_id: this.daaraId(), nom: s.nom, code: s.code, type: s.type });
        if (error) {
            throw erreurStructure(error);
        }
    }

    async modifier(id: string, s: SaisieMatiere): Promise<void> {
        await this.ecrire(this.sb.from('matieres').update({ nom: s.nom, code: s.code, type: s.type }).eq('id', id).select('id'));
    }

    async archiver(id: string, archivee: boolean): Promise<void> {
        await this.ecrire(this.sb.from('matieres').update({ archivee }).eq('id', id).select('id'));
    }

    async supprimer(id: string): Promise<void> {
        await this.ecrire(this.sb.from('matieres').delete().eq('id', id).select('id'));
    }

    /** Aucune ligne renvoyée = refus RLS. */
    private async ecrire(requete: PromiseLike<{ data: unknown[] | null; error: { code?: string; message?: string } | null }>): Promise<void> {
        const { data, error } = await requete;
        if (error) {
            throw erreurStructure(error);
        }
        if (!data?.length) {
            throw new ErreurStructure('structure.erreurs.droits');
        }
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurStructure('structure.erreurs.inattendue');
        }
        return id;
    }
}
