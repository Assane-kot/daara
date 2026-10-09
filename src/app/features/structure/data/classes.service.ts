import { Injectable, inject } from '@angular/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { PageTable, RequeteTable, motifIlike, sansAccents } from '../../../shared/ui/data-table/data-table';
import { ErreurStructure, erreurStructure } from './annees.service';
import { TypeMatiere } from './matieres.service';

export interface AnneeChoix {
    readonly id: string;
    readonly libelle: string;
    readonly active: boolean;
}

/** Enseignant ou admin de la daara (RPC `enseignants_daara`) ; désactivé : nom figé, non proposé. */
export interface Enseignant {
    readonly id: string;
    readonly nom: string;
    readonly actif: boolean;
}

export interface ClasseResume {
    readonly id: string;
    readonly nom: string;
    readonly niveau: string | null;
    readonly titulaireId: string | null;
    readonly nbMatieres: number;
}

export interface Affectation {
    readonly id: string;
    readonly matiereId: string;
    readonly matiereNom: string;
    readonly matiereCode: string;
    readonly matiereType: TypeMatiere;
    readonly coefficient: number;
    readonly enseignantId: string | null;
}

export interface ClasseDetail extends Omit<ClasseResume, 'nbMatieres'> {
    readonly anneeId: string;
    readonly anneeLibelle: string;
    /** Triées par nom de matière. */
    readonly affectations: readonly Affectation[];
}

export interface SaisieClasse {
    readonly nom: string;
    readonly niveau: string | null;
    readonly titulaireId: string | null;
}

export interface SaisieAffectation {
    readonly matiereId: string;
    readonly coefficient: number;
    readonly enseignantId: string | null;
}

/** Niveaux proposés (texte libre accepté). */
export const NIVEAUX_SUGGERES: readonly string[] = ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e', '2nde', '1re', 'Tle'];

/**
 * Classes d'une année et matières enseignées par classe (S3.3, module `structure`). Lecture : admin et enseignant ;
 * écritures directes sous RLS (admin aal2) ; les triggers vérifient titulaire, enseignant, matière et année.
 */
