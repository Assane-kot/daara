import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { sansAccents } from '../../../shared/ui/data-table/data-table';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { ApprenantsService, ErreurApprenants } from '../data/apprenants.service';
import { ErreurFichier, ErreurImport, LigneImport, MAX_LIGNES_IMPORT, TAILLE_MAX_IMPORT, analyserCsv, lireFichier, modeleCsv } from '../data/import-csv';

type Etape = 'fichier' | 'verification' | 'erreurs' | 'pret' | 'import' | 'termine';

/**
 * `/d/:slug/apprenants/import` (S4.4, admin) : modèle à télécharger → fichier analysé dans le navigateur puis vérifié
 * par la base (simulation : doublons, classes) → aperçu → import tout ou rien.
 */
@Component({
    selector: 'app-import-page',
    imports: [RouterLink, TranslatePipe, PageHeader],
    template: `
        <app-page-header [titre]="'import.titre' | translate" />
        <p class="mb-4">
            <a class="font-semibold text-primary hover:underline" routerLink="..">← {{ 'apprenants.retour' | translate }}</a>
        </p>

        <div class="panel grid max-w-3xl gap-5">
            @switch (etape()) {
                @case ('fichier') {
                    <ol class="m-0 grid list-none gap-5 p-0">
                        <li class="grid gap-2">
                            <h2 class="m-0 text-base font-bold dark:text-white-light">1. {{ 'import.etape_modele' | translate }}</h2>
                            <div>
                                <button type="button" class="btn btn-outline-primary" (click)="telechargerModele()">
                                    {{ 'import.telecharger_modele' | translate }}
                                </button>
                            </div>
                        </li>
                        <li class="grid gap-2">
                            <h2 class="m-0 text-base font-bold dark:text-white-light">2. {{ 'import.etape_remplir' | translate }}</h2>
                            <p class="m-0 text-muted dark:text-night-muted">{{ 'import.aide_remplir' | translate: { max } }}</p>
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th>{{ 'import.colonne' | translate }}</th>
                                            <th>{{ 'import.exemple' | translate }}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @for (c of colonnesAide; track c) {
                                            <tr>
                                                <td class="font-semibold">{{ 'import.colonnes.' + c | translate }}</td>
                                                <td>{{ 'import.exemples.' + c | translate }}</td>
                                            </tr>
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </li>
                        <li class="grid gap-2">
                            <h2 class="m-0 text-base font-bold dark:text-white-light">3. {{ 'import.etape_fichier' | translate }}</h2>
                            @if (classes().length > 0) {
                                <label class="mb-0! grid gap-1.5 font-semibold">
                                    {{ 'import.classe_defaut' | translate }}
                                    <select class="form-select font-normal" [value]="classeId()" (change)="classeId.set($any($event.target).value)">
                                        <option value="">{{ 'import.classe_aucune' | translate }}</option>
                                        @for (c of classes(); track c.id) {
                                            <option [value]="c.id">{{ c.nom }}</option>
                                        }
                                    </select>
                                </label>
                            }
                            <label class="btn btn-primary mb-0! w-fit cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary">
                                <input class="sr-only" type="file" accept=".csv,text/csv" (change)="choisir($event)" />
                                {{ 'import.choisir_fichier' | translate }}
                            </label>
                        </li>
                    </ol>
                    @if (fatale(); as f) {
                        <div
                            class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                            role="alert"
                        >
                            {{ f.cle | translate: f.params }}
                        </div>
                    }
                }
                @case ('verification') {
                    <p class="m-0" role="status">{{ 'import.verification' | translate }}</p>
                }
                @case ('erreurs') {
                    <div
                        class="rounded-md border border-danger/30 bg-danger-light p-3.5 text-danger-strong dark:bg-danger-dark-light dark:text-danger-soft"
                        role="alert"
                    >
                        <p class="m-0 font-bold">{{ 'import.erreurs_titre' | translate: { n: erreurs().length } }}</p>
                        <p class="m-0">{{ 'import.erreurs_aide' | translate }}</p>
                    </div>
                    <ul class="m-0 grid max-h-96 list-none gap-2 overflow-y-auto p-0">
                        @for (e of erreurs(); track $index) {
                            <li class="rounded-md border border-white-light p-3 dark:border-night-border">
                                <span class="font-bold">{{ 'import.ligne' | translate: { n: e.numero } }}</span> ·
                                {{ 'import.erreurs.' + e.champ + '_' + e.code | translate: { valeur: e.valeur } }}
                            </li>
                        }
                    </ul>
                    <div>
                        <label class="btn btn-primary mb-0! w-fit cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary">
                            <input class="sr-only" type="file" accept=".csv,text/csv" (change)="choisir($event)" />
                            {{ 'import.choisir_autre' | translate }}
                        </label>
                    </div>
                }
                @case ('pret') {
                    <p class="m-0 text-lg font-bold dark:text-white-light" role="status">{{ 'import.pret' | translate: { n: lignes().length } }}</p>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr>
                                    <th>{{ 'apprenants.eleve' | translate }}</th>
                                    <th>{{ 'apprenants.sexe' | translate }}</th>
                                    <th>{{ 'apprenants.date_naissance' | translate }}</th>
                                    <th>{{ 'apprenants.classe' | translate }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (l of apercu(); track l.numero) {
                                    <tr>
                                        <td>{{ l.prenom }} {{ l.nom }}</td>
                                        <td>{{ (l.sexe === 'F' ? 'apprenants.sexes.F' : 'apprenants.sexes.M') | translate }}</td>
                                        <td>{{ l.brut.date_naissance || '—' }}</td>
                                        <td>{{ classeAffichee(l) }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                    @if (lignes().length > apercu().length) {
                        <p class="m-0 text-muted dark:text-night-muted">{{ 'import.et_autres' | translate: { n: lignes().length - apercu().length } }}</p>
                    }
                    <div class="flex flex-wrap gap-3">
                        <button type="button" class="btn btn-primary" (click)="importer()">{{ 'import.importer' | translate: { n: lignes().length } }}</button>
                        <button type="button" class="btn btn-outline-dark" (click)="recommencer()">{{ 'commun.annuler' | translate }}</button>
                    </div>
                }
                @case ('import') {
                    <p class="m-0" role="status">{{ 'import.en_cours' | translate: { n: lignes().length } }}</p>
                }
                @case ('termine') {
                    <div class="rounded-md border border-primary/30 bg-primary/10 p-3.5 text-black dark:text-white-light" role="status">
                        {{ 'import.termine' | translate: { n: crees() } }}
                    </div>
                    <div class="flex flex-wrap gap-3">
                        <a class="btn btn-primary" routerLink="..">{{ 'import.voir_liste' | translate }}</a>
                        <button type="button" class="btn btn-outline-primary" (click)="recommencer()">{{ 'import.autre_fichier' | translate }}</button>
                    </div>
                }
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportPage {
    private readonly service = inject(ApprenantsService);
    private readonly langue = inject(LanguageService);
    private readonly translate = inject(TranslateService);

    protected readonly max = MAX_LIGNES_IMPORT;

    protected readonly colonnesAide = ['nom', 'prenom', 'sexe', 'date_naissance', 'classe'] as const;
    protected readonly etape = signal<Etape>('fichier');
    protected readonly classes = signal<readonly { id: string; nom: string }[]>([]);
    protected readonly classeId = signal('');
    protected readonly lignes = signal<readonly LigneImport[]>([]);
    protected readonly erreurs = signal<readonly ErreurImport[]>([]);
    protected readonly fatale = signal<ErreurFichier | null>(null);
    protected readonly crees = signal(0);
    protected readonly apercu = computed(() => this.lignes().slice(0, 10));
    protected readonly nomClasseDefaut = computed(() => this.classes().find((c) => c.id === this.classeId())?.nom ?? null);

    constructor() {
        void this.service.classesAnneeActive().then(
            (c) => this.classes.set(c),
            () => this.classes.set([]),
        );
    }

    /** Classe telle qu'elle sera retenue (nom exact de la classe trouvée sans accents ni casse, ou classe par défaut). */
    protected classeAffichee(l: LigneImport): string {
        if (!l.classe) {
            return this.nomClasseDefaut() ?? '—';
        }
        const cle = sansAccents(l.classe);
        return this.classes().find((c) => sansAccents(c.nom.trim()) === cle)?.nom ?? l.classe;
    }

    protected telechargerModele(): void {
        const url = URL.createObjectURL(modeleCsv(this.langue.langue()));
        const lien = document.createElement('a');
        lien.href = url;
        lien.download = this.langue.langue() === 'en' ? 'students-template.csv' : 'modele-eleves.csv';
        lien.click();
        setTimeout(() => URL.revokeObjectURL(url));
    }

    protected async choisir(evenement: Event): Promise<void> {
        const champ = evenement.target as HTMLInputElement;
        const fichier = champ.files?.[0];
        champ.value = '';
        if (!fichier) {
            return;
        }
        this.fatale.set(null);
        this.erreurs.set([]);
        if (fichier.size > TAILLE_MAX_IMPORT) {
            this.echec({ cle: 'import.fatal.trop_gros' });
            return;
        }
        this.etape.set('verification');
        let analyse;
        try {
            analyse = analyserCsv(await lireFichier(fichier));
        } catch {
            this.echec({ cle: 'import.fatal.lecture' });
            return;
        }
        if (analyse.fatale) {
            this.echec(analyse.fatale);
            return;
        }
        this.lignes.set(analyse.lignes);
        // La base vérifie ce que le navigateur ne sait pas (doublons, classes) sans rien écrire ; les lignes déjà en
        // erreur ne lui sont pas envoyées, et toutes les erreurs sont montrées en une fois.
        await this.envoyer(true, analyse.erreurs);
    }

    protected async importer(): Promise<void> {
        await this.envoyer(false);
    }

    protected recommencer(): void {
        this.lignes.set([]);
        this.erreurs.set([]);
        this.fatale.set(null);
        this.etape.set('fichier');
    }

    private async envoyer(simuler: boolean, erreursFichier: readonly ErreurImport[] = []): Promise<void> {
        this.etape.set(simuler ? 'verification' : 'import');
        const enErreur = new Set(erreursFichier.map((e) => e.numero));
        const lignes = this.lignes().filter((l) => !enErreur.has(l.numero));
        try {
            const r = lignes.length > 0 ? await this.service.importer(lignes, this.classeId() || null, simuler) : { crees: 0, erreurs: [] };
            const erreurs = [
                ...erreursFichier,
                ...r.erreurs.map((e): ErreurImport => {
                    const l = lignes[e.ligne - 1];
                    return { numero: l?.numero ?? e.ligne, champ: e.champ, code: e.code, valeur: l && e.champ !== 'ligne' ? l.brut[e.champ] : '' };
                }),
            ].sort((a, b) => a.numero - b.numero);
            if (erreurs.length > 0) {
                this.erreurs.set(erreurs);
                this.etape.set('erreurs');
            } else if (simuler) {
                this.etape.set('pret');
            } else {
                this.crees.set(r.crees);
                this.etape.set('termine');
            }
        } catch (e) {
            this.echec({ cle: e instanceof ErreurApprenants ? e.cle : 'apprenants.erreurs.inattendue' });
        }
    }

    private echec(erreur: ErreurFichier): void {
        const colonnes = erreur.params?.['colonnes'];
        this.fatale.set(
            typeof colonnes === 'string'
                ? {
                      ...erreur,
                      params: {
                          colonnes: colonnes
                              .split(',')
                              .map((c) => this.translate.instant('import.noms_colonnes.' + c))
                              .join(', '),
                      },
                  }
                : erreur,
        );
        this.etape.set('fichier');
    }
}
