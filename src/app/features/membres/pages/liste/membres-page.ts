import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ROUTES_AUTH } from '../../../../core/auth/auth.service';
import { RoleMembre } from '../../../../core/daara/daara.model';
import { LanguageService } from '../../../../core/i18n/language.service';
import { IconHorizontalDots } from '../../../../shared/icon/icon-horizontal-dots';
import { IconSearch } from '../../../../shared/icon/icon-search';
import { Badge, BadgeVariante } from '../../../../shared/ui/badge/badge';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { ErreurMembres, Membre, MembresService, ROLES_ATTRIBUABLES } from '../../data/membres.service';

export type FiltreEtat = 'actifs' | 'desactives' | 'tous';

export const VARIANTE_ROLE: Record<RoleMembre, BadgeVariante> = { admin: 'secondary', enseignant: 'primary', parent: 'info', apprenant: 'dark' };

/**
 * `/d/:slug/membres` (S2.4) : liste des membres, recherche et filtres locaux (le `data-table` serveur arrive au
 * sprint 3), changement de rôle, désactivation / réactivation. Admin uniquement (`roleGuard`), la base revérifie.
 * Tableau à partir de 640 px, cartes en dessous.
 */
@Component({
    selector: 'app-membres-page',
    imports: [NgTemplateOutlet, TranslatePipe, Skeleton, EmptyState, Badge, CdkMenuTrigger, CdkMenu, CdkMenuItem, IconHorizontalDots, IconSearch],
    templateUrl: './membres-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembresPage implements OnInit {
    private readonly service = inject(MembresService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);
    private readonly router = inject(Router);
    private readonly langue = inject(LanguageService).langue;

    protected readonly membres = signal<Membre[]>([]);
    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal(false);
    protected readonly enCours = signal<string | null>(null);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<{ cle: string; params: Record<string, string> } | null>(null);

    protected readonly recherche = signal('');
    protected readonly filtreRole = signal<RoleMembre | ''>('');
    protected readonly filtreEtat = signal<FiltreEtat>('actifs');
    protected readonly roles: readonly RoleMembre[] = ['admin', 'enseignant', 'parent', 'apprenant'];
    protected readonly etats: readonly FiltreEtat[] = ['actifs', 'desactives', 'tous'];
    protected readonly variante = VARIANTE_ROLE;

    protected readonly visibles = computed(() => {
        const texte = normaliser(this.recherche());
        const role = this.filtreRole();
        const etat = this.filtreEtat();
        return this.membres().filter(
            (m) =>
                (!role || m.role === role) &&
                (etat === 'tous' || (etat === 'actifs') === m.actif) &&
                (!texte || normaliser(`${m.nom} ${m.telephone ?? ''}`).includes(texte)),
        );
    });

    ngOnInit(): void {
        void this.charger();
    }

    protected async charger(): Promise<void> {
        this.chargement.set(true);
        this.erreurChargement.set(false);
        try {
            this.membres.set(await this.service.lister());
        } catch {
            this.erreurChargement.set(true);
        } finally {
            this.chargement.set(false);
        }
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
            this.membres.set(await this.service.lister());
        } catch (erreur) {
            this.erreur.set(erreur instanceof ErreurMembres ? erreur.cle : 'membres.erreurs.inattendue');
        } finally {
            this.enCours.set(null);
        }
    }

    protected saisieRecherche(evenement: Event): void {
        this.recherche.set((evenement.target as HTMLInputElement).value);
    }

    protected choixRole(evenement: Event): void {
        this.filtreRole.set((evenement.target as HTMLSelectElement).value as RoleMembre | '');
    }

    protected choixEtat(evenement: Event): void {
        this.filtreEtat.set((evenement.target as HTMLSelectElement).value as FiltreEtat);
    }
}

/** Recherche insensible à la casse et aux accents. */
function normaliser(texte: string): string {
    return texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
