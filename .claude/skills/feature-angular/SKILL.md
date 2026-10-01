---
name: feature-angular
description: Crée une feature Angular complète pour DAARA (routes lazy, service Supabase typé, pages, Realtime, états chargement/erreur/vide, guards par rôle). À utiliser pour tout nouvel écran ou module front.
---
# Feature Angular DAARA

## Préalable
La spec `docs/features/<nom>.md` est validée et la migration + RLS sont en place et testées.
Les types sont régénérés (`database.types.ts`).

## Structure
```
src/app/features/<feature>/
├── <feature>.routes.ts
├── data/<feature>.service.ts
├── pages/<liste|detail|form>/...
└── components/...
```
Enregistrer la route en lazy dans `app.routes.ts` avec `canActivate: [authGuard, roleGuard([...])]`.

## Service (modèle)
```ts
@Injectable({ providedIn: 'root' })
export class AbsencesService {
  private sb = inject(SupabaseService).client;
  private daara = inject(CurrentDaaraService); // daara active de l'utilisateur

  list(params: { page: number; size: number; classeId?: string }) {
    const from = params.page * params.size;
    let q = this.sb.from('absences')
      .select('id, date_absence, justifiee, motif, apprenants(nom, prenom)', { count: 'exact' })
      .eq('daara_id', this.daara.id())
      .order('date_absence', { ascending: false })
      .range(from, from + params.size - 1);
    return q; // la RLS reste la vraie protection, le filtre daara_id sert à l'index et au Realtime
  }

  watch(onChange: () => void, destroyRef: DestroyRef) {
    const channel = this.sb.channel(`absences:${this.daara.id()}`)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'absences', filter: `daara_id=eq.${this.daara.id()}` },
          () => onChange())
      .subscribe();
    destroyRef.onDestroy(() => this.sb.removeChannel(channel));
  }
}
```

## Pages
- Signals pour l'état : `items`, `loading`, `error`, `total`.
- Afficher : squelette de chargement, message d'erreur en français avec bouton « Réessayer », état vide.
- Composants visuels repris du thème (skill composant-vristo).
- Textes via les fichiers de traduction (fr, ar).

## Fin de feature
- Tests unitaires du service (mock du client Supabase) et du composant principal.
- Lancer l'agent `auditeur-securite` en lui passant la liste des fichiers créés/modifiés.
- Mettre à jour PROGRESS.md, cocher la story dans SPRINTS.md, puis donner au développeur la liste des
  fichiers modifiés, les commandes git et le message de commit (Claude n'exécute aucune commande git).
