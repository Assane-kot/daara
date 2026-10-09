-- S2.6 : codes d'accès (docs/features/reinitialisation-assistee.md « Cas de test », LLD §4, ADR-006 niveau 2).
-- Jeu : daara P (admins A et A2, enseignant E, parents M1 téléphone, M2 e-mail, M3 aussi admin de R, M4 désactivé) ;
-- daara R (admin B, M3).
begin;

create extension if not exists pgtap with schema extensions;

select plan(52);

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
grant execute on function tests.connecter(uuid, text) to authenticated, anon, service_role;

-- Codes renvoyés par creer_code_acces, rangés sous une clé de test.
create table tests.codes (cle text primary key, code text not null);
grant select, insert on tests.codes to authenticated;
create function tests.creer(p_cle text, p_membership uuid)
returns text
language sql
as $$
    insert into tests.codes (cle, code) select p_cle, public.creer_code_acces(p_membership) returning code;
$$;
create function tests.c(p_cle text) returns text language sql stable as $$ select code from tests.codes where cle = p_cle $$;
grant execute on function tests.creer(text, uuid) to authenticated;
grant execute on function tests.c(text) to authenticated, service_role;
grant usage on schema tests to service_role;
grant select on tests.codes to service_role;

insert into auth.users (id, email, phone, aud, role, email_confirmed_at, phone_confirmed_at, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000008a1', 'admin.p8@test.local', null, 'authenticated', 'authenticated', now(), null, '{}'),
    ('00000000-0000-0000-0000-0000000008a2', 'admin2.p8@test.local', null, 'authenticated', 'authenticated', now(), null, '{}'),
    ('00000000-0000-0000-0000-0000000008a3', 'ens.p8@test.local', null, 'authenticated', 'authenticated', now(), null, '{}'),
    ('00000000-0000-0000-0000-0000000008b1', 'admin.r8@test.local', null, 'authenticated', 'authenticated', now(), null, '{}'),
    ('00000000-0000-0000-0000-0000000008c1', null, '221770009911', 'authenticated', 'authenticated', null, now(), '{}'),
    ('00000000-0000-0000-0000-0000000008c2', 'parent.p8@test.local', null, 'authenticated', 'authenticated', now(), null, '{"langue": "en"}'),
    ('00000000-0000-0000-0000-0000000008c3', 'double.p8@test.local', null, 'authenticated', 'authenticated', now(), null, '{}'),
    ('00000000-0000-0000-0000-0000000008c4', 'ancien.p8@test.local', null, 'authenticated', 'authenticated', now(), null, '{}');

insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000080a', 'Daara P8', 'test-daara-p8', '00000000-0000-0000-0000-0000000008a1'),
    ('00000000-0000-0000-0000-00000000080b', 'Daara R8', 'test-daara-r8', '00000000-0000-0000-0000-0000000008b1');

insert into public.memberships (id, daara_id, user_id, role, actif) values
    ('00000000-0000-0000-0000-000000008a01', '00000000-0000-0000-0000-00000000080a', '00000000-0000-0000-0000-0000000008a1', 'admin', true),
    ('00000000-0000-0000-0000-000000008a02', '00000000-0000-0000-0000-00000000080a', '00000000-0000-0000-0000-0000000008a2', 'admin', true),
    ('00000000-0000-0000-0000-000000008a03', '00000000-0000-0000-0000-00000000080a', '00000000-0000-0000-0000-0000000008a3', 'enseignant', true),
    ('00000000-0000-0000-0000-000000008b01', '00000000-0000-0000-0000-00000000080b', '00000000-0000-0000-0000-0000000008b1', 'admin', true),
    ('00000000-0000-0000-0000-000000008c01', '00000000-0000-0000-0000-00000000080a', '00000000-0000-0000-0000-0000000008c1', 'parent', true),
    ('00000000-0000-0000-0000-000000008c02', '00000000-0000-0000-0000-00000000080a', '00000000-0000-0000-0000-0000000008c2', 'parent', true),
    ('00000000-0000-0000-0000-000000008c03', '00000000-0000-0000-0000-00000000080a', '00000000-0000-0000-0000-0000000008c3', 'parent', true),
    ('00000000-0000-0000-0000-000000008c13', '00000000-0000-0000-0000-00000000080b', '00000000-0000-0000-0000-0000000008c3', 'admin', true),
    ('00000000-0000-0000-0000-000000008c04', '00000000-0000-0000-0000-00000000080a', '00000000-0000-0000-0000-0000000008c4', 'parent', false);

set local role authenticated;

-- ---------------------------------------------------------------------------------------------------
-- creer_code_acces : droits
-- ---------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal1');
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-000000008c01') $$, '42501', 'admin_aal2_requis',
    'admin en aal1 : refusé');
