# ADR-004 — Architecture du front Angular

Statut : acceptée (sprint 0)

## Contexte
Le starter Vristo est en Angular 15 (NgModules, NgRx, zone.js, ngx-translate 14, headlessui-angular,
ngx-scrollbar), sans support depuis mai 2024 et contraire au LLD §2 (standalone, signals, pas de store
global). Le starter ne contient qu'une page vide : environ 80 % de son code (header, sidebar, icônes,
traductions) est de la démo. La référence Vristo (Angular 15, Tailwind 3) reste la source du rendu.

## Options étudiées
| Option | Verdict |
|---|---|
| A. `ng update` 15 → 22 puis migration standalone | Rejetée : 7 étapes de mise à niveau sur du code de démo voué à disparaître |
| B. Projet Angular 22 neuf, reprise sélective des styles et layouts Vristo | **Retenue** |
| C. Rester en Angular 15 | Rejetée : version sans correctifs de sécurité, pas de signals ni de control flow |

## Décision
- **Angular 22**, composants standalone, `ChangeDetectionStrategy.OnPush`, `inject()`, control flow
  `@if` / `@for`, application **zoneless** (sans zone.js).
- **État** : signals dans les services ; pas de NgRx. `ThemeService` (clair / sombre / système) et
  `LanguageService` dans `core/`, préférences mémorisées dans `localStorage`.
- **Styles** : **Tailwind 3.4** (le markup et les 672 lignes de `@apply` de Vristo sont écrits pour la v3,
  supportée par `@angular/build` 22). Passage à la v4 : ADR séparé, plus tard.
- **i18n** : **@ngx-translate/core 18**, bascule à chaud sans rechargement, fichiers dans `public/i18n/`.
  Langues : voir ADR-005.
- **Primitives d'interface** : **@angular/cdk** (Dialog, Menu, Overlay). headlessui-angular,
  ngx-scrollbar et @angular/animations sont abandonnés (scroll natif, `animate.enter` / `animate.leave`).
- **Personnaliseur de thème Vristo supprimé** : menu vertical fixe, layout pleine largeur, navbar
  collante ; seule la bascule clair / sombre est proposée (header).
- **Rendu** : on garde l'apparence Vristo, avec la charte DAARA (primaire vert `#1a6b3c`, secondaire or
  `#C9A84C`, alias `accent`) et les améliorations validées en sprint 0 (palette complète, mode sombre
  teinté vert, lisibilité mobile, focus visible). Police Nunito auto-hébergée (`@fontsource/nunito`).
- **Tests** : **Vitest** (builder `@angular/build:unit-test`) ; Playwright pour l'e2e (sprint 5).
- **Composants de la référence** : copiés au cas par cas, convertis en standalone + signals ; toute
  librairie tierce est vérifiée en zoneless avant d'être ajoutée.
- **Node 24 LTS** sur le poste, en CI et sur Cloudflare Pages.

## Conséquences
+ Socle aligné sur les règles, moins de dépendances, bundle plus léger, détection de changements prévisible.
+ Markup Vristo réutilisable tel quel (Tailwind 3, pipe `translate`, variantes `ltr:` / `rtl:` conservées).
− Chaque composant repris de la référence demande une conversion (NgModule → standalone).
− Tailwind 3 est en maintenance : migration v4 à prévoir avant qu'elle ne devienne contrainte.
− Les librairies de la référence liées à zone.js (graphiques, dates) devront être remplacées ou adaptées.
− Licence Vristo : la licence Regular ne couvre pas un produit dont l'accès est payant. Avant R4 :
  licence Extended, accord de l'auteur, ou remplacement du CSS propre à Vristo (voir PROGRESS.md).
