import { TestBed } from '@angular/core/testing';
import { AuthError, Session } from '@supabase/supabase-js';
import { ClientFactice, clientFactice, sessionFactice } from '../../../testing/supabase-factice';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { CurrentDaaraService } from '../daara/current-daara.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService, ROUTES_AUTH } from './auth.service';

describe('AuthService', () => {
    let client: ClientFactice;

    function creer(session: Session | null = sessionFactice()): AuthService {
        client = clientFactice(session);
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [provideTranslateTesting(), { provide: SupabaseService, useValue: { client } }],
        });
        return TestBed.inject(AuthService);
    }

    it('restaure la session et suit onAuthStateChange', async () => {
        const auth = creer(null);
        expect(await auth.sessionActuelle()).toBeNull();

        const rappel = client.auth.onAuthStateChange.mock.calls[0][0] as (e: string, s: unknown) => void;
        rappel('SIGNED_IN', sessionFactice('u-2', 'modou@test.local'));

        expect(auth.user()?.id).toBe('u-2');
        expect(auth.email()).toBe('modou@test.local');
    });

    it('déconnexion : daara ouverte et dernière daara oubliées (téléphone partagé)', async () => {
        const auth = creer();
        await auth.sessionActuelle();
        const courante = TestBed.inject(CurrentDaaraService);
        courante.definir({ id: 'd-1', slug: 'daara-touba', nom: 'Daara Touba', ville: null, logoPath: null, logoUrl: null, roles: ['parent'], modules: [] });
        expect(localStorage.getItem('daara.derniere')).toBe('daara-touba');

        const rappel = client.auth.onAuthStateChange.mock.calls[0][0] as (e: string, s: unknown) => void;
        rappel('SIGNED_OUT', null);

        expect(courante.daara()).toBeNull();
        expect(localStorage.getItem('daara.derniere')).toBeNull();
    });

    it("inscrit avec la langue de l'interface et le jeton Turnstile, et retient l'e-mail", async () => {
        const auth = creer(null);
        await auth.inscrire({ prenom: 'Awa', nom: 'Diop', email: 'awa@test.local', motDePasse: 'daara2026', captcha: 'jeton' });

        expect(client.auth.signUp).toHaveBeenCalledWith({
            email: 'awa@test.local',
            password: 'daara2026',
            options: { data: { prenom: 'Awa', nom: 'Diop', langue: 'fr' }, captchaToken: 'jeton' },
        });
        expect(auth.emailEnAttente()).toBe('awa@test.local');
    });

    it("adresse déjà inscrite : même parcours qu'une adresse libre (pas d'énumération)", async () => {
        const auth = creer(null);
        client.auth.signUp.mockResolvedValue({ error: new AuthError('User already registered', 422, 'user_already_exists') });

        await expect(auth.inscrire({ prenom: 'Awa', nom: 'Diop', email: 'awa@test.local', motDePasse: 'daara2026', captcha: 'j' })).resolves.toBeUndefined();
        expect(auth.emailEnAttente()).toBe('awa@test.local');
    });

    it("lève les autres erreurs d'inscription", async () => {
        const auth = creer(null);
        const erreur = new AuthError('captcha', 400, 'captcha_failed');
        client.auth.signUp.mockResolvedValue({ error: erreur });

        await expect(auth.inscrire({ prenom: 'Awa', nom: 'Diop', email: 'awa@test.local', motDePasse: 'daara2026', captcha: 'j' })).rejects.toBe(erreur);
        expect(auth.emailEnAttente()).toBe('');
    });

    it('renvoie le code de confirmation avec le jeton Turnstile', async () => {
        const auth = creer(null);
        await auth.renvoyerCodeConfirmation('awa@test.local', 'jeton');

        expect(client.auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'awa@test.local', options: { captchaToken: 'jeton' } });
    });

    it("lève l'erreur Supabase à la connexion", async () => {
        const auth = creer(null);
        const erreur = new AuthError('Invalid login credentials', 400, 'invalid_credentials');
        client.auth.signInWithPassword.mockResolvedValue({ error: erreur });

        await expect(auth.connecter({ email: 'awa@test.local' }, 'faux', 'jeton')).rejects.toBe(erreur);
        expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'awa@test.local',
            password: 'faux',
            options: { captchaToken: 'jeton' },
        });
    });

    it('se connecte par téléphone (ADR-009)', async () => {
        const auth = creer(null);
        client.auth.signInWithPassword.mockResolvedValue({ error: null });
        await auth.connecter({ telephone: '+221771234567' }, 'daara2026', 'jeton');
        expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ phone: '+221771234567', password: 'daara2026', options: { captchaToken: 'jeton' } });
    });

    it('une invitation en attente passe avant la daara (retour après inscription)', async () => {
        const auth = creer(sessionFactice());
        client.roles = ['parent'];
        sessionStorage.setItem('daara.invitation', 'J'.repeat(43));
        try {
            expect(await auth.destination()).toBe('/invitation');
        } finally {
            sessionStorage.removeItem('daara.invitation');
        }
    });

    it('confirme et réinitialise par code à 6 chiffres', async () => {
        const auth = creer(null);
        await auth.confirmerEmail('awa@test.local', '123456');
        await auth.verifierCodeReinitialisation('awa@test.local', '654321');

        expect(client.auth.verifyOtp).toHaveBeenNthCalledWith(1, { email: 'awa@test.local', token: '123456', type: 'email' });
        expect(client.auth.verifyOtp).toHaveBeenNthCalledWith(2, { email: 'awa@test.local', token: '654321', type: 'recovery' });
    });

    it('connexion avec un second appareil : chaque facteur vérifié est essayé, seulement si le code est refusé', async () => {
        const auth = creer();
        client.auth.mfa.listFactors.mockResolvedValue({
            data: {
                all: [
                    { id: 'f1', factor_type: 'totp', status: 'verified' },
                    { id: 'f2', factor_type: 'totp', status: 'verified' },
                ],
            },
            error: null,
        });
        client.auth.mfa.challengeAndVerify
            .mockResolvedValueOnce({ error: new AuthError('x', 422, 'mfa_verification_failed') })
            .mockResolvedValueOnce({ error: null });
        await auth.verifierTotp('f1', '123456');
        expect(client.auth.mfa.challengeAndVerify).toHaveBeenNthCalledWith(2, { factorId: 'f2', code: '123456' });

        client.auth.mfa.challengeAndVerify.mockClear();
        client.auth.mfa.challengeAndVerify.mockResolvedValueOnce({ error: new AuthError('x', 429, 'over_request_rate_limit') });
        await expect(auth.verifierTotp('f1', '123456')).rejects.toBeInstanceOf(AuthError);
        expect(client.auth.mfa.challengeAndVerify).toHaveBeenCalledTimes(1);
    });

    it("supprime les enrôlements abandonnés avant d'en démarrer un nouveau", async () => {
        const auth = creer();
        client.auth.mfa.listFactors.mockResolvedValue({
            data: {
                all: [
                    { id: 'ancien', factor_type: 'totp', status: 'unverified' },
                    { id: 'garde', factor_type: 'totp', status: 'verified' },
                ],
            },
            error: null,
        });

        const enrolement = await auth.demarrerEnrolement();

        expect(client.auth.mfa.unenroll).toHaveBeenCalledTimes(1);
        expect(client.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'ancien' });
        expect(enrolement).toEqual({ factorId: 'f-1', qrCode: 'data:image/svg+xml;utf-8,<svg/>', secret: 'ABC' });
    });

    it('attend la session restaurée avant de lire les rôles (guards lancés en parallèle au chargement)', async () => {
        const auth = creer();
        client.roles = ['parent'];

        // Appel immédiat, avant la fin de getSession() : ne doit pas répondre « aucune daara ».
        expect(await auth.rolesActifs()).toEqual(['parent']);
    });

    describe('destination', () => {
        it('sans session : connexion', async () => {
            expect(await creer(null).destination()).toBe(ROUTES_AUTH.connexion);
        });

        it('facteur vérifié en aal1 : code TOTP', async () => {
            const auth = creer();
            client.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null });
            expect(await auth.destination()).toBe(ROUTES_AUTH.mfa);
        });

        it('admin sans facteur : enrôlement imposé', async () => {
            const auth = creer();
            client.roles = ['admin'];
            expect(await auth.destination()).toBe(ROUTES_AUTH.mfa);
        });

        it('aucune daara : onboarding', async () => {
            expect(await creer().destination()).toBe(ROUTES_AUTH.onboarding);
        });

        it('une seule daara : son espace', async () => {
            const auth = creer();
            client.roles = ['enseignant'];
            expect(await auth.destination()).toBe('/d/daara-test');
        });

        it('plusieurs daaras : la dernière utilisée si toujours membre, sinon le sélecteur', async () => {
            const auth = creer();
            client.daaras = [
                { id: 'd-1', slug: 'daara-touba', nom: 'Daara Touba', roles: ['parent'] },
                { id: 'd-2', slug: 'daara-thies', nom: 'Daara Thiès', roles: ['enseignant', 'parent'] },
            ];
            localStorage.removeItem('daara.derniere');
            expect(await auth.destination()).toBe(ROUTES_AUTH.selectionDaara);

            localStorage.setItem('daara.derniere', 'daara-thies');
            expect(await auth.destination()).toBe('/d/daara-thies');

            localStorage.setItem('daara.derniere', 'daara-quittee');
            expect(await auth.destination()).toBe(ROUTES_AUTH.selectionDaara);
        });

        it('regroupe les rôles par daara et trie par nom', async () => {
            const auth = creer();
            client.daaras = [
                { id: 'd-2', slug: 'b', nom: 'Daara B', roles: ['admin', 'enseignant'] },
                { id: 'd-1', slug: 'a', nom: 'Daara A', roles: ['parent'] },
            ];
            const daaras = await auth.mesDaaras();
            expect(daaras.map((d) => d.slug)).toEqual(['a', 'b']);
            expect(daaras[1].roles).toEqual(['admin', 'enseignant']);
            expect(await auth.rolesActifs()).toEqual(['parent', 'admin', 'enseignant']);
        });

        it('admin en aal2 : son espace, daaras lues une seule fois', async () => {
            const auth = creer();
            client.roles = ['admin'];
            client.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null });

            expect(await auth.destination()).toBe('/d/daara-test');
            expect(await auth.destination()).toBe('/d/daara-test');
            expect(client.from).toHaveBeenCalledTimes(1);

            auth.invaliderDaaras();
            await auth.destination();
            expect(client.from).toHaveBeenCalledTimes(2);
        });
    });
});