select tests.connecter('00000000-0000-0000-0000-0000000008a3', 'aal2');
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-000000008c01') $$, '42501', 'admin_aal2_requis',
    'enseignant : refusé');
select tests.connecter('00000000-0000-0000-0000-0000000008b1', 'aal2');
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-000000008c01') $$, '42501', 'admin_aal2_requis',
    'admin d''une autre daara : refusé');
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-0000000008ff') $$, '42501', 'admin_aal2_requis',
    'membership inconnu : même refus');

select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select matches(tests.creer('m1a', '00000000-0000-0000-0000-000000008c01'), '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$',
    'admin aal2 : code de 8 caractères sans symbole ambigu');
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-000000008a02') $$, '22023', 'cible_invalide',
    'cible admin : refusée');
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-000000008a01') $$, '22023', 'cible_invalide',
    'soi-même : refusé');
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-000000008c03') $$, '22023', 'cible_invalide',
    'parent ici mais admin d''une autre daara : refusé (D1)');
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-000000008c04') $$, '22023', 'cible_invalide',
    'membre désactivé : refusé');

-- ---------------------------------------------------------------------------------------------------
-- Lecture et écritures directes
-- ---------------------------------------------------------------------------------------------------
select is((select count(*)::int from public.codes_acces), 1, 'admin aal2 : lit les codes de sa daara');
select throws_ok($$ select code_hash from public.codes_acces $$, '42501', null, 'code_hash illisible');
select throws_ok($$ insert into public.codes_acces (daara_id, user_id, code_hash)
    values ('00000000-0000-0000-0000-00000000080a', '00000000-0000-0000-0000-0000000008c1', repeat('a', 64)) $$,
    '42501', null, 'insertion directe refusée');
select throws_ok($$ select * from public.consommer_code_acces('+221770009911', 'AAAA-AAAA') $$, '42501', null,
    'consommer_code_acces : refusée au client');
select tests.connecter('00000000-0000-0000-0000-0000000008a3', 'aal2');
select is((select count(*)::int from public.codes_acces), 0, 'enseignant : aucun code lisible');
select tests.connecter('00000000-0000-0000-0000-0000000008b1', 'aal2');
select is((select count(*)::int from public.codes_acces), 0, 'admin d''une autre daara : aucun code lisible');
select tests.connecter('00000000-0000-0000-0000-0000000008c1', 'aal1');
select is((select count(*)::int from public.codes_acces), 0, 'membre ciblé : ne lit pas son code');

set local role anon;
select tests.connecter(null);
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-000000008c01') $$, '42501', null, 'anon : refusé');

-- Nouveau code : l'ancien est annulé.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select lives_ok($$ select tests.creer('m1b', '00000000-0000-0000-0000-000000008c01') $$, 'second code pour M1');
reset role;
select is((select count(*)::int from public.codes_acces where user_id = '00000000-0000-0000-0000-0000000008c1' and used_at is null), 1,
    'un seul code actif : l''ancien est annulé');
select ok(not exists (select 1 from public.codes_acces where code_hash ilike '%' || replace(tests.c('m1b'), '-', '') || '%')
    and not exists (select 1 from public.audit_log where table_name = 'codes_acces' and new_data ? 'code_hash'),
    'code stocké haché, haché absent du journal');

-- ---------------------------------------------------------------------------------------------------
-- consommer_code_acces (service_role)
-- ---------------------------------------------------------------------------------------------------
set local role service_role;
select tests.connecter(null);
select is((select count(*)::int from public.consommer_code_acces('+221770009911', tests.c('m1a'))), 0, 'ancien code : refusé');
select is((select count(*)::int from public.consommer_code_acces('+221770009911', 'abc')), 0, 'code mal formé : refusé');
select is((select tentatives::int from public.codes_acces where user_id = '00000000-0000-0000-0000-0000000008c1' and used_at is null), 1,
    'essai faux compté, code mal formé non compté');
select results_eq(
    $$ select user_id, email, langue from public.consommer_code_acces('+221 77 000 99 11', lower(replace(tests.c('m1b'), '-', ' '))) $$,
    $$ values ('00000000-0000-0000-0000-0000000008c1'::uuid, null::text, 'fr'::text) $$,
    'bon code (téléphone avec espaces, minuscules, espace dans le code) : compte renvoyé');
