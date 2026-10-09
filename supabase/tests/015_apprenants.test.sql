-- S4.1 : fiches apprenants, matricule, journal sans valeurs, photos privées (spec apprenants.md, LLD §3.4, ADR-010).
-- Jeu : daara P (admin A, enseignant E, parent Pa) ; daara R (admin B).
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-00000000f0a1', 'admin.p15@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000f0e1', 'ens.p15@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000f0c1', 'parent.p15@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000f0b1', 'admin.r15@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-0000000f000a', 'Daara P15', 'test-daara-p15', '00000000-0000-0000-0000-00000000f0a1'),
    ('00000000-0000-0000-0000-0000000f000b', 'Daara R15', 'test-daara-r15', '00000000-0000-0000-0000-00000000f0b1');
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-0000000f000a', '00000000-0000-0000-0000-00000000f0a1', 'admin'),
    ('00000000-0000-0000-0000-0000000f000a', '00000000-0000-0000-0000-00000000f0e1', 'enseignant'),
    ('00000000-0000-0000-0000-0000000f000a', '00000000-0000-0000-0000-00000000f0c1', 'parent'),
    ('00000000-0000-0000-0000-0000000f000b', '00000000-0000-0000-0000-00000000f0b1', 'admin');

set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-00000000f0a1');

-- Création et matricule.
insert into public.apprenants (daara_id, nom, prenom, date_naissance, sexe)
values ('00000000-0000-0000-0000-0000000f000a', 'Ndiaye', 'Awa', '2016-03-12', 'F');
insert into public.apprenants (daara_id, nom, prenom) values ('00000000-0000-0000-0000-0000000f000a', 'Fall', 'Modou');
select results_eq(
    $$ select matricule from public.apprenants order by matricule $$,
    $$ values (extract(year from current_date)::text || '-0001'), (extract(year from current_date)::text || '-0002') $$,
    'matricule généré : année + compteur de la daara');
select is((select statut::text from public.apprenants where prenom = 'Modou'), 'inscrit', 'statut par défaut : inscrit');
select throws_ok($$ insert into public.apprenants (daara_id, matricule, nom, prenom) values
    ('00000000-0000-0000-0000-0000000f000a', '1999-0001', 'X', 'Y') $$, '42501', null, 'matricule fourni par le client : refusé');
select throws_ok($$ update public.apprenants set matricule = '1999-0001' $$, '42501', null, 'matricule non modifiable');
select throws_ok($$ update public.apprenants set daara_id = '00000000-0000-0000-0000-0000000f000b' $$, '42501', null, 'daara_id non modifiable');
select throws_ok($$ insert into public.apprenants (daara_id, nom, prenom) values
    ('00000000-0000-0000-0000-0000000f000a', 'Sow' || chr(160), 'Ali') $$, '23514', null, 'nom avec espace insécable : refusé');
select throws_ok($$ insert into public.apprenants (daara_id, nom, prenom, date_naissance) values
    ('00000000-0000-0000-0000-0000000f000a', 'Sow', 'Ali', current_date + 1) $$, '23514', null, 'date de naissance future : refusée');
select throws_ok($$ select created_by from public.apprenants $$, '42501', null, 'created_by illisible');
select throws_ok($$ select * from public.compteurs_matricule $$, '42501', null, 'compteurs : aucun accès client');

-- Journal sans valeurs (ADR-010).
update public.apprenants set nom = 'Ndiaye-Sarr' where prenom = 'Awa';
reset role;
select is((select new_data from public.audit_log where table_name = 'apprenants' and action = 'UPDATE'
    and daara_id = '00000000-0000-0000-0000-0000000f000a'), '{"colonnes": ["nom"]}'::jsonb, 'journal : colonnes modifiées, sans valeurs');
select ok(not exists (select 1 from public.audit_log where table_name = 'apprenants'
    and (coalesce(old_data, '{}'::jsonb)::text || new_data::text) like '%Awa%'), 'journal : aucun nom d''enfant');
set local role authenticated;

-- Droits refusés.
select tests.connecter('00000000-0000-0000-0000-00000000f0a1', 'aal1');
select throws_ok($$ insert into public.apprenants (daara_id, nom, prenom) values ('00000000-0000-0000-0000-0000000f000a', 'X', 'Y') $$,
    '42501', null, 'admin aal1 : refusé');
select tests.connecter('00000000-0000-0000-0000-00000000f0e1');
select throws_ok($$ insert into public.apprenants (daara_id, nom, prenom) values ('00000000-0000-0000-0000-0000000f000a', 'X', 'Y') $$,
    '42501', null, 'enseignant : création refusée');
select is((select count(*)::int from public.apprenants), 0, 'enseignant : aucun élève lisible en S4.1 (ses classes en S4.2)');
select tests.connecter('00000000-0000-0000-0000-00000000f0c1', 'aal1');
select is((select count(*)::int from public.apprenants), 0, 'parent : aucun élève lisible en S4.1 (ses enfants en S4.3)');
select tests.connecter('00000000-0000-0000-0000-00000000f0b1');
select is((select count(*)::int from public.apprenants), 0, 'admin d''une autre daara : rien de lisible');
select throws_ok($$ insert into public.apprenants (daara_id, nom, prenom) values ('00000000-0000-0000-0000-0000000f000a', 'X', 'Y') $$,
    '42501', 'admin_aal2_requis', 'admin d''une autre daara : création refusée avant tout calcul du matricule');

-- Photo : chemin contraint, bucket privé.
select tests.connecter('00000000-0000-0000-0000-00000000f0a1');
reset role;
create temporary table awa as select id from public.apprenants where prenom = 'Awa' and daara_id = '00000000-0000-0000-0000-0000000f000a';
grant select on awa to authenticated;
set local role authenticated;
select throws_ok($$ update public.apprenants set photo_path = '00000000-0000-0000-0000-0000000f000b/apprenants/' || id || '.webp' where id = (select id from awa) $$,
    '23514', null, 'chemin de photo d''une autre daara : refusé');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id)
    select 'photos', '00000000-0000-0000-0000-0000000f000a/apprenants/' || id || '.webp', '00000000-0000-0000-0000-00000000f0a1' from awa $$,
    'admin : dépose la photo d''un élève de sa daara');
select tests.connecter('00000000-0000-0000-0000-00000000f0b1');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id)
    select 'photos', '00000000-0000-0000-0000-0000000f000a/apprenants/' || id || '.png', '00000000-0000-0000-0000-00000000f0b1' from awa $$,
    '42501', null, 'admin d''une autre daara : dépôt refusé');
select is((select count(*)::int from storage.objects where bucket_id = 'photos'), 0, 'admin d''une autre daara : photo illisible');
select tests.connecter('00000000-0000-0000-0000-00000000f0e1');
select is((select count(*)::int from storage.objects where bucket_id = 'photos'), 0, 'enseignant : photo illisible en S4.1');

select * from finish();
rollback;
