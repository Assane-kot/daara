# DAARA

SaaS de gestion des daaras (écoles coraniques et franco-arabes) : scolarité, absences, notes, bulletins,
suivi du Coran. Plateforme multi-tenant : chaque daara dispose de son espace (admin, enseignants, parents,
apprenants).

## Stack
- Front : Angular 22 (standalone, signals, zoneless), Tailwind CSS 3.4, thème Vristo adapté (ADR-004).
- Back : Supabase (Postgres + RLS, Auth, Realtime, Storage, Edge Functions) (ADR-001, ADR-002).
- Hébergement : Cloudflare Pages ; fichiers lourds et sauvegardes sur Cloudflare R2 (ADR-003).

## Prérequis
- Node 24 LTS (Angular 22 exige `^22.22.3 || ^24.15`)
- Docker Desktop et Supabase CLI (à partir du sprint 0, story S0.5)

## Commandes
| Commande | Rôle |
|---|---|
| `npm install` | Installe les dépendances |
| `npm start` | Serveur de développement (http://localhost:4200) |
| `npm test` | Tests unitaires Vitest (mode watch) |
| `npm run test:ci` | Tests unitaires, exécution unique |
| `npm run build` | Build de production dans `dist/daara` (génère l'environnement via `scripts/set-env.mjs`) |
| `npm run lint` | ESLint (règles Angular, accessibilité des templates) |
| `npm run format` / `format:check` | Prettier (tri des classes Tailwind) |
| `npm run db:start` / `db:stop` | Supabase local (Docker Desktop requis) |
| `npm run db:reset` / `db:test` | Réapplique migrations et seed / tests pgTAP |
| `npm run db:types` | Régénère `database.types.ts` |

En développement, la page `/dev/charte` présente la charte graphique (couleurs, boutons, formulaires).

## Intégration continue
GitHub Actions (`.github/workflows/ci.yml`) à chaque push sur `develop` / `main` et chaque pull request :
format, lint, tests unitaires, build, `npm audit`, tests pgTAP sur Postgres local, scan de secrets (gitleaks).

## Documentation
- Conception : `docs/HLD.md` (vue d'ensemble), `docs/LLD.md` (tables, RLS, routes, flux)
- Décisions : `docs/decisions/`
- Avancement : `docs/PROGRESS.md` · Sprints : `docs/SPRINTS.md`
