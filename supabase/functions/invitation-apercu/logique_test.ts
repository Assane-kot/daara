import { assertEquals } from 'jsr:@std/assert@1.0.19';
import { type Apercu, apercevoir } from './logique.ts';

const JETON = 'a'.repeat(43);
const lire = (apercu: Apercu | null) => ({ lireInvitation: () => Promise.resolve(apercu) });

Deno.test('invitation-apercu : contact masqué, jamais en clair ni l’existence d’un compte', async () => {
    const r = await apercevoir(
        { jeton: JETON },
        lire({ daara_nom: 'Daara Touba', role: 'parent', email: null, telephone: '+221771234534', langue: 'fr', etat: 'valide' }),
    );
    assertEquals(r.status, 200);
    assertEquals(r.corps, { daara: 'Daara Touba', role: 'parent', type: 'telephone', contact: '+221 77 *** ** 34', langue: 'fr', etat: 'valide' });
    assertEquals('compte_existant' in r.corps, false);

    const e = await apercevoir(
        { jeton: JETON },
        lire({ daara_nom: 'D', role: 'enseignant', email: 'awa.ndiaye@gmail.com', telephone: null, langue: 'en', etat: 'expiree' }),
    );
    assertEquals([e.corps.type, e.corps.contact, e.corps.etat], ['email', 'a***@g***.com', 'expiree']);
});

Deno.test('invitation-apercu : jeton mal formé ou inconnu', async () => {
    assertEquals((await apercevoir({ jeton: 'court' }, lire(null))).status, 400);
    assertEquals((await apercevoir({}, lire(null))).corps.code, 'jeton_invalide');
    const inconnu = await apercevoir({ jeton: JETON }, lire(null));
    assertEquals([inconnu.status, inconnu.corps.code], [404, 'jeton_invalide']);
});
