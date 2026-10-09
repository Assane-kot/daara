import { Injectable, inject } from '@angular/core';
import { isAuthError } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth/auth.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export type LangueCompte = 'fr' | 'en';

export interface ProfilCompte {
    readonly prenom: string;
    readonly nom: string;
    readonly telephone: string | null;
    readonly langue: LangueCompte;
}

/** Appareil TOTP vérifié (facteur Supabase Auth). */
export interface Appareil {
    readonly id: string;
    readonly nom: string;
    readonly ajouteLe: string;
}

/** Erreur traduite de Mon compte (clé `compte.erreurs.<code>`). */
export class ErreurCompte extends Error {
    constructor(readonly code: string) {
        super(code);
    }
}

/**
 * Mon compte (S2.7, spec mon-compte.md) : profil (RLS `profiles_update_soi`, colonnes nom, prénom, téléphone, langue),
 * mot de passe (API Auth, `secure_password_change` : code de réauthentification si la connexion est ancienne) et
 * appareils TOTP (`mfa.listFactors` / `unenroll`, aal2 exigé par Auth).
 */
@Injectable({ providedIn: 'root' })
export class CompteService {
    private readonly sb = inject(SupabaseService).client;
    private readonly auth = inject(AuthService);

    async chargerProfil(): Promise<ProfilCompte> {
        const { data, error } = await this.sb.from('profiles').select('prenom, nom, telephone, langue').eq('id', this.userId()).single();
        if (error) {
            throw new ErreurCompte('chargement');
        }
        return { prenom: data.prenom, nom: data.nom, telephone: data.telephone, langue: data.langue === 'en' ? 'en' : 'fr' };
    }

    /** Enregistre le profil ; la langue va aussi dans les métadonnées Auth (langue des e-mails, `{{ .Data.langue }}`). */
    async enregistrerProfil(profil: ProfilCompte): Promise<void> {
        const { data, error } = await this.sb
            .from('profiles')
            .update({ prenom: profil.prenom, nom: profil.nom, telephone: profil.telephone, langue: profil.langue })
            .eq('id', this.userId())
            .select('id');
        // Aucune ligne renvoyée = refus RLS.
        if (error || !data?.length) {
            throw new ErreurCompte(error?.code === '23514' ? 'donnee_invalide' : 'enregistrement');
        }
        const { error: erreurMeta } = await this.sb.auth.updateUser({ data: { langue: profil.langue } });
        if (erreurMeta) {
            throw new ErreurCompte('enregistrement');
        }
    }

    /**
     * Change le mot de passe. Sans `nonce` et connexion ancienne, Auth exige une réauthentification :
     * `ErreurCompte('reauthentification')` (l'appelant demande alors un code avec `demanderCodeReauthentification`).
     * Les autres erreurs Auth sont relancées telles quelles (traduites par `cleErreurAuth`).
     */
    async changerMotDePasse(motDePasse: string, nonce?: string): Promise<void> {
        const { error } = await this.sb.auth.updateUser(nonce ? { password: motDePasse, nonce } : { password: motDePasse });
        if (!error) {
            return;
        }
        if (isAuthError(error) && error.code === 'reauthentication_needed') {
            throw new ErreurCompte('reauthentification');
        }
        if (isAuthError(error) && error.code === 'reauthentication_not_valid') {
            throw new ErreurCompte('code_reauthentification');
        }
        throw error;
    }

    /** Envoie le code de réauthentification à l'adresse du compte (modèle `reauthentication`). */
    async demanderCodeReauthentification(): Promise<void> {
        const { error } = await this.sb.auth.reauthenticate();
        if (error) {
            throw error;
        }
    }

    async appareils(): Promise<Appareil[]> {
        const { data, error } = await this.sb.auth.mfa.listFactors();
        if (error) {
            throw new ErreurCompte('chargement');
        }
        return (
            data.all
                .filter((f) => f.factor_type === 'totp' && f.status === 'verified')
                // Nom technique donné au premier enrôlement (`DAARA <date>`) : affiché comme « Premier appareil ».
                .map((f) => ({ id: f.id, nom: /^DAARA \d{4}-/.test(f.friendly_name ?? '') ? '' : (f.friendly_name ?? ''), ajouteLe: f.created_at }))
                .sort((a, b) => a.ajouteLe.localeCompare(b.ajouteLe))
        );
    }

    /**
     * Retire un appareil puis ferme toutes les autres sessions du compte (audit S2.7) : un téléphone perdu garde sinon sa
     * session `aal2`, qu'Auth continue de rafraîchir après le retrait du facteur.
     */
    async retirerAppareil(id: string): Promise<void> {
        const { error } = await this.sb.auth.mfa.unenroll({ factorId: id });
        if (error) {
            throw new ErreurCompte(isAuthError(error) && error.code === 'insufficient_aal' ? 'aal2_requis' : 'retrait');
        }
        const { error: erreurSessions } = await this.sb.auth.signOut({ scope: 'others' });
        if (erreurSessions) {
            throw new ErreurCompte('sessions');
        }
    }

    /** Admin actif d'au moins une daara : la double authentification lui est obligatoire (ADR-006). */
    async estAdmin(): Promise<boolean> {
        return (await this.auth.rolesActifs()).includes('admin');
    }

    private userId(): string {
        const id = this.auth.user()?.id;
        if (!id) {
            throw new ErreurCompte('chargement');
        }
        return id;
    }
}
