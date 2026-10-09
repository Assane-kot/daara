import { Injectable, inject, signal } from '@angular/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { RoleMembre } from '../../../core/daara/daara.model';
import { codeErreurFonction } from '../../../core/supabase/erreur-fonction';
import { SupabaseService } from '../../../core/supabase/supabase.service';

/** Rôles invitables au sprint 2 (comptes apprenants : sprint 4). */
export const ROLES_INVITABLES: readonly RoleMembre[] = ['enseignant', 'parent', 'admin'];

/** Saisie de la modale « Inviter » (contact : e-mail OU téléphone). */
export interface NouvelleInvitation {
    readonly role: RoleMembre;
    readonly email: string | null;
    readonly telephone: string | null;
    readonly prenom: string;
    readonly nom: string;
    readonly langue: 'fr' | 'en';
}

/** Réponse de `invite-member` : le lien est toujours rendu à l'admin (copie, WhatsApp). */
export interface InvitationCreee {
    readonly lien: string;
    readonly emailEnvoye: boolean;
    readonly messageWhatsapp: string;
    /** Numéro E.164 pour le lien wa.me (invitation par téléphone). */
    readonly telephone: string | null;
}

/** Invitation en attente ou expirée, telle que l'admin la voit (jamais le haché du jeton). */
export interface InvitationListee {
    readonly id: string;
    readonly role: RoleMembre;
    readonly email: string | null;
    readonly telephone: string | null;
    readonly prenom: string | null;
    readonly nom: string | null;
    readonly langue: 'fr' | 'en';
    readonly creeLe: string;
    readonly expireLe: string;
    readonly expiree: boolean;
}

export class ErreurInvitations extends Error {
    constructor(readonly cle: string) {
        super(cle);
    }
}

const CODES = new Set([
    'admin_aal2_requis',
    'daara_suspendue',
    'deja_membre',
    'quota_invitations',
    'quota_global_email',
    'donnee_invalide',
    'contact_invalide',
    'reseau',
]);

export function erreurInvitations(code: string | undefined): ErreurInvitations {
    return new ErreurInvitations(`invitations.erreurs.${code && CODES.has(code) ? code : 'inattendue'}`);
}

/** Lien WhatsApp vers le numéro de l'invité, message pré-rempli dans sa langue (LLD §7.1, ADR-003 : sans API payante). */
export function lienWhatsapp(telephone: string, message: string): string {
    return `https://wa.me/${telephone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
}

/**
 * Invitations de la daara ouverte (S2.5c) : création par l'Edge Function `invite-member` (JWT de l'admin), lecture
 * (RLS : admin aal2), révocation par la RPC `revoquer_invitation`. « Renvoyer » = nouvelle invitation identique (la base
 * annule la précédente : nouveau jeton).
 */
@Injectable({ providedIn: 'root' })
export class InvitationsService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);

    /** Incrémenté à chaque création ou révocation : l'onglet Invitations se recharge. */
    readonly version = signal(0);

    async inviter(saisie: NouvelleInvitation): Promise<InvitationCreee> {
        const { data, error } = await this.sb.functions.invoke<{
            lien: string;
            email_envoye: boolean;
            message_whatsapp: string;
            telephone: string | null;
        }>('invite-member', {
            body: {
                daara_id: this.daaraId(),
                role: saisie.role,
                email: saisie.email,
                telephone: saisie.telephone,
                prenom: saisie.prenom,
                nom: saisie.nom,
                langue: saisie.langue,
            },
        });
        if (error || !data) {
            throw erreurInvitations(error ? await codeErreurFonction(error) : undefined);
        }
        this.version.update((v) => v + 1);
        return { lien: data.lien, emailEnvoye: data.email_envoye, messageWhatsapp: data.message_whatsapp, telephone: data.telephone };
    }

    async renvoyer(invitation: InvitationListee): Promise<InvitationCreee> {
        return this.inviter({
            role: invitation.role,
            email: invitation.email,
            telephone: invitation.telephone,
            prenom: invitation.prenom ?? '',
            nom: invitation.nom ?? '',
            langue: invitation.langue,
        });
    }

    /** Invitations ni acceptées ni révoquées (en attente ou expirées), les plus récentes d'abord. */
    async lister(): Promise<InvitationListee[]> {
        const { data, error } = await this.sb
            .from('invitations')
            .select('id, role, email, telephone, prenom, nom, langue, created_at, expires_at')
            .eq('daara_id', this.daaraId())
            .is('accepted_at', null)
            .is('revoked_at', null)
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) {
            throw erreurInvitations(undefined);
        }
        const maintenant = Date.now();
        return data.map((i) => ({
            id: i.id,
            role: i.role,
            email: i.email,
            telephone: i.telephone,
            prenom: i.prenom,
            nom: i.nom,
            langue: i.langue === 'en' ? 'en' : 'fr',
            creeLe: i.created_at,
            expireLe: i.expires_at,
            expiree: new Date(i.expires_at).getTime() <= maintenant,
        }));
    }

    async revoquer(id: string): Promise<void> {
        const { error } = await this.sb.rpc('revoquer_invitation', { p_invitation: id });
        if (error) {
            throw erreurInvitations(error.code === '42501' ? 'admin_aal2_requis' : undefined);
        }
        this.version.update((v) => v + 1);
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw erreurInvitations(undefined);
        }
        return id;
    }
}
