# ADR-002 — Modèle multi-tenant

Statut : acceptée

## Décision
- Base partagée, `daara_id` sur toute table métier (isolation RLS, index, filtre Realtime).
- `memberships(user_id, daara_id, role)` pour les droits : un utilisateur peut avoir plusieurs daaras/rôles.
- Les deux sont complémentaires : memberships = qui a accès ; daara_id = à qui appartient la ligne.
- Un seul rôle `enseignant`, spécialisé par ses affectations.

## Conséquences
Politiques RLS simples et performantes ; obligation de vérifier qu'une ligne référencée
(ex. apprenant) appartient à la même daara.
