-- S6.3 : saisie des notes. Jeu : daara P (admin A ; enseignant E1 des maths de C1 ; enseignant E2 du français de C1 ;
-- parent Pa d'Awa) ; élèves Awa et Bineta en C1, Cheikh en C2 ; évaluations : maths (sur 10, T1 ouvert), français (T1),
-- maths du T2 (clôturé) ; daara R (admin B).
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

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
    ('00000000-0000-0000-0000-0000000027a1', 'admin.p27@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000027e1', 'ens1.p27@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000027e2', 'ens2.p27@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000027c1', 'pa.p27@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000027b1', 'admin.r27@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000270a', 'Daara P27', 'test-daara-p27', '00000000-0000-0000-0000-0000000027a1'),
    ('00000000-0000-0000-0000-00000000270b', 'Daara R27', 'test-daara-r27', '00000000-0000-0000-0000-0000000027b1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-00000000270a', 'structure', true), ('00000000-0000-0000-0000-00000000270a', 'notes', true),
    ('00000000-0000-0000-0000-00000000270b', 'structure', true), ('00000000-0000-0000-0000-00000000270b', 'notes', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-0000000027a1', 'admin'),
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-0000000027e1', 'enseignant'),
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-0000000027e2', 'enseignant'),
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-0000000027c1', 'parent'),
    ('00000000-0000-0000-0000-00000000270b', '00000000-0000-0000-0000-0000000027b1', 'admin');
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin, active) values
    ('00000000-0000-0000-0000-000000002710', '00000000-0000-0000-0000-00000000270a', 'Année P', current_date - 60, current_date + 200, true);
insert into public.periodes (id, daara_id, annee_id, libelle, ordre, date_debut, date_fin) values
    ('00000000-0000-0000-0000-000000002731', '00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002710', 'T1', 1, current_date - 60, current_date + 30),
    ('00000000-0000-0000-0000-000000002732', '00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002710', 'T2', 2, current_date + 31, current_date + 200);
insert into public.matieres (id, daara_id, nom, code) values
    ('00000000-0000-0000-0000-000000002741', '00000000-0000-0000-0000-00000000270a', 'Maths', 'MATH'),
    ('00000000-0000-0000-0000-000000002742', '00000000-0000-0000-0000-00000000270a', 'Français', 'FR');
insert into public.classes (id, daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002710', 'C1', '00000000-0000-0000-0000-0000000027e1'),
    ('00000000-0000-0000-0000-0000000027d2', '00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002710', 'C2', null);
insert into public.classe_matieres (id, daara_id, classe_id, matiere_id, enseignant_id) values
    ('00000000-0000-0000-0000-000000002751', '00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002741', '00000000-0000-0000-0000-0000000027e1'),
    ('00000000-0000-0000-0000-000000002752', '00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002742', '00000000-0000-0000-0000-0000000027e2');
insert into public.apprenants (id, daara_id, nom, prenom, sexe) values
    ('00000000-0000-0000-0000-0000000027f1', '00000000-0000-0000-0000-00000000270a', 'Ndiaye', 'Awa', 'F'),
    ('00000000-0000-0000-0000-0000000027f2', '00000000-0000-0000-0000-00000000270a', 'Sow', 'Bineta', 'F'),
    ('00000000-0000-0000-0000-0000000027f3', '00000000-0000-0000-0000-00000000270a', 'Fall', 'Cheikh', 'M');
insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-0000000027f1', '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002710'),
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-0000000027f2', '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002710'),
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-0000000027f3', '00000000-0000-0000-0000-0000000027d2', '00000000-0000-0000-0000-000000002710');
insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-0000000027c1', '00000000-0000-0000-0000-0000000027f1', 'mere');
insert into public.evaluations (id, daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, date_eval, bareme, coefficient)
select v.id::uuid, '00000000-0000-0000-0000-00000000270a', v.cm::uuid, '00000000-0000-0000-0000-0000000027d1', v.periode::uuid,
    (select id from public.types_evaluation where daara_id = '00000000-0000-0000-0000-00000000270a' and nom = 'Devoir'), v.libelle, v.jour, v.bareme, 1
from (values
    ('00000000-0000-0000-0000-000000002761', '00000000-0000-0000-0000-000000002751', '00000000-0000-0000-0000-000000002731', 'Maths 1', current_date, 10),
    ('00000000-0000-0000-0000-000000002762', '00000000-0000-0000-0000-000000002752', '00000000-0000-0000-0000-000000002731', 'Dictée', current_date, 20),
    ('00000000-0000-0000-0000-000000002763', '00000000-0000-0000-0000-000000002751', '00000000-0000-0000-0000-000000002732', 'Maths T2', current_date + 40, 20)
) as v (id, cm, periode, libelle, jour, bareme);
update public.periodes set cloturee = true where id = '00000000-0000-0000-0000-000000002732';

set local role authenticated;

-- Enseignant E1 : notes de sa matière.
select tests.connecter('00000000-0000-0000-0000-0000000027e1');
select lives_ok($$ insert into public.notes (daara_id, evaluation_id, apprenant_id, classe_id, classe_matiere_id, valeur) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002761', '00000000-0000-0000-0000-0000000027f1',
     '00000000-0000-0000-0000-0000000027d2', '00000000-0000-0000-0000-000000002751', 8.5) $$, 'enseignant : note de sa matière');
select is((select classe_id::text from public.notes where apprenant_id = '00000000-0000-0000-0000-0000000027f1'),
    '00000000-0000-0000-0000-0000000027d1', 'classe copiée de l''évaluation');
select throws_ok($$ insert into public.notes (daara_id, evaluation_id, apprenant_id, classe_id, classe_matiere_id, valeur) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002761', '00000000-0000-0000-0000-0000000027f2',
     '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002751', 10.5) $$, '23514', 'note_hors_bareme',
    'note au-dessus du barème (10) : refusée');
