import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ROUTES_AUTH } from '../../../../core/auth/auth.service';
import { RoleMembre } from '../../../../core/daara/daara.model';
import { LanguageService } from '../../../../core/i18n/language.service';
import { IconHorizontalDots } from '../../../../shared/icon/icon-horizontal-dots';
import { Badge, BadgeVariante } from '../../../../shared/ui/badge/badge';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { CarteTable, CelluleTable, ColonneTable, DataTable, PageTable, RequeteTable } from '../../../../shared/ui/data-table/data-table';
import { CodeAccesDialogService } from '../../components/code-acces-dialog';
import { ErreurMembres, Membre, MembresService, ROLES_ATTRIBUABLES } from '../../data/membres.service';

export type FiltreEtat = 'actifs' | 'desactives' | 'tous';

export const VARIANTE_ROLE: Record<RoleMembre, BadgeVariante> = { admin: 'secondary', enseignant: 'primary', parent: 'info', apprenant: 'dark' };

/**
 * `/d/:slug/membres` (S2.4, `data-table` S3.4) : liste paginée côté serveur (recherche sans accents, filtres rôle et
 * état, tri), changement de rôle, désactivation / réactivation. Admin uniquement (`roleGuard`), la base revérifie.
 * Tableau à partir de 640 px, cartes en dessous.
 */
