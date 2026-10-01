import type { Breadcrumb, ErrorEvent } from '@sentry/angular';
import { Environment } from '../../../environments/environment.model';

/*
 * Suivi des erreurs (Sentry, offre gratuite, région UE). Données de mineurs : AUCUNE donnée personnelle ne doit
 * partir (règles de sécurité, CDP). Deux protections :
 *   1. `dataCollection` : le SDK ne collecte ni utilisateur, ni cookies, ni en-têtes, ni paramètres d'URL,
 *      ni corps de requêtes, ni variables locales (Sentry v11 collecte tout cela par défaut) ;
 *   2. `beforeSend` / `beforeBreadcrumb` : nettoyage de tout texte restant (messages d'erreur, URL, fil d'actions).
 */

const JETON = /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g;
const EMAIL = /[\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
/** Numéros de téléphone et autres suites de 8 chiffres ou plus (ex. détail d'une contrainte unique Postgres). */
const NUMERO = /\+?\d(?:[\s.-]?\d){7,}/g;

/** Remplace jetons, e-mails, identifiants et numéros par des marqueurs. */
export function nettoyerTexte(texte: string): string {
    return texte.replace(JETON, '[jeton]').replace(EMAIL, '[email]').replace(UUID, '[id]').replace(NUMERO, '[numéro]');
}

/** Retire paramètres et fragment (jetons d'invitation, `#access_token=` de Supabase Auth), puis nettoie le chemin. */
export function nettoyerUrl(url: string): string {
    return nettoyerTexte(url.split(/[?#]/)[0] ?? '');
}

export function nettoyerBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
    const data = breadcrumb.data ? { ...breadcrumb.data } : undefined;
    if (data) {
        for (const cle of ['url', 'from', 'to']) {
            if (typeof data[cle] === 'string') {
                data[cle] = nettoyerUrl(data[cle]);
            }
        }
        // Arguments bruts des console.warn / console.error.
        delete data['arguments'];
    }
    let message = breadcrumb.message;
    if (message && breadcrumb.category?.startsWith('ui.')) {
        // Clics et saisies : Sentry décrit l'élément avec ses attributs (aria-label, title, alt, name…), qui
        // peuvent contenir un nom (« Photo de … »). On ne garde que la balise et les classes CSS.
        // Attribut entier, même si sa valeur contient « ] » (ex. « Notes [CE2] de … »).
        message = message.replace(/\[[\w-]+="[\s\S]*?"\](?=\[[\w-]+="|\s>\s|$)/g, '');
    }
    return { ...breadcrumb, message: message ? nettoyerTexte(message) : message, data };
}

export function nettoyerEvenement(event: ErrorEvent): ErrorEvent {
    const nettoye: ErrorEvent = { ...event };
    delete nettoye.user;
    delete nettoye.extra;
    if (nettoye.request) {
        nettoye.request = { url: nettoye.request.url ? nettoyerUrl(nettoye.request.url) : undefined };
    }
    if (nettoye.message) {
        nettoye.message = nettoyerTexte(nettoye.message);
    }
    if (nettoye.transaction) {
        nettoye.transaction = nettoyerUrl(nettoye.transaction);
    }
    if (nettoye.exception?.values) {
        nettoye.exception = {
            ...nettoye.exception,
            values: nettoye.exception.values.map((valeur) => ({ ...valeur, value: valeur.value ? nettoyerTexte(valeur.value) : valeur.value })),
        };
    }
    if (nettoye.breadcrumbs) {
        nettoye.breadcrumbs = nettoye.breadcrumbs.map(nettoyerBreadcrumb);
    }
    return nettoye;
}

/** Erreurs survenues avant le chargement du SDK (chargé en différé), envoyées une fois Sentry prêt. */
const MAX_EN_ATTENTE = 10;
let enAttente: unknown[] | null = null;
let capturer: ((erreur: unknown) => void) | null = null;

/** Transmet une erreur à Sentry s'il est actif ; sans effet en développement. */
export function signalerErreur(erreur: unknown): void {
    if (capturer) {
        capturer(erreur);
    } else if (enAttente && enAttente.length < MAX_EN_ATTENTE) {
        enAttente.push(erreur);
    }
}

/**
 * Initialise Sentry si un DSN est configuré (Cloudflare) ; renvoie `false` sinon (développement).
 * Le SDK est chargé en différé (import dynamique) : il ne pèse pas sur le chargement initial de l'application.
 */
export async function initialiserSentry(environment: Environment): Promise<boolean> {
    if (!environment.sentryDsn) {
        return false;
    }
    enAttente = [];
    const Sentry = await import('./sentry-sdk');
    Sentry.init({
        dsn: environment.sentryDsn,
        environment: environment.sentryEnvironment,
        release: environment.release,
        maxBreadcrumbs: 30,
        dataCollection: {
            userInfo: false,
            cookies: false,
            httpHeaders: false,
            httpBodies: [],
            urlQueryParams: false,
            databaseQueryData: false,
            queues: false,
            stackFrameVariables: false,
            graphQL: { document: false, variables: false },
            genAI: { inputs: false, outputs: false },
        },
        beforeSend: (event) => nettoyerEvenement(event),
        beforeBreadcrumb: (breadcrumb) => nettoyerBreadcrumb(breadcrumb),
    });
    capturer = (erreur) => Sentry.captureException(erreur);
    enAttente.forEach(capturer);
    enAttente = null;
    return true;
}
