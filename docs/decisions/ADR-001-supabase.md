# ADR-001 — Supabase comme backend de la V1

Statut : acceptée

## Contexte
Passage de DAARA d'une app mobile Firebase à un SaaS web multi-tenant : données relationnelles
(notes, bulletins, absences), temps réel multi-profils, petite équipe, besoin d'aller vite.

## Décision
Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) + Angular. Spring Boot reporté.

## Conséquences
+ Relationnel, RLS multi-tenant native, temps réel intégré, pas de CRUD backend à écrire.
+ Open source, auto-hébergeable.
− La sécurité repose sur la RLS : elle doit être testée systématiquement (pgTAP).
− Logique complexe à placer en SQL ou Edge Functions (Deno/TS).
