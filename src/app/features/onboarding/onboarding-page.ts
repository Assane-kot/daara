import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { cleErreurAuth } from '../../core/auth/erreurs-auth';
import { MODULES, ModuleDaara } from '../../core/daara/daara.model';
import { MODULES_DU_PROFIL, ProfilDaara, avecPrerequis } from '../../core/daara/modules';
import { LanguageService } from '../../core/i18n/language.service';
import { FormField, FormFieldControl } from '../../shared/ui/form-field/form-field';
import { MOTIF_TELEPHONE } from '../../shared/ui/form-field/validateurs';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { MfaPanel } from '../auth/components/mfa-panel';
import { ErreurCreationDaara, OnboardingService } from './data/onboarding.service';
import { SLUG_MAX, proposerSlug, slugValidateur } from './slug';

type Etape = 'chargement' | 'securite' | 'daara';

/**
 * Onboarding (LLD §7.0) : 1. sécuriser le compte (TOTP, car `creer_daara` exige `aal2`) ;
 * 2. créer la daara (nom, adresse, ville, téléphone, langue, barème) → tableau de bord.
 */
@Component({
    selector: 'app-onboarding-page',
    imports: [ReactiveFormsModule, TranslatePipe, FormField, FormFieldControl, MfaPanel, Skeleton],
    templateUrl: './onboarding-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly onboarding = inject(OnboardingService);
    private readonly router = inject(Router);

    protected readonly etape = signal<Etape>('chargement');
    protected readonly erreurChargement = signal<string | null>(null);
    protected readonly envoi = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly slugMax = SLUG_MAX;
    /** Profils de daara proposés (ADR-008) et modules cochés en « Personnalisé ». */
    protected readonly profils: readonly ProfilDaara[] = ['franco_arabe', 'coranique', 'personnalise'];
    protected readonly tousModules = MODULES;
    protected readonly modulesPerso = signal<ModuleDaara[]>([...MODULES_DU_PROFIL.coranique]);
    /** Tant que l'utilisateur n'a pas modifié l'adresse lui-même, elle suit le nom. */
    private slugModifie = false;

    protected readonly form = inject(NonNullableFormBuilder).group({
        nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
        slug: ['', [Validators.required, slugValidateur]],
        ville: ['', Validators.maxLength(80)],
        telephone: ['', Validators.pattern(MOTIF_TELEPHONE)],
        langueDefaut: [inject(LanguageService).langue() as 'fr' | 'en'],
        bareme: [20 as 10 | 20],
        profil: ['franco_arabe' as ProfilDaara],
    });

    constructor() {
        this.form.controls.nom.valueChanges.pipe(takeUntilDestroyed()).subscribe((nom) => {
            if (!this.slugModifie) {
                this.form.controls.slug.setValue(proposerSlug(nom));
            }
        });
    }

    ngOnInit(): void {
        void this.demarrer();
    }

    protected async demarrer(): Promise<void> {
        this.etape.set('chargement');
        this.erreurChargement.set(null);
        try {
            this.etape.set((await this.auth.estAal2()) ? 'daara' : 'securite');
        } catch (erreur) {
            this.erreurChargement.set(cleErreurAuth(erreur));
        }
    }

    protected basculerModule(module: ModuleDaara, coche: boolean): void {
        this.modulesPerso.update((ms) => (coche ? [...ms, module] : ms.filter((m) => m !== module)));
    }

    /** Modules envoyés à creer_daara, prérequis compris (la base les ajoute aussi). */
    protected modulesChoisis(): ModuleDaara[] {
        const profil = this.form.controls.profil.value;
        return avecPrerequis(profil === 'personnalise' ? this.modulesPerso() : MODULES_DU_PROFIL[profil]);
    }

    protected slugSaisi(): void {
        this.slugModifie = true;
    }

    protected async creer(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.envoi()) {
            return;
        }
        const saisie = this.form.getRawValue();
        this.envoi.set(true);
        this.erreur.set(null);
        try {
            await this.onboarding.creerDaara({
                nom: saisie.nom.trim(),
                slug: saisie.slug,
                ville: saisie.ville.trim(),
                telephone: saisie.telephone.trim(),
                langueDefaut: saisie.langueDefaut,
                bareme: saisie.bareme,
                modules: this.modulesChoisis(),
            });
            await this.router.navigateByUrl(await this.auth.destination());
        } catch (erreur) {
            this.erreur.set(erreur instanceof ErreurCreationDaara ? erreur.cle : 'onboarding.erreurs.inattendue');
            if (erreur instanceof ErreurCreationDaara && erreur.cle === 'onboarding.erreurs.aal2') {
                this.etape.set('securite');
            }
        } finally {
            this.envoi.set(false);
        }
    }
}
