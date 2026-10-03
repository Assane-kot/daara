# Journal d'avancement

> À mettre à jour à la FIN de chaque session / tâche, avant le commit.
> Format : date, fait, décisions, problèmes ouverts, prochaine étape.

## État actuel
- Sprint en cours : 0 — Installation, **code terminé** (bilan ci-dessous, 2026-10-03) ; clôture effective
  après les configurations manuelles du développeur. Sprint suivant : 1 — Socle multi-tenant.
- Sprint 1 : **code terminé** (S1.1 à S1.6) : socle multi-tenant (base) puis authentification et onboarding (front).
- Dernière tâche terminée : authentification (inscription, connexion, code e-mail, mot de passe oublié, TOTP,
  onboarding) avec le design « cover » validé, parcours complet vérifié dans le navigateur (2026-10-03).
- Problèmes ouverts :
  - Licence Vristo : vérifier le type (Regular ou Extended). La Regular ne couvre pas un produit à accès
    payant → à régler avant R4 (Extended, accord de l'auteur, ou remplacement du CSS propre à Vristo).
  - Page `/dev/charte` (charte + démonstration `shared/ui`) à retirer (route + `features/dev-charte/`)
    dès que la charte est validée par le développeur.
  - Pas encore d'icônes PNG (apple-touch-icon, PWA) : à générer depuis le logo avec la PWA (sprint 8).
  - À faire par le développeur, dans cet ordre : S0.8 (`docs/deploiement.md` §2 : projets `daara-dev` /
    `daara-prod`, Auth, Brevo, tests d'envoi), puis S0.7 (§1 : branchement Cloudflare Pages). Sans
    `SUPABASE_URL` / `SUPABASE_ANON_KEY`, le build Cloudflare échoue volontairement.
  - Nom de domaine (DKIM / DMARC pour Brevo, puis domaine de l'app) : dépense annuelle à décider, au plus
    tard avant le pilote R1 (ADR-003).
  - Formats de date et de nombre (fr / en, fuseau `Africa/Dakar`) : à traiter avec le premier écran qui
    affiche des dates (pipe localisé basé sur `LanguageService`).
  - CI : jobs `base` (pgTAP) et `secrets` (gitleaks en mode git) jamais exécutés sur GitHub → vérifier le
    premier run après le push ; le job `front` a été rejoué localement à l'identique.
  - Sauvegardes : configuration à faire par le développeur (`docs/deploiement.md` §4 : clé age, bucket R2,
    rôle `keepalive`, secrets GitHub) puis premier lancement manuel ; workflows planifiés actifs à partir de R0.
  - Fichiers du Storage (photos d'apprenants, PDF) non couverts par la sauvegarde → à traiter au sprint 4.
  - Sentry : organisation en région UE, projet `daara-front`, `SENTRY_DSN` dans Cloudflare
    (`docs/deploiement.md` §5) ; source maps non envoyées (traces minifiées), à voir au sprint 12.
  - ADR-006, reste à faire au sprint 2 : réinitialisation assistée par l'admin (niveau 2) ; second facteur TOTP
    et codes de secours (disponibles mais **expérimentaux** dans supabase-js 2.117 / Auth 2.197 : à décider avec la
    procédure super-admin de retrait d'un facteur).
  - À faire par le développeur avant la preview : widget Turnstile, variable `TURNSTILE_SITE_KEY` dans Cloudflare,
    clé secrète Turnstile, TOTP, expiration des codes à 30 min et modèles d'e-mail dans les deux projets Supabase
    (`docs/deploiement.md` §1.2, §2.2, §2.4 étape 6, §2.6).
  - Audit de l'authentification (2026-10-03), points reportés :
    - AVANT le sprint 2 (invitations, changement d'e-mail) : modèles `magic_link`, `email_change`, `invite`,
      `reauthentication` encore ceux de Supabase (avec lien) → modèles code seul fr / en ;
    - AVANT le sprint 3 (décision) : `is_member` n'exige pas `aal2` ; un admin avec TOTP dont seul le mot de passe
      est compromis reste « membre » en `aal1` (lecture de sa daara). Toute politique future fondée sur `is_member`
      s'ouvrirait sans second facteur → par ex. `aal2` exigé si l'utilisateur a un facteur vérifié ou est admin ;
    - sprint 2 : un admin invité sans facteur peut être devancé à l'enrôlement TOTP par qui détient son mot de passe ;
    - sprint 12 : verrouillage par compte des codes e-mail ; énumération résiduelle par limite de fréquence (LLD §7.0).
  - Audit du socle (2026-10-03), points reportés :
    - sprint 2 : les Edge Functions écriront `memberships` en service_role → `audit_log.user_id` nul ; transmettre
      l'auteur (ex. `set_config` lu par `audit_trigger`) ;
    - sprint 2 : le claim `aal2` reste valable jusqu'à l'expiration du JWT (1 h) après retrait d'un facteur TOTP →
      révoquer les sessions dans la procédure de retrait (journalisée) ;
    - AVANT le sprint 5 (ADR) : `audit_trigger` copie les lignes entières, sans durée de conservation, et les
      lignes d'une daara ou d'un utilisateur supprimés restent (effacement CDP) → colonnes exclues ou diff,
      purge planifiée et purge à la suppression d'une daara ;
    - sprint 4 (exports CSV / PDF) : neutraliser `= + - @` en tête de cellule (injection de formules) ;
    - sprint 12 : performance des politiques (`(select has_role(daara_id …))` dépend de la ligne).

## Prochaine étape
1. Développeur, pour clore le sprint 0 : configurations de `docs/deploiement.md` dans l'ordre §2 (Supabase +
   Brevo) → §1 (Cloudflare) → §5 (Sentry) → §4 (sauvegardes) ; premier run de la CI sur GitHub ; validation de
   `/dev/charte` (puis retrait de la page) ; tag de sprint `s0` sur `develop`.
2. Sprint 1 : code terminé (commit de l'authentification à faire par le développeur). Clôture : bilan du sprint,
   vérification en 375 px par le développeur, tag `s1`. Puis sprint 2 (membres et navigation) : planification.

### Décisions de planification du sprint 1 (validées le 2026-10-03)
- Confirmation d'e-mail par code à 6 chiffres (pas de lien), comme la réinitialisation ; codes valables 30 min.
- Enrôlement TOTP avant la création de la daara : `creer_daara` exige `aal2` ; 3 daaras créées max par utilisateur.
- Aucune écriture directe du client sur `memberships` (évite qu'un admin s'attache un inconnu et lise son
  profil) ; modification / désactivation au sprint 2.
- Cloudflare Turnstile (gratuit) sur inscription et mot de passe oublié, pour protéger le quota Brevo.
- Rôle en enum Postgres `role_membre`.

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
### 2026-10-03 — Sprint 1 : authentification et onboarding (S1.4, S1.5, S1.6)
- Design « cover » validé sur maquette : panneau vert profond, motif géométrique or animé (étoile à 8 branches du
  logo, mouvement coupé si réduction des animations), exemples de la vie d'une daara ; formulaire à droite ; mobile :
  bandeau puis formulaire. Mode sombre et fr / en.
- Supabase local : TOTP activé, codes e-mail de 6 chiffres valables 30 min, modèles `confirmation` / `recovery`
  bilingues (code seul, sans lien, uniquement `{{ .Token }}` et `{{ .Data.langue }}`), Turnstile (clés de test).
- Front : client en flux PKCE (`detectSessionInUrl: false`) ; `AuthService` (session en signals, destination après
  connexion, rôles en cache) ; guards `authGuard`, `anonymeGuard`, `mfaGuard`, `avecDaaraGuard`, `sansDaaraGuard` ;
  pages `/auth/connexion`, `inscription`, `confirmation`, `mot-de-passe-oublie`, `mfa`, `/onboarding` ;
  `app-mfa-panel` (enrôlement QR + clé, vérification), `app-code-otp` (6 cases, collage, remplissage auto),
  `app-turnstile` (script chargé à la demande), validateurs mot de passe / code / slug ; menu du compte (CDK Menu)
  avec déconnexion. 6 icônes Vristo ajoutées. Aucun paquet npm ajouté.
- Vérifié dans le navigateur (Supabase local + Mailpit) : inscription → code e-mail → enrôlement TOTP → création de
  la daara → tableau de bord ; déconnexion ; mauvais mot de passe (message neutre, Turnstile réinitialisé) ;
  reconnexion admin → code TOTP ; mot de passe oublié sur compte TOTP (`insufficient_aal` → code TOTP → mot de passe
  changé) ; mode sombre ; build de production servi avec la CSP réelle : Turnstile chargé, aucune violation.
- Constats en cours de route :
  - Supabase exige le jeton Turnstile aussi sur la connexion → widget ajouté à la connexion (LLD §7.0 corrigé) ;
  - Supabase exige `aal2` pour changer le mot de passe d'un compte avec TOTP → étape TOTP dans le mot de passe oublié ;
  - guards : `inject()` après un `await` sort du contexte d'injection (navigation bloquée sans erreur visible) ;
  - bug du sprint 0 corrigé : le build de production sans variables plantait (`supabaseUrl is required`) car
    `environment.prod.ts` importait `./environment`, remplacé par lui-même au build → valeurs locales déplacées dans
    `environment.local.ts` ;
  - les outils d'écriture de Claude transforment les séquences d'échappement Unicode (antislash-u) en caractères
    réels : des caractères bidirectionnels invisibles s'étaient glissés dans la migration du socle (déjà commitée,
    jamais appliquée hors du local), le test d'isolation et `slug.ts` → remplacés par des échappements, 123 tests
    pgTAP toujours verts.
- Bundle initial : 584 kB bruts / 142 kB transférés (layouts chargés à la demande ; CDK Menu dans le chunk de
  l'espace connecté). 119 tests unitaires (21 fichiers).
- Docs : LLD §2 et §7.0, spec `authentification.md`, `docs/deploiement.md` (Turnstile §2.6, TOTP, codes, modèles,
  CSP, variable `TURNSTILE_SITE_KEY`).
- Audit `auditeur-securite` : 0 critique, 3 importants corrigés :
  1. énumération de comptes à l'inscription (`user_already_exists` affichait une erreur) → même parcours qu'une
     adresse libre ;
  2. « Renvoyer le code » toujours refusé (Supabase exige Turnstile sur `resend`) → widget sur l'écran du code ;
  3. quota Brevo épuisable depuis `daara-dev` avec les clés Turnstile de test → clés de test refusées sur tout
     build Cloudflare, `daara-dev` limité à 5 e-mails / h, quotas Brevo séparés (`docs/deploiement.md` §2.4, §2.6).
  Mineurs corrigés : toutes les clés de test Turnstile filtrées, jeton consommé jamais renvoyé, échec de chargement
  de Turnstile non mis en cache. Reportés : voir « Problèmes ouverts ».

### 2026-10-03 — Sprint 1 : socle multi-tenant, partie base (S1.1, S1.2, S1.3, S1.6 côté base)
- Migration `securite_socle` : `anon` sans aucun droit ; TRUNCATE / REFERENCES / TRIGGER / MAINTAIN et séquences
  retirés à `authenticated` ; `alter default privileges for role postgres revoke execute on functions from public`
  **global** (la forme `in schema` ne retire pas le droit de PUBLIC : vérifié).
- Migration `socle_multi_tenant` : enum `role_membre`, `daaras`, `profiles`, `memberships`, `audit_log`,
  `platform_admins` ; helpers `is_member`, `has_role` (admin seulement en `aal2`), `membres_administres()`,
  `is_platform_admin()` ; triggers `handle_new_user`, `set_updated_at`, `audit_trigger` ; RPC `creer_daara`
  (`aal2`, 3 daaras max, verrou consultatif contre la concurrence) ; droits par colonne.
- Tests : `000_garde_fous` (15 : RLS, politiques, vues, `search_path = ''`, tables étrangères, extensions,
  `daara_id` + index + clé étrangère, liste blanche des fonctions `authenticated`, séquences, `anon`) ;
  `001_socle_isolation` (108 : 2 daaras, 4 rôles, admin désactivé, super-admin, sans daara, `anon`). 123 verts.
- Audits `auditeur-rls` et `auditeur-securite` : 0 critique, 0 important, aucune fuite inter-daara ni escalade.
  Mineurs corrigés : privilèges par défaut des fonctions (global) et des séquences ; contraintes contre les
  caractères de contrôle / invisibles / bidirectionnels (usurpation de nom) ; `logo_path` / `avatar_path` limités
  à `<id>/<fichier>.<ext>` ; slugs réservés ; `creer_daara` renvoie `23514` pour toute donnée invalide ; lecture des
  profils par l'admin évaluée une fois par requête ; garde-fous et cas d'isolation complétés.
- Décisions (validées) : l'enseignant ne voit que les memberships des enseignants de sa daara ; l'admin ne lit plus
  le profil d'un membre désactivé (`membres_administres()` remplace `est_admin_de_membre`) ; migrations non
  commitées corrigées en place. LLD §3.2 et §4, spec et `.claude/rules/supabase-rls.md` mis à jour.
- Contre-épreuve : une fonction créée sans `grant` n'est plus exécutable par `anon` ; elle reste exécutable par
  `authenticated` (privilège par défaut de Supabase) → détectée par la liste blanche.

### 2026-10-03 — Bilan du sprint 0 (Installation)
**Objectif** : un projet propre qui tourne, avec l'outillage en place. **Côté code : atteint.** Livrable « en
ligne sur Cloudflare Pages » en attente des configurations manuelles (comptes Supabase, Cloudflare, Sentry, R2).

| Story | État |
|---|---|
| S0.1 Socle Angular 22, nettoyage du starter | Fait |
| S0.2 Identité DAARA (charte, mode sombre, logo, police) | Fait — `/dev/charte` à valider puis retirer |
| S0.3 i18n fr/en | Fait |
| S0.4 Composants `shared/ui` | Fait (+ squelette, form-field accessible) |
| S0.5 Supabase local, `SupabaseService`, environnements | Fait |
| S0.6 ESLint, Prettier, CI GitHub Actions | Fait — premier run GitHub à vérifier |
| S0.7 Cloudflare Pages | Fichiers et procédure prêts — branchement par le développeur |
| S0.8 Supabase cloud + Brevo | Procédure prête — création par le développeur |
| S0.9 Sauvegarde chiffrée + anti-pause | Code testé en local de bout en bout — configuration et premier run à faire |
| S0.10 Sentry | Code testé sur build de production — DSN à configurer |
| Audit de sécurité | Clos : 0 critique, 0 important ouvert (4 importants corrigés et contre-vérifiés) |

**Chiffres** : Angular 22.2 zoneless ; 13 dépendances, 18 de développement, 0 vulnérabilité (`npm audit`) ;
55 tests unitaires (14 fichiers) + garde-fous pgTAP ; lint, format et scan de secrets verts ; chargement initial
138 kB transférés (Sentry 28 kB en différé) ; 6 ADR (004 à 006 créés ce sprint).

**Décisions** : projet Angular neuf plutôt que mise à niveau (ADR-004) ; interface fr/en sans RTL (ADR-005) ;
Brevo pour les e-mails (ADR-003) ; authentification et récupération d'accès en trois niveaux, TOTP obligatoire
pour les admins, mot de passe 8 caractères lettres + chiffres (ADR-006) ; tags de sprint `sN` sur `develop`,
tags de release `rN` sur `main`.

**Ce qui a bien marché** :
- vérifier chaque choix en conditions réelles (build de production servi avec la CSP, restauration de
  sauvegarde de bout en bout, fichiers piégés pour gitleaks) a fait remonter des problèmes invisibles en
  lecture : script inline bloqué par la CSP, rôles et schéma `storage` non restaurables, règles gitleaks
  absentes pour `sb_secret_`, Sentry v11 collectant tout par défaut, attributs envoyés dans le fil d'actions ;
- les mesures (contrastes AA, poids du bundle) ont guidé les choix plutôt que les impressions.

**À améliorer** :
- lancer l'audit de sécurité plus tôt (à chaque story qui touche aux secrets ou aux données) : ses 4 constats
  importants auraient été évités au moment de l'écriture ;
- vérifier l'affichage en 375 px reste manuel (redimensionnement impossible dans le navigateur piloté) : à
  prévoir dans les tests e2e Playwright (sprint 5) ;
- ne jamais glisser de commande `git` dans une vérification (bloquée à juste titre une fois).

**Pièges à retenir** : Node 24 requis ; supprimer `node_modules` après une montée de version majeure ;
npm 11 bloque les scripts d'installation (sans impact) ; PowerShell 5.1 (BOM UTF-8, sortie d'erreur des
commandes natives) ; R2 et sommes de contrôle de l'AWS CLI ; Session pooler (IPv4) obligatoire depuis GitHub.

### 2026-10-01 — Audit de sécurité du sprint 0 (agent `auditeur-securite`)
- Résultat : 0 critique, 4 importants, 9 mineurs, 3 informations ; `npm audit` : 0 vulnérabilité.
- Importants corrigés :
  1. clé age, archives et dumps pouvaient finir dans le dépôt → `.gitignore` complété, doc et script de
     restauration travaillent hors du dépôt (le script refuse un fichier situé dans le dépôt) ;
  2. environnement GitHub `production` ouvert à `develop` → limité à `main` ;
  3. clés R2 exposées à `npm ci` dans le job de sauvegarde → plus de `npm ci` (CLI Supabase seule), chaque
     secret limité à son étape ;
  4. attributs `aria-label` / `alt` / `title` / `name` envoyés à Sentry dans les clics → retirés (testé).
- Mineurs corrigés : jetons et sessions exclus des sauvegardes ; remise à zéro de la base locale après
  restauration ; règles gitleaks Postgres et Brevo ; actions épinglées par SHA, `persist-credentials: false`,
  Dependabot ; `interest-cohort` retiré ; `daara-dev` sans données réelles ; `keepalive` limité à 1 connexion.
- Mineurs reportés au sprint 1 : voir « Problèmes ouverts ».
- Contre-vérification : les 10 points clos ; 2 défauts introduits corrigés (attribut Sentry contenant « ] »,
  échec de remise à zéro non signalé dans le script). À surveiller au premier run anti-pause : si « too many
  connections for role keepalive » (Session pooler), passer `connection limit` à 2.

### 2026-10-01 — S0.10 Sentry
- `@sentry/angular` 11.2 (prévu par ADR-003). Sentry v11 remplace `sendDefaultPii` par `dataCollection`,
  dont les valeurs par défaut collectent utilisateur, cookies, en-têtes, paramètres d'URL, corps de requêtes
  et variables locales → tout désactivé explicitement.
- `core/errors/sentry.ts` : nettoyage avant envoi (e-mails, numéros ≥ 8 chiffres, UUID, JWT ; URL sans
  paramètres ni fragment, donc sans `#access_token` ni jeton d'invitation ; utilisateur, `extra` et détails
  de requête supprimés ; fil d'actions nettoyé). `core/errors/error-handler.ts` : console + Sentry.
- SDK chargé en différé via `sentry-sdk.ts` (imports nommés) : 28 kB hors chargement initial au lieu de
  124 kB (import complet) ou +28 kB au démarrage (import statique). Erreurs survenues avant le chargement
  mises en file (10 max).
- `set-env.mjs` : `SENTRY_DSN` facultatif, refusé s'il n'est pas de la région UE ; environnement
  `production` / `preview` déduit de la branche Cloudflare, version `daara@<commit>`. CSP : ajout de
  `https://*.ingest.de.sentry.io` uniquement.
- Vérifié sur un build de production servi avec la CSP : une erreur contenant un e-mail et un téléphone
  produit une seule enveloppe, message « [email] … [numéro] », sans utilisateur ni paramètres d'URL,
  environnement et version corrects ; aucune violation CSP. 53 tests verts.
- `docs/deploiement.md` §5 (création de l'organisation UE, scrubbing serveur, protection contre les pics) ;
  règle ajoutée à `.claude/rules/securite.md`.

### 2026-10-01 — S0.9 Sauvegardes et anti-pause
- `.github/workflows/sauvegarde.yml` : chaque nuit, `supabase db dump` de `daara-prod` (rôles, schéma,
  données `public` + `auth`), archive chiffrée avec la clé publique `age` (GitHub ne peut pas la relire),
  envoi vers R2 `daara-sauvegardes` ; rétention 30 jours par règle de cycle de vie R2. Secrets dans
  l'environnement GitHub `production`.
- `.github/workflows/anti-pause.yml` : `select 1` tous les deux jours sur les deux projets avec le rôle
  `keepalive`, sans aucun droit (vérifié : lecture des comptes et des tables refusée).
- Testé en local de bout en bout : données + compte réel → dump → chiffrement / déchiffrement `age` dans un
  conteneur Ubuntu 24.04 (comme la CI) → remise à zéro → restauration → comptes, identités, table, RLS et
  politiques retrouvés.
- Pièges trouvés : `roles.sql` contient des réglages internes refusés au rôle `postgres` (appliqué à part,
  erreurs tolérées) ; les tables internes du schéma `storage` ne sont pas inscriptibles (données limitées à
  `public` + `auth`) ; PowerShell 5.1 bloque sur la sortie d'erreur des commandes natives et lit l'UTF-8
  sans BOM comme de l'ANSI.
- `scripts/restaurer-sauvegarde-locale.ps1` : déchiffre, restaure dans le Supabase local, contrôle, et
  supprime toujours les fichiers déchiffrés. Testé.
- `docs/deploiement.md` §4 : clé age, bucket et jeton R2 limités, chaînes Session pooler (IPv4), rôle
  `keepalive`, secrets GitHub, mise en service, restauration mensuelle et en cas d'incident.

### 2026-10-01 — S0.8 Supabase cloud et e-mails (procédure)
- Brevo retenu pour le SMTP (ADR-003, HLD mis à jour) : offre gratuite 300 e-mails / jour, société
  française, données dans l'UE.
- `docs/deploiement.md` §2 : double authentification sur tous les comptes, création de `daara-dev` /
  `daara-prod` (région Paris), réglages Auth identiques au local (confirmation d'e-mail, mot de passe ≥ 8
  lettres + chiffres), redirections strictes en production (aucun `localhost` ni preview), clés publishable
  vers Cloudflare et clés secrètes hors de tout dépôt, SMTP Brevo, tests d'envoi, application des migrations.
- Décision à prendre : nom de domaine (seule dépense annuelle) pour authentifier l'expéditeur avant le pilote.

### 2026-10-01 — S0.7 Cloudflare Pages
- `public/_headers` : CSP stricte (`script-src 'self'`, connexions limitées à `*.supabase.co`), HSTS,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (tout désactivé), `no-cache` sur `/i18n/*`,
  `X-Robots-Tag: noindex` sur les previews. Origines justifiées dans `docs/deploiement.md` §3.
- Piège évité : l'inlining du CSS critique (Beasties) injecte un script inline → bloqué par la CSP, l'app
  s'afficherait sans styles. Désactivé (`optimization.styles.inlineCritical: false`) : plus aucun script inline.
- Pas de `_redirects` : sans `404.html`, Cloudflare Pages sert `index.html` pour toute route (mode SPA).
- `.node-version` (24). `docs/deploiement.md` : création du projet Pages, variables par environnement,
  preview limitée à `develop`, vérifications.
- Vérifié en servant le build de production avec les en-têtes de `_headers` : route profonde → app,
  styles, traductions et bascule de langue OK, aucune violation CSP.

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
