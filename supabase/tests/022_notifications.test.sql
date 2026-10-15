-- S5.3 : notifications (fin de l'appel, corrections, motif, décision), lecture et « lu » par le destinataire seulement.
-- Jeu : daara P (admin A, enseignant titulaire E, parent Pa d'Awa, parent désactivé Pd d'Awa) ; Awa en C1.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;
create function tests.notifs(p_user uuid, p_type text default null)
returns bigint language sql security definer set search_path = '' as $$
    select count(*) from public.notifications where user_id = p_user and (p_type is null or type::text = p_type);
$$;
grant execute on function tests.notifs(uuid, text) to authenticated;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000022a1', 'admin.p22@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000022e1', 'ens.p22@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000022c1', 'pa.p22@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000022c2', 'pd.p22@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000220a', 'Daara P22', 'test-daara-p22', '00000000-0000-0000-0000-0000000022a1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-00000000220a', 'structure', true), ('00000000-0000-0000-0000-00000000220a', 'absences', true),
    ('00000000-0000-0000-0000-00000000220a', 'notifications', true);
insert into public.memberships (daara_id, user_id, role, actif, nom_affiche) values
    ('00000000-0000-0000-0000-00000000220a', '00000000-0000-0000-0000-0000000022a1', 'admin', true, null),
    ('00000000-0000-0000-0000-00000000220a', '00000000-0000-0000-0000-0000000022e1', 'enseignant', true, null),
    ('00000000-0000-0000-0000-00000000220a', '00000000-0000-0000-0000-0000000022c1', 'parent', true, null),
    ('00000000-0000-0000-0000-00000000220a', '00000000-0000-0000-0000-0000000022c2', 'parent', true, null);
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin, active) values
    ('00000000-0000-0000-0000-000000002210', '00000000-0000-0000-0000-00000000220a', 'Année', current_date - 60, current_date + 200, true);
insert into public.classes (id, daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000022d1', '00000000-0000-0000-0000-00000000220a', '00000000-0000-0000-0000-000000002210', 'C1', '00000000-0000-0000-0000-0000000022e1');
insert into public.apprenants (id, daara_id, nom, prenom, sexe) values
    ('00000000-0000-0000-0000-0000000022f1', '00000000-0000-0000-0000-00000000220a', 'Ndiaye', 'Awa', 'F'),
    ('00000000-0000-0000-0000-0000000022f2', '00000000-0000-0000-0000-00000000220a', 'Sow', 'Bineta', 'F');
insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) select
    '00000000-0000-0000-0000-00000000220a', id, '00000000-0000-0000-0000-0000000022d1', '00000000-0000-0000-0000-000000002210'
    from public.apprenants where daara_id = '00000000-0000-0000-0000-00000000220a';
insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000220a', '00000000-0000-0000-0000-0000000022c1', '00000000-0000-0000-0000-0000000022f1', 'mere'),
    ('00000000-0000-0000-0000-00000000220a', '00000000-0000-0000-0000-0000000022c2', '00000000-0000-0000-0000-0000000022f1', 'pere');
update public.memberships set actif = false, nom_affiche = 'P D' where user_id = '00000000-0000-0000-0000-0000000022c2';

set local role authenticated;

-- Pendant l'appel : rien.
select tests.connecter('00000000-0000-0000-0000-0000000022e1');
insert into public.appels (daara_id, classe_id, date_appel) values
    ('00000000-0000-0000-0000-00000000220a', '00000000-0000-0000-0000-0000000022d1', current_date);
insert into public.absences (daara_id, appel_id, apprenant_id)
    select '00000000-0000-0000-0000-00000000220a', id, '00000000-0000-0000-0000-0000000022f1' from public.appels where classe_id = '00000000-0000-0000-0000-0000000022d1';
update public.absences set type = 'retard' where apprenant_id = '00000000-0000-0000-0000-0000000022f1';
update public.absences set type = 'absence' where apprenant_id = '00000000-0000-0000-0000-0000000022f1';
select is(tests.notifs('00000000-0000-0000-0000-0000000022c1'), 0::bigint, 'pendant l''appel : aucune notification (pas de fausse alerte)');

