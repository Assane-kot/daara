# Plan de travail de bout en bout · DAARA SaaS

Windows / PowerShell · Coût : 0 (Claude Pro déjà en place) · Détail des sprints : `docs/SPRINTS.md`

| Étape | Quand | Résultat |
|---|---|---|
| 1. Dépôt Git | Jour 1 | Dépôt privé avec kit, starter, référence |
| 2. Comptes gratuits | Jour 1-2 | Supabase, Cloudflare, email, Sentry prêts |
| 3. Poste de travail | Jour 2 | Outils installés, app qui tourne |
| 4. Première session Claude Code | Jour 3 | Plan du sprint 0 validé |
| 5. Sprint 0 | Semaine 1-2 | App vide en ligne, CI verte |
| 6. Sprints 1-12 | ~6 mois | Releases R0 → R4 |
| 7. Pilote | Après sprint 5 | 1 à 3 daaras réelles |
| 8. Passage payant | Premiers revenus | Supabase Pro si seuils atteints |

---

## Étape 1 — Dépôt Git

### 1.1 Créer le dépôt distant
GitHub → New repository → nom `daara`, **Private**, SANS README, .gitignore ni licence.
(GitHub recommandé : Cloudflare Pages et GitHub Actions s'y branchent directement.)

### 1.2 Configurer Git (une seule fois sur la machine)
```powershell
git config --global user.name "Assane Ngom"
git config --global user.email "<votre email GitHub>"
git config --global init.defaultBranch main
git config --global core.autocrlf false   # les fins de ligne sont gérées par .gitattributes
```

### 1.3 Assembler le projet en 3 commits
```powershell
# Extraire le thème
Expand-Archive "$env:USERPROFILE\Downloads\angular.zip" -DestinationPath "$env:USERPROFILE\Downloads\vristo" -Force
$V = "$env:USERPROFILE\Downloads\vristo\angular"   # adapter au chemin réel

# Commit 1 : conception + kit Claude Code
New-Item -ItemType Directory C:\dev\daara -Force; cd C:\dev\daara
Expand-Archive "$env:USERPROFILE\Downloads\daara-claude-kit.zip" -DestinationPath . -Force
New-Item -ItemType Directory "$env:USERPROFILE\.claude" -Force
Copy-Item .\global\CLAUDE.md "$env:USERPROFILE\.claude\CLAUDE.md"; Remove-Item .\global -Recurse
git init
git add .
git commit -m "docs: conception (HLD, LLD, sprints) et kit Claude Code"

# Commit 2 : starter Vristo comme base (sans écraser le .gitignore du kit)
robocopy "$V\vristo-angular-starter" . /E /XD node_modules .git dist .angular /XF .gitignore
Copy-Item "$V\vristo-angular-starter\.gitignore" .\.gitignore.starter -ErrorAction SilentlyContinue
# → fusionner à la main .gitignore.starter dans .gitignore, puis le supprimer
git add .
git commit -m "chore: ajout du starter Vristo Angular"

# Thème complet en référence : HORS dépôt (lecture seule, rien à commiter)
robocopy "$V\vristo-angular-main" C:\projets\vristo-reference /E /XD node_modules .git dist .angular
# → le déclarer dans .claude/settings.local.json (permissions.additionalDirectories).
#   On n'en copie dans le projet que les éléments nécessaires, au cas par cas.
```
Avant chaque `git add`, vérifier avec `git status` qu'aucun `node_modules` ni `.env` n'apparaît.

### 1.4 Pousser
```powershell
git remote add origin https://github.com/<vous>/daara.git
git push -u origin main
git checkout -b develop
git push -u origin develop
```

### 1.5 Règles de travail Git
- **Le développeur fait toutes les commandes git.** Claude Code n'exécute jamais `git` ni `gh`, même en
  lecture (bloqué par `deny` dans `.claude/settings.json`). En fin de tâche, il fournit la liste des
  fichiers modifiés, les commandes git à lancer et le message de commit.
- `main` = production : ne reçoit que des releases (fusion de `develop`) ; déployé automatiquement en
  production par Cloudflare Pages.
- `develop` = branche d'intégration.
- Cloudflare Pages : production sur `main`, preview sur `develop` et sur chaque branche de story.
- Une branche par story, créée depuis `develop` : `s1/memberships`, `s5/absences-temps-reel`…
- Pull request de la story vers `develop` (déclenche CI + preview Cloudflare de la branche),
  fusion en *squash*, branche supprimée.
- Release : pull request `develop` → `main`, puis tag sur `main` : `git tag r0 && git push --tags`.
- Commits en Conventional Commits : `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
- GitHub gratuit ne protège pas les branches sur un dépôt privé : la discipline (jamais de push direct sur
  `main` ni `develop`) repose sur le développeur, seul à exécuter les commandes git.

---

## Étape 2 — Comptes gratuits
| Service | Action |
|---|---|
| Supabase | Créer `daara-dev` et `daara-prod` (offre Free, région Europe de l'Ouest). Garder les mots de passe DB dans un gestionnaire de mots de passe |
| Cloudflare | Pages : connecter le dépôt GitHub (build Angular, sortie `dist/...`). R2 : créer un bucket `daara-files` (l'activation peut demander une carte, sans débit dans les limites gratuites) |
| Brevo ou Resend | Compte gratuit, vérifier l'expéditeur, configurer le SMTP dans Supabase Auth (les deux projets) |
| Sentry | Projet Angular gratuit |
Les clés (anon, DSN Sentry) iront dans les environnements Angular et les secrets GitHub/Cloudflare,
jamais dans un fichier commité.

---

## Étape 3 — Poste de travail
```powershell
node -v; git --version; docker --version   # Node LTS, Git, Docker Desktop
npx supabase --version
claude --version
cd C:\dev\daara
npm install
npm start          # le starter doit s'afficher
```

---

## Étape 4 — Première session Claude Code
```powershell
cd C:\dev\daara
git checkout develop
git checkout -b s0/analyse-starter
claude
```
`/memory` pour vérifier que CLAUDE.md est chargé, puis :

> Lis CLAUDE.md, docs/HLD.md, docs/LLD.md, docs/SPRINTS.md et docs/PROGRESS.md.
> Analyse le projet Angular (starter Vristo) et la référence `C:/projets/vristo-reference` : versions d'Angular et de
> Tailwind, structure, dépendances, éléments à supprimer. Propose un plan détaillé du sprint 0, story par
> story. Ne modifie rien avant ma validation. Termine en mettant à jour PROGRESS.md.

---

## Étape 5 — Sprint 0 (voir docs/SPRINTS.md)
Une branche et une session par story, dans cet ordre :
1. Mise à niveau / nettoyage du starter, charte DAARA
2. Supabase local (`supabase init`, `supabase start`) + `SupabaseService` + environnements
3. i18n fr/ar + RTL
4. Composants `shared/ui` de base
5. CI GitHub Actions + Cloudflare Pages
6. Workflows planifiés (sauvegarde → R2, anti-pause) + Sentry
Fin de sprint : tag `r0-s0`, application vide en ligne.

---

## Étape 6 — Rythme d'un sprint (2 semaines)
| Moment | Action | Avec Claude Code |
|---|---|---|
| Jour 1 | Planification : choisir les stories, compléter le LLD du sprint | « Détaille dans le LLD les stories du sprint N, sans coder » |
| Chaque story | Branche → spec → migration/RLS/tests → Angular → audit → PROGRESS → PR | Une session par story, `/clear` entre deux |
| Fin de sprint | Démo, mise à jour SPRINTS.md, rétrospective dans PROGRESS.md, tag | « Fais le bilan du sprint N dans PROGRESS.md » |
Économiser l'usage Claude Pro : demandes précises (« story X selon LLD §Y »), tâches mécaniques faites à la
main (install, tests, reset), agents d'audit en fin de story seulement.

---

## Étape 7 — Releases et pilote
| Release | Fin du sprint | Action |
|---|---|---|
| R0 | 2 | Démo interne, migrations appliquées sur `daara-prod` |
| R1 | 5 | **Pilote** : 1 à 3 daaras, formation courte, retours chaque fin de sprint |
| R2 | 8 | Bulletins et notifications chez les pilotes |
| R3 | 10 | Module Coran (nécessite `docs/nafar.md` validé) |
| R4 | 12 | Lancement commercial |
Avant chaque mise en production : `supabase db push` vers `daara-prod` fait par vous, après vérification
d'une sauvegarde récente.

En parallèle :
- Sprints 1-8 : rédiger `docs/nafar.md` avec les oustaz.
- Sprints 2-5 : trouver les daaras pilotes.
- Dès le sprint 5 : retours pilotes → backlog dans SPRINTS.md.

---

## Étape 8 — Passage payant (ADR-003)
Déclencheurs : premières daaras payantes, base > 350 Mo, ou besoin de garantie de service.
Action : Supabase `daara-prod` → Pro, ou auto-hébergement. Aucun changement de code.
