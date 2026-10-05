# Déploiement · DAARA

Toutes les opérations de ce document sont faites par le développeur (Claude Code n'a aucun accès aux
comptes Cloudflare, Supabase ou GitHub). Aucune valeur secrète n'est écrite ici.

## 1. Cloudflare Pages (S0.7)

### 1.1 Ordre recommandé
Le build Cloudflare **échoue volontairement** tant que `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `TURNSTILE_SITE_KEY`
ne sont pas définies (`scripts/set-env.mjs`). Créer d'abord au moins le projet Supabase `daara-dev` (S0.8, section 2),
puis brancher Cloudflare.

### 1.2 Création du projet (une fois)
1. Tableau de bord Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** →
   autoriser l'application Cloudflare sur le dépôt GitHub `daara` uniquement (pas « tous les dépôts »).
2. Nom du projet : `daara` (URL de production : `https://daara.pages.dev`).
3. Branche de production : `main`.
4. Paramètres de build :

   | Paramètre | Valeur |
   |---|---|
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `dist/daara/browser` |
   | Root directory | (vide) |

5. Variables d'environnement (**Settings → Variables and Secrets**), à définir séparément pour les deux
   environnements Cloudflare :

   | Variable | Production (`main`) | Preview (`develop`) |
   |---|---|---|
   | `NODE_VERSION` | `24` | `24` |
   | `SUPABASE_URL` | URL du projet `daara-prod` | URL du projet `daara-dev` |
   | `SUPABASE_ANON_KEY` | clé **publishable** de `daara-prod` | clé **publishable** de `daara-dev` |
   | `TURNSTILE_SITE_KEY` | clé de site du widget Turnstile (§2.6) | même clé (**jamais** une clé de test : refusée par `set-env.mjs`) |

   La clé publishable (`sb_publishable_…`) est publique par conception (protégée par la RLS). **Jamais la
   clé secrète ni `service_role`** : `set-env.mjs` fait échouer le build si on s'en sert par erreur.
   (`.node-version` fixe aussi Node 24 ; `NODE_VERSION` le rend explicite.)

6. **Settings → Builds & deployments → Branch control** :
   - Production branch : `main` ;
   - Preview branches : **Custom branches** → inclure uniquement `develop`
     (évite un build par branche et préserve le quota gratuit de 500 builds / mois, ADR-003).

### 1.3 Comportement attendu
- `main` → `https://daara.pages.dev` (production, uniquement à chaque release via pull request).
- `develop` → `https://develop.daara.pages.dev` (preview, chaque push) ; chaque déploiement a aussi une
  URL unique `https://<hash>.daara.pages.dev`.
