-- S6.1b : réglages des absences (délai de correction, décideur, justification par les parents) appliqués par la base.
-- Jeu : daara P (admin A, enseignant E titulaire de C1, parent Pa d'Awa) ; Awa absente hier (appel terminé).
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000025a1', 'admin.p25@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000025e1', 'ens.p25@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000025c1', 'pa.p25@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000250a', 'Daara P25', 'test-daara-p25', '00000000-0000-0000-0000-0000000025a1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-00000000250a', 'structure', true), ('00000000-0000-0000-0000-00000000250a', 'absences', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000250a', '00000000-0000-0000-0000-0000000025a1', 'admin'),
    ('00000000-0000-0000-0000-00000000250a', '00000000-0000-0000-0000-0000000025e1', 'enseignant'),
    ('00000000-0000-0000-0000-00000000250a', '00000000-0000-0000-0000-0000000025c1', 'parent');
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin, active) values
    ('00000000-0000-0000-0000-000000002510', '00000000-0000-0000-0000-00000000250a', 'Année', current_date - 60, current_date + 200, true);
insert into public.classes (id, daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000025d1', '00000000-0000-0000-0000-00000000250a', '00000000-0000-0000-0000-000000002510', 'C1', '00000000-0000-0000-0000-0000000025e1');
insert into public.apprenants (id, daara_id, nom, prenom, sexe) values
    ('00000000-0000-0000-0000-0000000025f1', '00000000-0000-0000-0000-00000000250a', 'Ndiaye', 'Awa', 'F');
insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000250a', '00000000-0000-0000-0000-0000000025f1', '00000000-0000-0000-0000-0000000025d1', '00000000-0000-0000-0000-000000002510');
insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000250a', '00000000-0000-0000-0000-0000000025c1', '00000000-0000-0000-0000-0000000025f1', 'mere');
insert into public.appels (id, daara_id, classe_id, annee_id, date_appel, termine_at) values
    ('00000000-0000-0000-0000-0000000025b1', '00000000-0000-0000-0000-00000000250a', '00000000-0000-0000-0000-0000000025d1',
     '00000000-0000-0000-0000-000000002510', current_date - 1, now());
insert into public.absences (id, daara_id, appel_id, apprenant_id) values
    ('00000000-0000-0000-0000-0000000025ab', '00000000-0000-0000-0000-00000000250a', '00000000-0000-0000-0000-0000000025b1',
     '00000000-0000-0000-0000-0000000025f1');

select is((select delai_correction || ' ' || decideur || ' ' || justification_parent from public.reglages_absences
    where daara_id = '00000000-0000-0000-0000-00000000250a'), '7 admin_titulaire true', 'nouvelle daara : réglages des absences par défaut');

set local role authenticated;

-- L'enseignant ne modifie pas les réglages ; l'admin, si.
select tests.connecter('00000000-0000-0000-0000-0000000025e1');
update public.reglages_absences set delai_correction = 30;
select is((select delai_correction::int from public.reglages_absences), 7, 'enseignant : lit les réglages, ne les modifie pas');
select tests.connecter('00000000-0000-0000-0000-0000000025a1');
select lives_ok($$ update public.reglages_absences set delai_correction = 0, decideur = 'admin', justification_parent = false
    where daara_id = '00000000-0000-0000-0000-00000000250a' $$, 'admin : délai 0, admin seul, pas de justification par les parents');
select throws_ok($$ update public.reglages_absences set delai_correction = 31 $$, '23514', null, 'délai de plus de 30 jours : refusé');

-- Délai 0 : l'enseignant ne corrige plus l'appel d'hier ; l'admin, si.
select tests.connecter('00000000-0000-0000-0000-0000000025e1');
select throws_ok($$ update public.absences set type = 'retard' where id = '00000000-0000-0000-0000-0000000025ab' $$,
    '23514', 'appel_trop_ancien', 'délai 0 : l''enseignant ne corrige plus l''appel d''hier');
-- Admin seul : le titulaire ne décide plus.
select throws_ok($$ select public.decider_justification('00000000-0000-0000-0000-0000000025ab', true) $$, '42501', 'droits',
    'décideur « admin seul » : le titulaire est refusé');
select tests.connecter('00000000-0000-0000-0000-0000000025a1');
select lives_ok($$ select public.decider_justification('00000000-0000-0000-0000-0000000025ab', false) $$, 'admin : décide');
select lives_ok($$ update public.absences set type = 'retard' where id = '00000000-0000-0000-0000-0000000025ab' $$,
    'admin : corrige l''appel d''hier malgré le délai 0');

-- Justification par les parents désactivée.
select tests.connecter('00000000-0000-0000-0000-0000000025c1', 'aal1');
select throws_ok($$ select public.justifier_absence('00000000-0000-0000-0000-0000000025ab', 'Malade') $$, '23514', 'justification_desactivee',
    'justification par les parents désactivée : refusée');
select is((select count(*)::int from public.reglages_absences), 1, 'parent : lit les réglages (pour masquer « Justifier »)');

select * from finish();
rollback;
