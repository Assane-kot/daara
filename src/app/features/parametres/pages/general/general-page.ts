import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../../../core/daara/current-daara.service';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { FormField, FormFieldControl } from '../../../../shared/ui/form-field/form-field';
import { MOTIF_TELEPHONE } from '../../../../shared/ui/form-field/validateurs';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { ErreurParametres, ParametresDaaraService, TYPES_LOGO } from '../../data/parametres-daara.service';

/**
 * Paramètres → Général (S2.3) : nom, ville, téléphone, langue par défaut, barème, logo. Admin uniquement
 * (`roleGuard`) ; la base revérifie chaque écriture (admin `aal2`).
 */
@Component({
    selector: 'app-general-page',
    imports: [ReactiveFormsModule, TranslatePipe, FormField, FormFieldControl, Skeleton],
    templateUrl: './general-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralPage implements OnInit {
    protected readonly courante = inject(CurrentDaaraService);
    private readonly service = inject(ParametresDaaraService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);

    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal<string | null>(null);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);
    protected readonly logoEnCours = signal(false);
    protected readonly erreurLogo = signal<string | null>(null);
    protected readonly succesLogo = signal<string | null>(null);
    protected readonly typesLogo = TYPES_LOGO.join(',');

    protected readonly form = inject(NonNullableFormBuilder).group({
        nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
        ville: ['', Validators.maxLength(80)],
        telephone: ['', Validators.pattern(MOTIF_TELEPHONE)],
        langueDefaut: ['fr' as 'fr' | 'en'],
        bareme: [20 as 10 | 20],
    });

    ngOnInit(): void {
        void this.charger();
    }

    protected async charger(): Promise<void> {
        this.chargement.set(true);
        this.erreurChargement.set(null);
        try {
            this.form.reset(await this.service.charger());
        } catch {
            this.erreurChargement.set('parametres.general.erreurs.chargement');
        } finally {
            this.chargement.set(false);
        }
    }

    protected async enregistrer(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi()) {
            return;
        }
        this.envoi.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            const infos = this.form.getRawValue();
            await this.service.enregistrer(infos);
            this.form.reset({ ...infos, nom: infos.nom.trim(), ville: infos.ville.trim(), telephone: infos.telephone.trim() });
            this.succes.set('parametres.general.enregistre');
        } catch (erreur) {
            this.erreur.set(cle(erreur));
        } finally {
            this.envoi.set(false);
        }
    }

    protected async logoChoisi(champ: HTMLInputElement): Promise<void> {
        const fichier = champ.files?.[0];
        // Vider le champ permet de choisir à nouveau le même fichier.
        champ.value = '';
        if (!fichier || this.logoEnCours()) {
            return;
        }
        await this.traiterLogo(() => this.service.deposerLogo(fichier), 'parametres.general.logo.depose');
    }

    protected async retirerLogo(): Promise<void> {
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('parametres.general.logo.retirer_titre'),
            message: this.translate.instant('parametres.general.logo.retirer_message'),
            libelleConfirmer: this.translate.instant('parametres.general.logo.retirer'),
        });
        if (confirme) {
            await this.traiterLogo(() => this.service.retirerLogo(), 'parametres.general.logo.retire');
        }
    }

    private async traiterLogo(action: () => Promise<void>, succes: string): Promise<void> {
        this.logoEnCours.set(true);
        this.erreurLogo.set(null);
        this.succesLogo.set(null);
        try {
            await action();
            this.succesLogo.set(succes);
        } catch (erreur) {
            this.erreurLogo.set(cle(erreur));
        } finally {
            this.logoEnCours.set(false);
        }
    }
}

function cle(erreur: unknown): string {
    return erreur instanceof ErreurParametres ? erreur.cle : 'parametres.general.erreurs.inattendue';
}
