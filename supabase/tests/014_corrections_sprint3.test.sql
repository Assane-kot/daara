-- Audit de fin de sprint 3 : enseignants_daara (désactivés), libellés d'années, refus d'écriture sur matieres.
-- Jeu : daara P (admin A, enseignant E, enseignant désactivé D1 titulaire d'une classe, enseignant désactivé D2 sans
-- classe, parent Pa).
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-00000000e0a1', 'admin.p14@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000e0e1', 'ens.p14@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000e0d1', 'd1.p14@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000e0d2', 'd2.p14@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000e0c1', 'parent.p14@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-0000000e000a', 'Daara P14', 'test-daara-p14', '00000000-0000-0000-0000-00000000e0a1');
insert into public.daara_modules (daara_id, module, actif) values ('00000000-0000-0000-0000-0000000e000a', 'structure', true);
insert into public.memberships (daara_id, user_id, role, actif) values
    ('00000000-0000-0000-0000-0000000e000a', '00000000-0000-0000-0000-00000000e0a1', 'admin', true),
    ('00000000-0000-0000-0000-0000000e000a', '00000000-0000-0000-0000-00000000e0e1', 'enseignant', true),
    ('00000000-0000-0000-0000-0000000e000a', '00000000-0000-0000-0000-00000000e0d1', 'enseignant', true),
    ('00000000-0000-0000-0000-0000000e000a', '00000000-0000-0000-0000-00000000e0d2', 'enseignant', true),
    ('00000000-0000-0000-0000-0000000e000a', '00000000-0000-0000-0000-00000000e0c1', 'parent', true);
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-00000000e100', '00000000-0000-0000-0000-0000000e000a', '2026-2027', '2026-10-01', '2027-07-31');
insert into public.classes (daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000e000a', '00000000-0000-0000-0000-00000000e100', 'CP', '00000000-0000-0000-0000-00000000e0d1');
insert into public.matieres (id, daara_id, nom, code) values
    ('00000000-0000-0000-0000-00000000e300', '00000000-0000-0000-0000-0000000e000a', 'Arabe', 'AR');
update public.memberships set actif = false, nom_affiche = 'Désactivé Titulaire' where user_id = '00000000-0000-0000-0000-00000000e0d1';
update public.memberships set actif = false, nom_affiche = 'Désactivé Sans Classe' where user_id = '00000000-0000-0000-0000-00000000e0d2';

set local role authenticated;

-- enseignants_daara
select tests.connecter('00000000-0000-0000-0000-00000000e0e1');
select set_eq($$ select nom from public.enseignants_daara('00000000-0000-0000-0000-0000000e000a') where not actif $$,
    array['Désactivé Titulaire'], 'enseignant : seul le désactivé encore titulaire apparaît');
select tests.connecter('00000000-0000-0000-0000-00000000e0a1');
select is((select count(*)::int from public.enseignants_daara('00000000-0000-0000-0000-0000000e000a') where not actif), 2,
    'admin : tous les désactivés (pour l''historique)');

-- Libellés d'années : règle libelle_valide ; id non choisi par le client.
select throws_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000e000a', '2027-2028' || chr(160), '2027-10-01', '2028-07-31') $$, '23514', null,
    'année : espace insécable final refusé');
select throws_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000e000a', 'Annee' || chr(769), '2027-10-01', '2028-07-31') $$, '23514', null,
    'année : forme décomposée (NFD) refusée');
select throws_ok($$ insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin) values
    (gen_random_uuid(), '00000000-0000-0000-0000-0000000e000a', '2028-2029', '2028-10-01', '2029-07-31') $$, '42501', null,
    'année : id choisi par le client refusé');

-- Matières : refus d'écriture (tests manquants du sprint).
select tests.connecter('00000000-0000-0000-0000-00000000e0e1');
delete from public.matieres;
select tests.connecter('00000000-0000-0000-0000-00000000e0a1', 'aal1');
update public.matieres set nom = 'Piraté';
delete from public.matieres;
select tests.connecter('00000000-0000-0000-0000-00000000e0c1', 'aal1');
select throws_ok($$ insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-0000000e000a', 'X', 'X') $$, '42501', null, 'parent : création refusée');
update public.matieres set nom = 'Piraté';
reset role;
select is((select nom from public.matieres where id = '00000000-0000-0000-0000-00000000e300'), 'Arabe',
    'enseignant (delete), admin aal1 (update, delete), parent (update) : matière intacte');

update public.daara_modules set actif = false where daara_id = '00000000-0000-0000-0000-0000000e000a';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-00000000e0a1');
update public.matieres set nom = 'Piraté';
delete from public.matieres;
select throws_ok($$ select * from public.enseignants_daara('00000000-0000-0000-0000-0000000e000a') $$, '42501', null,
    'module désactivé : enseignants_daara refusée');
reset role;
select is((select nom from public.matieres where id = '00000000-0000-0000-0000-00000000e300'), 'Arabe',
    'module désactivé : admin aal2 ne modifie ni ne supprime');

-- rechercher_membres : paramètre trop long refusé avant tout calcul.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-00000000e0a1');
reset role;
update public.daara_modules set actif = true where daara_id = '00000000-0000-0000-0000-0000000e000a';
set local role authenticated;
select throws_ok($$ select * from public.rechercher_membres('00000000-0000-0000-0000-0000000e000a', repeat('a', 101), null, 'tous', 'role', 0, 20) $$,
    '22023', 'parametre_invalide', 'rechercher_membres : texte > 100 refusé');
select is((select count(*)::int from public.rechercher_membres('00000000-0000-0000-0000-0000000e000a', 'désactivé', null, 'tous', 'role', 0, 20)), 2,
    'rechercher_membres : recherche sans accents toujours fonctionnelle');

select * from finish();
rollback;
