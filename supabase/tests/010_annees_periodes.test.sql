-- S3.1 : années scolaires et périodes (spec structure-scolaire.md, LLD §3.3, §4, ADR-008).
-- Jeu : daara P (admin A, enseignant E, parent Pa) ; daara R (admin B). Module `structure` actif dans les deux.
begin;

create extension if not exists pgtap with schema extensions;

select plan(48);

create schema tests;
grant usage on schema tests to authenticated, anon;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims',
        case when p_user is null then '' else json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text end, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated, anon;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-00000000a0a1', 'admin.p10@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000a0e1', 'ens.p10@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000a0c1', 'parent.p10@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000a0b1', 'admin.r10@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000a0f1', 'sans.daara10@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-00000000a0a2', 'admin2.p10@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-0000000a000a', 'Daara P10', 'test-daara-p10', '00000000-0000-0000-0000-00000000a0a1'),
    ('00000000-0000-0000-0000-0000000a000b', 'Daara R10', 'test-daara-r10', '00000000-0000-0000-0000-00000000a0b1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-0000000a000a', 'structure', true),
    ('00000000-0000-0000-0000-0000000a000b', 'structure', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-0000000a000a', '00000000-0000-0000-0000-00000000a0a1', 'admin'),
    ('00000000-0000-0000-0000-0000000a000a', '00000000-0000-0000-0000-00000000a0e1', 'enseignant'),
    ('00000000-0000-0000-0000-0000000a000a', '00000000-0000-0000-0000-00000000a0c1', 'parent'),
    ('00000000-0000-0000-0000-0000000a000b', '00000000-0000-0000-0000-00000000a0b1', 'admin'),
    ('00000000-0000-0000-0000-0000000a000a', '00000000-0000-0000-0000-00000000a0a2', 'admin');

set local role authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Années : écriture
-- ---------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-00000000a0a1');
select lives_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', '2026-2027', '2026-10-01', '2027-07-31') $$,
    'admin aal2 : crée une année');
reset role;
update public.annees_scolaires set id = '00000000-0000-0000-0000-00000000a100' where libelle = '2026-2027' and daara_id = '00000000-0000-0000-0000-0000000a000a';
set local role authenticated;
select throws_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', '2025-2026', '2027-07-31', '2026-10-01') $$, '23514', null, 'fin avant début : refusé');
select throws_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', 'Longue', '2026-01-01', '2027-08-01') $$, '23514', null, 'plus de 18 mois : refusé');
select throws_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', '2026-2027', '2026-10-01', '2027-07-31') $$, '23505', null, 'libellé en double : refusé');
select throws_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', 'A' || chr(8238) || 'B', '2026-10-01', '2027-07-31') $$, '23514', null,
    'caractère bidirectionnel dans le libellé : refusé');
select throws_ok($$ update public.annees_scolaires set active = true $$, '42501', null, 'active : non modifiable directement');
select throws_ok($$ update public.annees_scolaires set daara_id = '00000000-0000-0000-0000-0000000a000b' $$, '42501', null,
    'daara_id : non modifiable');

select tests.connecter('00000000-0000-0000-0000-00000000a0a1', 'aal1');
select throws_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', 'X1', '2026-10-01', '2027-07-31') $$, '42501', null, 'admin aal1 : refusé');
select tests.connecter('00000000-0000-0000-0000-00000000a0e1');
select throws_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', 'X2', '2026-10-01', '2027-07-31') $$, '42501', null, 'enseignant : refusé');
select tests.connecter('00000000-0000-0000-0000-00000000a0b1');
select throws_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', 'X3', '2026-10-01', '2027-07-31') $$, '42501', null, 'admin d''une autre daara : refusé');

-- ---------------------------------------------------------------------------------------------------
-- Années : lecture
-- ---------------------------------------------------------------------------------------------------
select is((select count(*)::int from public.annees_scolaires), 0, 'admin d''une autre daara : rien de lisible');
select tests.connecter('00000000-0000-0000-0000-00000000a0e1');
select is((select count(*)::int from public.annees_scolaires), 1, 'enseignant : lit les années');
select tests.connecter('00000000-0000-0000-0000-00000000a0c1', 'aal1');
select is((select count(*)::int from public.annees_scolaires), 1, 'parent : lit les années');
set local role anon;
select tests.connecter(null);
select throws_ok($$ select id from public.annees_scolaires $$, '42501', null, 'anon : refusé');
set local role authenticated;

-- ---------------------------------------------------------------------------------------------------
-- activer_annee
-- ---------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-00000000a0a1');
select lives_ok($$ select public.activer_annee('00000000-0000-0000-0000-00000000a100') $$, 'admin : active une année');
reset role;
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-00000000a200', '00000000-0000-0000-0000-0000000a000a', '2027-2028', '2027-10-01', '2028-07-31');
set local role authenticated;
select public.activer_annee('00000000-0000-0000-0000-00000000a200');
select results_eq($$ select libelle from public.annees_scolaires where active $$, $$ values ('2027-2028'::text) $$,
    'une seule année active : la précédente ne l''est plus');
