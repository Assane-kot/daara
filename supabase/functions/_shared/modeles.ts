// Messages d'invitation (e-mail et WhatsApp), dans la langue de l'invité. Le nom de la daara est saisi par un tiers :
// échappé, présenté entre guillemets, avec une phrase « ignorez si vous ne connaissez pas » (audit S2.5a, hameçonnage).
// Jamais le nom de l'invité (spec : modèle sans nom saisi).

import type { Courriel } from './email.ts';
import type { Langue, Role } from './validation.ts';

const TEXTES = {
    fr: {
        roles: { admin: 'administrateur', enseignant: 'enseignant', parent: 'parent' },
        sujet: (daara: string) => `Invitation à rejoindre « ${daara} » sur DAARA`,
        invitation: (daara: string, role: string) => `La daara « ${daara} » vous invite à rejoindre son espace DAARA en tant que ${role}.`,
        action: 'Accepter l’invitation',
        validite: 'Ce lien est personnel et valable 7 jours.',
        inconnu: 'Si vous ne connaissez pas cette daara, ignorez ce message.',
    },
    en: {
        roles: { admin: 'administrator', enseignant: 'teacher', parent: 'parent' },
        sujet: (daara: string) => `Invitation to join “${daara}” on DAARA`,
        invitation: (daara: string, role: string) => `The daara “${daara}” invites you to join its DAARA space as ${role}.`,
        action: 'Accept the invitation',
        validite: 'This link is personal and valid for 7 days.',
        inconnu: 'If you do not know this daara, ignore this message.',
    },
} as const;

export interface DonneesInvitation {
    readonly daara: string;
    readonly role: Role;
    readonly lien: string;
    readonly langue: Langue;
}

export function echapperHtml(texte: string): string {
    return texte.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** Nom de daara affiché : une ligne, 120 caractères au plus (déjà garanti par la base, redit ici). */
function nomDaara(nom: string): string {
    return nom.replace(/\s+/g, ' ').trim().slice(0, 120);
}

export function courrielInvitation(email: string, d: DonneesInvitation): Courriel {
    const t = TEXTES[d.langue];
    const daara = nomDaara(d.daara);
    const phrase = t.invitation(daara, t.roles[d.role]);
    const texte = `${phrase}\n\n${t.action} : ${d.lien}\n\n${t.validite}\n${t.inconnu}\n`;
    const html = `<!doctype html><html lang="${d.langue}"><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
<p>${echapperHtml(phrase)}</p>
<p><a href="${echapperHtml(d.lien)}" style="display:inline-block;background:#1a6b3c;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${echapperHtml(t.action)}</a></p>
<p style="color:#6b7280;font-size:13px">${echapperHtml(t.validite)}<br>${echapperHtml(t.inconnu)}</p>
</body></html>`;
    return { a: email, sujet: t.sujet(daara), texte, html };
}

/** Message WhatsApp pré-rempli (lien `wa.me` construit par le front). */
export function messageWhatsapp(d: DonneesInvitation): string {
    const t = TEXTES[d.langue];
    return `${t.invitation(nomDaara(d.daara), t.roles[d.role])}\n${d.lien}\n${t.validite}`;
}
