import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { Badge } from '../../../shared/ui/badge/badge';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { DatesDialogService } from '../components/dates-dialog';
import { Annee, AnneesService, ErreurStructure, ModelePeriodes, Periode, periodesModele } from '../data/annees.service';

/**
 * Structure → Années (S3.1, admin) : années scolaires (une active), périodes (modèles trimestres / semestres, saisie
 * libre), clôture et réouverture. Toutes les règles sont revérifiées par la base (RLS, triggers).
 */
@Component({
    selector: 'app-annees-page',
    imports: [TranslatePipe, Badge, EmptyState, Skeleton],
    templateUrl: './annees-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnneesPage implements OnInit {
    private readonly service = inject(AnneesService);
    private readonly dates = inject(DatesDialogService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);
    private readonly langue = inject(LanguageService).langue;

    protected readonly annees = signal<Annee[]>([]);
    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal(false);
    protected readonly enCours = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);

    ngOnInit(): void {
        void this.charger();
    }

    protected async charger(): Promise<void> {
        this.erreurChargement.set(false);
        try {
            this.annees.set(await this.service.lister());
        } catch {
            this.erreurChargement.set(true);
        } finally {
            this.chargement.set(false);
        }
    }

    /** Date `AAAA-MM-JJ` affichée sans décalage de fuseau. */
    protected date(iso: string): string {
        return new Intl.DateTimeFormat(this.langue() === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(
            new Date(`${iso}T00:00:00Z`),
        );
    }

    protected async nouvelleAnnee(): Promise<void> {
        const debut = new Date().getUTCFullYear();
        await this.saisir({
            titre: 'structure.annees.nouvelle',
            avecOrdre: false,
            valeurs: { libelle: `${debut}-${debut + 1}`, dateDebut: `${debut}-10-01`, dateFin: `${debut + 1}-07-31` },
            enregistrer: (s) => this.service.creerAnnee(s),
        });
    }

    protected async modifierAnnee(annee: Annee): Promise<void> {
        await this.saisir({
            titre: 'structure.annees.modifier',
            avecOrdre: false,
            valeurs: annee,
            enregistrer: (s) => this.service.modifierAnnee(annee.id, s),
        });
    }

    protected async activer(annee: Annee): Promise<void> {
        await this.agir(() => this.service.activerAnnee(annee.id), 'structure.annees.activee');
    }

    protected async supprimerAnnee(annee: Annee): Promise<void> {
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('structure.annees.confirmer_suppression', { libelle: annee.libelle }),
            message: this.translate.instant('structure.annees.confirmer_suppression_message'),
            libelleConfirmer: this.translate.instant('structure.supprimer'),
            danger: true,
        });
        if (confirme) {
            await this.agir(() => this.service.supprimerAnnee(annee.id), 'structure.annees.supprimee');
        }
    }

    protected async appliquerModele(annee: Annee, modele: ModelePeriodes): Promise<void> {
        const cle = modele === 'trimestres' ? 'structure.periodes.trimestre_n' : 'structure.periodes.semestre_n';
        const saisies = periodesModele(annee, modele, (n) => this.translate.instant(cle, { n }));
        await this.agir(() => this.service.creerPeriodes(annee.id, saisies), 'structure.periodes.creees');
    }

    protected async nouvellePeriode(annee: Annee): Promise<void> {
        const derniere = annee.periodes.at(-1);
        await this.saisir({
            titre: 'structure.periodes.nouvelle',
            avecOrdre: true,
            valeurs: { ordre: (derniere?.ordre ?? 0) + 1, dateDebut: derniere ? '' : annee.dateDebut, dateFin: annee.dateFin },
            enregistrer: (s) => this.service.creerPeriodes(annee.id, [s]),
        });
    }

    protected async modifierPeriode(periode: Periode): Promise<void> {
        await this.saisir({
            titre: 'structure.periodes.modifier',
            avecOrdre: true,
            valeurs: periode,
            enregistrer: (s) => this.service.modifierPeriode(periode.id, s),
        });
    }

    protected async basculerCloture(periode: Periode): Promise<void> {
        const cle = periode.cloturee ? 'reouvrir' : 'cloturer';
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant(`structure.periodes.confirmer_${cle}`, { libelle: periode.libelle }),
            message: this.translate.instant(`structure.periodes.confirmer_${cle}_message`),
            libelleConfirmer: this.translate.instant(`structure.periodes.${cle}`),
        });
        if (confirme) {
            await this.agir(
                () => this.service.cloturerPeriode(periode.id, !periode.cloturee),
                `structure.periodes.${periode.cloturee ? 'rouverte' : 'cloturee'}`,
            );
        }
    }

    protected async supprimerPeriode(periode: Periode): Promise<void> {
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('structure.periodes.confirmer_suppression', { libelle: periode.libelle }),
            message: this.translate.instant('structure.periodes.confirmer_suppression_message'),
            libelleConfirmer: this.translate.instant('structure.supprimer'),
            danger: true,
        });
        if (confirme) {
            await this.agir(() => this.service.supprimerPeriode(periode.id), 'structure.periodes.supprimee');
        }
    }

    private async saisir(donnees: Parameters<DatesDialogService['ouvrir']>[0]): Promise<void> {
        this.erreur.set(null);
        this.succes.set(null);
        if (await this.dates.ouvrir(donnees)) {
            this.succes.set('structure.enregistre');
            await this.charger();
        }
    }

    private async agir(action: () => Promise<void>, succes: string): Promise<void> {
        this.enCours.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await action();
            this.succes.set(succes);
            await this.charger();
        } catch (e) {
            this.erreur.set(e instanceof ErreurStructure ? e.cle : 'structure.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }
}
