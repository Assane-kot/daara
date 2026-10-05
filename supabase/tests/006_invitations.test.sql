-- S2.5a : invitations (docs/features/invitations.md « Cas de test », LLD §4, ADR-009, audits sécurité et RLS S2.5a).
-- Jeu : daara P (admins A et A2, enseignant E) ; daara R (admin B) ; invités : U1 (e-mail confirmé), U2 (téléphone
-- confirmé), U3 (ancien parent désactivé de P), U4 (e-mail non confirmé), U5 (complice d'A2), U6 (facteur TOTP vérifié).
begin;

create extension if not exists pgtap with schema extensions;

select plan(78);

create schema tests;
grant usage on schema tests to authenticated, anon;

create function tests.connecter(p_user uuid, p_aal text default 'aal1')
returns void
language plpgsql
as $$
begin
    perform set_config(
        'request.jwt.claims',
        case when p_user is null then '' else json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text end,
        true
    );
end;
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;

-- Jetons renvoyés par creer_invitation, rangés sous une clé de test.
create table tests.jetons (cle text primary key, jeton text not null);
grant select, insert on tests.jetons to authenticated;
create function tests.inviter(p_cle text, p_daara uuid, p_role public.role_membre, p_email text, p_telephone text)
returns text
language sql
as $$
    insert into tests.jetons (cle, jeton)
    select p_cle, c.jeton from public.creer_invitation(p_daara, p_role, p_email, p_telephone, null, null, 'fr') c
    returning jeton;
$$;
create function tests.j(p_cle text) returns text language sql stable as $$ select jeton from tests.jetons where cle = p_cle $$;
grant execute on function tests.inviter(text, uuid, public.role_membre, text, text) to authenticated;
grant execute on function tests.j(text) to authenticated;
-- Invitations écrites directement (en postgres) : jeton fixe et son haché.
create function tests.jeton(p_lettre text) returns text language sql immutable as $$ select repeat(p_lettre, 43) $$;
grant execute on function tests.jeton(text) to authenticated;

insert into auth.users (id, email, phone, aud, role, email_confirmed_at, phone_confirmed_at, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000006a1', 'admin.p6@test.local', null, 'authenticated', 'authenticated', now(), null, '{"nom": "Diop"}'),
    ('00000000-0000-0000-0000-0000000006a3', 'admin2.p6@test.local', null, 'authenticated', 'authenticated', now(), null, '{"nom": "Gaye"}'),
    ('00000000-0000-0000-0000-0000000006a2', 'ens.p6@test.local', null, 'authenticated', 'authenticated', now(), null, '{"nom": "Fall"}'),
    ('00000000-0000-0000-0000-0000000006b1', 'admin.r6@test.local', null, 'authenticated', 'authenticated', now(), null, '{"nom": "Sow"}'),
    ('00000000-0000-0000-0000-0000000006c1', 'invite.un@test.local', null, 'authenticated', 'authenticated', now(), null, '{"nom": "Ndiaye"}'),
    ('00000000-0000-0000-0000-0000000006c2', null, '221770001122', 'authenticated', 'authenticated', null, now(), '{}'),
    ('00000000-0000-0000-0000-0000000006c3', 'ancien.parent@test.local', null, 'authenticated', 'authenticated', now(), null, '{"nom": "Faye"}'),
    ('00000000-0000-0000-0000-0000000006c4', 'pas.confirme@test.local', null, 'authenticated', 'authenticated', null, null, '{}'),
    ('00000000-0000-0000-0000-0000000006c5', 'complice@test.local', null, 'authenticated', 'authenticated', now(), null, '{}'),
    ('00000000-0000-0000-0000-0000000006c6', 'avec.facteur@test.local', null, 'authenticated', 'authenticated', now(), null, '{}');

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret) values
    ('00000000-0000-0000-0000-0000000006f6', '00000000-0000-0000-0000-0000000006c6', 'Téléphone', 'totp', 'verified', now(), now(), 'X');

insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000060a', 'Daara P6', 'test-daara-p6', '00000000-0000-0000-0000-0000000006a1'),
    ('00000000-0000-0000-0000-00000000060b', 'Daara R6', 'test-daara-r6', '00000000-0000-0000-0000-0000000006b1');

insert into public.memberships (daara_id, user_id, role, actif) values
    ('00000000-0000-0000-0000-00000000060a', '00000000-0000-0000-0000-0000000006a1', 'admin', true),
    ('00000000-0000-0000-0000-00000000060a', '00000000-0000-0000-0000-0000000006a3', 'admin', true),
    ('00000000-0000-0000-0000-00000000060a', '00000000-0000-0000-0000-0000000006a2', 'enseignant', true),
    ('00000000-0000-0000-0000-00000000060b', '00000000-0000-0000-0000-0000000006b1', 'admin', true),
    ('00000000-0000-0000-0000-00000000060a', '00000000-0000-0000-0000-0000000006c3', 'parent', true);
-- U3 : ancien parent, désactivé (nom figé).
update public.memberships set actif = false, nom_affiche = 'Awa Faye' where user_id = '00000000-0000-0000-0000-0000000006c3';

set local role authenticated;

-- ---------------------------------------------------------------------------------------------------
-- creer_invitation : droits
-- ---------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000006a1', 'aal1');
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'enseignant', 'x@test.local', null, null, null, 'fr') $$,
    '42501', 'admin_aal2_requis', 'creer_invitation : admin en aal1 refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000006a2', 'aal2');
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'parent', 'x@test.local', null, null, null, 'fr') $$,
    '42501', 'admin_aal2_requis', 'creer_invitation : enseignant refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000006c6', 'aal2');
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'parent', 'x@test.local', null, null, null, 'fr') $$,
    '42501', 'admin_aal2_requis', 'creer_invitation : utilisateur sans daara refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000006b1', 'aal2');
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'parent', 'x@test.local', null, null, null, 'fr') $$,
    '42501', 'admin_aal2_requis', 'creer_invitation : admin d''une autre daara refusé'
);

