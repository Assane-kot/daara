import { Injectable, inject } from '@angular/core';
import { CurrentDaaraService } from '../../core/daara/current-daara.service';
import { SupabaseService } from '../../core/supabase/supabase.service';

/** Ce qui est déjà en place dans la daara (comptages ; 0 si la table est illisible, ex. module inactif). */
export interface EtatDaara {
    readonly anneeActive: boolean;
    readonly matieres: number;
    readonly classes: number;
    readonly eleves: number;
    readonly inscrits: number;
    readonly enseignants: number;
    readonly parents: number;
}

export type CleEtape = 'annee' | 'matieres' | 'classes' | 'eleves' | 'inscriptions' | 'enseignants' | 'parents';

export interface EtapeDemarrage {
    readonly cle: CleEtape;
    readonly faite: boolean;
    /** Route relative à `/d/:slug`. */
    readonly route: string;
}

/**
 * Étapes du démarrage de l'admin, dans l'ordre où elles se font. Sans le module `structure` (daara coranique) : élèves,
 * enseignants, parents ; matières seulement si le module `notes` est actif.
 */
export function etapesDemarrage(etat: EtatDaara, modules: { structure: boolean; notes: boolean }): EtapeDemarrage[] {
    const etapes: (EtapeDemarrage | false)[] = [
        modules.structure && { cle: 'annee', faite: etat.anneeActive, route: 'structure/annees' },
        modules.structure && modules.notes && { cle: 'matieres', faite: etat.matieres > 0, route: 'structure/matieres' },
        modules.structure && { cle: 'classes', faite: etat.classes > 0, route: 'structure/classes' },
        { cle: 'eleves', faite: etat.eleves > 0, route: 'apprenants' },
        modules.structure && { cle: 'inscriptions', faite: etat.inscrits > 0, route: 'structure/classes' },
        { cle: 'enseignants', faite: etat.enseignants > 0, route: 'membres' },
        { cle: 'parents', faite: etat.parents > 0, route: 'apprenants' },
    ];
    return etapes.filter((e): e is EtapeDemarrage => e !== false);
}

/** Démarrage guidé (S4.5, admin) : comptages en parallèle, sans charger les lignes. */
@Injectable({ providedIn: 'root' })
export class DemarrageService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);

    async etat(): Promise<EtatDaara> {
        const daara = this.courante.id();
        if (!daara) {
            throw new Error('daara');
        }
        const { data: annee } = await this.sb.from('annees_scolaires').select('id').eq('daara_id', daara).eq('active', true).maybeSingle();
        const compter = async (requete: PromiseLike<{ count: number | null; error: unknown }>) => {
            const { count, error } = await requete;
            return error ? 0 : (count ?? 0);
        };
        const tete = { count: 'exact', head: true } as const;
        const maintenant = new Date().toISOString();
        const [matieres, classes, eleves, inscrits, enseignants, invitesEns, liens, invitesParents] = await Promise.all([
            compter(this.sb.from('matieres').select('id', tete).eq('daara_id', daara)),
            annee ? compter(this.sb.from('classes').select('id', tete).eq('annee_id', annee.id)) : 0,
            compter(this.sb.from('apprenants').select('id', tete).eq('daara_id', daara)),
            annee ? compter(this.sb.from('inscriptions').select('id', tete).eq('annee_id', annee.id)) : 0,
            compter(this.sb.from('memberships').select('user_id', tete).eq('daara_id', daara).eq('role', 'enseignant').eq('actif', true)),
            compter(
                this.sb
                    .from('invitations')
                    .select('id', tete)
                    .eq('daara_id', daara)
                    .eq('role', 'enseignant')
                    .is('accepted_at', null)
                    .is('revoked_at', null)
                    .gt('expires_at', maintenant),
            ),
            compter(this.sb.from('parent_links').select('id', tete).eq('daara_id', daara)),
            compter(this.sb.from('invitation_enfants').select('id', tete).eq('daara_id', daara)),
        ]);
        return {
            anneeActive: !!annee,
            matieres,
            classes,
            eleves,
            inscrits,
            enseignants: enseignants + invitesEns,
            parents: liens + invitesParents,
        };
    }
}
