import { Session } from '@supabase/supabase-js';
import { Mock } from 'vitest';

/** Client Supabase factice pour les tests unitaires : seules les méthodes utilisées sont simulées. */
export interface ClientFactice {
    auth: {
        getSession: Mock;
        onAuthStateChange: Mock;
        signUp: Mock;
        verifyOtp: Mock;
        resend: Mock;
        signInWithPassword: Mock;
        resetPasswordForEmail: Mock;
        updateUser: Mock;
        signOut: Mock;
        mfa: {
            getAuthenticatorAssuranceLevel: Mock;
            listFactors: Mock;
            unenroll: Mock;
            enroll: Mock;
            challengeAndVerify: Mock;
        };
    };
    from: Mock;
    rpc: Mock;
    /** Rôles dans une daara unique « Daara test » (raccourci) ; ignoré si `daaras` est renseigné. */
    roles: string[];
    /** Daaras accessibles, avec les rôles de l'utilisateur. */
    daaras: { id: string; slug: string; nom: string; roles: string[] }[];
}

export function sessionFactice(userId = 'u-1', email = 'awa@test.local'): Session {
    return { user: { id: userId, email } } as unknown as Session;
}

export function clientFactice(session: Session | null = null): ClientFactice {
    const client: ClientFactice = {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session } }),
            onAuthStateChange: vi.fn(),
            signUp: vi.fn().mockResolvedValue({ error: null }),
            verifyOtp: vi.fn().mockResolvedValue({ error: null }),
            resend: vi.fn().mockResolvedValue({ error: null }),
            signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
            resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
            updateUser: vi.fn().mockResolvedValue({ error: null }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
            mfa: {
                getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }),
                listFactors: vi.fn().mockResolvedValue({ data: { all: [] }, error: null }),
                unenroll: vi.fn().mockResolvedValue({ error: null }),
                enroll: vi.fn().mockResolvedValue({ data: { id: 'f-1', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'ABC' } }, error: null }),
                challengeAndVerify: vi.fn().mockResolvedValue({ error: null }),
            },
        },
        from: vi.fn(),
        rpc: vi.fn().mockResolvedValue({ data: 'slug', error: null }),
        roles: [],
        daaras: [],
    };
    // Requête `from('memberships').select('role, daaras!inner(…)').eq().eq()` : objet « thenable » qui renvoie les rôles configurés.
    const requete = {
        select: vi.fn(() => requete),
        eq: vi.fn(() => requete),
        then: (resoudre: (valeur: unknown) => unknown) => resoudre({ data: lignesMemberships(client), error: null }),
    };
    client.from.mockReturnValue(requete);
    return client;
}

/** Lignes renvoyées par la lecture des memberships avec la daara jointe. */
function lignesMemberships(client: ClientFactice): unknown[] {
    const daaras =
        client.daaras.length > 0 ? client.daaras : client.roles.length > 0 ? [{ id: 'd-1', slug: 'daara-test', nom: 'Daara test', roles: client.roles }] : [];
    return daaras.flatMap((d) => d.roles.map((role) => ({ role, daaras: { id: d.id, slug: d.slug, nom: d.nom, ville: null, logo_path: null } })));
}
