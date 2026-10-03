import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, effect, inject, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { LanguageService } from '../../../core/i18n/language.service';
import { ThemeService } from '../../../core/theme/theme.service';

/** API minimale de Cloudflare Turnstile (https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/). */
interface TurnstileApi {
    render(element: HTMLElement, options: Record<string, unknown>): string;
    reset(widgetId: string): void;
    remove(widgetId: string): void;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const SCRIPT_TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let chargement: Promise<TurnstileApi> | null = null;

/** Charge le script Turnstile une seule fois, à la demande (origine autorisée par la CSP, public/_headers). */
function chargerTurnstile(document: Document): Promise<TurnstileApi> {
    chargement ??= new Promise<TurnstileApi>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SCRIPT_TURNSTILE;
        script.async = true;
        // Un échec n'est pas mis en cache : le prochain widget retentera le chargement.
        const echec = () => {
            chargement = null;
            script.remove();
            reject(new Error('turnstile'));
        };
        script.onload = () => (window.turnstile ? resolve(window.turnstile) : echec());
        script.onerror = echec;
        document.head.appendChild(script);
    });
    return chargement;
}

/**
 * Vérification anti-robot Cloudflare Turnstile (gratuit, LLD §7.0). Émet le jeton à joindre à l'appel Supabase
 * Auth, ou `null` quand il expire. Un jeton ne sert qu'une fois : appeler `reinitialiser()` après chaque envoi.
 */
@Component({
    selector: 'app-turnstile',
    imports: [TranslatePipe],
    template: `
        <div #conteneur class="min-h-[65px]"></div>
        @if (erreur()) {
            <p class="mt-1 text-sm text-danger-strong dark:text-danger-soft" role="alert">{{ 'auth.erreurs.captcha_chargement' | translate }}</p>
        }
    `,
    host: { class: 'block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Turnstile {
    readonly jeton = output<string | null>();

    protected readonly erreur = signal(false);
    private readonly conteneur = viewChild.required<ElementRef<HTMLElement>>('conteneur');
    private readonly document = inject(DOCUMENT);
    private readonly langue = inject(LanguageService).langue;
    private readonly sombre = inject(ThemeService).isDark;
    private widgetId: string | null = null;
    private api: TurnstileApi | null = null;

    constructor() {
        afterNextRender(() => void this.afficher());
        // Langue et thème changés : le widget est redessiné (le jeton en cours est perdu).
        effect(() => {
            this.langue();
            this.sombre();
            if (this.widgetId) {
                this.retirer();
                void this.afficher();
            }
        });
        inject(DestroyRef).onDestroy(() => this.retirer());
    }

    reinitialiser(): void {
        if (this.api && this.widgetId) {
            this.api.reset(this.widgetId);
        }
        this.jeton.emit(null);
    }

    private async afficher(): Promise<void> {
        try {
            this.api = await chargerTurnstile(this.document);
        } catch {
            this.erreur.set(true);
            return;
        }
        this.erreur.set(false);
        this.widgetId = this.api.render(this.conteneur().nativeElement, {
            sitekey: environment.turnstileSiteKey,
            language: this.langue(),
            theme: this.sombre() ? 'dark' : 'light',
            size: 'flexible',
            callback: (jeton: string) => this.jeton.emit(jeton),
            'expired-callback': () => this.jeton.emit(null),
            'error-callback': () => this.jeton.emit(null),
        });
    }

    private retirer(): void {
        if (this.api && this.widgetId) {
            this.api.remove(this.widgetId);
        }
        this.widgetId = null;
    }
}
