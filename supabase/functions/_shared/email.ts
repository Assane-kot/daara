// Envoi d'e-mails : une seule porte d'entrée pour toutes les Edge Functions (ADR-003). Fournisseur choisi par
// configuration : API Brevo si `BREVO_API_KEY` (cloud), sinon API de Mailpit si `MAILPIT_URL` (local), sinon aucun envoi.
// Ne lève jamais : renvoie vrai si l'e-mail est parti. Aucune donnée personnelle dans les journaux.

export interface Courriel {
    readonly a: string;
    readonly sujet: string;
    readonly texte: string;
    readonly html: string;
}

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export async function envoyerCourriel(courriel: Courriel, env: (nom: string) => string | undefined, fetchFn: Fetch = fetch): Promise<boolean> {
    const expediteur = env('EMAIL_EXPEDITEUR') ?? 'no-reply@daara.local';
    const nom = 'DAARA';
    try {
        const cleBrevo = env('BREVO_API_KEY');
        const mailpit = env('MAILPIT_URL');
        let reponse: Response;
        if (cleBrevo) {
            reponse = await fetchFn('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: { 'api-key': cleBrevo, 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    sender: { name: nom, email: expediteur },
                    to: [{ email: courriel.a }],
                    subject: courriel.sujet,
                    textContent: courriel.texte,
                    htmlContent: courriel.html,
                }),
            });
        } else if (mailpit) {
            reponse = await fetchFn(`${mailpit.replace(/\/$/, '')}/api/v1/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    From: { Email: expediteur, Name: nom },
                    To: [{ Email: courriel.a }],
                    Subject: courriel.sujet,
                    Text: courriel.texte,
                    HTML: courriel.html,
                }),
            });
        } else {
            console.warn('envoi_email_non_configure');
            return false;
        }
        if (!reponse.ok) {
            console.error('envoi_email_echec', reponse.status);
        }
        await reponse.body?.cancel();
        return reponse.ok;
    } catch (e) {
        console.error('envoi_email_erreur', e instanceof Error ? e.name : typeof e);
        return false;
    }
}
