import { Injectable, computed, signal } from '@angular/core';
import { DaaraAccessible, MODULES, ModuleDaara, RoleMembre, memoriserDerniereDaara } from './daara.model';

/**
 * Daara ouverte (`/d/:slug`), ses rôles et ses modules (LLD §2 « Services transverses »). Alimenté par `daaraGuard`.
 * Le front n'est qu'un confort : la RLS revérifie chaque accès.
 */
@Injectable({ providedIn: 'root' })
export class CurrentDaaraService {
    private readonly courante = signal<DaaraAccessible | null>(null);

    readonly daara = this.courante.asReadonly();
    readonly id = computed(() => this.daara()?.id ?? null);
    readonly slug = computed(() => this.daara()?.slug ?? null);
    readonly roles = computed<readonly RoleMembre[]>(() => this.daara()?.roles ?? []);
    /** Modules actifs : tous jusqu'à S2.2 (table `daara_modules`, ADR-008). */
    readonly modules = computed<readonly ModuleDaara[]>(() => (this.daara() ? MODULES : []));
    /** Parent ou apprenant uniquement : barre de navigation basse en mobile. */
    readonly famille = computed(() => this.roles().length > 0 && this.roles().every((r) => r === 'parent' || r === 'apprenant'));

    /** L'utilisateur a d'autres daaras : lien « Changer de daara » dans la sidebar. */
    readonly plusieursDaaras = signal(false);

    /** Message à afficher une fois (accès refusé par un guard), clé de traduction. */
    readonly message = signal<string | null>(null);

    definir(daara: DaaraAccessible): void {
        this.courante.set(daara);
        memoriserDerniereDaara(daara.slug);
    }

    vider(): void {
        this.courante.set(null);
        this.plusieursDaaras.set(false);
        this.message.set(null);
    }

    hasRole(...roles: RoleMembre[]): boolean {
        return this.roles().some((r) => roles.includes(r));
    }

    moduleActif(module: ModuleDaara): boolean {
        return this.modules().includes(module);
    }
}
