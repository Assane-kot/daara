---
paths:
  - "src/**/*.html"
  - "src/**/*.scss"
  - "src/**/*.css"
  - "tailwind.config.*"
---
# Règles UI (thème Vristo)

- Base du projet : starter Vristo. Référence : thème complet hors dépôt dans `C:/projets/vristo-reference/`
  (lecture seule).
- Avant de créer un composant UI, chercher son équivalent dans `C:/projets/vristo-reference/src` et réutiliser
  son markup et ses classes Tailwind. N'en copier que les éléments nécessaires, au cas par cas.
  Ne pas inventer un style différent du thème.
- Charte DAARA : couleur primaire `#1a6b3c` (vert), secondaire / accent `#C9A84C` (or). Configurées une seule fois
  dans la config Tailwind / variables du thème, jamais en dur dans les templates.
- Le mode sombre doit fonctionner sur chaque écran. Garder les classes `ltr:` / `rtl:` du markup Vristo
  (pas de vérification RTL en V1, ADR-005).
- Ne pas copier les pages de démo inutiles (e-commerce, crypto, etc.) du thème complet.
- Tableaux de données : pagination, recherche et tri côté serveur (Supabase `range`, `ilike`, `order`).
- Mobile first : les parents utilisent surtout un téléphone ; vérifier chaque écran parent en 375px.