@Injectable({ providedIn: 'root' })
export class ClassesService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);

    async annees(): Promise<AnneeChoix[]> {
        const { data, error } = await this.sb
            .from('annees_scolaires')
            .select('id, libelle, active')
            .eq('daara_id', this.daaraId())
            .order('date_debut', { ascending: false });
        if (error) {
            throw erreurStructure(error);
        }
        return data;
    }

    async enseignants(): Promise<Enseignant[]> {
        const { data, error } = await this.sb.rpc('enseignants_daara', { p_daara: this.daaraId() });
        if (error) {
            throw erreurStructure(error);
        }
        return data.map((e) => ({ id: e.user_id, nom: `${e.prenom ?? ''} ${e.nom ?? ''}`.trim(), actif: e.actif })).sort((a, b) => a.nom.localeCompare(b.nom));
    }

    async lister(anneeId: string): Promise<ClasseResume[]> {
        const { data, error } = await this.sb
            .from('classes')
            // Pas d'agrégat count(*) : il exige le droit de lecture sur toute la table (droits par colonne ici).
            .select('id, nom, niveau, titulaire_id, classe_matieres(id)')
            .eq('annee_id', anneeId)
            .order('nom');
        if (error) {
            throw erreurStructure(error);
        }
        return data.map((c) => ({
            id: c.id,
            nom: c.nom,
            niveau: c.niveau,
            titulaireId: c.titulaire_id,
            nbMatieres: c.classe_matieres.length,
        }));
    }

    /** Page des classes d'une année pour `data-table` : recherche sur le nom et le niveau, tri nom / niveau (S3.4). */
    async page(anneeId: string, r: RequeteTable): Promise<PageTable<ClasseResume>> {
        // Pas d'agrégat count(*) embarqué : il exige le droit de lecture sur toute la table (droits par colonne ici).
        let q = this.sb.from('classes').select('id, nom, niveau, titulaire_id, classe_matieres(id)', { count: 'exact' }).eq('annee_id', anneeId);
        if (r.recherche) {
            // Colonne générée en base : nom et niveau en minuscules, sans accents.
            q = q.ilike('recherche', motifIlike(sansAccents(r.recherche)));
        }
        const tri = r.tri && ['nom', 'niveau'].includes(r.tri.cle) ? r.tri : { cle: 'nom', desc: false };
        const debut = r.page * r.taille;
        const { data, error, count } = await q
            .order(tri.cle, { ascending: !tri.desc, nullsFirst: false })
            .order('id')
            .range(debut, debut + r.taille - 1);
        if (error) {
            throw erreurStructure(error);
        }
        return {
            lignes: data.map((c) => ({ id: c.id, nom: c.nom, niveau: c.niveau, titulaireId: c.titulaire_id, nbMatieres: c.classe_matieres.length })),
            total: count ?? 0,
        };
    }

    async detail(id: string): Promise<ClasseDetail> {
        const { data, error } = await this.sb
            .from('classes')
            .select(
                'id, nom, niveau, titulaire_id, annee_id, annees_scolaires(libelle), classe_matieres(id, coefficient, enseignant_id, matieres(id, nom, code, type))',
            )
            .eq('id', id)
            .maybeSingle();
        if (error) {
            throw erreurStructure(error);
        }
        if (!data) {
            throw new ErreurStructure('structure.erreurs.classe_introuvable');
        }
        return {
            id: data.id,
            nom: data.nom,
            niveau: data.niveau,
            titulaireId: data.titulaire_id,
            anneeId: data.annee_id,
            anneeLibelle: data.annees_scolaires?.libelle ?? '',
            affectations: data.classe_matieres
                .map((a) => ({
                    id: a.id,
                    matiereId: a.matieres?.id ?? '',
                    matiereNom: a.matieres?.nom ?? '',
                    matiereCode: a.matieres?.code ?? '',
                    matiereType: a.matieres?.type ?? 'scolaire',
                    coefficient: Number(a.coefficient),
                    enseignantId: a.enseignant_id,
                }))
                .sort((x, y) => x.matiereNom.localeCompare(y.matiereNom)),
        };
    }

    async creer(anneeId: string, s: SaisieClasse): Promise<void> {
        const { error } = await this.sb
            .from('classes')
            .insert({ daara_id: this.daaraId(), annee_id: anneeId, nom: s.nom, niveau: s.niveau, titulaire_id: s.titulaireId });
        if (error) {
            throw erreurStructure(error);
        }
    }

    async modifier(id: string, s: SaisieClasse): Promise<void> {
        await this.ecrire(this.sb.from('classes').update({ nom: s.nom, niveau: s.niveau, titulaire_id: s.titulaireId }).eq('id', id).select('id'));
    }

    async supprimer(id: string): Promise<void> {
        await this.ecrire(this.sb.from('classes').delete().eq('id', id).select('id'));
    }

    async affecter(classeId: string, s: SaisieAffectation): Promise<void> {
        const { error } = await this.sb.from('classe_matieres').insert({
            daara_id: this.daaraId(),
            classe_id: classeId,
            matiere_id: s.matiereId,
            coefficient: s.coefficient,
            enseignant_id: s.enseignantId,
        });
        if (error) {
            throw erreurStructure(error);
        }
    }

    async modifierAffectation(id: string, s: Omit<SaisieAffectation, 'matiereId'>): Promise<void> {
        await this.ecrire(this.sb.from('classe_matieres').update({ coefficient: s.coefficient, enseignant_id: s.enseignantId }).eq('id', id).select('id'));
    }

    async retirerAffectation(id: string): Promise<void> {
        await this.ecrire(this.sb.from('classe_matieres').delete().eq('id', id).select('id'));
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
