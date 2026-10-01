---
paths:
  - "src/**/*.html"
  - "src/**/*.scss"
  - "src/**/*.css"
  - "tailwind.config.*"
---
# Règles UI (thème Vristo)

- Base du projet : starter Vristo. Référence : thème complet hors dépôt dans `C:/projets/vristo-reference/`
  (lecture seule).
- Avant de créer un composant UI, chercher son équivalent dans `C:/projets/vristo-reference/src` et réutiliser
  son markup et ses classes Tailwind. N'en copier que les éléments nécessaires, au cas par cas.
  Ne pas inventer un style différent du thème.
- Charte DAARA : couleur primaire `#1a6b3c` (vert), secondaire / accent `#C9A84C` (or). Configurées une seule fois
  dans la config Tailwind / variables du thème, jamais en dur dans les templates.
- Or : jamais en couleur de texte sur fond clair (contraste 2,3). Sur fond clair : `text-secondary-700` ;
  texte posé sur un fond or : `text-primary-950`. Boutons pleins primaires : `text-on-primary` (pas `text-white`).
- Markup copié de la référence : remplacer les couleurs codées en dur par les jetons DAARA :

  | Vristo | DAARA |
  |---|---|
  | `#fafafa` (fond de page) | `page` |
  | `#060818` | `night-deep` |
  | `#0e1726` (panneaux, sidebar, header) | `night` |
  | `#121e32` (champs) | `night-input` |
  | `#181f32` (survol) | `night-hover` |
  | `#1b2e4b`, `#1a2941` (menus, en-têtes de tableau) | `night-raised` |
  | `#17263c`, `#191e3a` (bordures) | `night-border` |
  | `#253b5c`, `#2d334c` | `night-border-strong` |
  | `#506690` (texte secondaire) | `muted` / `dark:text-night-muted` |
  | `#e0e6ed`, `#d0d2d6` | `white-light` |
  | `text-white` sur `bg-primary` | `text-on-primary` |
- Boutons ronds à icône : classe `icon-btn` (zone tactile de 44 px en mobile).
- Couleurs d'état (success, danger, warning, info) : en texte sur fond clair, `text-{couleur}-strong` ;
  en sombre, `dark:text-{couleur}` (danger : `dark:text-danger-soft`). Les boutons `btn-success|danger|warning|info`
  sont déjà corrigés. Jamais de `text-white` sur une couleur d'état de base (contraste < 4,5).
- Composants `src/app/shared/ui/` à utiliser plutôt que du markup recopié : `app-page-header`, `app-empty-state`,
  `app-badge` (statuts), `app-skeleton` (chargement), `app-form-field` + `appFormControl` (tout champ de
  formulaire), `ConfirmDialogService.confirmer()` (toute action destructrice). Leurs entrées texte sont
  déjà traduites. Démonstration : `/dev/charte` en développement.
- Le mode sombre doit fonctionner sur chaque écran. Garder les classes `ltr:` / `rtl:` du markup Vristo
  (pas de vérification RTL en V1, ADR-005).
- Ne pas copier les pages de démo inutiles (e-commerce, crypto, etc.) du thème complet.
- Tableaux de données : pagination, recherche et tri côté serveur (Supabase `range`, `ilike`, `order`).
- Mobile first : les parents utilisent surtout un téléphone ; vérifier chaque écran parent en 375px.
