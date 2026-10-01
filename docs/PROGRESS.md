# Journal d'avancement

> À mettre à jour à la FIN de chaque session / tâche, avant le commit.
> Format : date, fait, décisions, problèmes ouverts, prochaine étape.

## État actuel
- Sprint en cours : 0 — Installation (voir docs/SPRINTS.md)
- Dernière tâche terminée : S0.6 — ESLint, Prettier, CI GitHub Actions (job front rejoué localement : vert)
- Problèmes ouverts :
  - Licence Vristo : vérifier le type (Regular ou Extended). La Regular ne couvre pas un produit à accès
    payant → à régler avant R4 (Extended, accord de l'auteur, ou remplacement du CSS propre à Vristo).
  - Page `/dev/charte` (charte + démonstration `shared/ui`) à retirer (route + `features/dev-charte/`)
    dès que la charte est validée par le développeur.
  - Pas encore d'icônes PNG (apple-touch-icon, PWA) : à générer depuis le logo avec la PWA (sprint 8).
  - S0.7 : les fichiers `public/i18n/*.json` ne sont pas hachés → en-tête `Cache-Control: no-cache` à prévoir
    dans `_headers`, sinon des navigateurs garderont d'anciennes traductions après un déploiement.
  - Formats de date et de nombre (fr / en, fuseau `Africa/Dakar`) : à traiter avec le premier écran qui
    affiche des dates (pipe localisé basé sur `LanguageService`).
  - CI : jobs `base` (pgTAP) et `secrets` (gitleaks en mode git) jamais exécutés sur GitHub → vérifier le
    premier run après le push ; le job `front` a été rejoué localement à l'identique.

## Prochaine étape
S0.7 — Cloudflare Pages : `public/_redirects` (fallback SPA), `public/_headers` (CSP, HSTS, no-cache sur
`/i18n/*`), `docs/deploiement.md` ; branchement du dépôt par le développeur. Puis S0.8 → S0.10.

### Plan du sprint 0 (validé le 2026-10-01)
| Story | Contenu |
|---|---|
| S0.1 | Socle Angular 22 + nettoyage structurel (suppression NgRx, store, personnaliseur, démo, drapeaux, images, icônes inutilisées) |
| S0.2 | Identité DAARA : charte (palettes vert/or 50→900), mode sombre teinté vert, sidebar (actif vert + barre or), base 15 px, cibles 44 px, focus visible AA, Nunito via `@fontsource/nunito`, logo, favicon, page de référence de la charte (dev uniquement, retirée après validation) |
| S0.3 | i18n fr/en (ngx-translate 18, `LanguageService`, `public/i18n/`) |
| S0.4 | `shared/ui` : page-header, empty-state, badge, confirm-dialog (CDK Dialog), squelettes de chargement, formulaires harmonisés |
| S0.5 | Supabase local (`supabase init`), `SupabaseService`, environnements (`scripts/set-env.mjs`), pgTAP minimal |
| S0.6 | ESLint (angular-eslint), Prettier 3, CI GitHub Actions (lint, tests, pgTAP, build, gitleaks, npm audit) |
| S0.7 | Cloudflare Pages : `_redirects`, `_headers` (CSP, HSTS), `docs/deploiement.md` |
| S0.8 | Projets Supabase cloud + SMTP (manuel, développeur) — checklist dans `docs/deploiement.md` |
| S0.9 | Workflows planifiés : `pg_dump` chiffré → R2 (rétention 30 j), anti-pause |
| S0.10 | Sentry (`sendDefaultPii: false`, nettoyage `beforeSend`) |
Reportés : écran de connexion « cover » avec motif géométrique (sprint 1), barre de navigation basse en
mobile pour parents/apprenants (sprint 2), tableaux → cartes sous 640 px (sprint 3, `data-table`).

## Historique
### 2026-10-01 — S0.6 Qualité et CI
- ESLint 10 via `ng add angular-eslint` (22.5) : règles recommandées TS + templates + accessibilité ;
  ajoutées : OnPush obligatoire, `no-explicit-any`, control flow obligatoire, `no-console` (sauf warn/error).
  Préfixe `icon-` autorisé (icônes Vristo) ; `header[appHeader]` / `footer[appFooter]` justifiés en commentaire ;
  `database.types.ts` exclu.
- Prettier 3 + `prettier-plugin-tailwindcss` 0.8 (tri des classes, compatible Tailwind 3 vérifié) ; Markdown,
  `.claude/` et fichiers générés exclus ; 16 fichiers reformatés sans changement fonctionnel.
- gitleaks 8.30 : `.gitleaks.toml` = règles par défaut + règle `supabase-secret-key` (sb_secret_, absente des
  règles par défaut) + exception limitée à la clé publishable locale. Contrôle : un fichier piégé est détecté.
  Constat : `supabase/.temp/` contient les vraies clés locales (dont service_role) → l'exclusion Git est vitale.
- `.github/workflows/ci.yml` : jobs parallèles `front` (format, lint, tests, build, npm audit high),
  `base` (`supabase db start` + `supabase test db`), `secrets` (gitleaks sur tout l'historique) ;
  actions checkout v7 / setup-node v7, Node 24, droits `contents: read`, aucun secret requis.
- Definition of Done : lint, format et CI verts ajoutés.

### 2026-10-01 — S0.5 Supabase local et environnements
- `@supabase/supabase-js` 2.117 (dépendance) et CLI `supabase` 2.119 (devDependency, binaire fourni sans
  script d'installation) ; scripts `npm run db:start|db:stop|db:reset|db:test|db:types`. Pas de script
  `db:push` : les migrations distantes restent manuelles (règle 7).
- `supabase init` : Postgres 17 ; Auth local aligné sur la prod (site `localhost:4200`, confirmation
  d'e-mail, mot de passe ≥ 8 avec lettres et chiffres, changement de mot de passe sécurisé) ; analytics et
  vector désactivés pour alléger la pile locale ; e-mails locaux dans Mailpit (http://127.0.0.1:54324).
- Test pgTAP `000_garde_fous` : toute table de `public` a la RLS activée et au moins une politique
  (vérifié : une table sans RLS est bien détectée).
- `SupabaseService` (client unique typé `Database`, `verifierConnexion()`), diagnostic non bloquant au
  démarrage en développement ; `database.types.ts` généré et formaté.
- Environnements : `environment.ts` (local, clé publishable locale) et `environment.prod.ts` généré par
  `scripts/set-env.mjs` (prebuild). Testé : refus des clés service_role / sb_secret_, des URL http distantes
  et des variables manquantes sur Cloudflare.
- Bundle initial : 136 kB transférés (+49 kB, supabase-js requis dès le démarrage pour l'auth) ; seuil
  d'avertissement du budget porté de 500 à 650 kB bruts (erreur toujours à 1 Mo).
- Vérifié dans le navigateur : `auth/v1/health` → 200 depuis l'app, sans erreur CORS.

### 2026-10-01 — S0.4 Composants shared/ui
- `@angular/cdk` 22 ajouté (prévu par ADR-004) ; `overlay-prebuilt.css` dans les styles du build.
- `app-page-header` (fil d'Ariane Vristo, titre h1, actions projetées), `app-empty-state`, `app-badge`
  (7 variantes), `app-skeleton` (annoncé aux lecteurs d'écran, animation coupée si mouvement réduit),
  `app-form-field` + directive `appFormControl` (libellé relié, astérisque déduit de `Validators.required`,
  aide, erreur traduite après `touched`, erreur serveur prioritaire, `aria-invalid` / `aria-describedby`),
  `ConfirmDialogService.confirmer()` (CDK Dialog : `alertdialog`, focus sur « Annuler », Échap, focus restauré).
- Accessibilité : les couleurs d'état Vristo échouent en AA avec du texte blanc (2,3 à 3,7) → teintes `strong`
  (texte sur fond clair, boutons pleins) et `danger-soft` (sombre) ajoutées ; boutons `btn-success|danger|
  warning|info` et badges outline corrigés ; badges « doux » mesurés ≥ 4,7 en clair et en sombre.
- Traductions `commun.*`, `formulaire.erreurs.*`, `layout.fil_ariane`. Dashboard utilise `app-page-header`.
- `/dev/charte` montre tous les composants en situation (formulaire validé, modale, squelette).
- Vérifié dans le navigateur : erreurs de formulaire, modale, fermeture par Échap. 39 tests verts.

### 2026-10-01 — S0.3 i18n fr/en
- `@ngx-translate/core` et `http-loader` 18 ; traductions dans `public/i18n/fr.json` et `en.json`.
- `LanguageService` (signals `langue`, `autreLangue`) : bascule sans rechargement, `<html lang>`, mémorisé ;
  traductions chargées dans un initialiseur avant le premier rendu (pas d'affichage de clés brutes).
- `TranslatedTitleStrategy` : `title` des routes = clé de traduction, titre d'onglet retraduit au changement de langue.
- `DevMissingTranslationHandler` : clé manquante signalée dans la console en développement.
- Header : bouton FR/EN, libellé écrit dans la langue proposée (attribut `lang`). Plus aucun texte en dur
  dans les layouts ni la page dashboard (hors page `/dev/charte`, provisoire).
- Tests : `provideTranslateTesting()` (traductions réelles sans HTTP), test de parité des clés fr/en et de
  valeurs non vides. Conventions i18n ajoutées à `.claude/rules/angular.md`.
- Vérifié dans le navigateur : bascule FR → EN (sidebar, contenu, titre d'onglet), mémorisation après
  rechargement, aucune clé manquante en console. Bundle initial : 86 kB transférés (+9 kB).

### 2026-10-01 — S0.2 Identité DAARA
- Charte dans `tailwind.config.js` : primaire vert (palette 50→950), secondaire or (50→950, alias `accent`),
  jetons `page`, `muted`, `night-*` (mode sombre teinté vert, remplace le bleu nuit Vristo).
- Contrastes mesurés : vert sur blanc 6,5 ; or sur blanc 2,3 (interdit en texte) ; vert #1a6b3c sur fond
  sombre 2,7 → `--color-primary` passe à #4caf7a en mode sombre (7,0) et `on-primary` devient foncé.
- Sidebar : élément actif sur fond vert clair + barre or. Base 15 px (`text-body`), champs en 16 px en
  mobile (évite le zoom iOS), boutons et champs ≥ 44 px en mobile (`max-sm:min-h-11`, `icon-btn`).
- Focus clavier visible (contour vert) hors des couches Tailwind pour primer sur `outline-none` de Vristo.
- Police Nunito auto-hébergée (`@fontsource-variable/nunito`, devDependency) : plus d'appel à Google Fonts.
- Logo DAARA (`public/images/logo.svg`, favicon SVG) nettoyé : métadonnées C2PA (~8 Ko) et taille fixe retirées.
- Page `/dev/charte` (développement uniquement : `ngDevMode` → route et chunk absents en production).
- Correspondance couleurs Vristo → jetons DAARA documentée dans `.claude/rules/ui-vristo.md`.
- Vérifié dans le navigateur : clair, sombre, logo, élément actif de la sidebar. Build et 13 tests verts.

### 2026-10-01 — S0.1 Socle Angular 22
- Projet recréé en Angular 22.2 / TypeScript 6.0 : standalone, OnPush, zoneless, builder `application`,
  Vitest (`npm test`, `npm run test:ci`). Tailwind 3.4.19 détecté automatiquement par `@angular/build`.
- Supprimés : AppModule, NgRx, AppService, theme.config, personnaliseur, 16 langues, 265 drapeaux,
  images de démo, 135 icônes, animate.css, headlessui-angular, ngx-scrollbar, @angular/animations, Karma.
- Styles Vristo repris dans `src/styles.css` (386 lignes) sans menus horizontal/repliable, boxed ni styles
  de librairies non utilisées. Scroll natif dans la sidebar.
- `ThemeService` (clair / sombre / système, mémorisé), `LayoutService` (sidebar), layouts app et auth,
  header (logo, burger, thème), sidebar (Tableau de bord), footer, page dashboard provisoire.
- Icônes : 6 icônes Vristo converties en standalone (`shared/icon/`), même mécanisme que le thème.
- Bundle initial : 269 kB brut / 73 kB transféré.
- Provisoire : libellés en dur en français (traduits en S0.3), logo/favicon Vristo et Google Fonts (S0.2).
- Pièges : supprimer `node_modules` avant `npm install` après une montée de version majeure (conflit de
  peer deps avec les anciens paquets) ; npm 11 bloque les scripts d'installation (esbuild, lmdb,
  msgpackr-extract, @parcel/watcher) — sans impact constaté sur build et tests.
- Non vérifié par Claude : rendu en 375 px (redimensionnement du navigateur impossible) → à contrôler à la main.

### 2026-10-01 — Analyse du starter et décisions d'architecture
- Starter : Angular 15.2 (fin de support), NgModules, NgRx, zone.js, ngx-translate 14, headlessui-angular
  (abandonné), 16 langues, 265 drapeaux, 141 icônes, header/sidebar de démo, `bypassSecurityTrustHtml`
  dans le header, config de test cassée. Dernières versions : Angular 22.2, TypeScript 6.0 (exigée par Angular 22).
- ADR-004 : projet Angular 22 neuf (zoneless, standalone, signals, CDK, Vitest), Tailwind 3.4 gardée,
  personnaliseur de thème supprimé, charte vert (primaire) / or (secondaire).
- ADR-005 : interface en français et anglais, pas de RTL en V1 (classes `ltr:`/`rtl:` conservées).
- HLD, LLD (§2, §9), SPRINTS (DoD), règles et skills alignés sur ces décisions.
- Piège : Angular 22 exige Node `^22.22.3 || ^24.15` → Node 24 LTS sur le poste (fait), en CI et sur Cloudflare.

### [date] — Initialisation
- Kit Claude Code (CLAUDE.md, rules, skills, agents, hooks) ajouté
- Starter Vristo copié comme base, thème complet hors dépôt dans `C:/projets/vristo-reference/` (lecture seule)
- Choix zéro abonnement (ADR-003)
