-- S4.3 : liens parents ↔ enfants, is_parent_of, lecture parent, invitation d'un parent depuis la fiche (LLD §3.4, §4).
-- Jeu : daara P (admin A, parent Pa, parent Pb désactivé, enseignant E titulaire de C1, invité U sans compte membre) ;
-- daara R (admin B, parent Pr, élève Rx). Élèves de P : Awa (C1, photo), Bineta (sans classe).
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;
create table tests.jetons (cle text primary key, id uuid, jeton text);
grant select, insert on tests.jetons to authenticated;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000017a1', 'admin.p17@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000017c1', 'pa.p17@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000017c2', 'pb.p17@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000017e1', 'ens.p17@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000017d1', 'invite.p17@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000017b1', 'admin.r17@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000017f1', 'pr.r17@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000170a', 'Daara P17', 'test-daara-p17', '00000000-0000-0000-0000-0000000017a1'),
    ('00000000-0000-0000-0000-00000000170b', 'Daara R17', 'test-daara-r17', '00000000-0000-0000-0000-0000000017b1');
insert into public.daara_modules (daara_id, module, actif) values ('00000000-0000-0000-0000-00000000170a', 'structure', true);
insert into public.memberships (daara_id, user_id, role, actif) values
    ('00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-0000000017a1', 'admin', true),
    ('00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-0000000017c1', 'parent', true),
    ('00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-0000000017c2', 'parent', true),
    ('00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-0000000017e1', 'enseignant', true),
    ('00000000-0000-0000-0000-00000000170b', '00000000-0000-0000-0000-0000000017b1', 'admin', true),
    ('00000000-0000-0000-0000-00000000170b', '00000000-0000-0000-0000-0000000017f1', 'parent', true);
update public.memberships set actif = false, nom_affiche = 'Ancien Parent' where user_id = '00000000-0000-0000-0000-0000000017c2';
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin) values
    ('00000000-0000-0000-0000-000000001710', '00000000-0000-0000-0000-00000000170a', '2026-2027', '2026-10-01', '2027-07-31');
insert into public.classes (id, daara_id, annee_id, nom, titulaire_id) values
    ('00000000-0000-0000-0000-0000000017c9', '00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-000000001710', 'C1',
     '00000000-0000-0000-0000-0000000017e1');
insert into public.apprenants (id, daara_id, nom, prenom, sexe, photo_path) values
    ('00000000-0000-0000-0000-0000000017e8', '00000000-0000-0000-0000-00000000170a', 'Ndiaye', 'Awa', 'F',
     '00000000-0000-0000-0000-00000000170a/apprenants/00000000-0000-0000-0000-0000000017e8.webp'),
    ('00000000-0000-0000-0000-0000000017e9', '00000000-0000-0000-0000-00000000170a', 'Ndiaye', 'Bineta', 'F', null),
    ('00000000-0000-0000-0000-0000000017f9', '00000000-0000-0000-0000-00000000170b', 'Sow', 'Rx', 'M', null);
insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-0000000017e8', '00000000-0000-0000-0000-0000000017c9',
     '00000000-0000-0000-0000-000000001710');
insert into storage.objects (bucket_id, name, owner_id) values
    ('photos', '00000000-0000-0000-0000-00000000170a/apprenants/00000000-0000-0000-0000-0000000017e8.webp', '00000000-0000-0000-0000-0000000017a1');

set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000017a1');

-- Liens créés par l'admin.
select lives_ok($$ insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-0000000017c1', '00000000-0000-0000-0000-0000000017e8', 'pere') $$,
    'admin : relie un parent à son enfant');
select throws_ok($$ insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-0000000017c2', '00000000-0000-0000-0000-0000000017e9', 'mere') $$,
    '23514', 'parent_invalide', 'parent désactivé : refusé');
select throws_ok($$ insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-0000000017e1', '00000000-0000-0000-0000-0000000017e9', 'tuteur') $$,
    '23514', 'parent_invalide', 'enseignant (pas parent) : refusé');
select throws_ok($$ insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-0000000017f1', '00000000-0000-0000-0000-0000000017e9', 'pere') $$,
    '23514', 'parent_invalide', 'parent d''une autre daara : refusé');
select throws_ok($$ insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-0000000017c1', '00000000-0000-0000-0000-0000000017e8', 'mere') $$,
    '23505', null, 'lien en double : refusé');
select throws_ok($$ update public.parent_links set parent_user_id = '00000000-0000-0000-0000-0000000017e1' $$, '42501', null,
    'parent d''un lien : non modifiable');
select tests.connecter('00000000-0000-0000-0000-0000000017b1');
select throws_ok($$ insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-0000000017c1', '00000000-0000-0000-0000-0000000017e9', 'pere') $$,
    '42501', 'admin_aal2_requis', 'admin d''une autre daara : refusé avant tout contrôle');

