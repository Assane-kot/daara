-- S6.2 : évaluations par classe, matière et période. Jeu : daara P (admin A ; enseignant E1 titulaire de C1 et enseignant
-- des maths de C1 ; enseignant E2 du français de C1 ; parent Pa d'une élève de C1) ; daara R (admin B).
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
create function tests.type_eval(p_nom text)
returns uuid language sql as $$
    select id from public.types_evaluation where daara_id = '00000000-0000-0000-0000-00000000260a' and nom = p_nom;
$$;
grant execute on function tests.type_eval(text) to authenticated;
create function tests.postgres()
returns void language sql as $$ select set_config('request.jwt.claims', '', true); $$;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000026a1', 'admin.p26@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000026e1', 'ens1.p26@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000026e2', 'ens2.p26@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000026c1', 'pa.p26@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000026b1', 'admin.r26@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000260a', 'Daara P26', 'test-daara-p26', '00000000-0000-0000-0000-0000000026a1'),
    ('00000000-0000-0000-0000-00000000260b', 'Daara R26', 'test-daara-r26', '00000000-0000-0000-0000-0000000026b1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-00000000260a', 'structure', true), ('00000000-0000-0000-0000-00000000260a', 'notes', true),
    ('00000000-0000-0000-0000-00000000260b', 'structure', true), ('00000000-0000-0000-0000-00000000260b', 'notes', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-0000000026a1', 'admin'),
    ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-0000000026e1', 'enseignant'),
    ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-0000000026e2', 'enseignant'),
    ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-0000000026c1', 'parent'),
    ('00000000-0000-0000-0000-00000000260b', '00000000-0000-0000-0000-0000000026b1', 'admin');
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin, active) values
    ('00000000-0000-0000-0000-000000002610', '00000000-0000-0000-0000-00000000260a', 'Année P', current_date - 60, current_date + 200, true),
    ('00000000-0000-0000-0000-000000002620', '00000000-0000-0000-0000-00000000260a', 'Ancienne', current_date - 500, current_date - 100, false);
insert into public.periodes (id, daara_id, annee_id, libelle, ordre, date_debut, date_fin, cloturee) values
    ('00000000-0000-0000-0000-000000002631', '00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002610', 'T1', 1, current_date - 60, current_date + 30, false),
    ('00000000-0000-0000-0000-000000002632', '00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002610', 'T2', 2, current_date + 31, current_date + 200, true),
    ('00000000-0000-0000-0000-000000002633', '00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002620', 'Ancien T1', 1, current_date - 500, current_date - 100, false);
insert into public.matieres (id, daara_id, nom, code) values
    ('00000000-0000-0000-0000-000000002641', '00000000-0000-0000-0000-00000000260a', 'Maths', 'MATH'),
    ('00000000-0000-0000-0000-000000002642', '00000000-0000-0000-0000-00000000260a', 'Français', 'FR');
insert into public.classes (id, daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000026d1', '00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002610', 'C1', '00000000-0000-0000-0000-0000000026e1'),
    ('00000000-0000-0000-0000-0000000026d3', '00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002620', 'C ancienne', null);
insert into public.classe_matieres (id, daara_id, classe_id, matiere_id, enseignant_id) values
    ('00000000-0000-0000-0000-000000002651', '00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-0000000026d1', '00000000-0000-0000-0000-000000002641', '00000000-0000-0000-0000-0000000026e1'),
    ('00000000-0000-0000-0000-000000002652', '00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-0000000026d1', '00000000-0000-0000-0000-000000002642', '00000000-0000-0000-0000-0000000026e2'),
    ('00000000-0000-0000-0000-000000002653', '00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-0000000026d3', '00000000-0000-0000-0000-000000002641', '00000000-0000-0000-0000-0000000026e1');
insert into public.apprenants (id, daara_id, nom, prenom, sexe) values
    ('00000000-0000-0000-0000-0000000026f1', '00000000-0000-0000-0000-00000000260a', 'Ndiaye', 'Awa', 'F');
insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-0000000026f1', '00000000-0000-0000-0000-0000000026d1', '00000000-0000-0000-0000-000000002610');
insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-0000000026c1', '00000000-0000-0000-0000-0000000026f1', 'mere');
insert into public.types_evaluation (daara_id, nom, coefficient, archive) values
    ('00000000-0000-0000-0000-00000000260a', 'Ancien type', 1, true);

set local role authenticated;

-- Admin : barème et coefficient pris par défaut, classe copiée.
select tests.connecter('00000000-0000-0000-0000-0000000026a1');
select lives_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle) values
    ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002652', '00000000-0000-0000-0000-0000000026d3',
     '00000000-0000-0000-0000-000000002631', tests.type_eval('Composition'), 'Composition 1') $$, 'admin : évaluation de français');