- Routage SPA : aucun `404.html` dans le build, donc Cloudflare renvoie `index.html` pour toute route
  inconnue (`/d/ma-daara/absences` rafraîchi → l'application). Pas de fichier `_redirects` nécessaire.
- Les previews envoient `X-Robots-Tag: noindex` (`public/_headers`).

### 1.4 Vérifications après le premier déploiement
1. La preview affiche l'application, en français, avec la charte.
2. Rafraîchir une route profonde (ex. `https://develop.daara.pages.dev/une/route`) : l'application s'affiche.
3. En-têtes de sécurité :
   ```powershell
   curl.exe -sI https://develop.daara.pages.dev/ | Select-String "content-security|strict-transport|x-frame|x-robots"
   ```
4. Console du navigateur (F12) : aucune erreur « Content Security Policy ».
5. Optionnel : https://securityheaders.com sur l'URL de production (note visée : A).

## 2. Projets Supabase cloud et e-mails (S0.8)

### 2.0 Avant de commencer
- Activer la **double authentification** sur les comptes Supabase, GitHub, Cloudflare et Brevo : un accès
  volé à l'un d'eux donne accès aux données des daaras.
- Ranger dans un gestionnaire de mots de passe : mots de passe des bases, clés secrètes Supabase, clé SMTP
  Brevo. Ces valeurs ne vont **jamais** dans le dépôt, ni dans un ticket, ni dans une conversation avec Claude.

### 2.1 Créer les deux projets
https://supabase.com/dashboard → **New project**, deux fois :

| Paramètre | `daara-dev` | `daara-prod` |
|---|---|---|
| Organisation | la vôtre (offre Free) | la même |
| Nom | `daara-dev` | `daara-prod` |
| Mot de passe de la base | généré, fort, rangé | généré, fort, **différent** |
| Région | Europe de l'Ouest : **Paris (eu-west-3)** (ADR-003) | identique |
| Data API | activée, schéma `public` exposé | identique |

L'offre Free autorise deux projets actifs ; un projet sans activité pendant 7 jours est mis en pause
(requête anti-pause en S0.9).

### 2.2 Réglages d'authentification (Authentication → Sign In / Providers, URL Configuration)
Mêmes règles que le Supabase local (`supabase/config.toml`), pour qu'un comportement testé en local soit
celui de la production.

| Réglage | `daara-dev` | `daara-prod` |
|---|---|---|
| Site URL | `https://develop.daara.pages.dev` | `https://daara.pages.dev` |
| Redirect URLs | `https://develop.daara.pages.dev/**`, `https://*.daara.pages.dev/**`, `http://localhost:4200/**` | `https://daara.pages.dev/**` uniquement |
| Inscription par e-mail | activée | activée |
| Confirm email | **activé** | **activé** |
| Secure email change | activé | activé |
| Secure password change | activé | activé |
| Longueur minimale du mot de passe | 8 | 8 |
| Exigences du mot de passe | lettres et chiffres | lettres et chiffres |
| Connexions anonymes | désactivées | désactivées |
| Téléphone (SMS) | désactivé (ADR-003, décision OTP au sprint 2) | désactivé |
| Email OTP Expiration (Authentication → Emails / Providers → Email) | 1800 s (30 min) | 1800 s |
| Email OTP Length | 6 | 6 |
| Multi-Factor → TOTP (App Authenticator) | **activé** (enrôlement et vérification) | **activé** |
| Attack Protection → Captcha | Turnstile, clé secrète du §2.6 | Turnstile, clé secrète du §2.6 |

**`daara-dev` ne contient jamais de données réelles**, même pour une démonstration à une daara pilote : ses
redirections acceptent `localhost` et toutes les previews. Les démos se font avec des données fictives.

La production n'accepte **aucune** redirection vers `localhost` ni vers les previews : un lien de
connexion ne peut pas renvoyer un utilisateur réel vers une autre application.
(La détection des mots de passe compromis n'existe qu'en offre Pro : à activer au passage à Pro, ADR-003.)

### 2.3 Récupérer les clés publiques
**Project Settings → API Keys** de chaque projet :
- **URL du projet** et **clé publishable** (`sb_publishable_…`) → variables Cloudflare (§1.2, étape 5) :
  `daara-dev` pour l'environnement Preview, `daara-prod` pour Production.
- La **clé secrète** (`sb_secret_…`) reste dans le gestionnaire de mots de passe : elle ne servira qu'aux
  Edge Functions (secrets Supabase) et, si besoin, aux secrets GitHub. Jamais dans Cloudflare Pages ni Angular.

### 2.4 Brevo (envoi des e-mails d'authentification)
Le SMTP intégré de Supabase est limité à quelques e-mails par heure et ne sert qu'aux tests : un SMTP
externe est nécessaire (invitations, confirmation d'inscription, mot de passe oublié).
Brevo, offre gratuite : 300 e-mails / jour, société française, données hébergées dans l'UE (utile pour la
conformité CDP, à citer dans la politique de confidentialité).

1. Créer un compte sur https://www.brevo.com (offre Free).
2. **Expéditeur** (Senders, Domains & Dedicated IPs) :
   - **Dès maintenant (dev, démo)** : ajouter et vérifier une adresse d'expédition que vous contrôlez.
   - **Avant le pilote (R1)** : authentifier un **nom de domaine** (enregistrements DKIM et DMARC fournis
     par Brevo, chez le registrar) et envoyer depuis `no-reply@<domaine>`. Sans domaine authentifié, les
     e-mails partent souvent en spam, en particulier vers Gmail. ⚠ Un nom de domaine est une **dépense
     annuelle** (quelques euros à une quinzaine d'euros par an) : hors du « coût zéro » de l'ADR-003, à
     décider (déjà prévu au sprint 12 ; à avancer avant le pilote si les e-mails arrivent en spam).
3. **SMTP & API → SMTP** : noter le serveur `smtp-relay.brevo.com`, le port `587` et l'identifiant SMTP ;
   **générer une clé SMTP** dédiée à DAARA (une par projet si possible), la ranger.
4. Dans **chaque** projet Supabase : **Authentication → Emails → SMTP Settings** → activer le SMTP personnalisé :

   | Champ | Valeur |
   |---|---|
   | Sender email | adresse vérifiée (dev) / `no-reply@<domaine>` (prod) |
   | Sender name | `DAARA` (dev : `DAARA (dev)`) |
   | Host | `smtp-relay.brevo.com` |
   | Port | `587` |
   | Username | identifiant SMTP Brevo |
   | Password | clé SMTP Brevo |

5. **Authentication → Rate Limits** : `daara-prod` garde les valeurs par défaut ; **`daara-dev` : e-mails limités à
   5 par heure**. Les deux projets ne partagent jamais le même quota d'envoi : **deux comptes Brevo** (un par projet)
   ou, à défaut, deux clés SMTP distinctes et une alerte de quota dans Brevo. Sinon un abus sur `daara-dev`
   (inscriptions, mots de passe oubliés en boucle) épuise les 300 e-mails / jour et bloque les e-mails de production.

6. **Authentication → Emails → Templates** : recopier les modèles du dépôt (code à 6 chiffres, sans lien,
   français / anglais selon la langue du compte) :

   | Modèle Supabase | Sujet | Contenu |
   |---|---|---|
   | Confirm signup | `Votre code DAARA / Your DAARA code` | `supabase/templates/confirmation.html` |
   | Reset password | `Réinitialisation DAARA / DAARA password reset` | `supabase/templates/recovery.html` |

   Les modèles n'utilisent que `{{ .Token }}` et `{{ .Data.langue }}`, jamais le nom saisi par l'utilisateur.
   Après chaque modification d'un modèle dans le dépôt, le recopier dans les deux projets.

### 2.5 Vérifications
1. `daara-dev` → **Authentication → Users → Add user → Send invitation** vers votre propre adresse :
   l'e-mail arrive (vérifier aussi le dossier spam) et l'expéditeur est celui configuré.
2. Brevo → **Transactional → Logs** : l'envoi apparaît comme « Delivered ».
3. Supprimer l'utilisateur de test.
4. Refaire le test 1 sur `daara-prod`, puis supprimer l'utilisateur.

### 2.6 Cloudflare Turnstile (anti-robot, gratuit)
Protège l'inscription, la connexion et le mot de passe oublié (quota Brevo, attaques par force brute) ;
Supabase Auth vérifie le jeton côté serveur.
1. Cloudflare → **Turnstile → Add widget** : nom `DAARA`, mode **Managed**, domaines `daara.pages.dev`
   et `develop.daara.pages.dev` (puis le domaine de l'application quand il existera).
2. Noter la **clé de site** (publique) → variable `TURNSTILE_SITE_KEY` de Cloudflare Pages (§1.2, étape 5).
   `set-env.mjs` refuse les clés de test sur tout build Cloudflare (production et preview).
3. La **clé secrète** → Supabase de **chaque** projet, **Authentication → Attack Protection → Captcha**
   (fournisseur Turnstile). Jamais dans Git ni dans Cloudflare Pages ; rangée dans le gestionnaire de mots de passe.
4. Vérifier : sur la preview, le widget s'affiche, la connexion fonctionne ; sans jeton (bloqueur de scripts),
   Supabase refuse la connexion (`captcha_failed`).

En local, `supabase/config.toml` utilise la clé secrète de test publiée par Cloudflare (toujours valide) et
`environment.local.ts` la clé de site de test associée. **Les clés de test ne sont jamais utilisées dans un projet
cloud** (`daara-dev` compris) : elles acceptent tout jeton, le captcha y serait inopérant.

### 2.7 Migrations
Aucune migration à appliquer en S0.8. À partir du sprint 1, le développeur applique les migrations
lui-même (règle 7, jamais Claude) :
```powershell
npx supabase link --project-ref <ref-daara-dev>
npx supabase db push        # vérifier la liste des migrations affichée avant de confirmer
```
Pour `daara-prod`, uniquement à une release, après vérification d'une sauvegarde récente (S0.9).

**Interdit sur les projets cloud** : `npx supabase db push --include-seed` et `npx supabase db reset --linked`. Le
fichier `supabase/seed.sql` crée des comptes de développement au mot de passe connu, dont un admin.

### 2.8 Connexion par téléphone sans SMS (S2.5, ADR-009) — dans chaque projet, APRÈS `db push` de la migration `invitations`
Objectif : connexion téléphone + mot de passe, **aucune** inscription publique par téléphone, **aucun** SMS envoyé.
1. **Authentication → Hooks → Before User Created** : activer, type « Postgres », fonction
   `public.avant_creation_utilisateur`. (La migration accorde déjà le droit d'exécution à `supabase_auth_admin`.)
2. **Authentication → Hooks → Send SMS** : activer, type « Postgres », fonction `public.envoi_sms_factice` (ne fait
   rien : aucun SMS, aucun numéro transmis à un tiers).
3. **Authentication → Sign In / Providers → Phone** : activer ; fournisseur **Twilio** avec des valeurs **fictives**
   (Account SID `ACfactice-aucun-envoi`, Auth Token `factice-aucun-envoi`, Message Service SID
   `MGfactice-aucun-envoi`), jamais appelé grâce au hook Send SMS ; « Enable phone signup » **activé** (le désactiver
   coupe aussi la connexion par téléphone, vérifié en local) ; « Enable phone confirmations » **activé**.
   Si le tableau de bord refuse des identifiants fictifs : le signaler (alternative à étudier, ADR-009).
4. Garde-fous à contrôler (audit S2.5a ; sans eux, le lien d'une invitation par téléphone pourrait être pris) :
   - liste **« Test OTP »** (numéros à code fixe) **vide** ;
   - **MFA par téléphone désactivé** (seul le TOTP est utilisé) ;
   - « Confirm phone » et « Secure email change » (double confirmation) **activés**.
5. Vérifier (sur `daara-dev`, depuis l'application ou l'API) :
   - inscription publique par téléphone → refusée (HTTP 403, « Inscription par téléphone réservée aux invitations ») ;
   - `signInWithOtp({ phone })` pour un numéro inconnu → refusé (403), aucun compte créé ;
   - `updateUser({ phone })` sur un compte e-mail → numéro **non** confirmé (`auth.users.phone` inchangé) ;
   - inscription par e-mail → toujours possible ;
   - connexion par téléphone d'un compte créé par invitation (S2.5c) → OK.
6. Aucun coût, aucun appel externe.

## 3. En-têtes de sécurité (`public/_headers`)

| En-tête | Valeur | Raison |
|---|---|---|
| `Content-Security-Policy` | voir ci-dessous | Limite l'exécution de code et les connexions aux seules origines connues |
| `Strict-Transport-Security` | 1 an, sous-domaines | HTTPS imposé |
| `X-Frame-Options` / `frame-ancestors 'none'` | refus | Pas d'intégration dans une iframe (clickjacking) |
| `X-Content-Type-Options` | `nosniff` | Pas d'interprétation abusive des types de fichiers |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Les URL (slug de daara, identifiants) ne fuient pas vers d'autres sites |
| `Permissions-Policy` | tout désactivé | Micro réactivé au sprint 9 (`microphone=(self)`) pour les récitations |
| `Cache-Control` sur `/i18n/*` | `no-cache` | Fichiers de traduction non hachés : toujours revalidés |

Origines autorisées par la CSP :

| Directive | Origines | Raison |
|---|---|---|
| `script-src` | `'self'`, `https://challenges.cloudflare.com` | Aucun script inline : l'inlining du CSS critique est désactivé (`angular.json`), car il injecte un script inline. Script Turnstile (anti-robot), chargé à la demande sur les pages d'authentification |
| `frame-src` | `https://challenges.cloudflare.com` | Iframe du widget Turnstile |
| `style-src` | `'self' 'unsafe-inline'` | Angular et le CDK insèrent des balises `<style>` ; pas de nonce possible sur un hébergement statique |
| `connect-src` | `'self'`, `https://*.supabase.co`, `wss://*.supabase.co`, `https://*.ingest.de.sentry.io` | API, Auth, Storage, Realtime (WebSocket) ; envoi des erreurs à Sentry (région UE uniquement) |
| `img-src` | `'self' data: blob:`, `https://*.supabase.co` | Icônes CSS en `data:`, aperçus locaux, photos et logos du Storage |

À ajouter plus tard : Cloudflare R2 (`media-src` / `connect-src`, sprint 9).
Toute modification de la CSP est testée en servant `dist/daara/browser` avec ces en-têtes avant le push.

## 4. Sauvegardes et anti-pause (S0.9)

### 4.1 Principe
| Élément | Choix |
|---|---|
| Quoi | `daara-prod` : rôles, schéma complet, données des schémas `public` (métier) et `auth` (comptes) |
| Exclu | Jetons et sessions (`refresh_tokens`, `sessions`, `one_time_tokens`…) et journal d'audit Auth (adresses IP) : une archive déchiffrée ne permet pas de reprendre une session ; après restauration, chacun se reconnecte |
| Quand | Chaque nuit à 02:30 (heure de Dakar), workflow `.github/workflows/sauvegarde.yml` ; perte maximale : 24 h |
| Où | Cloudflare R2, bucket `daara-sauvegardes`, préfixe `daara-prod/` |
| Protection | Archive chiffrée avec la clé **publique** `age` : GitHub et Cloudflare ne peuvent pas la lire |
| Rétention | 30 jours (règle de cycle de vie R2) |
| Non couvert | Les **fichiers** du Storage (photos, PDF) : seules leurs métadonnées sont dans la base → à traiter au sprint 4 (photos des apprenants) |

Méthode testée en local le 2026-10-01 (dump → remise à zéro → restauration → comptes, données, RLS et
politiques retrouvés). Le schéma `storage` est exclu des données : `postgres` n'a pas les droits d'écriture
sur ses tables internes, et les buckets sont recréés par les migrations.

### 4.2 Clé de chiffrement (une fois, sur votre poste)
```powershell
winget install FiloSottile.age
New-Item -ItemType Directory "$env:USERPROFILE\daara-cles" -Force   # HORS du dépôt
age-keygen -o "$env:USERPROFILE\daara-cles\daara-sauvegarde.txt"
```
Ne jamais générer ni copier la clé, une archive ou un dump dans le dossier du projet (risque de commit ;
`.gitignore` exclut `*.age`, `daara-sauvegarde*.txt` et les dumps par sécurité).
- Le fichier contient la **clé privée** : la ranger dans le gestionnaire de mots de passe **et** sur un
  support hors ligne (clé USB rangée), puis supprimer le fichier du disque. **Perdre cette clé rend toutes
  les sauvegardes illisibles** ; la divulguer rend toutes les sauvegardes lisibles.
- La ligne `# public key: age1…` est la **clé publique** : elle va dans GitHub (§4.6), elle n'est pas secrète.

### 4.3 Bucket R2
1. Cloudflare → **R2** → **Create bucket** : nom `daara-sauvegardes`, localisation Europe de l'Ouest.
   Bucket distinct de `daara-files` (audios) : droits et durée de conservation séparés.
2. Bucket → **Settings → Object lifecycle rules** → règle « suppression après 30 jours » sur le préfixe `daara-prod/`.
3. R2 → **Manage API tokens** → **Create API token** :
   - permission **Object Read & Write**, limitée au bucket `daara-sauvegardes` uniquement ;
   - noter l'**Access Key ID**, le **Secret Access Key** et l'**Account ID** (affichés une seule fois).

### 4.4 Chaîne de connexion de `daara-prod`
`daara-prod` → **Connect** → **Session pooler** (IPv4 : les machines GitHub n'ont pas d'IPv6, la connexion
directe ne fonctionne pas) :
`postgresql://postgres.<ref>:<mot-de-passe>@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`
Si le mot de passe contient des caractères spéciaux, les encoder (`@` → `%40`, `:` → `%3A`, `/` → `%2F`…).

### 4.5 Rôle `keepalive` (anti-pause, dans chaque projet)
**SQL Editor** de `daara-dev` puis de `daara-prod`, avec un mot de passe généré différent pour chacun :
```sql
create role keepalive login connection limit 1 password '<mot-de-passe-généré>';
```
Aucun `grant` : ce rôle peut seulement se connecter et exécuter `select 1` (vérifié en local : lecture des
comptes, des tables et création de table refusées). Chaîne de connexion (Session pooler) :
`postgresql://keepalive.<ref>:<mot-de-passe>@aws-0-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require`

### 4.6 Configuration GitHub
1. **Settings → Environments → New environment** `production` ; **Deployment branches** : `main` **uniquement**.
   Pour le tout premier test manuel (§4.7), ajouter temporairement `develop`, puis le **retirer aussitôt** : on
   pousse directement sur `develop`, et tout workflow de cette branche pourrait sinon lire le mot de passe
   `postgres` de la production et les clés R2 (audit sprint 0).
2. Dans l'environnement `production` :

   | Type | Nom | Valeur |
   |---|---|---|
   | Secret | `SUPABASE_PROD_DB_URL` | chaîne du §4.4 (rôle `postgres`) |
   | Secret | `R2_ACCOUNT_ID` | Account ID Cloudflare |
   | Secret | `R2_ACCESS_KEY_ID` | jeton R2 du §4.3 |
   | Secret | `R2_SECRET_ACCESS_KEY` | jeton R2 du §4.3 |
   | Variable | `R2_BUCKET_SAUVEGARDES` | `daara-sauvegardes` |
   | Variable | `SAUVEGARDE_AGE_RECIPIENT` | clé publique `age1…` du §4.2 |

3. **Settings → Secrets and variables → Actions** (secrets du dépôt) : `SUPABASE_DEV_KEEPALIVE_URL` et
   `SUPABASE_PROD_KEEPALIVE_URL` (chaînes du §4.5).

### 4.7 Mise en service
- GitHub n'exécute les workflows planifiés que depuis la branche par défaut (`main`) : ils deviennent
  automatiques à la première release (R0). Avant, `daara-prod` ne contient pas de données réelles.
- Premier test : **Actions → Sauvegarde daara-prod → Run workflow** (branche `develop`), puis vérifier dans
  R2 qu'un fichier `daara-prod/daara-prod-AAAAMMJJ-HHMMSS.tar.gz.age` est apparu. Idem pour **Anti-pause Supabase**.
  **Retirer ensuite `develop` des branches autorisées de l'environnement `production`** (§4.6).
- En cas d'échec d'un workflow planifié, GitHub envoie un e-mail. Consulter l'onglet Actions une fois par mois.

### 4.8 Restauration
**Test mensuel (recommandé) et avant chaque release** : télécharger la dernière archive depuis R2
(tableau de bord → bucket → fichier → Download), puis sur le Supabase **local** :
```powershell
npm run db:start
.\scripts\restaurer-sauvegarde-locale.ps1 -Archive "$env:USERPROFILE\daara-cles\daara-prod-AAAAMMJJ-HHMMSS.tar.gz.age" -CleAge <chemin de la clé privée>
```
Télécharger l'archive dans `%USERPROFILE%\daara-cles\` : le script **refuse** toute archive, clé ou dump
situé dans le dépôt. Il supprime les fichiers déchiffrés, puis propose d'effacer les données restaurées de la
base locale (réponse par défaut : oui ; `-ConserverDonnees` pour les garder, déconseillé). Supprimer
ensuite l'archive téléchargée.

**Incident en production** (fait par le développeur, jamais par Claude) : créer un nouveau projet Supabase,
appliquer les migrations, puis restaurer les trois fichiers avec la chaîne de connexion du nouveau projet :
```powershell
psql "<url>" -f roles.sql                     # erreurs sur les réglages internes : sans conséquence
psql "<url>" --single-transaction -v ON_ERROR_STOP=1 -f schema.sql -c "SET session_replication_role = replica" -f data.sql
```
puis mettre à jour `SUPABASE_URL` / `SUPABASE_ANON_KEY` dans Cloudflare et les réglages Auth / SMTP (§2).

## 5. Suivi des erreurs : Sentry (S0.10)

### 5.1 Principe
- Offre gratuite (5 000 erreurs / mois), **région UE** (données hébergées en Allemagne) : seule région
  acceptée par `scripts/set-env.mjs` et par la CSP.
- Activé uniquement sur Cloudflare (production et preview) quand `SENTRY_DSN` est défini ; jamais en local.
- **Aucune donnée personnelle** (données de mineurs, CDP) : le SDK ne collecte ni utilisateur, ni cookies,
  ni en-têtes, ni paramètres d'URL, ni corps de requêtes, ni variables locales ; avant chaque envoi, e-mails,
  numéros, identifiants et jetons sont remplacés par `[email]`, `[numéro]`, `[id]`, `[jeton]`
  (`src/app/core/errors/sentry.ts`, testé ; vérifié sur un build de production le 2026-10-01).
- SDK chargé en différé (28 kB, hors chargement initial) ; pas de Session Replay ni de suivi de performance.

### 5.2 Création (une fois)
1. https://sentry.io → créer un compte, puis une **organisation en choisissant la région « EU »**
   (Data Storage Location : **ce choix est définitif**).
2. **Projects → Create project** : plateforme **Angular**, nom `daara-front`, alertes : « Alert me on every new issue ».
3. **Settings → Projects → daara-front → Client Keys (DSN)** : copier le DSN
   (`https://<clé>@o<n>.ingest.de.sentry.io/<projet>`). Il est public par conception : il ne permet que
   d'envoyer des erreurs.
4. **Settings → Security & Privacy** (organisation) : activer **Data Scrubber**, **Use Default Scrubbers** et
   **Prevent Storing of IP Addresses** (seconde protection côté serveur).
5. **Settings → Subscription → Spike Protection** : activée (une boucle d'erreurs ne consomme pas tout le quota).
6. Cloudflare Pages → **Settings → Variables and Secrets** : `SENTRY_DSN` = le DSN, pour **Production** et
   **Preview** (même projet ; les erreurs sont distinguées par l'environnement `production` / `preview`).
   Redéployer pour prendre en compte la variable.

### 5.3 Vérification
Après le déploiement de la preview : ouvrir la console du navigateur (F12) sur `https://develop.daara.pages.dev`
et exécuter `setTimeout(() => { throw new Error('Test Sentry DAARA') })`. L'erreur apparaît dans Sentry
(**Issues**, environnement `preview`, version `daara@<commit>`) ; la résoudre ensuite.

### 5.4 Limite connue
Les traces de pile sont minifiées : les source maps ne sont pas envoyées à Sentry (cela demanderait un jeton
secret dans le build). À ajouter si les erreurs deviennent difficiles à lire (sprint 12, durcissement).
