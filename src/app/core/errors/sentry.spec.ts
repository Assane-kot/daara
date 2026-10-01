import type { ErrorEvent } from '@sentry/angular';
import { environment } from '../../../environments/environment';
import { DaaraErrorHandler } from './error-handler';
import { initialiserSentry, nettoyerBreadcrumb, nettoyerEvenement, nettoyerTexte, nettoyerUrl, signalerErreur } from './sentry';

describe('Nettoyage des données personnelles avant envoi à Sentry', () => {
    it('masque e-mails, numéros de téléphone, identifiants et jetons', () => {
        const texte =
            'Échec pour awa.ndiaye@exemple.sn, tél. +221 77 123 45 67, apprenant 3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b, ' +
            'jeton eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl';

        const nettoye = nettoyerTexte(texte);

        expect(nettoye).toBe('Échec pour [email], tél. [numéro], apprenant [id], jeton [jeton]');
    });

    it("nettoie le détail d'une contrainte unique Postgres", () => {
        expect(nettoyerTexte('Key (telephone)=(771234567) already exists.')).toBe('Key (telephone)=([numéro]) already exists.');
    });

    it('laisse intact un message technique sans donnée personnelle', () => {
        expect(nettoyerTexte("Cannot read properties of undefined (reading 'nom')")).toBe("Cannot read properties of undefined (reading 'nom')");
    });

    it("retire paramètres et fragment des URL (jetons d'invitation, access_token Supabase)", () => {
        expect(nettoyerUrl('https://daara.pages.dev/auth/invitation?token=abc123')).toBe('https://daara.pages.dev/auth/invitation');
        expect(nettoyerUrl('https://daara.pages.dev/#access_token=eyJ.x.y&type=recovery')).toBe('https://daara.pages.dev/');
        expect(nettoyerUrl('https://daara.pages.dev/d/ma-daara/enfants/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b')).toBe(
            'https://daara.pages.dev/d/ma-daara/enfants/[id]',
        );
    });

    it("nettoie les requêtes réseau et navigations du fil d'actions", () => {
        const breadcrumb = nettoyerBreadcrumb({
            category: 'fetch',
            data: { url: 'https://x.supabase.co/rest/v1/profiles?email=eq.awa@exemple.sn', method: 'GET', status_code: 200 },
        });

        expect(breadcrumb.data?.['url']).toBe('https://x.supabase.co/rest/v1/profiles');
        expect(breadcrumb.data?.['method']).toBe('GET');
    });

    it('retire les attributs des éléments cliqués ou saisis (aria-label, title, alt, name)', () => {
        const clic = nettoyerBreadcrumb({
            category: 'ui.click',
            message: 'div.panel > button.btn.btn-primary[aria-label="Voir la fiche de Awa Ndiaye"] > img[alt="Photo de Awa Ndiaye"]',
        });
        const saisie = nettoyerBreadcrumb({ category: 'ui.input', message: 'input.form-input[name="nom_mere"][title="Fatou Sow"]' });

        expect(clic.message).toBe('div.panel > button.btn.btn-primary > img');
        expect(saisie.message).toBe('input.form-input');
    });

    it('retire un attribut dont la valeur contient des crochets', () => {
        const clic = nettoyerBreadcrumb({
            category: 'ui.click',
            message: 'a.lien[aria-label="Notes [CE2] de Awa Ndiaye"][title="Bulletin [T1]"] > span.badge',
        });

        expect(clic.message).toBe('a.lien > span.badge');
    });

    it('supprime les arguments bruts des journaux console', () => {
        const breadcrumb = nettoyerBreadcrumb({
            category: 'console',
            message: 'Erreur pour awa@exemple.sn',
            data: { arguments: [{ email: 'awa@exemple.sn' }] },
        });

        expect(breadcrumb.message).toBe('Erreur pour [email]');
        expect(breadcrumb.data?.['arguments']).toBeUndefined();
    });

    it("retire utilisateur, données additionnelles et détails de requête d'un événement", () => {
        const evenement = {
            type: undefined,
            message: 'Erreur pour awa@exemple.sn',
            user: { email: 'awa@exemple.sn', ip_address: '41.82.1.2' },
            extra: { formulaire: { nom: 'Ndiaye' } },
            request: {
                url: 'https://daara.pages.dev/auth?token=secret',
                headers: { Authorization: 'Bearer x' },
                cookies: { a: 'b' },
                query_string: 'token=secret',
            },
            exception: { values: [{ type: 'Error', value: 'Doublon 771234567' }] },
            breadcrumbs: [{ category: 'navigation', data: { from: '/auth?token=a', to: '/d/x' } }],
        } as ErrorEvent;

        const nettoye = nettoyerEvenement(evenement);

        expect(nettoye.user).toBeUndefined();
        expect(nettoye.extra).toBeUndefined();
        expect(nettoye.request).toEqual({ url: 'https://daara.pages.dev/auth' });
        expect(nettoye.message).toBe('Erreur pour [email]');
        expect(nettoye.exception?.values?.[0]?.value).toBe('Doublon [numéro]');
        expect(nettoye.breadcrumbs?.[0]?.data?.['from']).toBe('/auth');
    });
});

describe('Sentry en développement', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('ne charge pas le SDK sans DSN', async () => {
        expect(environment.sentryDsn).toBeNull();
        expect(await initialiserSentry(environment)).toBe(false);
    });

    it('ignore les erreurs signalées quand Sentry est inactif', () => {
        expect(() => signalerErreur(new Error('test'))).not.toThrow();
    });

    it("garde le journal console du gestionnaire d'erreurs global", () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const erreur = new Error('boum');

        new DaaraErrorHandler().handleError(erreur);

        expect(consoleError).toHaveBeenCalledWith(erreur);
    });
});
