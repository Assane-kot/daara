// accept-invitation (LLD §6, ADR-009, décision I3) : public, protégé par Turnstile. Pour une invitation PAR TÉLÉPHONE
// dont le numéro n'a pas encore de compte : crée le compte (API d'administration, téléphone confirmé, marqueur de
// l'invitation) puis le rattache à la daara dans la foulée (`accepter_invitation_nouveau_compte`). En cas d'échec certain
// du rattachement, le compte est supprimé : jamais de compte orphelin (un échec de suppression est journalisé ; le compte
// garde son marqueur et son titulaire peut se connecter puis accepter). Le front connecte ensuite l'invité.

import { erreur, erreurRpc, ok, type Reponse } from '../_shared/http.ts';
import * as v from '../_shared/validation.ts';

export interface InvitationLue {
    readonly id: string;
    readonly email: string | null;
    readonly telephone: string | null;
    readonly etat: string;
    readonly compte_existant: boolean;
}

export interface ErreurSupabase {
    readonly code?: string;
    readonly message?: string;
}

export interface DepsAccept {
    verifierCaptcha(jeton: unknown): Promise<boolean>;
    lireInvitation(jeton: string): Promise<InvitationLue | null>;
    /** `auth.admin.createUser` : renvoie l'identifiant ou le code d'erreur d'Auth. */
    creerCompte(params: {
        telephone: string;
        motDePasse: string;
        invitationId: string;
        nom: string | null;
        prenom: string | null;
        langue: v.Langue;
    }): Promise<{ id: string } | { erreur: string }>;
    rattacher(jeton: string, userId: string): Promise<{ data: string | null; error: ErreurSupabase | null }>;
    /** Renvoie vrai si le compte a été supprimé. */
    supprimerCompte(userId: string): Promise<boolean>;
}

/** Refus métier certains de la RPC : le compte n'a pas été rattaché, on peut le supprimer sans risque. */
const REFUS_CERTAINS = new Set(['22023', '42501', '23505', '23514', 'P0001']);

export async function accepter(corps: unknown, deps: DepsAccept): Promise<Reponse> {
    const c = v.objet(corps);
    if (!(await deps.verifierCaptcha(c?.captcha))) {
        return erreur(400, 'captcha');
    }
    const jeton = v.jeton(c?.jeton);
    if (!jeton) {
        return erreur(400, 'jeton_invalide');
    }
    const motDePasse = v.motDePasse(c?.mot_de_passe);
    const nom = v.nomFacultatif(c?.nom);
    const prenom = v.nomFacultatif(c?.prenom);
    if (!motDePasse) {
        return erreur(400, 'mot_de_passe_faible');
    }
    if (nom === undefined || prenom === undefined) {
        return erreur(400, 'donnee_invalide');
    }

    const invitation = await deps.lireInvitation(jeton);
    if (!invitation) {
        return erreur(404, 'jeton_invalide');
    }
    if (invitation.etat !== 'valide') {
        return erreur(410, `invitation_${invitation.etat}`);
    }
    if (!invitation.telephone) {
        // Invitation par e-mail : inscription habituelle (code e-mail) puis `accepter_invitation`.
        return erreur(400, 'invitation_email');
    }
    if (invitation.compte_existant) {
        return erreur(409, 'compte_existant');
    }

    const compte = await deps.creerCompte({
        telephone: invitation.telephone,
        motDePasse,
        invitationId: invitation.id,
        nom,
        prenom,
        langue: v.langue(c?.langue),
    });
    if ('erreur' in compte) {
        return compte.erreur === 'phone_exists' ? erreur(409, 'compte_existant') : erreur(500, 'inattendue');
    }

    const { data: slug, error } = await deps.rattacher(jeton, compte.id);
    if (!error && slug) {
        return ok({ slug, telephone: invitation.telephone });
    }
    // Ne jamais supprimer un compte peut-être rattaché (réponse perdue, délai dépassé) : sur une erreur qui n'est pas un
    // refus certain, on relit l'invitation ; utilisée = le rattachement a eu lieu, l'invité peut se connecter.
    const refusCertain = !!error?.code && REFUS_CERTAINS.has(error.code);
    if (!refusCertain && (await deps.lireInvitation(jeton))?.etat === 'utilisee') {
        return erreur(500, 'inattendue');
    }
    if (!(await deps.supprimerCompte(compte.id))) {
        console.error('suppression_compte_echec');
    }
    return error ? erreurRpc(error) : erreur(500, 'inattendue');
}
