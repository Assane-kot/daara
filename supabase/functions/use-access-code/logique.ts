// use-access-code (LLD §6, ADR-006 niveau 2) : public, protégé par Turnstile. Le membre donne son identifiant, le code
// remis par l'admin et son nouveau mot de passe ; `consommer_code_acces` vérifie le code (5 essais, usage unique) et le
// mot de passe est changé par l'API d'administration, qui révoque les sessions. Toute erreur sur l'identifiant ou le code
// donne la même réponse (`code_invalide`) : pas d'oracle sur les comptes. E-mail de notification si le compte en a un.

import { erreur, ok, type Reponse } from '../_shared/http.ts';
import * as v from '../_shared/validation.ts';

export interface CompteCode {
    readonly user_id: string;
    readonly email: string | null;
    readonly langue: string;
}

export interface DepsCode {
    verifierCaptcha(jeton: unknown): Promise<boolean>;
    /** `consommer_code_acces` : le compte si le code est bon, null sinon ; lève sur une erreur technique. */
    consommer(identifiant: string, code: string): Promise<CompteCode | null>;
    /** `auth.admin.updateUserById` : vrai si le mot de passe a été changé. */
    changerMotDePasse(userId: string, motDePasse: string): Promise<boolean>;
    notifier(email: string, langue: v.Langue): Promise<boolean>;
}

export async function utiliserCode(corps: unknown, deps: DepsCode): Promise<Reponse> {
    const c = v.objet(corps);
    if (!(await deps.verifierCaptcha(c?.captcha))) {
        return erreur(400, 'captcha');
    }
    const motDePasse = v.motDePasse(c?.mot_de_passe);
    if (!motDePasse) {
        return erreur(400, 'mot_de_passe_faible');
    }
    const identifiant = v.email(c?.identifiant) ?? v.telephone(c?.identifiant);
    const code = v.codeAcces(c?.code);
    if (!identifiant || !code) {
        return erreur(400, 'code_invalide');
    }

    let compte: CompteCode | null;
    try {
        compte = await deps.consommer(identifiant, code);
    } catch {
        return erreur(500, 'inattendue');
    }
    if (!compte) {
        return erreur(400, 'code_invalide');
    }
    // Code consommé : si le changement échoue, le membre demande un nouveau code à son admin (cas rare).
    if (!(await deps.changerMotDePasse(compte.user_id, motDePasse))) {
        console.error('changement_mot_de_passe_echec');
        return erreur(500, 'inattendue');
    }
    if (compte.email && !(await deps.notifier(compte.email, v.langue(compte.langue)))) {
        console.error('notification_echec');
    }
    return ok({});
}
