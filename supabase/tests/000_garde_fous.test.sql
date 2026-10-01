-- Garde-fous transverses (règles non négociables, CLAUDE.md) : s'appliquent à toutes les migrations futures.
begin;

create extension if not exists pgtap with schema extensions;

select plan(2);

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

select * from finish();
rollback;
