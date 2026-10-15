-- Corrections de l'audit de fin de sprint 5 : enseignant limité à l'année active (I1), suppression d'appel contrôlée
-- (M1), décision annulée si le type change (M2), notifications d'un membre désactivé (M3).
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000023a1', 'admin.p23@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000023e1', 'ens.p23@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000023c1', 'pa.p23@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000230a', 'Daara P23', 'test-daara-p23', '00000000-0000-0000-0000-0000000023a1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-00000000230a', 'structure', true), ('00000000-0000-0000-0000-00000000230a', 'absences', true),
    ('00000000-0000-0000-0000-00000000230a', 'notifications', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000230a', '00000000-0000-0000-0000-0000000023a1', 'admin'),
    ('00000000-0000-0000-0000-00000000230a', '00000000-0000-0000-0000-0000000023e1', 'enseignant'),
    ('00000000-0000-0000-0000-00000000230a', '00000000-0000-0000-0000-0000000023c1', 'parent');
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin, active) values
    ('00000000-0000-0000-0000-000000002310', '00000000-0000-0000-0000-00000000230a', 'Année', current_date - 60, current_date + 200, true);
insert into public.classes (id, daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000023d1', '00000000-0000-0000-0000-00000000230a', '00000000-0000-0000-0000-000000002310', 'C1', '00000000-0000-0000-0000-0000000023e1');
insert into public.apprenants (id, daara_id, nom, prenom, sexe) values
    ('00000000-0000-0000-0000-0000000023f1', '00000000-0000-0000-0000-00000000230a', 'Ndiaye', 'Awa', 'F');
insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000230a', '00000000-0000-0000-0000-0000000023f1', '00000000-0000-0000-0000-0000000023d1', '00000000-0000-0000-0000-000000002310');
insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000230a', '00000000-0000-0000-0000-0000000023c1', '00000000-0000-0000-0000-0000000023f1', 'mere');
insert into public.appels (id, daara_id, classe_id, annee_id, date_appel, termine_at) values
    ('00000000-0000-0000-0000-0000000023b1', '00000000-0000-0000-0000-00000000230a', '00000000-0000-0000-0000-0000000023d1',
     '00000000-0000-0000-0000-000000002310', current_date - 1, now()),
    ('00000000-0000-0000-0000-0000000023b2', '00000000-0000-0000-0000-00000000230a', '00000000-0000-0000-0000-0000000023d1',
     '00000000-0000-0000-0000-000000002310', current_date - 21, null);
insert into public.absences (id, daara_id, appel_id, apprenant_id, type, motif, etat) values
    ('00000000-0000-0000-0000-0000000023ab', '00000000-0000-0000-0000-00000000230a', '00000000-0000-0000-0000-0000000023b1',
     '00000000-0000-0000-0000-0000000023f1', 'absence', 'Malade', 'envoyee');

set local role authenticated;

-- M1 : appel non terminé d'il y a 3 semaines : l'enseignant ne le supprime pas.
select tests.connecter('00000000-0000-0000-0000-0000000023e1');
select throws_ok($$ delete from public.appels where id = '00000000-0000-0000-0000-0000000023b2' $$, '23514', 'appel_trop_ancien',
    'enseignant : suppression d''un appel de plus de 7 jours refusée');

-- M2 : décision puis changement de type → décision annulée.
select public.decider_justification('00000000-0000-0000-0000-0000000023ab', true);
update public.absences set type = 'retard' where id = '00000000-0000-0000-0000-0000000023ab';
select is((select etat::text || ' ' || coalesce(decide_par::text, 'aucun') from public.absences where id = '00000000-0000-0000-0000-0000000023ab'),
    'envoyee aucun', 'type changé après la décision : retour à « justification envoyée », décision effacée');

-- I1 : fin d'année (année désactivée) → l'ancien enseignant ne voit plus rien et ne décide plus.
reset role;
select set_config('request.jwt.claims', '', true);
update public.annees_scolaires set active = false where id = '00000000-0000-0000-0000-000000002310';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000023e1');
select is((select count(*) from public.absences) + (select count(*) from public.appels), 0::bigint,
    'année désactivée : l''enseignant ne lit plus les appels ni les absences (ni les motifs)');
select throws_ok($$ select public.decider_justification('00000000-0000-0000-0000-0000000023ab', false) $$, '42501', 'droits',
    'année désactivée : le titulaire ne décide plus');
select tests.connecter('00000000-0000-0000-0000-0000000023a1');
select is((select count(*) from public.absences), 1::bigint, 'admin : lit toujours l''historique');
select tests.connecter('00000000-0000-0000-0000-0000000023c1', 'aal1');
select is((select count(*) from public.absences), 1::bigint, 'parent : garde l''historique de son enfant (sans limite)');

-- M3 : membre désactivé → notifications illisibles.
select ok((select count(*) from public.notifications) > 0, 'parent actif : lit ses notifications');
reset role;
update public.memberships set actif = false, nom_affiche = 'P A' where user_id = '00000000-0000-0000-0000-0000000023c1';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000023c1', 'aal1');
select is((select count(*) from public.notifications), 0::bigint, 'parent désactivé : plus aucune notification lisible');

select * from finish();
rollback;
