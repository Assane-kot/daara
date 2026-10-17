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
- Sprint 3 — Structure scolaire : **terminé** (S3.0 à S3.4, audit de fin de sprint corrigé, bilan ci-dessous).
- Sprint 4 — Apprenants et parents : **terminé** (S4.0 à S4.6, audit de fin de sprint corrigé, bilan ci-dessous) . Sprint 5 — Absences et espace parent : planification validée, S5.0 à S5.4 faits (conception, mise à jour automatique, appel, justification et suivi, notifications, accueil parent).
  S5.5 (e2e) et S5.6 (préparation du pilote) **reportées** (voir « À faire avant le pilote ») ; audit de fin de sprint
  corrigé, bilan ci-dessous.
- Sprint 6 — Évaluations et notes : planification validée, S6.0 à S6.4 faits (conception, réglages, évaluations, saisie des notes, moyennes). Suivante : S6.5 publication et parents. **Audits en fin de sprint** (décision du 2026-10-09) : voir « À l'audit de fin de
  sprint 3 ».
- **À faire avant le lancement du pilote** (décision du développeur, 2026-10-15, pour avancer sur les fonctionnalités) :
  - S5.5 : tests e2e Playwright du parcours enseignant → parent en temps réel → justification → décision, et job CI
    (`@playwright/test` en devDependency, Chromium ~100 Mo ; minutes GitHub Actions : gratuit si dépôt public, ~5-8 min
    par exécution sur 2 000 min/mois si privé) ; compléter au sprint 12 ;
  - S5.6 : daara de démonstration sur `daara-dev` (jamais en production, garde-fou comme `seed.sql`), guide utilisateur
    court par rôle (admin, enseignant, parent) avec captures, check-list de mise en route d'un pilote ;
  - risque accepté d'ici là : pas de filet automatique sur un parcours complet ; couverture actuelle = pgTAP + tests
    unitaires + vérification dans le navigateur à chaque story.
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
    - ~~AVANT le sprint 5 (ADR) : journal des données d'enfants~~ → ADR-010 (journal sans valeurs pour les tables
      d'enfants) ; reste au sprint 12 : purge planifiée (1 an) et purge à la suppression d'une daara / d'un enfant ;
    - sprint 4 (exports CSV / PDF) : neutraliser `= + - @` en tête de cellule (injection de formules) ;
    - sprint 12 : performance des politiques (`(select has_role(daara_id …))` dépend de la ligne).
  - À faire par le développeur sur `daara-dev` et `daara-prod` : Realtime → Settings → décocher « Allow public access »
    (`docs/deploiement.md` §2.10, audit de fin de sprint 5).
  - À faire par le développeur avant la preview : déployer les Edge Functions et leurs secrets (`docs/deploiement.md`
    §2.9 : APP_URL, ORIGINES_AUTORISEES, BREVO_API_KEY, EMAIL_EXPEDITEUR, TURNSTILE_SECRET ; `use-access-code` ajoutée
    à la commande de déploiement), hooks et téléphone (§2.8) ;
    vérifier sur `daara-dev` que `verify_jwt` accepte les JWT (nouvelles clés de signature) et que le CORS ne répond
    qu'aux origines de l'application (en local, Kong ajoute un CORS ouvert).
  - CI : job `edge` jamais exécuté sur GitHub → vérifier le premier run (image Docker Deno épinglée par empreinte).
  - Audit de fin de sprint 3 (2026-10-09), point reporté : les triggers de `classes` / `classe_matieres` contrôlent les
    droits aussi lors du `on delete set null` (suppression d'un compte) : une suppression de compte faite en session
    utilisateur non admin serait refusée (sans effet en service_role) → à prendre en compte dans la purge CDP (sprint 12).
  - Audit de fin de sprint 4 (2026-10-13), points ouverts :
    - export CSV / PDF (sprint 7 ou avant) : neutraliser `= + - @`, tabulation et retour chariot en tête de cellule (les noms
      importés sont stockés tels quels) ;
    - sprint 12 : purge planifiée des `invitation_enfants` des invitations expirées (acceptées et retirées : purgées) ;
      désactivation automatique des anciens parents après 12 mois sans enfant inscrit, avec avis à l'admin (ADR-010 §9).
  - Audit RLS S3.1 (2026-10-09) : la contrainte « caractères interdits » du socle (`daaras`, `profiles`, `invitations`)
    laisse passer U+061C (marque de lettre arabe), U+034F, U+180E, U+2028, U+2029 ; `texte_sur` (S3.1) les refuse →
    aligner les contraintes du socle sur `texte_sur` dans une migration (avant les libellés en arabe).
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
    - ~~sprint 3 : liste des membres sans pagination~~ → `data-table` + `rechercher_membres` (S3.4) ;
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

### Décisions de planification du sprint 6 (validées le 2026-10-15)
- **Paramétrage par daara** (demande du développeur : « chaque école a ses réalités ») → ADR-012 : toute règle qui varie
  d'une école à l'autre est un réglage avec une valeur par défaut, rangé par module dans Paramètres, expliqué par un
  exemple, pré-rempli par le profil d'onboarding, stocké en table typée et appliqué par la base ; un réglage de calcul
  modifié recalcule (avertissement), les bulletins publiés figent.
- Réglages des notes : barème, types d'évaluation (Devoir 1, Composition 2, modifiables), absent (ne compte pas / 0 / 0 si
  non justifiée), moyenne générale (pondérée / simple), arrondi, seuil de réussite, saisie par le titulaire, visibilité
  parents (après publication / dès la saisie), moyennes visibles, appréciations.
- Réglages des absences (S6.1b, rattrapage du sprint 5) : délai de correction (7 j), qui décide (admin + titulaire / admin),
  justification par les parents.
- Découpage S6.0 à S6.5 (+ S6.1b) ; moyennes calculées à la demande (fonction SQL, tests chiffrés) ; rang et bulletins au
  sprint 7.

### Décisions de planification du sprint 5 (validées le 2026-10-13)
- Découpage S5.0 à S5.6 (conception, appel, justification et suivi, notifications et temps réel, accueil parent, e2e
  Playwright, préparation du pilote) ; audit unique en fin de sprint.
- L'appel est enregistré (`appels`) en plus des absences : « Présent aujourd'hui » et appels non faits visibles ;
  présent par défaut ; types absent / retard ; un appel par jour, ou matin et après-midi (réglage de la daara).
- Parents prévenus à la fin de l'appel (pas à chaque appui) et à chaque correction ensuite ; parents actuels seulement ;
  notifications sans texte ni nom d'enfant (ADR-011) ; hors application au sprint 8.
- Enseignant : ses classes, année active, aujourd'hui et 7 jours en arrière ; admin : toute l'année active.
- Justification : le parent envoie un motif ; **l'admin ou l'enseignant titulaire** décide (choix du développeur).
- `@playwright/test` (devDependency, gratuit) pour les e2e, job CI ; daara de démonstration sur `daara-dev` seulement.

