# Déploiement · DAARA

Toutes les opérations de ce document sont faites par le développeur (Claude Code n'a aucun accès aux
comptes Cloudflare, Supabase ou GitHub). Aucune valeur secrète n'est écrite ici.

## 1. Cloudflare Pages (S0.7)

### 1.1 Ordre recommandé
Le build Cloudflare **échoue volontairement** tant que `SUPABASE_URL` et `SUPABASE_ANON_KEY` ne sont pas
définies (`scripts/set-env.mjs`). Créer d'abord au moins le projet Supabase `daara-dev` (S0.8, section 2),
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

5. **Authentication → Rate Limits** : laisser les valeurs par défaut (protègent contre l'envoi massif).

Les modèles d'e-mails (confirmation, invitation, mot de passe oublié) seront traduits en français et en
anglais au sprint 1, dans le dépôt (`supabase/templates/`) puis recopiés dans chaque projet.

### 2.5 Vérifications
1. `daara-dev` → **Authentication → Users → Add user → Send invitation** vers votre propre adresse :
   l'e-mail arrive (vérifier aussi le dossier spam) et l'expéditeur est celui configuré.
2. Brevo → **Transactional → Logs** : l'envoi apparaît comme « Delivered ».
3. Supprimer l'utilisateur de test.
4. Refaire le test 1 sur `daara-prod`, puis supprimer l'utilisateur.

### 2.6 Migrations
Aucune migration à appliquer en S0.8. À partir du sprint 1, le développeur applique les migrations
lui-même (règle 7, jamais Claude) :
```powershell
npx supabase link --project-ref <ref-daara-dev>
npx supabase db push        # vérifier la liste des migrations affichée avant de confirmer
```
Pour `daara-prod`, uniquement à une release, après vérification d'une sauvegarde récente (S0.9).

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
| `script-src` | `'self'` | Aucun script inline : l'inlining du CSS critique est désactivé (`angular.json`), car il injecte un script inline |
| `style-src` | `'self' 'unsafe-inline'` | Angular et le CDK insèrent des balises `<style>` ; pas de nonce possible sur un hébergement statique |
| `connect-src` | `'self'`, `https://*.supabase.co`, `wss://*.supabase.co` | API, Auth, Storage, Realtime (WebSocket) |
| `img-src` | `'self' data: blob:`, `https://*.supabase.co` | Icônes CSS en `data:`, aperçus locaux, photos et logos du Storage |

À ajouter plus tard : Sentry (`connect-src`, S0.10), Cloudflare R2 (`media-src` / `connect-src`, sprint 9).
Toute modification de la CSP est testée en servant `dist/daara/browser` avec ces en-têtes avant le push.
