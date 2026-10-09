-- S3.4 : rechercher_membres (liste paginée des membres, LLD §4).
-- Jeu : daara P (admin A, enseignant Émile Ndiaye, parent Fatou Sow, parent désactivé « Awa Fall ») ; daara R (admin B).
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create schema tests;
grant usage on schema tests to authenticated, anon;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims',
        case when p_user is null then '' else json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text end, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated, anon;

insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
    ('00000000-0000-0000-0000-00000000d0a1', 'admin.p13@test.local', 'authenticated', 'authenticated', now(), '{"prenom": "Aïssatou", "nom": "Ba"}'),
    ('00000000-0000-0000-0000-00000000d0e1', 'ens.p13@test.local', 'authenticated', 'authenticated', now(), '{"prenom": "Émile", "nom": "Ndiaye"}'),
    ('00000000-0000-0000-0000-00000000d0c1', 'parent.p13@test.local', 'authenticated', 'authenticated', now(), '{"prenom": "Fatou", "nom": "Sow"}'),
    ('00000000-0000-0000-0000-00000000d0c2', 'ancien.p13@test.local', 'authenticated', 'authenticated', now(), '{"prenom": "Awa", "nom": "Fall"}'),
    ('00000000-0000-0000-0000-00000000d0b1', 'admin.r13@test.local', 'authenticated', 'authenticated', now(), '{}');
update public.profiles set telephone = '+221 77 123 45 67' where id = '00000000-0000-0000-0000-00000000d0c1';
update public.profiles set telephone = '+221 70 000 00 00' where id = '00000000-0000-0000-0000-00000000d0c2';
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-0000000d000a', 'Daara P13', 'test-daara-p13', '00000000-0000-0000-0000-00000000d0a1'),
    ('00000000-0000-0000-0000-0000000d000b', 'Daara R13', 'test-daara-r13', '00000000-0000-0000-0000-00000000d0b1');
insert into public.memberships (daara_id, user_id, role, actif, nom_affiche) values
    ('00000000-0000-0000-0000-0000000d000a', '00000000-0000-0000-0000-00000000d0a1', 'admin', true, null),
    ('00000000-0000-0000-0000-0000000d000a', '00000000-0000-0000-0000-00000000d0e1', 'enseignant', true, null),
    ('00000000-0000-0000-0000-0000000d000a', '00000000-0000-0000-0000-00000000d0c1', 'parent', true, null),
    ('00000000-0000-0000-0000-0000000d000a', '00000000-0000-0000-0000-00000000d0c2', 'parent', false, 'Awa Fall'),
    ('00000000-0000-0000-0000-0000000d000b', '00000000-0000-0000-0000-00000000d0b1', 'admin', true, null);

set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-00000000d0a1');

select results_eq(
    $$ select nom, total from public.rechercher_membres('00000000-0000-0000-0000-0000000d000a', '', null, 'actifs', 'role', 0, 20) $$,
    $$ values ('Aïssatou Ba'::text, 3::bigint), ('Émile Ndiaye', 3), ('Fatou Sow', 3) $$,
    'actifs par défaut, triés par rôle puis nom, total');
select results_eq(
    $$ select nom from public.rechercher_membres('00000000-0000-0000-0000-0000000d000a', 'emile', null, 'actifs', 'role', 0, 20) $$,
    $$ values ('Émile Ndiaye'::text) $$, 'recherche sans accents ni casse');
select results_eq(
    $$ select nom from public.rechercher_membres('00000000-0000-0000-0000-0000000d000a', '77 123', null, 'tous', 'role', 0, 20) $$,
    $$ values ('Fatou Sow'::text) $$, 'recherche sur le téléphone');
select results_eq(
    $$ select nom, telephone from public.rechercher_membres('00000000-0000-0000-0000-0000000d000a', '', null, 'desactives', 'role', 0, 20) $$,
    $$ values ('Awa Fall'::text, null::text) $$, 'désactivé : nom figé, téléphone non transmis');
select is((select count(*)::int from public.rechercher_membres('00000000-0000-0000-0000-0000000d000a', '70 000', null, 'tous', 'role', 0, 20)), 0,
    'téléphone d''un désactivé : pas de recherche dessus');
select results_eq(
    $$ select nom from public.rechercher_membres('00000000-0000-0000-0000-0000000d000a', '', 'parent', 'tous', '-nom', 0, 20) $$,
    $$ values ('Fatou Sow'::text), ('Awa Fall') $$, 'filtre rôle et tri par nom décroissant');
select results_eq(
    $$ select nom, total from public.rechercher_membres('00000000-0000-0000-0000-0000000d000a', '', null, 'tous', 'nom', 1, 2) $$,
    $$ values ('Awa Fall'::text, 4::bigint), ('Émile Ndiaye', 4) $$, 'pagination : décalage et limite, total de la recherche');
select is((select count(*)::int from public.rechercher_membres('00000000-0000-0000-0000-0000000d000a', '%', null, 'tous', 'role', 0, 20)), 0,
    'caractère % neutralisé (pas de joker)');
select throws_ok($$ select * from public.rechercher_membres('00000000-0000-0000-0000-0000000d000a', '', null, 'tous', 'role', 0, 500) $$,
    '22023', 'parametre_invalide', 'limite > 100 : refusée');

select tests.connecter('00000000-0000-0000-0000-00000000d0e1');
select throws_ok($$ select * from public.rechercher_membres('00000000-0000-0000-0000-0000000d000a', '', null, 'tous', 'role', 0, 20) $$,
    '42501', 'admin_aal2_requis', 'enseignant : refusé');
select tests.connecter('00000000-0000-0000-0000-00000000d0b1');
select throws_ok($$ select * from public.rechercher_membres('00000000-0000-0000-0000-0000000d000a', '', null, 'tous', 'role', 0, 20) $$,
    '42501', 'admin_aal2_requis', 'admin d''une autre daara : refusé');
select tests.connecter('00000000-0000-0000-0000-00000000d0a1', 'aal1');
select throws_ok($$ select * from public.rechercher_membres('00000000-0000-0000-0000-0000000d000a', '', null, 'tous', 'role', 0, 20) $$,
    '42501', 'admin_aal2_requis', 'admin aal1 : refusé');

reset role;
insert into public.matieres (daara_id, nom, code) values ('00000000-0000-0000-0000-0000000d000a', 'Éducation islamique', 'EDU');
select is((select recherche from public.matieres where code = 'EDU' and daara_id = '00000000-0000-0000-0000-0000000d000a'), 'education islamique edu',
    'colonne de recherche des matières : minuscules, sans accents');

select * from finish();
rollback;