### Décisions de planification du sprint 4 (validées le 2026-10-09)
- Découpage S4.0 à S4.6 (dont S4.5 démarrage guidé et S4.6 revue ergonomique) ; audit unique en fin de sprint.
- Matricule généré par la base (`AAAA-NNNN`), non modifiable ; photo facultative, bucket privé, URL signées ; données
  minimales (nom, prénom, date de naissance, sexe, statut) ; journal sans valeurs, conservation 1 an (ADR-010) ;
  comptes apprenants reportés au sprint 9 ; import CSV analysé dans le navigateur, sans paquet, tout ou rien.
- **Exigence d'ergonomie** du développeur : toutes les fonctionnalités « très, très faciles à utiliser » → règles
  `.claude/rules/ux.md`, appliquées et vérifiées à chaque story.

### Décision de méthode (2026-10-09)
- Audits `auditeur-securite` et `auditeur-rls` en **fin de sprint** sur l'ensemble des stories, plus après chaque story
  (économie de tokens) ; par story : tests, vérification dans le navigateur, commit. CLAUDE.md (étape 5) mis à jour.

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
### 2026-10-17 — S6.4 Moyennes
- Migration `moyennes` : `arrondir_note` (centième, dixième, quart, demi-point) et `moyennes(classe, période[, élève])`
  (security invoker, jamais stockées) : note ramenée au barème de la daara, moyenne de matière pondérée par les
  coefficients des évaluations, absent selon le réglage (ne compte pas / 0 / 0 sauf absence du jour justifiée), générale
  pondérée par les coefficients des matières ou simple, matière sans note ignorée, arrondi du réglage, seuil (moitié du
  barème par défaut) ; parent : `{ masquees: true }` si les moyennes sont masquées. Politique ajoutée : le parent lit les
  matières de la classe de ses enfants (sans elle, ni matières ni générale pour lui). 22 tests pgTAP dont 16 cas chiffrés
  (856).
- Front : « Voir les moyennes » depuis Notes → `/d/:slug/notes/moyennes` : classe et période, tableau élèves × matières
  (coefficient sous chaque matière) + moyenne générale, « — » sans note, rouge sous le seuil, légende ; cartes sous 640 px ;
  recalcul automatique (notes, réglages, absences).
- Vérifié dans le navigateur (enseignant titulaire) : Coran coef. 3 et Français coef. 2 → Awa 16,2 ; Cheikh 10 ; Bineta 8
  (absente au Coran, ignoré) en rouge ; Moussa 14,5 ; 375 px en cartes sans débordement. 317 tests unitaires.
### 2026-10-17 — S6.3 Saisie des notes
- Migration `notes` (module `notes`) : table (une ligne par élève noté : valeur de 0 au barème par quart de point, ou
  absent ; appréciation de 200 caractères au plus ; classe et matière copiées de l'évaluation), `notes_coherentes` (droits
  en tête par `peut_ecrire_evaluation`, matière contrôlée contre celle de l'évaluation, période non clôturée, élève inscrit
  dans la classe, barème, appréciations selon le réglage, auteur et date), `notes_suppression` ; lecture : admin,
  `enseigne_classe_active`, parent de l'élève si l'évaluation lui est lisible ; journal sans valeurs, signaux ;
  évaluations : barème non abaissable sous une note saisie, publiée et notée non supprimable. 24 tests pgTAP (834).
- Front : `/d/:slug/notes/evaluations/:id` : tous les élèves sur un écran (ordre alphabétique), champ numérique
  (`inputmode="decimal"`, virgule acceptée), Entrée → élève suivant, enregistrement à la sortie du champ (« Enregistré » sur
  la ligne, erreur expliquée sur la ligne sans rien envoyer), « Absent » en un toucher, appréciation repliée, résumé
  (notes, absents, sans note) ; un enregistrement à la fois par élève ; saisie d'un collègue en même temps (23505) → mise à
  jour ; lecture seule si période clôturée ou matière d'un collègue ; liste des évaluations : « Saisir les notes », « n
  saisie(s) ». Mise à jour automatique.
- Vérifié dans le navigateur (enseignant, clavier réel) : « 14,5 » Entrée « 9 » Entrée → enregistrés, « 25 » → « La note
  dépasse le barème. » ; Awa corrigée à 17, Bineta absente, appréciation de Moussa ; base et journal (sans valeurs)
  vérifiés ; 375 px sans débordement. 315 tests unitaires.
- Piège : après une relance de `ng serve`, un onglet ouvert peut demander un ancien morceau (« Failed to fetch
  dynamically imported module ») → la navigation retombe sur `/` avec une page blanche ; recharger la page.
### 2026-10-17 — S6.2 Évaluations par classe, matière et période
- Migration `evaluations` (module `notes`) : table (matière de classe, classe copiée, période, type, intitulé, date,
  barème 1 à 100 et coefficient 0,25 à 20 par quart, `publiee_at` hors droits client) ; `peut_ecrire_evaluation` (admin
  aal2, enseignant de la matière, titulaire si `titulaire_saisit` ; année active ; module) dans les politiques et en tête
  de `evaluations_coherentes` (même daara, période de l'année de la classe non clôturée, date dans la période, type non
  archivé ; barème de la daara et coefficient du type par défaut) et `evaluations_suppression` ; lecture : admin,
  `enseigne_classe_active`, parents (publiées, ou toutes si « dès la saisie ») ; matière de classe, période et type
  utilisés non supprimables (clé étrangère contrôlée en fin d'instruction : la suppression d'une daara passe) ; journal,
  signaux. Publication réservée à `publier_evaluation` (S6.5, indicateur `daara.publication`). 28 tests pgTAP (810).
