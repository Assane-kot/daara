import { assertEquals } from 'jsr:@std/assert@1.0.19';
import { accepter, type DepsAccept, type InvitationLue } from './logique.ts';

const JETON = 'b'.repeat(43);
const CORPS = { jeton: JETON, mot_de_passe: 'daara2026', captcha: 'ok', prenom: 'Fatou', langue: 'fr' };
const INVITATION: InvitationLue = { id: 'i-1', email: null, telephone: '+221771234567', etat: 'valide', compte_existant: false };

function deps(surcharge: Partial<DepsAccept> = {}) {
    const journal: string[] = [];
    const d: DepsAccept = {
        verifierCaptcha: (j) => Promise.resolve(j === 'ok'),
        lireInvitation: () => Promise.resolve(INVITATION),
        creerCompte: (p) => {
            journal.push(`creer:${p.telephone}:${p.invitationId}:${p.prenom}`);
            return Promise.resolve({ id: 'u-1' });
        },
        rattacher: (_jeton, userId) => {
            journal.push(`rattacher:${userId}`);
            return Promise.resolve({ data: 'daara-touba', error: null });
        },
        supprimerCompte: (userId) => {
            journal.push(`supprimer:${userId}`);
            return Promise.resolve(true);
        },
        ...surcharge,
    };
    return { d, journal };
}

Deno.test('accept-invitation : crée le compte téléphone et le rattache dans la foulée', async () => {
    const { d, journal } = deps();
    const r = await accepter(CORPS, d);
    assertEquals(r.status, 200);
    assertEquals(r.corps, { slug: 'daara-touba', telephone: '+221771234567' });
    assertEquals(journal, ['creer:+221771234567:i-1:Fatou', 'rattacher:u-1']);
});

Deno.test('accept-invitation : rattachement refusé → compte supprimé (jamais de compte orphelin)', async () => {
    const { d, journal } = deps({ rattacher: () => Promise.resolve({ data: null, error: { code: '22023', message: 'invitation_utilisee' } }) });
    const r = await accepter(CORPS, d);
    assertEquals([r.status, r.corps.code], [410, 'invitation_utilisee']);
    assertEquals(journal, ['creer:+221771234567:i-1:Fatou', 'supprimer:u-1']);
});

Deno.test('accept-invitation : Turnstile, jeton, mot de passe vérifiés avant tout', async () => {
    const { d, journal } = deps();
    assertEquals((await accepter({ ...CORPS, captcha: 'faux' }, d)).corps.code, 'captcha');
    assertEquals((await accepter({ ...CORPS, jeton: 'court' }, d)).corps.code, 'jeton_invalide');
    assertEquals((await accepter({ ...CORPS, mot_de_passe: '12345678' }, d)).corps.code, 'mot_de_passe_faible');
    assertEquals((await accepter({ ...CORPS, nom: 'x'.repeat(101) }, d)).corps.code, 'donnee_invalide');
    assertEquals(journal.length, 0);
});

Deno.test('accept-invitation : seulement une invitation téléphone valide, sans compte existant', async () => {
    const cas: [Partial<InvitationLue> | null, number, string][] = [
        [null, 404, 'jeton_invalide'],
        [{ etat: 'expiree' }, 410, 'invitation_expiree'],
        [{ etat: 'revoquee' }, 410, 'invitation_revoquee'],
        [{ email: 'a@b.sn', telephone: null }, 400, 'invitation_email'],
        [{ compte_existant: true }, 409, 'compte_existant'],
    ];
    for (const [modif, status, code] of cas) {
        const { d, journal } = deps({ lireInvitation: () => Promise.resolve(modif ? { ...INVITATION, ...modif } : null) });
        const r = await accepter(CORPS, d);
        assertEquals([r.status, r.corps.code], [status, code]);
        assertEquals(journal.length, 0);
    }
});

Deno.test('accept-invitation : numéro pris entre-temps → « compte existant »', async () => {
    const { d, journal } = deps({ creerCompte: () => Promise.resolve({ erreur: 'phone_exists' }) });
    const r = await accepter(CORPS, d);
    assertEquals([r.status, r.corps.code], [409, 'compte_existant']);
    assertEquals(journal.length, 0);
});

Deno.test('accept-invitation : erreur inconnue après rattachement réussi (réponse perdue) → compte conservé', async () => {
    let lectures = 0;
    const { d, journal } = deps({
        lireInvitation: () => Promise.resolve({ ...INVITATION, etat: lectures++ === 0 ? 'valide' : 'utilisee' }),
        rattacher: () => Promise.resolve({ data: null, error: { message: 'FetchError' } }),
    });
    const r = await accepter(CORPS, d);
    assertEquals(r.status, 500);
    assertEquals(journal, ['creer:+221771234567:i-1:Fatou']);
});

Deno.test('accept-invitation : erreur inconnue, invitation toujours valide → compte supprimé', async () => {
    const { d, journal } = deps({ rattacher: () => Promise.resolve({ data: null, error: { message: 'FetchError' } }) });
    const r = await accepter(CORPS, d);
    assertEquals(r.status, 500);
    assertEquals(journal, ['creer:+221771234567:i-1:Fatou', 'supprimer:u-1']);
});

Deno.test('accept-invitation : échec de la suppression → erreur rendue quand même', async () => {
    const { d } = deps({
        rattacher: () => Promise.resolve({ data: null, error: { code: '42501', message: 'contact_different' } }),
        supprimerCompte: () => Promise.resolve(false),
    });
    const r = await accepter(CORPS, d);
    assertEquals([r.status, r.corps.code], [403, 'contact_different']);
});
