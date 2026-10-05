// Contact masqué pour l'aperçu public d'une invitation (LLD §6) : assez pour que l'invité reconnaisse le sien, pas
// assez pour qu'un tiers qui aurait le lien apprenne l'adresse ou le numéro.

/** `awa.ndiaye@gmail.com` → `a***@g***.com`. */
export function masquerEmail(email: string): string {
    const [local, domaine = ''] = email.split('@');
    const point = domaine.lastIndexOf('.');
    const nom = point > 0 ? domaine.slice(0, point) : domaine;
    const extension = point > 0 ? domaine.slice(point) : '';
    return `${local.slice(0, 1)}***@${nom.slice(0, 1)}***${extension}`;
}

/** `+221771234534` → `+221 77 *** ** 34` ; autre indicatif : `+33 *** 34`. */
export function masquerTelephone(telephone: string): string {
    const chiffres = telephone.replace(/[^0-9]/g, '');
    if (chiffres.startsWith('221') && chiffres.length === 12) {
        return `+221 ${chiffres.slice(3, 5)} *** ** ${chiffres.slice(-2)}`;
    }
    return `+${chiffres.slice(0, 2)} *** ${chiffres.slice(-2)}`;
}
