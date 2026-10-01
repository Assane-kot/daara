> Résumé. La référence détaillée est docs/HLD.md et docs/LLD.md.

# Architecture DAARA

## Vue d'ensemble
Angular (PWA, base Vristo) ──supabase-js──► Supabase
  - Auth (JWT)          - PostgreSQL (multi-tenant, RLS, vues, fonctions, triggers)
  - Realtime            - Storage (audios, bulletins PDF, photos)
  - Edge Functions (notifications, PDF, moteur nafar, intégrations paiement/SMS)
Spring Boot : optionnel, plus tard, pour traitements lourds (batch PDF, nafar avancé).

## Multi-tenant
- Base partagée, colonne `daara_id` sur toute table métier, isolation par RLS.
- `memberships(user_id, daara_id, role, actif)` : un utilisateur peut appartenir à plusieurs daaras avec
  des rôles différents.
- `parent_links(parent_user_id, apprenant_id)` : accès parent limité à ses enfants.
- Un seul rôle `enseignant` ; la différence prof français / oustaz vient des affectations (classe, matière,
  suivi Coran), pas du rôle.

## Temps réel et notifications
| Besoin | Mécanisme |
|---|---|
| Écran ouvert mis à jour instantanément | Supabase Realtime (filtré par daara_id) |
| Utilisateur hors de l'app | Push PWA / SMS / WhatsApp via Edge Function |
| Traitement lourd ou asynchrone | Edge Function (puis Spring Boot si besoin) |
À forte charge : passer des `postgres_changes` au Broadcast déclenché par triggers.

## Modules
- Socle : daaras, profiles, memberships, invitations, audit_log
- Scolaire : annees_scolaires, periodes, classes, matieres, affectations, apprenants, inscriptions,
  absences, evaluations, notes, bulletins
- Coran : cahier_entrees, recitations, (nafar : selon docs/nafar.md)
- SaaS : offres, abonnements, paiements

## Environnements
- Local : `supabase start` (Docker)
- daara-dev : projet Supabase Free de test (Claude Code / MCP en lecture seule autorisés)
- daara-prod : production (aucun accès Claude Code)
