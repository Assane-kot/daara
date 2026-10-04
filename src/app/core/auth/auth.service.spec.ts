import { TestBed } from '@angular/core/testing';
import { AuthError, Session } from '@supabase/supabase-js';
import { ClientFactice, clientFactice, sessionFactice } from '../../../testing/supabase-factice';
import { provideTranslateTesting } from '../../../testing/translate-testing';
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

        await expect(auth.connecter('awa@test.local', 'faux', 'jeton')).rejects.toBe(erreur);
        expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'awa@test.local',
            password: 'faux',
            options: { captchaToken: 'jeton' },
        });
    });

    it('confirme et réinitialise par code à 6 chiffres', async () => {
        const auth = creer(null);
        await auth.confirmerEmail('awa@test.local', '123456');
        await auth.verifierCodeReinitialisation('awa@test.local', '654321');

        expect(client.auth.verifyOtp).toHaveBeenNthCalledWith(1, { email: 'awa@test.local', token: '123456', type: 'email' });
        expect(client.auth.verifyOtp).toHaveBeenNthCalledWith(2, { email: 'awa@test.local', token: '654321', type: 'recovery' });
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

        it("enseignant en aal1 : espace de l'application", async () => {
            const auth = creer();
            client.roles = ['enseignant'];
            expect(await auth.destination()).toBe(ROUTES_AUTH.espace);
        });

        it('admin en aal2 : espace, rôles lus une seule fois', async () => {
            const auth = creer();
            client.roles = ['admin'];
            client.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null });

            expect(await auth.destination()).toBe(ROUTES_AUTH.espace);
            expect(await auth.destination()).toBe(ROUTES_AUTH.espace);
            expect(client.from).toHaveBeenCalledTimes(1);

            auth.invaliderRoles();
            await auth.destination();
            expect(client.from).toHaveBeenCalledTimes(2);
        });
    });
});
