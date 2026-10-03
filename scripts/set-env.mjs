// Génère src/environments/environment.prod.ts (non versionné) avant `npm run build`.
//
// - Cloudflare Pages (CF_PAGES défini) : SUPABASE_URL et SUPABASE_ANON_KEY sont obligatoires
//   (variables du projet Pages : production = daara-prod, preview = daara-dev), ainsi que TURNSTILE_SITE_KEY
//   (clés de test Cloudflare refusées). SENTRY_DSN est facultatif.
// - Ailleurs (poste, CI) sans ces variables : build branché sur le Supabase local, sans Sentry.
// Refuse toute clé secrète (service_role / sb_secret_) : elle ne doit jamais atteindre le navigateur.
import { writeFileSync } from 'node:fs';

const CIBLE = new URL('../src/environments/environment.prod.ts', import.meta.url);
const ENTETE = '// Fichier généré par scripts/set-env.mjs — ne pas modifier, ne pas versionner.\n';
/** Région UE de Sentry (données hébergées en Allemagne) : seule origine autorisée par la CSP (public/_headers). */
const HOTE_SENTRY = /^o\d+\.ingest\.de\.sentry\.io$/;

function echec(message) {
    console.error(`[set-env] ${message}`);
    process.exit(1);
}

/** Rôle porté par une clé au format JWT (anciennes clés anon / service_role), sinon null. */
function roleJwt(cle) {
    const parties = cle.split('.');
    if (parties.length !== 3) {
        return null;
    }
    try {
        return JSON.parse(Buffer.from(parties[1], 'base64url').toString('utf8')).role ?? null;
    } catch {
        return null;
    }
}

function verifierCle(cle) {
    if (cle.startsWith('sb_secret_') || roleJwt(cle) === 'service_role') {
        echec('SUPABASE_ANON_KEY contient une clé SECRÈTE (service_role). Utiliser la clé anon / publishable.');
    }
    if (!cle.startsWith('sb_publishable_') && roleJwt(cle) !== 'anon') {
        echec("SUPABASE_ANON_KEY n'est ni une clé publishable (sb_publishable_…) ni une clé JWT de rôle anon.");
    }
}

function verifierUrl(valeur) {
    let url;
    try {
        url = new URL(valeur);
    } catch {
        echec("SUPABASE_URL n'est pas une URL valide.");
    }
    const locale = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !locale) {
        echec('SUPABASE_URL doit être en https.');
    }
}

function verifierDsn(dsn) {
    let url;
    try {
        url = new URL(dsn);
    } catch {
        echec("SENTRY_DSN n'est pas une URL valide.");
    }
    if (url.protocol !== 'https:' || !url.username || !HOTE_SENTRY.test(url.hostname)) {
        echec('SENTRY_DSN doit être un DSN de la région UE de Sentry (https://<clé>@o<n>.ingest.de.sentry.io/<projet>).');
    }
}

/** Clés de site de test publiées par Cloudflare (1x… passe, 2x… bloque, 3x… défi) : interdites sur Cloudflare. */
const TURNSTILE_TEST = /^[123]x0{20}[0-9A-F]{2}$/;

function verifierTurnstile(cle) {
    if (!/^[0-9]x[0-9A-Za-z_-]{20,}$/.test(cle)) {
        echec("TURNSTILE_SITE_KEY n'a pas le format d'une clé de site Turnstile.");
    }
    // Aussi en preview : une clé de test impose la clé secrète de test côté Supabase, qui désactive le captcha et
    // laisse épuiser le quota d'e-mails (audit sprint 1, I-3).
    if (TURNSTILE_TEST.test(cle) && process.env.CF_PAGES) {
        echec('TURNSTILE_SITE_KEY est une clé de TEST Cloudflare : interdite sur Cloudflare (production et preview).');
    }
}

/** `production` pour la branche main, `preview` pour les autres branches Cloudflare. */
function environnementSentry() {
    const branche = process.env.CF_PAGES_BRANCH;
    return branche === 'main' ? 'production' : branche ? 'preview' : 'build-local';
}

const url = process.env.SUPABASE_URL?.trim();
const cle = process.env.SUPABASE_ANON_KEY?.trim();
const turnstile = process.env.TURNSTILE_SITE_KEY?.trim();
const dsn = process.env.SENTRY_DSN?.trim() || null;
const release = `daara@${process.env.CF_PAGES_COMMIT_SHA?.slice(0, 12) ?? 'local'}`;

if (url && cle) {
    if (!turnstile) {
        echec('TURNSTILE_SITE_KEY doit être définie avec SUPABASE_URL et SUPABASE_ANON_KEY.');
    }
    verifierUrl(url);
    verifierCle(cle);
    verifierTurnstile(turnstile);
    if (dsn) {
        verifierDsn(dsn);
    }
    const config = {
        production: true,
        supabaseUrl: url,
        supabaseAnonKey: cle,
        turnstileSiteKey: turnstile,
        sentryDsn: dsn,
        sentryEnvironment: environnementSentry(),
        release,
    };
    writeFileSync(
        CIBLE,
        `${ENTETE}import { Environment } from './environment.model';\n\nexport const environment: Environment = ${JSON.stringify(config, null, 4)};\n`,
    );
    console.log(`[set-env] Build branché sur ${url} ; Sentry ${dsn ? `activé (${config.sentryEnvironment})` : 'désactivé'}`);
} else if (process.env.CF_PAGES) {
    echec('SUPABASE_URL, SUPABASE_ANON_KEY et TURNSTILE_SITE_KEY doivent être définies dans les variables du projet Cloudflare Pages.');
} else {
    // Pas d'import de './environment' : le build le remplace par ce fichier même (import circulaire, valeurs vides).
    writeFileSync(
        CIBLE,
        `${ENTETE}import { ENVIRONNEMENT_LOCAL as local } from './environment.local';\nimport { Environment } from './environment.model';\n\n` +
            '// Build hors Cloudflare sans variables : Supabase local, sans Sentry.\n' +
            "export const environment: Environment = { ...local, production: true, sentryEnvironment: 'build-local' };\n",
    );
    console.warn('[set-env] SUPABASE_URL / SUPABASE_ANON_KEY absentes : build branché sur le Supabase local.');
}
