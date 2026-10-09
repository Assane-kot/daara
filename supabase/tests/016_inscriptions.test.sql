-- S4.2 : inscriptions, enseigne_apprenant, lecture enseignant des élèves et des photos (LLD §3.4, §4, ADR-010).
-- Jeu : daara P (admin A, enseignant E de la classe C1, enseignant E2 sans classe) ; daara R (admin B).
-- Élèves de P : Awa (inscrite en C1), Bineta (inscrite en C2), Cheikh (parti).
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000010a1', 'admin.p16@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000010e1', 'ens.p16@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000010e2', 'ens2.p16@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000010b1', 'admin.r16@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000100a', 'Daara P16', 'test-daara-p16', '00000000-0000-0000-0000-0000000010a1'),
    ('00000000-0000-0000-0000-00000000100b', 'Daara R16', 'test-daara-r16', '00000000-0000-0000-0000-0000000010b1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-00000000100a', 'structure', true), ('00000000-0000-0000-0000-00000000100b', 'structure', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-0000000010a1', 'admin'),
    ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-0000000010e1', 'enseignant'),
    ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-0000000010e2', 'enseignant'),
    ('00000000-0000-0000-0000-00000000100b', '00000000-0000-0000-0000-0000000010b1', 'admin');
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-000000001100', '00000000-0000-0000-0000-00000000100a', '2026-2027', '2026-10-01', '2027-07-31'),
    ('00000000-0000-0000-0000-000000001200', '00000000-0000-0000-0000-00000000100a', '2027-2028', '2027-10-01', '2028-07-31'),
    ('00000000-0000-0000-0000-000000001300', '00000000-0000-0000-0000-00000000100b', '2026-2027', '2026-10-01', '2027-07-31');
insert into public.classes (id, daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000011c1', '00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-000000001100', 'C1', '00000000-0000-0000-0000-0000000010e1'),
    ('00000000-0000-0000-0000-0000000011c2', '00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-000000001100', 'C2', null),
    ('00000000-0000-0000-0000-0000000012c1', '00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-000000001200', 'C1 bis', null),
    ('00000000-0000-0000-0000-0000000013c1', '00000000-0000-0000-0000-00000000100b', '00000000-0000-0000-0000-000000001300', 'R1', null);
insert into public.apprenants (id, daara_id, nom, prenom, statut, photo_path) values
    ('00000000-0000-0000-0000-0000000014a1', '00000000-0000-0000-0000-00000000100a', 'Ndiaye', 'Awa', 'inscrit',
     '00000000-0000-0000-0000-00000000100a/apprenants/00000000-0000-0000-0000-0000000014a1.webp'),
    ('00000000-0000-0000-0000-0000000014a2', '00000000-0000-0000-0000-00000000100a', 'Sow', 'Bineta', 'inscrit', null),
    ('00000000-0000-0000-0000-0000000014a3', '00000000-0000-0000-0000-00000000100a', 'Fall', 'Cheikh', 'parti', null);
insert into storage.objects (bucket_id, name, owner_id) values
    ('photos', '00000000-0000-0000-0000-00000000100a/apprenants/00000000-0000-0000-0000-0000000014a1.webp', '00000000-0000-0000-0000-0000000010a1');

set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000010a1');

-- Écriture par l'admin.
select lives_ok($$ insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-0000000014a1', '00000000-0000-0000-0000-0000000011c1', '00000000-0000-0000-0000-000000001200') $$,
    'admin : inscrit Awa en C1');
select is((select annee_id from public.inscriptions where apprenant_id = '00000000-0000-0000-0000-0000000014a1'),
    '00000000-0000-0000-0000-000000001100'::uuid, 'année copiée de la classe (valeur envoyée ignorée)');
insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-0000000014a2', '00000000-0000-0000-0000-0000000011c2', '00000000-0000-0000-0000-000000001100');
select throws_ok($$ insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-0000000014a1', '00000000-0000-0000-0000-0000000011c2', '00000000-0000-0000-0000-000000001100') $$,
    '23505', null, 'deux classes la même année : refusé');
select lives_ok($$ insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-0000000014a1', '00000000-0000-0000-0000-0000000012c1', '00000000-0000-0000-0000-000000001200') $$,
    'une autre année : autorisé');
select throws_ok($$ insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-0000000014a3', '00000000-0000-0000-0000-0000000011c1', '00000000-0000-0000-0000-000000001100') $$,
    '23514', 'eleve_parti', 'élève parti : non inscriptible');
select throws_ok($$ insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-0000000014a3', '00000000-0000-0000-0000-0000000013c1', '00000000-0000-0000-0000-000000001300') $$,
    '23514', 'autre_daara', 'classe d''une autre daara : refusée');
select throws_ok($$ update public.inscriptions set classe_id = '00000000-0000-0000-0000-0000000012c1'
    where apprenant_id = '00000000-0000-0000-0000-0000000014a2' $$, '23514', 'autre_annee', 'changer pour une classe d''une autre année : refusé');
select lives_ok($$ update public.inscriptions set classe_id = '00000000-0000-0000-0000-0000000011c1'
    where apprenant_id = '00000000-0000-0000-0000-0000000014a2' $$, 'changer de classe dans l''année : autorisé');
update public.inscriptions set classe_id = '00000000-0000-0000-0000-0000000011c2' where apprenant_id = '00000000-0000-0000-0000-0000000014a2';
select throws_ok($$ delete from public.classes where id = '00000000-0000-0000-0000-0000000011c1' $$, '23503', null,
    'classe avec des inscrits : suppression refusée');
select throws_ok($$ update public.inscriptions set apprenant_id = '00000000-0000-0000-0000-0000000014a3' $$, '42501', null,
    'élève d''une inscription : non modifiable');

-- Enseignant : élèves de ses classes seulement.
select tests.connecter('00000000-0000-0000-0000-0000000010e1');
select results_eq($$ select prenom from public.apprenants order by prenom $$, $$ values ('Awa'::text) $$,
    'enseignant : lit Awa (sa classe), pas Bineta (autre classe) ni Cheikh');
select is((select count(*)::int from public.inscriptions), 1, 'enseignant : inscriptions de ses classes seulement');
select is((select count(*)::int from storage.objects where bucket_id = 'photos'), 1, 'enseignant : photo de son élève lisible');
select throws_ok($$ insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-0000000014a2', '00000000-0000-0000-0000-0000000012c1', '00000000-0000-0000-0000-000000001200') $$,
    '42501', null, 'enseignant : inscription refusée');
select tests.connecter('00000000-0000-0000-0000-0000000010e2');
select is((select count(*)::int from public.apprenants) + (select count(*)::int from storage.objects where bucket_id = 'photos'), 0,
    'enseignant sans classe : ni élève ni photo');

-- Autre daara.
select tests.connecter('00000000-0000-0000-0000-0000000010b1');
select is((select count(*)::int from public.inscriptions), 0, 'admin d''une autre daara : aucune inscription lisible');
select throws_ok($$ insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000100a', '00000000-0000-0000-0000-0000000014a2', '00000000-0000-0000-0000-0000000012c1', '00000000-0000-0000-0000-000000001200') $$,
    '42501', 'admin_aal2_requis', 'admin d''une autre daara : refusé avant tout contrôle');

-- Module structure désactivé : inscriptions et élèves de l'enseignant invisibles.
reset role;
update public.daara_modules set actif = false where daara_id = '00000000-0000-0000-0000-00000000100a';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000010e1');
select is((select count(*)::int from public.apprenants) + (select count(*)::int from public.inscriptions), 0,
    'module désactivé : l''enseignant ne lit plus rien');
select tests.connecter('00000000-0000-0000-0000-0000000010a1');
select is((select count(*)::int from public.inscriptions), 0, 'module désactivé : admin, inscriptions invisibles');
reset role;
select ok(not exists (select 1 from public.audit_log where table_name = 'inscriptions'
    and new_data::text like '%14a1%'), 'journal des inscriptions sans valeurs');

select * from finish();
rollback;
