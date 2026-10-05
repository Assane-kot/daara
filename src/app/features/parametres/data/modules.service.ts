import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentDaaraService } from '../../../core/daara/current-daara.service';
import { ModuleDaara } from '../../../core/daara/daara.model';
import { SupabaseService } from '../../../core/supabase/supabase.service';

/** Erreur traduite pour l'écran Modules (codes de `definir_modules`, LLD §4). */
export class ErreurModules extends Error {
    constructor(
        readonly cle: string,
        readonly params: Record<string, string> = {},
    ) {
        super(cle);
    }
}

/** Clé de traduction (et paramètres) d'une erreur de `definir_modules`. */
export function erreurModules(erreur: { code?: string; message?: string }): ErreurModules {
    const requis = /^module_requis:([a-z_]+):([a-z_]+)$/.exec(erreur.message ?? '');
    if (erreur.code === '23514' && requis) {
        return new ErreurModules('parametres.modules.erreurs.requis', { prerequis: requis[1], dependant: requis[2] });
    }
    if (erreur.code === '42501') {
        return new ErreurModules('parametres.modules.erreurs.droits');
    }
    return new ErreurModules('parametres.modules.erreurs.inattendue');
}

@Injectable({ providedIn: 'root' })
export class ModulesService {
    private readonly sb = inject(SupabaseService).client;
    private readonly auth = inject(AuthService);
    private readonly courante = inject(CurrentDaaraService);

    /**
     * Active ou désactive un module de la daara ouverte à partir de l'état en base (`basculer_module` : la base ajoute
     * les prérequis, refuse de retirer un prérequis encore requis et ne réécrit pas les choix d'un autre admin), puis
     * recharge la daara pour que menus et guards suivent. Renvoie les modules actifs. Lève `ErreurModules`.
     */
    async basculer(module: ModuleDaara, actif: boolean): Promise<ModuleDaara[]> {
        const daaraId = this.courante.id();
        if (!daaraId) {
            throw new ErreurModules('parametres.modules.erreurs.inattendue');
        }
        const { data, error } = await this.sb.rpc('basculer_module', { p_daara: daaraId, p_module: module, p_actif: actif });
        if (error) {
            throw erreurModules(error);
        }
        this.auth.invaliderDaaras();
        const daara = (await this.auth.mesDaaras()).find((d) => d.id === daaraId);
        if (daara) {
            this.courante.definir(daara);
        }
        return data;
    }
}
