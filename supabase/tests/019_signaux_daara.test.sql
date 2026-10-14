-- S5.0b : signaux « table modifiée » par daara (Realtime Broadcast privé), sans donnée ; écoute réservée aux membres
-- actuels. Jeu : daara P (admin A, enseignant E, parent actuel Pa, ancien parent Pb) ; daara R (admin B).
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;
-- Partition de realtime.messages du jour (créée par le service Realtime ; absente si seule la base tourne).
create function tests.partition_du_jour()
returns boolean language sql as $$
    select exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'realtime' and c.relname = 'messages_' || to_char(now(), 'YYYY_MM_DD'));
$$;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000019a1', 'admin.p19@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000019e1', 'ens.p19@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000019c1', 'parent.p19@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000019c2', 'ancien.p19@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000019b1', 'admin.r19@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000190a', 'Daara P19', 'test-daara-p19', '00000000-0000-0000-0000-0000000019a1'),
    ('00000000-0000-0000-0000-00000000190b', 'Daara R19', 'test-daara-r19', '00000000-0000-0000-0000-0000000019b1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-00000000190a', 'structure', true), ('00000000-0000-0000-0000-00000000190b', 'structure', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000190a', '00000000-0000-0000-0000-0000000019a1', 'admin'),
    ('00000000-0000-0000-0000-00000000190a', '00000000-0000-0000-0000-0000000019e1', 'enseignant'),
    ('00000000-0000-0000-0000-00000000190a', '00000000-0000-0000-0000-0000000019c1', 'parent'),
    ('00000000-0000-0000-0000-00000000190a', '00000000-0000-0000-0000-0000000019c2', 'parent'),
    ('00000000-0000-0000-0000-00000000190b', '00000000-0000-0000-0000-0000000019b1', 'admin');
insert into public.apprenants (id, daara_id, nom, prenom, sexe) values
    ('00000000-0000-0000-0000-0000000019f1', '00000000-0000-0000-0000-00000000190a', 'Diop', 'Awa', 'F');
insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000190a', '00000000-0000-0000-0000-0000000019c1', '00000000-0000-0000-0000-0000000019f1', 'mere');

-- Triggers posés sur les 13 tables (3 chacune).
select is((select count(*)::int from pg_trigger where tgname like '%\_signal\_%' and not tgisinternal), 39, 'triggers de signal : 13 tables × 3');

-- Signal publié : une ligne par instruction et par daara, payload sans donnée (seulement la table).
delete from realtime.messages where topic like 'daara:00000000-0000-0000-0000-0000000019%';
insert into public.matieres (daara_id, nom, code) values
    ('00000000-0000-0000-0000-00000000190a', 'Coran', 'COR'), ('00000000-0000-0000-0000-00000000190a', 'Français', 'FR'),
    ('00000000-0000-0000-0000-00000000190b', 'Arabe', 'AR');
select ok(not tests.partition_du_jour() or (select count(*) from realtime.messages
    where topic = 'daara:00000000-0000-0000-0000-00000000190a' and event = 'changement' and private) = 1,
    'deux matières insérées en une instruction : un seul signal pour la daara P');
select ok(not tests.partition_du_jour() or (select count(*) from realtime.messages
    where topic = 'daara:00000000-0000-0000-0000-00000000190b') = 1, 'un signal pour la daara R (autre canal)');
select ok(not tests.partition_du_jour() or (select bool_and(payload - 'id' = '{"table": "matieres"}'::jsonb) from realtime.messages
    where topic like 'daara:00000000-0000-0000-0000-0000000019%'), 'message sans donnée : seulement le nom de la table');
select lives_ok($$ update public.matieres set nom = 'Langue française' where code = 'FR'
    and daara_id = '00000000-0000-0000-0000-00000000190a' $$, 'mise à jour : le signal ne gêne pas l''écriture');
select lives_ok($$ delete from public.matieres where code = 'AR' and daara_id = '00000000-0000-0000-0000-00000000190b' $$,
    'suppression : le signal ne gêne pas l''écriture');

-- Qui peut écouter le canal de la daara P.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000019a1');
select ok(public.canal_daara_autorise('daara:00000000-0000-0000-0000-00000000190a'), 'admin : canal de sa daara');
select ok(not public.canal_daara_autorise('daara:00000000-0000-0000-0000-00000000190b'), 'admin : pas le canal d''une autre daara');
select ok(not public.canal_daara_autorise('daara:pas-un-uuid') and not public.canal_daara_autorise('autre:00000000-0000-0000-0000-00000000190a'),
    'canal malformé : refusé sans erreur');
select tests.connecter('00000000-0000-0000-0000-0000000019e1');
select ok(public.canal_daara_autorise('daara:00000000-0000-0000-0000-00000000190a'), 'enseignant : canal de sa daara');
select tests.connecter('00000000-0000-0000-0000-0000000019c1', 'aal1');
select ok(public.canal_daara_autorise('daara:00000000-0000-0000-0000-00000000190a'), 'parent actuel : canal de sa daara');
select tests.connecter('00000000-0000-0000-0000-0000000019c2', 'aal1');
select ok(not public.canal_daara_autorise('daara:00000000-0000-0000-0000-00000000190a'), 'ancien parent (aucun enfant inscrit) : refusé');

-- Aucun envoi par le client.
select tests.connecter('00000000-0000-0000-0000-0000000019a1');
select throws_ok($$ insert into realtime.messages (topic, extension, event, payload, private)
    values ('daara:00000000-0000-0000-0000-00000000190a', 'broadcast', 'changement', '{"table": "x"}', true) $$,
    '42501', null, 'client : envoi d''un signal refusé');

select * from finish();
rollback;
