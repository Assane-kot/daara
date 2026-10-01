import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Badge } from '../../shared/ui/badge/badge';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { FormField, FormFieldControl } from '../../shared/ui/form-field/form-field';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';

interface Swatch {
    readonly label: string;
    readonly className: string;
}

// Classes écrites en entier pour que Tailwind les génère.
const PRIMARY: readonly Swatch[] = [
    { label: '50', className: 'bg-primary-50' },
    { label: '100', className: 'bg-primary-100' },
    { label: '200', className: 'bg-primary-200' },
    { label: '300', className: 'bg-primary-300' },
    { label: '400', className: 'bg-primary-400' },
    { label: '500', className: 'bg-primary-500' },
    { label: '600', className: 'bg-primary-600' },
    { label: '700', className: 'bg-primary-700' },
    { label: '800', className: 'bg-primary-800' },
    { label: '900', className: 'bg-primary-900' },
    { label: '950', className: 'bg-primary-950' },
];

const SECONDARY: readonly Swatch[] = [
    { label: '50', className: 'bg-secondary-50' },
    { label: '100', className: 'bg-secondary-100' },
    { label: '200', className: 'bg-secondary-200' },
    { label: '300', className: 'bg-secondary-300' },
    { label: '400', className: 'bg-secondary-400' },
    { label: '500', className: 'bg-secondary-500' },
    { label: '600', className: 'bg-secondary-600' },
    { label: '700', className: 'bg-secondary-700' },
    { label: '800', className: 'bg-secondary-800' },
    { label: '900', className: 'bg-secondary-900' },
    { label: '950', className: 'bg-secondary-950' },
];

/**
 * Page de référence de la charte et des composants `shared/ui` (S0.2, S0.4), servie uniquement en
 * développement (`/dev/charte`). À retirer une fois la charte validée.
 */
@Component({
    selector: 'app-charte-page',
    imports: [ReactiveFormsModule, PageHeader, Badge, EmptyState, Skeleton, FormField, FormFieldControl],
    templateUrl: './charte-page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartePage {
    private readonly confirmation = inject(ConfirmDialogService);

    protected readonly primary = PRIMARY;
    protected readonly secondary = SECONDARY;
    protected readonly chargement = signal(false);
    protected readonly resultatConfirmation = signal('aucune');
    protected readonly erreurMatricule = signal<string | null>(null);

    protected readonly form = new FormGroup({
        nom: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
        matricule: new FormControl('A-12', { nonNullable: true, validators: [Validators.required] }),
        email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
        classe: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    });

    protected async supprimer(): Promise<void> {
        const confirme = await this.confirmation.confirmer({
            titre: "Supprimer l'évaluation ?",
            message: 'Les notes saisies pour cette évaluation seront perdues.',
            libelleConfirmer: 'Supprimer',
            danger: true,
        });
        this.resultatConfirmation.set(confirme ? 'confirmée' : 'annulée');
    }

    protected valider(): void {
        this.form.markAllAsTouched();
        // Simule une contrainte unique refusée par la base.
        this.erreurMatricule.set(this.form.controls.matricule.value === 'A-12' ? 'Ce matricule existe déjà dans la daara.' : null);
    }
}
