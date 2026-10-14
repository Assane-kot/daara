-- S5.1 : appels et absences (module absences). Jeu : daara P (admin A, enseignant E titulaire de C1, enseignant E2 sans
-- classe, parent Pa d'Awa) ; élèves Awa (C1), Bineta (C2), Cheikh (C1, parti) ; daara R (admin B). Dates relatives au
-- jour du test.
begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;
create function tests.postgres()
returns void language sql as $$ select set_config('request.jwt.claims', '', true); $$;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000020a1', 'admin.p20@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000020e1', 'ens.p20@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000020e2', 'ens2.p20@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000020c1', 'parent.p20@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000020b1', 'admin.r20@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000200a', 'Daara P20', 'test-daara-p20', '00000000-0000-0000-0000-0000000020a1'),
    ('00000000-0000-0000-0000-00000000200b', 'Daara R20', 'test-daara-r20', '00000000-0000-0000-0000-0000000020b1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-00000000200a', 'structure', true), ('00000000-0000-0000-0000-00000000200a', 'absences', true),
    ('00000000-0000-0000-0000-00000000200b', 'structure', true), ('00000000-0000-0000-0000-00000000200b', 'absences', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020a1', 'admin'),
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020e1', 'enseignant'),
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020e2', 'enseignant'),
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020c1', 'parent'),
    ('00000000-0000-0000-0000-00000000200b', '00000000-0000-0000-0000-0000000020b1', 'admin');
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin, active) values
    ('00000000-0000-0000-0000-000000002010', '00000000-0000-0000-0000-00000000200a', 'Année P', current_date - 60, current_date + 200, true),
    ('00000000-0000-0000-0000-000000002020', '00000000-0000-0000-0000-00000000200a', 'Ancienne', current_date - 500, current_date - 100, false);
insert into public.classes (id, daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000020d1', '00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-000000002010', 'C1', '00000000-0000-0000-0000-0000000020e1'),
    ('00000000-0000-0000-0000-0000000020d2', '00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-000000002010', 'C2', null),
    ('00000000-0000-0000-0000-0000000020d3', '00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-000000002020', 'C ancienne', null);
insert into public.apprenants (id, daara_id, nom, prenom, sexe, statut) values
    ('00000000-0000-0000-0000-0000000020f1', '00000000-0000-0000-0000-00000000200a', 'Ndiaye', 'Awa', 'F', 'inscrit'),
    ('00000000-0000-0000-0000-0000000020f2', '00000000-0000-0000-0000-00000000200a', 'Sow', 'Bineta', 'F', 'inscrit'),
    ('00000000-0000-0000-0000-0000000020f3', '00000000-0000-0000-0000-00000000200a', 'Fall', 'Cheikh', 'M', 'inscrit');
insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020f1', '00000000-0000-0000-0000-0000000020d1', '00000000-0000-0000-0000-000000002010'),
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020f2', '00000000-0000-0000-0000-0000000020d2', '00000000-0000-0000-0000-000000002010'),
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020f3', '00000000-0000-0000-0000-0000000020d1', '00000000-0000-0000-0000-000000002010');
update public.apprenants set statut = 'parti' where id = '00000000-0000-0000-0000-0000000020f3';
insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020c1', '00000000-0000-0000-0000-0000000020f1', 'mere');

set local role authenticated;

-- Admin.
select tests.connecter('00000000-0000-0000-0000-0000000020a1');
select lives_ok($$ insert into public.appels (daara_id, classe_id, date_appel) values
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020d2', current_date) $$,
    'admin : appel du jour de C2');
select throws_ok($$ insert into public.appels (daara_id, classe_id, date_appel, creneau) values
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020d1', current_date, 'matin') $$,
    '23514', 'creneau_invalide', 'appel du matin alors que la daara fait un appel par jour : refusé');
select lives_ok($$ insert into public.appels (daara_id, classe_id, date_appel) values
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020d1', current_date - 8) $$,
    'admin : appel d''il y a 8 jours (toute l''année active)');
select throws_ok($$ insert into public.appels (daara_id, classe_id, date_appel) values
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020d1', current_date + 1) $$,
    '23514', 'date_hors_annee', 'appel dans le futur : refusé');
select throws_ok($$ insert into public.appels (daara_id, classe_id, date_appel) values
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020d3', current_date - 200) $$,
    '23514', 'annee_inactive', 'classe d''une année inactive : refusée');

-- Enseignant titulaire de C1.
select tests.connecter('00000000-0000-0000-0000-0000000020e1');
select lives_ok($$ insert into public.appels (daara_id, classe_id, date_appel) values
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020d1', current_date - 1) $$,
    'enseignant : appel d''hier de sa classe');
select lives_ok($$ insert into public.absences (daara_id, appel_id, apprenant_id) values
    ('00000000-0000-0000-0000-00000000200a', (select id from public.appels where classe_id = '00000000-0000-0000-0000-0000000020d1' and date_appel = current_date - 1), '00000000-0000-0000-0000-0000000020f1') $$,
    'enseignant : Awa absente');
select is((select classe_id::text || ' ' || (date_absence = current_date - 1)::text || ' ' || creneau::text from public.absences
    where id = (select id from public.absences where apprenant_id = '00000000-0000-0000-0000-0000000020f1')), '00000000-0000-0000-0000-0000000020d1 true journee', 'classe, date et créneau copiés de l''appel');
select lives_ok($$ update public.absences set type = 'retard' where id = (select id from public.absences where apprenant_id = '00000000-0000-0000-0000-0000000020f1') $$, 'enseignant : absent → en retard');
select throws_ok($$ insert into public.absences (daara_id, appel_id, apprenant_id) values
    ('00000000-0000-0000-0000-00000000200a', (select id from public.appels where classe_id = '00000000-0000-0000-0000-0000000020d1' and date_appel = current_date - 1), '00000000-0000-0000-0000-0000000020f2') $$,
    '23514', 'eleve_hors_classe', 'élève d''une autre classe : refusé');
select throws_ok($$ insert into public.absences (daara_id, appel_id, apprenant_id) values
    ('00000000-0000-0000-0000-00000000200a', (select id from public.appels where classe_id = '00000000-0000-0000-0000-0000000020d1' and date_appel = current_date - 1), '00000000-0000-0000-0000-0000000020f3') $$,
    '23514', 'eleve_hors_classe', 'élève parti : refusé');
select throws_ok($$ insert into public.appels (daara_id, classe_id, date_appel) values
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020d1', current_date - 9) $$,
    '23514', 'appel_trop_ancien', 'enseignant : plus de 7 jours en arrière, refusé');
select throws_ok($$ insert into public.appels (daara_id, classe_id, date_appel) values
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020d2', current_date) $$,
    '42501', null, 'enseignant : classe qu''il n''enseigne pas, refusé');
select is((select count(*)::int from public.appels), 2, 'enseignant : appels de sa classe seulement (pas C2)');
select throws_ok($$ update public.absences set motif = 'malade' where id = (select id from public.absences where apprenant_id = '00000000-0000-0000-0000-0000000020f1') $$,
    '42501', null, 'enseignant : motif hors de ses droits (justification par RPC)');
select throws_ok($$ update public.appels set termine_at = now() where id = (select id from public.appels where classe_id = '00000000-0000-0000-0000-0000000020d1' and date_appel = current_date - 1) $$,
    '42501', null, 'fin de l''appel seulement par la RPC');
select lives_ok($$ select public.terminer_appel((select id from public.appels where classe_id = '00000000-0000-0000-0000-0000000020d1' and date_appel = current_date - 1)) $$, 'enseignant : termine l''appel');
select is((select termine_par from public.appels where id = (select id from public.appels where classe_id = '00000000-0000-0000-0000-0000000020d1' and date_appel = current_date - 1)),
    '00000000-0000-0000-0000-0000000020e1'::uuid, 'appel terminé par l''enseignant');
delete from public.appels where id = (select id from public.appels where classe_id = '00000000-0000-0000-0000-0000000020d1' and date_appel = current_date - 1);
select is((select count(*)::int from public.appels where id = (select id from public.appels where classe_id = '00000000-0000-0000-0000-0000000020d1' and date_appel = current_date - 1)), 1, 'appel terminé : non supprimable');

-- Enseignant sans classe, parent, autre daara.
select tests.connecter('00000000-0000-0000-0000-0000000020e2');
select is((select count(*)::int from public.appels) + (select count(*)::int from public.absences), 0, 'enseignant sans classe : rien');
select tests.connecter('00000000-0000-0000-0000-0000000020c1', 'aal1');
select is((select count(*)::int from public.absences where apprenant_id = '00000000-0000-0000-0000-0000000020f1'), 1, 'parent : absence de son enfant');
select is((select count(*)::int from public.appels), 2, 'parent : appels de la classe de son enfant (« présent aujourd''hui »)');
select throws_ok($$ insert into public.absences (daara_id, appel_id, apprenant_id) values
    ('00000000-0000-0000-0000-00000000200a', (select id from public.appels where classe_id = '00000000-0000-0000-0000-0000000020d2' and date_appel = current_date), '00000000-0000-0000-0000-0000000020f2') $$,
    '42501', null, 'parent : saisie d''absence refusée');
select tests.connecter('00000000-0000-0000-0000-0000000020b1');
select is((select count(*)::int from public.appels) + (select count(*)::int from public.absences), 0, 'admin d''une autre daara : rien');
select throws_ok($$ select public.terminer_appel((select id from public.appels where classe_id = '00000000-0000-0000-0000-0000000020d2' and date_appel = current_date)) $$, '42501', null,
    'admin d''une autre daara : fin d''appel refusée');

-- Demi-journées, module désactivé, journal.
reset role;
select tests.postgres();
update public.daaras set appel_demi_journee = true where id = '00000000-0000-0000-0000-00000000200a';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000020a1');
select lives_ok($$ insert into public.appels (daara_id, classe_id, date_appel, creneau) values
    ('00000000-0000-0000-0000-00000000200a', '00000000-0000-0000-0000-0000000020d1', current_date, 'matin') $$,
    'matin et après-midi : appel du matin');
reset role;
update public.daara_modules set actif = false where daara_id = '00000000-0000-0000-0000-00000000200a' and module = 'absences';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000020a1');
select is((select count(*)::int from public.appels) + (select count(*)::int from public.absences), 0, 'module désactivé : rien de lisible, même pour l''admin');
reset role;
select ok(not exists (select 1 from public.audit_log where table_name = 'absences' and new_data::text like '%20f1%'),
    'journal des absences sans valeurs');

select * from finish();
rollback;
