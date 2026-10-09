import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ErreurApprenants } from '../data/apprenants.service';
import { EleveInscrit, InscriptionsService } from '../data/inscriptions.service';
import { InscrireDialogService } from './inscrire-dialog';

/**
 * Élèves d'une classe (S4.2), affichés dans le détail d'une classe : liste, « Inscrire des élèves » et « Retirer de la
 * classe » pour l'admin ; lecture seule pour l'enseignant.
 */
@Component({
    selector: 'app-eleves-classe',
    imports: [RouterLink, TranslatePipe, EmptyState],
    template: `
        <div class="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 class="m-0 text-base font-bold dark:text-white-light">{{ 'inscriptions.eleves_n' | translate: { n: eleves().length } }}</h3>
            @if (admin()) {
                <button type="button" class="btn btn-sm btn-primary min-h-11" [disabled]="enCours()" (click)="inscrire()">
                    {{ 'inscriptions.inscrire' | translate }}
                </button>
            }
        </div>
        @if (erreur(); as erreur) {
            <div
                class="mb-3 rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                role="alert"
            >
                {{ erreur | translate }}
            </div>
        }
        @if (succes(); as succes) {
            <div class="mb-3 rounded-md border border-primary/30 bg-primary/10 p-3.5 text-black dark:text-white-light" role="status">
                {{ succes | translate }}
            </div>
        }
        @if (eleves().length === 0) {
            <app-empty-state
                [titre]="'inscriptions.vide_titre' | translate"
                [message]="(admin() ? 'inscriptions.vide_message' : 'inscriptions.vide_lecture') | translate"
            />
        } @else {
            <ul class="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                @for (e of eleves(); track e.inscriptionId) {
                    <li class="flex items-center gap-3 rounded-md border border-white-light p-3 dark:border-night-border">
                        <div class="min-w-0 flex-1">
                            <a class="block truncate font-semibold text-primary hover:underline" [routerLink]="['/d', slug(), 'apprenants', e.apprenantId]">
                                {{ e.prenom }} {{ e.nom }}
                            </a>
                            <span class="font-mono text-xs text-muted dark:text-night-muted">{{ e.matricule }}</span>
                        </div>
                        @if (admin()) {
                            <button type="button" class="btn btn-sm btn-outline-danger min-h-11" [disabled]="enCours()" (click)="retirer(e)">
                                {{ 'inscriptions.retirer' | translate }}
                            </button>
                        }
                    </li>
                }
            </ul>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElevesClasse implements OnInit {
    readonly classeId = input.required<string>();
    readonly anneeId = input.required<string>();
    readonly classeNom = input.required<string>();
    readonly slug = input.required<string>();
    readonly admin = input(false);

    private readonly service = inject(InscriptionsService);
    private readonly dialogue = inject(InscrireDialogService);
    private readonly confirmation = inject(ConfirmDialogService);
    private readonly translate = inject(TranslateService);

    protected readonly eleves = signal<EleveInscrit[]>([]);
    protected readonly enCours = signal(false);
    protected readonly erreur = signal<string | null>(null);
    protected readonly succes = signal<string | null>(null);

    ngOnInit(): void {
        void this.charger();
    }

    protected async inscrire(): Promise<void> {
        this.erreur.set(null);
        this.succes.set(null);
        this.enCours.set(true);
        try {
            const candidats = await this.service.candidats(this.anneeId());
            const ok = await this.dialogue.ouvrir({
                classeNom: this.classeNom(),
                candidats,
                inscrire: (ids) => this.service.inscrire(this.classeId(), this.anneeId(), ids),
            });
            if (ok) {
                this.succes.set('inscriptions.inscrits_ok');
                await this.charger();
            }
        } catch (e) {
            this.erreur.set(e instanceof ErreurApprenants ? e.cle : 'inscriptions.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }

    protected async retirer(e: EleveInscrit): Promise<void> {
        const confirme = await this.confirmation.confirmer({
            titre: this.translate.instant('inscriptions.confirmer_retrait', { nom: `${e.prenom} ${e.nom}`, classe: this.classeNom() }),
            message: this.translate.instant('inscriptions.confirmer_retrait_message'),
            libelleConfirmer: this.translate.instant('inscriptions.retirer'),
        });
        if (!confirme) {
            return;
        }
        this.enCours.set(true);
        this.erreur.set(null);
        this.succes.set(null);
        try {
            await this.service.desinscrire(e.inscriptionId);
            this.succes.set('inscriptions.retire_ok');
            await this.charger();
        } catch (err) {
            this.erreur.set(err instanceof ErreurApprenants ? err.cle : 'inscriptions.erreurs.inattendue');
        } finally {
            this.enCours.set(false);
        }
    }

    private async charger(): Promise<void> {
        try {
            this.eleves.set(await this.service.eleves(this.classeId()));
        } catch (e) {
            this.erreur.set(e instanceof ErreurApprenants ? e.cle : 'inscriptions.erreurs.inattendue');
        }
    }
}
