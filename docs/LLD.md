# LLD — Low Level Design · DAARA SaaS

Version 1.0 · Document vivant : chaque sprint détaille ici ce qu'il implémente AVANT de coder.
Les sections marquées « À détailler » le seront au sprint concerné.

## 1. Conventions
- SQL : snake_case, tables au pluriel, `id uuid default gen_random_uuid()`, `created_at timestamptz`.
- Toute table métier : `daara_id uuid not null`, index, RLS (voir `.claude/rules/supabase-rls.md`).
- Tables de référence globales (sans daara_id) : `sourates`, `offres` — lecture seule pour `authenticated`.
- TypeScript : types générés `database.types.ts`, aucun `any`.
- Dates stockées en UTC, affichées en `Africa/Dakar`.

## 2. Architecture Angular
```
src/app/
├── core/
│   ├── supabase/        supabase.service.ts, database.types.ts
│   ├── auth/            auth.service.ts, auth.guard.ts, role.guard.ts
│   ├── daara/           current-daara.service.ts, daara.resolver.ts
│   ├── i18n/            language.service.ts (fr, en), translated-title.strategy.ts — traductions dans public/i18n/{fr,en}.json
│   ├── theme/           theme.service.ts (clair / sombre / système)
│   ├── notifications/   notification-center.service.ts, push.service.ts
│   └── errors/          error-handler.ts (console + Sentry), sentry.ts (chargement différé, nettoyage des données
│                        personnelles), messages utilisateur (sprint 1)
├── shared/ui/           page-header, empty-state, badge, skeleton, form-field, confirm-dialog (S0.4) ; data-table (S3), stat-card
├── layouts/             auth-layout, app-layout (menu selon rôle), layout.service.ts (état de la sidebar)
└── features/
    ├── auth/            connexion, inscription, mot de passe, acceptation d'invitation
    ├── onboarding/      création de daara, sélection de daara
    ├── membres/         membres, invitations, rôles
    ├── structure/       années, périodes, classes, matières, affectations
    ├── apprenants/      fiches, inscriptions, parents, import CSV
    ├── absences/
    ├── evaluations/     évaluations, saisie des notes
    ├── bulletins/
    ├── parent/          tableau de bord parent
    ├── coran/           cahier, récitations, nafar
    ├── dashboard/       tableaux de bord par rôle
    ├── parametres/      paramètres de la daara (barème, logo...)
    └── admin-plateforme/ super-admin
```

### Routage
```
/auth/...                          public : connexion, inscription, mot de passe oublié (code e-mail),
                                   code-acces (niveau 2, sprint 2) (ADR-006)
/auth/mfa                          connecté : enrôlement / vérification TOTP (obligatoire pour les admins)
/invitation#<jeton>                public puis connecté : aperçu, création de compte ou connexion, acceptation (sprint 2)
/onboarding                        connecté, sans daara
/select-daara                      connecté, plusieurs daaras (layout « cover »)
/                                  redirection : 1 daara → /d/:slug ; plusieurs → dernière utilisée, sinon /select-daara
/d/:slug                           daaraGuard → vérifie le membership, charge CurrentDaara (rôles, modules)
                                   chaque route de module : moduleGuard('<module>') (ADR-008)
  ├── dashboard                    tous
  ├── compte                       tous : profil, langue, mot de passe, appareils TOTP (sprint 2)
  ├── membres                      admin (membres, invitations en attente)
  ├── structure/...                admin
  ├── apprenants/...               admin, enseignant (lecture)
  ├── absences                     admin, enseignant
  ├── evaluations/...              admin, enseignant
  ├── bulletins/...                admin (gestion), parent/apprenant (consultation)
  ├── enfants/:apprenantId/...     parent
  ├── coran/...                    admin, enseignant, apprenant
  └── parametres                   admin : onglets Général (nom, logo, langue, barème) et Modules (ADR-008)
/plateforme/...                    super-admin
```

Menus déclarés en données (`libelle`, `icone`, `route`, `roles`, `module`) et filtrés par `CurrentDaaraService`.
En mobile (< 640 px), parents et apprenants ont une barre de navigation basse à la place de la sidebar.
Guards : `roleGuard([...])` et `moduleGuard('<module>')` renvoient au tableau de bord de la daara avec un message.

### Environnements
| Fichier | Rôle |
|---|---|
| `src/environments/environment.local.ts` | Valeurs du Supabase local (`http://127.0.0.1:54321`, clé publishable locale, clé de site Turnstile de test) |
| `src/environments/environment.ts` | Développement : reprend `environment.local.ts` |
| `src/environments/environment.prod.ts` | Généré par `scripts/set-env.mjs` (prebuild), non versionné, remplace le précédent en production |

