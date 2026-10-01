---
name: migration-supabase
description: Crée une migration Supabase complète et sécurisée pour DAARA (table multi-tenant, index, RLS, politiques par rôle, audit, Realtime, tests pgTAP). À utiliser pour toute création ou modification de table.
---
# Migration Supabase DAARA

## Étapes
1. `supabase migration new <nom_explicite>` (ex : `create_absences`).
2. Écrire la migration selon le modèle ci-dessous.
3. Écrire le test `supabase/tests/<nom>.test.sql` (modèle ci-dessous).
4. `supabase db reset` puis `supabase test db` : tout doit passer.
5. `supabase gen types typescript --local > src/app/core/supabase/database.types.ts`

## Prérequis (migration socle, sprint 1)
Les helpers doivent exister :
```sql
create or replace function public.is_member(p_daara uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m
                 where m.daara_id = p_daara and m.user_id = auth.uid() and m.actif);
$$;

create or replace function public.has_role(p_daara uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m
                 where m.daara_id = p_daara and m.user_id = auth.uid()
                   and m.actif and m.role = any(p_roles));
$$;
```

## Modèle de migration
```sql
create table public.absences (
  id uuid primary key default gen_random_uuid(),
  daara_id uuid not null references public.daaras(id) on delete cascade,
  apprenant_id uuid not null references public.apprenants(id) on delete cascade,
  date_absence date not null,
  justifiee boolean not null default false,
  motif text check (char_length(motif) <= 500),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id)
);
create index on public.absences (daara_id);
create index on public.absences (apprenant_id, date_absence);

alter table public.absences enable row level security;

-- Personnel de la daara : lecture
create policy absences_select_staff on public.absences for select to authenticated
  using ((select public.has_role(daara_id, array['admin','enseignant'])));

-- Parent : lecture des absences de ses enfants uniquement
create policy absences_select_parent on public.absences for select to authenticated
  using (exists (select 1 from public.parent_links pl
                 where pl.apprenant_id = absences.apprenant_id
                   and pl.parent_user_id = (select auth.uid())));

-- Écriture : admin et enseignant, dans LEUR daara
create policy absences_insert_staff on public.absences for insert to authenticated
  with check ((select public.has_role(daara_id, array['admin','enseignant'])));
create policy absences_update_staff on public.absences for update to authenticated
  using ((select public.has_role(daara_id, array['admin','enseignant'])))
  with check ((select public.has_role(daara_id, array['admin','enseignant'])));
create policy absences_delete_admin on public.absences for delete to authenticated
  using ((select public.has_role(daara_id, array['admin'])));

-- Audit (table sensible)
create trigger absences_audit after insert or update or delete on public.absences
  for each row execute function public.audit_trigger();

-- Realtime (seulement si un écran l'utilise)
alter publication supabase_realtime add table public.absences;
```
Vérifier aussi que l'apprenant référencé appartient bien à la même daara (contrainte ou trigger).

## Modèle de test pgTAP
```sql
begin;
select plan(3);
-- Données : daara A, daara B, un enseignant de A (insérées en tant que postgres)
-- ... inserts ...

-- Se connecter comme l'enseignant de A
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '<uuid-enseignant-A>', 'role', 'authenticated')::text, true);

select ok((select count(*) from public.absences where daara_id = '<uuid-A>') > 0, 'A voit ses absences');
select is((select count(*) from public.absences where daara_id = '<uuid-B>'), 0::bigint, 'A ne voit pas B');
select throws_ok($$ insert into public.absences (daara_id, apprenant_id, date_absence)
                   values ('<uuid-B>', '<uuid-apprenant-B>', current_date) $$,
                 null, 'A ne peut pas écrire dans B');
select * from finish();
rollback;
```
Toujours tester : accès autorisé, lecture inter-daara refusée, écriture inter-daara refusée, parent limité à ses enfants.
