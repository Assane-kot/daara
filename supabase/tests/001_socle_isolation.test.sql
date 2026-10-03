-- Isolation du socle multi-tenant (docs/features/socle-multi-tenant.md, « Cas de test »).
-- Jeu : daaras A et B ; admin (aussi enseignant), enseignant, parent, apprenant de A ; admin désactivé de A ;
-- admin de B ; enseignant de A avec un membership inactif dans B ; utilisateur sans daara ; super-admin.
begin;

create extension if not exists pgtap with schema extensions;

select plan(108);

-- -----------------------------------------------------------------------------------------------------
-- Outils de session (schéma jetable, annulé par le rollback)
-- -----------------------------------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to authenticated, anon;

create function tests.connecter(p_user uuid, p_aal text default 'aal1')
returns void
language plpgsql
as $$
begin
    perform set_config(
        'request.jwt.claims',
        json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text,
        true
    );
end;
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------------------------------
-- Données (en tant que postgres)
-- -----------------------------------------------------------------------------------------------------
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000000a1', 'admin.a@test.local', 'authenticated', 'authenticated',
        '{"nom": "Diop", "prenom": "Awa", "langue": "fr"}'),
    ('00000000-0000-0000-0000-0000000000a2', 'enseignant.a@test.local', 'authenticated', 'authenticated',
        '{"nom": "Fall", "prenom": "Modou", "langue": "en"}'),
    ('00000000-0000-0000-0000-0000000000a3', 'parent.a@test.local', 'authenticated', 'authenticated',
        '{"nom": "Ndiaye", "prenom": "Fatou"}'),
    ('00000000-0000-0000-0000-0000000000a4', 'apprenant.a@test.local', 'authenticated', 'authenticated',
        '{"nom": "Ndiaye", "prenom": "Ibrahima"}'),
    ('00000000-0000-0000-0000-0000000000a5', 'ancien.admin.a@test.local', 'authenticated', 'authenticated',
        '{"nom": "Faye", "prenom": "Mariama"}'),
    ('00000000-0000-0000-0000-0000000000b1', 'admin.b@test.local', 'authenticated', 'authenticated',
        '{"nom": "Sow", "prenom": "Aminata"}'),
    ('00000000-0000-0000-0000-0000000000c1', 'sans.daara@test.local', 'authenticated', 'authenticated',
        '{"nom": "Ba", "prenom": "Cheikh"}'),
    ('00000000-0000-0000-0000-0000000000c2', 'meta@test.local', 'authenticated', 'authenticated',
        jsonb_build_object('nom', repeat('x', 150), 'prenom', E'  Mou\nss‮a​\t ', 'langue', 'xx')),
    ('00000000-0000-0000-0000-0000000000d1', 'plateforme@test.local', 'authenticated', 'authenticated',
        '{"nom": "Gueye", "prenom": "Ousmane"}');

insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000000a', 'Daara A', 'test-daara-a', '00000000-0000-0000-0000-0000000000a1'),
    ('00000000-0000-0000-0000-00000000000b', 'Daara B', 'test-daara-b', '00000000-0000-0000-0000-0000000000b1');

insert into public.memberships (daara_id, user_id, role, actif) values
    ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'admin', true),
    ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'enseignant', true),
    ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'enseignant', true),
    ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a3', 'parent', true),
    ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a4', 'apprenant', true),
    ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a5', 'admin', false),
    ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'admin', true),
    ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a2', 'enseignant', false);

insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000d1');

-- -----------------------------------------------------------------------------------------------------
-- handle_new_user
-- -----------------------------------------------------------------------------------------------------
select is(
    (select nom || ' ' || prenom || ' ' || langue from public.profiles
     where id = '00000000-0000-0000-0000-0000000000a2'),
    'Fall Modou en',
    'handle_new_user : profil créé depuis les métadonnées'
);
select is(
    (select char_length(nom) from public.profiles where id = '00000000-0000-0000-0000-0000000000c2'),
    100,
    'handle_new_user : nom tronqué à 100 caractères'
);
select is(
    (select prenom from public.profiles where id = '00000000-0000-0000-0000-0000000000c2'),
    'Moussa',
    'handle_new_user : caractères de contrôle, invisibles et bidirectionnels, espaces retirés'
);
select is(
    (select langue from public.profiles where id = '00000000-0000-0000-0000-0000000000c2'),
    'fr',
    'handle_new_user : langue invalide ramenée à fr'
);

-- -----------------------------------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------------------------------
set local role authenticated;

