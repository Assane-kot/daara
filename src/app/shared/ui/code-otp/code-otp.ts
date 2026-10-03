import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, input, signal, viewChildren } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

const LONGUEUR = 6;

/**
 * Saisie d'un code à 6 chiffres en cases séparées (maquette validée) : avance automatique, retour arrière,
 * collage du code entier, remplissage automatique par le système (`autocomplete="one-time-code"`).
 * Valeur du contrôle : chaîne de chiffres (vide tant que rien n'est saisi).
 *
 * ```html
 * <app-code-otp formControlName="code" [libelleId]="'code-label'" />
 * ```
 */
@Component({
    selector: 'app-code-otp',
    imports: [TranslatePipe],
    template: `
        <div class="code-otp" role="group" [attr.aria-labelledby]="libelleId()" [attr.aria-describedby]="descriptionId()">
            @for (chiffre of chiffres(); track $index) {
                <input
                    #champ
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    maxlength="6"
                    class="code-otp-case"
                    [class.code-otp-milieu]="$index === 2"
                    [attr.autocomplete]="$index === 0 ? 'one-time-code' : 'off'"
                    [attr.aria-label]="'formulaire.code.chiffre' | translate: { n: $index + 1 }"
                    [attr.aria-invalid]="invalide() ? 'true' : null"
                    [value]="chiffre"
                    [disabled]="desactive()"
                    (input)="saisir($index, $event)"
                    (keydown)="touche($index, $event)"
                    (paste)="coller($index, $event)"
                    (focus)="selectionner($event)"
                    (blur)="toucher()"
                />
            }
        </div>
    `,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CodeOtp), multi: true }],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeOtp implements ControlValueAccessor {
    /** Identifiant du libellé du groupe (élément `<label>` ou `<p>` de la page). */
    readonly libelleId = input.required<string>();
    readonly descriptionId = input<string | null>(null);
    readonly invalide = input(false);

    protected readonly chiffres = signal<string[]>(Array<string>(LONGUEUR).fill(''));
    protected readonly desactive = signal(false);
    private readonly champs = viewChildren<ElementRef<HTMLInputElement>>('champ');

    private onChange: (valeur: string) => void = () => undefined;
    private onTouched: () => void = () => undefined;

    writeValue(valeur: string | null): void {
        const chiffres = (valeur ?? '').replace(/\D/g, '').slice(0, LONGUEUR).split('');
        this.chiffres.set(Array.from({ length: LONGUEUR }, (_, i) => chiffres[i] ?? ''));
    }

    registerOnChange(fn: (valeur: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(desactive: boolean): void {
        this.desactive.set(desactive);
    }

    /** Donne le focus à la première case vide. */
    focus(): void {
        const index = this.chiffres().findIndex((c) => !c);
        this.champs()[index === -1 ? LONGUEUR - 1 : index]?.nativeElement.focus();
    }

    protected saisir(index: number, evenement: Event): void {
        const champ = evenement.target as HTMLInputElement;
        const saisis = champ.value.replace(/\D/g, '');
        if (saisis.length > 1) {
            // Remplissage automatique du code complet (clavier du téléphone) ou frappe rapide.
            this.repartir(index, saisis);
            return;
        }
        this.mettreAJour(index, saisis);
        champ.value = saisis;
        if (saisis) {
            this.champs()[index + 1]?.nativeElement.focus();
        }
    }

    protected touche(index: number, evenement: KeyboardEvent): void {
        const champs = this.champs();
        if (evenement.key === 'Backspace' && !this.chiffres()[index] && index > 0) {
            evenement.preventDefault();
            this.mettreAJour(index - 1, '');
            champs[index - 1].nativeElement.focus();
        } else if (evenement.key === 'ArrowLeft' && index > 0) {
            evenement.preventDefault();
            champs[index - 1].nativeElement.focus();
        } else if (evenement.key === 'ArrowRight' && index < LONGUEUR - 1) {
            evenement.preventDefault();
            champs[index + 1].nativeElement.focus();
        }
    }

    protected coller(index: number, evenement: ClipboardEvent): void {
        const saisis = (evenement.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
        evenement.preventDefault();
        if (saisis) {
            this.repartir(index, saisis);
        }
    }

    protected selectionner(evenement: FocusEvent): void {
        (evenement.target as HTMLInputElement).select();
    }

    protected toucher(): void {
        this.onTouched();
    }

    private repartir(depart: number, saisis: string): void {
        const debut = saisis.length >= LONGUEUR ? 0 : depart;
        const chiffres = [...this.chiffres()];
        saisis
            .slice(0, LONGUEUR - debut)
            .split('')
            .forEach((c, i) => (chiffres[debut + i] = c));
        this.chiffres.set(chiffres);
        this.emettre();
        this.champs().forEach((champ, i) => (champ.nativeElement.value = chiffres[i]));
        this.focus();
    }

    private mettreAJour(index: number, chiffre: string): void {
        const chiffres = [...this.chiffres()];
        chiffres[index] = chiffre;
        this.chiffres.set(chiffres);
        this.emettre();
    }

    private emettre(): void {
        this.onChange(this.chiffres().join(''));
    }
}
