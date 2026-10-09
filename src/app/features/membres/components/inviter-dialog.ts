import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { normaliserTelephone } from '../../../core/auth/identifiant';
import { RoleMembre } from '../../../core/daara/daara.model';
import { LanguageService } from '../../../core/i18n/language.service';
import { IconCopy } from '../../../shared/icon/icon-copy';
import { FormField, FormFieldControl } from '../../../shared/ui/form-field/form-field';
import { ErreurInvitations, InvitationCreee, InvitationsService, ROLES_INVITABLES, lienWhatsapp } from '../data/invitations.service';

interface DonneesDialog {
    /** Résultat à afficher directement (« Renvoyer » depuis l'onglet Invitations). */
    readonly resultat?: InvitationCreee;
    readonly destinataire?: string;
}

const telephoneValidateur = (c: AbstractControl<string>): ValidationErrors | null => (!c.value || normaliserTelephone(c.value) ? null : { pattern: true });

/**
 * Modale « Inviter un membre » (spec invitations, S2.5c) : rôle, téléphone OU e-mail, prénom, nom, langue de l'invité ;
 * puis le lien d'invitation, toujours rendu (Copier, WhatsApp vers le numéro, message dans la langue de l'invité).
 */
@Component({
    selector: 'app-inviter-dialog',
    imports: [ReactiveFormsModule, TranslatePipe, FormField, FormFieldControl, IconCopy],
    templateUrl: './inviter-dialog.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviterDialog {
    private readonly service = inject(InvitationsService);
    private readonly dialogRef = inject<DialogRef<boolean, InviterDialog>>(DialogRef);
    protected readonly donnees = inject<DonneesDialog>(DIALOG_DATA);

    protected readonly roles = ROLES_INVITABLES;
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly resultat = signal<InvitationCreee | null>(this.donnees.resultat ?? null);
    protected readonly destinataire = signal(this.donnees.destinataire ?? '');
    protected readonly copie = signal(false);

    protected readonly form = inject(NonNullableFormBuilder).group({
        role: ['parent' as RoleMembre],
        mode: ['telephone' as 'telephone' | 'email'],
        telephone: ['', [Validators.required, telephoneValidateur]],
        email: [{ value: '', disabled: true }, [Validators.required, Validators.email, Validators.maxLength(254)]],
        prenom: ['', Validators.maxLength(100)],
        nom: ['', Validators.maxLength(100)],
        langue: [inject(LanguageService).langue() as 'fr' | 'en'],
    });
    protected readonly mode = toSignal(this.form.controls.mode.valueChanges, { initialValue: 'telephone' as const });

    constructor() {
        // Un seul contact actif : l'autre champ est désactivé (ni validé ni envoyé).
        this.form.controls.mode.valueChanges.pipe(takeUntilDestroyed()).subscribe((mode) => {
            const [actif, inactif] =
                mode === 'email' ? [this.form.controls.email, this.form.controls.telephone] : [this.form.controls.telephone, this.form.controls.email];
            actif.enable();
            inactif.disable();
        });
    }

    protected async inviter(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi()) {
            return;
        }
        const s = this.form.getRawValue();
        const email = s.mode === 'email' ? s.email.trim().toLowerCase() : null;
        const telephone = s.mode === 'telephone' ? normaliserTelephone(s.telephone) : null;
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            this.resultat.set(await this.service.inviter({ role: s.role, email, telephone, prenom: s.prenom.trim(), nom: s.nom.trim(), langue: s.langue }));
            this.destinataire.set(email ?? telephone ?? '');
        } catch (erreur) {
            this.erreur.set(erreur instanceof ErreurInvitations ? erreur.cle : 'invitations.erreurs.inattendue');
        } finally {
            this.envoi.set(false);
        }
    }

    protected whatsapp(r: InvitationCreee): string {
        return r.telephone ? lienWhatsapp(r.telephone, r.messageWhatsapp) : `https://wa.me/?text=${encodeURIComponent(r.messageWhatsapp)}`;
    }

    protected async copier(lien: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(lien);
            this.copie.set(true);
        } catch {
            // Presse-papiers refusé : le lien reste sélectionnable dans le champ.
            this.copie.set(false);
        }
    }

    protected fermer(): void {
        this.dialogRef.close(this.resultat() !== null);
    }
}

/** Ouvre la modale « Inviter » (ou son écran de résultat). Résout vrai si une invitation a été créée. */
@Injectable({ providedIn: 'root' })
export class InviterDialogService {
    private readonly dialog = inject(Dialog);

    async ouvrir(donnees: DonneesDialog = {}): Promise<boolean> {
        const ref = this.dialog.open<boolean, DonneesDialog, InviterDialog>(InviterDialog, {
            data: donnees,
            ariaLabelledBy: 'inviter-titre',
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            width: 'calc(100% - 2rem)',
            maxWidth: '34rem',
            maxHeight: 'calc(100dvh - 2rem)',
            backdropClass: 'bg-black/60',
        });
        return (await firstValueFrom(ref.closed)) === true;
    }
}
