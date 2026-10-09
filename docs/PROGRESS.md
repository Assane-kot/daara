# Journal d'avancement

> À mettre à jour à la FIN de chaque session / tâche, avant le commit.
> Format : date, fait, décisions, problèmes ouverts, prochaine étape.

## État actuel
- Sprint en cours : 0 — Installation, **code terminé** (bilan ci-dessous, 2026-10-03) ; clôture effective
  après les configurations manuelles du développeur. Sprint suivant : 1 — Socle multi-tenant.
- Sprint 1 — Socle multi-tenant : **code terminé** (bilan ci-dessous, 2026-10-03) ; clôture effective après la
  vérification en 375 px et les configurations Auth / Turnstile du développeur. Sprint suivant : 2 — Membres et
  navigation (planification à faire).
- Sprint 2 en cours : S2.0 (spike, ADR-009), S2.1 (navigation par daara), S2.2 (modules activables) et S2.3 (paramètres
  de la daara), S2.4 (gestion des membres), S2.5 (invitations, en 3 commits), S2.6 (réinitialisation assistée) et S2.7 (Mon compte) faits : **code du sprint 2
  terminé** (bilan ci-dessous). Clôture effective après les configurations cloud du développeur (§2.8, §2.9).
- Sprint 3 — Structure scolaire : planifié (S3.0, 2026-10-09). Suivante : S3.1 années scolaires et périodes.
- Problèmes ouverts :
  - Licence Vristo : vérifier le type (Regular ou Extended). La Regular ne couvre pas un produit à accès
    payant → à régler avant R4 (Extended, accord de l'auteur, ou remplacement du CSS propre à Vristo).
  - Page de charte (`/d/<slug>/dev/charte` depuis S2.1, charte + démonstration `shared/ui`) à retirer (route +
    `features/dev-charte/`) dès que la charte est validée par le développeur.
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
  - Navigateurs : Angular 22 n'assure plus iOS 16 (iPhone 8, iPhone X) ; à vérifier avec les daaras pilotes (ADR-007).
  - Audit de l'authentification (2026-10-03), points reportés :
    - ~~modèles `magic_link`, `email_change`, `invite`, `reauthentication` avec lien~~ → code seul fr / en (S2.7) ;
    - AVANT le sprint 3 (décision) : `is_member` n'exige pas `aal2` ; un admin avec TOTP dont seul le mot de passe
      est compromis reste « membre » en `aal1` (lecture de sa daara). Toute politique future fondée sur `is_member`
      s'ouvrirait sans second facteur → par ex. `aal2` exigé si l'utilisateur a un facteur vérifié ou est admin ;
    - sprint 2 : un admin invité sans facteur peut être devancé à l'enrôlement TOTP par qui détient son mot de passe ;
    - sprint 12 : verrouillage par compte des codes e-mail ; énumération résiduelle par limite de fréquence (LLD §7.0).
  - Audit du socle (2026-10-03), points reportés :
    - ~~sprint 2 : auteur des écritures en service_role~~ → `daara.auteur` lu par `audit_trigger` (S2.4) ; S2.5 / S2.6 :
      le fixer avec `set_config(…, true)` dans une seule fonction interne, après vérification de l'auteur ;
    - sprint 2 : le claim `aal2` reste valable jusqu'à l'expiration du JWT (1 h) après retrait d'un facteur TOTP →
      révoquer les sessions dans la procédure de retrait (journalisée) ;
    - AVANT le sprint 5 (ADR) : `audit_trigger` copie les lignes entières, sans durée de conservation, et les
      lignes d'une daara ou d'un utilisateur supprimés restent (effacement CDP) → colonnes exclues ou diff,
      purge planifiée et purge à la suppression d'une daara ;
    - sprint 4 (exports CSV / PDF) : neutraliser `= + - @` en tête de cellule (injection de formules) ;
    - sprint 12 : performance des politiques (`(select has_role(daara_id …))` dépend de la ligne).
  - À faire par le développeur avant la preview : déployer les Edge Functions et leurs secrets (`docs/deploiement.md`
    §2.9 : APP_URL, ORIGINES_AUTORISEES, BREVO_API_KEY, EMAIL_EXPEDITEUR, TURNSTILE_SECRET ; `use-access-code` ajoutée
    à la commande de déploiement), hooks et téléphone (§2.8) ;
    vérifier sur `daara-dev` que `verify_jwt` accepte les JWT (nouvelles clés de signature) et que le CORS ne répond
    qu'aux origines de l'application (en local, Kong ajoute un CORS ouvert).
  - CI : job `edge` jamais exécuté sur GitHub → vérifier le premier run (image Docker Deno épinglée par empreinte).
  - Audits S2.7 (2026-10-09), points ouverts :
    - Mon compte n'est accessible que depuis une daara active (`/d/:slug/compte`) : un utilisateur sans daara active ne
      peut ni changer son mot de passe ni retirer un appareil perdu → route `/compte` hors daara (`authGuard` + `mfaGuard`)
      à prévoir (sprint 3 ou 12) ;
    - un jeton d'accès déjà émis reste valable 1 h au plus après un retrait de facteurs ou de sessions (`session_suffisante`
      ne vérifie pas `auth.sessions`) → à décider au sprint 12 (coût par requête) ;
    - « un admin garde un appareil » : contrôle d'interface seulement (l'API Auth ne permet pas de l'imposer) ;
    - `retirer_facteurs` à essayer sur `daara-dev` avant tout usage réel (droits du rôle `postgres` sur le schéma `auth`).
  - Audits S2.4 (2026-10-05), points reportés :
    - S2.5 : `accepter_invitation` doit effacer `nom_affiche` en réactivant une ligne (la contrainte l'impose) et passer
      par les garde-fous ; promotion en admin d'un compte sans facteur = même risque que l'invitation admin (qui
      détient le mot de passe enrôle le TOTP en premier) → même correction ;
    - ~~S2.7 : membre désactivé de sa seule daara sur l'onboarding~~ → message « accès désactivé » (S2.7) ;
    - sprint 3 : liste des membres sans pagination (limite de 1 000 lignes de PostgREST) → `data-table` ;
    - sprint 12 (CDP) : supprimer le compte du dernier admin d'une daara est refusé par le garde-fou → procédure.
  - Audit S2.3 (2026-10-05), points pour information :
    - fichiers du bucket `logos` d'une daara supprimée non effacés par la cascade (le Storage interdit le `delete` SQL)
      → à traiter avec la purge CDP (avant le sprint 5), via l'API Storage ;
    - l'admin d'une daara suspendue modifie encore ses paramètres (`has_role` ignore `statut`) → sprint 11 ;
    - uuid de la daara visible dans l'URL publique du logo (non secret) ; ancienne URL en cache 5 min au plus.

## Prochaine étape
1. Développeur, pour clore le sprint 0 : configurations de `docs/deploiement.md` dans l'ordre §2 (Supabase +
   Brevo) → §1 (Cloudflare) → §5 (Sentry) → §4 (sauvegardes) ; premier run de la CI sur GitHub ; validation de
   `/dev/charte` (puis retrait de la page) ; tag de sprint `s0` sur `develop`.
