import { assertEquals } from 'jsr:@std/assert@1.0.19';
import { type CompteCode, type DepsCode, utiliserCode } from './logique.ts';

const CORPS = { identifiant: '77 000 99 11', code: 'abcd-efgh', mot_de_passe: 'daara2026', captcha: 'ok' };
const COMPTE: CompteCode = { user_id: 'u-1', email: null, langue: 'fr' };

function deps(surcharge: Partial<DepsCode> = {}) {
    const journal: string[] = [];
    const d: DepsCode = {
        verifierCaptcha: (j) => Promise.resolve(j === 'ok'),
        consommer: (identifiant, code) => {
            journal.push(`consommer:${identifiant}:${code}`);
            return Promise.resolve(COMPTE);
        },
        changerMotDePasse: (userId) => {
            journal.push(`mdp:${userId}`);
            return Promise.resolve(true);
        },
        notifier: (email, langue) => {
            journal.push(`notifier:${email}:${langue}`);
            return Promise.resolve(true);
        },
        ...surcharge,
    };
    return { d, journal };
}

Deno.test('use-access-code : code bon → mot de passe changé (identifiant et code normalisés)', async () => {
    const { d, journal } = deps();
    const r = await utiliserCode(CORPS, d);
    assertEquals(r.status, 200);
    assertEquals(journal, ['consommer:+221770009911:ABCDEFGH', 'mdp:u-1']);
});

Deno.test('use-access-code : e-mail de notification si le compte a une adresse', async () => {
    const { d, journal } = deps({ consommer: () => Promise.resolve({ user_id: 'u-2', email: 'a@b.sn', langue: 'en' }) });
    const r = await utiliserCode({ ...CORPS, identifiant: ' A@B.sn ' }, d);
    assertEquals(r.status, 200);
    assertEquals(journal, ['mdp:u-2', 'notifier:a@b.sn:en']);
});

Deno.test('use-access-code : Turnstile et mot de passe vérifiés avant de consommer le code', async () => {
    const { d, journal } = deps();
    assertEquals((await utiliserCode({ ...CORPS, captcha: 'faux' }, d)).corps.code, 'captcha');
    assertEquals((await utiliserCode({ ...CORPS, mot_de_passe: '12345678' }, d)).corps.code, 'mot_de_passe_faible');
    assertEquals((await utiliserCode(null, d)).corps.code, 'captcha');
    assertEquals(journal.length, 0);
});

Deno.test('use-access-code : réponse neutre (identifiant, code mal formé, code refusé)', async () => {
    const { d, journal } = deps({ consommer: () => Promise.resolve(null) });
    for (const corps of [{ ...CORPS, identifiant: 'pas un identifiant' }, { ...CORPS, code: 'OOOO-1111' }, { ...CORPS, code: 123 }, CORPS]) {
        const r = await utiliserCode(corps, d);
        assertEquals([r.status, r.corps], [400, { code: 'code_invalide' }]);
    }
    assertEquals(journal.length, 0);
});

Deno.test('use-access-code : erreurs techniques → inattendue, sans notification', async () => {
    const { d: d1 } = deps({ consommer: () => Promise.reject(new Error('rpc')) });
    assertEquals((await utiliserCode(CORPS, d1)).corps.code, 'inattendue');
    const { d: d2, journal } = deps({
        consommer: () => Promise.resolve({ ...COMPTE, email: 'a@b.sn' }),
        changerMotDePasse: () => Promise.resolve(false),
    });
    assertEquals((await utiliserCode(CORPS, d2)).status, 500);
    assertEquals(
        journal.filter((l) => l.startsWith('notifier')),
        [],
    );
});
