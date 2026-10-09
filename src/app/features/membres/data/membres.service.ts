import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { RoleMembre } from '../../../core/daara/daara.model';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { PageTable, RequeteTable } from '../../../shared/ui/data-table/data-table';

/** Rôles qu'un admin peut attribuer au sprint 2 (comptes apprenants : sprint 4). */
export const ROLES_ATTRIBUABLES: readonly RoleMembre[] = ['admin', 'enseignant', 'parent'];

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

    /**
     * Page de membres pour `data-table` (S3.4, RPC `rechercher_membres`) : recherche sans accents sur le nom et le
     * téléphone, filtres rôle et état, tri rôle (par défaut) / nom / ancienneté, pagination et total côté serveur.
     */
    async page(r: RequeteTable, role: RoleMembre | '', etat: 'actifs' | 'desactives' | 'tous'): Promise<PageTable<Membre>> {
        const tri = r.tri && ['nom', 'depuis'].includes(r.tri.cle) ? `${r.tri.desc ? '-' : ''}${r.tri.cle}` : 'role';
        const { data, error } = await this.sb.rpc('rechercher_membres', {
            p_daara: this.daaraId(),
            p_texte: r.recherche,
            // null = tous les rôles (les types générés ne connaissent pas les paramètres facultatifs d'une RPC).
            p_role: (role || null) as RoleMembre,
            p_etat: etat,
            p_tri: tri,
            p_offset: r.page * r.taille,
            p_limite: r.taille,
        });
        if (error) {
            throw erreurMembres(error);
        }
        const moi = this.auth.user()?.id;
        return {
            lignes: data.map((m) => ({
                id: m.id,
                userId: m.user_id,
                role: m.role,
                actif: m.actif,
                nom: m.nom,
                telephone: m.telephone,
                depuis: m.depuis,
                moi: m.user_id === moi,
            })),
            total: Number(data[0]?.total ?? 0),
        };
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
