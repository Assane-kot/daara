import { SignauxDaaraService } from '../../core/daara/signaux-daara.service';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { DemarrageService, EtapeDemarrage, etapesDemarrage } from './demarrage.service';

const CLE_MASQUE = 'daara.demarrage-masque.';

/**
 * « Bien démarrer » (S4.5, admin) : étapes de la mise en route de la daara, avancement, bouton vers la prochaine étape.
 * Masquable (préférence de ce navigateur seulement).
 */
@Component({
    selector: 'app-demarrage-guide',
    imports: [RouterLink, TranslatePipe, Skeleton],
    template: `
        @if (!masque()) {
            <section class="panel mb-5" aria-labelledby="demarrage-titre">
                @if (chargement()) {
                    <app-skeleton [lignes]="4" />
                } @else if (erreur()) {
                    <p class="m-0 text-muted dark:text-night-muted">{{ 'demarrage.erreur' | translate }}</p>
                    <button type="button" class="btn btn-outline-primary mt-3" (click)="charger()">{{ 'membres.reessayer' | translate }}</button>
                } @else {
                    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 id="demarrage-titre" class="m-0 text-lg font-bold dark:text-white-light">
                                {{ (terminees() === etapes().length ? 'demarrage.titre_fini' : 'demarrage.titre') | translate }}
                            </h2>
                            <p class="m-0 text-muted dark:text-night-muted">
                                {{ 'demarrage.avancement' | translate: { faites: terminees(), total: etapes().length } }}
                            </p>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-dark min-h-11" (click)="masquer()">{{ 'demarrage.masquer' | translate }}</button>
                    </div>
                    <div
                        class="mb-5 h-2.5 overflow-hidden rounded-full bg-white-light dark:bg-night-border"
                        role="progressbar"
                        [attr.aria-valuenow]="terminees()"
                        aria-valuemin="0"
                        [attr.aria-valuemax]="etapes().length"
                        [attr.aria-label]="'demarrage.titre' | translate"
                    >
                        <div class="h-full rounded-full bg-primary transition-all" [style.width.%]="(terminees() / etapes().length) * 100"></div>
                    </div>
                    <ol class="m-0 grid list-none gap-3 p-0">
                        @for (e of etapes(); track e.cle; let i = $index) {
                            <li
                                class="flex flex-wrap items-center gap-3 rounded-md border p-3"
                                [class]="e === prochaine() ? 'border-primary bg-primary/5' : 'border-white-light dark:border-night-border'"
                            >
                                <span
                                    class="grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold"
                                    [class]="e.faite ? 'bg-primary text-white' : 'bg-white-light text-black dark:bg-night-border dark:text-white-light'"
                                    aria-hidden="true"
                                    >{{ e.faite ? '✓' : i + 1 }}</span
                                >
                                <div class="min-w-0 flex-1 basis-48">
                                    <p class="m-0 font-semibold" [class]="e.faite ? 'text-muted dark:text-night-muted' : 'text-black dark:text-white-light'">
                                        {{ 'demarrage.etapes.' + e.cle + '.titre' | translate }}
                                        @if (e.faite) {
                                            <span class="sr-only">({{ 'demarrage.faite' | translate }})</span>
                                        }
                                    </p>
                                    @if (!e.faite) {
                                        <p class="m-0 text-sm text-muted dark:text-night-muted">{{ 'demarrage.etapes.' + e.cle + '.aide' | translate }}</p>
                                    }
                                </div>
                                @if (e === prochaine()) {
                                    <a class="btn btn-primary min-h-11" [routerLink]="lien(e)">{{ 'demarrage.etapes.' + e.cle + '.action' | translate }}</a>
                                } @else if (!e.faite) {
                                    <a class="btn btn-sm btn-outline-primary min-h-11" [routerLink]="lien(e)">{{ 'demarrage.y_aller' | translate }}</a>
                                }
                            </li>
                        }
                    </ol>
                }
            </section>
        } @else {
            <button type="button" class="btn btn-sm btn-outline-primary mb-5 min-h-11" (click)="afficher()">{{ 'demarrage.afficher' | translate }}</button>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemarrageGuide implements OnInit {
    private readonly service = inject(DemarrageService);
    private readonly courante = inject(CurrentDaaraService);

    constructor() {
        // Mise à jour automatique quand un autre profil modifie ces données (S5.0b).
        inject(SignauxDaaraService).surveiller(
            ['annees_scolaires', 'matieres', 'classes', 'apprenants', 'inscriptions', 'memberships', 'invitations', 'parent_links', 'invitation_enfants'],
            () => this.charger(true),
        );
    }

    protected readonly etapes = signal<EtapeDemarrage[]>([]);
    protected readonly chargement = signal(true);
    protected readonly erreur = signal(false);
    protected readonly masque = signal(this.lireMasque());
    protected readonly terminees = computed(() => this.etapes().filter((e) => e.faite).length);
    protected readonly prochaine = computed(() => this.etapes().find((e) => !e.faite) ?? null);

    ngOnInit(): void {
        if (!this.masque()) {
            void this.charger();
        }
    }

    protected async charger(silencieux = false): Promise<void> {
        this.chargement.set(!silencieux);
        this.erreur.set(false);
        try {
            const etat = await this.service.etat();
            this.etapes.set(etapesDemarrage(etat, { structure: this.courante.moduleActif('structure'), notes: this.courante.moduleActif('notes') }));
        } catch {
            this.erreur.set(true);
        } finally {
            this.chargement.set(false);
        }
    }

    protected lien(e: EtapeDemarrage): string[] {
        return ['/d', this.courante.slug() ?? '', ...e.route.split('/')];
    }

    protected masquer(): void {
        this.masque.set(true);
        try {
            localStorage.setItem(CLE_MASQUE + this.courante.id(), '1');
        } catch {
            // Stockage indisponible (navigation privée) : masqué jusqu'au rechargement.
        }
    }

    protected afficher(): void {
        this.masque.set(false);
        try {
            localStorage.removeItem(CLE_MASQUE + this.courante.id());
        } catch {
            // Stockage indisponible : rien à effacer.
        }
        void this.charger();
    }

    private lireMasque(): boolean {
        try {
            return localStorage.getItem(CLE_MASQUE + this.courante.id()) === '1';
        } catch {
            return false;
        }
    }
}
