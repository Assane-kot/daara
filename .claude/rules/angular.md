---
paths:
  - "src/**/*.ts"
  - "src/**/*.html"
---
# Règles Angular

- Composants standalone, `inject()` plutôt que l'injection par constructeur, `ChangeDetectionStrategy.OnPush`.
- État local et dérivé : signals (`signal`, `computed`). RxJS seulement pour les flux (Realtime, debounce).
- Nouveau control flow (`@if`, `@for` avec `track`, `@defer`) si la version d'Angular le permet.
- Une feature = un dossier `src/app/features/<feature>/` (pages, composants, service, routes), chargée en lazy.
- Accès données : uniquement via un service de feature qui utilise `SupabaseService` (src/app/core/supabase).
  Jamais d'appel `supabase.from()` dans un composant.
- Types : toujours ceux générés (`database.types.ts`), jamais de `any`.
- Abonnements Realtime : créés dans le service, libérés via `DestroyRef` / `removeChannel`. Un canal par écran.
- Toute requête gère les 3 états : chargement, erreur (message utilisateur en français), vide.
- Formulaires : Reactive Forms typés, validation côté client ET contraintes en base.
- i18n : français + anglais (ADR-005), pas de texte en dur hors fichiers de traduction. Conserver les variantes
  `ltr:` / `rtl:` du markup Vristo (arabe prévu plus tard).
- Guards : `authGuard` + `roleGuard(['admin', ...])`. Le guard est du confort UI ; la vraie sécurité est la RLS.
