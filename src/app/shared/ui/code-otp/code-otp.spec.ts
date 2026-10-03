import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { CodeOtp } from './code-otp';

@Component({
    imports: [ReactiveFormsModule, CodeOtp],
    template: `<p id="libelle">Code</p>
        <app-code-otp [formControl]="code" libelleId="libelle" />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
class HoteTest {
    readonly code = new FormControl('', { nonNullable: true });
}

describe('CodeOtp', () => {
    let fixture: ComponentFixture<HoteTest>;
    let cases: HTMLInputElement[];

    beforeEach(async () => {
        TestBed.configureTestingModule({ providers: [provideTranslateTesting()] });
        fixture = TestBed.createComponent(HoteTest);
        await fixture.whenStable();
        cases = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    });

    function saisir(index: number, valeur: string): void {
        cases[index].value = valeur;
        cases[index].dispatchEvent(new Event('input'));
    }

    it('affiche 6 cases étiquetées dans un groupe relié au libellé', () => {
        expect(cases).toHaveLength(6);
        expect(cases[0].getAttribute('autocomplete')).toBe('one-time-code');
        expect(cases[0].getAttribute('inputmode')).toBe('numeric');
        expect(cases[2].getAttribute('aria-label')).toBe('Chiffre 3 sur 6');
        expect((fixture.nativeElement as HTMLElement).querySelector('[role=group]')?.getAttribute('aria-labelledby')).toBe('libelle');
    });

    it('avance à la case suivante et ignore les caractères non numériques', () => {
        saisir(0, '4');
        expect(document.activeElement).toBe(cases[1]);
        saisir(1, 'x');
        expect(cases[1].value).toBe('');
        expect(fixture.componentInstance.code.value).toBe('4');
    });

    it('répartit un code complet collé ou rempli automatiquement', () => {
        saisir(0, '940715');
        expect(cases.map((c) => c.value).join('')).toBe('940715');
        expect(fixture.componentInstance.code.value).toBe('940715');
    });

    it('affiche la valeur écrite par le formulaire et la remet à zéro', async () => {
        fixture.componentInstance.code.setValue('123456');
        await fixture.whenStable();
        expect(cases.map((c) => c.value).join('')).toBe('123456');

        fixture.componentInstance.code.reset();
        await fixture.whenStable();
        expect(cases.every((c) => c.value === '')).toBe(true);
    });
});
