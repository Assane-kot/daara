import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { FormField, FormFieldControl, messageValidation } from './form-field';

@Component({
    imports: [ReactiveFormsModule, FormField, FormFieldControl],
    template: `
        <form [formGroup]="form">
            <app-form-field label="Nom" aide="Tel qu'il figure sur l'acte de naissance." [erreur]="erreurServeur()">
                <input appFormControl class="form-input" formControlName="nom" />
            </app-form-field>
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
class HoteTest {
    readonly form = new FormGroup({ nom: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }) });
    readonly erreurServeur = signal<string | null>(null);
}

describe('FormField', () => {
    let fixture: ComponentFixture<HoteTest>;
    let element: HTMLElement;
    let input: HTMLInputElement;

    beforeEach(async () => {
        TestBed.configureTestingModule({ providers: [provideTranslateTesting()] });
        fixture = TestBed.createComponent(HoteTest);
        element = fixture.nativeElement as HTMLElement;
        await fixture.whenStable();
        input = element.querySelector('input') as HTMLInputElement;
    });

    it('relie le libellé au champ et signale le caractère obligatoire', () => {
        const label = element.querySelector('label');

        expect(label?.getAttribute('for')).toBe(input.id);
        expect(label?.textContent).toContain('*');
        expect(label?.textContent).toContain('(obligatoire)');
        expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('affiche l\'aide sans erreur tant que le champ n\'est pas touché', () => {
        expect(element.textContent).toContain("Tel qu'il figure sur l'acte de naissance.");
        expect(input.getAttribute('aria-invalid')).toBeNull();
        expect(input.getAttribute('aria-describedby')).toBe(`${input.id}-aide`);
    });

    it('affiche l\'erreur traduite après soumission et la relie au champ', async () => {
        fixture.componentInstance.form.markAllAsTouched();
        await fixture.whenStable();

        const erreur = element.querySelector(`#${input.id}-erreur`);
        expect(erreur?.textContent?.trim()).toBe('Ce champ est obligatoire.');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(input.getAttribute('aria-describedby')).toBe(`${input.id}-erreur`);
        expect(element.querySelector('app-form-field')?.classList.contains('has-error')).toBe(true);
    });

    it('traduit les erreurs avec paramètres', async () => {
        const nom = fixture.componentInstance.form.controls.nom;
        nom.setValue('Ab');
        nom.markAsTouched();
        await fixture.whenStable();

        expect(element.querySelector(`#${input.id}-erreur`)?.textContent?.trim()).toBe('Au moins 3 caractères.');
    });

    it('donne la priorité à l\'erreur serveur', async () => {
        fixture.componentInstance.form.controls.nom.setValue('Moussa');
        fixture.componentInstance.erreurServeur.set('Ce matricule existe déjà dans la daara.');
        await fixture.whenStable();

        expect(element.querySelector(`#${input.id}-erreur`)?.textContent?.trim()).toBe('Ce matricule existe déjà dans la daara.');
    });
});

describe('messageValidation', () => {
    it('associe chaque validateur Angular à sa clé de traduction', () => {
        expect(messageValidation({ required: true })).toEqual({ cle: 'formulaire.erreurs.requis' });
        expect(messageValidation({ email: true })).toEqual({ cle: 'formulaire.erreurs.email' });
        expect(messageValidation({ maxlength: { requiredLength: 50, actualLength: 60 } })).toEqual({
            cle: 'formulaire.erreurs.max_longueur',
            params: { max: 50 },
        });
        expect(messageValidation({ min: { min: 0, actual: -1 } })).toEqual({ cle: 'formulaire.erreurs.min', params: { min: 0 } });
        expect(messageValidation({ pattern: {} })).toEqual({ cle: 'formulaire.erreurs.motif' });
        expect(messageValidation({ personnalise: true })).toEqual({ cle: 'formulaire.erreurs.invalide' });
    });
});
