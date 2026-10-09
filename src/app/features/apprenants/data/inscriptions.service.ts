import { Injectable, inject } from '@angular/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ErreurApprenants } from './apprenants.service';

/** Élève inscrit dans une classe. */
export interface EleveInscrit {
    readonly inscriptionId: string;
    readonly apprenantId: string;
    readonly nom: string;
    readonly prenom: string;
    readonly matricule: string;
}

/** Élève proposé à l'inscription (inscrit à la daara, sans classe cette année). */
export interface Candidat {
    readonly id: string;
    readonly nom: string;
    readonly prenom: string;
    readonly matricule: string;
}

/** Classe de l'élève pour une année. */
export interface InscriptionEleve {
    readonly id: string;
    readonly classeId: string;
    readonly classeNom: string;
    readonly anneeId: string;
}

export function erreurInscriptions(erreur: { code?: string; message?: string } | null): ErreurApprenants {
    if (erreur?.code === '23514' && ['eleve_parti', 'autre_annee'].includes(erreur.message ?? '')) {
        return new ErreurApprenants(`inscriptions.erreurs.${erreur.message}`);
    }
    switch (erreur?.code) {
        case '42501':
            return new ErreurApprenants('inscriptions.erreurs.droits');
        case '23505':
            return new ErreurApprenants('inscriptions.erreurs.deja_inscrit');
        default:
            return new ErreurApprenants('inscriptions.erreurs.inattendue');
    }
}

/**
 * Inscriptions des élèves dans les classes (S4.2, module `structure`) : une classe par élève et par année ; l'année est
 * copiée de la classe par la base ; changer de classe = modifier l'inscription dans la même année.
 */
@Injectable({ providedIn: 'root' })
export class InscriptionsService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);

    async eleves(classeId: string): Promise<EleveInscrit[]> {
        const { data, error } = await this.sb.from('inscriptions').select('id, apprenant_id, apprenants(nom, prenom, matricule)').eq('classe_id', classeId);
        if (error) {
            throw erreurInscriptions(error);
        }
        return data
            .map((i) => ({
                inscriptionId: i.id,
                apprenantId: i.apprenant_id,
                nom: i.apprenants?.nom ?? '',
                prenom: i.apprenants?.prenom ?? '',
                matricule: i.apprenants?.matricule ?? '',
            }))
            .sort((a, b) => a.prenom.localeCompare(b.prenom) || a.nom.localeCompare(b.nom));
    }

    /** Élèves inscrits à la daara et sans classe pour cette année (une daara compte au plus quelques centaines d'élèves). */
    async candidats(anneeId: string): Promise<Candidat[]> {
        const [eleves, inscrits] = await Promise.all([
            this.sb.from('apprenants').select('id, nom, prenom, matricule').eq('daara_id', this.daaraId()).eq('statut', 'inscrit').limit(2000),
            this.sb.from('inscriptions').select('apprenant_id').eq('annee_id', anneeId).limit(2000),
        ]);
        if (eleves.error || inscrits.error) {
            throw erreurInscriptions(eleves.error ?? inscrits.error);
        }
        const dejaInscrits = new Set(inscrits.data.map((i) => i.apprenant_id));
        return eleves.data.filter((a) => !dejaInscrits.has(a.id)).sort((a, b) => a.prenom.localeCompare(b.prenom) || a.nom.localeCompare(b.nom));
    }

    async inscrire(classeId: string, anneeId: string, apprenantIds: readonly string[]): Promise<void> {
        const daaraId = this.daaraId();
        const { error } = await this.sb
            .from('inscriptions')
            .insert(apprenantIds.map((apprenant_id) => ({ daara_id: daaraId, apprenant_id, classe_id: classeId, annee_id: anneeId })));
        if (error) {
            throw erreurInscriptions(error);
        }
    }

    async changerClasse(inscriptionId: string, classeId: string): Promise<void> {
        const { data, error } = await this.sb.from('inscriptions').update({ classe_id: classeId }).eq('id', inscriptionId).select('id');
        if (error || !data?.length) {
            throw erreurInscriptions(error ?? { code: '42501' });
        }
    }

    async desinscrire(inscriptionId: string): Promise<void> {
        const { data, error } = await this.sb.from('inscriptions').delete().eq('id', inscriptionId).select('id');
        if (error || !data?.length) {
            throw erreurInscriptions(error ?? { code: '42501' });
        }
    }

    /** Inscriptions d'un élève (toutes années), avec le nom de la classe. */
    async deLEleve(apprenantId: string): Promise<InscriptionEleve[]> {
        const { data, error } = await this.sb.from('inscriptions').select('id, classe_id, annee_id, classes(nom)').eq('apprenant_id', apprenantId);
        if (error) {
            throw erreurInscriptions(error);
        }
        return data.map((i) => ({ id: i.id, classeId: i.classe_id, classeNom: i.classes?.nom ?? '', anneeId: i.annee_id }));
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurApprenants('inscriptions.erreurs.inattendue');
        }
        return id;
    }
}
