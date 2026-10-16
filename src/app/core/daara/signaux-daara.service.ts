import { DestroyRef, Injectable, effect, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Observable, Subject, debounceTime, filter, fromEvent, map, merge, share } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CurrentDaaraService } from './current-daara.service';

/** Tables qui publient un signal (migration `signaux_daara`). `*` : tout recharger (reconnexion). */
export type TableSignal =
    | 'daaras'
    | 'daara_modules'
    | 'memberships'
    | 'invitations'
    | 'annees_scolaires'
    | 'periodes'
    | 'matieres'
    | 'classes'
    | 'classe_matieres'
    | 'apprenants'
    | 'inscriptions'
    | 'parent_links'
    | 'invitation_enfants'
    | 'appels'
    | 'absences'
    | 'reglages_notes'
    | 'types_evaluation'
    | 'reglages_absences';

/** Délai de regroupement : un import de 20 élèves ou plusieurs écritures rapprochées = un seul rechargement. */
const REGROUPEMENT_MS = 400;
/** Ce qui change le contexte de la daara pour tout le monde (menus, modules, rôles, logo). */
const CONTEXTE: readonly string[] = ['daaras', 'daara_modules', 'memberships'];

/**
 * Mise à jour automatique entre profils (S5.0b, ADR-011) : un canal Realtime Broadcast privé `daara:<uuid>` par
 * utilisateur, ouvert sur la daara courante. La base y publie seulement « la table X a changé » ; chaque écran ouvert
 * recharge ses données par une requête normale (RLS). Filet : rechargement quand l'onglet redevient visible et après
 * une reconnexion.
 */
@Injectable({ providedIn: 'root' })
export class SignauxDaaraService {
    private readonly sb = inject(SupabaseService).client;
    private readonly courante = inject(CurrentDaaraService);
    private readonly auth = inject(AuthService);

    private readonly changements = new Subject<string>();
    private readonly retourVisible: Observable<string> =
        typeof document === 'undefined'
            ? new Subject<string>()
            : fromEvent(document, 'visibilitychange').pipe(
                  filter(() => document.visibilityState === 'visible'),
                  map(() => '*'),
                  share(),
              );
    private canal: RealtimeChannel | null = null;
    private daaraEcoutee: string | null = null;

    constructor() {
        effect(() => void this.ecouter(this.courante.id()));
        this.changements
            .pipe(
                filter((t) => CONTEXTE.includes(t)),
                debounceTime(REGROUPEMENT_MS),
            )
            .subscribe(() => void this.auth.rechargerDaaraCourante());
    }

    /**
     * Appelle `action` (regroupé) quand une des `tables` change dans la daara, quand l'onglet redevient visible et
     * après une reconnexion. À appeler dans un contexte d'injection (constructeur, initialiseur de champ).
     */
    surveiller(tables: readonly TableSignal[], action: () => unknown, destroyRef: DestroyRef = inject(DestroyRef)): void {
        const abonnement = merge(this.changements, this.retourVisible)
            .pipe(
                filter((t) => t === '*' || (tables as readonly string[]).includes(t)),
                debounceTime(REGROUPEMENT_MS),
            )
            .subscribe(() => void action());
        destroyRef.onDestroy(() => abonnement.unsubscribe());
    }

    private async ecouter(daaraId: string | null): Promise<void> {
        if (daaraId === this.daaraEcoutee) {
            return;
        }
        if (this.canal) {
            void this.sb.removeChannel(this.canal);
            this.canal = null;
        }
        this.daaraEcoutee = daaraId;
        if (!daaraId) {
            return;
        }
        // Canal privé : le jeton de la session autorise l'écoute (politique sur realtime.messages).
        await this.sb.realtime.setAuth();
        if (this.daaraEcoutee !== daaraId) {
            return;
        }
        let premiere = true;
        this.canal = this.sb
            .channel(`daara:${daaraId}`, { config: { private: true } })
            .on('broadcast', { event: 'changement' }, (message) => {
                const table: unknown = (message['payload'] as Record<string, unknown> | undefined)?.['table'];
                if (typeof table === 'string') {
                    this.changements.next(table);
                }
            })
            .subscribe((statut) => {
                if (statut === 'SUBSCRIBED') {
                    // Reconnexion : des signaux ont pu être manqués → tout recharger.
                    if (!premiere) {
                        this.changements.next('*');
                    }
                    premiere = false;
                }
            });
    }
}
