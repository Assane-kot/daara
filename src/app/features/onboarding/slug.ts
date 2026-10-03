/** Format d'un slug de daara (contrainte `daaras.slug`, LLD §3.2). */
export const MOTIF_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MIN = 3;
export const SLUG_MAX = 50;

/**
 * Slug proposé à partir du nom de la daara : minuscules, sans accents, mots séparés par des tirets,
 * 50 caractères au plus sans tiret final. Exemple : « Daara Serigne Touba de Mbacké » → `daara-serigne-touba-de-mbacke`.
 */
export function proposerSlug(nom: string): string {
    return nom
        .normalize('NFD')
        .replace(/[\u0300-\u036F]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, SLUG_MAX)
        .replace(/-+$/, '');
}

/** Validateur de formulaire : erreur `slug` (message dédié, `formulaire.erreurs.slug`). */
export function slugValidateur(controle: { value: string | null }): { slug: true } | null {
    const valeur = controle.value ?? '';
    if (!valeur) {
        return null;
    }
    return valeur.length >= SLUG_MIN && valeur.length <= SLUG_MAX && MOTIF_SLUG.test(valeur) ? null : { slug: true };
}
