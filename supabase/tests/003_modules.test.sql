-- S2.2 : modules activables par daara (ADR-008, docs/features/modules.md « Cas de test », audits RLS et sécurité).
-- Jeu : daaras M et N ; admin, enseignant, parent, membre désactivé et enseignant avec facteur de M ; admin de N ;
-- utilisateur sans daara ; super-admin.
begin;

create extension if not exists pgtap with schema extensions;

select plan(61);

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
    ('00000000-0000-0000-0000-0000000003a1', 'admin.m@test.local', 'authenticated', 'authenticated', '{"nom": "Diop"}'),
    ('00000000-0000-0000-0000-0000000003a2', 'ens.m@test.local', 'authenticated', 'authenticated', '{"nom": "Fall"}'),
    ('00000000-0000-0000-0000-0000000003a3', 'parent.m@test.local', 'authenticated', 'authenticated', '{"nom": "Ndiaye"}'),
    ('00000000-0000-0000-0000-0000000003a4', 'ancien.m@test.local', 'authenticated', 'authenticated', '{"nom": "Faye"}'),
    ('00000000-0000-0000-0000-0000000003a5', 'ens.facteur.m@test.local', 'authenticated', 'authenticated', '{"nom": "Sarr"}'),
    ('00000000-0000-0000-0000-0000000003b1', 'admin.n@test.local', 'authenticated', 'authenticated', '{"nom": "Sow"}'),
    ('00000000-0000-0000-0000-0000000003c1', 'nouveau@test.local', 'authenticated', 'authenticated', '{"nom": "Ba"}'),
    ('00000000-0000-0000-0000-0000000003d1', 'plateforme.m@test.local', 'authenticated', 'authenticated', '{"nom": "Gueye"}');

insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000030a', 'Daara M', 'test-daara-m', '00000000-0000-0000-0000-0000000003a1'),
    ('00000000-0000-0000-0000-00000000030b', 'Daara N', 'test-daara-n', '00000000-0000-0000-0000-0000000003b1');

insert into public.memberships (daara_id, user_id, role, actif) values
    ('00000000-0000-0000-0000-00000000030a', '00000000-0000-0000-0000-0000000003a1', 'admin', true),
    ('00000000-0000-0000-0000-00000000030a', '00000000-0000-0000-0000-0000000003a2', 'enseignant', true),
    ('00000000-0000-0000-0000-00000000030a', '00000000-0000-0000-0000-0000000003a3', 'parent', true),
    ('00000000-0000-0000-0000-00000000030a', '00000000-0000-0000-0000-0000000003a4', 'admin', false),
    ('00000000-0000-0000-0000-00000000030a', '00000000-0000-0000-0000-0000000003a5', 'enseignant', true),
    ('00000000-0000-0000-0000-00000000030b', '00000000-0000-0000-0000-0000000003b1', 'admin', true);

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret) values
    ('00000000-0000-0000-0000-0000000003f5', '00000000-0000-0000-0000-0000000003a5', 'Téléphone', 'totp', 'verified', now(), now(), 'X');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000003d1');

-- État initial : M a tous les modules, N seulement le cahier de Coran.
insert into public.daara_modules (daara_id, module, actif)
select '00000000-0000-0000-0000-00000000030a'::uuid, m, true from unnest(enum_range(null::public.module_daara)) as m
union all
select '00000000-0000-0000-0000-00000000030b'::uuid, m, m = 'coran_cahier' from unnest(enum_range(null::public.module_daara)) as m;

-- Fonction interne de fermeture des prérequis (testée en postgres : non exécutable par authenticated).
select is(
    public.avec_prerequis(array['bulletins', 'notifications', 'notifications']::public.module_daara[]),
    array['structure', 'notes', 'bulletins', 'notifications']::public.module_daara[],
    'avec_prerequis : doublons en entrée, prérequis complets'
);

set local role authenticated;

-- -----------------------------------------------------------------------------------------------------
-- module_actif : vrai seulement pour un membre (session suffisante) ou le super-admin
-- -----------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000003a2');
select ok(public.module_actif('00000000-0000-0000-0000-00000000030a', 'bulletins'), 'module_actif : bulletins actifs dans M (membre)');
select ok(public.module_actif('00000000-0000-0000-0000-00000000030a', 'coran_nafar'), 'module_actif : nafar actif dans M');
select ok(not public.module_actif('00000000-0000-0000-0000-00000000030b', 'coran_cahier'), 'module_actif : faux pour une autre daara, même module actif');

select tests.connecter('00000000-0000-0000-0000-0000000003c1', 'aal2');
select ok(not public.module_actif('00000000-0000-0000-0000-00000000030a', 'notes'), 'module_actif : faux sans appartenance');

