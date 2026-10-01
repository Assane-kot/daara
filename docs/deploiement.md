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

## 2. Projets Supabase cloud et SMTP (S0.8)
À compléter en S0.8 (création de `daara-dev` et `daara-prod`, SMTP Brevo/Resend, URLs de redirection Auth).

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