@Component({
    selector: 'app-membres-page',
    imports: [NgTemplateOutlet, TranslatePipe, Badge, CdkMenuTrigger, CdkMenu, CdkMenuItem, IconHorizontalDots, DataTable, CelluleTable, CarteTable],
    templateUrl: './membres-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembresPage {
    private readonly service = inject(MembresService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly codeAcces = inject(CodeAccesDialogService);
    private readonly translate = inject(TranslateService);
    private readonly router = inject(Router);
    private readonly langue = inject(LanguageService).langue;

    protected readonly enCours = signal<string | null>(null);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<{ cle: string; params: Record<string, string> } | null>(null);

    protected readonly filtreRole = signal<RoleMembre | ''>('');
    protected readonly filtreEtat = signal<FiltreEtat>('actifs');
    protected readonly roles: readonly RoleMembre[] = ['admin', 'enseignant', 'parent', 'apprenant'];
    protected readonly etats: readonly FiltreEtat[] = ['actifs', 'desactives', 'tous'];
    protected readonly colonnes: readonly ColonneTable[] = [
        { cle: 'nom', libelle: 'membres.colonnes.nom', triable: true },
        { cle: 'role', libelle: 'membres.colonnes.role' },
        { cle: 'etat', libelle: 'membres.colonnes.etat' },
        { cle: 'depuis', libelle: 'membres.colonnes.depuis', triable: true, classe: 'whitespace-nowrap' },
        { cle: 'actions', libelle: 'membres.colonnes.actions', libelleMasque: true, classe: 'ltr:text-right rtl:text-left' },
    ];
    /** Chargeur du tableau : filtres de l'écran + requête du tableau (pagination, tri, recherche serveur). */
    protected readonly chargeur = (r: RequeteTable): Promise<PageTable<Membre>> => this.service.page(r, this.filtreRole(), this.filtreEtat());
    private readonly table = viewChild(DataTable);
    protected readonly variante = VARIANTE_ROLE;

    /** Contexte des gabarits de cellule non typé (`let-membre`) : indexation passée par une méthode typée. */
    protected varianteRole(role: RoleMembre): BadgeVariante {
        return VARIANTE_ROLE[role];
    }

    protected nom(membre: Membre): string {
        return membre.nom || this.translate.instant('membres.sans_nom');
    }

    protected date(iso: string): string {
        return new Intl.DateTimeFormat(this.langue() === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'medium', timeZone: 'Africa/Dakar' }).format(new Date(iso));
    }

    /** Rôles proposés pour un membre : les rôles attribuables autres que le sien (aucun pour un apprenant). */
    protected rolesPossibles(membre: Membre): readonly RoleMembre[] {
        return membre.role === 'apprenant' ? [] : ROLES_ATTRIBUABLES.filter((r) => r !== membre.role);
    }

    /** Réinitialisation assistée (S2.6) : membre actif, autre que soi, sans rôle admin dans la daara (la base revérifie). */
    protected reinitialisable(membre: Membre): boolean {
        // Une personne admin par une autre ligne de la daara (ou ailleurs) est refusée par la base (cible_invalide).
        return membre.actif && !membre.moi && membre.role !== 'admin';
    }

    protected async reinitialiser(membre: Membre): Promise<void> {
        const params = { nom: this.nom(membre) };
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('membres.confirmer.code_titre', params),
            message: this.translate.instant('membres.confirmer.code_message', params),
            libelleConfirmer: this.translate.instant('membres.confirmer.code_bouton'),
        });
        if (!confirme) {
            return;
        }
        this.enCours.set(membre.id);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            const code = await this.service.creerCodeAcces(membre);
            void this.codeAcces.ouvrir({ nom: params.nom, code, telephone: membre.telephone });
        } catch (erreur) {
            this.erreur.set(erreur instanceof ErreurMembres ? erreur.cle : 'membres.erreurs.inattendue');
        } finally {
            this.enCours.set(null);
        }
    }

    protected async changerRole(membre: Membre, role: RoleMembre): Promise<void> {
        const params = { nom: this.nom(membre), role: this.translate.instant(`roles.${role}`) };
        // Confirmation quand le rôle admin est donné ou retiré (droits étendus, double authentification imposée).
        if (role === 'admin' || membre.role === 'admin') {
            const message =
                role === 'admin'
                    ? 'membres.confirmer.promouvoir_message'
                    : membre.moi
                      ? 'membres.confirmer.retrograder_soi_message'
                      : 'membres.confirmer.retrograder_message';
            const confirme = await this.confirmation.confirmer({
                titre: this.translate.instant('membres.confirmer.role_titre', params),
                message: this.translate.instant(message, params),
                libelleConfirmer: this.translate.instant('membres.actions.confirmer_role'),
            });
            if (!confirme) {
                return;
            }
        }
        await this.agir(membre, () => this.service.changerRole(membre, role), 'membres.succes.role', params, membre.moi && membre.role === 'admin');
    }

    protected async basculerActif(membre: Membre): Promise<void> {
        const params = { nom: this.nom(membre), role: this.translate.instant(`roles.${membre.role}`) };
        if (membre.actif) {
            const confirme = await this.confirmation.confirmer({
                titre: this.translate.instant('membres.confirmer.desactiver_titre', params),
                message: this.translate.instant(membre.moi ? 'membres.confirmer.desactiver_soi_message' : 'membres.confirmer.desactiver_message', params),
                libelleConfirmer: this.translate.instant('membres.actions.desactiver'),
                danger: true,
            });
            if (!confirme) {
                return;
            }
        }
        await this.agir(
            membre,
            () => this.service.definirActif(membre, !membre.actif),
            membre.actif ? 'membres.succes.desactive' : 'membres.succes.reactive',
            params,
            membre.moi && membre.actif && membre.role === 'admin',
        );
    }

    /** Exécute une action ; un admin qui se retire ses droits quitte l'écran (la racine choisit où l'envoyer). */
    private async agir(membre: Membre, action: () => Promise<void>, succes: string, params: Record<string, string>, quitte: boolean): Promise<void> {
        this.enCours.set(membre.id);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await action();
            if (quitte) {
                await this.router.navigateByUrl(ROUTES_AUTH.racine);
                return;
            }
            this.succes.set({ cle: succes, params });
            await this.table()?.recharger();
        } catch (erreur) {
            this.erreur.set(erreur instanceof ErreurMembres ? erreur.cle : 'membres.erreurs.inattendue');
        } finally {
            this.enCours.set(null);
        }
    }

    protected choixRole(evenement: Event): void {
        this.filtreRole.set((evenement.target as HTMLSelectElement).value as RoleMembre | '');
        void this.table()?.recharger(true);
    }

    protected choixEtat(evenement: Event): void {
        this.filtreEtat.set((evenement.target as HTMLSelectElement).value as FiltreEtat);
        void this.table()?.recharger(true);
    }
}