select tests.connecter('00000000-0000-0000-0000-0000000000a2');
select ok(
    public.has_role('00000000-0000-0000-0000-00000000000a', array['enseignant']::public.role_membre[]),
    'has_role : enseignant actif de A'
);
select ok(
    not public.has_role('00000000-0000-0000-0000-00000000000b', array['enseignant']::public.role_membre[]),
    'has_role : membership inactif dans B ignoré'
);
select ok(
    not public.is_member('00000000-0000-0000-0000-00000000000b'),
    'is_member : membership inactif dans B ignoré'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal1');
select ok(
    not public.has_role('00000000-0000-0000-0000-00000000000a', array['admin']::public.role_membre[]),
    'has_role : admin en aal1 n''a pas le rôle admin'
);
select ok(
    public.has_role('00000000-0000-0000-0000-00000000000a', array['admin', 'enseignant']::public.role_membre[]),
    'has_role : admin + enseignant en aal1 garde le rôle enseignant'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal2');
select ok(
    public.has_role('00000000-0000-0000-0000-00000000000a', array['admin']::public.role_membre[]),
    'has_role : admin en aal2'
);

-- -----------------------------------------------------------------------------------------------------
-- daaras
-- -----------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000000a3');
select results_eq(
    'select slug from public.daaras',
    array['test-daara-a'],
    'daaras : le parent de A ne voit que A'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a4');
select results_eq(
    'select slug from public.daaras',
    array['test-daara-a'],
    'daaras : l''apprenant de A ne voit que A'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a2');
select results_eq(
    'select slug from public.daaras',
    array['test-daara-a'],
    'daaras : l''enseignant de A ne voit pas B (membership inactif)'
);

select tests.connecter('00000000-0000-0000-0000-0000000000c1', 'aal2');
select is_empty('select id from public.daaras', 'daaras : un utilisateur sans daara ne voit rien');

select tests.connecter('00000000-0000-0000-0000-0000000000d1', 'aal1');
select is_empty('select id from public.daaras', 'daaras : super-admin en aal1 ne voit rien');

select tests.connecter('00000000-0000-0000-0000-0000000000d1', 'aal2');
select is(
    (select count(*) from public.daaras where slug in ('test-daara-a', 'test-daara-b')),
    2::bigint,
    'daaras : super-admin en aal2 voit toutes les daaras'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal2');
select results_eq(
    $$ update public.daaras set nom = 'Daara A modifiée' where id = '00000000-0000-0000-0000-00000000000a'
       returning nom $$,
    array['Daara A modifiée'],
    'daaras : l''admin de A (aal2) modifie A'
);
select is_empty(
    $$ update public.daaras set nom = 'Piratée' where id = '00000000-0000-0000-0000-00000000000b' returning id $$,
    'daaras : l''admin de A ne modifie pas B'
);
select throws_ok(
    $$ update public.daaras set statut = 'suspendue' where id = '00000000-0000-0000-0000-00000000000a' $$,
    '42501',
    null,
    'daaras : statut non modifiable par l''admin'
);
select throws_ok(
    $$ update public.daaras set slug = 'autre-slug' where id = '00000000-0000-0000-0000-00000000000a' $$,
    '42501',
    null,
    'daaras : slug non modifiable par l''admin'
);
select throws_ok(
    $$ insert into public.daaras (nom, slug) values ('Daara directe', 'daara-directe') $$,
    '42501',
    null,
    'daaras : insertion directe refusée'
);
select throws_ok(
    $$ delete from public.daaras where id = '00000000-0000-0000-0000-00000000000a' $$,
    '42501',
    null,
    'daaras : suppression refusée'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal1');
select is_empty(
    $$ update public.daaras set nom = 'Sans MFA' where id = '00000000-0000-0000-0000-00000000000a' returning id $$,
    'daaras : l''admin de A en aal1 ne modifie rien'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a2');
select is_empty(
    $$ update public.daaras set nom = 'Par l''enseignant' where id = '00000000-0000-0000-0000-00000000000a'
       returning id $$,
    'daaras : l''enseignant ne modifie pas sa daara'
);

-- -----------------------------------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000000a3');
select results_eq(
    $$ update public.profiles set telephone = '+221 77 000 00 00'
       where id = '00000000-0000-0000-0000-0000000000a3' returning telephone $$,
    array['+221 77 000 00 00'],
    'profiles : chacun modifie son profil'
);
select is_empty(
    $$ update public.profiles set nom = 'Piraté' where id = '00000000-0000-0000-0000-0000000000a4' returning id $$,
    'profiles : on ne modifie pas le profil d''un autre'
);
select throws_ok(
    $$ update public.profiles set id = '00000000-0000-0000-0000-0000000000ff'
       where id = '00000000-0000-0000-0000-0000000000a3' $$,
    '42501',
    null,
    'profiles : id non modifiable'
);
select throws_ok(
    $$ insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000ff') $$,
    '42501',
    null,
    'profiles : insertion directe refusée'
);
select results_eq(
    'select id::text from public.profiles',
    array['00000000-0000-0000-0000-0000000000a3'],
    'profiles : le parent ne lit que son profil'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a2');
select results_eq(
    'select id::text from public.profiles',
    array['00000000-0000-0000-0000-0000000000a2'],
    'profiles : l''enseignant ne lit que son profil'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal2');
select results_eq(
    'select id::text from public.profiles order by id',
    array[
        '00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-0000000000a2',
        '00000000-0000-0000-0000-0000000000a3',
        '00000000-0000-0000-0000-0000000000a4'
    ],
    'profiles : l''admin de A (aal2) lit les profils des membres actifs de A, et eux seuls'
);
select throws_ok(
    $$ update public.daaras set logo_path = '00000000-0000-0000-0000-00000000000b/logo.png'
       where id = '00000000-0000-0000-0000-00000000000a' $$,
    '23514',
    null,
    'daaras : logo_path pointant vers une autre daara refusé'
);
select results_eq(
    $$ update public.daaras set logo_path = '00000000-0000-0000-0000-00000000000a/logo.png'
       where id = '00000000-0000-0000-0000-00000000000a' returning logo_path $$,
    array['00000000-0000-0000-0000-00000000000a/logo.png'],
    'daaras : logo_path dans le dossier de la daara accepté'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal1');
select results_eq(
    'select id::text from public.profiles',
    array['00000000-0000-0000-0000-0000000000a1'],
    'profiles : l''admin de A en aal1 ne lit que son profil'
);

select tests.connecter('00000000-0000-0000-0000-0000000000b1', 'aal2');
select results_eq(
    'select id::text from public.profiles order by id',
    array['00000000-0000-0000-0000-0000000000b1'],
    'profiles : l''admin de B ne lit ni les membres inactifs de B ni ceux de A'
);

-- Contraintes sur les saisies (mise à jour directe, hors handle_new_user)
select tests.connecter('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
    $$ update public.profiles set nom = E'Ndi‮aye' where id = '00000000-0000-0000-0000-0000000000a3' $$,
    '23514',
    null,
    'profiles : caractère bidirectionnel refusé dans le nom'
);
select throws_ok(
    $$ update public.profiles set prenom = E'Fa\ntou' where id = '00000000-0000-0000-0000-0000000000a3' $$,
    '23514',
    null,
    'profiles : caractère de contrôle refusé dans le prénom'
);
select throws_ok(
    $$ update public.profiles set avatar_path = '../00000000-0000-0000-0000-0000000000a4/x.jpg'
       where id = '00000000-0000-0000-0000-0000000000a3' $$,
    '23514',
    null,
    'profiles : avatar_path avec ../ refusé'
);
select throws_ok(
    $$ update public.profiles set avatar_path = '00000000-0000-0000-0000-0000000000a4/avatar.jpg'
       where id = '00000000-0000-0000-0000-0000000000a3' $$,
    '23514',
    null,
    'profiles : avatar_path dans le dossier d''un autre utilisateur refusé'
);
select results_eq(
    $$ update public.profiles set avatar_path = '00000000-0000-0000-0000-0000000000a3/avatar.jpg'
       where id = '00000000-0000-0000-0000-0000000000a3' returning avatar_path $$,
    array['00000000-0000-0000-0000-0000000000a3/avatar.jpg'],
    'profiles : avatar_path dans son propre dossier accepté'
);

-- -----------------------------------------------------------------------------------------------------
-- memberships
-- -----------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000000a3');
select results_eq(
    'select role::text from public.memberships',
    array['parent'],
    'memberships : le parent ne voit que le sien'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a4');
select results_eq(
    'select role::text from public.memberships',
    array['apprenant'],
    'memberships : l''apprenant ne voit que le sien'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a2');
select results_eq(
    $$ select user_id::text from public.memberships
       where daara_id = '00000000-0000-0000-0000-00000000000a' order by user_id $$,
    array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2'],
    'memberships : l''enseignant ne voit que les enseignants de A (ni parents ni apprenants)'
);
select results_eq(
    $$ select user_id::text from public.memberships where daara_id = '00000000-0000-0000-0000-00000000000b' $$,
    array['00000000-0000-0000-0000-0000000000a2'],
    'memberships : dans B, l''enseignant ne voit que le sien'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal1');
select is(
    (select count(*) from public.memberships where daara_id = '00000000-0000-0000-0000-00000000000a'),
    3::bigint,
    'memberships : l''admin + enseignant de A en aal1 voit les siens et les enseignants de A'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal2');
select is(
    (select count(*) from public.memberships where daara_id = '00000000-0000-0000-0000-00000000000a'),
    6::bigint,
    'memberships : l''admin de A (aal2) voit tous ceux de A, inactifs compris'
);

select tests.connecter('00000000-0000-0000-0000-0000000000b1', 'aal2');
select is(
    (select count(*) from public.memberships where daara_id = '00000000-0000-0000-0000-00000000000b'),
    2::bigint,
    'memberships : l''admin de B voit ceux de B'
);
select is_empty(
    $$ select id from public.memberships where daara_id = '00000000-0000-0000-0000-00000000000a' $$,
    'memberships : l''admin de B ne voit rien de A'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal2');
select throws_ok(
    $$ insert into public.memberships (daara_id, user_id, role)
       values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', 'parent') $$,
    '42501',
    null,
    'memberships : l''admin ne peut pas rattacher un utilisateur directement'
);
select throws_ok(
    $$ update public.memberships set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000a2' $$,
    '42501',
    null,
    'memberships : modification directe refusée'
);
select throws_ok(
    $$ delete from public.memberships where user_id = '00000000-0000-0000-0000-0000000000a3' $$,
    '42501',
    null,
    'memberships : suppression directe refusée'
);

-- -----------------------------------------------------------------------------------------------------
-- audit_log
-- -----------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal2');
select ok(
    (select count(*) from public.audit_log where daara_id = '00000000-0000-0000-0000-00000000000a') > 0,
    'audit_log : l''admin de A (aal2) lit le journal de A'
);
select is_empty(
    $$ select id from public.audit_log where daara_id <> '00000000-0000-0000-0000-00000000000a' $$,
    'audit_log : l''admin de A ne lit pas le journal de B'
);
select throws_ok(
    $$ insert into public.audit_log (daara_id, table_name, action)
       values ('00000000-0000-0000-0000-00000000000a', 'faux', 'INSERT') $$,
    '42501',
    null,
    'audit_log : insertion directe refusée'
);
select throws_ok(
    $$ delete from public.audit_log $$,
    '42501',
    null,
    'audit_log : suppression refusée'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal1');
select is_empty('select id from public.audit_log', 'audit_log : l''admin en aal1 ne lit rien');

select tests.connecter('00000000-0000-0000-0000-0000000000a2');
select is_empty('select id from public.audit_log', 'audit_log : l''enseignant ne lit rien');

-- -----------------------------------------------------------------------------------------------------
-- platform_admins
-- -----------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000000d1', 'aal2');
select is(
    (select count(*) from public.platform_admins),
    1::bigint,
    'platform_admins : le super-admin voit sa ligne'
);

select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal2');
select is_empty('select user_id from public.platform_admins', 'platform_admins : un admin de daara ne voit rien');
select throws_ok(
    $$ insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000a1') $$,
    '42501',
    null,
    'platform_admins : auto-promotion refusée'
);

-- -----------------------------------------------------------------------------------------------------
-- Profils sans droit d'administration (audit RLS du sprint 1)
-- -----------------------------------------------------------------------------------------------------
-- Admin désactivé de A, en aal2 : plus aucun droit.
select tests.connecter('00000000-0000-0000-0000-0000000000a5', 'aal2');
select ok(
    not public.has_role('00000000-0000-0000-0000-00000000000a', array['admin']::public.role_membre[]),
    'admin désactivé : has_role faux en aal2'
);
select is_empty('select id from public.daaras', 'admin désactivé : ne voit plus sa daara');
select is_empty('select id from public.audit_log', 'admin désactivé : ne lit pas le journal');
select results_eq(
    'select id::text from public.profiles',
    array['00000000-0000-0000-0000-0000000000a5'],
    'admin désactivé : ne lit que son profil'
);
select results_eq(
    'select user_id::text from public.memberships',
    array['00000000-0000-0000-0000-0000000000a5'],
    'admin désactivé : ne voit que son membership'
);

-- Super-admin en aal2 : lit les daaras, rien d'autre.
select tests.connecter('00000000-0000-0000-0000-0000000000d1', 'aal2');
select is_empty(
    $$ update public.daaras set nom = 'Par la plateforme' where id = '00000000-0000-0000-0000-00000000000a'
       returning id $$,
    'super-admin : ne modifie pas une daara'
);
select results_eq(
    'select id::text from public.profiles',
    array['00000000-0000-0000-0000-0000000000d1'],
    'super-admin : ne lit que son profil'
);
select is_empty('select id from public.memberships', 'super-admin : ne voit aucun membership');
select is_empty('select id from public.audit_log', 'super-admin : ne lit pas le journal');

-- Parent et apprenant de A.
select tests.connecter('00000000-0000-0000-0000-0000000000a3');
select is_empty(
    $$ update public.daaras set nom = 'Par le parent' where id = '00000000-0000-0000-0000-00000000000a'
       returning id $$,
    'daaras : le parent ne modifie pas sa daara'
);
select is_empty('select id from public.audit_log', 'audit_log : le parent ne lit rien');

select tests.connecter('00000000-0000-0000-0000-0000000000a4');
select results_eq(
    'select id::text from public.profiles',
    array['00000000-0000-0000-0000-0000000000a4'],
    'profiles : l''apprenant ne lit que son profil'
);

-- Utilisateur sans daara, en aal2.
select tests.connecter('00000000-0000-0000-0000-0000000000c1', 'aal2');
select is_empty('select id from public.memberships', 'sans daara : aucun membership');
select is_empty('select id from public.audit_log', 'sans daara : aucune ligne de journal');
select is_empty('select user_id from public.platform_admins', 'sans daara : platform_admins vide');
select results_eq(
    'select id::text from public.profiles',
    array['00000000-0000-0000-0000-0000000000c1'],
    'sans daara : ne lit que son profil'
);

-- Admin de B en aal2 face à A.
select tests.connecter('00000000-0000-0000-0000-0000000000b1', 'aal2');
select is_empty(
    $$ update public.daaras set nom = 'Piratée par B' where id = '00000000-0000-0000-0000-00000000000a'
       returning id $$,
    'daaras : l''admin de B ne modifie pas A'
);
select is_empty(
    $$ select id from public.audit_log where daara_id = '00000000-0000-0000-0000-00000000000a' $$,
    'audit_log : l''admin de B ne lit pas le journal de A'
);

-- Colonnes et tables protégées, même pour l'admin en aal2.
select tests.connecter('00000000-0000-0000-0000-0000000000a1', 'aal2');
select throws_ok(
    $$ update public.daaras set created_by = '00000000-0000-0000-0000-0000000000a2'
       where id = '00000000-0000-0000-0000-00000000000a' $$,
    '42501',
    null,
    'daaras : created_by non modifiable'
);
select throws_ok(
    $$ update public.daaras set id = '00000000-0000-0000-0000-0000000000ff'
       where id = '00000000-0000-0000-0000-00000000000a' $$,
    '42501',
    null,
    'daaras : id non modifiable'
);
select throws_ok(
    $$ update public.profiles set created_at = now() where id = '00000000-0000-0000-0000-0000000000a1' $$,
    '42501',
    null,
    'profiles : created_at non modifiable'
);
select throws_ok(
    $$ update public.audit_log set action = 'INSERT' $$,
    '42501',
    null,
    'audit_log : modification refusée'
);
select throws_ok(
    $$ update public.platform_admins set user_id = '00000000-0000-0000-0000-0000000000a1' $$,
    '42501',
    null,
    'platform_admins : modification refusée'
);
select throws_ok(
    $$ delete from public.platform_admins $$,
    '42501',
    null,
    'platform_admins : suppression refusée'
);

-- -----------------------------------------------------------------------------------------------------
-- creer_daara
-- -----------------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role": "authenticated", "aal": "aal2"}', true);
select throws_ok(
    $$ select public.creer_daara('Daara sans sub', 'test-daara-sans-sub') $$,
    '42501',
    'non_authentifie',
    'creer_daara : refusée sans utilisateur'
);

select tests.connecter('00000000-0000-0000-0000-0000000000c1', 'aal1');
select throws_ok(
    $$ select public.creer_daara('Daara C', 'test-daara-c') $$,
    '42501',
    'aal2_requis',
    'creer_daara : refusée en aal1'
);

select tests.connecter('00000000-0000-0000-0000-0000000000c1', 'aal2');
select throws_ok(
    $$ select public.creer_daara('Daara C', 'test-daara-c', null, null, null, 20) $$,
    '23514',
    'donnee_invalide',
    'creer_daara : langue nulle refusée (23514)'
);
select throws_ok(
    $$ select public.creer_daara('Daara C', 'test-daara-c', null, null, 'fr', 15) $$,
    '23514',
    'donnee_invalide',
    'creer_daara : barème hors liste refusé (23514)'
);
select throws_ok(
    $$ select public.creer_daara('Daara C', 'test-daara-c', null, null, 'fr', 100000) $$,
    '23514',
    'donnee_invalide',
    'creer_daara : barème hors smallint refusé (23514)'
);
select throws_ok(
    $$ select public.creer_daara('Daara Admin', 'admin') $$,
    '23514',
    null,
    'creer_daara : slug réservé refusé'
);
select throws_ok(
    $$ select public.creer_daara(E'Daara ‮Touba', 'test-daara-bidi') $$,
    '23514',
    null,
    'creer_daara : nom avec caractère bidirectionnel refusé'
);
select is(
    public.creer_daara('  Daara C  ', ' Test-Daara-C ', 'Touba', null, 'fr', 20),
    'test-daara-c',
    'creer_daara : crée la daara et renvoie le slug normalisé'
);
select results_eq(
    $$ select nom, ville from public.daaras where slug = 'test-daara-c' $$,
    $$ values ('Daara C', 'Touba') $$,
    'creer_daara : le créateur voit sa daara'
);
select ok(
    public.has_role((select id from public.daaras where slug = 'test-daara-c'), array['admin']::public.role_membre[]),
    'creer_daara : le créateur est admin'
);
select results_eq(
    $$ select table_name, action from public.audit_log
       where daara_id = (select id from public.daaras where slug = 'test-daara-c') order by table_name $$,
    $$ values ('daaras', 'INSERT'), ('memberships', 'INSERT') $$,
    'creer_daara : création journalisée (daara + membership)'
);
select throws_ok(
    $$ select public.creer_daara('Daara pirate', 'test-daara-a') $$,
    '23505',
    null,
    'creer_daara : slug déjà pris refusé'
);
select throws_ok(
    $$ select public.creer_daara('Daara invalide', 'daara a!') $$,
    '23514',
    null,
    'creer_daara : slug invalide refusé'
);
select throws_ok(
    $$ select public.creer_daara('X', 'test-daara-x') $$,
    '23514',
    null,
    'creer_daara : nom trop court refusé'
);
select lives_ok(
    $$ select public.creer_daara('Daara C2', 'test-daara-c2'); select public.creer_daara('Daara C3', 'test-daara-c3') $$,
    'creer_daara : jusqu''à 3 daaras par utilisateur'
);
select throws_ok(
    $$ select public.creer_daara('Daara C4', 'test-daara-c4') $$,
    'P0001',
    'limite_daaras',
    'creer_daara : 4e daara refusée'
);

-- -----------------------------------------------------------------------------------------------------
-- anon : aucun accès
-- -----------------------------------------------------------------------------------------------------
reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
    $$ select id from public.daaras $$,
    '42501',
    null,
    'anon : lecture des daaras refusée'
);
select throws_ok(
    $$ select id from public.profiles $$,
    '42501',
    null,
    'anon : lecture des profils refusée'
);
select throws_ok(
    $$ select public.creer_daara('Daara anonyme', 'test-daara-anon') $$,
    '42501',
    null,
    'anon : creer_daara refusée'
);
select throws_ok(
    $$ select id from public.memberships $$,
    '42501',
    null,
    'anon : lecture des memberships refusée'
);
select throws_ok(
    $$ select id from public.audit_log $$,
    '42501',
    null,
    'anon : lecture du journal refusée'
);
select throws_ok(
    $$ select user_id from public.platform_admins $$,
    '42501',
    null,
    'anon : lecture de platform_admins refusée'
);
select throws_ok(
    $$ select public.has_role('00000000-0000-0000-0000-00000000000a', array['admin']::public.role_membre[]) $$,
    '42501',
    null,
    'anon : has_role refusé'
);
select throws_ok(
    $$ select public.membres_administres() $$,
    '42501',
    null,
    'anon : membres_administres refusé'
);

reset role;
select * from finish();
rollback;