-- creer_invitation : validation
select tests.connecter('00000000-0000-0000-0000-0000000006a1', 'aal2');
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060b', 'parent', 'x@test.local', null, null, null, 'fr') $$,
    '42501', 'admin_aal2_requis', 'creer_invitation : l''admin de P ne crée rien dans R'
);
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'apprenant', 'x@test.local', null, null, null, 'fr') $$,
    '22023', 'role_invalide', 'creer_invitation : rôle apprenant refusé (sprint 4)'
);
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'parent', 'x@test.local', '+221770000000', null, null, 'fr') $$,
    '22023', 'contact_invalide', 'creer_invitation : e-mail ET téléphone refusés'
);
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'parent', '  ', null, null, null, 'fr') $$,
    '22023', 'contact_invalide', 'creer_invitation : aucun contact refusé'
);
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'parent', 'pas-un-email', null, null, null, 'fr') $$,
    '23514', 'donnee_invalide', 'creer_invitation : e-mail invalide refusé'
);
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'parent', null, '770001122', null, null, 'fr') $$,
    '23514', 'donnee_invalide', 'creer_invitation : téléphone hors E.164 refusé'
);
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'parent', 'x@test.local', null, 'Fatou' || chr(8238), null, 'fr') $$,
    '23514', 'donnee_invalide', 'creer_invitation : caractère bidirectionnel dans le nom refusé'
);
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'enseignant', 'ENS.P6@test.local', null, null, null, 'fr') $$,
    '23505', 'deja_membre', 'creer_invitation : contact déjà membre actif avec ce rôle refusé'
);

