-- S2.4 : gestion des membres (docs/features/membres.md « Cas de test », LLD §3.2, §4).
-- Jeu : daara P (admins A1, A2, A3 ; enseignant E qui est aussi parent ; enseignant E2 ; parent Q avec un facteur TOTP ;
-- apprenant) ; daara R (admin R1, qui y est aussi enseignant).
begin;

create extension if not exists pgtap with schema extensions;

select plan(54);

create schema tests;
grant usage on schema tests to authenticated;

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

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000005a1', 'admin1.p@test.local', 'authenticated', 'authenticated', '{"prenom": "Awa", "nom": "Diop"}'),
    ('00000000-0000-0000-0000-0000000005a2', 'admin2.p@test.local', 'authenticated', 'authenticated', '{"prenom": "Moussa", "nom": "Fall"}'),
    ('00000000-0000-0000-0000-0000000005a3', 'ens.p@test.local', 'authenticated', 'authenticated', '{"prenom": "Ibou", "nom": "Sarr"}'),
    ('00000000-0000-0000-0000-0000000005a4', 'parent.p@test.local', 'authenticated', 'authenticated', '{"prenom": "Fatou", "nom": "Ndiaye"}'),
    ('00000000-0000-0000-0000-0000000005b1', 'admin.r@test.local', 'authenticated', 'authenticated', '{"prenom": "Omar", "nom": "Sow"}'),
    ('00000000-0000-0000-0000-0000000005a5', 'ens2.p@test.local', 'authenticated', 'authenticated', '{"prenom": "Aida", "nom": "Kane"}'),
    ('00000000-0000-0000-0000-0000000005a6', 'eleve.p@test.local', 'authenticated', 'authenticated', '{"prenom": "Bamba", "nom": "Fall"}'),
    ('00000000-0000-0000-0000-0000000005a7', 'admin3.p@test.local', 'authenticated', 'authenticated', '{"prenom": "Coumba", "nom": "Ba"}');

insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000050a', 'Daara P', 'test-daara-p', '00000000-0000-0000-0000-0000000005a1'),
    ('00000000-0000-0000-0000-00000000050b', 'Daara R', 'test-daara-r', '00000000-0000-0000-0000-0000000005b1');

insert into public.memberships (id, daara_id, user_id, role) values
    ('00000000-0000-0000-0000-0000000005e1', '00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005a1', 'admin'),
    ('00000000-0000-0000-0000-0000000005e2', '00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005a2', 'admin'),
    ('00000000-0000-0000-0000-0000000005e3', '00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005a3', 'enseignant'),
    ('00000000-0000-0000-0000-0000000005e4', '00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005a3', 'parent'),
    ('00000000-0000-0000-0000-0000000005e5', '00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005a4', 'parent'),
    ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-00000000050b', '00000000-0000-0000-0000-0000000005b1', 'admin'),
    ('00000000-0000-0000-0000-0000000005f2', '00000000-0000-0000-0000-00000000050b', '00000000-0000-0000-0000-0000000005b1', 'enseignant'),
    ('00000000-0000-0000-0000-0000000005e6', '00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005a5', 'enseignant'),
    ('00000000-0000-0000-0000-0000000005e7', '00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005a6', 'apprenant'),
    ('00000000-0000-0000-0000-0000000005e8', '00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005a7', 'admin');
-- A3 : admin déjà désactivé (cas « admin désactivé » ; n'entre pas dans le compte des admins actifs).
update public.memberships set actif = false where id = '00000000-0000-0000-0000-0000000005e8';

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret) values
    ('00000000-0000-0000-0000-0000000005c4', '00000000-0000-0000-0000-0000000005a4', 'Téléphone', 'totp', 'verified', now(), now(), 'X');