2. Sprint 1, pour le clore : vérification en 375 px (connexion, inscription, code, mfa, onboarding, tableau de bord) ;
   tag `s1` sur `develop`.
3. Sprint 2 : planification faite (2026-10-04). Commencer par S2.0 (spike téléphone sans SMS → ADR-009 confirmé ou
   alternative présentée au développeur), puis S2.1 à S2.7 dans l'ordre, un commit par story.

### Décisions de planification du sprint 3 (validées le 2026-10-09)
- Découpage : S3.0 conception, S3.1 années et périodes, S3.2 matières, S3.3 classes et affectations, S3.4 `data-table`
  (matières, classes, membres) ; « Préparer la rentrée » reportée avant la deuxième année des pilotes.
- Matières : catalogue de la daara, réutilisé d'une année à l'autre (archivage plutôt que suppression).
- Périodes : saisie libre + modèles « 3 trimestres » / « 2 semestres » ; une période clôturée peut être rouverte par
  l'admin (journalisé).
- Lecture : admin et enseignant lisent toute la structure (enseignant sans écriture) ; parents et apprenants : années,
  périodes, matières seulement ; classes et affectations de leurs enfants au sprint 4 (matrice LLD §4 modifiée).
- Niveau d'une classe : texte libre avec suggestions.
- Écritures directes sous RLS (admin aal2 + module) sauf l'année active (RPC) ; noms des enseignants par
  `enseignants_daara` ; recherche des membres sans accents par `rechercher_membres` (extension `unaccent`).

### Décisions de planification du sprint 2 (validées le 2026-10-04)
- Identifiant sans e-mail : téléphone + mot de passe, sans SMS, compte créé seulement sur invitation (ADR-009,
  acceptée le 2026-10-05 après le spike S2.0 : fournisseur SMS factice + hook `before_user_created`).
- Invitations : e-mail via l'API Brevo (Mailpit en local) + lien toujours partageable (copie, WhatsApp) ;
  50 / jour / daara ; jeton dans le fragment de l'URL, 7 jours, usage unique, **lié au contact invité** ;
  invitation admin acceptée en `aal2`.
- `aal2` exigé pour tout accès d'un utilisateur ayant un facteur vérifié (`session_suffisante`, livré avec S2.1).
- Perte du téléphone : second appareil TOTP ; pas de codes de secours (expérimentaux) ; retrait d'un facteur par
  procédure SQL documentée, lancée par le développeur.
- Comptes apprenants et liens parent ↔ enfant : sprint 4 ; invitations du sprint 2 : admin, enseignant, parent.
- Edge Functions testées avec `deno test`, job CI `edge`.
- Réinitialisation assistée : `reset-access` devient la RPC `creer_code_acces` ; `use-access-code` reste une Edge
  Function. Table `notifications` reportée au sprint 5.
- Découpage en 8 stories (S2.0 à S2.7), un commit chacune.

### Modules activables par daara (ADR-008, validé le 2026-10-04)
- Chaque daara active ses modules (structure, absences, notes, bulletins, coran_cahier, coran_recitations,
  coran_nafar, notifications) ; le socle reste toujours actif. Ce que l'admin active est ce que tous voient.
- L'admin active librement (`aal2`) ; l'offre fixera le plafond au sprint 11.
- Profils proposés à l'onboarding (« Daara coranique », « École franco-arabe », « Personnalisé »).
- Désactivation = masquage, données conservées ; protection par la RLS (lecture et écriture), pas seulement à l'écran.
- Story ajoutée au sprint 2 ; Definition of Done et règles RLS complétées pour toutes les stories de module.
- Spec : `docs/features/modules.md`.

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
### 2026-10-09 — Bilan du sprint 2 (Membres et navigation)
**Objectif** : chaque profil accède à son espace et ne voit que ses modules ; l'admin invite, gère ses membres et
paramètre sa daara ; un parent sans e-mail se connecte et récupère son accès. **Atteint en local** (navigateur, pgTAP,
runtime Edge local). Mise en ligne : après les configurations du développeur (`docs/deploiement.md` §2.8, §2.9).

