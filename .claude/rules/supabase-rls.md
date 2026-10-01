---
paths:
  - "supabase/**"
---
# Règles Supabase / RLS

- Toute table métier : `id uuid pk default gen_random_uuid()`, `daara_id uuid not null references daaras(id)`,
  `created_at timestamptz default now()`, `created_by uuid default auth.uid()`, index sur `daara_id`.
- `alter table ... enable row level security;` dans la même migration que le `create table`.
- Une politique par opération (select / insert / update / delete) et par profil. Pas de `for all` sauf admin.
- Utiliser les fonctions helpers `public.is_member(daara_id)` et `public.has_role(daara_id, roles text[])`,
  appelées sous la forme `(select public.has_role(...))` pour que Postgres les mette en cache.
- Helpers en `security definer`, `stable`, `set search_path = ''`, noms de tables qualifiés (`public.memberships`).
- Insert/update : `with check` qui vérifie AUSSI le `daara_id` (empêche d'écrire dans une autre daara).
- Accès parent : via `public.parent_links(parent_user_id, apprenant_id)`, jamais via un champ libre.
- Realtime : ajouter la table à la publication `supabase_realtime` uniquement si un écran en a besoin.
- Tables sensibles (notes, absences, bulletins) : trigger d'audit vers `public.audit_log`.
- Storage : chemins `daara_id/...` et politiques sur `storage.objects` qui vérifient le premier segment.
- Calculs (moyennes, rangs) : vues `security_invoker = true` ou fonctions SQL, jamais dupliqués côté front.
