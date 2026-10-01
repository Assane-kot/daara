import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'daara.theme';
const MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];
const DEFAULT_MODE: ThemeMode = 'light';

/** Mode d'affichage clair / sombre / système : classe `dark` sur `<body>`, mémorisé dans le navigateur. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly document = inject(DOCUMENT);
    private readonly darkQuery = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
    private readonly systemDark = signal(this.darkQuery?.matches ?? false);
    private readonly currentMode = signal<ThemeMode>(this.readStoredMode());

    readonly mode = this.currentMode.asReadonly();
    readonly isDark = computed(() => this.mode() === 'dark' || (this.mode() === 'system' && this.systemDark()));

    constructor() {
        this.darkQuery?.addEventListener('change', (event) => this.systemDark.set(event.matches));
        effect(() => this.document.body.classList.toggle('dark', this.isDark()));
    }

    setMode(mode: ThemeMode): void {
        this.currentMode.set(mode);
        try {
            this.document.defaultView?.localStorage.setItem(STORAGE_KEY, mode);
        } catch {
            // Stockage indisponible (navigation privée) : la préférence n'est pas mémorisée.
        }
    }

    /** Bascule clair → sombre → système → clair (bouton du header). */
    cycleMode(): void {
        this.setMode(MODES[(MODES.indexOf(this.mode()) + 1) % MODES.length]);
    }

    private readStoredMode(): ThemeMode {
        try {
            const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
            return MODES.find((mode) => mode === stored) ?? DEFAULT_MODE;
        } catch {
            return DEFAULT_MODE;
        }
    }
}
