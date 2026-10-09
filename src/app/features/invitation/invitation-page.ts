import { ChangeDetectionStrategy, Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService, ROUTES_AUTH, routeDaara } from '../../core/auth/auth.service';
import { lireInvitation, memoriserInvitation, oublierInvitation } from '../../core/auth/invitation-en-attente';
import { LanguageService } from '../../core/i18n/language.service';
import { IconEye } from '../../shared/icon/icon-eye';
import { IconEyeOff } from '../../shared/icon/icon-eye-off';
import { IconLockDots } from '../../shared/icon/icon-lock-dots';
import { FormField, FormFieldControl } from '../../shared/ui/form-field/form-field';
import { motDePasseValidateur } from '../../shared/ui/form-field/validateurs';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { Turnstile } from '../../shared/ui/turnstile/turnstile';
import { ApercuInvitation, ErreurInvitation, InvitationService, erreurInvitation } from './data/invitation.service';

type Etape = 'chargement' | 'absente' | 'invalide' | 'apercu' | 'connexion';

/**
 * `/invitation#<jeton>` (LLD §7.1) : le jeton est lu dans le fragment (jamais envoyé au serveur), gardé pendant
 * l'inscription ou la connexion (`invitation-en-attente`) puis effacé de l'adresse. Aperçu, puis :
 * - connecté : « Rejoindre » (`accepter_invitation` : contact lié, aal2 pour un admin) ;
 * - invité par e-mail, non connecté : créer son compte ou se connecter, puis retour ici (`AuthService.destination`) ;
 * - invité par téléphone, non connecté : choix du mot de passe → `accept-invitation` crée le compte et le rattache →
 *   connexion par téléphone (ADR-009).
 */
