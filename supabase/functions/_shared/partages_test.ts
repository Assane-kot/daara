import { assert, assertEquals, assertFalse, assertStringIncludes } from 'jsr:@std/assert@1.0.19';
import { envoyerCourriel, type Fetch } from './email.ts';
import { entetesCors, erreurRpc, originesAutorisees, servir } from './http.ts';
import { masquerEmail, masquerTelephone } from './masquage.ts';
import { courrielInvitation, courrielMotDePasseChange, echapperHtml, messageWhatsapp } from './modeles.ts';
import { estLocal, verifierTurnstile } from './turnstile.ts';
import * as v from './validation.ts';

const envDe = (valeurs: Record<string, string>) => (nom: string) => valeurs[nom];

Deno.test('validation : e-mail normalisé, invalides refusés', () => {
    assertEquals(v.email('  Awa.Ndiaye@Gmail.COM '), 'awa.ndiaye@gmail.com');
    assertEquals(v.email('pas-un-email'), null);
    assertEquals(v.email('a@b'), null);
    assertEquals(v.email(42), null);
    assertEquals(v.email('a'.repeat(250) + '@x.sn'), null);
    assertEquals(v.email('a@b.sn,c@d.sn'), null);
    assertEquals(v.email('"Awa" <a@b.sn>'), null);
});

Deno.test('validation : téléphone normalisé en E.164 (+221 par défaut pour 9 chiffres)', () => {
    assertEquals(v.telephone('77 123 45 67'), '+221771234567');
    assertEquals(v.telephone('+221 77-123.45.67'), '+221771234567');
    assertEquals(v.telephone('00221771234567'), '+221771234567');
    assertEquals(v.telephone('221771234567'), '+221771234567');
    assertEquals(v.telephone('+33 6 12 34 56 78'), '+33612345678');
    assertEquals(v.telephone('12'), null);
    assertEquals(v.telephone('77 abc'), null);
    assertEquals(v.telephone('+0123456789'), null);
});