| Story | État |
|---|---|
| S2.0 Spike téléphone sans SMS (ADR-009) | Fait : fournisseur factice + hook `before_user_created` |
| S2.1 Navigation par daara | Fait |
| S2.2 Modules activables (ADR-008) | Fait |
| S2.3 Paramètres de la daara (logo) | Fait |
| S2.4 Gestion des membres | Fait |
| S2.5 Invitations (3 commits : base, Edge Functions, front) | Fait |
| S2.6 Réinitialisation assistée (code de la daara) | Fait |
| S2.7 Mon compte et sécurité | Fait |

**Livrable** « l'admin invite un enseignant (e-mail) et un parent (téléphone), chacun voit son menu ; une daara coranique
ne voit aucun écran scolaire ; un parent récupère son accès avec le code de l'admin » : vérifié en local.

**Chiffres** : 446 tests pgTAP (123 au sprint 1) ; 222 tests unitaires (122) ; 34 tests Deno (nouveau) ; 4 Edge
Functions ; chargement initial 150,5 kB transférés (142) ; aucun paquet npm ajouté ; 2 ADR (008, 009) ; 10 commits.

**Audits** : 0 critique sur l'ensemble ; importants trouvés et corrigés avant chaque commit, entre autres : lecture du nom
figé des collègues désactivés, admin retiré qui revenait par ses invitations, haché du jeton dans le journal, quotas
contournables, `module_actif` oracle de configuration, reconnexion automatique en boucle, profil modifiable en aal1,
session du téléphone perdu laissée ouverte après retrait de l'appareil.

**Ce qui a bien marché** :
- découper les grosses stories (S2.5 en 3 commits) : commits relisibles, audits ciblés ;
- auditer avec deux agents (sécurité + RLS) dès qu'une table change : chacun trouve ce que l'autre ne voit pas ;
- le parcours dans le navigateur trouve encore des bugs que les tests ne voient pas (second appareil TOTP refusé à la
  connexion, `app-page-header` qui ne projetait pas le bouton) ;
- les fonctions pures des Edge Functions (`logique.ts`, dépendances injectées) se testent sans runtime.

**À améliorer** :
- garde-fou de transaction pour l'auditeur RLS : respecté depuis S2.5a (deux incidents avant) ;
- tester plus tôt les chemins à plusieurs éléments (deux appareils, deux daaras) : les bugs du sprint étaient là ;
- outillage : les commandes de vérification en heredoc échouent parfois dans le shell (passer par des scripts) ;
- vélocité : le sprint entier tient encore en quelques jours de session ; le goulot reste côté développeur
  (configurations cloud, validations, premier run de la CI).

**Pièges à retenir** : une nouvelle Edge Function n'est servie qu'après `supabase stop` / `start` ; Kong ajoute un CORS
ouvert en local ; le Storage renvoie le vrai code dans `statusCode` ; `enable_signup = false` coupe aussi la connexion
par téléphone ; le claim `aal2` survit au retrait d'un facteur jusqu'à l'expiration du JWT (1 h) ; Auth exige une lettre
ASCII (`letters_digits`) et 72 octets au plus ; `whenStable()` n'attend pas des promesses enchaînées dans les tests.

### 2026-10-09 — S2.7 Mon compte et sécurité
- Décisions (validées) : D1 fonction SQL `retirer_facteurs` pour la procédure super-admin (`docs/exploitation.md`) ; D2
  changement de mot de passe : code de réauthentification par e-mail, reconnexion pour un compte téléphone.
- Migration `retrait_facteurs` : `profiles_update_soi` exige `session_suffisante()` (audit RLS : en aal1 avec facteur, le
  seul mot de passe permettait de changer le nom affiché) ; `session_suffisante` exécutable par `authenticated` (test du
  sprint 2 adapté) ; `retirer_facteurs(p_user, p_motif)` (aucun rôle de l'API ; facteurs, sessions, jetons supprimés ;
  journal : motif sur une ligne plateforme seulement). 17 tests pgTAP (446 au total).
- Modèles `magic_link`, `email_change` (texte neutre : envoyé aux deux adresses), `reauthentication`, `invite` : code
  seul fr / en, déclarés dans `config.toml` et `docs/deploiement.md` ; vérifiés dans Mailpit (aucun lien).