-- creer_invitation : création, jeton, normalisation, doublon annulé
select matches(
    tests.inviter('a', '00000000-0000-0000-0000-00000000060a', 'enseignant', '  Invite.UN@test.local ', null),
    '^[A-Za-z0-9_-]{43}$',
    'creer_invitation : jeton de 43 caractères base64url renvoyé une fois'
);
select is(
    (select email from public.invitations where email = 'invite.un@test.local'),
    'invite.un@test.local',
    'creer_invitation : e-mail en minuscules, espaces retirés'
);
select lives_ok(
    $$ select tests.inviter('b', '00000000-0000-0000-0000-00000000060a', 'enseignant', 'invite.un@test.local', null) $$,
    'creer_invitation : nouvelle invitation identique (« Renvoyer »)'
);
select isnt(tests.j('a'), tests.j('b'), 'creer_invitation : nouveau jeton à chaque invitation');
select results_eq(
    $$ select count(*) filter (where revoked_at is null)::int, count(*)::int from public.invitations where email = 'invite.un@test.local' $$,
    $$ values (1, 2) $$,
    'creer_invitation : l''invitation précédente identique est annulée'
);
select lives_ok(
    $$ select tests.inviter('c', '00000000-0000-0000-0000-00000000060a', 'parent', null, '+221770001122') $$,
    'creer_invitation : invitation par téléphone (E.164)'
);
select lives_ok(
    $$ select tests.inviter('d', '00000000-0000-0000-0000-00000000060a', 'admin', 'invite.un@test.local', null) $$,
    'creer_invitation : invitation admin'
);
select lives_ok(
    $$ select tests.inviter('e', '00000000-0000-0000-0000-00000000060a', 'parent', 'ancien.parent@test.local', null) $$,
    'creer_invitation : un ancien membre désactivé peut être réinvité (pas « déjà membre »)'
);
select lives_ok(
    $$ select tests.inviter('k', '00000000-0000-0000-0000-00000000060a', 'parent', 'avec.facteur@test.local', null) $$,
    'creer_invitation : invitation d''un compte avec facteur TOTP'
);
select lives_ok(
    $$ select tests.inviter('m', '00000000-0000-0000-0000-00000000060a', 'parent', 'ens.p6@test.local', null) $$,
    'creer_invitation : l''enseignant E invité aussi comme parent'
);

-- ---------------------------------------------------------------------------------------------------
-- Lecture et journal : admin de la daara seulement, jamais le haché du jeton ; aucune écriture directe
-- ---------------------------------------------------------------------------------------------------
select is(
    (select count(*)::int from public.invitations where daara_id = '00000000-0000-0000-0000-00000000060a'),
    7,
    'lecture : l''admin voit les invitations de sa daara'
);
select throws_ok(
    $$ select token_hash from public.invitations $$,
    '42501', null, 'lecture : token_hash illisible, même par l''admin'
);
select is(
    (select count(*)::int from public.audit_log where table_name = 'invitations'
       and (new_data ? 'token_hash' or old_data ? 'token_hash')),
    0,
    'journal : le haché du jeton n''est jamais copié dans audit_log'
);
select ok(
    (select count(*) from public.audit_log where table_name = 'invitations') > 0,
    'journal : les invitations sont journalisées'
);
select throws_ok(
    $$ insert into public.invitations (daara_id, role, email, token_hash) values ('00000000-0000-0000-0000-00000000060a', 'admin', 'x@test.local', repeat('0', 64)) $$,
    '42501', null, 'écriture directe refusée (insert)'
);
select throws_ok(
    $$ update public.invitations set role = 'admin' $$,
    '42501', null, 'écriture directe refusée (update)'
);
select throws_ok(
    $$ delete from public.invitations $$,
    '42501', null, 'écriture directe refusée (delete)'
);
select tests.connecter('00000000-0000-0000-0000-0000000006a2', 'aal2');
select is_empty($$ select id from public.invitations $$, 'lecture : l''enseignant ne voit aucune invitation');
select tests.connecter('00000000-0000-0000-0000-0000000006b1', 'aal2');
select is_empty($$ select id from public.invitations $$, 'lecture : l''admin d''une autre daara ne voit pas celles de P');
select is_empty($$ select id from public.audit_log where table_name = 'invitations' $$, 'journal : celui de P invisible pour l''admin de R');

-- revoquer_invitation
select throws_ok(
    format('select public.revoquer_invitation(%L)', (select i.id from public.invitations i limit 1)),
    '42501', 'admin_aal2_requis', 'revoquer_invitation : admin d''une autre daara refusé'
);
select throws_ok(
    $$ select public.revoquer_invitation('00000000-0000-0000-0000-0000000006ff') $$,
    '42501', 'admin_aal2_requis', 'revoquer_invitation : invitation inconnue, même erreur'
);
select tests.connecter('00000000-0000-0000-0000-0000000006a1', 'aal2');
select lives_ok(
    $$ select tests.inviter('f', '00000000-0000-0000-0000-00000000060a', 'parent', 'a.revoquer@test.local', null) $$,
    'revoquer_invitation : invitation à révoquer créée'
);
select lives_ok(
    $$ select public.revoquer_invitation((select id from public.invitations where email = 'a.revoquer@test.local')) $$,
    'revoquer_invitation : l''admin aal2 révoque'
);

