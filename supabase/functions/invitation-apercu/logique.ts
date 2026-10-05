// invitation-apercu (LLD §6) : public. À partir du jeton, renvoie de quoi présenter l'invitation : nom de la daara,
// rôle, type et contact masqué, langue, état. Jamais le contact en clair ni l'existence d'un compte (audit S2.5a, I3).

import { erreur, ok, type Reponse } from '../_shared/http.ts';
import { masquerEmail, masquerTelephone } from '../_shared/masquage.ts';
import * as v from '../_shared/validation.ts';

export interface Apercu {
    readonly daara_nom: string;
    readonly role: string;
    readonly email: string | null;
    readonly telephone: string | null;
    readonly langue: string;
    readonly etat: string;
}

export interface DepsApercu {
    /** Fonction interne `invitation_par_jeton` (service_role). */
    lireInvitation(jeton: string): Promise<Apercu | null>;
}

export async function apercevoir(corps: unknown, deps: DepsApercu): Promise<Reponse> {
    const jeton = v.jeton(v.objet(corps)?.jeton);
    if (!jeton) {
        return erreur(400, 'jeton_invalide');
    }
    const invitation = await deps.lireInvitation(jeton);
    if (!invitation) {
        return erreur(404, 'jeton_invalide');
    }
    return ok({
        daara: invitation.daara_nom,
        role: invitation.role,
        type: invitation.email ? 'email' : 'telephone',
        contact: invitation.email ? masquerEmail(invitation.email) : masquerTelephone(invitation.telephone ?? ''),
        langue: invitation.langue,
        etat: invitation.etat,
    });
}
