// invite-member (LLD §6, §7.1) : l'admin invite un membre. La RPC `creer_invitation` (JWT de l'admin) vérifie les
// droits (aal2), les quotas et tire le jeton ; la fonction construit le lien, envoie l'e-mail s'il y a une adresse et
// renvoie le lien à l'admin (copier, WhatsApp), toujours.

import type { Courriel } from '../_shared/email.ts';
import { erreur, erreurRpc, ok, type Reponse } from '../_shared/http.ts';
import { courrielInvitation, messageWhatsapp } from '../_shared/modeles.ts';
import * as v from '../_shared/validation.ts';

export interface ErreurSupabase {
    readonly code?: string;
    readonly message?: string;
}

export interface DepsInvite {
    /** RPC `creer_invitation` appelée avec le JWT de l'admin. */
    creerInvitation(params: Record<string, unknown>): Promise<{ data: { id: string; jeton: string }[] | null; error: ErreurSupabase | null }>;
    /** Nom de la daara (lu avec le JWT de l'admin : RLS). */
    nomDaara(daaraId: string): Promise<string | null>;
    envoyer(courriel: Courriel): Promise<boolean>;
    /** URL publique de l'application, sans « / » final. */
    readonly appUrl: string;
}

export async function inviter(corps: unknown, deps: DepsInvite): Promise<Reponse> {
    const c = v.objet(corps);
    const daaraId = v.uuid(c?.daara_id);
    const role = v.role(c?.role);
    const langue = v.langue(c?.langue);
    const email = c?.email ? v.email(c.email) : null;
    const telephone = c?.telephone ? v.telephone(c.telephone) : null;
    const nom = v.nomFacultatif(c?.nom);
    const prenom = v.nomFacultatif(c?.prenom);
    const contactFourni = Boolean(c?.email) || Boolean(c?.telephone);
    if (!daaraId || !role || nom === undefined || prenom === undefined || !contactFourni || (c?.email && !email) || (c?.telephone && !telephone)) {
        return erreur(400, 'donnee_invalide');
    }
    if ((email === null) === (telephone === null)) {
        return erreur(400, 'contact_invalide');
    }

    const { data, error } = await deps.creerInvitation({
        p_daara: daaraId,
        p_role: role,
        p_email: email,
        p_telephone: telephone,
        p_nom: nom,
        p_prenom: prenom,
        p_langue: langue,
    });
    if (error || !data?.[0]) {
        return error ? erreurRpc(error) : erreur(500, 'inattendue');
    }
    const { id, jeton } = data[0];
    // Jeton dans le fragment : jamais envoyé au serveur ni dans le Referer (LLD §7.1).
    const lien = `${deps.appUrl}/invitation#${jeton}`;
    const donnees = { daara: (await deps.nomDaara(daaraId)) ?? 'DAARA', role, lien, langue };

    const emailEnvoye = email ? await deps.envoyer(courrielInvitation(email, donnees)) : false;
    return ok({
        id,
        lien,
        email_envoye: emailEnvoye,
        // Message dans la langue de l'invité ; le front construit le lien wa.me vers le numéro.
        message_whatsapp: messageWhatsapp(donnees),
        telephone,
    });
}