select throws_ok($$ insert into public.notes (daara_id, evaluation_id, apprenant_id, classe_id, classe_matiere_id, valeur) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002761', '00000000-0000-0000-0000-0000000027f2',
     '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002751', 7.3) $$, '23514', null,
    'note hors quart de point : refusée');
select throws_ok($$ insert into public.notes (daara_id, evaluation_id, apprenant_id, classe_id, classe_matiere_id, valeur, absent) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002761', '00000000-0000-0000-0000-0000000027f2',
     '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002751', 7, true) $$, '23514', null,
    'note et absent à la fois : refusé');
select lives_ok($$ insert into public.notes (daara_id, evaluation_id, apprenant_id, classe_id, classe_matiere_id, absent) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002761', '00000000-0000-0000-0000-0000000027f2',
     '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002751', true) $$, 'élève absent');
select throws_ok($$ insert into public.notes (daara_id, evaluation_id, apprenant_id, classe_id, classe_matiere_id, valeur) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002761', '00000000-0000-0000-0000-0000000027f3',
     '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002751', 5) $$, '23514', 'eleve_hors_classe',
    'élève d''une autre classe : refusé');
select throws_ok($$ insert into public.notes (daara_id, evaluation_id, apprenant_id, classe_id, classe_matiere_id, valeur) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002762', '00000000-0000-0000-0000-0000000027f1',
     '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002752', 12) $$, '42501', null,
    'enseignant : évaluation d''un collègue refusée');
select throws_ok($$ insert into public.notes (daara_id, evaluation_id, apprenant_id, classe_id, classe_matiere_id, valeur) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002762', '00000000-0000-0000-0000-0000000027f1',
     '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002751', 12) $$, '23514', 'autre_daara',
    'matière déclarée différente de celle de l''évaluation : refusée');
select throws_ok($$ insert into public.notes (daara_id, evaluation_id, apprenant_id, classe_id, classe_matiere_id, valeur) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002763', '00000000-0000-0000-0000-0000000027f1',
     '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002751', 12) $$, '23514', 'periode_cloturee',
    'période clôturée : refusée');