select is((select bareme::text || ' ' || coefficient::text || ' ' || (classe_id = '00000000-0000-0000-0000-0000000026d1')::text
    from public.evaluations where libelle = 'Composition 1' and daara_id = '00000000-0000-0000-0000-00000000260a'),
    '20.00 2.00 true', 'barème de la daara, coefficient du type, classe copiée de la matière');

-- Enseignant E1 : ses maths ; le français seulement si le titulaire saisit.
select tests.connecter('00000000-0000-0000-0000-0000000026e1');
select lives_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, bareme, coefficient)
    values ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002651', '00000000-0000-0000-0000-0000000026d1',
     '00000000-0000-0000-0000-000000002631', tests.type_eval('Devoir'), 'Devoir 1', 10, 1) $$, 'enseignant : évaluation de sa matière');
select throws_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, bareme, coefficient)
    values ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002652', '00000000-0000-0000-0000-0000000026d1',
     '00000000-0000-0000-0000-000000002631', tests.type_eval('Devoir'), 'Dictée', 20, 1) $$, '42501', null,
    'titulaire : matière d''un collègue refusée par défaut');
reset role;
select tests.postgres();
update public.reglages_notes set titulaire_saisit = true where daara_id = '00000000-0000-0000-0000-00000000260a';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000026e1');
select lives_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, bareme, coefficient)
    values ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002652', '00000000-0000-0000-0000-0000000026d1',
     '00000000-0000-0000-0000-000000002631', tests.type_eval('Devoir'), 'Dictée', 20, 1) $$,
    'titulaire : toutes les matières de sa classe si le réglage l''autorise');
select throws_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, date_eval, bareme, coefficient)
    values ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002651', '00000000-0000-0000-0000-0000000026d1',
     '00000000-0000-0000-0000-000000002632', tests.type_eval('Devoir'), 'Devoir T2', current_date + 40, 20, 1) $$, '23514', 'periode_cloturee',
    'période clôturée : refusée');
select throws_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, date_eval, bareme, coefficient)
    values ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002651', '00000000-0000-0000-0000-0000000026d1',
     '00000000-0000-0000-0000-000000002631', tests.type_eval('Devoir'), 'Devoir 2', current_date + 40, 20, 1) $$, '23514', 'date_hors_periode',
    'date hors de la période : refusée');
select throws_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, bareme, coefficient)
    values ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002651', '00000000-0000-0000-0000-0000000026d1',
     '00000000-0000-0000-0000-000000002633', tests.type_eval('Devoir'), 'Devoir 2', 20, 1) $$, '23514', 'periode_invalide',
    'période d''une autre année : refusée');
select throws_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, bareme, coefficient)
    values ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002651', '00000000-0000-0000-0000-0000000026d1',
     '00000000-0000-0000-0000-000000002631', tests.type_eval('Ancien type'), 'Devoir 2', 20, 1) $$, '23514', 'type_archive',
    'type archivé : refusé');
select throws_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, bareme, coefficient)
    values ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002653', '00000000-0000-0000-0000-0000000026d3',
     '00000000-0000-0000-0000-000000002633', tests.type_eval('Devoir'), 'Devoir 2', 20, 1) $$, '42501', null,
    'classe d''une année inactive : refusée');
select throws_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, bareme, coefficient)
    values ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002651', '00000000-0000-0000-0000-0000000026d1',
     '00000000-0000-0000-0000-000000002631', tests.type_eval('Devoir'), 'Devoir 2', 20.3, 1) $$, '23514', null,
    'barème hors quart de point : refusé');
select throws_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, bareme, coefficient)
    values ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002651', '00000000-0000-0000-0000-0000000026d1',
     '00000000-0000-0000-0000-000000002631', tests.type_eval('Devoir'), 'Devoir 2 ', 20, 1) $$, '23514', null,
    'intitulé avec espace autour : refusé');
select lives_ok($$ update public.evaluations set coefficient = 1.5, libelle = 'Devoir n°1'
    where libelle = 'Devoir 1' and daara_id = '00000000-0000-0000-0000-00000000260a' $$, 'enseignant : modifie son évaluation');