-- ---------------------------------------------------------------------------------------------------
-- accepter_invitation
-- ---------------------------------------------------------------------------------------------------
select tests.connecter(null);
select throws_ok(
    $$ select public.accepter_invitation(tests.j('b')) $$,
    '42501', 'non_authentifie', 'accepter : sans session refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000006c1', 'aal1');
select throws_ok($$ select public.accepter_invitation('court') $$, '22023', 'jeton_invalide', 'accepter : jeton mal formé');
select throws_ok($$ select public.accepter_invitation(tests.jeton('q')) $$, '22023', 'jeton_invalide', 'accepter : jeton inconnu');
select throws_ok(
    $$ select public.accepter_invitation(tests.j('a')) $$,
    '22023', 'invitation_revoquee', 'accepter : invitation remplacée (révoquée)'
);
select throws_ok(
    $$ select public.accepter_invitation(tests.j('f')) $$,
    '22023', 'invitation_revoquee', 'accepter : invitation révoquée par l''admin'
);
select tests.connecter('00000000-0000-0000-0000-0000000006c3', 'aal1');
select throws_ok(
    $$ select public.accepter_invitation(tests.j('b')) $$,
    '42501', 'contact_different', 'accepter : contact différent refusé (lien transmis à un autre compte)'
);
select tests.connecter('00000000-0000-0000-0000-0000000006c4', 'aal1');
select throws_ok(
    $$ select public.accepter_invitation(tests.j('b')) $$,
    '42501', 'contact_different', 'accepter : e-mail non confirmé refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000006c6', 'aal1');
select throws_ok(
    $$ select public.accepter_invitation(tests.j('k')) $$,
    '42501', 'aal2_requis', 'accepter : compte avec facteur vérifié en aal1 refusé (même pour un rôle non admin)'
);

select tests.connecter('00000000-0000-0000-0000-0000000006c1', 'aal1');
select is(public.accepter_invitation(tests.j('b')), 'test-daara-p6', 'accepter : l''invité par e-mail rejoint la daara (slug renvoyé)');
select results_eq(
    $$ select daara_id, role, actif from public.memberships where user_id = '00000000-0000-0000-0000-0000000006c1' $$,
    $$ values ('00000000-0000-0000-0000-00000000060a'::uuid, 'enseignant'::public.role_membre, true) $$,
    'accepter : un seul membership, daara et rôle de l''invitation'
);
select ok(public.is_member('00000000-0000-0000-0000-00000000060a'), 'accepter : accès immédiat à la daara');
select throws_ok(
    $$ select public.accepter_invitation(tests.j('b')) $$,
    '22023', 'invitation_utilisee', 'accepter : jeton déjà utilisé'
);
select throws_ok(
    $$ select public.accepter_invitation(tests.j('d')) $$,
    '42501', 'aal2_requis', 'accepter : invitation admin refusée en aal1'
);
select tests.connecter('00000000-0000-0000-0000-0000000006c1', 'aal2');
select is(public.accepter_invitation(tests.j('d')), 'test-daara-p6', 'accepter : invitation admin acceptée en aal2');

select tests.connecter('00000000-0000-0000-0000-0000000006c2', 'aal1');
select is(public.accepter_invitation(tests.j('c')), 'test-daara-p6', 'accepter : invité par téléphone (chiffres comparés)');

select tests.connecter('00000000-0000-0000-0000-0000000006c3', 'aal1');
select is(public.accepter_invitation(tests.j('e')), 'test-daara-p6', 'accepter : ancien membre réinvité');
select results_eq(
    $$ select actif, nom_affiche from public.memberships where user_id = '00000000-0000-0000-0000-0000000006c3' $$,
    $$ values (true, null::text) $$,
    'accepter : membership réactivé, nom figé effacé (une seule ligne)'
);

