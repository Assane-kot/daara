-- S3.3 : classes, affectations, teaches_class, enseignants_daara (spec structure-scolaire.md, LLD §3.3, §4, ADR-008).
-- Jeu : daara P (admin A, enseignant E, enseignant E2 désactivé, parent Pa) ; daara R (admin B, enseignant ER).
begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

create schema tests;
grant usage on schema tests to authenticated, anon;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims',
        case when p_user is null then '' else json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text end, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated, anon;

insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
    ('00000000-0000-0000-0000-00000000c0a1', 'admin.p12@test.local', 'authenticated', 'authenticated', now(), '{"prenom": "Awa", "nom": "Diop"}'),
    ('00000000-0000-0000-0000-00000000c0e1', 'ens.p12@test.local', 'authenticated', 'authenticated', now(), '{"prenom": "Modou", "nom": "Fall"}'),
    ('00000000-0000-0000-0000-00000000c0e2', 'ens2.p12@test.local', 'authenticated', 'authenticated', now(), '{}'),
    ('00000000-0000-0000-0000-00000000c0c1', 'parent.p12@test.local', 'authenticated', 'authenticated', now(), '{}'),
    ('00000000-0000-0000-0000-00000000c0b1', 'admin.r12@test.local', 'authenticated', 'authenticated', now(), '{}'),
    ('00000000-0000-0000-0000-00000000c0f1', 'ens.r12@test.local', 'authenticated', 'authenticated', now(), '{}');
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-0000000c000a', 'Daara P12', 'test-daara-p12', '00000000-0000-0000-0000-00000000c0a1'),
    ('00000000-0000-0000-0000-0000000c000b', 'Daara R12', 'test-daara-r12', '00000000-0000-0000-0000-00000000c0b1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-0000000c000a', 'structure', true),
    ('00000000-0000-0000-0000-0000000c000b', 'structure', true);
insert into public.memberships (daara_id, user_id, role, actif, nom_affiche) values
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c0a1', 'admin', true, null),
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c0e1', 'enseignant', true, null),
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c0e2', 'enseignant', false, 'Ancien Maître'),
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c0c1', 'parent', true, null),
    ('00000000-0000-0000-0000-0000000c000b', '00000000-0000-0000-0000-00000000c0b1', 'admin', true, null),
    ('00000000-0000-0000-0000-0000000c000b', '00000000-0000-0000-0000-00000000c0f1', 'enseignant', true, null);
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-00000000c100', '00000000-0000-0000-0000-0000000c000a', '2026-2027', '2026-10-01', '2027-07-31'),
    ('00000000-0000-0000-0000-00000000c200', '00000000-0000-0000-0000-0000000c000b', '2026-2027', '2026-10-01', '2027-07-31');
insert into public.matieres (id, daara_id, nom, code, archivee) values
    ('00000000-0000-0000-0000-00000000c301', '00000000-0000-0000-0000-0000000c000a', 'Mathématiques', 'MATH', false),
    ('00000000-0000-0000-0000-00000000c302', '00000000-0000-0000-0000-0000000c000a', 'Dessin', 'DES', true),
    ('00000000-0000-0000-0000-00000000c303', '00000000-0000-0000-0000-0000000c000b', 'Coran', 'COR', false);

set local role authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Classes : écriture
-- ---------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-00000000c0a1');
select lives_ok($$ insert into public.classes (daara_id, annee_id, nom, niveau, titulaire_id) values
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c100', 'CE1 A', 'CE1', '00000000-0000-0000-0000-00000000c0e1') $$,
    'admin : crée une classe avec un titulaire enseignant');
