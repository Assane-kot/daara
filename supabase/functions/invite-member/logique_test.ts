import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1.0.19';
import type { Courriel } from '../_shared/email.ts';
import { type DepsInvite, inviter } from './logique.ts';

const DAARA = '00000000-0000-0000-0000-00000000000d';
const JETON = 'J'.repeat(43);

function deps(surcharge: Partial<DepsInvite> = {}) {
    const envois: Courriel[] = [];
    const appels: Record<string, unknown>[] = [];
    const d: DepsInvite = {
        creerInvitation: (params) => {
            appels.push(params);
            return Promise.resolve({ data: [{ id: 'i-1', jeton: JETON }], error: null });
        },
        nomDaara: () => Promise.resolve('Daara Touba'),
        envoyer: (c) => {
            envois.push(c);
            return Promise.resolve(true);
        },
        appUrl: 'https://daara.app',
        ...surcharge,
    };
    return { d, envois, appels };
}

Deno.test('invite-member : invitation par e-mail → lien dans le fragment, e-mail envoyé', async () => {
    const { d, envois, appels } = deps();
    const r = await inviter({ daara_id: DAARA, role: 'enseignant', email: ' Awa@Test.SN ', langue: 'en' }, d);
    assertEquals(r.status, 200);
    assertEquals(r.corps.lien, `https://daara.app/invitation#${JETON}`);
    assertEquals(r.corps.email_envoye, true);
    assertEquals(appels[0], { p_daara: DAARA, p_role: 'enseignant', p_email: 'awa@test.sn', p_telephone: null, p_nom: null, p_prenom: null, p_langue: 'en' });
    assertEquals(envois[0].a, 'awa@test.sn');
    assertStringIncludes(envois[0].sujet, 'Daara Touba');
});

Deno.test('invite-member : invitation par téléphone → numéro normalisé, pas d’e-mail, message WhatsApp', async () => {
    const { d, envois, appels } = deps();
    const r = await inviter({ daara_id: DAARA, role: 'parent', telephone: '77 123 45 67', prenom: 'Fatou' }, d);
    assertEquals(r.status, 200);
    assertEquals(appels[0].p_telephone, '+221771234567');
    assertEquals(appels[0].p_prenom, 'Fatou');
    assertEquals(envois.length, 0);
    assertEquals(r.corps.email_envoye, false);
    assertEquals(r.corps.telephone, '+221771234567');
    assertStringIncludes(r.corps.message_whatsapp as string, JETON);
});

Deno.test('invite-member : entrées invalides refusées avant la base', async () => {
    const { d, appels } = deps();
    const cas: unknown[] = [
        null,
        { daara_id: 'x', role: 'parent', email: 'a@b.sn' },
        { daara_id: DAARA, role: 'apprenant', email: 'a@b.sn' },
        { daara_id: DAARA, role: 'parent', email: 'pas-un-email' },
        { daara_id: DAARA, role: 'parent', telephone: '12' },
        { daara_id: DAARA, role: 'parent' },
        { daara_id: DAARA, role: 'parent', email: 'a@b.sn', nom: 'x'.repeat(101) },
    ];
    for (const corps of cas) {
        assertEquals((await inviter(corps, d)).corps.code, 'donnee_invalide');
    }
    assertEquals((await inviter({ daara_id: DAARA, role: 'parent', email: 'a@b.sn', telephone: '771234567' }, d)).corps.code, 'contact_invalide');
    assertEquals(appels.length, 0);
});

Deno.test('invite-member : erreurs de la RPC traduites (droits, quota, déjà membre)', async () => {
    const corps = { daara_id: DAARA, role: 'parent', email: 'a@b.sn' };
    for (const [code, message, status] of [
        ['42501', 'admin_aal2_requis', 403],
        ['P0001', 'quota_global_email', 429],
        ['23505', 'deja_membre', 409],
    ] as const) {
        const { d, envois } = deps({ creerInvitation: () => Promise.resolve({ data: null, error: { code, message } }) });
        const r = await inviter(corps, d);
        assertEquals([r.status, r.corps.code], [status, message]);
        assertEquals(envois.length, 0);
    }
});

Deno.test('invite-member : e-mail en échec → lien quand même rendu à l’admin', async () => {
    const { d } = deps({ envoyer: () => Promise.resolve(false) });
    const r = await inviter({ daara_id: DAARA, role: 'parent', email: 'a@b.sn' }, d);
    assertEquals(r.status, 200);
    assertEquals(r.corps.email_envoye, false);
    assertEquals(r.corps.lien, `https://daara.app/invitation#${JETON}`);
});
