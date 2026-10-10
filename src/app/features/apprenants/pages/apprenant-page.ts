import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Badge } from '../../../shared/ui/badge/badge';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { ApprenantDialogService } from '../components/apprenant-dialog';
import { Apprenant, ApprenantsService, ErreurApprenants } from '../data/apprenants.service';
import { InscriptionEleve, InscriptionsService } from '../data/inscriptions.service';

/**
 * Fiche d'un élève (S4.1, admin) : identité, matricule, photo (bucket privé, URL signée), statut (« A quitté la daara »
 * / « Réinscrire »), modification, suppression. Classe (S4.2) et parents (S4.3) ajoutés par leurs stories.
 */
@Component({
    selector: 'app-apprenant-page',
    imports: [RouterLink, TranslatePipe, Badge, Skeleton],
    template: `
        <p class="mt-0 mb-3">
            <a class="font-semibold text-primary hover:underline" routerLink="..">← {{ 'apprenants.retour' | translate }}</a>
        </p>
        <div class="panel">
            @if (chargement()) {
                <app-skeleton [lignes]="4" />
            } @else if (erreurChargement(); as cle) {
                <div
                    class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                    role="alert"
                >
                    {{ cle | translate }}
                </div>
            } @else if (apprenant(); as a) {
                @if (erreur(); as erreur) {
                    <div
                        class="mb-4 rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                        role="alert"
                    >
                        {{ erreur | translate }}
                    </div>
                }
                @if (succes(); as succes) {
                    <div class="mb-4 rounded-md border border-primary/30 bg-primary/10 p-3.5 text-black dark:text-white-light" role="status">
                        {{ succes | translate }}
                    </div>
                }
                <div class="flex flex-wrap items-start gap-5">
                    <div class="grid justify-items-center gap-2">
                        <div
                            class="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-primary/10 text-3xl font-extrabold text-primary uppercase"
                        >
                            @if (photoUrl(); as url) {
                                <img [src]="url" [alt]="'apprenants.photo_de' | translate: { nom: a.prenom }" class="h-full w-full object-cover" />
                            } @else {
                                {{ a.prenom[0] }}{{ a.nom[0] }}
                            }
                        </div>
                        @if (admin()) {
                            <label class="btn btn-sm btn-outline-primary mb-0! min-h-11 cursor-pointer" [class.opacity-60]="enCours()">
                                {{ (a.photoPath ? 'apprenants.changer_photo' : 'apprenants.ajouter_photo') | translate }}
                                <input
                                    type="file"
                                    class="sr-only"
                                    accept="image/png,image/jpeg,image/webp"
                                    [disabled]="enCours()"
                                    (change)="choisirPhoto(a, $event)"
                                />
                            </label>
                            @if (a.photoPath) {
                                <button
                                    type="button"
                                    class="text-sm text-danger-strong hover:underline dark:text-danger-soft"
                                    [disabled]="enCours()"
                                    (click)="retirerPhoto(a)"
                                >
                                    {{ 'apprenants.retirer_photo' | translate }}
                                </button>
                            }
                        }
                    </div>
                    <div class="min-w-0 flex-1 basis-56">
                        <h2 class="m-0 flex flex-wrap items-center gap-2 text-xl font-bold dark:text-white-light">
                            {{ a.prenom }} {{ a.nom }}
                            <app-badge [variante]="a.statut === 'inscrit' ? 'success' : 'dark'">{{ 'apprenants.statuts.' + a.statut | translate }}</app-badge>
                        </h2>
                        <dl class="mt-3 mb-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                            <dt class="text-muted dark:text-night-muted">{{ 'apprenants.matricule' | translate }}</dt>
                            <dd class="m-0 font-mono">{{ a.matricule }}</dd>
                            <dt class="text-muted dark:text-night-muted">{{ 'apprenants.date_naissance' | translate }}</dt>
                            <dd class="m-0">{{ a.dateNaissance ? date(a.dateNaissance) : ('apprenants.non_renseignee' | translate) }}</dd>
                            <dt class="text-muted dark:text-night-muted">{{ 'apprenants.sexe' | translate }}</dt>
                            <dd class="m-0">{{ 'apprenants.sexes.' + a.sexe | translate }}</dd>
                            <dt class="self-center text-muted dark:text-night-muted">{{ 'apprenants.classe' | translate }}</dt>
                            <dd class="m-0">
                                @if (!anneeActiveId()) {
                                    <span class="text-muted dark:text-night-muted">{{ 'apprenants.pas_annee_active' | translate }}</span>
                                } @else if (admin() && a.statut === 'inscrit') {
                                    <select
                                        class="form-select max-w-64"
                                        [attr.aria-label]="'apprenants.choisir_classe' | translate"
                                        [value]="inscription()?.classeId ?? ''"
                                        [disabled]="enCours()"
                                        (change)="choisirClasse(a, $event)"
                                    >
                                        <option value="">{{ 'apprenants.sans_classe' | translate }}</option>
                                        @for (c of classes(); track c.id) {
                                            <option [value]="c.id">{{ c.nom }}</option>
                                        }
                                    </select>
                                } @else {
                                    {{ inscription()?.classeNom ?? ('apprenants.sans_classe' | translate) }}
                                }
                            </dd>
                        </dl>
                        @if (admin()) {
                            <div class="mt-5 flex flex-wrap gap-2">
                                <button type="button" class="btn btn-primary min-h-11" [disabled]="enCours()" (click)="modifier(a)">
                                    {{ 'apprenants.modifier' | translate }}
                                </button>
                                <button type="button" class="btn btn-outline-primary min-h-11" [disabled]="enCours()" (click)="basculerStatut(a)">
                                    {{ (a.statut === 'inscrit' ? 'apprenants.marquer_parti' : 'apprenants.reinscrire') | translate }}
                                </button>
                                <button type="button" class="btn btn-outline-danger min-h-11" [disabled]="enCours()" (click)="supprimer(a)">
                                    {{ 'apprenants.supprimer' | translate }}
                                </button>
                            </div>
                        }
                    </div>
                </div>
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprenantPage implements OnInit {
    private readonly service = inject(ApprenantsService);
    private readonly dialogue = inject(ApprenantDialogService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly id = this.route.snapshot.paramMap.get('apprenantId') ?? '';
    private readonly inscriptions = inject(InscriptionsService);
    private readonly courante = inject(CurrentDaaraService);

    protected readonly admin = computed(() => this.courante.roles().includes('admin'));
    protected readonly anneeActiveId = signal<string | null>(null);
    protected readonly classes = signal<readonly { id: string; nom: string }[]>([]);
    /** Inscription de l'année active. */
    protected readonly inscription = signal<InscriptionEleve | null>(null);

    protected readonly apprenant = signal<Apprenant | null>(null);
    protected readonly photoUrl = signal<string | null>(null);
    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal<string | null>(null);
    protected readonly enCours = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);

    ngOnInit(): void {
        void this.charger();
    }

    protected date(iso: string): string {
        return new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(
            new Date(`${iso}T00:00:00Z`),
        );
    }

    protected async modifier(a: Apprenant): Promise<void> {
        this.succes.set(null);
        if (await this.dialogue.ouvrir({ apprenant: a, enregistrer: (s) => this.service.modifier(a.id, s) })) {
            this.succes.set('apprenants.enregistre');
            await this.charger();
        }
    }

    /** Classe de l'année active : inscrire, changer ou retirer, en un seul choix. */
    protected async choisirClasse(a: Apprenant, evenement: Event): Promise<void> {
        const classeId = (evenement.target as HTMLSelectElement).value;
        const actuelle = this.inscription();
        const anneeId = this.anneeActiveId();
        if (!anneeId || classeId === (actuelle?.classeId ?? '')) {
            return;
        }
        await this.agir(async () => {
            if (!classeId && actuelle) {
                await this.inscriptions.desinscrire(actuelle.id);
            } else if (actuelle) {
                await this.inscriptions.changerClasse(actuelle.id, classeId);
            } else {
                await this.inscriptions.inscrire(classeId, anneeId, [a.id]);
            }
        }, 'inscriptions.classe_ok');
    }

    protected async basculerStatut(a: Apprenant): Promise<void> {
        await this.agir(
            () => this.service.changerStatut(a.id, a.statut === 'inscrit' ? 'parti' : 'inscrit'),
            a.statut === 'inscrit' ? 'apprenants.parti_ok' : 'apprenants.reinscrit_ok',
        );
    }

    protected async choisirPhoto(a: Apprenant, evenement: Event): Promise<void> {
        const champ = evenement.target as HTMLInputElement;
        const fichier = champ.files?.[0];
        champ.value = '';
        if (fichier) {
            await this.agir(() => this.service.deposerPhoto(a, fichier), 'apprenants.photo_ok');
        }
    }

    protected async retirerPhoto(a: Apprenant): Promise<void> {
        await this.agir(() => this.service.retirerPhoto(a), 'apprenants.photo_retiree');
    }

    protected async supprimer(a: Apprenant): Promise<void> {
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('apprenants.confirmer_suppression', { nom: `${a.prenom} ${a.nom}` }),
            message: this.translate.instant('apprenants.confirmer_suppression_message'),
            libelleConfirmer: this.translate.instant('apprenants.supprimer'),
            danger: true,
        });
        if (!confirme) {
            return;
        }
        this.enCours.set(true);
        try {
            await this.service.supprimer(a);
            await this.router.navigate(['..'], { relativeTo: this.route });
        } catch (e) {
            this.erreur.set(e instanceof ErreurApprenants ? e.cle : 'apprenants.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }

    private async charger(): Promise<void> {
        try {
            const a = await this.service.detail(this.id);
            this.apprenant.set(a);
            // Classe de l'année active (module structure inactif ou sans année : rien d'affiché).
            const [photo, anneeId, classes, inscriptions] = await Promise.all([
                this.service.urlPhoto(a.photoPath),
                this.service.anneeActive(),
                this.admin() ? this.service.classesAnneeActive().catch(() => []) : Promise.resolve([]),
                this.inscriptions.deLEleve(a.id).catch(() => []),
            ]);
            this.photoUrl.set(photo);
            this.anneeActiveId.set(anneeId);
            this.classes.set(classes);
            this.inscription.set(inscriptions.find((i) => i.anneeId === anneeId) ?? null);
        } catch (e) {
            this.erreurChargement.set(e instanceof ErreurApprenants ? e.cle : 'apprenants.erreurs.chargement');
        } finally {
            this.chargement.set(false);
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
            this.erreur.set(e instanceof ErreurApprenants ? e.cle : 'apprenants.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }
}
