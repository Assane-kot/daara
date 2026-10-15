import { TranslateService } from '@ngx-translate/core';
import { Notification } from './notifications.service';

/**
 * Message d'une notification, composé à l'écran (ADR-011) : « Awa était absente ce matin », « Retard d'Awa le
 * mar. 13 oct. », « Absence d'Awa annulée »… Prénom illisible (droits retirés) : « votre enfant » / « un élève ».
 */
export function messageNotification(n: Notification, translate: TranslateService, langue: string, aujourdhui: string): string {
    let quand = '';
    if (n.date === aujourdhui) {
        quand = translate.instant('notifications.quand.' + (n.creneau ?? 'journee'));
    } else if (n.date) {
        const date = new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
            new Date(`${n.date}T12:00:00Z`),
        );
        quand =
            translate.instant('notifications.quand.le', { date }) +
            (n.creneau && n.creneau !== 'journee' ? ` (${translate.instant('appel.creneaux.' + n.creneau)})` : '');
    }
    const prenom = n.prenom || translate.instant(n.type === 'justification_envoyee' ? 'notifications.un_eleve' : 'notifications.votre_enfant');
    const cle = n.type === 'justification_decidee' && n.justifiee !== null ? (n.justifiee ? 'justifiee' : 'non_justifiee') : n.type;
    return translate.instant('notifications.messages.' + cle, { prenom, quand, e: n.fille ? 'e' : n.fille === false ? '' : '(e)' });
}