-- Fin de l'appel : le parent actif est prévenu, pas le parent désactivé, pas l'auteur.
select public.terminer_appel(id) from public.appels where classe_id = '00000000-0000-0000-0000-0000000022d1';
select is(tests.notifs('00000000-0000-0000-0000-0000000022c1', 'absence'), 1::bigint, 'fin de l''appel : le parent est prévenu de l''absence');
select is(tests.notifs('00000000-0000-0000-0000-0000000022c2'), 0::bigint, 'parent désactivé : pas prévenu');
select is(tests.notifs('00000000-0000-0000-0000-0000000022e1'), 0::bigint, 'l''auteur n''est jamais prévenu de sa propre action');
select public.terminer_appel(id) from public.appels where classe_id = '00000000-0000-0000-0000-0000000022d1';
select is(tests.notifs('00000000-0000-0000-0000-0000000022c1'), 1::bigint, 'fin d''appel rejouée : pas de doublon');

-- Corrections après la fin de l'appel.
update public.absences set type = 'retard' where apprenant_id = '00000000-0000-0000-0000-0000000022f1';
select is(tests.notifs('00000000-0000-0000-0000-0000000022c1', 'retard'), 1::bigint, 'correction absent → en retard : parent prévenu');
delete from public.absences where apprenant_id = '00000000-0000-0000-0000-0000000022f1';
select is(tests.notifs('00000000-0000-0000-0000-0000000022c1', 'absence_annulee'), 1::bigint, 'absence retirée : « absence annulée »');
insert into public.absences (daara_id, appel_id, apprenant_id)
    select '00000000-0000-0000-0000-00000000220a', id, '00000000-0000-0000-0000-0000000022f1' from public.appels where classe_id = '00000000-0000-0000-0000-0000000022d1';
select is(tests.notifs('00000000-0000-0000-0000-0000000022c1', 'absence'), 2::bigint, 'absence ajoutée après la fin : parent prévenu');
select is(tests.notifs('00000000-0000-0000-0000-0000000022f2'), 0::bigint, 'enfant sans parent relié : personne');

-- Motif du parent → équipe ; décision du titulaire → parent.
select tests.connecter('00000000-0000-0000-0000-0000000022c1', 'aal1');
select public.justifier_absence((select id from public.absences where apprenant_id = '00000000-0000-0000-0000-0000000022f1'), 'Malade');
select is(tests.notifs('00000000-0000-0000-0000-0000000022a1', 'justification_envoyee') + tests.notifs('00000000-0000-0000-0000-0000000022e1', 'justification_envoyee'),
    2::bigint, 'motif envoyé : admin et titulaire prévenus');
select tests.connecter('00000000-0000-0000-0000-0000000022e1');
select public.decider_justification((select id from public.absences where apprenant_id = '00000000-0000-0000-0000-0000000022f1'), true);
select is(tests.notifs('00000000-0000-0000-0000-0000000022c1', 'justification_decidee'), 1::bigint, 'décision : parent prévenu');

-- Lecture et « lu ».
select tests.connecter('00000000-0000-0000-0000-0000000022c1', 'aal1');
select is((select count(*) from public.notifications), 5::bigint, 'parent : ses notifications seulement (2 absences, 1 retard, 1 annulée, 1 décision)');
select lives_ok($$ update public.notifications set lu_at = now() $$, 'parent : marque ses notifications lues');
select throws_ok($$ update public.notifications set type = 'retard' $$, '42501', null, 'seul « lu » est modifiable');
select throws_ok($$ insert into public.notifications (daara_id, user_id, type) values
    ('00000000-0000-0000-0000-00000000220a', '00000000-0000-0000-0000-0000000022c1', 'absence') $$, '42501', null, 'aucune création par le client');
select tests.connecter('00000000-0000-0000-0000-0000000022a1');
select is((select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-0000000022c1'), 0::bigint,
    'admin : ne lit pas les notifications des autres');

-- Module désactivé : rien de lisible.
reset role;
update public.daara_modules set actif = false where daara_id = '00000000-0000-0000-0000-00000000220a' and module = 'notifications';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000022c1', 'aal1');
select is((select count(*) from public.notifications), 0::bigint, 'module notifications désactivé : rien de lisible');

select * from finish();
rollback;
