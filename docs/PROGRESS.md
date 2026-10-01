# Journal d'avancement

> À mettre à jour à la FIN de chaque session / tâche, avant le commit.
> Format : date, fait, décisions, problèmes ouverts, prochaine étape.

## État actuel
- Sprint en cours : 0 — Installation (voir docs/SPRINTS.md)
- Dernière tâche terminée : analyse du starter, plan du sprint 0 validé, ADR-004 et ADR-005
- Problèmes ouverts :
  - Licence Vristo : vérifier le type (Regular ou Extended). La Regular ne couvre pas un produit à accès
    payant → à régler avant R4 (Extended, accord de l'auteur, ou remplacement du CSS propre à Vristo).

## Prochaine étape
S0.1 — Socle Angular 22 (projet neuf, option B de l'ADR-004) : standalone, zoneless, Tailwind 3.4,
layouts Vristo réécrits sans démo, `ThemeService`, Vitest. Puis S0.2 → S0.10 (plan ci-dessous).

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
