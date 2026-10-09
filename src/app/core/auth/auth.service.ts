import { Identifiant } from './identifiant';
import { lireInvitation, oublierInvitation } from './invitation-en-attente';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Session, isAuthError } from '@supabase/supabase-js';
import { CurrentDaaraService } from '../daara/current-daara.service';
import { DaaraAccessible, MODULES, RoleMembre, lireDerniereDaara, oublierDerniereDaara } from '../daara/daara.model';
import { LanguageService } from '../i18n/language.service';
import { SupabaseService } from '../supabase/supabase.service';

export type { RoleMembre } from '../daara/daara.model';

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
    selectionDaara: '/select-daara',
    invitation: '/invitation',
    racine: '/',
} as const;

/** Espace d'une daara (LLD §2 « Routage »). */
export function routeDaara(slug: string): string {
    return `/d/${slug}`;
}

/**
 * Session et parcours d'authentification (LLD §2 « Services transverses », §7.0, ADR-006).
 * Toutes les méthodes lèvent l'`AuthError` de Supabase ; les pages la traduisent avec `cleErreurAuth`.
 * Le front n'est qu'un confort : la RLS exige `aal2` pour tout droit d'admin.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly sb = inject(SupabaseService).client;
    private readonly language = inject(LanguageService);
    private readonly courante = inject(CurrentDaaraService);

    private readonly sessionCouranteSig = signal<Session | null>(null);
    private readonly pret: Promise<void>;
    /** Rôles actifs de l'utilisateur, mis en cache par utilisateur (invalidés à chaque changement de session). */
    private daaras: { readonly userId: string; readonly promesse: Promise<DaaraAccessible[]> } | null = null;

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
                this.daaras = null;
            }
            // Déconnexion ou changement d'utilisateur : rien de la session précédente ne reste (audit S2.1, M3 / M4).
            if (!session || session.user.id !== this.user()?.id) {
                this.courante.vider();
            }
            if (evenement === 'SIGNED_OUT') {
                oublierDerniereDaara();
                oublierInvitation();
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

    /** Connexion par e-mail ou par téléphone (ADR-009), identifiant déjà lu par `lireIdentifiant`. */
    async connecter(identifiant: Identifiant, motDePasse: string, captcha: string): Promise<void> {
        const options = { captchaToken: captcha };
        const { error } =
            'email' in identifiant
                ? await this.sb.auth.signInWithPassword({ email: identifiant.email, password: motDePasse, options })
                : await this.sb.auth.signInWithPassword({ phone: identifiant.telephone, password: motDePasse, options });
        if (error) {
            throw error;
        }
    }

    /**
     * Accepte l'invitation en attente pour l'utilisateur connecté (`accepter_invitation`, LLD §4) et renvoie le slug de
     * la daara rejointe. Erreur : `{ code, message }` de la RPC (contact_different, aal2_requis…).
     */
    async accepterInvitation(jeton: string): Promise<string> {
        const { data, error } = await this.sb.rpc('accepter_invitation', { p_token: jeton });
        if (error) {
            throw error;
        }
        oublierInvitation();
        this.invaliderDaaras();
        return data;
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

    /**
     * Daaras dont l'utilisateur est membre actif, avec ses rôles (lecture de ses propres memberships, RLS
     * `memberships_select_soi`, et des daaras, RLS `is_member`).
     */
    async mesDaaras(): Promise<DaaraAccessible[]> {
        // Attendre la session restaurée : au chargement direct d'une URL, les guards démarrent en parallèle et
        // liraient sinon « aucun utilisateur » (renvoi à tort vers l'onboarding).
        const userId = (await this.sessionActuelle())?.user.id;
        if (!userId) {
            return [];
        }
        if (this.daaras?.userId !== userId) {
            const promesse = this.lireDaaras(userId);
            this.daaras = { userId, promesse };
            // Une erreur ne doit pas rester en cache.
            promesse.catch(() => (this.daaras = null));
        }
        return this.daaras.promesse;
    }

    /** Rôles actifs de l'utilisateur, toutes daaras confondues. */
    async rolesActifs(): Promise<RoleMembre[]> {
        return (await this.mesDaaras()).flatMap((daara) => daara.roles);
    }

    /** À appeler après une création de daara, une acceptation d'invitation ou un changement de membership. */
    invaliderDaaras(): void {
        this.daaras = null;
    }

    /**
     * Relit les daaras après une modification de la daara ouverte (modules, paramètres, ses propres rôles) : menus,
     * guards et logo suivent. Renvoie faux si la daara n'est plus accessible (membre qui s'est retiré).
     */
    async rechargerDaaraCourante(): Promise<boolean> {
        const daaraId = this.courante.id();
        this.invaliderDaaras();
        const daara = (await this.mesDaaras()).find((d) => d.id === daaraId);
        if (daara) {
            this.courante.definir(daara);
        }
        return !!daara;
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
        // Invitation ouverte avant l'inscription ou la connexion : on y revient pour l'accepter.
        if (lireInvitation()) {
            return ROUTES_AUTH.invitation;
        }
        const daaras = await this.mesDaaras();
        if (daaras.length === 0) {
            return ROUTES_AUTH.onboarding;
        }
        if (daaras.length === 1) {
            return routeDaara(daaras[0].slug);
        }
        const derniere = lireDerniereDaara();
        return daaras.some((d) => d.slug === derniere) ? routeDaara(derniere as string) : ROUTES_AUTH.selectionDaara;
    }

    private urlLogo(chemin: string, version: string): string {
        const url = this.sb.storage.from('logos').getPublicUrl(chemin).data.publicUrl;
        return `${url}?v=${encodeURIComponent(version)}`;
    }

    private async lireDaaras(userId: string): Promise<DaaraAccessible[]> {
        // Un membre dont la session est insuffisante (facteur vérifié, aal1) ne lit pas la daara : la jointure interne
        // l'écarte, et mfaRequise() l'envoie d'abord vers /auth/mfa.
        const { data, error } = await this.sb
            .from('memberships')
            .select('role, daaras!inner(id, slug, nom, ville, logo_path, updated_at, daara_modules(module, actif))')
            .eq('user_id', userId)
            .eq('actif', true);
        if (error) {
            throw error;
        }
        const parId = new Map<string, DaaraAccessible>();
        for (const ligne of data) {
            const d = ligne.daaras;
            const existante = parId.get(d.id);
            parId.set(d.id, {
                id: d.id,
                slug: d.slug,
                nom: d.nom,
                ville: d.ville,
                logoPath: d.logo_path,
                logoUrl: d.logo_path ? this.urlLogo(d.logo_path, d.updated_at) : null,
                roles: [...(existante?.roles ?? []), ligne.role],
                modules: MODULES.filter((m) => d.daara_modules.some((dm) => dm.module === m && dm.actif)),
            });
        }
        return [...parId.values()].sort((a, b) => a.nom.localeCompare(b.nom));
    }
}
