-- S2.7 : écriture du profil soumise à session_suffisante ; procédure super-admin de retrait des facteurs
-- (docs/exploitation.md, ADR-006). Jeu : U1 admin de D9 (2 facteurs, 1 session) et parent désactivé de E9, U2 sans daara
-- (1 facteur), U3 admin de E9 (témoin, 1 facteur), U4 parent de D9 sans facteur.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000009a1', 'admin.d9@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000009a2', 'seul.d9@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000009a3', 'temoin.d9@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000009a4', 'parent.d9@test.local', 'authenticated', 'authenticated', now());
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret) values
    ('00000000-0000-0000-0000-0000000009f1', '00000000-0000-0000-0000-0000000009a1', 'Téléphone', 'totp', 'verified', now(), now(), 'X'),
    ('00000000-0000-0000-0000-0000000009f2', '00000000-0000-0000-0000-0000000009a1', 'Tablette', 'totp', 'verified', now(), now(), 'X'),
    ('00000000-0000-0000-0000-0000000009f3', '00000000-0000-0000-0000-0000000009a2', 'Téléphone', 'totp', 'verified', now(), now(), 'X'),
    ('00000000-0000-0000-0000-0000000009f4', '00000000-0000-0000-0000-0000000009a3', 'Téléphone', 'totp', 'verified', now(), now(), 'X');
insert into auth.sessions (id, user_id, created_at, updated_at, aal) values
    ('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000009a1', now(), now(), 'aal2'),
    ('00000000-0000-0000-0000-0000000009e3', '00000000-0000-0000-0000-0000000009a3', now(), now(), 'aal2');
insert into auth.refresh_tokens (token, user_id, session_id, revoked, created_at, updated_at) values
    ('jeton-d9-a1', '00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000009e1', false, now(), now()),
    ('jeton-d9-a3', '00000000-0000-0000-0000-0000000009a3', '00000000-0000-0000-0000-0000000009e3', false, now(), now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000090a', 'Daara D9', 'test-daara-d9', '00000000-0000-0000-0000-0000000009a1'),
    ('00000000-0000-0000-0000-00000000090e', 'Daara E9', 'test-daara-e9', '00000000-0000-0000-0000-0000000009a3');
insert into public.memberships (daara_id, user_id, role, actif) values
    ('00000000-0000-0000-0000-00000000090a', '00000000-0000-0000-0000-0000000009a1', 'admin', true),
    ('00000000-0000-0000-0000-00000000090a', '00000000-0000-0000-0000-0000000009a4', 'parent', true),
    ('00000000-0000-0000-0000-00000000090e', '00000000-0000-0000-0000-0000000009a3', 'admin', true),
    ('00000000-0000-0000-0000-00000000090e', '00000000-0000-0000-0000-0000000009a1', 'parent', false);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text)
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
-- Nombre de profils modifiés (0 = refus RLS) : la fonction s'exécute avec les droits de l'appelant.
create function tests.renommer(p_id uuid)
returns integer language plpgsql as $$
declare n integer;
begin
    update public.profiles set nom = 'Renommé' where id = p_id;
    get diagnostics n = row_count;
    return n;
end;
$$;
grant execute on function tests.connecter(uuid, text), tests.renommer(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Profil : écriture soumise à session_suffisante (audit RLS S2.7)
-- ---------------------------------------------------------------------------------------------------
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000009a1', 'aal1');
select is(tests.renommer('00000000-0000-0000-0000-0000000009a1'), 0, 'avec facteur, en aal1 : son profil n''est pas modifiable');
select tests.connecter('00000000-0000-0000-0000-0000000009a1', 'aal2');
select is(tests.renommer('00000000-0000-0000-0000-0000000009a1'), 1, 'avec facteur, en aal2 : modifiable');
select is(tests.renommer('00000000-0000-0000-0000-0000000009a4'), 0, 'admin aal2 : profil d''un membre lisible mais non modifiable');
select tests.connecter('00000000-0000-0000-0000-0000000009a3', 'aal2');
select is(tests.renommer('00000000-0000-0000-0000-0000000009a4'), 0, 'admin d''une autre daara : non modifiable');
select tests.connecter('00000000-0000-0000-0000-0000000009a4', 'aal1');
select is(tests.renommer('00000000-0000-0000-0000-0000000009a4'), 1, 'sans facteur, en aal1 : son profil est modifiable');
reset role;

-- Aucun rôle de l'API ne peut l'exécuter.
set local role authenticated;
select throws_ok($$ select public.retirer_facteurs('00000000-0000-0000-0000-0000000009a1', 'perte du téléphone') $$, '42501', null,
    'authenticated : refusé');
set local role service_role;
select throws_ok($$ select public.retirer_facteurs('00000000-0000-0000-0000-0000000009a1', 'perte du téléphone') $$, '42501', null,
    'service_role : refusé');
set local role anon;
select throws_ok($$ select public.retirer_facteurs('00000000-0000-0000-0000-0000000009a1', 'perte du téléphone') $$, '42501', null,
    'anon : refusé');
reset role;

select throws_ok($$ select public.retirer_facteurs('00000000-0000-0000-0000-0000000009a1', '  ') $$, '22023', 'motif_requis',
    'motif obligatoire');
select throws_ok($$ select public.retirer_facteurs('00000000-0000-0000-0000-0000000009ff', 'perte du téléphone') $$, '22023',
    'utilisateur_inconnu', 'utilisateur inconnu');

select is(public.retirer_facteurs('00000000-0000-0000-0000-0000000009a1', 'Perte du téléphone, identité vérifiée en personne'), 2,
    'renvoie le nombre de facteurs retirés');
select is((select count(*)::int from auth.mfa_factors where user_id = '00000000-0000-0000-0000-0000000009a1'), 0, 'facteurs supprimés');
select is((select count(*)::int from auth.sessions where user_id = '00000000-0000-0000-0000-0000000009a1')
    + (select count(*)::int from auth.refresh_tokens where user_id = '00000000-0000-0000-0000-0000000009a1'), 0,
    'sessions et jetons de rafraîchissement révoqués');
select results_eq(
    $$ select daara_id, table_name, action, old_data ->> 'motif', (old_data ->> 'facteurs')::int from public.audit_log
       where record_id = '00000000-0000-0000-0000-0000000009a1' order by daara_id $$,
    $$ values ('00000000-0000-0000-0000-000000000000'::uuid, 'auth.mfa_factors'::text, 'DELETE'::text,
       'Perte du téléphone, identité vérifiée en personne'::text, 2),
       ('00000000-0000-0000-0000-00000000090a'::uuid, 'auth.mfa_factors'::text, 'DELETE'::text, null::text, 2) $$,
    'journal : motif sur la ligne plateforme seulement ; daara active seule (pas la daara où il est désactivé)');

select is(public.retirer_facteurs('00000000-0000-0000-0000-0000000009a2', 'Perte du téléphone'), 1, 'utilisateur sans daara');
select is((select daara_id from public.audit_log where record_id = '00000000-0000-0000-0000-0000000009a2'),
    '00000000-0000-0000-0000-000000000000'::uuid, 'journal : ligne « plateforme » pour un utilisateur sans daara');

select ok((select count(*) from auth.mfa_factors where user_id = '00000000-0000-0000-0000-0000000009a3') = 1
    and (select count(*) from auth.sessions where user_id = '00000000-0000-0000-0000-0000000009a3') = 1,
    'autre utilisateur intact');

select * from finish();
rollback;
