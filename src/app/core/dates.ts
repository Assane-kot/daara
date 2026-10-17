/** Date du jour au Sénégal (`Africa/Dakar`), au format AAAA-MM-JJ. */
export function aujourdhui(maintenant = new Date()): string {
    return maintenant.toLocaleDateString('en-CA', { timeZone: 'Africa/Dakar' });
}

/** Date AAAA-MM-JJ affichée courte : « mer. 14 oct. 2026 » (fr), « Wed 14 Oct 2026 » (en). */
export function dateCourte(iso: string, langue: string): string {
    return new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(`${iso}T12:00:00Z`));
}