-- ---------------------------------------------------------------------------------------------------
-- Admin retiré : ses invitations ne valent plus ; membre désactivé : les invitations vers lui sont annulées
-- ---------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000006a3', 'aal2');
select lives_ok(
    $$ select tests.inviter('n', '00000000-0000-0000-0000-00000000060a', 'admin', 'complice@test.local', null) $$,
    'admin retiré : A2 invite un complice comme admin'
);
select tests.connecter('00000000-0000-0000-0000-0000000006a1', 'aal2');
select lives_ok(
    $$ select public.definir_actif((select id from public.memberships where user_id = '00000000-0000-0000-0000-0000000006a3'), false) $$,
    'admin retiré : A désactive A2'
);
select isnt(
    (select revoked_at from public.invitations where email = 'complice@test.local'),
    null,
    'admin retiré : ses invitations en attente sont révoquées'
);
select tests.connecter('00000000-0000-0000-0000-0000000006c5', 'aal2');
select throws_ok(
    $$ select public.accepter_invitation(tests.j('n')) $$,
    '22023', 'invitation_revoquee', 'admin retiré : le complice ne devient pas admin'
);
select tests.connecter('00000000-0000-0000-0000-0000000006a1', 'aal2');
select lives_ok(
    $$ select public.definir_actif((select id from public.memberships where user_id = '00000000-0000-0000-0000-0000000006a2'), false) $$,
    'membre désactivé : A désactive l''enseignant E'
);
select isnt(
    (select revoked_at from public.invitations where email = 'ens.p6@test.local'),
    null,
    'membre désactivé : l''invitation en attente vers son contact est révoquée'
);

-- ---------------------------------------------------------------------------------------------------
-- En postgres : auteur plus admin (sans passer par le trigger), expiration, déjà membre, quotas, suspension
-- ---------------------------------------------------------------------------------------------------
reset role;
insert into public.invitations (daara_id, role, email, token_hash, expires_at, invited_by) values
    ('00000000-0000-0000-0000-00000000060a', 'parent', 'invite.un@test.local', public.hacher_jeton(tests.jeton('g')), now() - interval '1 minute', '00000000-0000-0000-0000-0000000006a1'),
    ('00000000-0000-0000-0000-00000000060a', 'enseignant', 'invite.un@test.local', public.hacher_jeton(tests.jeton('h')), now() + interval '1 day', '00000000-0000-0000-0000-0000000006a1'),
    ('00000000-0000-0000-0000-00000000060a', 'parent', 'complice@test.local', public.hacher_jeton(tests.jeton('p')), now() + interval '1 day', '00000000-0000-0000-0000-0000000006a3');
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000006c1', 'aal1');
select throws_ok(
    $$ select public.accepter_invitation(tests.jeton('g')) $$,
    '22023', 'invitation_expiree', 'accepter : invitation expirée'
);
select is(public.accepter_invitation(tests.jeton('h')), 'test-daara-p6', 'accepter : déjà membre actif avec ce rôle, invitation consommée');
select is(
    (select count(*)::int from public.memberships where user_id = '00000000-0000-0000-0000-0000000006c1' and role = 'enseignant'),
    1,
    'accepter : pas de membership en double'
);
select tests.connecter('00000000-0000-0000-0000-0000000006c5', 'aal1');
select throws_ok(
    $$ select public.accepter_invitation(tests.jeton('p')) $$,
    '22023', 'invitation_revoquee', 'accepter : auteur qui n''est plus admin actif → invitation sans valeur'
);
reset role;

select is(
    (select user_id from public.audit_log where table_name = 'memberships' and action = 'INSERT'
       and new_data ->> 'user_id' = '00000000-0000-0000-0000-0000000006c2'),
    '00000000-0000-0000-0000-0000000006c2'::uuid,
    'journal : l''arrivée d''un membre est tracée avec son auteur'
);

-- Quota par daara : 50 sur 24 h.
insert into public.invitations (daara_id, role, email, token_hash, invited_by)
select '00000000-0000-0000-0000-00000000060b', 'parent', 'quota' || n || '@test.local', public.hacher_jeton(lpad(n::text, 43, 'k')), '00000000-0000-0000-0000-0000000006b1'
from generate_series(1, 50) as n;
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000006b1', 'aal2');
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060b', 'parent', null, '+221770009999', null, null, 'fr') $$,
    'P0001', 'quota_invitations', 'quota : 51e invitation du jour dans la daara refusée'
);
reset role;

-- Quota par auteur : 50 sur 24 h toutes daaras confondues (A en a créé dans R, au nom de R pour le test).
update public.invitations set invited_by = '00000000-0000-0000-0000-0000000006a1'
where daara_id = '00000000-0000-0000-0000-00000000060b';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000006a1', 'aal2');
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'parent', null, '+221770008888', null, null, 'fr') $$,
    'P0001', 'quota_invitations', 'quota : un auteur ne dépasse pas 50 invitations par jour, même dans une autre daara'
);
reset role;