select throws_ok($$ insert into public.classes (daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c100', 'X1', '00000000-0000-0000-0000-00000000c0c1') $$,
    '23514', 'enseignant_invalide', 'titulaire parent : refusé');
select throws_ok($$ insert into public.classes (daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c100', 'X2', '00000000-0000-0000-0000-00000000c0f1') $$,
    '23514', 'enseignant_invalide', 'titulaire enseignant d''une autre daara : refusé');
select throws_ok($$ insert into public.classes (daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c100', 'X3', '00000000-0000-0000-0000-00000000c0e2') $$,
    '23514', 'enseignant_invalide', 'titulaire désactivé : refusé');
select throws_ok($$ insert into public.classes (daara_id, annee_id, nom) values
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c200', 'X4') $$,
    '23514', 'autre_daara', 'classe rattachée à une année d''une autre daara : refusée');
select throws_ok($$ insert into public.classes (daara_id, annee_id, nom) values
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c100', 'ce1 a') $$,
    '23505', null, 'nom en double dans l''année (casse ignorée) : refusé');
select throws_ok($$ insert into public.classes (daara_id, annee_id, nom) values
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c100', 'CP' || chr(160)) $$,
    '23514', null, 'espace insécable final : refusé');
select throws_ok($$ update public.classes set annee_id = '00000000-0000-0000-0000-00000000c200' $$, '42501', null,
    'annee_id : non modifiable');

select tests.connecter('00000000-0000-0000-0000-00000000c0b1');
select throws_ok($$ insert into public.classes (daara_id, annee_id, nom) values
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c100', 'Intrus') $$,
    '42501', 'admin_aal2_requis', 'admin d''une autre daara : refusé avant tout contrôle (pas d''indice)');
select tests.connecter('00000000-0000-0000-0000-00000000c0e1');
select throws_ok($$ insert into public.classes (daara_id, annee_id, nom) values
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c100', 'X5') $$,
    '42501', 'admin_aal2_requis', 'enseignant : création refusée');

-- Lecture.
select is((select count(*)::int from public.classes), 1, 'enseignant : lit les classes de sa daara');
select tests.connecter('00000000-0000-0000-0000-00000000c0c1', 'aal1');
select is((select count(*)::int from public.classes), 0, 'parent : aucune classe lisible (sprint 4 : celles de ses enfants)');
select tests.connecter('00000000-0000-0000-0000-00000000c0b1');
select is((select count(*)::int from public.classes), 0, 'admin d''une autre daara : aucune classe lisible');

-- ---------------------------------------------------------------------------------------------------
-- Affectations
-- ---------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-00000000c0a1');
reset role;
create temporary table classe_ce1 as select id from public.classes where nom = 'CE1 A' and daara_id = '00000000-0000-0000-0000-0000000c000a';
grant select on classe_ce1 to authenticated;
set local role authenticated;
select lives_ok($$ insert into public.classe_matieres (daara_id, classe_id, matiere_id, coefficient, enseignant_id)
    select '00000000-0000-0000-0000-0000000c000a', id, '00000000-0000-0000-0000-00000000c301', 2, '00000000-0000-0000-0000-00000000c0e1' from classe_ce1 $$,
    'admin : affecte une matière (coefficient, enseignant)');
select throws_ok($$ insert into public.classe_matieres (daara_id, classe_id, matiere_id)
    select '00000000-0000-0000-0000-0000000c000a', id, '00000000-0000-0000-0000-00000000c303' from classe_ce1 $$,
    '23514', 'autre_daara', 'matière d''une autre daara : refusée');
select throws_ok($$ insert into public.classe_matieres (daara_id, classe_id, matiere_id)
    select '00000000-0000-0000-0000-0000000c000a', id, '00000000-0000-0000-0000-00000000c302' from classe_ce1 $$,
    '23514', 'matiere_archivee', 'matière archivée : refusée');
select throws_ok($$ update public.classe_matieres set coefficient = 25 $$, '23514', null, 'coefficient hors bornes : refusé');
select throws_ok($$ insert into public.classe_matieres (daara_id, classe_id, matiere_id)
    select '00000000-0000-0000-0000-0000000c000a', id, '00000000-0000-0000-0000-00000000c301' from classe_ce1 $$,
    '23505', null, 'matière déjà dans la classe : refusée');
select throws_ok($$ update public.classe_matieres set enseignant_id = '00000000-0000-0000-0000-00000000c0c1' $$,
    '23514', 'enseignant_invalide', 'enseignant parent : refusé');
select throws_ok($$ delete from public.matieres where id = '00000000-0000-0000-0000-00000000c301' $$, '23503', null,
    'matière utilisée : suppression refusée (archivage)');
select tests.connecter('00000000-0000-0000-0000-00000000c0e1');
select is((select count(*)::int from public.classe_matieres), 1, 'enseignant : lit les affectations');
select tests.connecter('00000000-0000-0000-0000-00000000c0c1', 'aal1');
select is((select count(*)::int from public.classe_matieres), 0, 'parent : aucune affectation lisible');

-- ---------------------------------------------------------------------------------------------------
-- teaches_class et enseignants_daara
-- ---------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-00000000c0e1');
select ok((select public.teaches_class(id) from classe_ce1), 'teaches_class : titulaire et affecté → vrai');
select tests.connecter('00000000-0000-0000-0000-00000000c0f1');
select ok(not (select public.teaches_class(id) from classe_ce1), 'teaches_class : enseignant d''une autre daara → faux');
select tests.connecter('00000000-0000-0000-0000-00000000c0a1');
select ok(not (select public.teaches_class(id) from classe_ce1), 'teaches_class : admin non enseignant → faux');
select tests.connecter('00000000-0000-0000-0000-00000000c0e1');
select results_eq(
    $$ select nom, actif from public.enseignants_daara('00000000-0000-0000-0000-0000000c000a') order by nom $$,
    $$ values ('Diop'::text, true), ('Fall'::text, true) $$,
    'enseignants_daara (enseignant) : collègue désactivé non référencé absent');
select tests.connecter('00000000-0000-0000-0000-00000000c0c1', 'aal1');
select throws_ok($$ select * from public.enseignants_daara('00000000-0000-0000-0000-0000000c000a') $$, '42501', null,
    'enseignants_daara : parent refusé');
select tests.connecter('00000000-0000-0000-0000-00000000c0b1');
select throws_ok($$ select * from public.enseignants_daara('00000000-0000-0000-0000-0000000c000a') $$, '42501', null,
    'enseignants_daara : autre daara refusée');

-- ---------------------------------------------------------------------------------------------------
-- Module désactivé : tout refusé, admin compris ; teaches_class faux.
-- ---------------------------------------------------------------------------------------------------
reset role;
update public.daara_modules set actif = false where daara_id = '00000000-0000-0000-0000-0000000c000a' and module = 'structure';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-00000000c0a1');
select is((select count(*)::int from public.classes) + (select count(*)::int from public.classe_matieres), 0,
    'module désactivé : rien de lisible, admin compris');
select throws_ok($$ insert into public.classes (daara_id, annee_id, nom) values
    ('00000000-0000-0000-0000-0000000c000a', '00000000-0000-0000-0000-00000000c100', 'X6') $$, '42501', null, 'module désactivé : création refusée');
select tests.connecter('00000000-0000-0000-0000-00000000c0e1');
select ok(not (select public.teaches_class(id) from classe_ce1), 'module désactivé : teaches_class faux');
reset role;
update public.daara_modules set actif = true where daara_id = '00000000-0000-0000-0000-0000000c000a' and module = 'structure';
set local role authenticated;

-- Suppression d'une classe : ses affectations suivent ; journal avec auteur.
select tests.connecter('00000000-0000-0000-0000-00000000c0a1');
select lives_ok($$ delete from public.classes where nom = 'CE1 A' and daara_id = '00000000-0000-0000-0000-0000000c000a' $$, 'admin : supprime la classe');
reset role;
select is((select count(*)::int from public.classe_matieres where daara_id = '00000000-0000-0000-0000-0000000c000a'), 0,
    'classe supprimée : ses affectations aussi');
select ok((select count(*) >= 2 and bool_and(user_id = '00000000-0000-0000-0000-00000000c0a1') from public.audit_log
    where table_name in ('classes', 'classe_matieres') and daara_id = '00000000-0000-0000-0000-0000000c000a'),
    'journal des classes et affectations avec l''auteur');

select * from finish();
rollback;
