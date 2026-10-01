# DAARA — SaaS de gestion des daaras

Plateforme web multi-tenant : chaque daara a son espace (admin, enseignants, parents, apprenants).
Modules : scolaire (classes, matières, notes, bulletins, absences) + Coran (cahier, récitations, moteur nafar).
Langue de travail : français. Réponses concises.

## Stack
- Front : Angular, base = starter Vristo (Tailwind). Référence UI complète : `_reference/vristo-full/` (LECTURE SEULE).
- Back : Supabase Free (Postgres, Auth, Realtime, Storage, Edge Functions). Spring Boot éventuel plus tard, pas en V1.
- Front sur Cloudflare Pages ; audios et sauvegardes sur Cloudflare R2. Projets Supabase : daara-dev, daara-prod.
- Zéro abonnement (ADR-003) : ne jamais proposer de service payant sans le signaler explicitement.

## Règles non négociables
1. Toute table métier a `daara_id uuid not null` + index + RLS activée DANS LA MÊME migration.
2. Droits via `memberships(user_id, daara_id, role)` ; rôles : admin, enseignant, parent, apprenant.
3. Jamais de clé service_role, ni de secret, dans le code Angular ou dans Git.
4. Schéma modifié UNIQUEMENT par migrations (`supabase migration new`), jamais via le dashboard.
5. Chaque migration avec RLS a ses tests pgTAP dans `supabase/tests/` (accès autorisé + accès refusé inter-daara).
6. Ne jamais modifier `_reference/`. On s'en inspire, on adapte, on n'importe pas en bloc.
7. Je ne lance jamais `supabase db push` ni de commande sur la prod : c'est le développeur qui le fait.

## Git
- Jamais de commit ni de push direct sur `main` : une branche par story (`sN/nom-story`), puis pull request.
- Conventional Commits en français.

## Workflow par feature
1. Mode plan → vérifier/compléter la section du LLD, spec dans `docs/features/<nom>.md` (modèle : `_TEMPLATE.md`) → validation du développeur.
2. Migration + RLS + tests pgTAP → `supabase db reset` + `supabase test db`.
3. `supabase gen types typescript --local > src/app/core/supabase/database.types.ts`
4. Code Angular (skill feature-angular, composants via skill composant-vristo).
5. Agent `auditeur-securite` (+ `auditeur-rls` si nouvelles tables) → corriger.
6. Mettre à jour `docs/PROGRESS.md`, cocher la story dans `docs/SPRINTS.md`, commit (Conventional Commits).

## Mémoire du projet
- Avancement : @docs/PROGRESS.md
- Sprints : @docs/SPRINTS.md
- Conception : docs/HLD.md (vue d'ensemble) · docs/LLD.md (tables, RLS, routes, flux) — FONT FOI
- Le code doit respecter le LLD. Si l'implémentation doit s'en écarter : proposer la modification du LLD d'abord.
- CDC SaaS : docs/cdc-v2.md · Nafar : docs/nafar.md
- Décisions : docs/decisions/ (créer un ADR pour toute décision structurante)
- Historique : docs/cdc-v1-mobile.md (ancienne version mobile Firebase, ne fait plus foi)

Toute information importante apprise en session (décision, contrainte, piège) doit être écrite dans
PROGRESS.md, un ADR ou ce fichier — sinon elle sera perdue à la prochaine session.

## Commandes utiles
- `npm start` · `npm test` · `npm run build`
- `supabase start` · `supabase db reset` · `supabase test db` · `supabase migration new <nom>`
