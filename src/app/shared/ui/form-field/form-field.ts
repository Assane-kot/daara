import { ChangeDetectionStrategy, Component, DestroyRef, Directive, afterNextRender, computed, contentChild, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgControl, ValidationErrors, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

/** Message affiché sous le champ : clé de traduction (validation client) ou texte déjà traduit (erreur serveur). */
export interface MessageChamp {
    readonly cle?: string;
    readonly params?: Record<string, unknown>;
    readonly texte?: string;
}

/** Traduit la première erreur de validation Angular en clé `formulaire.erreurs.*`. */
export function messageValidation(erreurs: ValidationErrors): MessageChamp {
    if (erreurs['required']) {
        return { cle: 'formulaire.erreurs.requis' };
    }
    if (erreurs['email']) {
        return { cle: 'formulaire.erreurs.email' };
    }
    if (erreurs['minlength']) {
        return { cle: 'formulaire.erreurs.min_longueur', params: { min: erreurs['minlength'].requiredLength } };
    }
    if (erreurs['maxlength']) {
        return { cle: 'formulaire.erreurs.max_longueur', params: { max: erreurs['maxlength'].requiredLength } };
    }
    if (erreurs['min']) {
        return { cle: 'formulaire.erreurs.min', params: { min: erreurs['min'].min } };
    }
    if (erreurs['max']) {
        return { cle: 'formulaire.erreurs.max', params: { max: erreurs['max'].max } };
    }
    if (erreurs['pattern']) {
        return { cle: 'formulaire.erreurs.motif' };
    }
    // Validateurs DAARA (validateurs.ts).
    if (erreurs['motDePasse']) {
        return { cle: 'formulaire.erreurs.mot_de_passe' };
    }
    if (erreurs['code']) {
        return { cle: 'formulaire.erreurs.code' };
    }
    if (erreurs['nomPris']) {
        return { cle: 'formulaire.erreurs.nom_pris' };
    }
    if (erreurs['codeAcces']) {
        return { cle: 'formulaire.erreurs.code_acces' };
    }
    if (erreurs['different']) {
        return { cle: 'formulaire.erreurs.different' };
    }
    if (erreurs['slug']) {
        return { cle: 'formulaire.erreurs.slug' };
    }
    if (erreurs['identifiant']) {
        return { cle: 'formulaire.erreurs.identifiant' };
    }
    return { cle: 'formulaire.erreurs.invalide' };
}

let prochainId = 0;

/**
 * Champ de formulaire harmonisé (markup Vristo « validation ») :
 *
 * ```html
 * <app-form-field [label]="'apprenants.nom' | translate" [aide]="...">
 *     <input appFormControl class="form-input" formControlName="nom" />
 * </app-form-field>
 * ```
 *
 * Libellé relié au champ, astérisque si `Validators.required`, aide, message d'erreur traduit affiché
 * une fois le champ touché (appeler `form.markAllAsTouched()` à la soumission), `aria-invalid` et
 * `aria-describedby` posés automatiquement.
 */
@Component({
    selector: 'app-form-field',
    imports: [TranslatePipe],
    template: `
        <label [for]="champId()">
            {{ label() }}
            @if (estRequis()) {
                <span class="text-danger-strong dark:text-danger-soft" aria-hidden="true">*</span>
                <span class="sr-only">({{ 'commun.obligatoire' | translate }})</span>
            }
        </label>
        <ng-content />
        @if (message(); as message) {
            <p class="mt-1 text-danger-strong dark:text-danger-soft" [id]="erreurId()">
                @if (message.texte) {
                    {{ message.texte }}
                } @else {
                    {{ message.cle ?? '' | translate: message.params }}
                }
            </p>
        } @else if (aide()) {
            <p class="mt-1 text-xs text-muted dark:text-night-muted" [id]="aideId()">{{ aide() }}</p>
        }
    `,
    host: { class: 'block', '[class.has-error]': 'enErreur()' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormField {
    /** Textes déjà traduits. */
    readonly label = input.required<string>();
    readonly aide = input<string>();
    /** Erreur venant du serveur (déjà traduite) : prioritaire sur la validation client. */
    readonly erreur = input<string | null>();
    /** Force l'astérisque quand le caractère obligatoire n'est pas porté par un validateur. */
    readonly requis = input(false);
    readonly champId = input(`champ-${++prochainId}`);

    private readonly controle = contentChild(FormFieldControl);

    readonly message = computed<MessageChamp | null>(() => {
        const serveur = this.erreur();
        if (serveur) {
            return { texte: serveur };
        }
        const erreurs = this.controle()?.erreurs();
        return erreurs ? messageValidation(erreurs) : null;
    });
    readonly enErreur = computed(() => this.message() !== null);
    readonly estRequis = computed(() => this.requis() || (this.controle()?.requis() ?? false));
    readonly erreurId = computed(() => `${this.champId()}-erreur`);
    readonly aideId = computed(() => `${this.champId()}-aide`);
    readonly descriptionId = computed(() => (this.enErreur() ? this.erreurId() : this.aide() ? this.aideId() : null));
}

/** À poser sur l'input / select / textarea projeté dans `app-form-field`. */
@Directive({
    selector: '[appFormControl]',
    host: {
        '[id]': 'champ.champId()',
        '[attr.aria-invalid]': 'champ.enErreur() ? "true" : null',
        '[attr.aria-describedby]': 'champ.descriptionId()',
        '[attr.aria-required]': 'champ.estRequis() ? "true" : null',
    },
})
export class FormFieldControl {
    protected readonly champ = inject(FormField);
    private readonly ngControl = inject(NgControl, { optional: true, self: true });
    private readonly destroyRef = inject(DestroyRef);

    readonly erreurs = signal<ValidationErrors | null>(null);
    readonly requis = signal(false);

    constructor() {
        // Après le premier rendu : avec `formControlName`, le FormControl n'est rattaché qu'après l'initialisation.
        afterNextRender(() => this.suivreControle());
    }

    private suivreControle(): void {
        const control = this.ngControl?.control;
        if (!control) {
            return;
        }
        const mettreAJour = () => {
            this.requis.set(control.hasValidator(Validators.required));
            this.erreurs.set(control.invalid && control.touched ? control.errors : null);
        };
        control.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(mettreAJour);
        mettreAJour();
    }
}