- Front : `/d/:slug/compte` (menu du compte) : Profil (langue appliquée et copiée dans les métadonnées Auth), Mot de
  passe (code de réauthentification si demandé), Sécurité (appareils, ajout nommé avec le panneau d'enrôlement, retrait
  confirmé qui ferme les autres sessions, dernier appareil d'un admin protégé) ; onboarding : message « accès désactivé ».
- Bug trouvé dans le navigateur et corrigé : avec deux appareils, seul le premier était accepté à la connexion →
  `verifierTotp` essaie chaque facteur vérifié (seulement si le code est refusé). Premier appareil affiché « Premier
  appareil » (nom technique masqué).
- Vérifié dans le navigateur : admin → enrôlement → second appareil « Tablette » → déconnexion → connexion avec le code
  de la tablette → OK ; profil enregistré ; Sécurité en sombre et 375 px sans débordement. Non vérifié dans le navigateur
  : le code de réauthentification (session toujours récente en local ; tests unitaires) et le message « accès désactivé ».
- Audits : sécurité (0 critique, **1 important** : retirer un appareil laissait la session du téléphone perdu ouverte →
  `signOut({ scope: 'others' })`, 7 mineurs) et RLS (0 critique, **1 important** : profil modifiable en aal1, corrigé,
  4 mineurs) ; mineurs corrigés (journal limité aux daaras actives et sans motif, doc : jeton valable 1 h, changement
  de mot de passe obligatoire après retrait, motif sans donnée personnelle, essai sur `daara-dev`, modèle `email_change`
  neutre, tests de profil) ; ouverts : voir « Problèmes ouverts ».
- 222 tests unitaires ; chargement initial 150,5 kB transférés.

### 2026-10-09 — S2.6 Réinitialisation assistée (ADR-006 niveau 2)
- Décisions (validées) : D1 la personne visée n'est admin dans aucune daara (ni super-admin) ; D2 risque résiduel
  accepté (l'admin peut utiliser lui-même le code : sessions révoquées, journal, e-mail, TOTP jamais contourné), ADR-006.
- Migration `codes_acces` : table (haché SHA-256 lié au compte, illisible et hors journal ; un code actif par compte
  toutes daaras confondues), `creer_code_acces` (admin aal2, daara active, cible active autre que soi ; code `XXXX-XXXX`
  sur 32 symboles, 40 bits ; verrou par compte), `consommer_code_acces(p_identifiant, p_code)` (service_role ; compte
  retrouvé par la base ; 5 essais ; refus si membre désactivé ou devenu admin, auteur plus admin, daara suspendue ;
  auteur = le membre). LLD corrigé (signature). 52 tests pgTAP (429 au total).
- Edge Function `use-access-code` (Turnstile, réponse neutre `code_invalide`, `updateUserById` qui révoque les sessions,
  e-mail de notification fr / en sans lien) ; 7 tests Deno de plus (34).
- Front : Membres → « Réinitialiser l'accès » (membres actifs non admin ; confirmation ; modale avec le code affiché une
  fois, Copier, WhatsApp) ; `/auth/code-acces` (identifiant, code, nouveau mot de passe, Turnstile → invitation à se
  connecter) ; lien depuis la connexion.
- Vérifié contre le runtime local : admin aal2 (TOTP calculé) → code → mauvais code / compte inconnu / rejeu →
  `code_invalide` ; bon code → ancienne session refusée au rafraîchissement, ancien mot de passe refusé, nouveau OK,
  e-mail reçu dans Mailpit, journal sans haché. Navigateur : page `/auth/code-acces` (succès, sombre, 375 px sans
  débordement). Modale de l'admin vérifiée par les tests unitaires seulement. Piège : une nouvelle Edge Function n'est
  servie qu'après `supabase stop` / `start` (redémarrer le conteneur ne suffit pas).
- Audits : sécurité (0 critique, 0 important, 4 mineurs) et RLS (0 critique, 0 important, 4 mineurs), corrigés : mot de
  passe accepté par la fonction mais refusé par Auth (lettre ASCII, 72 octets, aussi à l'inscription), création
  concurrente par deux daaras (verrou), haché des codes exclu de la sauvegarde, super-admin non ciblable, message de
  refus générique, LLD aligné ; acceptés et documentés (ADR-006) : oracle « admin ailleurs », code annulé par une autre
  daara, code invalidable par un tiers (5 essais Turnstile). 12 cas pgTAP ajoutés. L'auditeur RLS a respecté le
  garde-fou de transaction.
- 209 tests unitaires ; chargement initial 149,3 kB transférés.

### 2026-10-09 — S2.5c Invitations : front
- Connexion « E-mail ou téléphone » (`core/auth/identifiant.ts` : +221 par défaut pour 9 chiffres, même règle que les
  Edge Functions) ; `AuthService.connecter(identifiant)`, `accepterInvitation`, retour vers `/invitation` après
  inscription, connexion ou TOTP si une invitation attend.
- Membres : en-tête avec « Inviter » (modale CDK : rôle, téléphone ou e-mail, nom, langue de l'invité → lien, Copier,
  WhatsApp), onglets Membres / Invitations (en attente, expirées ; renvoyer = nouveau lien ; révoquer avec confirmation).
- Page publique `/invitation` : aperçu (contact masqué), invité connecté → « Rejoindre » (messages contact différent,
  double authentification à activer) ; invité par e-mail → créer un compte ou se connecter ; invité par téléphone →
  mot de passe choisi, compte créé par `accept-invitation`, connexion automatique avec un nouveau jeton Turnstile.
- Vérifié dans le navigateur : admin invite un parent par téléphone (modale, lien WhatsApp, onglet), déconnexion,
  ouverture du lien (jeton effacé de l'adresse), création du compte → arrivée dans la daara. Piège : première réponse
  d'une Edge Function lente (démarrage à froid) ; `app-page-header` ne projette que les éléments `[actions]`.
- Audit sécurité : 0 critique, 1 important corrigé (reconnexion automatique qui pouvait boucler en gardant le mot de
  passe en mémoire → une seule tentative, mot de passe effacé), 7 mineurs corrigés (format du jeton contrôlé, « Ignorer
  cette invitation », retour sur l'invitation après « Ce n'est pas mon compte », pas de numéro dans l'URL…).
- 204 tests unitaires ; chargement initial 148,5 kB transférés.

### 2026-10-05 — S2.5b Invitations : Edge Functions
- Décision I3 (validée) : risque résiduel accepté qu'un admin crée le compte du numéro qu'il invite, limité par la
  création et le rattachement dans la même opération, le marqueur `app_metadata.invitation`, le journal et les quotas
  (ADR-009). Migration `invitation_nouveau_compte` : `accepter_invitation_nouveau_compte` (service_role), logique
  d'acceptation mise en commun, aperçu qui tient compte de l'auteur et de la suspension, e-mail d'invitation à une
  seule adresse. 20 tests pgTAP (377 au total).
- `supabase/functions/` : `invite-member` (JWT de l'admin → RPC, lien `/invitation#jeton`, e-mail, message WhatsApp),
  `invitation-apercu` (public, contact masqué), `accept-invitation` (public, Turnstile ; compte téléphone créé et
  rattaché, supprimé seulement si le refus est certain) ; `_shared/` : validation (E.164, +221 par défaut), masquage,
  réponses `{ code }` et CORS, e-mail (Brevo / Mailpit, une seule porte), modèles fr / en échappés, Turnstile (clés de
  test refusées hors local, nom d'hôte vérifié), clients Supabase. Logique en fonctions pures, 27 tests Deno.
- Outillage : `npm run edge:test` (lint, types, tests dans `denoland/deno:2.5.6` épinglé par empreinte, `deno.lock`
  versionné, `--frozen`), job CI `edge` ; variables locales dans `[edge_runtime.secrets]` de `config.toml` (aucun
  secret, pas de `.env`) ; `docs/deploiement.md` §2.9 (secrets et déploiement cloud).
- Vérifié de bout en bout sur le runtime local : admin en aal2 (TOTP calculé) → invitation par e-mail reçue dans
  Mailpit (lien dans le fragment) → aperçu masqué ; invitation par téléphone → acceptation (captcha, mot de passe,
  invitation e-mail refusée) → compte créé et rattaché → connexion par téléphone → membership parent ; rejouer →
  `invitation_utilisee`.
- Constat : en local, la passerelle Kong ajoute un CORS ouvert (`*`) à toutes les routes ; la restriction des fonctions
  se vérifie en cloud (§2.9).
- Audit sécurité : 0 critique, 0 important, 6 mineurs corrigés (suppression d'un compte peut-être rattaché, clé
  Turnstile de test en cloud, dépendances non verrouillées, e-mail à adresses multiples, aperçu « valide » trompeur,
  tests manquants). Piège : la clé secrète Turnstile de test a 31 zéros (un test l'a révélé).
- Incident : une commande de diagnostic a affiché la configuration de Kong, qui contient les clés de démonstration
  locales par défaut de Supabase (publiques, sans valeur hors du poste) ; à éviter.

### 2026-10-05 — S2.5a Invitations : base
- Décisions (validées) : S2.5 en 3 commits (base, Edge Functions, front) ; tests Deno dans le conteneur `denoland/deno`
  (rien à installer) ; e-mails par l'API Brevo en cloud et l'API de Mailpit en local, une seule fonction d'envoi ;
  seuil e-mail ajouté à l'ADR-003 (e-mail réservé aux codes et invitations ; offre payante au-delà de ~200 / jour ou à
  R4).
- Migration `invitations` : table (haché du jeton illisible, y compris dans le journal ; une invitation en attente par
  contact et rôle), RPC `creer_invitation` (jeton tiré par la base et renvoyé une fois ; quotas 50 / daara, 50 / auteur,
  200 e-mails / plateforme sur 24 h ; daara active ; `deja_membre`), `revoquer_invitation`, `accepter_invitation`
  (contact lié : e-mail ou téléphone confirmé ; admin en aal2 ; auteur encore admin actif ; réactivation ; ordre des
  verrous commun), fonctions internes (`invitation_par_jeton` pour service_role, `definir_auteur`), trigger qui
  révoque les invitations d'un admin retiré et celles adressées à un membre désactivé, `audit_trigger` avec colonnes
  exclues, hooks Auth `before_user_created` (refus des inscriptions publiques par téléphone) et `send_sms` (ne fait
  rien). 78 tests pgTAP (357 au total).
- `config.toml` : fournisseur téléphone activé (Twilio factice déclaré, jamais appelé grâce au hook `send_sms`),
  `enable_signup = true` (vérifié : `false` coupe aussi la connexion par téléphone), confirmation exigée.
- Vérifié contre Auth local : inscription publique par téléphone → 403 ; par e-mail → OK ; compte téléphone créé par
  l'API d'administration → connexion téléphone + mot de passe OK ; demande d'OTP par téléphone → aucun appel externe.
- Audits sécurité (0 critique, 3 importants, 9 mineurs) et RLS (0 critique, 2 importants, 4 mineurs) : corrigés (admin
  retiré qui revenait par ses invitations, haché dans le journal, quotas contournables par plusieurs daaras, jeton
  fourni par l'appelant, comptes non confirmés comptés, interblocage, daara suspendue, numéros transmis à Twilio,
  garde-fous cloud ajoutés à `docs/deploiement.md` §2.8). Point I3 (compte téléphone créé par l'admin à la place du
  titulaire) : décision du développeur attendue avant S2.5b. L'auditeur RLS a respecté le garde-fou de transaction.

### 2026-10-05 — S2.4 Gestion des membres
- Base (migration `membres`) : `memberships.nom_affiche` (nom figé à la désactivation, nul sur une ligne active),
  `audit_trigger` avec auteur `daara.auteur` (Edge Functions en service_role ; ignoré si `auth.uid()` existe ou si
  malformé), triggers `garder_un_admin` (mise à jour et suppression ; seule la cascade d'une daara passe) et
  `memberships_immuables` (`daara_id`, `user_id`), fonction interne `membership_administre` (droits vérifiés avant
  verrou, verrous daara puis membership, revérification), RPC `changer_role` et `definir_actif` ; politique
  enseignant limitée aux collègues actifs. 54 tests pgTAP (279 au total) ; concurrence vérifiée à deux sessions.
- Front : `/d/:slug/membres` (admin) : recherche sans accents, filtres rôle / état (actifs par défaut), tableau au-delà
  de 640 px et cartes en dessous, badges, menu d'actions CDK par membre (rôles proposés, désactiver / réactiver),
  confirmations (admin donné ou retiré, désactivation), un admin qui se retire ses droits quitte l'écran ; entrée de
  menu « Membres » ; icônes Vristo `users`, `horizontal-dots`, `search`.
- Vérifié dans le navigateur : désactivation (nom figé visible dans « Désactivés »), réactivation, promotion admin et
  retour, refus « dernier admin » sur soi-même avec message, journal avec auteur, 375 px en sombre sans débordement.
- Audits : sécurité (0 critique, **1 important**, 4 mineurs) et RLS (0 critique, **1 important**, 3 mineurs), corrigés :
  - important (relevé par les deux) : l'enseignant lisait le nom figé de ses collègues désactivés → politique limitée
    aux actifs + contrainte `not actif or nom_affiche is null` ;
  - verrou pris avant l'autorisation et droits non revérifiés après verrou ; `for update` sur la daara bloquait les
    clés étrangères (→ `for no key update`) ; garde-fou contournable par `delete` ou `update … set daara_id` ;
    robustesse en REPEATABLE READ (autres admins verrouillés) ; confirmation de désactivation en style « danger » ;
  - 21 cas pgTAP ajoutés (collègue désactivé, isolation du journal, admin désactivé, anon, apprenant, auteur usurpé,
    seul admin à deux rôles, mise à jour groupée, suppression, ligne immuable).
- Incident : l'auditeur RLS a de nouveau écrit hors transaction dans la base locale (un `\set` sans antislash a fusionné
  avec `begin`) ; lignes supprimées par l'auditeur, puis `db reset`. Aucune donnée hors local. Consigne renforcée
  côté auditeur : garde-fou `now() = statement_timestamp()` après `begin`.
- 185 tests unitaires, 279 tests pgTAP ; chargement initial 148,3 kB transférés.

### 2026-10-05 — S2.3 Paramètres de la daara
- Base (migration `logos_daara`) : bucket `logos` public en lecture, 512 Ko, PNG / JPEG / WebP (pas de SVG) ;
  4 politiques sur `storage.objects` (select requis par l'upsert, insert, update, delete) pour l'admin `aal2` de la
  daara du 1er segment, chemin `<uuid>/logo.(png|jpg|webp)` contrôlé par expression régulière avant la conversion en
  uuid ; contrainte `daaras_logo_path_check` (même règle) à la place de `daaras_check` (nom généré du socle).
  20 tests pgTAP (225 au total). Piège : le `delete` SQL sur `storage.objects` est bloqué par le déclencheur
  `protect_delete` → `set local storage.allow_delete_query = 'true'` dans les tests.
- Front : Paramètres → Général (onglet par défaut) : nom, ville, téléphone, langue par défaut, barème (mise à jour
  vérifiée : aucune ligne renvoyée = refus RLS) ; logo : ré-encodage dans le navigateur (`ImageLogoService`, 512 px,
  WebP sinon PNG, EXIF retiré), dépôt en upsert, autres noms supprimés, retrait confirmé ; `logoUrl` (URL publique +
  `?v=updated_at`) dans `DaaraAccessible`, logo affiché dans la sidebar et le sélecteur de daara ;
  `AuthService.rechargerDaaraCourante()` partagé avec les modules ; `MOTIF_TELEPHONE` partagé.
- Piège : le Storage répond en HTTP 400 avec le vrai code (403, 413, 415) dans `statusCode` → lu en priorité.
- Vérifié dans le navigateur : dépôt PNG puis WebP (ancien supprimé), photo JPEG 2000 px → WebP 512 px de 920 octets,
  faux PNG refusé, retrait, enregistrement persistant, erreurs de validation, sombre, 375 px sans débordement ;
  appels directs à l'API Storage refusés (SVG 415, 600 Ko 413, autre daara et autre nom 403).
- Audit `auditeur-securite` : 0 critique, 0 important ; 4 mineurs corrigés (échec du retrait signalé, nettoyage des
  trois noms sans se fier au cache, ré-encodage contre EXIF et faux fichiers, texte « logo public ») + tests de
  lecture du bucket (anon, enseignant, autre admin). Points d'information : voir « Problèmes ouverts ».
- 172 tests unitaires, 225 tests pgTAP ; chargement initial 147,8 kB transférés.

### 2026-10-05 — S2.2 Modules activables par daara (ADR-008)
- Base : enum `module_daara`, table `daara_modules` (lecture par les membres et le super-admin, aucune écriture
  directe, journalisée), `module_actif()`, `definir_modules()` (admin aal2 ; prérequis inactifs ajoutés ; refus
  `module_requis:<prérequis>:<dépendant>` si on retire un prérequis encore requis), fonctions internes
  `prerequis_module`, `avec_prerequis`, `ecrire_modules` ; `creer_daara` recréée avec `p_modules` (tous par défaut,
  prérequis ajoutés) ; reprise : daaras existantes avec tous les modules. 29 tests pgTAP (173 au total).
- Front : `ModuleDaara` typé depuis la base, modules lus avec les daaras, `moduleGuard`, catalogue `core/daara/modules.ts`
  (prérequis, profils « coranique » / « franco-arabe »), Paramètres → Modules (admin : interrupteurs accessibles,
  prérequis expliqués, prérequis requis non désactivables, confirmation avant désactivation, message des prérequis
  activés), entrée de menu Paramètres, choix du profil à l'onboarding (« Personnalisé » : cases à cocher).
- Seed : Serigne Touba = école franco-arabe, Keur Thiès = daara coranique.
- Vérifié dans le navigateur : admin sans facteur → enrôlement TOTP imposé → Modules ; désactivation de Bulletins puis
  de Notes (confirmations), réactivation de Bulletins → Notes réactivé avec message ; journal (4 lignes, auteur) ;
  375 px en sombre ; onboarding d'un nouvel utilisateur avec le profil coranique → notes et bulletins inactifs.
- Audits : sécurité (0 critique, 0 important, 4 mineurs) et RLS (0 critique, **2 importants**, 4 mineurs), tous corrigés :
  - `module_actif` répondait pour n'importe quelle daara (oracle de configuration et d'existence) → faux pour un
    non-membre (sauf super-admin), `session_suffisante` comprise ;
  - `avec_prerequis` sortait trop tôt avec des doublons (`creer_daara(['bulletins','bulletins'])` créait une daara sans
    structure) → entrée dédoublonnée ;
  - tableaux multidimensionnels ou de plus de 16 éléments refusés (`modules_valides`) ; `updated_by` illisible par les
    membres ; nouvelle RPC `basculer_module` (part de l'état en base, verrou) : deux admins ne s'écrasent plus ;
    interrupteurs à 44 px ; catalogue front contrôlé contre l'enum ; 61 tests pgTAP sur les modules ;
  - formulation corrigée dans l'ADR-008 et `supabase-rls.md` : `(select helper(daara_id))` n'est PAS mis en cache par
    requête (argument dépendant de la ligne) → helper ensembliste pour les grosses tables (sprint 12).
- Incident pendant l'audit RLS : un script de l'auditeur a écrit hors transaction dans la base locale, nettoyé par
  l'auditeur puis `db reset` ; aucune donnée hors local.
- 154 tests unitaires, 205 tests pgTAP ; chargement initial 147,6 kB transférés.

### 2026-10-05 — S2.0 spike téléphone (ADR-009) et S2.1 navigation par daara
- S2.0 : connexion téléphone + mot de passe impossible sans fournisseur SMS (`phone_provider_disabled`) ; solution
  validée : fournisseur SMS factice + hook `before_user_created` (refuse les inscriptions publiques par téléphone, ne
  s'applique pas à l'API d'administration). Téléphone stocké sans « + ». `updateUserById(password)` révoque déjà les
  sessions → RPC `revoquer_sessions` abandonnée. ADR-009 acceptée, LLD et specs ajustés.
- S2.1 base : `session_suffisante()` (aal2 exigé pour tout accès dès qu'un facteur est vérifié ; profil et memberships
  personnels lisibles en aal1) intégré à `is_member` et `has_role` ; 16 tests pgTAP (139 au total).
- S2.1 front : `/d/:slug` (`daaraGuard`, `runGuardsAndResolvers: 'paramsChange'`), `/` (`racineGuard` : 1 daara → elle ;
  plusieurs → dernière utilisée si toujours membre, sinon `/select-daara`), page de sélection (layout « cover »),
  `CurrentDaaraService` (daara, rôles, modules, famille), `roleGuard`, menus déclarés en données (`menu.ts`, rôle +
  module), sélecteur « Changer de daara », barre basse mobile pour parents et apprenants (sidebar et bouton menu
  masqués). `AuthService.mesDaaras()` (memberships + daaras jointes, cache par utilisateur).
- Jeu de données de développement dans `supabase/seed.sql` (2 daaras, 3 comptes fictifs, mot de passe documenté) :
  local uniquement.
- Vérifié dans le navigateur : connexion d'un membre de 2 daaras → sélecteur → daara → changement de daara → daara
  inaccessible (message neutre) → `/` rouvre la dernière ; **vue 375 px vérifiée** grâce à une iframe de 375 px
  (barre basse parent, bouton menu enseignant, sélecteur, aucun débordement horizontal).
- Piège : zoom de Chrome différent de 100 % → clics à côté ; saisie par script dans ce cas.
- Audit `auditeur-securite` : 0 critique, 0 important ; 6 mineurs corrigés : `mfaGuard` sur `/onboarding` (sinon un membre
  avec facteur en aal1 passait pour « sans daara ») ; garde-fou dans `seed.sql` + interdiction de `db push --include-seed`
  et `db reset --linked` sur le cloud (`docs/deploiement.md` §2.7) ; daara ouverte et dernière daara oubliées à la
  déconnexion ; LLD aligné (`daaraGuard`) ; tests pgTAP admin + enseignant avec facteur. À vérifier sur `daara-dev`
  après la migration : un membre avec facteur en aal1 ne voit pas sa daara.
- 140 tests unitaires, 144 tests pgTAP ; chargement initial 146 kB transférés.

### 2026-10-04 — Passage à Tailwind 4 (ADR-007)
- Tailwind 4.3 via `@tailwindcss/postcss` ; thème en CSS (`@theme` dans `src/styles.css`), `tailwind.config.js`
  supprimé ; mode sombre `@custom-variant dark` ; couche de compatibilité du préflight v3 (bordures, placeholders,
  curseur des boutons) ; gris de Tailwind 3 conservés.
- Variables runtime renommées `--daara-primaire` / `--daara-sur-primaire` (`--color-*` est l'espace du thème v4),
  branchées par `@theme inline` pour que le vert du mode sombre s'applique.
- `@tailwindcss/forms` retiré (en v4 ses styles passaient devant les surcharges Vristo) : ses règles de base sont
  reprises dans `@layer components` ; `@tailwindcss/typography` retiré (inutilisé). 2 dépendances en moins.
- Classes renommées (`shadow`, `rounded`, `outline-none`, `!` en suffixe) par un script limité aux attributs `class`
  et aux `@apply` ; `auth-layout.css` réécrit en CSS standard (budget de 4 kB tenu). Table v3 → v4 dans
  `.claude/rules/ui-vristo.md` pour le markup repris de Vristo.
- Vérification : styles calculés de 11 pages (clair et sombre) relevés avant / après et comparés propriété par
  propriété : rendu identique (écarts de notation seulement, détail dans l'ADR-007) ; focus clavier contrôlé.
- 2 bugs trouvés pendant les relevés, corrigés :
  - lien direct vers une page de l'espace renvoyé au tableau de bord : au chargement, les guards démarrent en
    parallèle et `rolesActifs()` lisait les rôles avant la restauration de la session (« aucune daara » →
    onboarding → `/`). Corrigé (attente de la session) et testé ; aurait cassé `/d/:slug` au sprint 2 ;
  - `/dev/charte` absente en développement depuis le chargement à la demande des layouts : `ngDevMode` n'était pas
    encore défini à l'évaluation des routes → forme `typeof ngDevMode === 'undefined' || ngDevMode`.
- Navigateurs : Tailwind 4 (Chrome 111, Safari 16.4, Firefox 128) ne restreint presque rien de plus qu'Angular 22
  (Chrome 119, Safari / iOS 17, Firefox 119).
- Chiffres : 123 tests unitaires ; `npm audit` 0 vulnérabilité (développement compris) ; chargement initial 614 kB
  bruts / 144,7 kB transférés (584 / 142 avant).
- Piège : `@tailwindcss/upgrade` exécute des commandes git → non utilisé (règle du projet), migration manuelle.

### 2026-10-03 — Bilan du sprint 1 (Socle multi-tenant)
**Objectif** : isolation des daaras prouvée par les tests. **Atteint.** Livrable « un utilisateur crée sa daara ;
une autre daara est invisible » : atteint et vérifié en local (navigateur + pgTAP). La mise en ligne attend les
configurations du sprint 0 et celles de l'Auth (Turnstile, TOTP, modèles d'e-mail).

| Story | État |
|---|---|
| S1.1 Tables `daaras`, `profiles`, `memberships`, `audit_log`, `platform_admins` | Fait |
| S1.2 Helpers RLS, triggers `handle_new_user`, `audit_trigger` | Fait (`membres_administres()` remplace `est_admin_de_membre`) |
| S1.3 Tests pgTAP d'isolation (2 daaras, 4 rôles) | Fait : 108 tests + 15 garde-fous |
| S1.4 Inscription, connexion, déconnexion PKCE, mot de passe oublié par code | Fait — 375 px à vérifier |
| S1.5 TOTP obligatoire pour les admins (`aal2` dans `has_role`) | Fait — second facteur et codes de secours reportés (sprint 2) |
| S1.6 Onboarding : création d'une daara | Fait |
| Audits | 3 audits (RLS, sécurité base, sécurité auth) : 0 critique ; 3 importants corrigés et contre-vérifiés |

**Chiffres** : 123 tests pgTAP (75 au premier jet) ; 122 tests unitaires en 21 fichiers (55 au sprint 0) ; chargement
initial 142 kB transférés (138 au sprint 0, layouts chargés à la demande) ; 13 dépendances, 18 de développement,
aucun paquet ajouté ; `npm audit` : 0 vulnérabilité en production, 5 « high » en développement (avis publié pendant
le sprint, voir décision ci-dessous) ; 6 ADR (aucun nouveau : les décisions sont dans le LLD et ADR-006).

**Décisions** (validées) : rôle en enum `role_membre` ; aucune écriture client sur `memberships` ; enseignant limité
aux memberships des enseignants ; profil d'un membre désactivé illisible pour l'admin ; confirmation et
réinitialisation par code à 6 chiffres (30 min) ; TOTP avant la création de la daara, 3 daaras par utilisateur ;
Turnstile sur inscription, connexion, renvoi du code et mot de passe oublié ; design « cover » validé sur maquette.

**Ce qui a bien marché** :
- la maquette avant le code : design validé en un échange, puis reproduit sans aller-retour ;
- le parcours complet dans le navigateur (Mailpit, TOTP calculé) a révélé ce que la lecture ne montrait pas :
  `inject()` après `await` dans les guards (navigation bloquée sans erreur), Turnstile exigé sur la connexion,
  `aal2` exigé pour changer le mot de passe, build de production sans variables cassé depuis le sprint 0 ;
- l'audit avant le commit, appliqué dès ce sprint (point « à améliorer » du sprint 0) : énumération de comptes et
  renvoi du code cassé trouvés avant toute mise en ligne ; contre-épreuves pgTAP (fonction piégée) sur les garde-fous.

**À améliorer** :
- tester dans le navigateur les chemins secondaires, pas seulement le parcours nominal : « Renvoyer le code »
  n'était pas testé et ne pouvait jamais fonctionner (trouvé par l'audit) ;
- vérifier l'absence de caractères invisibles **avant** de donner un commit (`grep -P`, voir la mémoire de Claude) :
  une migration commitée a dû être corrigée après coup ;
- la story authentification était grosse (un commit, ~60 fichiers) : au sprint 2, découper en stories plus petites
  (une par Edge Function ou par écran) pour des commits relisibles ;
- vélocité : le code d'un sprint de 2 semaines a tenu en une journée de session ; le goulot est désormais côté
  développeur (configurations manuelles, validations, vérification en 375 px). Ajuster le plan après le sprint 2.

**Pièges à retenir** : `inject()` toujours avant le premier `await` dans un guard ; supabase-js : aucun appel Supabase
dans le rappel de `onAuthStateChange` ; Supabase Auth exige le captcha sur `signup`, `token` (mot de passe),
`recover`, `resend` ; `aal2` exigé pour changer e-mail / mot de passe d'un compte avec TOTP ; Angular ne lit pas la
variante `dark:` de Tailwind dans un style de composant (classe sur `<body>`) → `:host-context(.dark)` ou styles
globaux ; l'encapsulation renforce la spécificité (`.cour > *` écrasait `.zellige`) ; `fileReplacements` : un
fichier de remplacement ne peut pas importer le fichier qu'il remplace ; Prettier ne lit pas les modèles Go.

**Décision (CI)** : l'audit npm échouait sur `braces` (Tailwind 3, aucune version corrigée). Choix du développeur
(2026-10-04) : passer à Tailwind 4 tout de suite plutôt qu'assouplir l'audit, pour la durabilité, le projet n'en étant
qu'à l'authentification (ADR-007). L'étape d'audit de la CI reste bloquante.

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