Deno.test('validation : rôle, uuid, jeton, mot de passe, langue', () => {
    assertEquals(v.role('parent'), 'parent');
    assertEquals(v.role('apprenant'), null);
    assertEquals(v.uuid('00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001');
    assertEquals(v.uuid('1; drop table'), null);
    assertEquals(v.jeton('a'.repeat(43)), 'a'.repeat(43));
    assertEquals(v.jeton('a'.repeat(42)), null);
    assertEquals(v.jeton('a'.repeat(42) + '/'), null);
    assertEquals(v.motDePasse('daara2026'), 'daara2026');
    assertEquals(v.motDePasse('12345678'), null);
    assertEquals(v.motDePasse('motdepasse'), null);
    assertEquals(v.motDePasse('éééééé12'), null);
    assertEquals(v.motDePasse('a1' + 'é'.repeat(36)), null);
    assertEquals(v.motDePasse('dàara2026'), 'dàara2026');
    assertEquals(v.motDePasse('a1' + 'x'.repeat(80)), null);
    assertEquals(v.langue('en'), 'en');
    assertEquals(v.langue('wo'), 'fr');
});

Deno.test('validation : nom facultatif, caractères bidirectionnels refusés', () => {
    assertEquals(v.nomFacultatif(undefined), null);
    assertEquals(v.nomFacultatif('  Awa '), 'Awa');
    assertEquals(v.nomFacultatif('Awa' + String.fromCharCode(0x202e) + 'xx'), undefined);
    assertEquals(v.nomFacultatif('a'.repeat(101)), undefined);
    assertEquals(v.nomFacultatif(12), undefined);
});

Deno.test('masquage : e-mail et téléphone reconnaissables sans être lisibles', () => {
    assertEquals(masquerEmail('awa.ndiaye@gmail.com'), 'a***@g***.com');
    assertEquals(masquerTelephone('+221771234534'), '+221 77 *** ** 34');
    assertEquals(masquerTelephone('+33612345678'), '+33 *** 78');
});

Deno.test('http : CORS limité aux origines de l’application', () => {
    const autorisees = originesAutorisees(envDe({ ORIGINES_AUTORISEES: 'https://daara.app/, http://localhost:4200' }));
    assertEquals(autorisees, ['https://daara.app', 'http://localhost:4200']);
    assertEquals(entetesCors('https://daara.app', autorisees)['Access-Control-Allow-Origin'], 'https://daara.app');
    assertEquals(entetesCors('https://pirate.example', autorisees)['Access-Control-Allow-Origin'], undefined);
    assertEquals(originesAutorisees(envDe({ APP_URL: 'https://daara.app' })), ['https://daara.app']);
});

Deno.test('http : erreurs des RPC traduites en { code } sans détail', () => {
    assertEquals(erreurRpc({ code: '42501', message: 'admin_aal2_requis' }), { status: 403, corps: { code: 'admin_aal2_requis' } });
    assertEquals(erreurRpc({ code: '22023', message: 'invitation_expiree' }).status, 410);
    assertEquals(erreurRpc({ code: '23505', message: 'deja_membre' }).status, 409);
    assertEquals(erreurRpc({ code: 'P0001', message: 'quota_invitations' }).status, 429);
    assertEquals(erreurRpc({ code: '23514', message: 'nouvelle ligne : détail' }).corps, { code: 'donnee_invalide' });
    assertEquals(erreurRpc({ code: '42501', message: 'Message avec détail interne' }).corps, { code: 'inattendue' });
    assertEquals(erreurRpc({ code: 'XX000' }).status, 500);
});

Deno.test('http : servir gère OPTIONS, méthode, JSON invalide et erreur inattendue', async () => {
    const gestionnaire = servir(() => Promise.reject(new Error('boum avec donnée personnelle')), envDe({ APP_URL: 'http://localhost:4200' }));
    const options = await gestionnaire(new Request('http://f', { method: 'OPTIONS', headers: { Origin: 'http://localhost:4200' } }));
    assertEquals(options.status, 204);
    assertEquals(options.headers.get('Access-Control-Allow-Origin'), 'http://localhost:4200');
    assertEquals((await gestionnaire(new Request('http://f', { method: 'GET' }))).status, 405);
    assertEquals((await gestionnaire(new Request('http://f', { method: 'POST', body: '{pas json' }))).status, 400);
    const r = await gestionnaire(new Request('http://f', { method: 'POST', body: '{}' }));
    assertEquals(r.status, 500);
    assertEquals(await r.json(), { code: 'inattendue' });
});

Deno.test('modèles : nom de daara échappé, sans nom de l’invité, lien et avertissement présents', () => {
    const d = { daara: 'Daara <script>alert(1)</script>', role: 'parent' as const, lien: 'https://daara.app/invitation#abc', langue: 'fr' as const };
    const c = courrielInvitation('awa@test.sn', d);
    assertFalse(c.html.includes('<script>'));
    assertStringIncludes(c.html, '&lt;script&gt;');
    assertStringIncludes(c.texte, 'https://daara.app/invitation#abc');
    assertStringIncludes(c.texte, 'ignorez ce message');
    assertStringIncludes(c.sujet, 'Daara <script>');
    assertStringIncludes(messageWhatsapp({ ...d, langue: 'en' }), 'invites you to join');
    assertEquals(echapperHtml(`"'&`), '&quot;&#39;&amp;');
});

Deno.test('e-mail : Brevo si clé, Mailpit en local, rien sinon ; jamais d’exception', async () => {
    const appels: string[] = [];
    const fetchFactice: Fetch = (url) => {
        appels.push(url);
        return Promise.resolve(new Response('{}', { status: 201 }));
    };
    const courriel = { a: 'awa@test.sn', sujet: 's', texte: 't', html: 'h' };
    assert(await envoyerCourriel(courriel, envDe({ BREVO_API_KEY: 'cle', MAILPIT_URL: 'http://mailpit:8025' }), fetchFactice));
    assert(await envoyerCourriel(courriel, envDe({ MAILPIT_URL: 'http://mailpit:8025/' }), fetchFactice));
    assertFalse(await envoyerCourriel(courriel, envDe({}), fetchFactice));
    assertEquals(appels, ['https://api.brevo.com/v3/smtp/email', 'http://mailpit:8025/api/v1/send']);
    const enPanne: Fetch = () => Promise.reject(new TypeError('réseau'));
    assertFalse(await envoyerCourriel(courriel, envDe({ BREVO_API_KEY: 'cle' }), enPanne));
});

Deno.test('Turnstile : jeton absent, refusé ou obtenu sur un autre site → faux', async () => {
    const reponse =
        (succes: boolean, hostname = 'daara.app'): Fetch =>
        () =>
            Promise.resolve(Response.json({ success: succes, hostname }));
    const env = envDe({ TURNSTILE_SECRET: 'secret', APP_URL: 'https://daara.app' });
    assert(await verifierTurnstile('jeton', env, null, reponse(true)));
    assertFalse(await verifierTurnstile('jeton', env, null, reponse(true, 'autre-site.example')));
    assertFalse(await verifierTurnstile('jeton', env, null, reponse(false)));
    assertFalse(await verifierTurnstile('', env, null, reponse(true)));
    assertFalse(await verifierTurnstile('jeton', envDe({}), null, reponse(true)));
});

Deno.test('Turnstile : clé secrète de test refusée hors du local', async () => {
    const oui: Fetch = () => Promise.resolve(Response.json({ success: true, hostname: 'example.com' }));
    const test = '1x0000000000000000000000000000000AA';
    assert(await verifierTurnstile('x', envDe({ TURNSTILE_SECRET: test, SUPABASE_URL: 'http://kong:8000' }), null, oui));
    assertFalse(await verifierTurnstile('x', envDe({ TURNSTILE_SECRET: test, SUPABASE_URL: 'https://abc.supabase.co' }), null, oui));
    assertFalse(estLocal('https://abc.supabase.co'));
    assert(estLocal('http://127.0.0.1:54321'));
});

Deno.test('codeAcces : normalisé, alphabet sans symbole ambigu', () => {
    assertEquals(v.codeAcces(' abcd-efgh '), 'ABCDEFGH');
    assertEquals(v.codeAcces('ABCD EF23'), 'ABCDEF23');
    assertEquals(v.codeAcces('ABCD-EFG0'), null);
    assertEquals(v.codeAcces('ABCD-EFGI'), null);
    assertEquals(v.codeAcces('ABCD-EFG'), null);
    assertEquals(v.codeAcces(12345678), null);
});

Deno.test('courrielMotDePasseChange : fr / en, sans lien', () => {
    const fr = courrielMotDePasseChange('a@b.sn', 'fr');
    assertEquals([fr.a, fr.sujet], ['a@b.sn', 'Votre mot de passe DAARA a été changé']);
    assertFalse(fr.html.includes('href'));
    assertEquals(courrielMotDePasseChange('a@b.sn', 'en').sujet, 'Your DAARA password has been changed');
});