-- Plafond global des invitations par e-mail (quota Brevo) ; le téléphone n'est pas concerné.
delete from public.invitations where daara_id = '00000000-0000-0000-0000-00000000060b';
insert into public.invitations (daara_id, role, email, token_hash, invited_by, created_at)
select '00000000-0000-0000-0000-00000000060b', 'parent', 'global' || n || '@test.local', public.hacher_jeton(lpad(n::text, 43, 'w')), '00000000-0000-0000-0000-0000000006b1', now() - interval '23 hours'
from generate_series(1, 200) as n;
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000006a1', 'aal2');
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060a', 'parent', 'encore@test.local', null, null, null, 'fr') $$,
    'P0001', 'quota_global_email', 'quota : plafond global des invitations par e-mail (Brevo)'
);
reset role;

-- Daara suspendue : ni création ni acceptation.
delete from public.invitations where daara_id = '00000000-0000-0000-0000-00000000060b';
update public.daaras set statut = 'suspendue' where id = '00000000-0000-0000-0000-00000000060b';
insert into public.invitations (daara_id, role, email, token_hash, invited_by) values
    ('00000000-0000-0000-0000-00000000060b', 'parent', 'invite.un@test.local', public.hacher_jeton(tests.jeton('s')), '00000000-0000-0000-0000-0000000006b1');
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000006b1', 'aal2');
select throws_ok(
    $$ select * from public.creer_invitation('00000000-0000-0000-0000-00000000060b', 'parent', null, '+221770007777', null, null, 'fr') $$,
    '42501', 'daara_suspendue', 'daara suspendue : création refusée'
);
select tests.connecter('00000000-0000-0000-0000-0000000006c1', 'aal1');
select throws_ok(
    $$ select public.accepter_invitation(tests.jeton('s')) $$,
    '42501', 'daara_suspendue', 'daara suspendue : acceptation refusée'
);
reset role;

-- ---------------------------------------------------------------------------------------------------
-- Fonctions internes, anon, hook
-- ---------------------------------------------------------------------------------------------------
select ok(
    not has_function_privilege('authenticated', 'public.invitation_par_jeton(text)', 'execute')
    and has_function_privilege('service_role', 'public.invitation_par_jeton(text)', 'execute'),
    'invitation_par_jeton : service_role uniquement'
);
select results_eq(
    format('select daara_nom, role, telephone, etat, compte_existant from public.invitation_par_jeton(%L)', tests.j('c')),
    $$ values ('Daara P6', 'parent'::public.role_membre, '+221770001122', 'utilisee', true) $$,
    'invitation_par_jeton : aperçu (daara, rôle, contact, état, compte existant)'
);
select is_empty(
    $$ select * from public.invitation_par_jeton('pas-un-jeton') $$,
    'invitation_par_jeton : jeton invalide, aucune ligne'
);
select is(
    (select compte_existant from public.invitation_par_jeton(tests.j('f'))),
    false,
    'compte existant : une adresse sans compte confirmé ne compte pas'
);
select ok(
    not has_function_privilege('authenticated', 'public.definir_auteur(uuid)', 'execute')
    and not has_function_privilege('service_role', 'public.definir_auteur(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.compte_du_contact(text, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.hacher_jeton(text)', 'execute'),
    'fonctions internes non exécutables par le client'
);
select ok(
    not has_function_privilege('anon', 'public.accepter_invitation(text)', 'execute')
    and not has_function_privilege('anon', 'public.creer_invitation(uuid, public.role_membre, text, text, text, text, text)', 'execute')
    and not has_table_privilege('anon', 'public.invitations', 'select'),
    'anon : aucune RPC d''invitation, aucune lecture'
);
select ok(
    not has_function_privilege('anon', 'public.avant_creation_utilisateur(jsonb)', 'execute')
    and has_function_privilege('supabase_auth_admin', 'public.avant_creation_utilisateur(jsonb)', 'execute'),
    'hook : exécutable par supabase_auth_admin seulement'
);
select is(
    public.avant_creation_utilisateur('{"user": {"phone": "221770009999", "app_metadata": {"provider": "phone"}}}'::jsonb) -> 'error' ->> 'http_code',
    '403',
    'hook : inscription publique par téléphone refusée'
);
select is(
    public.avant_creation_utilisateur('{"user": {"email": "nouveau@test.local", "phone": "", "app_metadata": {"provider": "email"}}}'::jsonb),
    '{}'::jsonb,
    'hook : inscription par e-mail acceptée'
);

select * from finish();
rollback;
