import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { Database } from '../../../core/supabase/database.types';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export type Creneau = Database['public']['Enums']['creneau_appel'];
export type TypeAbsence = Database['public']['Enums']['type_absence'];
/** État d'un élève pendant l'appel : présent par défaut (aucune ligne), sinon absent ou en retard. */
export type Presence = 'present' | TypeAbsence;

type InsertionAppel = Database['public']['Tables']['appels']['Insert'];
type InsertionAbsence = Database['public']['Tables']['absences']['Insert'];

export interface ClasseAppel {
    readonly id: string;
    readonly nom: string;
    /** Appel du jour et du créneau : absent = à faire. */
    readonly appel: { readonly id: string; readonly termine: boolean; readonly absents: number; readonly retards: number } | null;
}

export interface EleveAppel {
    readonly apprenantId: string;
    readonly prenom: string;
    readonly nom: string;
    readonly presence: Presence;
    /** Ligne `absences` (absent ou en retard). */
    readonly absenceId: string | null;
}

export interface FeuilleAppel {
    readonly classeNom: string;
    readonly appelId: string | null;
    readonly termine: boolean;
    readonly eleves: readonly EleveAppel[];
}

export class ErreurAppel extends Error {
    constructor(readonly cle: string) {
        super(cle);
    }
}

/** Messages des refus de la base (triggers `verifier_appel`, `absences_coherentes`). */
export function erreurAppel(erreur: { code?: string; message?: string } | null): ErreurAppel {
    const message = erreur?.message ?? '';
    if (['appel_trop_ancien', 'date_hors_annee', 'annee_inactive', 'eleve_hors_classe', 'creneau_invalide'].includes(message)) {
        return new ErreurAppel('appel.erreurs.' + message);
    }
    return new ErreurAppel(erreur?.code === '42501' ? 'appel.erreurs.droits' : 'appel.erreurs.inattendue');
}

export { aujourdhui } from '../../../core/dates';

/** Créneau proposé : la journée, ou le matin avant 13 h et l'après-midi ensuite. */
export function creneauParDefaut(demiJournee: boolean, maintenant = new Date()): Creneau {
    if (!demiJournee) {
        return 'journee';
    }
    const heure = Number(maintenant.toLocaleTimeString('en-GB', { timeZone: 'Africa/Dakar', hour: '2-digit', hour12: false }).slice(0, 2));
    return heure < 13 ? 'matin' : 'apres_midi';
}

/** Présence suivante au toucher : présent → absent → en retard → présent. */
export function presenceSuivante(p: Presence): Presence {
    return p === 'present' ? 'absence' : p === 'absence' ? 'retard' : 'present';
}

/**
 * Appel du jour (S5.1, module `absences`) : classes de l'enseignant (toutes pour l'admin) avec l'état de leur appel,
 * feuille d'appel (présent par défaut), marquage élève par élève, fin de l'appel. La base revérifie tout (année active,
 * fenêtre de 7 jours pour l'enseignant, élève inscrit).
 */
