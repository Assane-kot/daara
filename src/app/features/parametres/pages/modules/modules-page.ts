import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../../../core/daara/current-daara.service';
import { MODULES, ModuleDaara } from '../../../../core/daara/daara.model';
import { PREREQUIS, avecPrerequis, dependantsActifs } from '../../../../core/daara/modules';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ErreurModules, ModulesService } from '../../data/modules.service';

interface LigneModule {
    readonly module: ModuleDaara;
    readonly actif: boolean;
    readonly prerequis: readonly ModuleDaara[];
    /** Modules actifs qui en dépendent : il ne peut pas être désactivé seul. */
    readonly requisPar: readonly ModuleDaara[];
}

/**
 * Paramètres → Modules (ADR-008) : une carte par module, interrupteur, prérequis expliqués, confirmation avant de
 * désactiver (les données sont conservées). Admin uniquement (`roleGuard`), la base revérifie (`definir_modules`).
 */
@Component({
    selector: 'app-modules-page',
    imports: [TranslatePipe],
    templateUrl: './modules-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesPage {
    private readonly courante = inject(CurrentDaaraService);
    private readonly service = inject(ModulesService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);

    protected readonly enCours = signal<ModuleDaara | null>(null);
    protected readonly erreur = signal<ErreurModules | null>(null);
    protected readonly info = signal<{ cle: string; params: Record<string, string> } | null>(null);

    protected readonly lignes = computed<LigneModule[]>(() => {
        const actifs = this.courante.modules();
        return MODULES.map((module) => ({
            module,
            actif: actifs.includes(module),
            prerequis: PREREQUIS[module],
            requisPar: dependantsActifs(module, actifs),
        }));
    });

    protected nom(module: ModuleDaara): string {
        return this.translate.instant(`modules.${module}.nom`);
    }

    protected noms(modules: readonly ModuleDaara[]): string {
        return modules.map((m) => this.nom(m)).join(', ');
    }

    protected async basculer(ligne: LigneModule): Promise<void> {
        if (this.enCours() || (ligne.actif && ligne.requisPar.length > 0)) {
            return;
        }
        const actifs = this.courante.modules();
        this.erreur.set(null);
        this.info.set(null);

        if (ligne.actif) {
            const confirme = await this.confirmation.confirmer({
                titre: this.translate.instant('parametres.modules.desactiver_titre', { module: this.nom(ligne.module) }),
                message: this.translate.instant('parametres.modules.desactiver_message'),
                libelleConfirmer: this.translate.instant('parametres.modules.desactiver'),
            });
            if (!confirme) {
                return;
            }
        }

        this.enCours.set(ligne.module);
        try {
            const nouveaux = await this.service.basculer(ligne.module, !ligne.actif);
            // Prérequis activés en même temps (calculés sur la réponse de la base, qui fait foi).
            const ajoutes = ligne.actif ? [] : avecPrerequis([ligne.module]).filter((m) => m !== ligne.module && !actifs.includes(m) && nouveaux.includes(m));
            if (ajoutes.length > 0) {
                this.info.set({
                    cle: 'parametres.modules.prerequis_actives',
                    params: { module: this.nom(ligne.module), prerequis: this.noms(ajoutes) },
                });
            }
        } catch (erreur) {
            this.erreur.set(erreur instanceof ErreurModules ? erreur : new ErreurModules('parametres.modules.erreurs.inattendue'));
        } finally {
            this.enCours.set(null);
        }
    }

    /** Paramètres d'une erreur `module_requis`, avec les noms traduits des modules. */
    protected paramsErreur(erreur: ErreurModules): Record<string, string> {
        const p = erreur.params;
        return p['prerequis'] ? { prerequis: this.nom(p['prerequis'] as ModuleDaara), dependant: this.nom(p['dependant'] as ModuleDaara) } : {};
    }
}
