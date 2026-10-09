-- Garde-fous transverses (règles non négociables, CLAUDE.md) : s'appliquent à toutes les migrations futures.
begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

-- Règle 1 : toute table du schéma public a la RLS activée.
select is_empty(
    $$ select tablename::text from pg_tables where schemaname = 'public' and not rowsecurity $$,
    'Toutes les tables du schéma public ont la RLS activée'
);

-- Une table avec RLS mais sans politique est inaccessible : signe d'une migration incomplète.
select is_empty(
    $$
        select t.tablename::text
        from pg_tables t
        where t.schemaname = 'public'
          and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)
    $$,
    'Toute table du schéma public a au moins une politique RLS'
);

-- Une vue s'exécute par défaut avec les droits de son propriétaire et contourne la RLS.
select is_empty(
    $$
        select c.relname::text
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'v'
          and not exists (
              select 1 from unnest(coalesce(c.reloptions, '{}')) o
              where o in ('security_invoker=true', 'security_invoker=on', 'security_invoker=1')
          )
    $$,
    'Toute vue du schéma public est en security_invoker'
);

-- Une vue matérialisée n'a pas de RLS : interdite dans public (exposée par l'API).
select is_empty(
    $$
        select c.relname::text
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'm'
    $$,
    'Aucune vue matérialisée dans le schéma public'
);

-- Une fonction sans search_path vide peut être détournée (objets homonymes) : `set search_path = ''` partout.
select is_empty(
    $$
        select p.oid::regprocedure::text
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
          and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c = 'search_path=""')
    $$,
    'Toute fonction du schéma public a search_path = '''''
);

-- Une table étrangère n'a pas de RLS : interdite dans public (exposée par l'API).
select is_empty(
    $$
        select c.relname::text
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'f'
    $$,
    'Aucune table étrangère dans le schéma public'
);

-- Les fonctions d'une extension installée dans public échappent aux contrôles ci-dessous : schéma extensions.
select is_empty(
    $$
        select e.extname::text
        from pg_extension e
        join pg_namespace n on n.oid = e.extnamespace
        where n.nspname = 'public'
    $$,
    'Aucune extension installée dans le schéma public'
);

-- Règle 1 : toute table métier porte daara_id uuid not null (liste blanche : tables racines et globales).
select is_empty(
    $$
        select c.relname::text
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind in ('r', 'p')
          and c.relname not in ('daaras', 'profiles', 'platform_admins')
          and not exists (
              select 1 from pg_attribute a
              where a.attrelid = c.oid
                and a.attname = 'daara_id'
                and a.atttypid = 'uuid'::regtype
                and a.attnotnull
                and not a.attisdropped
          )
    $$,
    'Toute table métier a une colonne daara_id uuid not null'
);

-- Règle 1 : daara_id est indexé (index dont la première colonne est daara_id).
select is_empty(
    $$
        select c.relname::text
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        join pg_attribute a on a.attrelid = c.oid and a.attname = 'daara_id' and not a.attisdropped
        where n.nspname = 'public'
          and c.relkind in ('r', 'p')
          and not exists (select 1 from pg_index i where i.indrelid = c.oid and i.indkey[0] = a.attnum)
    $$,
    'Toute colonne daara_id est en tête d''un index'
);

-- Règle supabase-rls : daara_id référence daaras(id) (liste blanche : audit_log, qui survit à la daara).
select is_empty(
    $$
        select c.relname::text
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        join pg_attribute a on a.attrelid = c.oid and a.attname = 'daara_id' and not a.attisdropped
        where n.nspname = 'public'
          and c.relkind in ('r', 'p')
          and c.relname not in ('audit_log')
          and not exists (
              select 1 from pg_constraint k
              where k.conrelid = c.oid
                and k.contype = 'f'
                and k.confrelid = 'public.daaras'::regclass
                and k.conkey = array[a.attnum]
          )
    $$,
    'Toute colonne daara_id référence daaras(id)'
);

-- Liste blanche des fonctions appelables par un utilisateur connecté (RPC) : toute nouvelle fonction exposée
-- doit être ajoutée ici consciemment ; une fonction interne exposée par oubli fait échouer le test.
select set_eq(
    $$
        select p.proname::text
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and has_function_privilege('authenticated', p.oid, 'execute')
          and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    $$,
    array['accepter_invitation', 'activer_annee', 'basculer_module', 'changer_role', 'creer_code_acces', 'creer_daara', 'creer_invitation', 'definir_actif', 'definir_modules', 'has_role', 'is_member', 'is_platform_admin', 'membres_administres', 'module_actif', 'revoquer_invitation', 'session_suffisante', 'texte_sur'],
    'Seules les fonctions de la liste blanche sont exécutables par authenticated'
);

-- Les séquences n'ont pas de RLS : setval casserait les identités.
select is_empty(
    $$
        select c.relname::text
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'S'
          and (has_sequence_privilege('authenticated', c.oid, 'USAGE, UPDATE')
               or has_sequence_privilege('anon', c.oid, 'SELECT, USAGE, UPDATE'))
    $$,
    'Aucune séquence du schéma public n''est utilisable par anon ou authenticated'
);

-- Aucune fonction de public exécutable sans être connecté (revoke ... from public, anon oublié).
select is_empty(
    $$
        select p.oid::regprocedure::text
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and has_function_privilege('anon', p.oid, 'execute')
          and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    $$,
    'Aucune fonction du schéma public n''est exécutable par anon'
);

-- anon n'a aucun droit sur les tables (aucune politique ne le vise : défense en profondeur).
select is_empty(
    $$
        select c.relname::text
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind in ('r', 'p', 'v', 'm', 'f')
          and has_table_privilege('anon', c.oid,
              'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN')
    $$,
    'anon n''a aucun droit sur les tables du schéma public'
);

-- TRUNCATE, REFERENCES, TRIGGER, MAINTAIN échappent à la RLS : jamais accordés à authenticated.
select is_empty(
    $$
        select c.relname::text
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind in ('r', 'p')
          and has_table_privilege('authenticated', c.oid, 'TRUNCATE, REFERENCES, TRIGGER, MAINTAIN')
    $$,
    'authenticated n''a ni TRUNCATE, ni REFERENCES, ni TRIGGER, ni MAINTAIN sur les tables'
);

select * from finish();
rollback;
