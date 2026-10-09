-- S3.2 : matières (spec structure-scolaire.md, LLD §3.3, §4, ADR-008).
-- Jeu : daara P (admin A, enseignant E, parent Pa) ; daara R (admin B). Module `structure` actif dans les deux.
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

create schema tests;
grant usage on schema tests to authenticated, anon;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims',
        case when p_user is null then '' else json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text end, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated, anon;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-00000000b0a1', 'admin.p11@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000b0e1', 'ens.p11@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000b0c1', 'parent.p11@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000b0b1', 'admin.r11@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-0000000b000a', 'Daara P11', 'test-daara-p11', '00000000-0000-0000-0000-00000000b0a1'),
    ('00000000-0000-0000-0000-0000000b000b', 'Daara R11', 'test-daara-r11', '00000000-0000-0000-0000-00000000b0b1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-0000000b000a', 'structure', true),
    ('00000000-0000-0000-0000-0000000b000b', 'structure', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-0000000b000a', '00000000-0000-0000-0000-00000000b0a1', 'admin'),
    ('00000000-0000-0000-0000-0000000b000a', '00000000-0000-0000-0000-00000000b0e1', 'enseignant'),
    ('00000000-0000-0000-0000-0000000b000a', '00000000-0000-0000-0000-00000000b0c1', 'parent'),
    ('00000000-0000-0000-0000-0000000b000b', '00000000-0000-0000-0000-00000000b0b1', 'admin');

set local role authenticated;

-- Écriture par l'admin et contraintes.
select tests.connecter('00000000-0000-0000-0000-00000000b0a1');
select lives_ok($$ insert into public.matieres (daara_id, nom, code, type) values
    ('00000000-0000-0000-0000-0000000b000a', 'Mathématiques', 'MATH', 'scolaire') $$,
    'admin aal2 : crée une matière');
reset role;
update public.matieres set id = '00000000-0000-0000-0000-00000000b100' where code = 'MATH';
set local role authenticated;
select throws_ok($$ insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000b000a', 'Mathe' || chr(769) || 'matiques', 'MATH3') $$, '23514', null,
    'nom en forme décomposée (NFD) : refusé');
select throws_ok($$ insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000b000a', 'Coran' || chr(160), 'COR') $$, '23514', null, 'espace insécable final : refusé');
select throws_ok($$ insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000b000a', 'Français', 'fr') $$, '23514', null, 'code en minuscules : refusé');
select throws_ok($$ insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000b000a', 'Maths bis', 'MATH') $$, '23505', null, 'code en double : refusé');
select throws_ok($$ insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000b000a', 'MATHÉMATIQUES', 'MATH2') $$, '23505', null, 'nom en double (casse ignorée) : refusé');
select throws_ok($$ insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000b000a', 'Coran ', 'COR') $$, '23514', null, 'nom avec espace final : refusé');
select throws_ok($$ insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000b000a', 'Co' || chr(8238) || 'ran', 'COR') $$, '23514', null, 'nom avec caractère bidirectionnel : refusé');
select throws_ok($$ update public.matieres set daara_id = '00000000-0000-0000-0000-0000000b000b' $$, '42501', null,
    'daara_id : non modifiable');
select throws_ok($$ select created_by from public.matieres $$, '42501', null, 'created_by : illisible');

-- Droits d'écriture refusés.
select tests.connecter('00000000-0000-0000-0000-00000000b0a1', 'aal1');
select throws_ok($$ insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000b000a', 'Arabe', 'AR') $$, '42501', null, 'admin aal1 : refusé');
select tests.connecter('00000000-0000-0000-0000-00000000b0e1');
select throws_ok($$ insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000b000a', 'Arabe', 'AR') $$, '42501', null, 'enseignant : création refusée');
update public.matieres set nom = 'Piraté';
select tests.connecter('00000000-0000-0000-0000-00000000b0b1');
select throws_ok($$ insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000b000a', 'Arabe', 'AR') $$, '42501', null, 'admin d''une autre daara : refusé');
update public.matieres set nom = 'Piraté';
delete from public.matieres;

-- Lectures.
select is((select count(*)::int from public.matieres), 0, 'admin d''une autre daara : rien de lisible');
select tests.connecter('00000000-0000-0000-0000-00000000b0e1');
select is((select nom from public.matieres), 'Mathématiques', 'enseignant : lit la matière, intacte malgré les écritures refusées');
select tests.connecter('00000000-0000-0000-0000-00000000b0c1', 'aal1');
select is((select count(*)::int from public.matieres), 1, 'parent : lit les matières');
set local role anon;
select tests.connecter(null);
select throws_ok($$ select id from public.matieres $$, '42501', null, 'anon : refusé');
set local role authenticated;

-- Archivage.
select tests.connecter('00000000-0000-0000-0000-00000000b0a1');
update public.matieres set archivee = true where id = '00000000-0000-0000-0000-00000000b100';
select is((select archivee from public.matieres where id = '00000000-0000-0000-0000-00000000b100'), true, 'admin : archive');
update public.matieres set archivee = false where id = '00000000-0000-0000-0000-00000000b100';
select is((select archivee from public.matieres where id = '00000000-0000-0000-0000-00000000b100'), false, 'admin : désarchive');

-- Module désactivé : tout refusé, admin compris ; données retrouvées après réactivation.
reset role;
update public.daara_modules set actif = false where daara_id = '00000000-0000-0000-0000-0000000b000a' and module = 'structure';
set local role authenticated;
select is((select count(*)::int from public.matieres), 0, 'module désactivé : rien de lisible, admin compris');
select throws_ok($$ insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000b000a', 'Arabe', 'AR') $$, '42501', null, 'module désactivé : création refusée');
reset role;
update public.daara_modules set actif = true where daara_id = '00000000-0000-0000-0000-0000000b000a' and module = 'structure';
set local role authenticated;
select is((select count(*)::int from public.matieres), 1, 'module réactivé : données retrouvées');

-- Suppression et journal.
select lives_ok($$ delete from public.matieres where id = '00000000-0000-0000-0000-00000000b100' $$, 'admin : supprime une matière inutilisée');
reset role;
select is((select count(*)::int from public.matieres where daara_id = '00000000-0000-0000-0000-0000000b000a'), 0, 'matière supprimée');
select ok((select count(*) = 5 and bool_and(user_id = '00000000-0000-0000-0000-00000000b0a1') from public.audit_log
    where table_name = 'matieres' and daara_id = '00000000-0000-0000-0000-0000000b000a'), 'journal : création, mise en place du test, archivage x2, suppression, avec l''auteur');

select * from finish();
rollback;
