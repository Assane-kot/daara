-- S2.5b : acceptation d'une invitation par téléphone avec création du compte (accept-invitation, ADR-009, décision I3).
-- Jeu : daara T (admin A) ; invitations par téléphone (parent, admin) et par e-mail ; comptes créés « par l'API
-- d'administration » (téléphone confirmé, marqueur `app_metadata.invitation`).
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create schema tests;
create function tests.jeton(p_lettre text) returns text language sql immutable as $$ select repeat(p_lettre, 43) $$;
grant usage on schema tests to service_role, authenticated;
grant execute on function tests.jeton(text) to service_role, authenticated;

insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000007a1', 'admin.t7@test.local', 'authenticated', 'authenticated', now(), '{}');
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000070a', 'Daara T7', 'test-daara-t7', '00000000-0000-0000-0000-0000000007a1');
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000070a', '00000000-0000-0000-0000-0000000007a1', 'admin');

insert into public.invitations (id, daara_id, role, email, telephone, token_hash, invited_by) values
    ('00000000-0000-0000-0000-0000000007e1', '00000000-0000-0000-0000-00000000070a', 'parent', null, '+221770007001', public.hacher_jeton(tests.jeton('a')), '00000000-0000-0000-0000-0000000007a1'),
    ('00000000-0000-0000-0000-0000000007e2', '00000000-0000-0000-0000-00000000070a', 'admin', null, '+221770007002', public.hacher_jeton(tests.jeton('b')), '00000000-0000-0000-0000-0000000007a1'),
    ('00000000-0000-0000-0000-0000000007e3', '00000000-0000-0000-0000-00000000070a', 'parent', 'mail.t7@test.local', null, public.hacher_jeton(tests.jeton('c')), '00000000-0000-0000-0000-0000000007a1');

