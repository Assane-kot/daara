/**
 * Jeton d'invitation gardé pendant l'inscription ou la connexion (LLD §7.1) : `/invitation` le lit dans le fragment,
 * le range ici puis efface le fragment de l'adresse. Stockage de session (onglet courant, effacé à la fermeture) ;
 * oublié à l'acceptation et à la déconnexion (téléphone partagé).
 */
const CLE = 'daara.invitation';

export function memoriserInvitation(jeton: string): void {
    try {
        globalThis.sessionStorage?.setItem(CLE, jeton);
    } catch {
        // Stockage indisponible : le lien devra être rouvert après l'inscription.
    }
}

export function lireInvitation(): string | null {
    try {
        return globalThis.sessionStorage?.getItem(CLE) ?? null;
    } catch {
        return null;
    }
}

export function oublierInvitation(): void {
    try {
        globalThis.sessionStorage?.removeItem(CLE);
    } catch {
        // Rien à effacer.
    }
}
