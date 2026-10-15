import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../auth/auth.service';
import { CurrentDaaraService } from '../daara/current-daara.service';
import { Database } from '../supabase/database.types';
import { SupabaseService } from '../supabase/supabase.service';

export type TypeNotification = Database['public']['Enums']['type_notification'];

export interface Notification {
    readonly id: string;
    readonly type: TypeNotification;
    readonly apprenantId: string | null;
    /** Prénom lu avec les droits du destinataire (vide s'il ne peut plus le lire). */
    readonly prenom: string;
    /** Accord en français (« absente ») ; null si l'élève n'est plus lisible. */
    readonly fille: boolean | null;
    readonly date: string | null;
    readonly creneau: Database['public']['Enums']['creneau_appel'] | null;
    readonly lue: boolean;
    readonly creeLe: string;
    /** Décision actuelle (justification décidée), lue sur l'absence. */
    readonly justifiee: boolean | null;
}

const COLONNES = 'id, type, apprenant_id, date_absence, creneau, lu_at, created_at, apprenants(prenom, sexe), absences(etat)';
const PARENTS: readonly TypeNotification[] = ['absence', 'retard', 'absence_annulee', 'justification_decidee'];

/**
 * Notifications dans l'application (S5.3, module `notifications`, ADR-011) : non lues de la daara ouverte, 10 dernières
 * pour la cloche, page complète ; un canal Realtime privé `utilisateur:<uuid>` signale chaque nouveauté (sans donnée).
 * Les messages et les liens sont composés à l'écran à partir d'identifiants (ADR-010).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);
    private readonly auth = inject(AuthService);

    readonly nonLues = signal(0);
    readonly recentes = signal<readonly Notification[]>([]);
    /** Incrémentée à chaque signal : la page des notifications se recharge. */
    readonly version = signal(0);
    readonly actif = computed(() => !!this.courante.id() && this.courante.moduleActif('notifications'));

    private canal: RealtimeChannel | null = null;
    private utilisateurEcoute: string | null = null;

    constructor() {
        effect(() => {
            const uid = this.actif() ? (this.auth.user()?.id ?? null) : null;
            void this.ecouter(uid);
            // Daara changée : compteur et liste de cette daara.
            if (this.actif()) {
                void this.charger();
            } else {
                this.nonLues.set(0);
                this.recentes.set([]);
            }
        });
    }

    async charger(): Promise<void> {
        const daaraId = this.courante.id();
        if (!daaraId) {
            return;
        }
        const [compte, liste] = await Promise.all([
            this.sb.from('notifications').select('id', { count: 'exact', head: true }).eq('daara_id', daaraId).is('lu_at', null),
            this.sb.from('notifications').select(COLONNES).eq('daara_id', daaraId).order('created_at', { ascending: false }).limit(10),
        ]);
        this.nonLues.set(compte.error ? 0 : (compte.count ?? 0));
        this.recentes.set(liste.error ? [] : liste.data.map(versNotification));
    }

    async page(debut: number, taille: number): Promise<{ lignes: Notification[]; total: number }> {
        const { data, error, count } = await this.sb
            .from('notifications')
            .select(COLONNES, { count: 'exact' })
            .eq('daara_id', this.courante.id() ?? '')
            .order('created_at', { ascending: false })
            .range(debut, debut + taille - 1);
        if (error) {
            throw error;
        }
        return { lignes: data.map(versNotification), total: count ?? 0 };
    }

    async marquerLue(n: Notification): Promise<void> {
        if (n.lue) {
            return;
        }
        await this.sb.from('notifications').update({ lu_at: new Date().toISOString() }).eq('id', n.id);
        await this.charger();
    }

    async toutMarquerLu(): Promise<void> {
        await this.sb
            .from('notifications')
            .update({ lu_at: new Date().toISOString() })
            .eq('daara_id', this.courante.id() ?? '')
            .is('lu_at', null);
        await this.charger();
    }

    /** Lien ouvert au toucher : la page de l'enfant (parent), le suivi des absences (équipe). */
    lien(n: Notification): unknown[] {
        const slug = this.courante.slug() ?? '';
        return PARENTS.includes(n.type) && n.apprenantId ? ['/d', slug, 'enfants', n.apprenantId] : ['/d', slug, 'absences'];
    }

    lienPage(): unknown[] {
        return ['/d', this.courante.slug() ?? '', 'notifications'];
    }

    private async ecouter(uid: string | null): Promise<void> {
        if (uid === this.utilisateurEcoute) {
            return;
        }
        if (this.canal) {
            void this.sb.removeChannel(this.canal);
            this.canal = null;
        }
        this.utilisateurEcoute = uid;
        if (!uid) {
            return;
        }
        await this.sb.realtime.setAuth();
        if (this.utilisateurEcoute !== uid) {
            return;
        }
        this.canal = this.sb
            .channel(`utilisateur:${uid}`, { config: { private: true } })
            .on('broadcast', { event: 'changement' }, () => {
                this.version.update((v) => v + 1);
                void this.charger();
            })
            .subscribe();
    }
}

function versNotification(n: {
    id: string;
    type: TypeNotification;
    apprenant_id: string | null;
    date_absence: string | null;
    creneau: Database['public']['Enums']['creneau_appel'] | null;
    lu_at: string | null;
    created_at: string;
    apprenants: { prenom: string; sexe: Database['public']['Enums']['sexe_apprenant'] } | null;
    absences: { etat: Database['public']['Enums']['etat_justification'] } | null;
}): Notification {
    return {
        id: n.id,
        type: n.type,
        apprenantId: n.apprenant_id,
        prenom: n.apprenants?.prenom ?? '',
        fille: n.apprenants ? n.apprenants.sexe === 'F' : null,
        date: n.date_absence,
        creneau: n.creneau,
        lue: !!n.lu_at,
        creeLe: n.created_at,
        justifiee: n.absences?.etat === 'justifiee' ? true : n.absences?.etat === 'non_justifiee' ? false : null,
    };
}