-- Comptes « créés par accept-invitation » : téléphone confirmé, marqueur de l'invitation.
insert into auth.users (id, phone, aud, role, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000007c2', '221770007002', 'authenticated', 'authenticated', now(), '{"invitation": "00000000-0000-0000-0000-0000000007e2"}', '{}'),
    -- Même numéro que l'invitation a, mais sans marqueur (compte préexistant) ; marqueur d'une autre invitation.
    ('00000000-0000-0000-0000-0000000007c3', '221770007009', 'authenticated', 'authenticated', now(), '{}', '{}'),
    ('00000000-0000-0000-0000-0000000007c4', '221770007001', 'authenticated', 'authenticated', now(), '{"invitation": "00000000-0000-0000-0000-0000000007e2"}', '{}');

select ok(
    has_function_privilege('service_role', 'public.accepter_invitation_nouveau_compte(text, uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.accepter_invitation_nouveau_compte(text, uuid)', 'execute')
    and not has_function_privilege('anon', 'public.accepter_invitation_nouveau_compte(text, uuid)', 'execute'),
    'accepter_invitation_nouveau_compte : service_role uniquement'
);
select ok(
    not has_function_privilege('authenticated', 'public.accepter_invitation_pour(text, uuid, boolean)', 'execute')
    and not has_function_privilege('service_role', 'public.accepter_invitation_pour(text, uuid, boolean)', 'execute'),
    'accepter_invitation_pour : interne, exécutable par personne'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);

select throws_ok(
    $$ select public.accepter_invitation_nouveau_compte(tests.jeton('a'), '00000000-0000-0000-0000-0000000007c3') $$,
    '42501', 'contact_different', 'nouveau compte : compte sans marqueur ni bon numéro refusé'
);
select throws_ok(
    $$ select public.accepter_invitation_nouveau_compte(tests.jeton('a'), '00000000-0000-0000-0000-0000000007c4') $$,
    '42501', 'contact_different', 'nouveau compte : bon numéro mais marqueur d''une autre invitation refusé'
);
reset role;
-- Le numéro est unique dans auth.users : le compte au mauvais marqueur cède la place au bon.
delete from auth.users where id = '00000000-0000-0000-0000-0000000007c4';
insert into auth.users (id, phone, aud, role, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000007c1', '221770007001', 'authenticated', 'authenticated', now(), '{"invitation": "00000000-0000-0000-0000-0000000007e1"}', '{}');
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select throws_ok(
    $$ select public.accepter_invitation_nouveau_compte(tests.jeton('c'), '00000000-0000-0000-0000-0000000007c1') $$,
    '42501', 'contact_different', 'nouveau compte : jamais pour une invitation par e-mail'
);
select throws_ok(
    $$ select public.accepter_invitation_nouveau_compte(tests.jeton('z'), '00000000-0000-0000-0000-0000000007c1') $$,
    '22023', 'jeton_invalide', 'nouveau compte : jeton inconnu'
);

select is(
    public.accepter_invitation_nouveau_compte(tests.jeton('a'), '00000000-0000-0000-0000-0000000007c1'),
    'test-daara-t7',
    'nouveau compte : le compte créé pour l''invitation rejoint la daara'
);
select throws_ok(
    $$ select public.accepter_invitation_nouveau_compte(tests.jeton('a'), '00000000-0000-0000-0000-0000000007c1') $$,
    '22023', 'invitation_utilisee', 'nouveau compte : invitation utilisable une seule fois'
);
select is(
    public.accepter_invitation_nouveau_compte(tests.jeton('b'), '00000000-0000-0000-0000-0000000007c2'),
    'test-daara-t7',
    'nouveau compte : invitation admin par téléphone acceptée (accès fermé jusqu''au TOTP)'
);
reset role;

select results_eq(
    $$ select role, actif from public.memberships where user_id in ('00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-0000000007c2') order by role $$,
    $$ values ('admin'::public.role_membre, true), ('parent'::public.role_membre, true) $$,
    'nouveau compte : memberships créés avec le rôle de chaque invitation'
);
select is(
    (select user_id from public.audit_log where table_name = 'memberships' and action = 'INSERT'
       and new_data ->> 'user_id' = '00000000-0000-0000-0000-0000000007c1'),
    '00000000-0000-0000-0000-0000000007c1'::uuid,
    'journal : auteur = le nouveau membre (definir_auteur dans la même transaction)'
);

-- Invitations inutilisables : expirée, révoquée, daara suspendue, auteur qui n'est plus admin, marqueur d'une autre daara.
insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000007a2', 'admin2.t7@test.local', 'authenticated', 'authenticated', now(), '{}'),
    ('00000000-0000-0000-0000-0000000007b1', 'admin.u7@test.local', 'authenticated', 'authenticated', now(), '{}');
insert into public.daaras (id, nom, slug, created_by, statut) values
    ('00000000-0000-0000-0000-00000000070b', 'Daara U7', 'test-daara-u7', '00000000-0000-0000-0000-0000000007b1', 'active');
insert into public.memberships (daara_id, user_id, role, actif) values
    ('00000000-0000-0000-0000-00000000070a', '00000000-0000-0000-0000-0000000007a2', 'admin', false),
    ('00000000-0000-0000-0000-00000000070b', '00000000-0000-0000-0000-0000000007b1', 'admin', true);
insert into public.invitations (id, daara_id, role, telephone, token_hash, invited_by, expires_at, revoked_at) values
    ('00000000-0000-0000-0000-0000000007e4', '00000000-0000-0000-0000-00000000070a', 'parent', '+221770007004', public.hacher_jeton(tests.jeton('d')), '00000000-0000-0000-0000-0000000007a1', now() - interval '1 minute', null),
    ('00000000-0000-0000-0000-0000000007e5', '00000000-0000-0000-0000-00000000070a', 'parent', '+221770007005', public.hacher_jeton(tests.jeton('e')), '00000000-0000-0000-0000-0000000007a1', now() + interval '1 day', now()),
    ('00000000-0000-0000-0000-0000000007e6', '00000000-0000-0000-0000-00000000070a', 'parent', '+221770007006', public.hacher_jeton(tests.jeton('f')), '00000000-0000-0000-0000-0000000007a2', now() + interval '1 day', null),
    ('00000000-0000-0000-0000-0000000007e7', '00000000-0000-0000-0000-00000000070b', 'parent', '+221770007007', public.hacher_jeton(tests.jeton('g')), '00000000-0000-0000-0000-0000000007b1', now() + interval '1 day', null);
insert into auth.users (id, phone, aud, role, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000007d4', '221770007004', 'authenticated', 'authenticated', now(), '{"invitation": "00000000-0000-0000-0000-0000000007e4"}', '{}'),
    ('00000000-0000-0000-0000-0000000007d5', '221770007005', 'authenticated', 'authenticated', now(), '{"invitation": "00000000-0000-0000-0000-0000000007e5"}', '{}'),
    ('00000000-0000-0000-0000-0000000007d6', '221770007006', 'authenticated', 'authenticated', now(), '{"invitation": "00000000-0000-0000-0000-0000000007e6"}', '{}'),
    -- Numéro de l'invitation de U7, marqueur d'une invitation de T7.
    ('00000000-0000-0000-0000-0000000007d7', '221770007007', 'authenticated', 'authenticated', now(), '{"invitation": "00000000-0000-0000-0000-0000000007e1"}', '{}');

select results_eq(
    $$ select etat from public.invitation_par_jeton(tests.jeton('d'))
       union all select etat from public.invitation_par_jeton(tests.jeton('e'))
       union all select etat from public.invitation_par_jeton(tests.jeton('f')) $$,
    $$ values ('expiree'), ('revoquee'), ('revoquee') $$,
    'aperçu : expirée, révoquée, auteur qui n''est plus admin → inutilisable avant toute création de compte'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select throws_ok(
    $$ select public.accepter_invitation_nouveau_compte(tests.jeton('d'), '00000000-0000-0000-0000-0000000007d4') $$,
    '22023', 'invitation_expiree', 'nouveau compte : invitation expirée'
);
select throws_ok(
    $$ select public.accepter_invitation_nouveau_compte(tests.jeton('e'), '00000000-0000-0000-0000-0000000007d5') $$,
    '22023', 'invitation_revoquee', 'nouveau compte : invitation révoquée'
);
select throws_ok(
    $$ select public.accepter_invitation_nouveau_compte(tests.jeton('f'), '00000000-0000-0000-0000-0000000007d6') $$,
    '22023', 'invitation_revoquee', 'nouveau compte : auteur qui n''est plus admin actif'
);
select throws_ok(
    $$ select public.accepter_invitation_nouveau_compte(tests.jeton('g'), '00000000-0000-0000-0000-0000000007d7') $$,
    '42501', 'contact_different', 'nouveau compte : marqueur d''une invitation d''une autre daara refusé'
);
reset role;
update public.daaras set statut = 'suspendue' where id = '00000000-0000-0000-0000-00000000070b';
select is(
    (select etat from public.invitation_par_jeton(tests.jeton('g'))),
    'suspendue',
    'aperçu : daara suspendue'
);
update auth.users set raw_app_meta_data = '{"invitation": "00000000-0000-0000-0000-0000000007e7"}' where id = '00000000-0000-0000-0000-0000000007d7';
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select throws_ok(
    $$ select public.accepter_invitation_nouveau_compte(tests.jeton('g'), '00000000-0000-0000-0000-0000000007d7') $$,
    '42501', 'daara_suspendue', 'nouveau compte : daara suspendue'
);
reset role;
select throws_ok(
    $$ insert into public.invitations (daara_id, role, email, token_hash) values ('00000000-0000-0000-0000-00000000070a', 'parent', 'a@b.sn,c@d.sn', repeat('0', 64)) $$,
    '23514', null, 'e-mail : adresses multiples refusées'
);

-- Invité admin sans facteur : pas de droits d'admin avant l'enrôlement TOTP.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000007c2", "role": "authenticated", "aal": "aal1"}', true);
select ok(
    not public.has_role('00000000-0000-0000-0000-00000000070a', array['admin']::public.role_membre[]),
    'nouveau compte admin : aucun droit d''admin en aal1 (TOTP imposé à la connexion)'
);
reset role;

select * from finish();
rollback;