-- Lecture par le parent : son enfant, son inscription, sa classe, sa photo, ses liens.
select tests.connecter('00000000-0000-0000-0000-0000000017c1', 'aal1');
select results_eq($$ select prenom from public.apprenants $$, $$ values ('Awa'::text) $$, 'parent : lit son enfant seulement');
select is((select count(*)::int from public.inscriptions), 1, 'parent : inscription de son enfant');
select results_eq($$ select nom from public.classes $$, $$ values ('C1'::text) $$, 'parent : classe de son enfant');
select is((select count(*)::int from storage.objects where bucket_id = 'photos'), 1, 'parent : photo de son enfant');
select is((select count(*)::int from public.parent_links), 1, 'parent : ses liens');
select throws_ok($$ insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000170a', '00000000-0000-0000-0000-0000000017c1', '00000000-0000-0000-0000-0000000017e9', 'pere') $$,
    '42501', null, 'parent : ne crée pas de lien lui-même');

-- Enseignant : ni liens ni rattachement.
select tests.connecter('00000000-0000-0000-0000-0000000017e1');
select is((select count(*)::int from public.parent_links) + (select count(*)::int from public.invitation_enfants), 0,
    'enseignant : aucun lien ni enfant d''invitation lisible');

-- Invitation d'un parent depuis la fiche : enfants rattachés, « Renvoyer », acceptation.
select tests.connecter('00000000-0000-0000-0000-0000000017a1');
insert into tests.jetons (cle, id, jeton)
select 'v1', c.id, c.jeton from public.creer_invitation('00000000-0000-0000-0000-00000000170a', 'parent', 'invite.p17@test.local', null, null, null, 'fr') c;
select lives_ok($$ select public.rattacher_enfant_invitation((select id from tests.jetons where cle = 'v1'), '00000000-0000-0000-0000-0000000017e8', 'mere') $$,
    'admin : rattache Awa à l''invitation');
select public.rattacher_enfant_invitation((select id from tests.jetons where cle = 'v1'), '00000000-0000-0000-0000-0000000017e9', 'mere');
select throws_ok($$ select public.rattacher_enfant_invitation((select id from tests.jetons where cle = 'v1'), '00000000-0000-0000-0000-0000000017f9', 'mere') $$,
    '23514', 'autre_daara', 'enfant d''une autre daara : refusé');
select throws_ok($$ insert into public.invitation_enfants (daara_id, invitation_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000170a', (select id from tests.jetons where cle = 'v1'), '00000000-0000-0000-0000-0000000017e8', 'mere') $$,
    '42501', null, 'écriture directe d''un enfant d''invitation : refusée');
insert into tests.jetons (cle, id, jeton)
select 'v2', c.id, c.jeton from public.creer_invitation('00000000-0000-0000-0000-00000000170a', 'parent', 'invite.p17@test.local', null, null, null, 'fr') c;
select is((select count(*)::int from public.invitation_enfants where invitation_id = (select id from tests.jetons where cle = 'v2')), 2,
    '« Renvoyer » : les deux enfants suivent la nouvelle invitation');
-- Purge différée (audit de fin de sprint 4) : déclenchée ici comme à la fin de la transaction.
set constraints all immediate;
select is((select count(*)::int from public.invitation_enfants where invitation_id = (select id from tests.jetons where cle = 'v2')), 2,
    'purge des invitations retirées : les enfants reportés sur la nouvelle invitation restent');
select tests.connecter('00000000-0000-0000-0000-0000000017e1');
select throws_ok($$ select public.rattacher_enfant_invitation((select id from tests.jetons where cle = 'v2'), '00000000-0000-0000-0000-0000000017e8', 'mere') $$,
    '42501', 'admin_aal2_requis', 'enseignant : rattachement refusé');

select tests.connecter('00000000-0000-0000-0000-0000000017d1', 'aal1');
select lives_ok($$ select public.accepter_invitation((select jeton from tests.jetons where cle = 'v2')) $$, 'l''invité accepte');
select results_eq($$ select prenom from public.apprenants order by prenom $$, $$ values ('Awa'::text), ('Bineta'::text) $$,
    'acceptation : liens créés, le nouveau parent voit ses deux enfants');
reset role;
select is((select count(*)::int from public.invitation_enfants where daara_id = '00000000-0000-0000-0000-00000000170a'), 0,
    'invitation acceptée : enfants rattachés effacés (liens créés)');
-- Décision du 2026-10-13 (ADR-010) : le parent garde son enfant sans limite de temps (élève parti, aucune année active).
select set_config('request.jwt.claims', '', true);
update public.apprenants set statut = 'parti' where id = '00000000-0000-0000-0000-0000000017e8';
update public.annees_scolaires set active = false where daara_id = '00000000-0000-0000-0000-00000000170a';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000017d1', 'aal1');
select results_eq($$ select prenom from public.apprenants order by prenom $$, $$ values ('Awa'::text), ('Bineta'::text) $$,
    'parent : enfant parti toujours visible, sans année active');

-- Parent désactivé : plus rien.
reset role;
update public.memberships set actif = false, nom_affiche = 'P A' where user_id = '00000000-0000-0000-0000-0000000017c1';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000017c1', 'aal1');
select is((select count(*)::int from public.apprenants) + (select count(*)::int from storage.objects where bucket_id = 'photos'), 0,
    'parent désactivé : plus d''enfant ni de photo');
reset role;
select ok(not exists (select 1 from public.audit_log where table_name in ('parent_links', 'invitation_enfants')
    and new_data::text like '%17e8%'), 'journal des liens sans valeurs');

select * from finish();
rollback;