select tests.connecter('00000000-0000-0000-0000-0000000003a5', 'aal1');
select ok(not public.module_actif('00000000-0000-0000-0000-00000000030a', 'notes'), 'module_actif : faux si session insuffisante (facteur, aal1)');

select tests.connecter('00000000-0000-0000-0000-0000000003d1', 'aal2');
select ok(public.module_actif('00000000-0000-0000-0000-00000000030b', 'coran_cahier'), 'module_actif : vrai pour le super-admin en aal2');

-- -----------------------------------------------------------------------------------------------------
-- daara_modules : lecture par les membres, colonnes limitées, aucune écriture directe
-- -----------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000003a2');
select is(
    (select count(*) from public.daara_modules where daara_id = '00000000-0000-0000-0000-00000000030a'),
    8::bigint,
    'daara_modules : l''enseignant de M lit les modules de M'
);
select is_empty(
    $$ select module from public.daara_modules where daara_id = '00000000-0000-0000-0000-00000000030b' $$,
    'daara_modules : l''enseignant de M ne lit pas ceux de N'
);

select tests.connecter('00000000-0000-0000-0000-0000000003a3');
select is(
    (select count(*) from public.daara_modules where daara_id = '00000000-0000-0000-0000-00000000030a'),
    8::bigint,
    'daara_modules : le parent de M lit les modules de M (menus)'
);
select throws_ok($$ select updated_by from public.daara_modules $$, '42501', null, 'daara_modules : updated_by illisible (minimisation)');

select tests.connecter('00000000-0000-0000-0000-0000000003a4', 'aal2');
select is_empty('select module from public.daara_modules', 'daara_modules : membre désactivé, rien');

select tests.connecter('00000000-0000-0000-0000-0000000003a5', 'aal1');
select is_empty('select module from public.daara_modules', 'daara_modules : enseignant avec facteur en aal1, rien');

select tests.connecter('00000000-0000-0000-0000-0000000003d1', 'aal2');
select is(
    (select count(*) from public.daara_modules
     where daara_id in ('00000000-0000-0000-0000-00000000030a', '00000000-0000-0000-0000-00000000030b')),
    16::bigint,
    'daara_modules : super-admin aal2 lit toutes les daaras'
);
select tests.connecter('00000000-0000-0000-0000-0000000003d1', 'aal1');
select is_empty('select module from public.daara_modules', 'daara_modules : super-admin aal1, rien');

select tests.connecter('00000000-0000-0000-0000-0000000003a1', 'aal2');
select throws_ok(
    $$ update public.daara_modules set actif = false where daara_id = '00000000-0000-0000-0000-00000000030a' $$,
    '42501', null, 'daara_modules : modification directe refusée, même à l''admin'
);
select throws_ok(
    $$ insert into public.daara_modules (daara_id, module) values ('00000000-0000-0000-0000-00000000030b', 'notes') $$,
    '42501', null, 'daara_modules : insertion directe refusée'
);
select throws_ok(
    $$ delete from public.daara_modules where daara_id = '00000000-0000-0000-0000-00000000030a' $$,
    '42501', null, 'daara_modules : suppression directe refusée'
);

select tests.connecter('00000000-0000-0000-0000-0000000003c1', 'aal2');
select is_empty('select module from public.daara_modules', 'daara_modules : utilisateur sans daara ne lit rien');

-- -----------------------------------------------------------------------------------------------------
-- definir_modules : droits
-- -----------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000003a1', 'aal1');
select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030a', array['coran_cahier']::public.module_daara[]) $$,
    '42501', 'admin_aal2_requis', 'definir_modules : admin en aal1 refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000003a2', 'aal2');
select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030a', array['coran_cahier']::public.module_daara[]) $$,
    '42501', 'admin_aal2_requis', 'definir_modules : enseignant refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000003a3', 'aal2');
select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030a', array['coran_cahier']::public.module_daara[]) $$,
    '42501', 'admin_aal2_requis', 'definir_modules : parent refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000003a4', 'aal2');
select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030a', array['coran_cahier']::public.module_daara[]) $$,
    '42501', 'admin_aal2_requis', 'definir_modules : admin désactivé refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000003b1', 'aal2');
select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030a', array['coran_cahier']::public.module_daara[]) $$,
    '42501', 'admin_aal2_requis', 'definir_modules : admin d''une autre daara refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000003d1', 'aal2');
select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030a', array['coran_cahier']::public.module_daara[]) $$,
    '42501', 'admin_aal2_requis', 'definir_modules : super-admin refusé (lecture seule)'
);
select tests.connecter('00000000-0000-0000-0000-0000000003c1', 'aal2');
select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030a', array['coran_cahier']::public.module_daara[]) $$,
    '42501', 'admin_aal2_requis', 'definir_modules : utilisateur sans daara refusé'
);

