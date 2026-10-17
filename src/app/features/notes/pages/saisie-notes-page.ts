import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { SignauxDaaraService } from '../../../core/daara/signaux-daara.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { Badge } from '../../../shared/ui/badge/badge';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { ErreurNote, FeuilleNotes, LigneNote, SaisieNote, SaisieNotesService, lireNote, resumeSaisie } from '../data/saisie-notes.service';

type EtatLigne = { readonly etat: 'enregistrement' | 'enregistre' } | { readonly etat: 'erreur'; readonly cle: string };

/**
 * `/d/:slug/notes/evaluations/:id` (S6.3) : tous les élèves sur un écran ; note au clavier (Entrée → élève suivant),
 * enregistrée à la sortie du champ (« Enregistré » sur la ligne) ; « Absent » en un toucher ; appréciation repliée (si le
 * réglage l'active). Lecture seule si la période est clôturée ou si la matière n'est pas celle de l'utilisateur.
 */
@Component({
    selector: 'app-saisie-notes-page',
    imports: [RouterLink, TranslatePipe, Badge, EmptyState, Skeleton],
    template: `
        <a class="font-semibold text-primary hover:underline" routerLink="../.." [queryParams]="retour()">← {{ 'notes.saisie.retour' | translate }}</a>
        @if (chargement()) {
            <div class="panel mt-4"><app-skeleton [lignes]="6" /></div>
        } @else if (erreurChargement(); as erreur) {
            <div class="panel mt-4 grid gap-4">
                <div
                    class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                    role="alert"
                >
                    {{ erreur | translate }}
                </div>
                <div>
                    <button type="button" class="btn btn-outline-primary" (click)="charger()">{{ 'membres.reessayer' | translate }}</button>
                </div>
            </div>
        } @else if (feuille(); as f) {
            <div class="mt-3 mb-4">
                <h1 class="m-0 flex flex-wrap items-center gap-2 text-xl font-semibold text-black dark:text-white-light">
                    {{ f.libelle }}
                    @if (f.publiee) {
                        <app-badge variante="success">{{ 'notes.etats.publiee' | translate }}</app-badge>
                    }
                </h1>
                <p class="m-0 text-muted dark:text-night-muted">
                    {{ f.classeNom }} · {{ f.matiereNom }} · {{ f.periodeLibelle }} · {{ 'notes.saisie.sur' | translate: { bareme: nombre(f.bareme) } }}
                </p>
            </div>
            @if (!f.ecriture) {
                <p class="mb-4 rounded-md bg-gray-50 p-3 text-muted dark:bg-night-hover dark:text-night-muted">
                    {{ (f.cloturee ? 'notes.periode_cloturee' : 'notes.saisie.lecture_seule') | translate }}
                </p>
            }
            @if (lignes().length === 0) {
                <div class="panel">
                    <app-empty-state [titre]="'notes.saisie.vide_titre' | translate" [message]="'notes.saisie.vide' | translate">
                        @if (admin()) {
                            <a class="btn btn-primary" [routerLink]="['../../../structure/classes', f.classeId]">{{ 'notes.saisie.inscrire' | translate }}</a>
                        }
                    </app-empty-state>
                </div>
            } @else {
                <div class="panel mb-4 flex flex-wrap items-center justify-between gap-2" role="status">
                    <p class="m-0 font-semibold text-black dark:text-white-light">
                        {{ 'notes.saisie.resume' | translate: resume() }}
                    </p>
                    @if (f.ecriture) {
                        <p class="m-0 text-sm text-muted dark:text-night-muted">{{ 'notes.saisie.aide' | translate }}</p>
                    }
                </div>
                <ul class="m-0 grid list-none gap-2 p-0">
                    @for (l of lignes(); track l.apprenantId; let i = $index) {
                        <li class="panel flex flex-wrap items-center gap-x-4 gap-y-2 p-3!">
                            <label class="mb-0! min-w-0 flex-1 basis-40 font-semibold text-black dark:text-white-light" [for]="'note-' + i">
                                {{ l.nom }} {{ l.prenom }}
                            </label>
                            <div class="flex items-center gap-2">
                                <input
                                    class="form-input w-20 text-center text-lg font-bold"
                                    type="text"
                                    inputmode="decimal"
                                    enterkeyhint="next"
                                    autocomplete="off"
                                    [id]="'note-' + i"
                                    [value]="affichage(l)"
                                    [placeholder]="l.absent ? ('notes.saisie.abs' | translate) : ''"
                                    [disabled]="!f.ecriture || l.absent"
                                    [attr.aria-invalid]="erreurDe(l) ? true : null"
                                    [attr.aria-describedby]="'etat-' + i"
                                    (keydown.enter)="suivant(i, $event)"
                                    (blur)="sortie(l.apprenantId, $any($event.target).value)"
                                />
                                <span class="text-muted dark:text-night-muted">/ {{ nombre(f.bareme) }}</span>
                                @if (f.ecriture) {
                                    <button
                                        type="button"
                                        class="btn btn-sm min-h-11"
                                        [class.btn-warning]="l.absent"
                                        [class.btn-outline-warning]="!l.absent"
                                        [attr.aria-pressed]="l.absent"
                                        (click)="basculerAbsent(l.apprenantId)"
                                    >
                                        {{ 'notes.saisie.absent' | translate }}
                                    </button>
                                } @else if (l.absent) {
                                    <app-badge variante="warning">{{ 'notes.saisie.absent' | translate }}</app-badge>
                                }
                            </div>
                            <span class="min-w-24 text-sm" [id]="'etat-' + i" aria-live="polite">
                                @switch (etats()[l.apprenantId]?.etat) {
                                    @case ('enregistrement') {
                                        <span class="text-muted dark:text-night-muted">{{ 'notes.saisie.enregistrement' | translate }}</span>
                                    }
                                    @case ('enregistre') {
                                        <span class="text-primary">✓ {{ 'notes.saisie.enregistre' | translate }}</span>
                                    }
                                    @case ('erreur') {
                                        <span class="text-danger-strong dark:text-danger-soft">{{ erreurDe(l) ?? '' | translate }}</span>
                                    }
                                }
                            </span>
                            @if (f.appreciations && (l.valeur !== null || l.absent)) {
                                <div class="basis-full">
                                    @if (ouvertes()[l.apprenantId] || (!f.ecriture && l.appreciation)) {
                                        <textarea
                                            class="form-textarea min-h-16 w-full"
                                            maxlength="200"
                                            rows="2"
                                            [attr.aria-label]="'notes.saisie.appreciation_de' | translate: { nom: l.prenom + ' ' + l.nom }"
                                            [value]="l.appreciation ?? ''"
                                            [disabled]="!f.ecriture"
                                            (blur)="appreciation(l.apprenantId, $any($event.target).value)"
                                        ></textarea>
                                    } @else if (f.ecriture) {
                                        <button type="button" class="text-sm font-semibold text-primary hover:underline" (click)="ouvrir(l.apprenantId)">
                                            {{ (l.appreciation ? 'notes.saisie.modifier_appreciation' : 'notes.saisie.ajouter_appreciation') | translate }}
                                        </button>
                                        @if (l.appreciation) {
                                            <span class="text-sm text-muted dark:text-night-muted"> · {{ l.appreciation }}</span>
                                        }
                                    }
                                </div>
                            }
                        </li>
                    }
                </ul>
            }
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaisieNotesPage implements OnInit {
    private readonly service = inject(SaisieNotesService);
    private readonly langue = inject(LanguageService).langue;
    private readonly courante = inject(CurrentDaaraService);
    private readonly evaluationId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

    protected readonly admin = computed(() => this.courante.roles().includes('admin'));
    protected readonly feuille = signal<FeuilleNotes | null>(null);
    protected readonly lignes = signal<LigneNote[]>([]);
    protected readonly etats = signal<Record<string, EtatLigne>>({});
    protected readonly ouvertes = signal<Record<string, boolean>>({});
    protected readonly chargement = signal(true);
    protected readonly erreurChargement = signal<string | null>(null);
    protected readonly resume = computed(() => resumeSaisie(this.lignes()));
    /** Retour sur la liste des évaluations, à la même classe, matière et période. */
    protected readonly retour = computed(() => {
        const f = this.feuille();
        return f ? { classe: f.classeId, matiere: f.classeMatiereId, periode: f.periodeId } : {};
    });
    /** Un enregistrement à la fois par élève, dans l'ordre des saisies. */
    private readonly files = new Map<string, Promise<void>>();

    constructor() {
        // Saisie d'un collègue, évaluation modifiée ou publiée, élèves inscrits (S5.0b).
        inject(SignauxDaaraService).surveiller(['notes', 'evaluations', 'inscriptions', 'reglages_notes', 'periodes'], () => this.charger(true));
    }

    ngOnInit(): void {
        void this.charger();
    }

    protected async charger(silencieux = false): Promise<void> {
        if (!silencieux) {
            this.chargement.set(true);
        }
        this.erreurChargement.set(null);
        try {
            const f = await this.service.feuille(this.evaluationId);
            const enCours = this.etats();
            const actuelles = this.lignes();
            this.feuille.set(f);
            // Les lignes en cours d'enregistrement gardent leur état local.
            this.lignes.set(
                f.eleves.map((l) => (enCours[l.apprenantId]?.etat === 'enregistrement' ? (actuelles.find((x) => x.apprenantId === l.apprenantId) ?? l) : l)),
            );
        } catch (e) {
            this.erreurChargement.set(e instanceof ErreurNote ? e.cle : 'notes.saisie.erreurs.chargement');
        } finally {
            this.chargement.set(false);
        }
    }

    protected nombre(n: number): string {
        return n.toLocaleString(this.langue() === 'en' ? 'en-GB' : 'fr-FR');
    }

    protected affichage(l: LigneNote): string {
        return l.valeur === null ? '' : this.nombre(l.valeur);
    }

    protected erreurDe(l: LigneNote): string | null {
        const e = this.etats()[l.apprenantId];
        return e?.etat === 'erreur' ? e.cle : null;
    }

    /** Entrée : passe à l'élève suivant (la sortie du champ enregistre). */
    protected suivant(i: number, evenement: Event): void {
        evenement.preventDefault();
        const champs = [...document.querySelectorAll<HTMLInputElement>('input[id^="note-"]:not(:disabled)')];
        const courant = champs.findIndex((c) => c.id === `note-${i}`);
        const prochain = champs[courant + 1];
        if (prochain) {
            prochain.focus();
            prochain.select();
        } else {
            (evenement.target as HTMLInputElement).blur();
        }
    }

    protected sortie(apprenantId: string, texte: string): void {
        const l = this.ligne(apprenantId);
        const f = this.feuille();
        if (!l || !f?.ecriture || l.absent) {
            return;
        }
        const lu = lireNote(texte, f.bareme);
        if ('erreur' in lu) {
            this.etat(apprenantId, { etat: 'erreur', cle: lu.erreur });
            return;
        }
        const valeur = 'vide' in lu ? null : lu.valeur;
        if (valeur === l.valeur) {
            if (this.etats()[apprenantId]?.etat === 'erreur') {
                this.etat(apprenantId, null);
            }
            return;
        }
        this.sauver(apprenantId, { valeur, absent: false, appreciation: valeur === null ? null : l.appreciation });
    }

    protected basculerAbsent(apprenantId: string): void {
        const l = this.ligne(apprenantId);
        if (l) {
            this.sauver(
                apprenantId,
                l.absent ? { valeur: null, absent: false, appreciation: null } : { valeur: null, absent: true, appreciation: l.appreciation },
            );
        }
    }

    protected ouvrir(apprenantId: string): void {
        this.ouvertes.update((o) => ({ ...o, [apprenantId]: true }));
    }

    protected appreciation(apprenantId: string, texte: string): void {
        const l = this.ligne(apprenantId);
        const valeur = texte.trim() || null;
        if (l && valeur !== l.appreciation) {
            this.sauver(apprenantId, { valeur: l.valeur, absent: l.absent, appreciation: valeur });
        }
    }

    private sauver(apprenantId: string, saisie: SaisieNote): void {
        const precedent = this.files.get(apprenantId) ?? Promise.resolve();
        const suite = precedent.then(async () => {
            const f = this.feuille();
            const l = this.ligne(apprenantId);
            if (!f || !l) {
                return;
            }
            this.etat(apprenantId, { etat: 'enregistrement' });
            try {
                const noteId = await this.service.enregistrer(f, l, saisie);
                this.lignes.update((ls) =>
                    ls.map((x) =>
                        x.apprenantId === apprenantId
                            ? {
                                  ...x,
                                  noteId,
                                  valeur: saisie.absent ? null : saisie.valeur,
                                  absent: saisie.absent,
                                  appreciation: saisie.appreciation?.trim() || null,
                              }
                            : x,
                    ),
                );
                this.etat(apprenantId, { etat: 'enregistre' });
            } catch (e) {
                this.etat(apprenantId, { etat: 'erreur', cle: e instanceof ErreurNote ? e.cle : 'notes.saisie.erreurs.inattendue' });
            }
        });
        this.files.set(apprenantId, suite);
    }

    private ligne(apprenantId: string): LigneNote | undefined {
        return this.lignes().find((l) => l.apprenantId === apprenantId);
    }

    private etat(apprenantId: string, etat: EtatLigne | null): void {
        this.etats.update((e) => {
            const copie = { ...e };
            if (etat) {
                copie[apprenantId] = etat;
            } else {
                delete copie[apprenantId];
            }
            return copie;
        });
    }
}