set local role authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Refus : admin aal1, enseignant, admin d'une autre daara, membership inconnu, écriture directe.
-- ---------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000005a1', 'aal1');
select throws_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e3', 'parent') $$,
    '42501', 'admin_aal2_requis', 'changer_role : admin en aal1 refusé'
);
select throws_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e3', false) $$,
    '42501', 'admin_aal2_requis', 'definir_actif : admin en aal1 refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000005a3', 'aal2');
select throws_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e5', 'enseignant') $$,
    '42501', 'admin_aal2_requis', 'changer_role : enseignant refusé'
);
select throws_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e5', false) $$,
    '42501', 'admin_aal2_requis', 'definir_actif : enseignant refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000005b1', 'aal2');
select throws_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e3', 'admin') $$,
    '42501', 'admin_aal2_requis', 'changer_role : admin d''une autre daara refusé'
);
select throws_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e3', false) $$,
    '42501', 'admin_aal2_requis', 'definir_actif : admin d''une autre daara refusé'
);
select throws_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005ff', false) $$,
    '42501', 'admin_aal2_requis', 'definir_actif : membership inconnu, même erreur (pas d''oracle)'
);
select tests.connecter('00000000-0000-0000-0000-0000000005a1', 'aal2');
select throws_ok(
    $$ update public.memberships set role = 'admin' where id = '00000000-0000-0000-0000-0000000005e3' $$,
    '42501', null, 'memberships : écriture directe refusée'
);

-- ---------------------------------------------------------------------------------------------------
-- changer_role par l'admin aal2
-- ---------------------------------------------------------------------------------------------------
select lives_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e5', 'enseignant') $$,
    'changer_role : l''admin aal2 change un parent en enseignant'
);
select is(
    (select role from public.memberships where id = '00000000-0000-0000-0000-0000000005e5'),
    'enseignant'::public.role_membre,
    'changer_role : rôle enregistré'
);
select lives_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e5', 'enseignant') $$,
    'changer_role : même rôle, sans effet ni erreur'
);
select throws_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e4', 'enseignant') $$,
    '23505', 'role_deja_attribue', 'changer_role : rôle déjà détenu par la personne dans la daara refusé'
);
select throws_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e5', 'apprenant') $$,
    '22023', 'role_invalide', 'changer_role : apprenant refusé (sprint 4)'
);
select throws_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e5', null) $$,
    '22023', 'role_invalide', 'changer_role : rôle nul refusé'
);

-- ---------------------------------------------------------------------------------------------------
-- definir_actif : désactivation (accès retiré, nom figé), réactivation
-- ---------------------------------------------------------------------------------------------------
select lives_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e5', false) $$,
    'definir_actif : l''admin aal2 désactive un membre'
);
select results_eq(
    $$ select actif, nom_affiche from public.memberships where id = '00000000-0000-0000-0000-0000000005e5' $$,
    $$ values (false, 'Fatou Ndiaye') $$,
    'definir_actif : membre inactif, nom figé dans nom_affiche'
);
select is_empty(
    $$ select id from public.profiles where id = '00000000-0000-0000-0000-0000000005a4' $$,
    'definir_actif : le profil du membre désactivé n''est plus lisible par l''admin'
);
select tests.connecter('00000000-0000-0000-0000-0000000005a4', 'aal2');
select ok(not public.is_member('00000000-0000-0000-0000-00000000050a'), 'definir_actif : le membre désactivé perd l''accès à la daara');
select is_empty(
    $$ select id from public.daaras where id = '00000000-0000-0000-0000-00000000050a' $$,
    'definir_actif : le membre désactivé ne lit plus la daara'
);
select tests.connecter('00000000-0000-0000-0000-0000000005a1', 'aal2');
select lives_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e5', true) $$,
    'definir_actif : l''admin aal2 réactive le membre'
);
select results_eq(
    $$ select actif, nom_affiche from public.memberships where id = '00000000-0000-0000-0000-0000000005e5' $$,
    $$ values (true, null::text) $$,
    'definir_actif : membre actif, nom_affiche effacé (profil de nouveau lisible)'
);
select throws_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e5', null) $$,
    '23514', 'donnee_invalide', 'definir_actif : état nul refusé'
);