select is((select count(*)::int from public.consommer_code_acces('+221770009911', tests.c('m1b'))), 0, 'usage unique');
reset role;
select is((select user_id from public.audit_log where table_name = 'codes_acces' and action = 'UPDATE'
    and (new_data ->> 'tentatives')::int = 1 and new_data ->> 'used_at' is not null order by at desc, id desc limit 1),
    '00000000-0000-0000-0000-0000000008c1'::uuid, 'journal : auteur = le membre');

-- 5 essais puis code invalidé.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select tests.creer('m2a', '00000000-0000-0000-0000-000000008c02');
set local role service_role;
select tests.connecter(null);
do $$ begin for i in 1..5 loop perform public.consommer_code_acces('parent.p8@test.local', 'ZZZZ-ZZZZ'); end loop; end $$;
reset role;
select ok((select tentatives = 5 and used_at is not null from public.codes_acces where user_id = '00000000-0000-0000-0000-0000000008c2'),
    '5 essais faux : code invalidé');
set local role service_role;
select tests.connecter(null);
select is((select count(*)::int from public.consommer_code_acces('parent.p8@test.local', tests.c('m2a'))), 0,
    'bon code après 5 essais : refusé');

-- Identifiant e-mail (majuscules) : e-mail et langue renvoyés pour la notification.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select tests.creer('m2b', '00000000-0000-0000-0000-000000008c02');
set local role service_role;
select tests.connecter(null);
select results_eq(
    $$ select user_id, email, langue from public.consommer_code_acces(' PARENT.P8@test.local ', tests.c('m2b')) $$,
    $$ values ('00000000-0000-0000-0000-0000000008c2'::uuid, 'parent.p8@test.local'::text, 'en'::text) $$,
    'identifiant e-mail : compte, e-mail et langue');
select is((select count(*)::int from public.consommer_code_acces('admin.p8@test.local', tests.c('m2b'))), 0,
    'code d''un autre compte : refusé');

-- Expiré.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select tests.creer('m1c', '00000000-0000-0000-0000-000000008c01');
reset role;
update public.codes_acces set expires_at = now() - interval '1 second' where user_id = '00000000-0000-0000-0000-0000000008c1' and used_at is null;
set local role service_role;
select tests.connecter(null);
select is((select count(*)::int from public.consommer_code_acces('+221770009911', tests.c('m1c'))), 0, 'code expiré : refusé');

-- Membre désactivé après la création du code.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select tests.creer('m1d', '00000000-0000-0000-0000-000000008c01');
reset role;
update public.memberships set actif = false where id = '00000000-0000-0000-0000-000000008c01';
set local role service_role;
select tests.connecter(null);
select is((select count(*)::int from public.consommer_code_acces('+221770009911', tests.c('m1d'))), 0,
    'membre désactivé depuis : refusé');
reset role;
update public.memberships set actif = true, nom_affiche = null where id = '00000000-0000-0000-0000-000000008c01';

-- Auteur qui n'est plus admin.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a2', 'aal2');
select tests.creer('m1e', '00000000-0000-0000-0000-000000008c01');
reset role;
update public.memberships set role = 'enseignant' where id = '00000000-0000-0000-0000-000000008a02';
set local role service_role;
select tests.connecter(null);
select is((select count(*)::int from public.consommer_code_acces('+221770009911', tests.c('m1e'))), 0,
    'auteur rétrogradé depuis : refusé');
reset role;
update public.memberships set role = 'admin' where id = '00000000-0000-0000-0000-000000008a02';

-- Membre devenu admin ailleurs depuis la création du code.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select tests.creer('m1f', '00000000-0000-0000-0000-000000008c01');
reset role;
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000080b', '00000000-0000-0000-0000-0000000008c1', 'admin');
set local role service_role;
select tests.connecter(null);
select is((select count(*)::int from public.consommer_code_acces('+221770009911', tests.c('m1f'))), 0,
    'membre devenu admin ailleurs : refusé');
reset role;
delete from public.memberships where daara_id = '00000000-0000-0000-0000-00000000080b' and user_id = '00000000-0000-0000-0000-0000000008c1';

