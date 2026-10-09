import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { RoleMembre } from '../../../core/daara/daara.model';
import { SupabaseService } from '../../../core/supabase/supabase.service';

/** Rôles qu'un admin peut attribuer au sprint 2 (comptes apprenants : sprint 4). */
export const ROLES_ATTRIBUABLES: readonly RoleMembre[] = ['admin', 'enseignant', 'parent'];

const ORDRE_ROLES: readonly RoleMembre[] = ['admin', 'enseignant', 'parent', 'apprenant'];

/** Une ligne de `memberships` : une personne qui a deux rôles dans la daara apparaît deux fois. */
export interface Membre {
    readonly id: string;
    readonly userId: string;
    readonly role: RoleMembre;
    readonly actif: boolean;
    /** Prénom et nom (profil), ou nom figé à la désactivation ; vide si inconnu. */
    readonly nom: string;
    readonly telephone: string | null;
    readonly depuis: string;
    /** Membership de l'utilisateur connecté. */
    readonly moi: boolean;
}

/** Erreur traduite de l'écran Membres (codes de `changer_role` / `definir_actif`, LLD §4). */
export class ErreurMembres extends Error {
    constructor(readonly cle: string) {
        super(cle);
    }
}

export function erreurMembres(erreur: { code?: string; message?: string }): ErreurMembres {
    switch (erreur.code) {
        case '42501':
            return new ErreurMembres('membres.erreurs.droits');
        case '23514':
            return new ErreurMembres(erreur.message === 'dernier_admin' ? 'membres.erreurs.dernier_admin' : 'membres.erreurs.inattendue');
        case '23505':
            return new ErreurMembres('membres.erreurs.role_deja_attribue');
        case '22023':
            return new ErreurMembres('membres.erreurs.role_invalide');
        default:
            return new ErreurMembres('membres.erreurs.inattendue');
    }
}

/**
 * Membres de la daara ouverte (S2.4). Lecture : RLS `memberships_select_admin` et profils des membres actifs
 * (`membres_administres`) ; écritures uniquement par les RPC `changer_role` et `definir_actif` (admin `aal2`).
 */
@Injectable({ providedIn: 'root' })
export class MembresService {
    private readonly sb = inject(SupabaseService).client;
    private readonly auth = inject(AuthService);
    private readonly courante = inject(CurrentDaaraService);

    async lister(): Promise<Membre[]> {
        const { data, error } = await this.sb
            .from('memberships')
            .select('id, user_id, role, actif, nom_affiche, created_at, profiles(nom, prenom, telephone)')
            .eq('daara_id', this.daaraId());
        if (error) {
            throw erreurMembres(error);
        }
        const moi = this.auth.user()?.id;
        const membres: Membre[] = data.map((m) => ({
            id: m.id,
            userId: m.user_id,
            role: m.role,
            actif: m.actif,
            nom: m.nom_affiche ?? (m.profiles ? `${m.profiles.prenom} ${m.profiles.nom}`.trim() : ''),
            telephone: m.profiles?.telephone ?? null,
            depuis: m.created_at,
            moi: m.user_id === moi,
        }));
        // Ordre stable : par rôle, puis par nom (les dates de création peuvent être identiques).
        return membres.sort((a, b) => ORDRE_ROLES.indexOf(a.role) - ORDRE_ROLES.indexOf(b.role) || a.nom.localeCompare(b.nom));
    }

    async changerRole(membre: Membre, role: RoleMembre): Promise<void> {
        const { error } = await this.sb.rpc('changer_role', { p_membership: membre.id, p_role: role });
        await this.apres(membre, error);
    }

    async definirActif(membre: Membre, actif: boolean): Promise<void> {
        const { error } = await this.sb.rpc('definir_actif', { p_membership: membre.id, p_actif: actif });
        await this.apres(membre, error);
    }

    /**
     * Code d'accès pour un membre actif non admin (S2.6, RPC `creer_code_acces`) : renvoyé en clair une seule fois
     * (`XXXX-XXXX`), le précédent est annulé.
     */
    async creerCodeAcces(membre: Membre): Promise<string> {
        const { data, error } = await this.sb.rpc('creer_code_acces', { p_membership: membre.id });
        if (error || !data) {
            throw error?.code === '22023' ? new ErreurMembres('membres.erreurs.code_cible') : erreurMembres(error ?? {});
        }
        return data;
    }

    /** Ses propres rôles ont changé : menus et guards suivent (un admin qui se retire perd l'écran). */
    private async apres(membre: Membre, error: { code?: string; message?: string } | null): Promise<void> {
        if (error) {
            throw erreurMembres(error);
        }
        if (membre.moi) {
            await this.auth.rechargerDaaraCourante();
        }
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurMembres('membres.erreurs.inattendue');
        }
        return id;
    }
}
