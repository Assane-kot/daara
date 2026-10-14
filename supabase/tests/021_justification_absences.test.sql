-- S5.2 : justification (parent), décision (admin, titulaire), statistiques. Jeu : daara P (admin A, enseignant E
-- titulaire de C1, enseignant E2 qui enseigne une matière en C1 sans être titulaire, parent Pa d'Awa, parent Pb de
-- Bineta) ; Awa et Bineta en C1, absentes il y a 10 jours (hors de la fenêtre de saisie de l'enseignant) ; daara R.
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
create function tests.absence(p_prenom text)
returns uuid language sql security definer set search_path = '' as $$
    select a.id from public.absences a join public.apprenants ap on ap.id = a.apprenant_id
    where ap.prenom = p_prenom and a.daara_id = '00000000-0000-0000-0000-00000000210a';
$$;
grant execute on function tests.absence(text) to authenticated;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000021a1', 'admin.p21@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000021e1', 'ens.p21@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000021e2', 'ens2.p21@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000021c1', 'pa.p21@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000021c2', 'pb.p21@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000021b1', 'admin.r21@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000210a', 'Daara P21', 'test-daara-p21', '00000000-0000-0000-0000-0000000021a1'),
    ('00000000-0000-0000-0000-00000000210b', 'Daara R21', 'test-daara-r21', '00000000-0000-0000-0000-0000000021b1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-00000000210a', 'structure', true), ('00000000-0000-0000-0000-00000000210a', 'absences', true),
    ('00000000-0000-0000-0000-00000000210b', 'structure', true), ('00000000-0000-0000-0000-00000000210b', 'absences', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000210a', '00000000-0000-0000-0000-0000000021a1', 'admin'),
    ('00000000-0000-0000-0000-00000000210a', '00000000-0000-0000-0000-0000000021e1', 'enseignant'),
    ('00000000-0000-0000-0000-00000000210a', '00000000-0000-0000-0000-0000000021e2', 'enseignant'),
    ('00000000-0000-0000-0000-00000000210a', '00000000-0000-0000-0000-0000000021c1', 'parent'),
    ('00000000-0000-0000-0000-00000000210a', '00000000-0000-0000-0000-0000000021c2', 'parent'),
    ('00000000-0000-0000-0000-00000000210b', '00000000-0000-0000-0000-0000000021b1', 'admin');
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin, active) values
    ('00000000-0000-0000-0000-000000002110', '00000000-0000-0000-0000-00000000210a', 'Année P', current_date - 60, current_date + 200, true);
insert into public.classes (id, daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000021d1', '00000000-0000-0000-0000-00000000210a', '00000000-0000-0000-0000-000000002110', 'C1', '00000000-0000-0000-0000-0000000021e1');
insert into public.matieres (id, daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000021d9', '00000000-0000-0000-0000-00000000210a', 'Coran', 'COR');
insert into public.classe_matieres (daara_id, classe_id, matiere_id, coefficient, enseignant_id) values
    ('00000000-0000-0000-0000-00000000210a', '00000000-0000-0000-0000-0000000021d1', '00000000-0000-0000-0000-0000000021d9', 1, '00000000-0000-0000-0000-0000000021e2');
insert into public.apprenants (id, daara_id, nom, prenom, sexe) values
    ('00000000-0000-0000-0000-0000000021f1', '00000000-0000-0000-0000-00000000210a', 'Ndiaye', 'Awa', 'F'),
    ('00000000-0000-0000-0000-0000000021f2', '00000000-0000-0000-0000-00000000210a', 'Sow', 'Bineta', 'F');
insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) select
    '00000000-0000-0000-0000-00000000210a', id, '00000000-0000-0000-0000-0000000021d1', '00000000-0000-0000-0000-000000002110'
    from public.apprenants where daara_id = '00000000-0000-0000-0000-00000000210a';
insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000210a', '00000000-0000-0000-0000-0000000021c1', '00000000-0000-0000-0000-0000000021f1', 'mere'),
    ('00000000-0000-0000-0000-00000000210a', '00000000-0000-0000-0000-0000000021c2', '00000000-0000-0000-0000-0000000021f2', 'pere');
insert into public.appels (id, daara_id, classe_id, annee_id, date_appel, termine_at) values
    ('00000000-0000-0000-0000-0000000021a9', '00000000-0000-0000-0000-00000000210a', '00000000-0000-0000-0000-0000000021d1',
     '00000000-0000-0000-0000-000000002110', current_date - 10, now());
insert into public.absences (daara_id, appel_id, apprenant_id, type) values
    ('00000000-0000-0000-0000-00000000210a', '00000000-0000-0000-0000-0000000021a9', '00000000-0000-0000-0000-0000000021f1', 'absence'),
    ('00000000-0000-0000-0000-00000000210a', '00000000-0000-0000-0000-0000000021a9', '00000000-0000-0000-0000-0000000021f2', 'retard');

set local role authenticated;

-- Parent.
select tests.connecter('00000000-0000-0000-0000-0000000021c1', 'aal1');
select lives_ok($$ select public.justifier_absence(tests.absence('Awa'), '  Malade, rendez-vous chez le médecin ') $$,
    'parent : motif envoyé pour son enfant (au-delà de 7 jours)');
select is((select motif || ' | ' || etat::text from public.absences where id = tests.absence('Awa')),
    'Malade, rendez-vous chez le médecin | envoyee', 'motif nettoyé, état « envoyée »');
select throws_ok($$ select public.justifier_absence(tests.absence('Bineta'), 'Malade') $$, '42501', 'droits',
    'parent : pas pour l''enfant d''un autre');
select throws_ok($$ select public.justifier_absence(tests.absence('Awa'), '   ') $$, '23514', 'motif_invalide', 'motif vide : refusé');
select throws_ok($$ select public.justifier_absence(tests.absence('Awa'), repeat('x', 301)) $$, '23514', 'motif_invalide', 'motif de plus de 300 caractères : refusé');
select throws_ok($$ select public.decider_justification(tests.absence('Awa'), true) $$, '42501', 'droits', 'parent : ne décide pas');
select throws_ok($$ update public.absences set etat = 'justifiee' where id = tests.absence('Awa') $$, '42501', null,
    'parent : écriture directe refusée');

-- Enseignant non titulaire, titulaire, admin.
select tests.connecter('00000000-0000-0000-0000-0000000021e2');
select throws_ok($$ select public.decider_justification(tests.absence('Awa'), true) $$, '42501', 'droits',
    'enseignant non titulaire : ne décide pas');
select tests.connecter('00000000-0000-0000-0000-0000000021e1');
select lives_ok($$ select public.decider_justification(tests.absence('Awa'), true) $$, 'titulaire : justifiée (absence de plus de 7 jours)');
select is((select etat::text || ' ' || (decide_par = '00000000-0000-0000-0000-0000000021e1')::text from public.absences where id = tests.absence('Awa')),
    'justifiee true', 'décision enregistrée avec son auteur');
select throws_ok($$ update public.absences set etat = 'non_justifiee' where id = tests.absence('Awa') $$, '42501', null,
    'titulaire : écriture directe de l''état refusée');
select tests.connecter('00000000-0000-0000-0000-0000000021c1', 'aal1');
select throws_ok($$ select public.justifier_absence(tests.absence('Awa'), 'Autre motif') $$, '23514', 'deja_decidee',
    'parent : plus de modification après décision');
select tests.connecter('00000000-0000-0000-0000-0000000021a1');
select lives_ok($$ select public.decider_justification(tests.absence('Bineta'), false) $$, 'admin : non justifiée sans motif (mot sur papier)');
select lives_ok($$ select public.decider_justification(tests.absence('Bineta'), true) $$, 'admin : décision corrigée');
select tests.connecter('00000000-0000-0000-0000-0000000021a1', 'aal1');
select throws_ok($$ select public.decider_justification(tests.absence('Bineta'), false) $$, '42501', 'droits', 'admin sans second facteur : refusé');
select tests.connecter('00000000-0000-0000-0000-0000000021b1');
select throws_ok($$ select public.decider_justification(tests.absence('Bineta'), false) $$, '42501', 'droits', 'admin d''une autre daara : refusé');

-- Statistiques.
select tests.connecter('00000000-0000-0000-0000-0000000021a1');
select is(public.statistiques_absences('00000000-0000-0000-0000-00000000210a', current_date - 30, current_date) -> 'classes' -> 0,
    '{"classe_id": "00000000-0000-0000-0000-0000000021d1", "nom": "C1", "eleves": 2, "appels": 1, "absences": 1, "retards": 1, "non_justifiees": 0, "taux": 50.0}'::jsonb,
    'statistiques par classe : élèves, appels terminés, absences, retards, non justifiées, taux');
select is(jsonb_array_length(public.statistiques_absences('00000000-0000-0000-0000-00000000210a', current_date - 30, current_date) -> 'eleves'), 2,
    'élèves les plus absents');
select tests.connecter('00000000-0000-0000-0000-0000000021b1');
select is(public.statistiques_absences('00000000-0000-0000-0000-00000000210a', current_date - 30, current_date),
    '{"classes": [], "eleves": []}'::jsonb, 'autre daara : statistiques vides');
reset role;
select ok(not exists (select 1 from public.audit_log where table_name = 'absences' and (new_data::text like '%médecin%' or old_data::text like '%médecin%')),
    'journal sans le motif');

select * from finish();
rollback;
