import { Injectable, computed, inject, signal } from '@angular/core';
import { Session, isAuthError } from '@supabase/supabase-js';
import { LanguageService } from '../i18n/language.service';
import { Database } from '../supabase/database.types';
import { SupabaseService } from '../supabase/supabase.service';

export type RoleMembre = Database['public']['Enums']['role_membre'];

/** Facteur TOTP en cours d'enrôlement : QR code (image SVG fournie par Supabase) et clé à saisir à la main. */
export interface EnrolementTotp {
    readonly factorId: string;
    readonly qrCode: string;
    readonly secret: string;
}

export interface Inscription {
    readonly prenom: string;
    readonly nom: string;
    readonly email: string;
    readonly motDePasse: string;
    readonly captcha: string;
}

/** Routes où mène l'état de la session (LLD §7.0, « Routage après connexion »). */
export const ROUTES_AUTH = {
    connexion: '/auth/connexion',
    mfa: '/auth/mfa',
    onboarding: '/onboarding',
    espace: '/',
} as const;

/**
 * Session et parcours d'authentification (LLD §2 « Services transverses », §7.0, ADR-006).
 * Toutes les méthodes lèvent l'`AuthError` de Supabase ; les pages la traduisent avec `cleErreurAuth`.
 * Le front n'est qu'un confort : la RLS exige `aal2` pour tout droit d'admin.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly sb = inject(SupabaseService).client;
    private readonly language = inject(LanguageService);

    private readonly sessionCouranteSig = signal<Session | null>(null);
    private readonly pret: Promise<void>;
    /** Rôles actifs de l'utilisateur, mis en cache par utilisateur (invalidés à chaque changement de session). */
    private roles: { readonly userId: string; readonly promesse: Promise<RoleMembre[]> } | null = null;

    readonly session = this.sessionCouranteSig.asReadonly();
    readonly user = computed(() => this.session()?.user ?? null);
    readonly email = computed(() => this.user()?.email ?? '');
    /** E-mail saisi à l'inscription, repris par l'écran du code (jamais dans l'URL). */
    readonly emailEnAttente = signal('');

    constructor() {
        this.pret = this.sb.auth.getSession().then(({ data }) => this.sessionCouranteSig.set(data.session));
        // Pas d'appel Supabase dans ce rappel (verrou interne de supabase-js) : uniquement des signaux.
        this.sb.auth.onAuthStateChange((evenement, session) => {
            if (evenement !== 'TOKEN_REFRESHED' || session?.user.id !== this.user()?.id) {
                this.roles = null;
            }
            this.sessionCouranteSig.set(session);
        });
    }

    /** Session après restauration depuis le stockage du navigateur (à utiliser dans les guards). */
    async sessionActuelle(): Promise<Session | null> {
        await this.pret;
        return this.session();
    }

    /**
     * Inscription. Adresse déjà inscrite : Supabase répond `user_already_exists` ; on enchaîne comme pour une adresse
     * libre (écran du code, message neutre) pour ne pas révéler l'existence du compte (audit sprint 1, I-1).
     */
    async inscrire(saisie: Inscription): Promise<void> {
        const { error } = await this.sb.auth.signUp({
            email: saisie.email,
            password: saisie.motDePasse,
            options: {
                data: { prenom: saisie.prenom, nom: saisie.nom, langue: this.language.langue() },
                captchaToken: saisie.captcha,
            },
        });
        if (error && !(isAuthError(error) && (error.code === 'user_already_exists' || error.code === 'email_exists'))) {
            throw error;
        }
        this.emailEnAttente.set(saisie.email);
    }

    async confirmerEmail(email: string, code: string): Promise<void> {
        const { error } = await this.sb.auth.verifyOtp({ email, token: code, type: 'email' });
        if (error) {
            throw error;
        }
    }

    /** Renvoi du code de confirmation : Supabase Auth exige aussi le jeton Turnstile. */
    async renvoyerCodeConfirmation(email: string, captcha: string): Promise<void> {
        const { error } = await this.sb.auth.resend({ type: 'signup', email, options: { captchaToken: captcha } });
        if (error) {
            throw error;
        }
    }

    async connecter(email: string, motDePasse: string, captcha: string): Promise<void> {
        const { error } = await this.sb.auth.signInWithPassword({ email, password: motDePasse, options: { captchaToken: captcha } });
        if (error) {
            throw error;
        }
    }

    /** Envoie un code de réinitialisation. Réponse identique que le compte existe ou non (message neutre). */
    async demanderReinitialisation(email: string, captcha: string): Promise<void> {
        const { error } = await this.sb.auth.resetPasswordForEmail(email, { captchaToken: captcha });
        if (error) {
            throw error;
        }
    }

    /** Ouvre une session de récupération ; elle est `aal1` : un compte avec TOTP doit encore le vérifier. */
    async verifierCodeReinitialisation(email: string, code: string): Promise<void> {
        const { error } = await this.sb.auth.verifyOtp({ email, token: code, type: 'recovery' });
        if (error) {
            throw error;
        }
    }

    async changerMotDePasse(motDePasse: string): Promise<void> {
        const { error } = await this.sb.auth.updateUser({ password: motDePasse });
        if (error) {
            throw error;
        }
    }

    async deconnecter(): Promise<void> {
        const { error } = await this.sb.auth.signOut();
        if (error) {
            throw error;
        }
    }

    // ---------------------------------------------------------------------------------------------------------
    // Double authentification (TOTP)
    // ---------------------------------------------------------------------------------------------------------

    /** Vrai si la session est déjà `aal2`. */
    async estAal2(): Promise<boolean> {
        const { data, error } = await this.sb.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) {
            throw error;
        }
        return data.currentLevel === 'aal2';
    }

    /** Facteur TOTP vérifié de l'utilisateur, s'il en a un. */
    async facteurTotpVerifie(): Promise<string | null> {
        const { data, error } = await this.sb.auth.mfa.listFactors();
        if (error) {
            throw error;
        }
        return data.all.find((f) => f.factor_type === 'totp' && f.status === 'verified')?.id ?? null;
    }

    /** Démarre un enrôlement ; les enrôlements abandonnés (non vérifiés) sont d'abord supprimés. */
    async demarrerEnrolement(): Promise<EnrolementTotp> {
        const { data: facteurs, error: erreurListe } = await this.sb.auth.mfa.listFactors();
        if (erreurListe) {
            throw erreurListe;
        }
        for (const facteur of facteurs.all.filter((f) => f.factor_type === 'totp' && f.status === 'unverified')) {
            const { error } = await this.sb.auth.mfa.unenroll({ factorId: facteur.id });
            if (error) {
                throw error;
            }
        }
        const { data, error } = await this.sb.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: `DAARA ${new Date().toISOString()}`,
        });
        if (error) {
            throw error;
        }
        return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
    }

    /** Vérifie un code TOTP (enrôlement ou connexion) : la session passe en `aal2`. */
    async verifierTotp(factorId: string, code: string): Promise<void> {
        const { error } = await this.sb.auth.mfa.challengeAndVerify({ factorId, code });
        if (error) {
            throw error;
        }
    }

    // ---------------------------------------------------------------------------------------------------------
    // Routage
    // ---------------------------------------------------------------------------------------------------------

    /** Rôles actifs de l'utilisateur dans ses daaras (lecture de ses propres memberships, RLS `memberships_select_soi`). */
    async rolesActifs(): Promise<RoleMembre[]> {
        // Attendre la session restaurée : au chargement direct d'une URL, les guards démarrent en parallèle et
        // liraient sinon « aucun utilisateur » (renvoi à tort vers l'onboarding).
        const userId = (await this.sessionActuelle())?.user.id;
        if (!userId) {
            return [];
        }
        if (this.roles?.userId !== userId) {
            const promesse = this.lireRoles(userId);
            this.roles = { userId, promesse };
            // Une erreur ne doit pas rester en cache.
            promesse.catch(() => (this.roles = null));
        }
        return this.roles.promesse;
    }

    /** À appeler après une création de daara ou un changement de membership. */
    invaliderRoles(): void {
        this.roles = null;
    }

    /**
     * Double authentification à faire avant d'aller plus loin : facteur vérifié mais session `aal1`, ou admin d'une
     * daara sans facteur (enrôlement imposé, ADR-006).
     */
    async mfaRequise(): Promise<boolean> {
        const { data, error } = await this.sb.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) {
            throw error;
        }
        if (data.currentLevel === 'aal2') {
            return false;
        }
        if (data.nextLevel === 'aal2') {
            return true;
        }
        return (await this.rolesActifs()).includes('admin');
    }

    /** Écran où envoyer l'utilisateur selon sa session (LLD §7.0). */
    async destination(): Promise<string> {
        if (!(await this.sessionActuelle())) {
            return ROUTES_AUTH.connexion;
        }
        if (await this.mfaRequise()) {
            return ROUTES_AUTH.mfa;
        }
        return (await this.rolesActifs()).length === 0 ? ROUTES_AUTH.onboarding : ROUTES_AUTH.espace;
    }

    private async lireRoles(userId: string): Promise<RoleMembre[]> {
        const { data, error } = await this.sb.from('memberships').select('role').eq('user_id', userId).eq('actif', true);
        if (error) {
            throw error;
        }
        return data.map((ligne) => ligne.role);
    }
}
