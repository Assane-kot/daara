---
paths:
  - "src/**/*.html"
  - "src/**/*.scss"
  - "src/**/*.css"
  - "tailwind.config.*"
---
# Règles UI (thème Vristo)

- Base du projet : starter Vristo. Référence : `_reference/vristo-full/` (lecture seule).
- Avant de créer un composant UI, chercher son équivalent dans `_reference/vristo-full/src` et réutiliser
  son markup et ses classes Tailwind. Ne pas inventer un style différent du thème.
- Charte DAARA : couleur primaire `#1a6b3c` (vert), accent `#C9A84C` (or). Configurées une seule fois
  dans la config Tailwind / variables du thème, jamais en dur dans les templates.
- Mode sombre et RTL du thème doivent continuer à fonctionner sur chaque écran.
- Ne pas copier les pages de démo inutiles (e-commerce, crypto, etc.) du thème complet.
- Tableaux de données : pagination, recherche et tri côté serveur (Supabase `range`, `ilike`, `order`).
- Mobile first : les parents utilisent surtout un téléphone ; vérifier chaque écran parent en 375px.
