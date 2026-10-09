import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService, EnrolementTotp } from '../../../core/auth/auth.service';
import { cleErreurAuth } from '../../../core/auth/erreurs-auth';
import { IconCopy } from '../../../shared/icon/icon-copy';
import { CodeOtp } from '../../../shared/ui/code-otp/code-otp';
import { codeValidateur } from '../../../shared/ui/form-field/validateurs';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';

export type ModeMfa = 'enrolement' | 'verification';

let prochainId = 0;

/**
 * Double authentification TOTP (ADR-006, LLD §7.0) : vérification si l'utilisateur a déjà un facteur, sinon
 * enrôlement (QR code + clé texte). Émet `valide` quand la session est passée en `aal2`.
 * Utilisé par /auth/mfa, l'onboarding et la réinitialisation du mot de passe.
 */
@Component({
    selector: 'app-mfa-panel',
    imports: [ReactiveFormsModule, TranslatePipe, CodeOtp, IconCopy, Skeleton],
    templateUrl: './mfa-panel.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaPanel implements OnInit {
    private readonly auth = inject(AuthService);

    /** Faux : vérification uniquement (réinitialisation du mot de passe). */
    readonly enrolementAutorise = input(true);
    /** Ajout d'un appareil depuis Mon compte (S2.7) : enrôlement même si un facteur vérifié existe, sous ce nom. */
    readonly nomAppareil = input<string | null>(null);
    readonly mode = output<ModeMfa>();
    readonly valide = output<void>();

    protected readonly id = `mfa-${++prochainId}`;
    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal<string | null>(null);
    protected readonly modeCourant = signal<ModeMfa>('verification');
    protected readonly enrolement = signal<EnrolementTotp | null>(null);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly copie = signal(false);
    private factorId: string | null = null;

    protected readonly form = inject(NonNullableFormBuilder).group({
        code: ['', [Validators.required, codeValidateur]],
    });

    ngOnInit(): void {
        void this.preparer();
    }

    protected async preparer(): Promise<void> {
        this.chargement.set(true);
        this.erreurChargement.set(null);
        try {
            const nomAppareil = this.nomAppareil();
            this.factorId = nomAppareil ? null : await this.auth.facteurTotpVerifie();
            if (this.factorId || !this.enrolementAutorise()) {
                this.modeCourant.set('verification');
            } else {
                const enrolement = await this.auth.demarrerEnrolement(nomAppareil ?? undefined);
                this.factorId = enrolement.factorId;
                this.enrolement.set(enrolement);
                this.modeCourant.set('enrolement');
            }
            this.mode.emit(this.modeCourant());
        } catch (erreur) {
            this.erreurChargement.set(cleErreurAuth(erreur));
        } finally {
            this.chargement.set(false);
        }
    }

    protected async verifier(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi() || !this.factorId) {
            return;
        }
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await this.auth.verifierTotp(this.factorId, this.form.getRawValue().code);
            this.valide.emit();
        } catch (erreur) {
            this.erreur.set(cleErreurAuth(erreur));
            this.form.reset();
        } finally {
            this.envoi.set(false);
        }
    }

    protected async copier(secret: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(secret);
            this.copie.set(true);
            setTimeout(() => this.copie.set(false), 2000);
        } catch {
            // Presse-papiers refusé : la clé reste sélectionnable à la main.
        }
    }
}
