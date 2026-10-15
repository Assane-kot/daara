/** Date du jour au Sénégal (`Africa/Dakar`), au format AAAA-MM-JJ. */
export function aujourdhui(maintenant = new Date()): string {
    return maintenant.toLocaleDateString('en-CA', { timeZone: 'Africa/Dakar' });
}
