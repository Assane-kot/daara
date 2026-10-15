import { Creneau, TypeAbsence } from '../appel/data/appel.service';

/** Situation d'un enfant aujourd'hui, affichée en tête de sa carte (S5.4). */
export type CodeSituation = 'absence' | 'retard' | 'present' | 'attente' | 'sans_classe';

export interface Situation {
    readonly code: CodeSituation;
    /** Créneau concerné (absence, retard, ou dernier appel terminé). */
    readonly creneau: Creneau | null;
}

/**
 * Absent ou en retard aujourd'hui (le dernier créneau marqué l'emporte) ; sinon présent si un appel de sa classe est
 * terminé ; sinon appel pas encore fait. Un appel en cours ne dit rien (le parent n'est prévenu qu'à la fin, ADR-011).
 */
export function situationDuJour(
    enfant: { readonly id: string; readonly classeId: string | null },
    appels: readonly { readonly classeId: string; readonly creneau: Creneau; readonly termine: boolean }[],
    absencesDuJour: readonly { readonly apprenantId: string; readonly type: TypeAbsence; readonly creneau: Creneau }[],
): Situation {
    if (!enfant.classeId) {
        return { code: 'sans_classe', creneau: null };
    }
    const termines = appels.filter((a) => a.classeId === enfant.classeId && a.termine);
    const ordre: readonly Creneau[] = ['journee', 'matin', 'apres_midi'];
    const dernierAppel = [...termines].sort((a, b) => ordre.indexOf(b.creneau) - ordre.indexOf(a.creneau))[0];
    const absence = absencesDuJour
        .filter((a) => a.apprenantId === enfant.id && termines.some((t) => t.creneau === a.creneau))
        .sort((a, b) => ordre.indexOf(b.creneau) - ordre.indexOf(a.creneau))[0];
    // Absent le matin mais présent à l'appel de l'après-midi : on montre le plus récent.
    if (absence && (!dernierAppel || ordre.indexOf(absence.creneau) >= ordre.indexOf(dernierAppel.creneau))) {
        return { code: absence.type, creneau: absence.creneau };
    }
    return dernierAppel ? { code: 'present', creneau: dernierAppel.creneau } : { code: 'attente', creneau: null };
}
