import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Database } from '../../../core/supabase/database.types';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ErreurApprenants } from './apprenants.service';

export type LienParent = Database['public']['Enums']['lien_parent'];
export const LIENS_PARENT: readonly LienParent[] = ['pere', 'mere', 'tuteur'];

/** Parent relié à un enfant. */
export interface ParentRelie {
    readonly lienId: string;
    readonly parentId: string;
    readonly nom: string;
    readonly telephone: string | null;
    readonly lien: LienParent;
}

/** Parent membre actif de la daara (choix dans la liste). */
export interface ParentMembre {
    readonly userId: string;
    readonly nom: string;
    readonly telephone: string | null;
}

/** Enfant vu par son parent (« Mes enfants »). */
export interface MonEnfant {
    readonly id: string;
    readonly prenom: string;
    readonly nom: string;
    readonly photoPath: string | null;
    readonly classe: string | null;
    /** Classe de l'année active (appel du jour). */
    readonly classeId: string | null;
    readonly sexe: 'F' | 'M';
}

export function erreurParents(erreur: { code?: string; message?: string } | null): ErreurApprenants {
    if (erreur?.code === '23514' && erreur.message === 'parent_invalide') {
        return new ErreurApprenants('parents.erreurs.parent_invalide');
    }
    switch (erreur?.code) {
        case '42501':
            return new ErreurApprenants('parents.erreurs.droits');
        case '23505':
            return new ErreurApprenants('parents.erreurs.deja_relie');
        default:
            return new ErreurApprenants('parents.erreurs.inattendue');
    }
}

/**
 * Liens parents ↔ enfants (S4.3) : l'admin relie un parent déjà membre ou rattache l'enfant à une invitation (le lien
 * est créé à l'acceptation) ; le parent lit ses enfants (`is_parent_of`).
 */
@Injectable({ providedIn: 'root' })
export class ParentsService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);
    private readonly auth = inject(AuthService);

    async parentsDe(apprenantId: string): Promise<ParentRelie[]> {
        const { data, error } = await this.sb.from('parent_links').select('id, parent_user_id, lien').eq('apprenant_id', apprenantId);
        if (error) {
            throw erreurParents(error);
        }
        if (data.length === 0) {
            return [];
        }
        // Profils des parents (lisibles par l'admin : membres actifs de sa daara).
        const { data: profils } = await this.sb
            .from('profiles')
            .select('id, prenom, nom, telephone')
            .in(
                'id',
                data.map((l) => l.parent_user_id),
            );
        return data.map((l) => {
            const p = profils?.find((x) => x.id === l.parent_user_id);
            return {
                lienId: l.id,
                parentId: l.parent_user_id,
                nom: p ? `${p.prenom} ${p.nom}`.trim() : '',
                telephone: p?.telephone ?? null,
                lien: l.lien,
            };
        });
    }

    /** Parents actifs de la daara (choix « parent déjà inscrit »), triés par nom. */
    async parentsMembres(): Promise<ParentMembre[]> {
        const { data, error } = await this.sb.rpc('rechercher_membres', {
            p_daara: this.daaraId(),
            p_texte: '',
            p_role: 'parent',
            p_etat: 'actifs',
            p_tri: 'nom',
            p_offset: 0,
            p_limite: 100,
        });
        if (error) {
            throw erreurParents(error);
        }
        return data.map((m) => ({ userId: m.user_id, nom: m.nom, telephone: m.telephone }));
    }

    async relier(apprenantId: string, parentId: string, lien: LienParent): Promise<void> {
        const { error } = await this.sb.from('parent_links').insert({ daara_id: this.daaraId(), apprenant_id: apprenantId, parent_user_id: parentId, lien });
        if (error) {
            throw erreurParents(error);
        }
    }

    async delier(lienId: string): Promise<void> {
        const { data, error } = await this.sb.from('parent_links').delete().eq('id', lienId).select('id');
        if (error || !data?.length) {
            throw erreurParents(error ?? { code: '42501' });
        }
    }

    /** L'enfant sera relié au parent invité quand celui-ci acceptera l'invitation. */
    async rattacherInvitation(invitationId: string, apprenantId: string, lien: LienParent): Promise<void> {
        const { error } = await this.sb.rpc('rattacher_enfant_invitation', { p_invitation: invitationId, p_apprenant: apprenantId, p_lien: lien });
        if (error) {
            throw erreurParents(error);
        }
    }

    /** Enfants du parent connecté dans la daara ouverte, avec leur classe de l'année active. */
    async mesEnfants(): Promise<MonEnfant[]> {
        const { data, error } = await this.sb
            .from('apprenants')
            .select(
                'id, prenom, nom, sexe, photo_path, parent_links!inner(parent_user_id), inscriptions(annee_id, classe_id, classes(nom), annees_scolaires(active))',
            )
            .eq('daara_id', this.daaraId())
            // Seulement SES enfants : un parent aussi admin ou enseignant lit d'autres élèves (audit de fin de sprint 4).
            .eq('parent_links.parent_user_id', this.utilisateurId())
            .order('prenom');
        if (error) {
            throw erreurParents(error);
        }
        return data.map((a) => {
            const active = a.inscriptions.find((i) => i.annees_scolaires?.active);
            return {
                id: a.id,
                prenom: a.prenom,
                nom: a.nom,
                sexe: a.sexe,
                photoPath: a.photo_path,
                classe: active?.classes?.nom ?? null,
                classeId: active?.classe_id ?? null,
            };
        });
    }

    private utilisateurId(): string {
        const id = this.auth.user()?.id;
        if (!id) {
            throw new ErreurApprenants('parents.erreurs.inattendue');
        }
        return id;
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurApprenants('parents.erreurs.inattendue');
        }
        return id;
    }
}
