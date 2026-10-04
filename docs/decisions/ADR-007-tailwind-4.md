# ADR-007 — Passage à Tailwind 4

Statut : acceptée (2026-10-04) · Remplace la partie « Styles » de l'ADR-004 (Tailwind 3.4)

## Contexte
- L'ADR-004 gardait Tailwind 3.4 pour réutiliser tel quel le markup et les `@apply` de Vristo, en notant :
  « Tailwind 3 est en maintenance : migration v4 à prévoir avant qu'elle ne devienne contrainte ».
- Fin du sprint 1 : un avis de sécurité (`braces`, GHSA-vfj7-8cjw-p6xm, 5 alertes « high ») touche les dépendances
  de développement de Tailwind 3 (chokidar, micromatch), sans version corrigée en v3. L'étape
  `npm audit --audit-level=high` de la CI devient rouge. Non exploitable (outil de build), mais la seule issue
  durable est la v4.
- Le projet ne compte encore que l'authentification et la page de charte : le moment le moins coûteux pour migrer.

## Décision
- **Tailwind 4.3** via `@tailwindcss/postcss` (`.postcssrc.json`), pris en charge nativement par Angular 22.
- **Configuration en CSS** dans `src/styles.css` (plus de `tailwind.config.js`) :
  - `@theme` : charte vert / or et alias `accent`, couleurs d'état, `night-*`, `page`, `muted`, police Nunito,
    taille `body` (15 px), ombre `3xl`, gris de Tailwind 3 conservés (la v4 les a recolorés) ;
  - `@theme inline` pour `primary`, `primary-dark-light` et `on-primary` : ils lisent les triplets RGB
    `--daara-primaire` / `--daara-sur-primaire`, redéfinis par `.dark` (vert éclairci en mode sombre). Ces
    variables s'appelaient `--color-primary` / `--color-on-primary`, nom désormais réservé au thème Tailwind ;
  - `@custom-variant dark` : mode sombre par la classe `dark` sur `<body>` (inchangé) ;
  - couche `base` de compatibilité : bordure par défaut gris 200, placeholder gris 400, curseur main sur les boutons
    (préflight v3).
- **`@tailwindcss/forms` retiré** : en v4, le plugin place ses styles dans la couche `utilities`, où ils écrasent les
  surcharges Vristo de `.form-input`. Ses règles de base (stratégie « class », MIT) sont reprises telles quelles dans
  la couche `components`, avant les surcharges : même ordre qu'en v3, une dépendance de moins.
- **`@tailwindcss/typography` retiré** : inutilisé (aucune classe `prose`).
- **Styles de composant** : CSS standard avec les variables du thème (`var(--color-…)`), sans `@apply`. En v4,
  `@apply` dans un style encapsulé exige `@reference` et développe chaque utilitaire avec des valeurs de repli.
- **Classes renommées** (v3 → v4) : `shadow-sm` → `shadow-xs`, `shadow` → `shadow-sm`, `rounded-sm` → `rounded-xs`,
  `rounded` → `rounded-sm`, `outline-none` → `outline-hidden`, `ring` → `ring-3`, `flex-shrink-0` → `shrink-0`,
  `flex-grow` → `grow` ; modificateur important en suffixe (`!mb-0` → `mb-0!`). Table tenue dans
  `.claude/rules/ui-vristo.md` pour tout markup repris de Vristo (qui reste en v3).
- Pas d'outil `@tailwindcss/upgrade` : il exécute des commandes git, interdites à Claude ; migration faite à la main.

## Vérification
- Styles calculés relevés avant / après sur 11 pages (connexion, inscription, code, mot de passe oublié, mfa,
  tableau de bord, charte ; clair et sombre) et comparés propriété par propriété : rendu identique. Écarts restants
  sans effet visible : notation `oklab` des couleurs translucides, couches d'ombre transparentes, contour `none` au
  lieu de transparent (le focus clavier, hors couches, est inchangé), marges de `space-y` inversées, interligne
  d'un lien de 13,5 px (19,3 px au lieu de 20 px).
- Couleurs calculées inchangées : les contrastes AA mesurés au sprint 0 restent valables.
- `npm audit` : 0 vulnérabilité (dépendances de développement comprises) ; l'étape d'audit de la CI reste bloquante.

## Navigateurs
| | Chrome / Edge | Firefox | Safari / iOS |
|---|---|---|---|
| Angular 22 (« Baseline widely available » au 2026-05-07) | 119 | 119 | 17 |
| Tailwind 4 | 111 | 128 | 16.4 |

Tailwind 4 ne restreint presque rien de plus qu'Angular 22 (Firefox 119-127 sur ordinateur, marginal).
**Angular 22 exclut déjà les iPhone bloqués en iOS 16** (iPhone 8, iPhone X) : point à suivre avec les daaras
pilotes (parents sur téléphones anciens), indépendant de ce choix.

## Conséquences
+ Plus de dépendance de build vulnérable sans correctif ; version maintenue de Tailwind.
+ Configuration du thème lisible en CSS, au même endroit que les styles globaux ; deux plugins en moins.
+ Moteur de build plus rapide (Oxide).
− Le markup copié de Vristo (v3) doit passer par la table de renommage avant d'être utilisé.
− Chargement initial : 614 kB bruts au lieu de 584 (les couleurs du thème sont déclarées en variables CSS),
  144,7 kB transférés au lieu de 142.
