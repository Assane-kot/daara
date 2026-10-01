---
name: composant-vristo
description: Retrouve un composant ou une page dans le thème Vristo de référence et l'adapte à DAARA (charte, signals, i18n, RTL). À utiliser pour tout élément d'interface (tableau, formulaire, modale, carte, graphique, dashboard).
---
# Réutiliser le thème Vristo

1. Chercher l'équivalent dans `_reference/vristo-full/src` (Grep sur le nom : datatable, modal, form, chart,
   invoice, profile, dashboard...). Lire le template, le TS et les styles associés.
2. Identifier les dépendances (librairies de tableau, graphiques, modales). Si une librairie n'est pas déjà
   dans le projet, le signaler avant de l'ajouter.
3. Recréer le composant dans `src/app/shared/ui/` (si réutilisable) ou dans la feature :
   - garder le markup et les classes Tailwind du thème ;
   - remplacer les données de démo par des `input()` typés ;
   - remplacer les couleurs en dur par les couleurs du thème DAARA ;
   - textes via i18n, vérifier le rendu en RTL et en mode sombre.
4. Ne jamais importer directement depuis `_reference/` et ne jamais le modifier.
5. Composants partagés à construire en priorité : data-table (pagination serveur), form-field, modal,
   confirm-dialog, stat-card, badge-statut, empty-state, page-header.