select throws_ok($$ update public.evaluations set publiee_at = now() where daara_id = '00000000-0000-0000-0000-00000000260a' $$,
    '42501', null, 'publication directe refusée (S6.5 : publier_evaluation)');

-- Enseignant E2 : lit les évaluations de la classe, n'écrit pas les maths.
select tests.connecter('00000000-0000-0000-0000-0000000026e2');
select is((select count(*)::int from public.evaluations), 3, 'enseignant de la classe : lit ses évaluations (année active)');
select throws_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, bareme, coefficient)
    values ('00000000-0000-0000-0000-00000000260a', '00000000-0000-0000-0000-000000002651', '00000000-0000-0000-0000-0000000026d1',
     '00000000-0000-0000-0000-000000002631', tests.type_eval('Devoir'), 'Devoir 2', 20, 1) $$, '42501', null,
    'enseignant : matière d''un collègue refusée');
update public.evaluations set libelle = 'Piraté' where libelle = 'Devoir n°1' and daara_id = '00000000-0000-0000-0000-00000000260a';
reset role;
select tests.postgres();
select is((select count(*)::int from public.evaluations where libelle = 'Piraté'), 0, 'enseignant : évaluation d''un collègue non modifiable');

-- Parent : évaluations publiées seulement, ou toutes si « dès la saisie ».
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000026c1', 'aal1');
select is((select count(*)::int from public.evaluations), 0, 'parent : rien avant publication');
reset role;
select tests.postgres();
update public.evaluations set publiee_at = now() where libelle = 'Dictée' and daara_id = '00000000-0000-0000-0000-00000000260a';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000026c1', 'aal1');
select is((select count(*)::int from public.evaluations), 1, 'parent : évaluation publiée de la classe de son enfant');
reset role;
select tests.postgres();
update public.reglages_notes set visibilite = 'saisie' where daara_id = '00000000-0000-0000-0000-00000000260a';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000026c1', 'aal1');
select is((select count(*)::int from public.evaluations), 3, 'parent : toutes si le réglage est « dès la saisie »');

-- Autre daara.
select tests.connecter('00000000-0000-0000-0000-0000000026b1');
select is((select count(*)::int from public.evaluations where daara_id = '00000000-0000-0000-0000-00000000260a'), 0,
    'admin d''une autre daara : rien de lisible');
select throws_ok($$ insert into public.evaluations (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, bareme, coefficient)
    values ('00000000-0000-0000-0000-00000000260b', '00000000-0000-0000-0000-000000002651', '00000000-0000-0000-0000-0000000026d1',
     '00000000-0000-0000-0000-000000002631', tests.type_eval('Devoir'), 'Intrus', 20, 1) $$, '42501', null,
    'admin d''une autre daara : écriture refusée');

-- Suppression, matière utilisée, période clôturée.
select tests.connecter('00000000-0000-0000-0000-0000000026a1');
select lives_ok($$ delete from public.evaluations where libelle = 'Composition 1' and daara_id = '00000000-0000-0000-0000-00000000260a' $$,
    'admin : supprime une évaluation');
select throws_ok($$ delete from public.classe_matieres where id = '00000000-0000-0000-0000-000000002651' $$, '23503', null,
    'matière de classe avec évaluations : non supprimable');
reset role;
select tests.postgres();
update public.periodes set cloturee = true where id = '00000000-0000-0000-0000-000000002631';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000026e1');
select throws_ok($$ update public.evaluations set libelle = 'Devoir A' where libelle = 'Devoir n°1' $$, '23514', 'periode_cloturee',
    'période clôturée : modification refusée');
select throws_ok($$ delete from public.evaluations where libelle = 'Devoir n°1' $$, '23514', 'periode_cloturee',
    'période clôturée : suppression refusée');

-- Module désactivé.
reset role;
select tests.postgres();
update public.daara_modules set actif = false where daara_id = '00000000-0000-0000-0000-00000000260a' and module = 'notes';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000026a1');
select is((select count(*)::int from public.evaluations), 0, 'module notes désactivé : rien de lisible, même pour l''admin');

-- Suppression de la daara : les évaluations partent avec elle.
reset role;
select tests.postgres();
select lives_ok($$ delete from public.daaras where id = '00000000-0000-0000-0000-00000000260a' $$, 'daara supprimée avec ses évaluations');

select * from finish();
rollback;