- Front : menu « Notes » (icône Vristo `notes-edit`), `/d/:slug/notes` : classe, matière (les siennes ; toutes pour
  l'admin ou le titulaire autorisé) et période (celle du jour par défaut) gardées dans l'adresse ; évaluations (« À
  saisir » / « Publiée »), « Nouvelle évaluation » : type en un toucher, intitulé numéroté proposé (« Devoir 2 »), date du
  jour ramenée dans la période, barème de la daara, coefficient du type ; modifier, supprimer (confirmé) ; période
  clôturée en lecture seule ; états vides avec action (classes, périodes, matières). Mise à jour automatique.
- Vérifié dans le navigateur (enseignant titulaire de CE1 A, Coran à lui, Français sans enseignant) : seul Coran proposé,
  Trimestre 1 par défaut, « Composition » → « Composition 1 », coef. 2 → créée (base vérifiée) ; 375 px sans débordement.
  305 tests unitaires.
- Outillage : `node_modules` absent en début de session → `npm ci` ; page blanche sans erreur ensuite (cache Vite des
  dépendances périmé) → **piège** : après une réinstallation, vider `.angular/cache` avant `ng serve`. Base locale
  remise à zéro : jeu de vérification recréé à la main (année 2026-2027, 3 trimestres, CE1 A, Coran, Français).
### 2026-10-16 — S6.1b Paramètres → Absences
- Migration `reglages_absences` (module `absences`, ADR-012) : délai de correction de l'enseignant (7 j, 0 à 30), qui
  décide d'une justification (admin + titulaire / admin seul), justification par les parents (oui / non) ; valeurs par
  défaut pour chaque daara (création et existantes, via `reglages_par_defaut`) ; `verifier_appel`, `justifier_absence`
  (`justification_desactivee`) et `decider_justification` lisent désormais ces réglages. 10 tests pgTAP (782).
- Front : onglet Paramètres → Absences (appel une fois / matin et après-midi déplacé depuis Général, délai, décideur,
  justification par les parents ; une phrase d'exemple par réglage) ; écran d'appel : date la plus ancienne selon le
  délai ; « Justifier » masqué chez le parent si désactivé ; décision proposée au titulaire seulement si le réglage
  l'autorise.
- Vérifié dans le navigateur (admin) : matin et après-midi, délai 3 jours, admin seul → enregistrés (base vérifiée).
  291 tests unitaires.

### 2026-10-16 — S6.1 Paramètres → Notes
- Migration `reglages_notes` (module `notes`, ADR-012) : enums, `reglages_notes` (une ligne par daara : absent, moyenne
  générale, arrondi, seuil, saisie par le titulaire, visibilité parents, moyennes visibles, appréciations) et
  `types_evaluation` (nom unique sans casse, coefficient 0,25 à 20 par quart) ; valeurs par défaut posées par un trigger à
  la création de chaque daara (contrôle des droits sauté seulement depuis ce trigger : le créateur n'est pas encore
  admin) et pour les daaras existantes ; lecture membres actuels + module, écriture admin aal2 + module ; journal et
  signaux. 15 tests pgTAP (772 ; test de journal de `creer_daara` complété).
- Front : onglet Paramètres → Notes (visible si le module est actif ; onglets filtrés par module) : types d'évaluation
  (renommer, coefficient, archiver, supprimer si inutilisé, ajouter), réglages en tuiles avec une phrase d'exemple chacun,
  seuil (vide = moitié du barème), barème rappelé avec lien vers Général ; avertissement avant un changement de calcul.
- Profils d'onboarding : mêmes valeurs par défaut pour les deux (le profil « Daara coranique » n'active pas le module
  `notes`) ; à revoir si une école signale d'autres habitudes.
- Vérifié dans le navigateur (admin) : valeurs par défaut affichées, « Interrogation » (0,5) ajoutée, arrondi « quart de
  point » enregistré après l'avertissement (base : `quart`, 3 types). 290 tests unitaires.

### 2026-10-15 — S6.0 Conception du sprint 6
- Plan validé (décisions ci-dessus). ADR-012 (paramétrage par daara + calcul des moyennes), spec `notes.md`, LLD : §2
  routes (`notes/...`, onglets Absences et Notes des Paramètres), §3.5 (`reglages_notes`, `types_evaluation`,
  `evaluations`, `notes`, `reglages_absences`, enums), §4 matrice, RPC `moyennes`, `arrondir_note`,
  `publier_evaluation`, §7.3 calcul.

### 2026-10-15 — Audit de fin de sprint 5 et bilan du sprint 5 (Absences et espace parent)
**Audit** (un seul agent `auditeur-securite`, mode économe) : 0 critique, **1 important**, 4 mineurs. Vérifié sans
problème : canaux Realtime privés (aucun envoi client, `membre_actuel` / `auth.uid()`, messages sans donnée),
indicateurs de transaction non positionnables par un client, notifications sans texte et jamais à l'auteur, aucun
`innerHTML`, statistiques sans fuite entre classes. Corrigés (migration `corrections_sprint5`, 8 tests pgTAP, 757) :
- **important** : `teaches_class` ignore l'année → un ancien enseignant lisait encore les absences et motifs de sa classe
  de l'an passé, décidait et supprimait un appel → `enseigne_classe_active` dans toutes les politiques d'appels et
  d'absences et dans la décision du titulaire (`teaches_class`, utilisé par la structure, inchangé) ;
- suppression d'un appel soumise à `verifier_appel` (7 jours, année active) ; type changé après une décision → décision
  annulée (retour à « envoyée » / « sans justification ») ; notifications illisibles par un membre désactivé ;
  `docs/deploiement.md` §2.10 : décocher « Allow public access » de Realtime (tâche du développeur).

**Objectif** : l'enseignant fait l'appel, le parent est prévenu en temps réel et justifie. **Atteint en local**
(navigateur + pgTAP). Livrable « déploiement chez les pilotes » : après S5.5 et S5.6, reportées avant le pilote.

| Story | État |
|---|---|
| S5.0 Conception (LLD, specs, ADR-011) | Fait |
| S5.0b Mise à jour automatique entre profils (ajoutée en cours de sprint) | Fait |
| S5.1 Appel du jour | Fait |
| S5.2 Justification, décision, suivi, statistiques | Fait |
| S5.3 Notifications dans l'application | Fait |
| S5.4 Accueil parent mobile | Fait |
| S5.5 Tests e2e Playwright | Reportée avant le pilote |
| S5.6 Préparation du pilote | Reportée avant le pilote |
Hors stories, sur retours du développeur : classe absente de la fiche élève (bug `[value]` / `@for`), ajout de plusieurs
matières en une fois (règle « sélection multiple avec recherche »), anciens parents, enseignants limités à l'année.

**Chiffres** : 757 tests pgTAP (684 après S5.0b ; 668 à la fin du sprint 4) ; 287 tests unitaires (264) ; chargement
initial 151,8 kB (151,0) ; 1 ADR (011, révisé en cours de sprint) ; aucun paquet npm ajouté.

**Ce qui a bien marché** : les retours du développeur en cours de sprint (temps réel, sélection multiple) ont donné des
règles générales réutilisées ensuite ; tester le navigateur avec des touchers très rapides a révélé une course réelle ;
les notifications et signaux sans aucune donnée simplifient la sécurité.

**À améliorer** : la limite « année active » décidée au sprint 4 n'a pas été appliquée aux nouvelles politiques du
sprint 5 (trouvé par l'audit) → règle : toute politique enseignant sur une donnée d'élève passe par un helper borné à
l'année active ; les remises à zéro de la base effacent les données de test du développeur (prévenir à chaque fois).

**Pièges à retenir** : `[value]` sur un `<select>` dont les options viennent d'un `@for` ; le garde-fou de transaction ne
marche pas avec `psql -c` ; colonne `not null` remplie par trigger → types générés exigeants ; un effet qui lit le signal
qu'il modifie boucle (`untracked`) ; nouvelle table → retirer les privilèges par défaut avant les droits par colonne.

### 2026-10-15 — S5.4 Accueil parent mobile
- Front seul : « Mes enfants » devient l'accueil du parent (le tableau de bord le redirige, l'entrée « Tableau de bord » est
  retirée de son menu ; barre basse : Mes enfants, Notifications). Carte par enfant : situation du jour calculée par
  `situationDuJour` (présent / absent / en retard selon le dernier créneau terminé, accord fille / garçon ; « l'appel
  d'aujourd'hui n'est pas encore fait » ; rien pendant un appel en cours), absences à justifier des 30 derniers jours avec
  « Justifier » (motif proposé en un toucher), lien vers toutes ses absences ; mise à jour automatique (appel terminé,
  décision). `MonEnfant` porte le sexe et la classe ; `AbsencesService.situation`.
- Vérifié dans le navigateur (parent, 375 px) : connexion → « Mes enfants » ; « Aminata est présente aujourd'hui »,
  « Fatou est absente aujourd'hui » + « Justifier » → « Malade » → envoyé, l'absence quitte « à justifier » ; barre basse,
  pas de débordement. 287 tests unitaires.
- Piège de test : la session vide du démarrage remet la daara courante à zéro → définir la daara après la création du
  composant dans les tests de layout.

### 2026-10-15 — S5.3 Notifications dans l'application
- Migration `notifications` (module `notifications`) : enum `type_notification`, table `notifications` (identifiants
  seulement : élève, absence, date, créneau ; ni texte ni nom d'enfant, ADR-011), lecture et « lu » par le destinataire
  seulement, aucune création client ; `notifier` (jamais à l'auteur, module actif), `parents_a_prevenir` (parents actifs
  reliés), `equipe_a_prevenir` (admins + titulaire) ; triggers : fin de l'appel → parents des absents et retardataires ;
  après la fin : ajout, changement de type, retrait (« absence annulée ») ; motif → équipe ; décision → parents ; signal
  Realtime privé `utilisateur:<uuid>` (politique sur `realtime.messages`). 17 tests pgTAP (749).
- Front : `NotificationsService` (non lues, 10 dernières, canal par utilisateur), cloche dans l'en-tête (pastille,
  menu, « Tout marquer comme lu », « Voir toutes les notifications »), page `/d/:slug/notifications` (non lues en gras,
  « Voir plus », un toucher ouvre l'enfant ou les absences et marque lue), entrée « Notifications » de la barre basse
  des parents avec pastille ; barre basse : une icône par entrée ; messages composés à l'écran avec l'accord (« absente »
  pour une fille : sexe obligatoire) et la décision réelle (« est justifiée » / « n'est pas justifiée ») ; « Terminer
  l'appel » annonce « Leurs parents seront prévenus dans l'application ». Date du jour à Dakar déplacée dans `core/dates`.
- Vérifié dans le navigateur : parent connecté, l'enseignant termine l'appel → la cloche passe à 1 sans recharger ;
  « Fatou était absente aujourd'hui. » → toucher → page de l'enfant, cloche à 0. 284 tests unitaires.

### 2026-10-14 — S5.2 Justification des absences et suivi
- Migration `justification_absences` : RPC `justifier_absence` (parent de l'enfant, motif nettoyé de 300 caractères au
  plus, refus après décision), `decider_justification` (admin aal2 ou **titulaire** de la classe ; décision corrigeable ;
  sans motif possible), `statistiques_absences` (security invoker : l'enseignant ne voit que ses classes ; taux par
  classe, 10 élèves les plus absents sans noms) ; `absences_coherentes` reprise : indicateur de transaction
  `daara.rpc_absence` pour les écritures des RPC (type immuable). 20 tests pgTAP (732).
- Front : menu « Absences » (icône Vristo `calendar`) → `/d/:slug/absences` (admin ; enseignant : ses classes) : appels pas
  encore terminés aujourd'hui (liens directs vers l'appel), liste filtrée (7 / 30 jours / depuis la rentrée, classe,
  justification dont « À décider »), « Justifiée » / « Non justifiée » en un toucher (admin, titulaire), statistiques ;
  fiche élève → « Absences » ; parent → « Mes enfants » cliquable → `/d/:slug/enfants/:id` (absences, « Justifier » :
  motifs proposés en un toucher ou texte libre, « Modifier le motif » tant que ce n'est pas décidé). Mise à jour
  automatique partout (S5.0b).
- Vérifié dans le navigateur : parent → « Justifier » → « Malade » → « Justification envoyée » ; décision du titulaire →
  « Justifiée » apparaît chez le parent sans recharger ; enseignant → Absences : 3 lignes, décision « Non justifiée »,
  statistiques (taux 50 %) ; 375 px sans débordement. 281 tests unitaires.

### 2026-10-14 — S5.1 Appel du jour
- Migration `appels_absences` (module `absences`) : `daaras.appel_demi_journee`, enums `creneau_appel`, `type_absence`,
  `etat_justification`, tables `appels` (une par classe, date, créneau ; terminé par RPC) et `absences` (absents et
  retards seulement ; classe, date, créneau copiés de l'appel ; motif / état / décision hors droits client, S5.2) ;
  `verifier_appel` (droits en tête : admin aal2, enseignant `teaches_class` sur 7 jours, module ; année active ; date
  pas future), triggers de cohérence et de suppression, journal sans valeurs, signaux (S5.0b), droits par colonne (`id`
  non choisi par le client), RPC `terminer_appel` (droits vérifiés avant le verrou). 28 tests pgTAP (712).
- Front : menu « Appel » (icône Vristo `list-check`), `/d/:slug/appel` (classes du jour : les siennes pour l'enseignant,
  toutes pour l'admin ; état À faire / En cours / Fait avec absents et retards ; date du jour par défaut, 7 jours en
  arrière pour l'enseignant ; créneau si matin et après-midi), `/d/:slug/appel/:classeId` (présent par défaut ; toucher :
  absent → en retard → présent, enregistré à chaque toucher, retour arrière si l'enregistrement échoue ; compteurs ;
  barre fixe « Terminer l'appel » avec résumé confirmé ; corrections possibles après) ; Paramètres → Général : « Appel :
  une fois par jour / matin et après-midi » (module actif). `DaaraAccessible.appelDemiJournee`.
- Vérifié dans le navigateur (enseignant titulaire) : appel de CE1 A (6 élèves), touchers très rapides → écran et base
  identiques, résumé « 2 absent(s) et 2 retard(s) », appel « Fait » dans la liste ; 375 px (boutons de 60 px, pas de
  débordement). Non vérifié dans le navigateur : le réglage demi-journée (tests unitaires et pgTAP).
- Bug trouvé dans le navigateur et corrigé : un 2e toucher arrivé juste avant le rafraîchissement de l'écran repartait
  de l'ancien état (insertion en double refusée) → état courant relu au toucher, un enregistrement à la fois par élève ;
  insertion déjà faite par un collègue → mise à jour.
- Pièges : les privilèges par défaut de Supabase donnent tout à `authenticated` sur une nouvelle table → `revoke` puis
  droits par colonne (déjà fait pour `apprenants`) ; colonnes `not null` remplies par trigger → types générés exigeants
  (insertion annotée côté service) ; le garde-fou de transaction de l'auditeur ne marche pas avec `psql -c` (un seul
  message) → script passé par l'entrée standard.
- 278 tests unitaires. Pas d'audit (fin de sprint).

### 2026-10-13 — S5.0b Mise à jour automatique entre profils
- Demande du développeur : les changements faits par un autre profil (invitation acceptée, matières ou élèves ajoutés)
  n'apparaissaient qu'après actualisation. ADR-011 révisé (validé) : signaux Realtime Broadcast privés par daara.
- Migration `signaux_daara` : `canal_daara_autorise` (membres actuels), politique de lecture sur `realtime.messages`
  (aucun envoi client), `signaler_changement` + 3 triggers par instruction (tables de transition) sur 13 tables : un
  signal « table modifiée » par instruction et par daara, **sans donnée**. 13 tests pgTAP (684 ; messages vérifiés si la
  partition du jour de `realtime.messages` existe, sinon test neutre : la CI ne lance que la base).
- Front : `SignauxDaaraService` (canal `daara:<uuid>` privé, ouvert par le layout de l'espace, changé avec la daara ;
  `surveiller(tables, action)` regroupé à 400 ms ; retour sur l'onglet et reconnexion → tout recharger ; daara, modules
  ou membres modifiés → contexte de la daara rechargé pour tous : menus, rôles). Branché sur Membres, Invitations, Années,
  Matières, Classes, détail d'une classe, élèves d'une classe, Élèves, fiche élève, parents d'un élève, Mes enfants,
  démarrage guidé (rechargements silencieux, sans squelette). `provideSignauxTesting()` pour les tests de composants.
- Vérifié dans le navigateur (admin, écran ouvert, écritures faites par la base comme par un autre profil) : 2 matières
  et 3 élèves ajoutés à CE1 A apparaissent en moins de 2 s sans recharger ; un parent qui rejoint la daara apparaît dans
  Membres. 273 tests unitaires.

### 2026-10-13 — Correctif : classe absente de la fiche élève
- Signalé par le développeur : la fiche d'un élève inscrit affichait « Pas encore de classe ». Cause : `[value]` posé sur
  le `<select>` s'applique avant que `@for` crée les options → le navigateur retombe sur la première option. Corrigé par
  `[selected]` sur chaque option (fiche élève, sélecteur d'année des Classes). Test de composant ajouté (contre-épreuve :
  il échoue avec l'ancien code). **Piège** : jamais `[value]` sur un `<select>` dont les options viennent d'un `@for` si
  la valeur initiale n'est pas la première option → `[selected]` sur les options.

### 2026-10-13 — Ajout de plusieurs matières à une classe (retour du développeur)
- Retour : ajouter les matières d'une classe une par une, avec aller-retour, est fatigant → **règle générale** ajoutée à
  `.claude/rules/ux.md` : tout ajout d'éléments pris dans une liste = une modale avec recherche sans accents, cases à
  cocher, « Tout sélectionner », réglages de chaque élément sur sa ligne une fois coché, un bouton « Ajouter n … ».
- Détail d'une classe : « Ajouter des matières » (`AjoutMatieresDialog`) : recherche (nom, code), cases, « Tout
  sélectionner », coefficient (défaut 1, 0,5 à 20 par demi-points, erreur sur la ligne) et enseignant par matière
  cochée ; un seul envoi (tout ou rien, `affecterPlusieurs`). La modale « Modifier » ne sert plus qu'à la modification.
  Catalogue vide : message et bouton « Créer les matières » (vers l'onglet Matières).
- Vérifié dans le navigateur : CE1 A, Coran (coefficient 3) et Français ajoutés en un envoi. 267 tests unitaires.
- Autre cas « un par un » repéré : relier un même parent à plusieurs enfants se fait fiche par fiche → à traiter avec la
  règle (modale multi-enfants depuis la fiche d'un parent ou la liste des élèves) lors d'une prochaine story.

### 2026-10-13 — S5.0 Conception du sprint 5
- Plan du sprint 5 validé (décisions ci-dessus). ADR-011 (temps réel et notifications : notifications en base sans texte
  ni nom d'enfant, prévenir à la fin de l'appel, un canal Realtime par écran, seuils de passage à Pro, conservation).
- Specs `absences.md` et `notifications.md` ; LLD : §2 routes (`appel`, `absences`, `notifications`), §3.5 détaillé
  (`daaras.appel_demi_journee`, enums, `appels`, `absences`, `notifications`, publication Realtime), §4 matrice et
  politiques, RPC `terminer_appel`, `justifier_absence`, `decider_justification`, `statistiques_absences`, trigger
  `notifier_absences`, §7.2 flux de l'appel.

### 2026-10-13 — Audit de fin de sprint 4 et bilan du sprint 4 (Apprenants et parents)
**Audit** (un seul agent `auditeur-securite`, mode économe) : 0 critique, 0 important, 5 mineurs. Vérifié sans problème : le
marqueur `daara.acceptation_invitation` n'est pas positionnable par un client, report des enfants limité aux invitations
parent, droits en tête des triggers, bucket `photos`, journal sans valeurs des 4 tables d'enfants, aucune donnée d'élève
vers Sentry. Corrigés :
- « Mes enfants » d'un parent aussi admin ou enseignant affichait tous les élèves qu'il peut lire → jointure
  `parent_links!inner` filtrée sur l'utilisateur connecté (+ test unitaire) ;
- migration `corrections_sprint4` : import borné à 1 Mo et nom de classe à 100 caractères ; enfants rattachés à une
  invitation acceptée ou retirée effacés par un trigger **différé** (« Renvoyer » retire l'ancienne invitation avant d'en
  reporter les enfants) ; 4 tests pgTAP (665 ; `set constraints all immediate` pour déclencher la purge dans le test).
Décision du développeur (2026-10-13) sur le 5e constat : **enseignants limités à l'année active** (élèves inscrits de leurs
classes de l'année active, plus les partis), **parents sans limite** de temps → migration `enseignant_annee_active`
(`enseigne_apprenant` recréée ; politiques et photos suivent), ADR-010 §8, LLD ; 3 tests pgTAP (changement d'année et
élève parti côté enseignant, enfant parti sans année active côté parent ; 668 au total).
Décision du développeur (2026-10-13) : **ancien parent** (aucun enfant inscrit) → garde son compte et l'historique de
ses enfants, ne voit plus rien de l'école → migration `parents_actuels` : `parent_actuel` / `membre_actuel` (lecture des
années, périodes, matières ; règle ajoutée à `supabase-rls.md` pour les annonces et notifications à venir),
`rechercher_membres` avec `ancien_parent` et le filtre `anciens_parents` ; Membres : badge « Ancien parent », filtre et
explication ; ADR-010 §9, LLD ; 3 tests pgTAP (671).
Ouverts : voir « Problèmes ouverts » (neutralisation à l'export, purge des expirées, désactivation automatique).

**Objectif** : une classe remplie avec ses parents invités. **Atteint en local** (navigateur + pgTAP).

| Story | État |
|---|---|
| S4.0 Conception (LLD §3.4, ADR-010, spec, règles d'ergonomie) | Fait |
| S4.1 Fiches apprenants (matricule, photo privée, saisie en série) | Fait |
| S4.2 Inscriptions, élèves d'une classe, `enseigne_apprenant` | Fait (+ sexe obligatoire, décision du développeur) |
| S4.3 Liens parents, invitation depuis la fiche, « Mes enfants » | Fait |
| S4.4 Import CSV (tout ou rien) | Fait |
| S4.5 Démarrage guidé de l'admin | Fait |
| S4.6 Revue ergonomique des sprints 1 à 3 | Fait |

**Chiffres** : 671 tests pgTAP (577 au sprint 3) ; 264 tests unitaires (242) ; chargement initial 151,0 kB (150,7) ; 1 ADR
(010) ; aucun paquet npm ajouté (analyse CSV maison).

**Ce qui a bien marché** : la règle d'ergonomie écrite (`ux.md`) dès S4.0, appliquée puis vérifiée à chaque story ; le
mode simulation de l'import (la base vérifie avant d'écrire, toutes les erreurs en une fois) ; l'audit unique de fin de
sprint, court et sans important.

**À améliorer** : les tests pgTAP qui cherchent une ligne par son libellé (4e occurrence évitée en filtrant toujours sur
la daara du test) ; vérifier les écrans en sombre plus tôt (`btn-outline-dark` illisible depuis le sprint 0) ; les
captures du navigateur piloté échouent parfois (mesures par script à la place).

**Pièges à retenir** : un trigger « après » qui nettoie doit parfois être **différé** quand une même fonction retire puis
reporte (ordre des opérations) ; un parent peut aussi être admin ou enseignant : filtrer explicitement sur ses liens,
la RLS additionne les politiques ; l'outil Write convertit les échappements Unicode (`\uFEFF`, `\u200b`) en
caractères réels : contrôle `grep -P` avant chaque livraison.

### 2026-10-13 — S4.6 Revue ergonomique des écrans des sprints 1 à 3
- Grille `.claude/rules/ux.md` passée sur les écrans des sprints 1 à 3 (textes fr / en, états vides, claviers mobiles,
  retours après action) ; pas de jargon trouvé dans les textes affichés.
- Corrigé :
  - états vides sans action → « Créer la première année scolaire » (Années), « Créer l’année scolaire » (Classes sans
    année, admin), « Créer la première classe », « Créer la première matière », « Ajouter la première matière » (détail
    d’une classe), « Inviter un membre » (Invitations, message reformulé) ;
  - « Révoquer » (jargon) → « Retirer l’invitation » (pas « Annuler l’invitation » : confusion avec le bouton « Annuler »
    de la confirmation) ; message de succès après retrait ;
  - « Confirmer » → « Confirmer mon adresse » (confirmation de l’e-mail) ;
  - claviers numériques : coefficient (`decimal`), ordre d’une période (`numeric`).
- Vu sans correction : les modales se ferment en touchant à côté (formulaires courts, un écran) ; les champs téléphone
  (`type="tel"`) ont déjà le bon clavier.
- Vérifié dans le navigateur : Matières vide → « Créer la première matière » ; Invitations vide → « Inviter un membre »
  ouvre la modale ; démarrage guidé de Keur Thiès (structure sans notes : 6 étapes, sans « Matières »).
- 263 tests unitaires. Pas d'audit (fin de sprint).

### 2026-10-13 — S4.5 Démarrage guidé de l'admin
- Front seul (aucune migration) : sur le tableau de bord de l'admin, « Bien démarrer avec DAARA » : étapes dans l'ordre
  (année, matières si module notes, classes, élèves, élèves placés dans une classe, enseignants invités ou membres,
  parents reliés ou invités ; daara sans module structure : élèves, enseignants, parents), faites d'après des comptages
  (`count: 'exact', head: true`, en parallèle ; table illisible = 0) ; barre d'avancement accessible ; un seul bouton plein
  vers la prochaine étape, « Y aller » pour les autres ; « Masquer ce guide » (localStorage par daara, protégé) et
  « Afficher le guide de démarrage ». Spec complétée.
- `btn-outline-dark` illisible en mode sombre (texte sombre sur fond sombre) → variante sombre dans `styles.css`
  (concerne aussi « Annuler » de l'import S4.4).
- Vérifié dans le navigateur : Serigne Touba (année, classes, élèves importés, enseignant du jeu de données) → 5 étapes
  sur 7, prochaine « Ajouter les matières » ; sombre ; 375 px sans débordement.
- 263 tests unitaires (+5). Pas d'audit (fin de sprint).

### 2026-10-10 — S4.4 Import CSV des apprenants
- Migration `import_apprenants` : RPC `importer_apprenants(p_daara, p_lignes, p_classe, p_simuler)` en security invoker
  (RLS, matricule, journal sans valeurs comme une saisie) : admin aal2, 1 à 500 lignes, revalidation complète, classe
  de l'année active retrouvée par son nom sans accents ni casse (ou classe par défaut), doublons (même nom, prénom, date)
  dans le fichier ou la daara, erreurs `{ligne, champ, code}` sans rien écrire (tout ou rien), mode simulation. LLD
  complété (signature : `p_simuler`). 18 tests pgTAP (661).
- Front : « Importer une liste » sur la liste des élèves → `/d/:slug/apprenants/import` (admin) : 1. modèle CSV (fr / en,
  BOM, `;`), 2. aide par colonne avec exemples, 3. classe par défaut facultative + choix du fichier ; analyse dans le
  navigateur sans paquet (`import-csv.ts` : guillemets, séparateur `;` `,` tabulation, UTF-8 sinon Windows-1252, en-têtes
  fr / en dans n'importe quel ordre, Garçon / Fille et équivalents, dates JJ/MM/AAAA ou AAAA-MM-JJ) ; la base vérifie
  aussitôt les lignes saines (simulation) → **toutes les erreurs en une fois**, au numéro de ligne du fichier, avec la
  valeur lue et la correction à faire ; sinon aperçu (classe affichée sous son vrai nom) → « Importer les n élèves ».
- Vérifié dans le navigateur : fichier Windows-1252 avec date impossible, classe inconnue et doublon interne → 3 erreurs
  d'un coup ; fichier corrigé → 4 élèves importés (matricules 2026-0001 à 0004, « ce1 a » → CE1 A, « etoile cp » →
  Étoile CP) ; réimport → doublon signalé ; séparateur virgule ; 375 px sans débordement. Téléchargement du modèle non
  cliqué (vérifié par test unitaire : modèle relu par l'analyse).
- 258 tests unitaires (+11). Test `badge.spec` instable une fois sous charge (styles calculés), vert au second passage.
  Pas d'audit (fin de sprint).

### 2026-10-10 — S4.3 Liens parents ↔ enfants
- Migration `liens_parents` : enum `lien_parent`, `parent_links` (parent = membre actif `parent`, droits en tête sauf
  pendant l'acceptation d'invitation), `invitation_enfants` (enfants rattachés à une invitation en attente : fratries,
  reportés au « Renvoyer »), `is_parent_of`, `classe_d_un_enfant`, lecture parent des enfants / inscriptions / classes /
  photos, RPC `rattacher_enfant_invitation`, `creer_invitation` et `accepter_invitation_pour` repris (report des
  enfants, liens créés à l'acceptation). Écart au LLD (corrigé) : table `invitation_enfants` plutôt que des colonnes sur
  `invitations` (plusieurs enfants par invitation). 23 tests pgTAP (643).
- Front : fiche élève → « Parents » (lien père / mère / tuteur, parent déjà inscrit relié en un clic, ou « Inviter un
  nouveau parent » qui ouvre la modale d'invitation avec le rôle parent imposé et rattache l'enfant), « Retirer » ;
  parent → « Mes enfants » (photo, classe ; barre basse mobile). `InvitationCreee` porte l'identifiant de l'invitation.
- Vérifié dans le navigateur : Fatou Ndiaye reliée à Awa (mère), invitation d'un père par téléphone avec l'enfant
  rattaché (ligne `invitation_enfants`), parent.dev → « Mes enfants » : Awa, CE1 A. L'acceptation de bout en bout est
  couverte par pgTAP (invitation, 2 enfants, « Renvoyer », acceptation → 2 liens).
- 247 tests unitaires. Pas d'audit (fin de sprint).

### 2026-10-09 — S4.2 Inscriptions dans les classes
- Migration `inscriptions` (module `structure`) : une classe par élève et par année (année copiée de la classe par le
  trigger, droits en tête), élève parti non inscriptible, changement de classe seulement dans l'année, classe avec
  inscrits non supprimable (`restrict`), journal sans valeurs ; `enseigne_apprenant`, politique de lecture des élèves
  par l'enseignant, `photo_apprenant_lisible` (photos lisibles par les enseignants de l'élève). 20 tests pgTAP (619).
- Front : détail d'une classe → « Élèves (n) », « Inscrire des élèves » (recherche sans accents, cases, « Tout
  sélectionner », un clic), « Retirer de la classe » ; fiche élève → classe de l'année active choisie dans une liste
  (inscrire / changer / retirer en un choix) ; liste des élèves → colonne et filtre « Classe » ; enseignant : menu
  Élèves en lecture seule (élèves de ses classes, aucune action).
- Vérifié dans le navigateur : 2 élèves inscrits en CE1 A en un clic, Modou placé en CP B depuis sa fiche, filtre
  CE1 A ; enseignant (titulaire de CE1 A) : ses 2 élèves seulement, fiche sans bouton.
- Décision du développeur (2026-10-10) : sexe de l'élève **obligatoire, Garçon ou Fille seulement**, jamais « non
  précisé » → migration `sexe_obligatoire` (not null), formulaire à 2 choix obligatoire, ADR-010, LLD et règle
  d'ergonomie (« pas de choix inutile ») mis à jour.
- Piège (3e fois) : un test pgTAP qui cherche une ligne par son seul libellé casse dès que la base locale contient des
  données de démonstration → toujours filtrer sur la daara du test (012 corrigé).
- 245 tests unitaires ; chargement initial ~150,8 kB transférés. Pas d'audit (fin de sprint).

### 2026-10-09 — S4.1 Fiches apprenants
- Migration `apprenants` (socle, ADR-010) : enums `sexe_apprenant` / `statut_apprenant`, `apprenants` (matricule
  `AAAA-NNNN` attribué par trigger via `compteurs_matricule`, non fourni ni modifiable par le client ; recherche sans
  accents ; photo_path contraint ; `user_id` réservé au sprint 9), `ecrivain_admin` (droits en tête des triggers),
  `audit_trigger_colonnes` (journal sans valeurs), bucket privé `photos` (1 Mo) et politiques admin
  (`photo_apprenant_administree`). Lecture admin seulement (enseignants S4.2, parents S4.3). 22 tests pgTAP (599).
- Front : menu « Élèves », `/d/:slug/apprenants` (`data-table` : recherche, statut, tri ; état vide avec « Ajouter le
  premier élève » — nouvelle option `actionVide` du `data-table`), modale avec « Enregistrer et ajouter un autre » (nom
  de famille gardé pour une fratrie), fiche (photo ré-encodée 512 px, URL signée 1 h ; « A quitté la daara » /
  « Réinscrire » ; suppression confirmée qui oriente vers « parti »).
- Vérifié dans le navigateur : liste vide → premier élève, saisie en série (2 élèves, matricules 2026-0001 / 0002),
  photo JPEG 900 px → 512 px affichée par URL signée, élève marqué parti, fiche en 375 px.
- Piège : une colonne `not null` remplie par un trigger BEFORE doit avoir une valeur par défaut, sinon les types
  générés l'exigent à l'insertion (`matricule default ''`).
- 244 tests unitaires ; chargement initial 150,8 kB transférés.

### 2026-10-09 — Audit de fin de sprint 3 et bilan du sprint 3 (Structure scolaire)
**Audit** (un seul agent `auditeur-securite`, mode économe, à la demande du développeur) : 0 critique, **1 important**
corrigé — `enseignants_daara` rendait à un enseignant le nom figé de tous ses collègues désactivés (lecture retirée en
S2.4) → pour un non-admin, seuls les désactivés encore titulaires ou enseignants d'une classe. Mineurs corrigés dans la
migration `corrections_sprint3` : libellés d'années / périodes par `libelle_valide` (NFC, espace insécable), `id` plus
choisi par le client, motif de `rechercher_membres` calculé après validation ; tests pgTAP ajoutés (refus d'écriture sur
`matieres`, désactivés, libellés) : 11 (577 au total). Reporté : voir « Problèmes ouverts » (cascade et purge CDP).

**Objectif** : l'admin configure son année complète. **Atteint en local** (navigateur + pgTAP).

| Story | État |
|---|---|
| S3.0 Conception (LLD §3.3, §4, spec) | Fait |
| S3.1 Années scolaires et périodes | Fait |
| S3.2 Matières | Fait |
| S3.3 Classes et affectations, `teaches_class` | Fait |
| S3.4 `data-table` (matières, classes, membres) | Fait |

**Chiffres** : 577 tests pgTAP (446 au sprint 2) ; 242 tests unitaires (222) ; chargement initial 150,7 kB (150,5) ;
1 extension ajoutée (`unaccent`, gratuite) ; aucun paquet npm ajouté.

**Ce qui a bien marché** : la conception d'abord (S3.0) ; la règle « droits contrôlés en tête des triggers security
definer », trouvée en S3.1 et appliquée ensuite partout ; le navigateur trouve toujours ce que les tests ne voient pas
(`count(*)` embarqué refusé, recherche sensible aux accents, redirection évaluée avant les guards).

**À améliorer** : un seul audit en fin de sprint coûte moins cher, mais les corrections arrivent dans une migration à
part ; garder les migrations de story petites pour que ce soit simple.

### 2026-10-09 — S3.4 Composant `data-table`
- `shared/ui/data-table` : chargeur serveur (page, taille, tri, recherche), cellules projetées (`appCellule`), cartes
  sous 640 px (`appCarte`), filtres de l'écran projetés (`[filtres]`), recherche différée (300 ms) et réponses périmées
  ignorées, `aria-sort`, pagination « x–y sur total », états chargement / erreur (Réessayer) / vide, `recharger()`.
- Migration `recherche_membres` : extension `unaccent` (schéma `extensions`), RPC `rechercher_membres` (admin aal2 ;
  recherche sans accents, filtres, tri, pagination, total), `sans_accents` (enveloppe immuable) et colonnes générées
  `recherche` sur `matieres` et `classes`. 13 tests pgTAP (566).
- Appliqué : Membres (recherche serveur sans accents, filtres rôle / état, tri nom / ancienneté ; le contrôle « admin
  ailleurs » de la réinitialisation est laissé à la base), Matières (recherche nom / code, tri, archivées), Classes
  (année, recherche nom / niveau, tri).
- Vérifié dans le navigateur : Membres (recherche « ndiaye », tri décroissant), Matières (22 matières : pages 1–20 et
  21–22 ; « EDUC », « francais » trouvent « Éducation islamique », « Français »), Classes (« etoile » trouve « Étoile
  CE1 »), cartes en 375 px. Constat corrigé : `ilike` seul tient compte des accents → colonnes `recherche`.
- Pièges : un contexte de gabarit `let-x` n'est pas typé (indexer un `Record` par `x.role` échoue en gabarits stricts →
  méthode typée) ; une colonne générée et une contrainte `check` s'évaluent avec les droits de l'écrivain (fonction
  exécutable par `authenticated`) ; ESLint ne lit pas un gabarit construit avec `${…}`.
- Pas d'audit (fin de sprint). 242 tests unitaires ; chargement initial 150,7 kB transférés.

### 2026-10-09 — S3.3 Classes et affectations
- Migration `classes` (module `structure`) : `libelle_valide` (texte court NFC sans blanc autour), `est_enseignant_de`,
  `ecrivain_structure` (droits en tête des triggers), `classes` (nom unique dans l'année sans casse, niveau libre,
  titulaire), `classe_matieres` (coefficient 0,5-20, enseignant, matière `restrict`), triggers de cohérence (même daara,
  matière non archivée, titulaire / enseignant = enseignant ou admin actif), journal, droits par colonne, lecture admin et
  enseignant ; `teaches_class(classe)` et RPC `enseignants_daara(daara)` (noms figés des désactivés). 34 tests pgTAP (553).
- Front : onglet Classes (par défaut ; sélecteur d'année, active d'abord ; titulaire et nombre de matières ; création,
  modification, suppression), détail `classes/:classeId` (matières enseignées : ajout parmi les non archivées absentes,
  coefficient, enseignant ; modification, retrait), modales `ClasseDialog` / `AffectationDialog`, niveaux suggérés.
- Vérifié dans le navigateur (admin) : classe CE1 A avec titulaire, matière Coran coefficient 3 avec enseignant,
  375 px sans débordement. Piège trouvé : `classe_matieres(count)` refusé par Postgres (agrégat `count(*)` sur une table à
  droits par colonne) → lignes comptées côté client.
- Pas d'audit (fin de sprint). 237 tests unitaires ; chargement initial 150,7 kB transférés.

### 2026-10-09 — S3.2 Matières
- Migration `matieres` (module `structure`) : enum `type_matiere`, table `matieres` (nom NFC sans blanc autour, unique
  sans casse ni formes compatibles ; code `^[A-Z0-9_-]{1,10}$` unique ; archivage), `daara_id_immuable` (trigger
  réutilisable), journal, droits par colonne (`created_by` illisible, `id` et `daara_id` non choisis / modifiés par le
  client), politiques admin aal2 + module ; `texte_sur` complétée (caractères Hangul invisibles). 25 tests pgTAP (519).
- Front : onglet Matières (code proposé à partir du nom, création, modification, archivage, suppression d'une matière
  inutilisée, « Afficher les archivées ») ; Structure ouverte à l'enseignant en lecture seule (menu, onglets filtrés par
  rôle, Années réservées à l'admin) ; redirection par défaut vers Matières (une redirection s'évalue avant les guards :
  les rôles ne sont pas encore chargés).
- Vérifié dans le navigateur : admin (code « EDUC » proposé, doublon refusé dans la modale, archivage) ; enseignant
  (onglet Matières seul, aucune action).
- Audit sécurité (fait avant la décision de reporter les audits) : 0 critique, 0 important ; corrigés : noms
  indiscernables (NFD, espace insécable, Hangul), `id` choisi par le client ; reportés à l'audit de fin de sprint (voir
  « Problèmes ouverts »).
- 234 tests unitaires ; chargement initial 150,6 kB transférés.

### 2026-10-09 — S3.1 Années scolaires et périodes
- Migration `annees_periodes` (module `structure`) : `texte_sur` (texte affichable, réutilisé par la suite),
  `annees_scolaires` (libellé unique, 18 mois au plus, une seule active, `active` hors des droits), `periodes` (ordre
  unique, dans l'année, sans chevauchement, clôture), triggers `periodes_coherentes` / `annees_coherentes`, journal,
  droits par colonne (`daara_id`, `annee_id`, `active`, `created_by` non modifiables ; `created_by` illisible), politiques
  admin aal2 + module, RPC `activer_annee` (verrous et revérification). 48 tests pgTAP (494 au total).
- Front : menu « Structure » (admin, module `structure`), `/d/:slug/structure/annees` : années (création avec valeurs
  proposées, modification, « Rendre active », suppression d'une année inactive), périodes (modèles « 3 trimestres » /
  « 2 semestres », ajout, modification, clôture / réouverture confirmées ; période clôturée : seule la réouverture),
  modale de saisie commune (`DatesDialog`), icône Vristo `book`.
- Vérifié dans le navigateur : année créée, 3 trimestres, rendue active, trimestre clôturé, chevauchement refusé dans la
  modale (message de la base), 375 px en sombre (texte des périodes écrasé par les boutons → corrigé).
- Audits : sécurité (0 critique, **1 important**, 4 mineurs) et RLS (0 critique, **1 important**, 6 mineurs), corrigés :
  - important (relevé par les deux) : le trigger `periodes_coherentes` (security definer, avant la RLS) renseignait un
    étranger sur les dates d'une autre daara et y posait un verrou → droits contrôlés en tête du trigger (règle ajoutée
    au LLD pour toutes les tables suivantes) ;
  - libellé avec espaces autour (longueur et unicité contournées), `activer_annee` sans revérification après verrou,
    période clôturée modifiable, test dépendant des données locales, `created_by` lisible, `daara_id` / `annee_id`
    immuables aussi par trigger, caractères bidirectionnels arabes ; 11 cas pgTAP ajoutés ;
  - ouvert : contraintes du socle à aligner sur `texte_sur` (« Problèmes ouverts »).
- Piège : un contrôle de droits dans un trigger bloque les suppressions en cascade → le limiter à insert / update (un
  delete direct est déjà filtré par la RLS).

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