select throws_ok($$ delete from public.annees_scolaires where id = '00000000-0000-0000-0000-00000000a200' $$, '23514', 'annee_active',
    'année active : suppression refusée');
select public.activer_annee('00000000-0000-0000-0000-00000000a100');
select tests.connecter('00000000-0000-0000-0000-00000000a0e1');
select throws_ok($$ select public.activer_annee('00000000-0000-0000-0000-00000000a200') $$, '42501', 'admin_aal2_requis',
    'enseignant : activer_annee refusée');
select tests.connecter('00000000-0000-0000-0000-00000000a0b1');
select throws_ok($$ select public.activer_annee('00000000-0000-0000-0000-00000000a200') $$, '42501', 'admin_aal2_requis',
    'admin d''une autre daara : activer_annee refusée');

-- ---------------------------------------------------------------------------------------------------
-- Périodes
-- ---------------------------------------------------------------------------------------------------
select tests.connecter('00000000-0000-0000-0000-00000000a0a1');
select lives_ok($$ insert into public.periodes (daara_id, annee_id, libelle, ordre, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', '00000000-0000-0000-0000-00000000a100',
     'Trimestre 1', 1, '2026-10-01', '2026-12-20') $$, 'admin : crée une période dans l''année');
reset role;
-- Mise en place (id fixe) sans les triggers : changer l'id ferait chevaucher la période avec elle-même.
set local session_replication_role = replica;
update public.periodes set id = '00000000-0000-0000-0000-00000000a110' where libelle = 'Trimestre 1' and daara_id = '00000000-0000-0000-0000-0000000a000a';
set local session_replication_role = origin;
set local role authenticated;
select throws_ok($$ insert into public.periodes (daara_id, annee_id, libelle, ordre, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', '00000000-0000-0000-0000-00000000a100', 'Hors', 2, '2026-09-01', '2026-12-31') $$,
    '23514', 'periode_hors_annee', 'période hors de l''année : refusée');
select throws_ok($$ insert into public.periodes (daara_id, annee_id, libelle, ordre, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', '00000000-0000-0000-0000-00000000a100', 'Chevauche', 2, '2026-12-15', '2027-03-31') $$,
    '23514', 'periodes_chevauchement', 'périodes qui se chevauchent : refusées');
select throws_ok($$ insert into public.periodes (daara_id, annee_id, libelle, ordre, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', '00000000-0000-0000-0000-00000000a100', 'Doublon', 1, '2027-01-05', '2027-03-31') $$,
    '23505', null, 'ordre en double : refusé');
select throws_ok($$ update public.annees_scolaires set date_debut = '2026-11-01' where id = '00000000-0000-0000-0000-00000000a100' $$,
    '23514', 'periode_hors_annee', 'année raccourcie qui laisserait une période dehors : refusée');
select tests.connecter('00000000-0000-0000-0000-00000000a0b1');
select throws_ok($$ insert into public.periodes (daara_id, annee_id, libelle, ordre, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000b', '00000000-0000-0000-0000-00000000a100', 'Intrus', 3, '2027-04-01', '2027-06-30') $$,
    '23514', 'autre_daara', 'période de R rattachée à une année de P : refusée');

-- Audits S3.1 : le trigger ne renseigne pas un étranger sur les dates de P (droits contrôlés avant toute lecture).
select throws_ok($$ insert into public.periodes (daara_id, annee_id, libelle, ordre, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', '00000000-0000-0000-0000-00000000a100', 'Sonde', 5, '2020-01-01', '2020-02-01') $$,
    '42501', 'admin_aal2_requis', 'admin de R, dates hors de l''année de P : refus de droits, pas d''indice sur les dates');
select tests.connecter('00000000-0000-0000-0000-00000000a0f1');
select throws_ok($$ insert into public.periodes (daara_id, annee_id, libelle, ordre, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', '00000000-0000-0000-0000-00000000a100', 'Sonde', 5, '2026-12-01', '2026-12-31') $$,
    '42501', 'admin_aal2_requis', 'utilisateur sans daara, dates chevauchantes : refus de droits, pas d''indice');
select tests.connecter('00000000-0000-0000-0000-00000000a0b1');
update public.annees_scolaires set libelle = 'Piraté';
delete from public.periodes;
select tests.connecter('00000000-0000-0000-0000-00000000a0a1');
select ok((select libelle from public.annees_scolaires where id = '00000000-0000-0000-0000-00000000a100') = '2026-2027'
    and (select count(*) from public.periodes) = 1, 'admin de R : modification et suppression sans effet sur P');
select throws_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', '2026-2027 ', '2026-10-01', '2027-07-31') $$, '23514', null,
    'libellé avec espaces autour : refusé (doublon déguisé)');
select throws_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', 'A' || chr(1564) || 'B', '2026-10-01', '2027-07-31') $$, '23514', null,
    'marque de lettre arabe U+061C : refusée');
select throws_ok($$ select created_by from public.annees_scolaires $$, '42501', null, 'created_by : illisible');
select throws_ok($$ update public.periodes set annee_id = '00000000-0000-0000-0000-00000000a200' $$, '42501', null,
    'annee_id d''une période : non modifiable');

-- Admin désactivé : plus rien.
reset role;
update public.memberships set actif = false where user_id = '00000000-0000-0000-0000-00000000a0a2';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-00000000a0a2');
select is((select count(*)::int from public.annees_scolaires), 0, 'admin désactivé : rien de lisible');
select throws_ok($$ select public.activer_annee('00000000-0000-0000-0000-00000000a200') $$, '42501', 'admin_aal2_requis',
    'admin désactivé : activer_annee refusée');
select tests.connecter('00000000-0000-0000-0000-00000000a0a1');

-- Clôture : l'admin seul, réversible.
select tests.connecter('00000000-0000-0000-0000-00000000a0e1');
update public.periodes set cloturee = true;
select tests.connecter('00000000-0000-0000-0000-00000000a0a1');
select is((select cloturee from public.periodes where id = '00000000-0000-0000-0000-00000000a110'), false,
    'enseignant : ne clôture pas (aucune ligne modifiée)');
update public.periodes set cloturee = true where id = '00000000-0000-0000-0000-00000000a110';
select is((select cloturee from public.periodes where id = '00000000-0000-0000-0000-00000000a110'), true, 'admin : clôture');
select throws_ok($$ update public.periodes set date_fin = '2026-12-31' where id = '00000000-0000-0000-0000-00000000a110' $$,
    '23514', 'periode_cloturee', 'période clôturée : dates non modifiables');
select throws_ok($$ delete from public.periodes where id = '00000000-0000-0000-0000-00000000a110' $$,
    '23514', 'periode_cloturee', 'période clôturée : suppression refusée');
update public.periodes set cloturee = false where id = '00000000-0000-0000-0000-00000000a110';
select is((select cloturee from public.periodes where id = '00000000-0000-0000-0000-00000000a110'), false, 'admin : rouvre');
select tests.connecter('00000000-0000-0000-0000-00000000a0c1', 'aal1');
select is((select count(*)::int from public.periodes), 1, 'parent : lit les périodes');
select tests.connecter('00000000-0000-0000-0000-00000000a0b1');
select is((select count(*)::int from public.periodes), 0, 'admin d''une autre daara : aucune période lisible');

-- ---------------------------------------------------------------------------------------------------
-- Module désactivé : tout refusé, admin compris ; données retrouvées après réactivation.
-- ---------------------------------------------------------------------------------------------------
reset role;
update public.daara_modules set actif = false where daara_id = '00000000-0000-0000-0000-0000000a000a' and module = 'structure';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-00000000a0a1');
select is((select count(*)::int from public.annees_scolaires) + (select count(*)::int from public.periodes), 0,
    'module désactivé : rien de lisible, admin compris');
select throws_ok($$ insert into public.annees_scolaires (daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', 'X4', '2026-10-01', '2027-07-31') $$, '42501', null, 'module désactivé : création refusée');
select throws_ok($$ select public.activer_annee('00000000-0000-0000-0000-00000000a200') $$, '42501', 'admin_aal2_requis',
    'module désactivé : activer_annee refusée');
reset role;
update public.daara_modules set actif = true where daara_id = '00000000-0000-0000-0000-0000000a000a' and module = 'structure';
set local role authenticated;
select is((select count(*)::int from public.annees_scolaires), 2, 'module réactivé : données retrouvées');

-- Suppression d'une année inactive : ses périodes suivent, même clôturées ; journal avec auteur.
insert into public.periodes (daara_id, annee_id, libelle, ordre, date_debut, date_fin) values
    ('00000000-0000-0000-0000-0000000a000a', '00000000-0000-0000-0000-00000000a200', 'S1', 1, '2027-10-01', '2028-02-15');
update public.periodes set cloturee = true where annee_id = '00000000-0000-0000-0000-00000000a200';
delete from public.annees_scolaires where id = '00000000-0000-0000-0000-00000000a200';
reset role;
select is((select count(*)::int from public.periodes where annee_id = '00000000-0000-0000-0000-00000000a200'), 0,
    'année supprimée : ses périodes aussi');
select ok((select count(*) >= 3 and bool_and(user_id = '00000000-0000-0000-0000-00000000a0a1') from public.audit_log
    where table_name = 'periodes' and daara_id = '00000000-0000-0000-0000-0000000a000a'), 'journal des périodes avec l''auteur');
-- La suppression d'une daara emporte son année active.
select lives_ok($$ delete from public.daaras where id = '00000000-0000-0000-0000-0000000a000a' $$,
    'daara supprimée : son année active part avec elle');

select * from finish();
rollback;