@Component({
    selector: 'app-invitation-page',
    imports: [ReactiveFormsModule, RouterLink, TranslatePipe, FormField, FormFieldControl, Skeleton, Turnstile, IconLockDots, IconEye, IconEyeOff],
    templateUrl: './invitation-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationPage implements OnInit {
    protected readonly auth = inject(AuthService);
    private readonly service = inject(InvitationService);
    private readonly router = inject(Router);
    private readonly langue = inject(LanguageService).langue;

    protected readonly etape = signal<Etape>('chargement');
    protected readonly apercu = signal<ApercuInvitation | null>(null);
    /** Clé `invitation.erreurs.*` de l'état bloquant ou de la dernière action. */
    protected readonly erreur = signal<string | null>(null);
    protected readonly envoi = signal(false);
    protected readonly captcha = signal<string | null>(null);
    protected readonly voirMotDePasse = signal(false);
    protected readonly routes = ROUTES_AUTH;
    private readonly turnstile = viewChild(Turnstile);
    private jeton: string | null = null;
    /** Compte téléphone créé : connexion dès qu'un nouveau jeton Turnstile arrive (un jeton ne sert qu'une fois). */
    private connexionEnAttente: { telephone: string; motDePasse: string } | null = null;

    protected readonly form = inject(NonNullableFormBuilder).group({
        prenom: ['', [Validators.required, Validators.maxLength(100)]],
        nom: ['', [Validators.required, Validators.maxLength(100)]],
        motDePasse: ['', [Validators.required, motDePasseValidateur]],
    });

    ngOnInit(): void {
        const fragment = globalThis.location?.hash.replace(/^#/, '') ?? '';
        if (fragment) {
            if (/^[A-Za-z0-9_-]{43}$/.test(fragment)) {
                memoriserInvitation(fragment);
            }
            // Le jeton ne reste ni dans l'adresse affichée, ni dans l'historique, ni dans les captures d'écran.
            globalThis.history?.replaceState(globalThis.history.state, '', globalThis.location.pathname);
        }
        this.jeton = lireInvitation();
        void this.charger();
    }

    protected async charger(): Promise<void> {
        if (!this.jeton) {
            this.etape.set('absente');
            return;
        }
        this.etape.set('chargement');
        this.erreur.set(null);
        try {
            const apercu = await this.service.apercu(this.jeton);
            this.apercu.set(apercu);
            if (apercu.etat !== 'valide') {
                this.invalide(`invitation_${apercu.etat}`);
                return;
            }
            this.etape.set('apercu');
        } catch (erreur) {
            const code = erreur instanceof ErreurInvitation ? erreur.code : 'inattendue';
            if (code === 'reseau' || code === 'inattendue') {
                this.erreur.set(code);
                this.etape.set('invalide');
            } else {
                this.invalide(code);
            }
        }
    }

    /** Utilisateur connecté : rejoint la daara avec son compte. */
    protected async rejoindre(): Promise<void> {
        if (!this.jeton || this.envoi()) {
            return;
        }
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            const slug = await this.auth.accepterInvitation(this.jeton);
            await this.router.navigateByUrl(routeDaara(slug));
        } catch (erreur) {
            const code =
                erreur instanceof TypeError || (erreur as { name?: string }).name === 'TypeError'
                    ? 'reseau'
                    : erreurInvitation((erreur as { message?: string }).message).code;
            if (code.startsWith('invitation_') || code === 'daara_suspendue' || code === 'jeton_invalide') {
                this.invalide(code);
            } else {
                this.erreur.set(code);
            }
        } finally {
            this.envoi.set(false);
        }
    }

    /** Connecté avec un autre compte que celui invité : déconnexion, l'invitation reste en attente. */
    protected async changerDeCompte(): Promise<void> {
        const jeton = this.jeton;
        await this.auth.deconnecter();
        if (jeton) {
            memoriserInvitation(jeton);
        }
        // Rester sur l'invitation : un invité par téléphone n'a peut-être pas encore de compte.
        this.etape.set('chargement');
        await this.charger();
    }

    /** Refus (contact différent, double authentification) : l'invitation n'est plus proposée à chaque connexion. */
    protected async ignorer(): Promise<void> {
        oublierInvitation();
        await this.router.navigateByUrl(ROUTES_AUTH.racine);
    }

    /** Invité par téléphone : crée son compte (mot de passe choisi), puis se connecte. */
    protected async creerCompte(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi() || !this.jeton) {
            return;
        }
        const captcha = this.captcha();
        if (!captcha) {
            this.erreur.set('captcha_requis');
            return;
        }
        const saisie = this.form.getRawValue();
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            const { telephone } = await this.service.creerCompteTelephone({
                jeton: this.jeton,
                motDePasse: saisie.motDePasse,
                prenom: saisie.prenom.trim(),
                nom: saisie.nom.trim(),
                langue: this.langue() === 'en' ? 'en' : 'fr',
                captcha,
            });
            oublierInvitation();
            this.form.reset();
            this.connexionEnAttente = { telephone, motDePasse: saisie.motDePasse };
            this.etape.set('connexion');
            this.captcha.set(null);
            this.turnstile()?.reinitialiser();
        } catch (erreur) {
            const code = erreur instanceof ErreurInvitation ? erreur.code : 'inattendue';
            if (code.startsWith('invitation_') || code === 'jeton_invalide') {
                this.invalide(code);
            } else {
                this.erreur.set(code);
            }
            this.captcha.set(null);
            this.turnstile()?.reinitialiser();
        } finally {
            this.envoi.set(false);
        }
    }

    protected async jetonTurnstile(jeton: string | null): Promise<void> {
        this.captcha.set(jeton);
        if (jeton && this.etape() === 'connexion' && this.connexionEnAttente) {
            await this.connecterApresCreation(jeton);
        }
    }

    private async connecterApresCreation(captcha: string): Promise<void> {
        const attente = this.connexionEnAttente;
        if (!attente || this.envoi()) {
            return;
        }
        // Une seule tentative automatique : le mot de passe ne reste pas en mémoire, pas de boucle sur un échec durable
        // (limite de fréquence, réseau). En cas d'échec, l'invité se connecte depuis l'écran de connexion.
        this.connexionEnAttente = null;
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await this.auth.connecter({ telephone: attente.telephone }, attente.motDePasse, captcha);
            await this.router.navigateByUrl(await this.auth.destination());
        } catch {
            this.erreur.set('connexion_apres_creation');
        } finally {
            this.envoi.set(false);
        }
    }

    private invalide(code: string): void {
        oublierInvitation();
        this.erreur.set(code);
        this.etape.set('invalide');
    }
}
