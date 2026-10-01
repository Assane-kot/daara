// Génère src/environments/environment.prod.ts (non versionné) avant `npm run build`.
//
// - Cloudflare Pages (CF_PAGES défini) : SUPABASE_URL et SUPABASE_ANON_KEY sont obligatoires
//   (variables du projet Pages : production = daara-prod, preview = daara-dev).
// - Ailleurs (poste, CI) sans ces variables : build branché sur le Supabase local.
// Refuse toute clé secrète (service_role / sb_secret_) : elle ne doit jamais atteindre le navigateur.
import { writeFileSync } from 'node:fs';

const CIBLE = new URL('../src/environments/environment.prod.ts', import.meta.url);
const ENTETE = '// Fichier généré par scripts/set-env.mjs — ne pas modifier, ne pas versionner.\n';

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

const url = process.env.SUPABASE_URL?.trim();
const cle = process.env.SUPABASE_ANON_KEY?.trim();

if (url && cle) {
    verifierUrl(url);
    verifierCle(cle);
    const config = { production: true, supabaseUrl: url, supabaseAnonKey: cle };
    writeFileSync(
        CIBLE,
        `${ENTETE}import { Environment } from './environment.model';\n\nexport const environment: Environment = ${JSON.stringify(config, null, 4)};\n`,
    );
    console.log(`[set-env] Build branché sur ${url}`);
} else if (process.env.CF_PAGES) {
    echec('SUPABASE_URL et SUPABASE_ANON_KEY doivent être définies dans les variables du projet Cloudflare Pages.');
} else {
    writeFileSync(
        CIBLE,
        `${ENTETE}import { environment as local } from './environment';\nimport { Environment } from './environment.model';\n\n` +
            '// Build hors Cloudflare sans variables : Supabase local.\nexport const environment: Environment = { ...local, production: true };\n',
    );
    console.warn('[set-env] SUPABASE_URL / SUPABASE_ANON_KEY absentes : build branché sur le Supabase local.');
}