`set-env.mjs` lit `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `TURNSTILE_SITE_KEY` (clé de test refusée en production) (variables Cloudflare Pages : production → `daara-prod`,
preview → `daara-dev`). Il échoue sur Cloudflare si elles manquent, refuse toute clé secrète (`service_role`,
`sb_secret_`) et toute URL non https. Sans variables hors Cloudflare (poste, CI) : build branché sur le local.

### Services transverses
| Service | Responsabilité |
|---|---|
| `SupabaseService` | Instance unique du client, configuration par environnement ; flux PKCE à partir du sprint 1 (ADR-006) |
| `AuthService` | Session (signals `user`, `aal`), inscription, connexion, codes e-mail, mot de passe, MFA, déconnexion, écoute `onAuthStateChange` (§7.0) |
| `CurrentDaaraService` | Signals `daara`, `roles`, `id`, `modules` (ADR-008) ; `hasRole(...)`, `moduleActif(...)` ; mémorise le dernier slug utilisé |
| `NotificationCenterService` | Abonnement Realtime à `notifications` de l'utilisateur, compteur non lus |
| `PushService` | Inscription Web Push (sprint 8) |
| `ThemeService` | Signal `mode` (clair / sombre / système), classe `dark` sur `<body>`, mémorisé dans `localStorage` |
| `LanguageService` | Signal `langue` (`fr` par défaut, `en`), `lang` sur `<html>`, bascule sans rechargement, mémorisé |

État : signals dans les services de feature ; pas de store global (NgRx) en V1. Application zoneless,
composants standalone OnPush, primitives @angular/cdk (Dialog, Menu, Overlay) : voir ADR-004.
Styles : Tailwind 4, thème en CSS (`@theme` de `src/styles.css`), styles de composant en CSS standard avec les
variables du thème (ADR-007).

## 3. Modèle de données

### 3.1 Diagramme
```mermaid
erDiagram
  daaras ||--o{ memberships : a
  profiles ||--o{ memberships : a
  daaras ||--o{ invitations : a
  daaras ||--o{ annees_scolaires : a
  annees_scolaires ||--o{ periodes : contient
  annees_scolaires ||--o{ classes : contient
  daaras ||--o{ matieres : a
  classes ||--o{ classe_matieres : enseigne
  matieres ||--o{ classe_matieres : dans
  daaras ||--o{ apprenants : a
  apprenants ||--o{ inscriptions : a
  classes ||--o{ inscriptions : reçoit
  apprenants ||--o{ parent_links : a
  apprenants ||--o{ absences : a
  classe_matieres ||--o{ evaluations : a
  periodes ||--o{ evaluations : dans
  evaluations ||--o{ notes : contient
  apprenants ||--o{ notes : obtient
  apprenants ||--o{ bulletins : a
  bulletins ||--o{ bulletin_lignes : contient
  apprenants ||--o{ cahier_entrees : a
  apprenants ||--o{ recitations : envoie
  daaras ||--o{ abonnements : souscrit
```

### 3.2 Socle (sprints 1-2)
Sprint 1 : `daaras`, `profiles`, `memberships`, `audit_log`, `platform_admins` (détaillées ci-dessous).
Sprint 2 : `invitations`, `codes_acces`, `notifications` (à détailler au sprint 2).

Type : `public.role_membre` = enum (`admin`, `enseignant`, `parent`, `apprenant`).
`created_at timestamptz not null default now()` partout ; `updated_at` (trigger `set_updated_at`) sur `daaras`,
`profiles`, `memberships`.

| Table | Colonnes | Contraintes |
|---|---|---|
| `daaras` | id, nom text (2-120), slug text, ville text null (≤ 80), telephone text null (≤ 20), logo_path text null, langue_defaut text (`fr`/`en`, défaut `fr`), bareme smallint (10/20, défaut 20), statut text (`active`/`suspendue`, défaut `active`), created_by uuid (défaut `auth.uid()`) | slug unique, `^[a-z0-9]+(-[a-z0-9]+)*$`, 3-50 car., hors liste des slugs réservés (segments de routes, `admin`, `api`…) ; `logo_path` = `<id>/<fichier>.<ext>` ; sans `daara_id` (exception) ; créée uniquement par `creer_daara()` |
| `profiles` | id (pk, fk `auth.users` on delete cascade), nom text (≤ 100), prenom text (≤ 100), telephone text null (≤ 20), langue text (`fr`/`en`, défaut `fr`), avatar_path text null | `avatar_path` = `<id>/<fichier>.<ext>` ; sans `daara_id` (exception) ; créé par `handle_new_user` |
| `memberships` | id, daara_id (fk cascade), user_id (fk `profiles` cascade), role `role_membre`, actif bool (défaut true), created_by | unique (daara_id, user_id, role) ; index `daara_id`, index `(user_id, daara_id)` ; aucune écriture directe par le client (§4) |
| `audit_log` | id bigint identity, daara_id (**sans** clé étrangère : le journal est écrit pendant la suppression en cascade d'une daara et lui survit ; conservation et purge à décider avant le sprint 5), table_name text, record_id uuid, action text (`INSERT`/`UPDATE`/`DELETE`), old_data jsonb, new_data jsonb, user_id uuid (`auth.uid()`), at timestamptz | index `(daara_id, at desc)` ; écrit uniquement par `audit_trigger` |
| `platform_admins` | user_id (pk, fk `auth.users` cascade), created_at | sans `daara_id` (exception) ; rempli à la main en SQL par le développeur |

Textes affichés (`daaras.nom`, `ville`, `profiles.nom`, `prenom`, puis tout nom saisi) : contrainte `check` qui interdit
les caractères de contrôle, invisibles et de mise en forme bidirectionnelle (`[[:cntrl:]]`, U+00AD, U+200B-200F,
U+202A-202E, U+2060-2064, U+2066-2069, U+FEFF) : usurpation d'un nom dans les listes, e-mails et PDF.
`handle_new_user` retire ces mêmes caractères des métadonnées d'inscription.

Sprint 2 (détaillées le 2026-10-04) :

| Table | Colonnes | Contraintes |
|---|---|---|
| `invitations` | id, daara_id (fk cascade), role `role_membre` (`admin`, `enseignant`, `parent` au sprint 2), email text null, telephone text null (format E.164 `+221…`), nom / prenom text null (≤ 100, caractères interdits du socle), langue (`fr`/`en`), token_hash text (SHA-256 hex, unique), expires_at (création + 7 jours), accepted_at, accepted_by, revoked_at, invited_by (défaut `auth.uid()`), created_at | exactement un de `email` / `telephone` ; une seule invitation en attente par (daara, contact, rôle) (index unique partiel) ; 50 créations max par daara et par jour ; `token_hash` jamais lisible par le client (droits par colonne) ; écrite uniquement par les RPC ; journalisée |
| `codes_acces` | id, daara_id (fk cascade), user_id (fk `auth.users` cascade), code_hash text (SHA-256 hex), expires_at (création + 24 h), used_at, tentatives smallint (0-5), cree_par, created_at | un code actif par utilisateur (index unique partiel `used_at is null`) ; un nouveau code annule le précédent ; `code_hash` jamais lisible par le client ; écrite uniquement par les RPC ; journalisée |
| `daara_modules` (ADR-008) | daara_id (fk cascade), module `module_daara`, actif bool, updated_at, updated_by | pk (daara_id, module) ; écrite uniquement par `definir_modules` et `creer_daara` ; journalisée |

Type `public.module_daara` = enum (`structure`, `absences`, `notes`, `bulletins`, `coran_cahier`,
`coran_recitations`, `coran_nafar`, `notifications`). Prérequis : `absences`, `notes` → `structure` ;
`bulletins` → `notes` ; `coran_recitations`, `coran_nafar` → `coran_cahier`. Le socle (membres, paramètres,
apprenants, liens parents, tableau de bord) n'est pas un module : toujours actif.

Colonnes ajoutées au sprint 2 :
- `memberships.nom_affiche` text null : nom figé à la désactivation (l'admin ne lit plus le profil d'un membre
  désactivé, mais doit pouvoir le reconnaître dans la liste pour le réactiver).
- `audit_log.user_id` : `coalesce(auth.uid(), current_setting('daara.auteur', true)::uuid)` ; les RPC appelées par les
  Edge Functions en service_role fixent `daara.auteur` (transaction locale) : l'auteur réel est toujours tracé.

Table `notifications` : reportée au sprint 5 (module Notifications, ADR-008).

### 3.3 Structure scolaire (sprint 3)
| Table | Colonnes principales | Contraintes |
|---|---|---|
| `annees_scolaires` | daara_id, libelle, date_debut, date_fin, active | une seule active par daara (index partiel unique) |
| `periodes` | daara_id, annee_id, libelle, ordre, date_debut, date_fin, cloturee | période clôturée = notes verrouillées |
| `classes` | daara_id, annee_id, nom, niveau, titulaire_id | unique (annee_id, nom) |
| `matieres` | daara_id, nom, code, type (`scolaire`/`coran`/`religieux`) | unique (daara_id, code) |
| `classe_matieres` | daara_id, classe_id, matiere_id, coefficient, enseignant_id | unique (classe_id, matiere_id) |

### 3.4 Apprenants (sprint 4)
| Table | Colonnes principales | Contraintes |
|---|---|---|
| `apprenants` | daara_id, matricule, nom, prenom, date_naissance, sexe, photo_path, user_id (optionnel), statut | matricule unique par daara |
| `inscriptions` | daara_id, apprenant_id, classe_id, annee_id, date_inscription | unique (apprenant_id, annee_id) |
| `parent_links` | daara_id, parent_user_id, apprenant_id, lien (père/mère/tuteur) | unique (parent_user_id, apprenant_id) |

### 3.5 Vie scolaire et évaluations (sprints 5-7)
| Table | Colonnes principales | Contraintes |
|---|---|---|
| `absences` | daara_id, apprenant_id, classe_id, date_absence, creneau (matin/après-midi/journée), justifiee, motif | unique (apprenant_id, date_absence, creneau) |
| `evaluations` | daara_id, classe_matiere_id, periode_id, libelle, type (devoir/composition), date_eval, bareme, coefficient | période non clôturée |
| `notes` | daara_id, evaluation_id, apprenant_id, valeur, absent, appreciation | unique (evaluation_id, apprenant_id) ; 0 ≤ valeur ≤ barème |
| `bulletins` | daara_id, apprenant_id, periode_id, moyenne, rang, effectif, appreciation, statut (brouillon/publie), pdf_path, publie_at | unique (apprenant_id, periode_id) |
| `bulletin_lignes` | bulletin_id, matiere_id, moyenne, coefficient, rang, appreciation, enseignant_nom | figées à la publication |

### 3.6 Coran (sprints 9-10) — À détailler après `docs/nafar.md`
| Table | Colonnes principales |
|---|---|
| `sourates` (référence) | numero, nom_ar, nom_fr, nb_versets |
| `cahier_entrees` | daara_id, apprenant_id, sourate_num, verset_debut, verset_fin, statut (non_commencee/en_cours/validee/a_reviser), maj_par, maj_at |
| `recitations` | daara_id, apprenant_id, sourate_num, verset_debut, verset_fin, audio_path, duree_s, statut (en_attente/valide/a_revoir), feedback_texte, feedback_audio_path, corrige_par, corrige_at |
| `devoirs` | daara_id, classe_id, apprenant_id (optionnel), type, description, sourate_num, deadline |
| `nafar_*` | selon la spécification |

### 3.7 SaaS (sprint 11)
| Table | Colonnes principales |
|---|---|
| `offres` (référence) | code, nom, max_apprenants, fonctionnalites jsonb, prix_mensuel |
| `abonnements` | daara_id, offre_code, statut, debut, fin |
| `paiements` | daara_id, abonnement_id, montant, fournisseur, reference, statut, payload jsonb |

## 4. Matrice des droits (RLS)
L = lecture, E = écriture (insert/update), S = suppression, — = aucun accès. « Les siens » = ses enfants (parent) ou soi (apprenant).

| Table | Admin | Enseignant | Parent | Apprenant |
|---|---|---|---|---|
| daaras | L E (colonnes autorisées) | L | L | L |
| profiles | L (soi + membres de ses daaras) E (soi) | L E (soi) | L E (soi) | L E (soi) |
| memberships | L ; E S au sprint 2 (gestion des membres) | L (soi + enseignants de sa daara) | L (soi) | L (soi) |
| invitations | L E S | — | — | — |
| codes_acces | L (métadonnées, sans `code_hash`) | — | — | — |
| annees / periodes / classes / matieres | L E S | L | L | L |
| classe_matieres | L E S | L | — | — |
| apprenants | L E S | L (ses classes) | L (les siens) | L (soi) |
| parent_links | L E S | — | L (soi) | — |
| absences | L E S | L E (ses classes) | L (les siens) | L (soi) |
| evaluations | L E S | L E (ses classe_matieres) | L publiées | L publiées |
| notes | L E S | L E (ses évaluations, période ouverte) | L (les siens) | L (soi) |
| bulletins | L E S | L (ses classes) | L publiés (les siens) | L publiés (soi) |
| cahier_entrees | L E | L E (ses apprenants) | L (les siens) | L (soi) |
| recitations | L | L E (correction) | L (les siens) | L E (envoi, soi) |
| audit_log | L | — | — | — |
| abonnements / paiements | L | — | — | — |

### Fonctions helpers
| Fonction | Rôle |
|---|---|
| `session_suffisante()` (sprint 2) | session `aal2`, **ou** utilisateur sans facteur TOTP vérifié (lecture de `auth.mfa_factors`) : qui a activé la double authentification doit l'utiliser pour tout accès à une daara |
| `is_member(daara_id)` | membre actif de la daara et `session_suffisante()` |
| `has_role(daara_id, roles[])` | membre actif avec un des rôles et `session_suffisante()` ; pour `admin`, exige `aal2` dans tous les cas (ADR-006) |
| `is_parent_of(apprenant_id)` | lien dans `parent_links` |
| `teaches_class(classe_id)` | enseignant affecté à la classe (titulaire ou classe_matieres) |
| `membres_administres()` → setof uuid | membres **actifs** des daaras dont l'appelant est admin actif (`aal2`) ; lecture des profils via `id in (select membres_administres())`, évalué une fois par requête. Un membre désactivé n'est plus lisible (minimisation) |
| `is_platform_admin()` | présent dans `platform_admins` **et** session en `aal2` (ADR-006) |
| `module_actif(daara_id, module)` | module activé pour la daara (ADR-008), faux pour un non-membre (sauf super-admin) ; à partir du sprint 11, et permis par son offre |
Toutes : `security definer`, `stable`, `search_path = ''`, appelées via `(select ...)`.
Un utilisateur admin + enseignant **sans facteur** en `aal1` garde ses droits d'enseignant (le rôle admin seul est ignoré) ;
dès qu'il a un facteur vérifié, plus aucun droit en `aal1` (`session_suffisante`). Ses propres profil et memberships restent
lisibles en `aal1` (routage vers `/auth/mfa`).
La suspension d'une daara (`statut`) n'est pas vérifiée par les helpers en V1 : traitée au sprint 11.

### Modules activables (ADR-008, à partir du sprint 2)
Toute table d'un module ajoute `(select public.module_actif(daara_id, '<module>'))` à **toutes** ses politiques,
lecture comprise, pour tous les rôles (admin compris) : un module désactivé est invisible et inutilisable, ses
données sont conservées. Les Edge Functions d'un module le vérifient aussi. `daara_modules` : lecture par
`is_member(daara_id)` ou `is_platform_admin()` ; aucune écriture directe.

### Socle (sprint 1) : politiques détaillées
Toutes les politiques visent `authenticated` ; aucune ne vise `anon`.

| Table | select | insert | update | delete |
|---|---|---|---|---|
| `daaras` | `is_member(id)` ou `is_platform_admin()` | aucune (via `creer_daara`) | `has_role(id, admin)` ; colonnes accordées : nom, ville, telephone, logo_path, langue_defaut, bareme (`statut`, `slug` non modifiables) | aucune |
| `profiles` | `id = auth.uid()` ou `id in (select membres_administres())` | aucune (trigger) | `id = auth.uid()` ; colonnes : nom, prenom, telephone, langue, avatar_path | aucune (cascade depuis `auth.users`) |
| `memberships` | `user_id = auth.uid()` ou `has_role(daara_id, admin)` ou (`role = 'enseignant'` et `has_role(daara_id, enseignant)`) | aucune (`creer_daara`, puis `accept-invitation` au sprint 2) | aucune (sprint 2) | aucune (sprint 2) |
| `audit_log` | `has_role(daara_id, admin)` | aucune | aucune | aucune |
| `platform_admins` | `user_id = auth.uid()` | aucune | aucune | aucune |

Pourquoi pas d'insert direct sur `memberships` : un admin ajouterait n'importe quel `user_id` à sa daara et lirait
ensuite son profil. Les memberships naissent uniquement d'une action de la personne elle-même (création de daara,
acceptation d'invitation). Au sprint 2 : modification du rôle / désactivation par l'admin, avec garde-fou
« au moins un admin actif par daara ».

### Privilèges (migration `securite_socle`, sprint 1)
- `revoke execute on all functions in schema public from public, anon` + `alter default privileges for role postgres
  revoke execute on functions from public` (**global**, sans `in schema` : la forme limitée au schéma ne retire pas
  le droit de PUBLIC) + même retrait pour `anon` dans `public` ; `grant execute` explicite à `authenticated` sur les
  seules fonctions appelables (helpers, `creer_daara`). Supabase accorde encore par défaut l'exécution à
  `authenticated` : le garde-fou `000_garde_fous` tient la liste blanche des fonctions exécutables par ce rôle.
- `revoke all on all tables in schema public from anon` + privilèges par défaut équivalents (défense en profondeur :
  aucune politique ne vise `anon`).
- Séquences : aucun droit pour `anon` ni `authenticated` (pas de RLS, `setval` casserait les identités) ; les
  colonnes identity sont alimentées sans contrôle de droit sur la séquence.
- Extensions : schéma `extensions`, jamais `public` (vérifié par le garde-fou).
- Colonnes : `revoke update` sur la table, puis `grant update (colonnes autorisées)` (`daaras`, `profiles`).
- `audit_log`, `platform_admins` : `revoke insert, update, delete` à `authenticated`.

### Socle (sprint 2) : politiques
| Table | select | insert / update / delete |
|---|---|---|
| `invitations` | `has_role(daara_id, admin)` ; colonnes lisibles : toutes sauf `token_hash` | aucune (RPC `creer_invitation`, `revoquer_invitation`, `accepter_invitation`) |
| `codes_acces` | `has_role(daara_id, admin)` ; colonnes lisibles : id, user_id, expires_at, used_at, tentatives, created_at | aucune (RPC `creer_code_acces`, `consommer_code_acces`) |
| `memberships` | inchangé (sprint 1) | aucune écriture directe : RPC `changer_role`, `definir_actif`, `accepter_invitation` |
| `daaras` | inchangé | update de `logo_path` également (chemin contraint `<id>/logo.<ext>`) |
| `storage.objects`, bucket `logos` | public (logos affichés sur l'écran de connexion de la daara, à terme) | insert / update / delete : `has_role(<1er segment>, admin)` ; nom `logo.png` / `logo.jpg` / `logo.webp` |

Garde-fou (trigger `garder_un_admin`) : aucune modification de `memberships` ne peut laisser une daara sans admin actif.

### Fonctions RPC
| Fonction | Rôle | Sécurité |
|---|---|---|
| `creer_invitation(p_daara, p_role, p_email, p_telephone, p_nom, p_prenom, p_langue, p_token_hash)` → id (sprint 2) | crée l'invitation (appelée par l'Edge Function `invite-member`, avec le JWT de l'admin) | admin `aal2` ; rôle `admin`/`enseignant`/`parent` ; 50 / jour / daara ; annule l'invitation en attente identique ; journalisé |
| `revoquer_invitation(p_invitation)` | annule une invitation en attente | admin `aal2` de la daara |
| `accepter_invitation(p_token)` → slug | crée le membership de l'utilisateur connecté | jeton haché comparé, non expiré, non utilisé, non révoqué ; **contact lié** : e-mail confirmé (`auth.users.email`) ou téléphone (`auth.users.phone`, stocké sans « + » : comparaison sur les chiffres seuls) identique à celui de l'invitation ; rôle admin : session `aal2` ; membership existant inactif → réactivé ; journalisé |
| `changer_role(p_membership, p_role)` | change le rôle d'un membre | admin `aal2` de la même daara ; rôle cible ≠ `apprenant` au sprint 2 ; garde-fou du dernier admin |
| `definir_actif(p_membership, p_actif)` | désactive / réactive un membre | admin `aal2` ; fige `nom_affiche` à la désactivation ; garde-fou du dernier admin |
| `creer_code_acces(p_membership)` → code en clair (affiché une fois) | réinitialisation assistée (ADR-006 niveau 2 ; remplace l'Edge Function `reset-access` : aucun privilège service_role requis) | admin `aal2` ; cible membre actif de la même daara, **non admin** ; code de 8 caractères (alphabet sans 0/O/1/l/I) tiré par `gen_random_bytes` ; ancien code annulé ; journalisé |
| `consommer_code_acces(p_user, p_code)` → booléen | vérifie et consomme un code | **service_role uniquement** (Edge `use-access-code`) ; 5 essais puis code invalidé ; expiré / utilisé → faux |
| `hook_avant_creation_utilisateur(event)` (S2.5, ADR-009) | hook Auth `before_user_created` : refuse toute inscription publique par téléphone (les comptes téléphone naissent par `accept-invitation`, API d'administration, non soumise au hook) | exécutable par `supabase_auth_admin` uniquement |
| `basculer_module(p_daara, p_module, p_actif)` → `module_daara[]` (S2.2) | active ou désactive un module à partir de l'état en base (écran Modules : pas d'écrasement entre deux admins) ; s'appuie sur `definir_modules` | admin `aal2` ; verrou des lignes de la daara |
| `definir_modules(p_daara, p_modules module_daara[])` → `module_daara[]` (sprint 2, ADR-008) | fixe les modules actifs de la daara | `security definer` ; `has_role(p_daara, admin)` en `aal2` ; prérequis ajoutés ; refus (`23514`, `module_requis`) de désactiver un prérequis d'un module actif ; journalisé |
| `creer_daara(p_nom, p_slug, p_ville, p_telephone, p_langue_defaut, p_bareme[, p_modules])` → slug | crée la daara et le membership admin du créateur, dans la même transaction | `security definer`, `search_path = ''` ; `auth.uid()` non nul, session `aal2`, au plus 3 daaras créées par utilisateur (`created_by`), entrées validées par la fonction (paramètre nul, langue, barème) et par les contraintes ; erreurs traduites côté front : `42501` (non authentifié, `aal2` requis), `P0001` (limite), `23505` (slug déjà pris), `23514` (donnée invalide, slug réservé) |

### Triggers
| Trigger | Tables | Rôle |
|---|---|---|
| `handle_new_user` | auth.users | crée `profiles` à partir de `raw_user_meta_data` (nom, prenom, langue) : valeurs saisies par l'utilisateur, donc nettoyées (trim, longueur bornée, langue hors `fr`/`en` → `fr`) |
| `set_updated_at` | daaras, profiles, memberships (puis toute table avec `updated_at`) | met à jour `updated_at` |
| `audit_trigger` | daaras (sprint 1, `daara_id` = `id`), memberships ; puis absences, notes, bulletins, cahier_entrees | journal d'audit ; copie la ligne entière : exclusion des colonnes sensibles et durée de conservation à décider (ADR) avant de le brancher sur des données d'apprenants |
| `check_same_daara` | tables avec FK métier | refuse une référence vers une autre daara |
| `lock_closed_period` | notes, evaluations | refuse les modifications si période clôturée |
| `notify_*` | absences, bulletins (publication), recitations | crée les lignes `notifications` |

## 5. Storage
| Bucket | Chemin | Accès |
|---|---|---|
| `logos` (sprint 2) | `{daara_id}/logo.{png,jpg,webp}` | public en lecture ; écriture admin `aal2` ; 512 Ko max ; PNG, JPEG, WebP uniquement (pas de SVG : script possible) ; créé par migration |
| `photos` | `{daara_id}/apprenants/{apprenant_id}.jpg` | membres de la daara (staff) + parent concerné |
| `bulletins` | `{daara_id}/{periode_id}/{apprenant_id}.pdf` | admin ; parent/apprenant si publié |
Politiques sur `storage.objects` : premier segment du chemin = daara dont l'utilisateur est membre.
URLs signées à durée courte pour les fichiers privés.

**Audios de récitation : Cloudflare R2** (ADR-003), pas Supabase Storage.
- Clé : `{daara_id}/{apprenant_id}/{recitation_id}.webm` (Opus, bas débit, compressé dans le navigateur).
- Edge Function `audio-url` : vérifie le droit (apprenant soi / enseignant / parent) puis renvoie une URL
  signée R2 (upload ou lecture, 15 min).

**Sauvegardes** : GitHub Actions quotidien (`sauvegarde.yml`), `supabase db dump` de `daara-prod` (rôles, schéma, données
`public` + `auth`, sans jetons ni sessions) chiffré avec la clé publique `age` → R2 `daara-sauvegardes/daara-prod/`, rétention 30 jours.
Fichiers du Storage non couverts (à traiter au sprint 4). Restauration : `scripts/restaurer-sauvegarde-locale.ps1`.
Anti-pause : `anti-pause.yml`, rôle `keepalive` sans droits, tous les deux jours.

## 6. Edge Functions
| Fonction | Entrée | Sortie | Sécurité |
|---|---|---|---|
| `invite-member` (sprint 2) | daara_id, rôle, e-mail ou téléphone, nom, prénom, langue | lien d'invitation (affiché à l'admin : copie, WhatsApp) ; e-mail envoyé si adresse | JWT de l'admin transmis à `creer_invitation` (qui vérifie `aal2`) ; jeton de 32 octets aléatoires, seul son haché est stocké ; e-mail via l'API Brevo (Mailpit en local) |
| `invitation-apercu` (sprint 2) | jeton | nom de la daara, rôle, contact masqué (`a***@g***.com`, `+221 77 *** ** 34`), état (valide / expirée / utilisée) | public ; aucune donnée de plus |
| `accept-invitation` (sprint 2) | jeton, mot de passe, (nom, prénom) | compte téléphone créé (`auth.admin.createUser`, téléphone confirmé) | public ; uniquement pour une invitation **par téléphone** dont le numéro n'a pas encore de compte (ADR-009) ; ensuite le client se connecte et appelle `accepter_invitation` |
| `use-access-code` (sprint 2) | identifiant (e-mail ou téléphone), code, nouveau mot de passe, jeton Turnstile | mot de passe changé par `auth.admin.updateUserById` (qui révoque les jetons de rafraîchissement, vérifié par le spike S2.0), audit, e-mail si adresse | public ; Turnstile vérifié côté serveur ; `consommer_code_acces` ; réponse neutre en cas d'échec |
| `generate-bulletins` | periode_id, classe_id | bulletins calculés + PDF | admin |
| `dispatch-notifications` | (planifiée / webhook DB) | push, SMS, WhatsApp | interne (service_role) |
| `payment-webhook` | payload fournisseur | paiement + abonnement mis à jour | signature du fournisseur |
| `audio-url` | recitation_id, mode (upload/lecture) | URL signée R2 | droits sur la récitation |
| `nafar-plan` | apprenant_id | planning | à définir |
Toutes vérifient le JWT quand il est requis, valident les entrées et répondent `{ code }` (clé d'erreur traduite par le
front). Module partagé `supabase/functions/_shared/` : clients Supabase (utilisateur / service_role), CORS limité aux
origines de l'application, validation, envoi d'e-mail. La clé service_role n'existe que dans l'environnement des
fonctions. Secrets : `BREVO_API_KEY`, `TURNSTILE_SECRET`, `APP_URL` (secrets Supabase en cloud, `.env` local hors Git).
Connexion par téléphone (ADR-009) : fournisseur SMS **factice** déclaré (seule façon d'activer le fournisseur téléphone,
aucun envoi possible), hook `before_user_created` qui refuse les inscriptions publiques par téléphone.

## 7. Flux principaux

### 7.0 Authentification et onboarding (sprint 1, ADR-006)
Client Supabase en flux PKCE. Les e-mails d'Auth contiennent un **code à 6 chiffres** (`{{ .Token }}`), jamais de
lien : un lien ouvert depuis une messagerie s'ouvre souvent dans un autre navigateur (session PKCE perdue).
Codes valables 30 minutes (`otp_expiry = 1800`). Modèles bilingues dans `supabase/templates/`, langue choisie par
`{{ .Data.langue }}`. Cloudflare Turnstile (gratuit) sur l'inscription, la **connexion** et le mot de passe oublié
(Supabase Auth exige le jeton sur ces trois appels dès que `[auth.captcha]` est activé), vérifié par Supabase Auth ;
clés de test Cloudflare en local. Un jeton ne sert qu'une fois : widget réinitialisé après chaque échec. Le renvoi
du code de confirmation (`resend`) exige aussi un jeton.
Énumération de comptes : l'inscription sur une adresse déjà inscrite (`user_already_exists`) suit le même parcours
qu'une adresse libre (écran du code, message neutre). Risque résiduel, côté Supabase Auth : `recover` / `resend`
répétés dans le délai `max_frequency` renvoient 429 pour un compte existant et 200 pour un inconnu (limité par
Turnstile). Codes e-mail : 6 chiffres, 30 min, 30 vérifications / 5 min / IP, sans verrouillage par compte (offre
Free, à revoir au sprint 12).

| Flux | Étapes |
|---|---|
| Inscription `/auth/inscription` | nom, prénom, e-mail, mot de passe (≥ 8, lettres + chiffres), Turnstile → `signUp` (métadonnées nom, prenom, langue) → écran du code → `verifyOtp(type: 'email')` → session ouverte |
| Connexion `/auth/connexion` | e-mail, mot de passe, Turnstile → `signInWithPassword` (adresse non confirmée → lien vers l'écran du code) → facteur TOTP vérifié et session `aal1` → `/auth/mfa` (code) ; admin d'une daara sans facteur → `/auth/mfa` (enrôlement imposé) ; puis routage (ci-dessous) |
| Mot de passe oublié `/auth/mot-de-passe-oublie` | e-mail + Turnstile → `resetPasswordForEmail` → message neutre → code + nouveau mot de passe → `verifyOtp(type: 'recovery')` → `updateUser({ password })` ; compte avec TOTP : Supabase refuse (`insufficient_aal`, session de récupération `aal1`) → code TOTP (`challengeAndVerify`) → `updateUser` rejoué (vérifié le 2026-10-03) |
| Double authentification `/auth/mfa` | enrôlement : `mfa.enroll` (QR code + clé texte) → `challengeAndVerify` ; vérification : `challengeAndVerify` → session `aal2` ; enrôlements abandonnés (facteurs non vérifiés) supprimés avant un nouvel enrôlement. Second appareil et codes de secours : **reportés au sprint 2** (codes de secours disponibles mais expérimentaux dans supabase-js 2.117 / Auth 2.197, à décider avec la procédure super-admin de retrait d'un facteur) |
| Onboarding `/onboarding` | étape 1 : TOTP (si session pas encore `aal2`) ; étape 2 (sprint 2, ADR-008) : profil « Daara coranique », « École franco-arabe » ou « Personnalisé » → modules pré-cochés (`p_modules` de `creer_daara`) ; puis nom, slug (proposé depuis le nom, modifiable), ville, téléphone, langue, barème → `rpc('creer_daara')` → tableau de bord |
| Déconnexion | `signOut()` → `/auth/connexion` |

Routage après connexion (sprint 1, `AuthService.destination()`) : facteur TOTP vérifié en session `aal1`, ou admin
d'une daara sans facteur → `/auth/mfa` ; aucune daara → `/onboarding` ; sinon → `/` (tableau de bord provisoire ;
`/d/:slug`, `/select-daara` au sprint 2). Guards : `authGuard` (session), `anonymeGuard` (pages `/auth` hors `mfa` :
un utilisateur connecté est renvoyé à sa destination), `mfaGuard` (admin ⇒ `aal2`), `avecDaaraGuard` (espace : au moins
une daara), `sansDaaraGuard` (onboarding). Rôles actifs lus dans `memberships` et mis en cache par utilisateur
(invalidés à chaque changement de session et après `creer_daara`). Layouts chargés à la demande. Le front n'est qu'un
confort : la RLS exige `aal2` pour tout droit d'admin.

### 7.1 Invitation d'un membre (sprint 2)
```mermaid
sequenceDiagram
  Admin->>Angular: invite (rôle, e-mail ou téléphone)
  Angular->>EF invite-member: invoke (JWT admin)
  EF invite-member->>DB: rpc creer_invitation (aal2, quota, haché du jeton)
  EF invite-member->>Brevo: e-mail avec le lien (si adresse)
  EF invite-member-->>Angular: lien /invitation#jeton (copier, WhatsApp wa.me)
  Invité->>Angular: ouvre le lien
  Angular->>EF invitation-apercu: jeton → daara, rôle, contact masqué
  Invité->>Angular: crée son compte ou se connecte (e-mail : inscription + code ; téléphone : accept-invitation)
  Angular->>DB: rpc accepter_invitation(jeton) : contact lié, aal2 si admin
  DB-->>Angular: slug → /d/:slug
```
- Le jeton est dans le **fragment** de l'URL : jamais envoyé au serveur, absent des journaux et de Sentry ; gardé en
  `sessionStorage` le temps de l'inscription ou de la connexion.
- **Contact lié** : un lien transféré à une autre personne ne donne aucun accès (e-mail ou téléphone différent).
- Invitation admin : l'invité active la double authentification avant l'acceptation.

### 7.1 bis Réinitialisation assistée (sprint 2, ADR-006 niveau 2)
1. Fiche du membre → « Réinitialiser l'accès » → `rpc('creer_code_acces')` → code affiché une fois, bouton WhatsApp
   (`https://wa.me/<téléphone>?text=…`, message traduit dans la langue du membre).
2. Le membre ouvre `/auth/code-acces` : identifiant (e-mail ou téléphone), code, nouveau mot de passe, Turnstile →
   Edge `use-access-code` → mot de passe changé, sessions révoquées, journal, e-mail de notification si adresse.
3. Il se connecte normalement (TOTP s'il en a un : le code d'accès ne contourne jamais la double authentification).

### 7.1 ter Navigation par daara (sprint 2)
- `/` : 0 daara → onboarding ; 1 → `/d/:slug` ; plusieurs → dernière utilisée (mémorisée dans le navigateur, revérifiée)
  sinon `/select-daara`.
- `daaraGuard` cherche le slug dans les daaras de l'utilisateur (`AuthService.mesDaaras()`, aucune requête par slug :
  daara inexistante et daara non accessible sont indiscernables), charge ses rôles et ses modules ; daara inconnue ou non membre → `/select-daara` avec un message neutre.
- Menu et barre basse filtrés par rôle et par module ; `roleGuard` et `moduleGuard` sur les routes.

### 7.2 Saisie d'une absence
```mermaid
sequenceDiagram
  Enseignant->>Angular: marque absent
  Angular->>DB: insert absences (RLS : teaches_class)
  DB->>DB: trigger audit + trigger notify (ligne notifications pour les parents)
  DB-->>Realtime: changement absences / notifications
  Realtime-->>Angular Admin: liste mise à jour
  Realtime-->>Angular Parent: notification in-app
  DB-->>EF dispatch-notifications: push / SMS si parent hors ligne
```

### 7.3 Calcul des moyennes (sprint 6-7)
- Note ramenée sur 20 : `valeur / bareme_eval × 20`.
- Moyenne matière (période) : moyenne pondérée des notes par `coefficient` de l'évaluation.
  Absence à une évaluation : exclue ou comptée 0 selon le paramètre de la daara.
- Moyenne générale : moyenne des moyennes matières pondérée par `classe_matieres.coefficient`.
- Affichage converti dans le barème de la daara (10 ou 20).
- Rang : `rank() over (partition by classe, periode order by moyenne desc)`.
- Implémentation : fonction SQL `calculer_bulletins(periode_id, classe_id)` ; à la publication, les valeurs
  sont figées dans `bulletins` / `bulletin_lignes`.
- PDF : décision par ADR au sprint 7 (spike sur le rendu de l'arabe).

## 8. Gestion des erreurs
- Erreurs Supabase converties en messages utilisateur traduits (fr/en) (violation RLS → « Accès non autorisé »,
  contrainte unique → message métier).
- Erreurs inattendues : journalisées (sans données personnelles) et affichées de manière générique.

## 9. Stratégie de test
| Niveau | Outil | Périmètre |
|---|---|---|
| Base | pgTAP (`supabase test db`) | RLS, fonctions, triggers, calculs de moyennes |
| Unitaire | Vitest (`@angular/build:unit-test`) | Services, composants |
| Edge Functions | `deno test` (sprint 2) | Validation des entrées, masquage des contacts, génération de jetons, réponses d'erreur |
| E2E | Playwright | Parcours critiques (connexion, absence → parent, notes → bulletin) |
| Sécurité | Agents auditeur-securite / auditeur-rls, scan secrets en CI | À chaque feature |

## 10. CI/CD
1. Lint + typecheck
2. Tests unitaires
3. `supabase start` + `supabase db reset` + `supabase test db`
4. Build production
5. Scan de secrets + `npm audit --audit-level=high`
5 bis. Edge Functions (sprint 2) : `deno lint`, `deno check`, `deno test` (job `edge`, action `setup-deno` épinglée par SHA)
6. Déploiement Cloudflare Pages : preview sur `develop`, production sur `main` ; migrations appliquées manuellement
7. Tâches planifiées : sauvegarde quotidienne → R2, requête anti-pause
