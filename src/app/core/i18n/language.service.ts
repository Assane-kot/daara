import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

/** Langues de l'interface (ADR-005). */
export type Langue = 'fr' | 'en';

export const LANGUES: readonly Langue[] = ['fr', 'en'];
export const LANGUE_PAR_DEFAUT: Langue = 'fr';

const STORAGE_KEY = 'daara.langue';

/** Langue de l'interface : bascule sans rechargement, `lang` sur `<html>`, mémorisée dans le navigateur. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
    private readonly translate = inject(TranslateService);
    private readonly document = inject(DOCUMENT);
    private readonly current = signal<Langue>(this.readStoredLangue());

    readonly langue = this.current.asReadonly();
    /** Langue proposée par le bouton de bascule. */
    readonly autreLangue = computed<Langue>(() => (this.langue() === 'fr' ? 'en' : 'fr'));

    /** Charge la langue mémorisée ; appelé au démarrage, avant le premier rendu. */
    init(): Promise<void> {
        return this.setLangue(this.current());
    }

    async setLangue(langue: Langue): Promise<void> {
        await firstValueFrom(this.translate.use(langue));
        this.current.set(langue);
        this.document.documentElement.lang = langue;
        try {
            this.document.defaultView?.localStorage.setItem(STORAGE_KEY, langue);
        } catch {
            // Stockage indisponible (navigation privée) : la préférence n'est pas mémorisée.
        }
    }

    basculer(): Promise<void> {
        return this.setLangue(this.autreLangue());
    }

    private readStoredLangue(): Langue {
        try {
            const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
            return LANGUES.find((langue) => langue === stored) ?? LANGUE_PAR_DEFAUT;
        } catch {
            return LANGUE_PAR_DEFAUT;
        }
    }
}