-- ---------------------------------------------------------------------------------------------------
-- Dernier admin
-- ---------------------------------------------------------------------------------------------------
select lives_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e2', false) $$,
    'dernier admin : désactiver un admin quand il en reste un autre'
);
select throws_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e1', false) $$,
    '23514', 'dernier_admin', 'dernier admin : se désactiver soi-même refusé'
);
select throws_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e1', 'enseignant') $$,
    '23514', 'dernier_admin', 'dernier admin : changer son propre rôle refusé'
);
select lives_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e2', true) $$,
    'dernier admin : réactiver le second admin'
);
select lives_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e1', 'enseignant') $$,
    'dernier admin : changer son propre rôle quand un autre admin reste'
);
select throws_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e3', 'admin') $$,
    '42501', 'admin_aal2_requis', 'ancien admin redevenu enseignant : plus aucune action'
);

-- ---------------------------------------------------------------------------------------------------
-- Audits S2.4 : collègues désactivés, isolation, admin désactivé, anon, apprenant, auteur, seul admin à deux rôles
-- ---------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000005a2', 'aal2');
select lives_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e6', false) $$,
    'audit : l''admin désactive l''enseignante E2'
);
select tests.connecter('00000000-0000-0000-0000-0000000005a3', 'aal2');
select is_empty(
    $$ select nom_affiche from public.memberships where id = '00000000-0000-0000-0000-0000000005e6' $$,
    'enseignant : ne voit ni la ligne ni le nom figé d''un collègue désactivé'
);
select tests.connecter('00000000-0000-0000-0000-0000000005a2', 'aal2');
select is_empty(
    $$ select id from public.memberships where daara_id = '00000000-0000-0000-0000-00000000050b' $$,
    'isolation : l''admin de P ne lit aucun membership de R'
);
select is_empty(
    $$ select id from public.audit_log where daara_id = '00000000-0000-0000-0000-00000000050b' $$,
    'isolation : l''admin de P ne lit pas le journal de R'
);
select throws_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e7', 'parent') $$,
    '22023', 'role_invalide', 'changer_role : un membership apprenant ne change pas de rôle (sprint 4)'
);
select tests.connecter('00000000-0000-0000-0000-0000000005a7', 'aal2');
select throws_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e8', true) $$,
    '42501', 'admin_aal2_requis', 'admin désactivé : ne se réactive pas lui-même'
);
select throws_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005e4', 'enseignant') $$,
    '42501', 'admin_aal2_requis', 'admin désactivé : plus aucune action'
);
select is_empty(
    $$ select id from public.audit_log $$,
    'admin désactivé : le journal ne lui est plus lisible'
);

-- Un client qui fixe daara.auteur ne change pas l'auteur tracé : auth.uid() prime.
select tests.connecter('00000000-0000-0000-0000-0000000005a2', 'aal2');
select set_config('daara.auteur', '00000000-0000-0000-0000-0000000005a7', true);
select lives_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e6', true) $$,
    'audit : réactivation de E2 avec daara.auteur usurpé'
);
select is(
    (select user_id from public.audit_log where record_id = '00000000-0000-0000-0000-0000000005e6' order by id desc limit 1),
    '00000000-0000-0000-0000-0000000005a2'::uuid,
    'journal : daara.auteur fixé par un client connecté ignoré (auth.uid() prime)'
);
select set_config('daara.auteur', '', true);

-- Seul admin de R, qui y est aussi enseignant.
select tests.connecter('00000000-0000-0000-0000-0000000005b1', 'aal2');
select throws_ok(
    $$ select public.changer_role('00000000-0000-0000-0000-0000000005f1', 'parent') $$,
    '23514', 'dernier_admin', 'seul admin à deux rôles : passer son admin en parent refusé'
);
select throws_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005f1', false) $$,
    '23514', 'dernier_admin', 'seul admin à deux rôles : désactiver sa ligne admin refusé'
);
select lives_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005f2', false) $$,
    'seul admin à deux rôles : désactiver sa ligne enseignant permis'
);