-- -----------------------------------------------------------------------------------------------------
-- definir_modules : prérequis, validation, journal
-- -----------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000003b1', 'aal2');
-- N n'a que le cahier : demander les bulletins active aussi notes et structure.
select is(
    public.definir_modules('00000000-0000-0000-0000-00000000030b', array['coran_cahier', 'bulletins']::public.module_daara[]),
    array['structure', 'notes', 'bulletins', 'coran_cahier']::public.module_daara[],
    'definir_modules : prérequis inactifs ajoutés (bulletins → notes → structure)'
);
select ok(public.module_actif('00000000-0000-0000-0000-00000000030b', 'structure'), 'definir_modules : structure activée dans N');

-- Idempotence : redemander le même état n'écrit rien au journal.
select is(
    (select count(*) from public.audit_log where daara_id = '00000000-0000-0000-0000-00000000030b'
     and table_name = 'daara_modules' and action = 'UPDATE')::int,
    3,
    'definir_modules : 3 changements journalisés (structure, notes, bulletins)'
);
select lives_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030b', array['structure', 'notes', 'bulletins', 'coran_cahier']::public.module_daara[]) $$,
    'definir_modules : même état redemandé'
);
select is(
    (select count(*) from public.audit_log where daara_id = '00000000-0000-0000-0000-00000000030b'
     and table_name = 'daara_modules' and action = 'UPDATE')::int,
    3,
    'definir_modules : aucun changement, aucune ligne de journal'
);
select ok(
    (select bool_and(user_id = '00000000-0000-0000-0000-0000000003b1') from public.audit_log
     where daara_id = '00000000-0000-0000-0000-00000000030b' and table_name = 'daara_modules' and action = 'UPDATE'),
    'definir_modules : auteur journalisé'
);

-- Retirer structure en gardant notes : refusé avec le module dépendant nommé.
select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030b',
           array['coran_cahier', 'notes', 'bulletins']::public.module_daara[]) $$,
    '23514', 'module_requis:structure:notes', 'definir_modules : désactiver un prérequis encore requis refusé'
);
select ok(public.module_actif('00000000-0000-0000-0000-00000000030b', 'structure'), 'definir_modules : rien n''est modifié après un refus');

-- Doublons : dédoublonnés, prérequis gardés.
select is(
    public.definir_modules('00000000-0000-0000-0000-00000000030b',
        array['notes', 'notes', 'structure', 'bulletins', 'bulletins', 'coran_cahier']::public.module_daara[]),
    array['structure', 'notes', 'bulletins', 'coran_cahier']::public.module_daara[],
    'definir_modules : doublons dédoublonnés'
);

-- Retirer bulletins, notes et structure ensemble : accepté.
select is(
    public.definir_modules('00000000-0000-0000-0000-00000000030b', array['coran_cahier']::public.module_daara[]),
    array['coran_cahier']::public.module_daara[],
    'definir_modules : désactivation d''un module et de ses prérequis ensemble'
);
select ok(not public.module_actif('00000000-0000-0000-0000-00000000030b', 'notes'), 'definir_modules : notes désactivées');

select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030b', array[null]::public.module_daara[]) $$,
    '23514', 'donnee_invalide', 'definir_modules : valeur nulle refusée'
);
select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030b', array['inconnu']::public.module_daara[]) $$,
    '22P02', null, 'definir_modules : module inconnu refusé'
);
select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030b', array[['notes'], ['structure']]::public.module_daara[]) $$,
    '23514', 'donnee_invalide', 'definir_modules : tableau multidimensionnel refusé'
);
select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030b',
           array(select 'notes'::public.module_daara from generate_series(1, 100))) $$,
    '23514', 'donnee_invalide', 'definir_modules : tableau trop grand refusé'
);
select is(
    public.definir_modules('00000000-0000-0000-0000-00000000030b', array[]::public.module_daara[]),
    array[]::public.module_daara[],
    'definir_modules : aucun module (socle seul) accepté'
);

-- Transitivité : M a tout ; ne garder que les bulletins retire des prérequis encore requis.
select tests.connecter('00000000-0000-0000-0000-0000000003a1', 'aal2');
select throws_ok(
    $$ select public.definir_modules('00000000-0000-0000-0000-00000000030a', array['bulletins']::public.module_daara[]) $$,
    '23514', null, 'definir_modules : prérequis indirect (structure) protégé'
);