@Injectable({ providedIn: 'root' })
export class AppelService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);
    private readonly auth = inject(AuthService);

    async classes(date: string, creneau: Creneau): Promise<ClasseAppel[]> {
        const daaraId = this.daaraId();
        const { data: annee } = await this.sb.from('annees_scolaires').select('id').eq('daara_id', daaraId).eq('active', true).maybeSingle();
        if (!annee) {
            return [];
        }
        const [classes, appels] = await Promise.all([
            this.sb.from('classes').select('id, nom, titulaire_id, classe_matieres(enseignant_id)').eq('annee_id', annee.id).order('nom'),
            this.sb.from('appels').select('id, classe_id, termine_at, absences(type)').eq('daara_id', daaraId).eq('date_appel', date).eq('creneau', creneau),
        ]);
        if (classes.error || appels.error) {
            throw erreurAppel(classes.error ?? appels.error);
        }
        const moi = this.auth.user()?.id;
        const admin = this.courante.roles().includes('admin');
        return classes.data
            .filter((c) => admin || c.titulaire_id === moi || c.classe_matieres.some((cm) => cm.enseignant_id === moi))
            .map((c) => {
                const a = appels.data.find((x) => x.classe_id === c.id);
                return {
                    id: c.id,
                    nom: c.nom,
                    appel: a
                        ? {
                              id: a.id,
                              termine: !!a.termine_at,
                              absents: a.absences.filter((x) => x.type === 'absence').length,
                              retards: a.absences.filter((x) => x.type === 'retard').length,
                          }
                        : null,
                };
            });
    }

    async feuille(classeId: string, date: string, creneau: Creneau): Promise<FeuilleAppel> {
        const [classe, inscrits, appel] = await Promise.all([
            this.sb.from('classes').select('nom').eq('id', classeId).maybeSingle(),
            this.sb
                .from('inscriptions')
                .select('apprenant_id, apprenants!inner(prenom, nom, statut)')
                .eq('classe_id', classeId)
                .eq('apprenants.statut', 'inscrit'),
            this.sb
                .from('appels')
                .select('id, termine_at, absences(id, apprenant_id, type)')
                .eq('classe_id', classeId)
                .eq('date_appel', date)
                .eq('creneau', creneau)
                .maybeSingle(),
        ]);
        const erreur = classe.error ?? inscrits.error ?? appel.error;
        if (erreur || !classe.data) {
            throw erreurAppel(erreur ?? { code: '42501' });
        }
        const absences = appel.data?.absences ?? [];
        return {
            classeNom: classe.data.nom,
            appelId: appel.data?.id ?? null,
            termine: !!appel.data?.termine_at,
            eleves: (inscrits.data ?? [])
                .map((i): EleveAppel => {
                    const a = absences.find((x) => x.apprenant_id === i.apprenant_id);
                    return {
                        apprenantId: i.apprenant_id,
                        prenom: i.apprenants.prenom,
                        nom: i.apprenants.nom,
                        presence: a?.type ?? 'present',
                        absenceId: a?.id ?? null,
                    };
                })
                .sort((a, b) => a.prenom.localeCompare(b.prenom) || a.nom.localeCompare(b.nom)),
        };
    }

    /** Appel de la classe pour ce jour et ce créneau, créé s'il n'existe pas (deux enseignants en même temps : le même). */
    async ouvrir(classeId: string, date: string, creneau: Creneau): Promise<string> {
        const { data, error } = await this.sb
            .from('appels')
            // annee_id : rempli par le trigger (copié de la classe), jamais envoyé par le client.
            .insert({ daara_id: this.daaraId(), classe_id: classeId, date_appel: date, creneau } as InsertionAppel)
            .select('id')
            .single();
        if (!error) {
            return data.id;
        }
        if (error.code === '23505') {
            const existant = await this.sb.from('appels').select('id').eq('classe_id', classeId).eq('date_appel', date).eq('creneau', creneau).single();
            if (!existant.error) {
                return existant.data.id;
            }
        }
        throw erreurAppel(error);
    }

    /** Enregistre la présence d'un élève ; renvoie l'identifiant de la ligne `absences` (null si présent). */
    async marquer(appelId: string, eleve: EleveAppel, presence: Presence): Promise<string | null> {
        if (presence === 'present') {
            if (eleve.absenceId) {
                const { error } = await this.sb.from('absences').delete().eq('id', eleve.absenceId);
                if (error) {
                    throw erreurAppel(error);
                }
            }
            return null;
        }
        if (eleve.absenceId) {
            const { error } = await this.sb.from('absences').update({ type: presence }).eq('id', eleve.absenceId);
            if (error) {
                throw erreurAppel(error);
            }
            return eleve.absenceId;
        }
        const { data, error } = await this.sb
            .from('absences')
            // classe_id, date_absence, creneau : copiés de l'appel par le trigger.
            .insert({ daara_id: this.daaraId(), appel_id: appelId, apprenant_id: eleve.apprenantId, type: presence } as InsertionAbsence)
            .select('id')
            .single();
        if (!error) {
            return data.id;
        }
        // Déjà marqué entre-temps (collègue sur la même feuille) : on met à jour sa ligne.
        if (error.code === '23505') {
            const maj = await this.sb
                .from('absences')
                .update({ type: presence })
                .eq('appel_id', appelId)
                .eq('apprenant_id', eleve.apprenantId)
                .select('id')
                .single();
            if (!maj.error) {
                return maj.data.id;
            }
        }
        throw erreurAppel(error);
    }

    async terminer(appelId: string): Promise<void> {
        const { error } = await this.sb.rpc('terminer_appel', { p_appel: appelId });
        if (error) {
            throw erreurAppel(error);
        }
    }

    private daaraId(): string {
        const id = this.courante.id();
        if (!id) {
            throw new ErreurAppel('appel.erreurs.inattendue');
        }
        return id;
    }
}