reset role;
set local role anon;
select throws_ok(
    $$ select public.definir_actif('00000000-0000-0000-0000-0000000005e6', false) $$,
    '42501', null, 'anon : definir_actif refusé'
);
select throws_ok(
    $$ select id from public.memberships $$,
    '42501', null, 'anon : lecture des memberships refusée'
);
reset role;
set local role authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Journal : auteur tracé (auth.uid(), ou daara.auteur pour les Edge Functions en service_role)
-- ---------------------------------------------------------------------------------------------------
reset role;
select is(
    (select user_id from public.audit_log
     where table_name = 'memberships' and record_id = '00000000-0000-0000-0000-0000000005e5' and action = 'UPDATE'
     order by id limit 1),
    '00000000-0000-0000-0000-0000000005a1'::uuid,
    'journal : auteur du changement de rôle tracé'
);

select set_config('request.jwt.claims', '', true);
select set_config('daara.auteur', '00000000-0000-0000-0000-0000000005a2', true);
update public.memberships set actif = false where id = '00000000-0000-0000-0000-0000000005e4';
select is(
    (select user_id from public.audit_log where record_id = '00000000-0000-0000-0000-0000000005e4' order by id desc limit 1),
    '00000000-0000-0000-0000-0000000005a2'::uuid,
    'journal : sans session, l''auteur vient de daara.auteur'
);
select set_config('daara.auteur', 'pas-un-uuid', true);
update public.memberships set actif = true where id = '00000000-0000-0000-0000-0000000005e4';
select is(
    (select user_id from public.audit_log where record_id = '00000000-0000-0000-0000-0000000005e4' order by id desc limit 1),
    null::uuid,
    'journal : daara.auteur malformé ignoré sans bloquer l''écriture'
);

-- Garde-fou appliqué aussi hors RPC, contrainte de caractères, cascade non bloquée.
select throws_ok(
    $$ update public.memberships set role = 'parent' where id = '00000000-0000-0000-0000-0000000005f1' $$,
    '23514', 'dernier_admin', 'dernier admin : protégé aussi sans passer par la RPC'
);
select throws_ok(
    $$ update public.memberships set nom_affiche = 'Fatou' || chr(8238) || 'Ndiaye' where id = '00000000-0000-0000-0000-0000000005e5' $$,
    '23514', null, 'nom_affiche : caractère bidirectionnel refusé'
);
select throws_ok(
    $$ update public.memberships set daara_id = '00000000-0000-0000-0000-00000000050a' where id = '00000000-0000-0000-0000-0000000005f1' $$,
    '23514', 'membership_immuable', 'membership : changer de daara refusé (vidait R de son admin)'
);
select throws_ok(
    $$ update public.memberships set actif = false where daara_id = '00000000-0000-0000-0000-00000000050a' and role = 'admin' $$,
    '23514', 'dernier_admin', 'dernier admin : désactiver tous les admins en une instruction refusé'
);
select throws_ok(
    $$ delete from public.memberships where id = '00000000-0000-0000-0000-0000000005e2' $$,
    '23514', 'dernier_admin', 'dernier admin : suppression refusée tant que la daara existe'
);
select throws_ok(
    $$ update public.memberships set nom_affiche = 'Ibou Sarr' where id = '00000000-0000-0000-0000-0000000005e3' $$,
    '23514', null, 'nom_affiche : interdit sur une ligne active'
);
select ok(
    not has_function_privilege('authenticated', 'public.membership_administre(uuid)', 'execute'),
    'membership_administre : non exécutable par authenticated'
);
select lives_ok(
    $$ delete from public.daaras where id = '00000000-0000-0000-0000-00000000050b' $$,
    'dernier admin : la suppression d''une daara (cascade) n''est pas bloquée'
);

select * from finish();
rollback;