-- -----------------------------------------------------------------------------------------------------
-- basculer_module : un seul module, à partir de l'état en base
-- -----------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000003b1', 'aal2');
select is(
    public.basculer_module('00000000-0000-0000-0000-00000000030b', 'absences', true),
    array['structure', 'absences']::public.module_daara[],
    'basculer_module : activation avec prérequis'
);
-- Un autre admin a entre-temps activé le cahier : la bascule suivante le conserve (pas d'écrasement).
reset role;
update public.daara_modules set actif = true where daara_id = '00000000-0000-0000-0000-00000000030b' and module = 'coran_cahier';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000003b1', 'aal2');
select is(
    public.basculer_module('00000000-0000-0000-0000-00000000030b', 'notifications', true),
    array['structure', 'absences', 'coran_cahier', 'notifications']::public.module_daara[],
    'basculer_module : part de l''état en base (rien n''est écrasé)'
);
select throws_ok(
    $$ select public.basculer_module('00000000-0000-0000-0000-00000000030b', 'structure', false) $$,
    '23514', 'module_requis:structure:absences', 'basculer_module : prérequis encore requis protégé'
);
select is(
    public.basculer_module('00000000-0000-0000-0000-00000000030b', 'notifications', false),
    array['structure', 'absences', 'coran_cahier']::public.module_daara[],
    'basculer_module : désactivation'
);
select tests.connecter('00000000-0000-0000-0000-0000000003a2', 'aal2');
select throws_ok(
    $$ select public.basculer_module('00000000-0000-0000-0000-00000000030a', 'notes', false) $$,
    '42501', 'admin_aal2_requis', 'basculer_module : enseignant refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000003b1', 'aal2');
select throws_ok(
    $$ select public.basculer_module('00000000-0000-0000-0000-00000000030a', 'notes', false) $$,
    '42501', 'admin_aal2_requis', 'basculer_module : admin d''une autre daara refusé'
);

-- -----------------------------------------------------------------------------------------------------
-- creer_daara avec profil de modules
-- -----------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-0000000003c1', 'aal2');
select is(
    public.creer_daara('Daara Coranique', 'test-daara-coranique', null, null, 'fr', 20,
        array['coran_nafar', 'absences']::public.module_daara[]),
    'test-daara-coranique',
    'creer_daara : profil de modules accepté'
);
select results_eq(
    $$ select module::text from public.daara_modules dm join public.daaras d on d.id = dm.daara_id
       where d.slug = 'test-daara-coranique' and dm.actif order by dm.module $$,
    array['structure', 'absences', 'coran_cahier', 'coran_nafar'],
    'creer_daara : prérequis du profil ajoutés (nafar → cahier, absences → structure)'
);
select is(
    (select count(*) from public.daara_modules dm join public.daaras d on d.id = dm.daara_id
     where d.slug = 'test-daara-coranique'),
    8::bigint,
    'creer_daara : les 8 modules ont une ligne (actifs ou non)'
);
select is(
    public.creer_daara('Daara Doublons', 'test-daara-doublons', null, null, 'fr', 20,
        array['bulletins', 'bulletins']::public.module_daara[]),
    'test-daara-doublons',
    'creer_daara : doublons acceptés'
);
select results_eq(
    $$ select module::text from public.daara_modules dm join public.daaras d on d.id = dm.daara_id
       where d.slug = 'test-daara-doublons' and dm.actif order by dm.module $$,
    array['structure', 'notes', 'bulletins'],
    'creer_daara : doublons, prérequis complets (audit RLS S2.2)'
);
select is(
    public.creer_daara('Daara Socle', 'test-daara-socle', null, null, 'fr', 20, array[]::public.module_daara[]),
    'test-daara-socle',
    'creer_daara : aucun module (socle seul)'
);
select is(
    (select count(*) filter (where dm.actif) from public.daara_modules dm join public.daaras d on d.id = dm.daara_id
     where d.slug = 'test-daara-socle')::int,
    0,
    'creer_daara : socle seul, aucun module actif'
);
select throws_ok(
    $$ select public.creer_daara('Daara Nulle', 'test-daara-nulle', null, null, 'fr', 20, array[null]::public.module_daara[]) $$,
    '23514', 'donnee_invalide', 'creer_daara : module nul refusé'
);
select throws_ok(
    $$ select public.creer_daara('Daara Inconnue', 'test-daara-inconnue', null, null, 'fr', 20, array['inconnu']::public.module_daara[]) $$,
    '22P02', null, 'creer_daara : module inconnu refusé'
);
select ok(
    (select bool_and(a.user_id = '00000000-0000-0000-0000-0000000003c1') from public.audit_log a
     join public.daaras d on d.id = a.daara_id
     where d.slug = 'test-daara-coranique' and a.table_name = 'daara_modules'),
    'creer_daara : modules journalisés avec le créateur pour auteur'
);

-- -----------------------------------------------------------------------------------------------------
-- anon
-- -----------------------------------------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select module from public.daara_modules $$, '42501', null, 'anon : daara_modules refusé');
select throws_ok(
    $$ select public.module_actif('00000000-0000-0000-0000-00000000030a', 'notes') $$,
    '42501', null, 'anon : module_actif refusé'
);

reset role;
select * from finish();
rollback;