-- Daara suspendue : création et consommation refusées.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select tests.creer('m1g', '00000000-0000-0000-0000-000000008c01');
reset role;
update public.daaras set statut = 'suspendue' where id = '00000000-0000-0000-0000-00000000080a';
set local role service_role;
select tests.connecter(null);
select is((select count(*)::int from public.consommer_code_acces('+221770009911', tests.c('m1g'))), 0, 'daara suspendue : code refusé');
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-000000008c02') $$, '42501', 'daara_suspendue',
    'daara suspendue : création refusée');
reset role;
update public.daaras set statut = 'active' where id = '00000000-0000-0000-0000-00000000080a';

-- Compte inconnu, identifiant vide.
set local role service_role;
select tests.connecter(null);
select is((select count(*)::int from public.consommer_code_acces('+221779999999', 'AAAA-AAAA')), 0, 'compte inconnu : refusé');
select is((select count(*)::int from public.consommer_code_acces('', 'AAAA-AAAA')), 0, 'identifiant vide : refusé');
select is((select count(*)::int from public.consommer_code_acces(null, null)), 0, 'paramètres nuls : refusé');
reset role;

-- ---------------------------------------------------------------------------------------------------
-- Cas ajoutés par les audits S2.6
-- ---------------------------------------------------------------------------------------------------
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal1');
select is((select count(*)::int from public.codes_acces), 0, 'admin en aal1 : aucun code lisible');
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select throws_ok($$ update public.codes_acces set tentatives = 0 $$, '42501', null, 'mise à jour directe refusée');
select throws_ok($$ delete from public.codes_acces $$, '42501', null, 'suppression directe refusée');

reset role;
update public.memberships set actif = false where id = '00000000-0000-0000-0000-000000008a02';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a2', 'aal2');
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-000000008c01') $$, '42501', 'admin_aal2_requis',
    'admin désactivé : refusé');
reset role;
update public.memberships set actif = true, nom_affiche = null where id = '00000000-0000-0000-0000-000000008a02';

set local role anon;
select tests.connecter(null);
select throws_ok($$ select id from public.codes_acces $$, '42501', null, 'anon : lecture refusée');
select throws_ok($$ select * from public.consommer_code_acces('+221770009911', 'AAAA-AAAA') $$, '42501', null,
    'anon : consommer_code_acces refusée');

set local role service_role;
select tests.connecter(null);
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-000000008c01') $$, '42501', 'admin_aal2_requis',
    'service_role sans JWT : creer_code_acces refusée');

-- Seuil : 4 essais faux, le 5e (bon) passe.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select tests.creer('m1h', '00000000-0000-0000-0000-000000008c01');
set local role service_role;
select tests.connecter(null);
do $$ begin for i in 1..4 loop perform public.consommer_code_acces('+221770009911', 'ZZZZ-ZZZZ'); end loop; end $$;
select is((select count(*)::int from public.consommer_code_acces('+221770009911', tests.c('m1h'))), 1, '4 essais faux puis le bon : accepté');

-- Membre de deux daaras : un code par compte, celui de R annule celui de P (comportement voulu, LLD §3.2).
reset role;
insert into public.memberships (id, daara_id, user_id, role) values
    ('00000000-0000-0000-0000-000000008c11', '00000000-0000-0000-0000-00000000080b', '00000000-0000-0000-0000-0000000008c1', 'parent');
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select tests.creer('m1i', '00000000-0000-0000-0000-000000008c01');
select tests.connecter('00000000-0000-0000-0000-0000000008b1', 'aal2');
select lives_ok($$ select tests.creer('m1r', '00000000-0000-0000-0000-000000008c11') $$, 'admin de R : code pour son parent');
select ok((select count(*) > 0 and bool_and(daara_id = '00000000-0000-0000-0000-00000000080b') from public.codes_acces),
    'admin de R : ne lit que les codes de R');
reset role;
select is((select daara_id from public.codes_acces where user_id = '00000000-0000-0000-0000-0000000008c1' and used_at is null),
    '00000000-0000-0000-0000-00000000080b'::uuid, 'un seul code actif par compte : celui de P est annulé');

-- Super-admin : jamais ciblé.
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000008c1');
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000008a1', 'aal2');
select throws_ok($$ select public.creer_code_acces('00000000-0000-0000-0000-000000008c01') $$, '22023', 'cible_invalide',
    'super-admin : refusé');
reset role;

-- La suppression du compte supprime ses codes.
delete from auth.users where id = '00000000-0000-0000-0000-0000000008c2';
select is((select count(*)::int from public.codes_acces where user_id = '00000000-0000-0000-0000-0000000008c2'), 0,
    'compte supprimé : codes supprimés');

select * from finish();
rollback;