select lives_ok($$ update public.notes set valeur = 9, appreciation = 'Bon travail' where apprenant_id = '00000000-0000-0000-0000-0000000027f1'
    and evaluation_id = '00000000-0000-0000-0000-000000002761' $$, 'enseignant : corrige la note, ajoute une appréciation');
reset role;
select tests.postgres();
select is((select updated_by::text from public.notes where apprenant_id = '00000000-0000-0000-0000-0000000027f1'),
    '00000000-0000-0000-0000-0000000027e1', 'auteur de la modification enregistré');
update public.reglages_notes set appreciations = false where daara_id = '00000000-0000-0000-0000-00000000270a';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000027e1');
select throws_ok($$ update public.notes set appreciation = 'Très bien' where apprenant_id = '00000000-0000-0000-0000-0000000027f1' $$,
    '23514', 'appreciations_desactivees', 'appréciations désactivées : refusées');

-- Enseignant E2 : lit les notes de la classe, ne modifie pas celles d'un collègue.
select tests.connecter('00000000-0000-0000-0000-0000000027e2');
select is((select count(*)::int from public.notes), 2, 'enseignant de la classe : lit les notes');
update public.notes set valeur = 0 where apprenant_id = '00000000-0000-0000-0000-0000000027f1';
reset role;
select tests.postgres();
select is((select valeur from public.notes where apprenant_id = '00000000-0000-0000-0000-0000000027f1'), 9.00::numeric,
    'enseignant : note d''un collègue non modifiable');

-- Parent : la note de son enfant, une fois l'évaluation publiée.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000027c1', 'aal1');
select is((select count(*)::int from public.notes), 0, 'parent : rien avant publication');
reset role;
select tests.postgres();
update public.evaluations set publiee_at = now() where id = '00000000-0000-0000-0000-000000002761';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000027c1', 'aal1');
select is((select array_agg(apprenant_id::text) from public.notes), array['00000000-0000-0000-0000-0000000027f1'],
    'parent : la note de son enfant seulement, après publication');

-- Admin : barème et suppression d'une évaluation notée.
select tests.connecter('00000000-0000-0000-0000-0000000027a1');
select throws_ok($$ update public.evaluations set bareme = 8 where id = '00000000-0000-0000-0000-000000002761' $$, '23514',
    'bareme_inferieur_notes', 'barème abaissé sous une note saisie : refusé');
select throws_ok($$ delete from public.evaluations where id = '00000000-0000-0000-0000-000000002761' $$, '23514',
    'evaluation_publiee', 'évaluation publiée avec des notes : non supprimable');
select lives_ok($$ delete from public.notes where apprenant_id = '00000000-0000-0000-0000-0000000027f2' $$, 'note effacée (supprimée)');

-- Autre daara, journal, module désactivé.
select tests.connecter('00000000-0000-0000-0000-0000000027b1');
select is((select count(*)::int from public.notes where daara_id = '00000000-0000-0000-0000-00000000270a'), 0,
    'admin d''une autre daara : rien de lisible');
reset role;
select tests.postgres();
select ok(not exists (select 1 from public.audit_log where table_name = 'notes' and daara_id = '00000000-0000-0000-0000-00000000270a'
    and (new_data ? 'valeur' or old_data is not null)), 'journal des notes sans valeurs');
update public.daara_modules set actif = false where daara_id = '00000000-0000-0000-0000-00000000270a' and module = 'notes';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000027a1');
select is((select count(*)::int from public.notes), 0, 'module notes désactivé : rien de lisible, même pour l''admin');
select throws_ok($$ insert into public.notes (daara_id, evaluation_id, apprenant_id, classe_id, classe_matiere_id, valeur) values
    ('00000000-0000-0000-0000-00000000270a', '00000000-0000-0000-0000-000000002761', '00000000-0000-0000-0000-0000000027f2',
     '00000000-0000-0000-0000-0000000027d1', '00000000-0000-0000-0000-000000002751', 5) $$, '42501', null,
    'module désactivé : écriture refusée');

select * from finish();
rollback;
