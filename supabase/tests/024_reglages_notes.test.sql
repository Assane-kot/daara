-- S6.1 : réglages des notes et types d'évaluation (ADR-012). Jeu : daara P (admin A, enseignant E, parent Pa) ; daara R
-- (admin B) ; utilisateur C sans daara qui en crée une.
begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000024a1', 'admin.p24@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000024e1', 'ens.p24@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000024c1', 'pa.p24@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000024b1', 'admin.r24@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000024d1', 'createur.p24@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000240a', 'Daara P24', 'test-daara-p24', '00000000-0000-0000-0000-0000000024a1'),
    ('00000000-0000-0000-0000-00000000240b', 'Daara R24', 'test-daara-r24', '00000000-0000-0000-0000-0000000024b1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-00000000240a', 'structure', true), ('00000000-0000-0000-0000-00000000240a', 'notes', true),
    ('00000000-0000-0000-0000-00000000240b', 'structure', true), ('00000000-0000-0000-0000-00000000240b', 'notes', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000240a', '00000000-0000-0000-0000-0000000024a1', 'admin'),
    ('00000000-0000-0000-0000-00000000240a', '00000000-0000-0000-0000-0000000024e1', 'enseignant'),
    ('00000000-0000-0000-0000-00000000240a', '00000000-0000-0000-0000-0000000024c1', 'parent'),
    ('00000000-0000-0000-0000-00000000240b', '00000000-0000-0000-0000-0000000024b1', 'admin');
-- Parent actuel : un enfant inscrit relié.
insert into public.apprenants (id, daara_id, nom, prenom, sexe) values
    ('00000000-0000-0000-0000-0000000024f1', '00000000-0000-0000-0000-00000000240a', 'Ndiaye', 'Awa', 'F');
insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000240a', '00000000-0000-0000-0000-0000000024c1', '00000000-0000-0000-0000-0000000024f1', 'mere');

select is((select array_agg(nom || ':' || coefficient order by ordre) from public.types_evaluation where daara_id = '00000000-0000-0000-0000-00000000240a'),
    array['Devoir:1.00', 'Composition:2.00'], 'nouvelle daara : types par défaut Devoir (1) et Composition (2)');
select is((select absence_evaluation::text || ' ' || moyenne_generale::text || ' ' || arrondi::text || ' ' || visibilite::text
    from public.reglages_notes where daara_id = '00000000-0000-0000-0000-00000000240a'), 'ignorer ponderee centieme publication',
    'nouvelle daara : réglages par défaut');
select ok(not exists (select 1 from public.daaras d where not exists (select 1 from public.reglages_notes r where r.daara_id = d.id)),
    'toute daara (existantes comprises) a ses réglages');

set local role authenticated;

-- Création d'une daara par un utilisateur : réglages posés malgré l'absence de membership au moment du trigger.
select tests.connecter('00000000-0000-0000-0000-0000000024d1');
select lives_ok($$ select public.creer_daara('Daara C24', 'test-daara-c24', null, null, 'fr', 20) $$, 'creer_daara : réglages initiaux posés');

-- Admin.
select tests.connecter('00000000-0000-0000-0000-0000000024a1');
select lives_ok($$ update public.reglages_notes set absence_evaluation = 'zero', arrondi = 'quart', titulaire_saisit = true
    where daara_id = '00000000-0000-0000-0000-00000000240a' $$, 'admin : modifie les réglages');
select lives_ok($$ insert into public.types_evaluation (daara_id, nom, coefficient, ordre) values
    ('00000000-0000-0000-0000-00000000240a', 'Interrogation', 0.5, 0) $$, 'admin : ajoute « Interrogation » (0,5)');
select throws_ok($$ insert into public.types_evaluation (daara_id, nom) values ('00000000-0000-0000-0000-00000000240a', 'DEVOIR') $$,
    '23505', null, 'nom déjà pris (sans casse) : refusé');
select throws_ok($$ insert into public.types_evaluation (daara_id, nom, coefficient) values ('00000000-0000-0000-0000-00000000240a', 'Test', 0.3) $$,
    '23514', null, 'coefficient hors quart de point : refusé');
select throws_ok($$ update public.reglages_notes set daara_id = '00000000-0000-0000-0000-00000000240b' $$, '42501', null,
    'daara des réglages non modifiable');

-- Enseignant, parent, autre daara.
select tests.connecter('00000000-0000-0000-0000-0000000024e1');
update public.reglages_notes set arrondi = 'demi' where daara_id = '00000000-0000-0000-0000-00000000240a';
select is((select arrondi::text from public.reglages_notes where daara_id = '00000000-0000-0000-0000-00000000240a'), 'quart',
    'enseignant : lit les réglages, ne les modifie pas');
select throws_ok($$ insert into public.types_evaluation (daara_id, nom) values ('00000000-0000-0000-0000-00000000240a', 'Oral') $$,
    '42501', null, 'enseignant : ajout d''un type refusé');
select tests.connecter('00000000-0000-0000-0000-0000000024c1', 'aal1');
select is((select count(*)::int from public.types_evaluation), 3, 'parent actuel : lit les types (écrans des notes)');
select tests.connecter('00000000-0000-0000-0000-0000000024b1');
select is((select count(*)::int from public.reglages_notes where daara_id = '00000000-0000-0000-0000-00000000240a'), 0,
    'admin d''une autre daara : rien de lisible');

-- Module désactivé.
reset role;
update public.daara_modules set actif = false where daara_id = '00000000-0000-0000-0000-00000000240a' and module = 'notes';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000024a1');
select is((select count(*)::int from public.reglages_notes) + (select count(*)::int from public.types_evaluation), 0,
    'module notes désactivé : rien de lisible, même pour l''admin');
select throws_ok($$ insert into public.types_evaluation (daara_id, nom) values ('00000000-0000-0000-0000-00000000240a', 'Oral') $$,
    '42501', null, 'module désactivé : écriture refusée');

select * from finish();
rollback;
