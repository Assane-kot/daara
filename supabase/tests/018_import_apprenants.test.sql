-- S4.4 : importer_apprenants (tout ou rien, 500 lignes, erreurs par ligne, simulation, classe par nom sans accents).
-- Jeu : daara P (admin A, enseignant E ; année active avec « Étoile CE1 » et « CP » ; année inactive avec « CM1 ») ;
-- daara R (admin B, classe R1). Élève existant dans P : Awa Ndiaye née le 2016-03-15.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;
create function tests.nb_eleves()
returns bigint language sql security definer set search_path = '' as $$
    select count(*) from public.apprenants where daara_id = '00000000-0000-0000-0000-00000000180a';
$$;
grant execute on function tests.nb_eleves() to authenticated;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000018a1', 'admin.p18@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000018e1', 'ens.p18@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000018b1', 'admin.r18@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000180a', 'Daara P18', 'test-daara-p18', '00000000-0000-0000-0000-0000000018a1'),
    ('00000000-0000-0000-0000-00000000180b', 'Daara R18', 'test-daara-r18', '00000000-0000-0000-0000-0000000018b1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-00000000180a', 'structure', true), ('00000000-0000-0000-0000-00000000180b', 'structure', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000180a', '00000000-0000-0000-0000-0000000018a1', 'admin'),
    ('00000000-0000-0000-0000-00000000180a', '00000000-0000-0000-0000-0000000018e1', 'enseignant'),
    ('00000000-0000-0000-0000-00000000180b', '00000000-0000-0000-0000-0000000018b1', 'admin');
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin, active) values
    ('00000000-0000-0000-0000-000000001810', '00000000-0000-0000-0000-00000000180a', '2026-2027', '2026-10-01', '2027-07-31', true),
    ('00000000-0000-0000-0000-000000001820', '00000000-0000-0000-0000-00000000180a', '2027-2028', '2027-10-01', '2028-07-31', false),
    ('00000000-0000-0000-0000-000000001830', '00000000-0000-0000-0000-00000000180b', '2026-2027', '2026-10-01', '2027-07-31', true);
insert into public.classes (id, daara_id, annee_id, nom) values
    ('00000000-0000-0000-0000-0000000018c1', '00000000-0000-0000-0000-00000000180a', '00000000-0000-0000-0000-000000001810', 'Étoile CE1'),
    ('00000000-0000-0000-0000-0000000018c2', '00000000-0000-0000-0000-00000000180a', '00000000-0000-0000-0000-000000001810', 'CP'),
    ('00000000-0000-0000-0000-0000000018c3', '00000000-0000-0000-0000-00000000180a', '00000000-0000-0000-0000-000000001820', 'CM1'),
    ('00000000-0000-0000-0000-0000000018c4', '00000000-0000-0000-0000-00000000180b', '00000000-0000-0000-0000-000000001830', 'R1');
insert into public.apprenants (daara_id, nom, prenom, date_naissance, sexe) values
    ('00000000-0000-0000-0000-00000000180a', 'Ndiaye', 'Awa', '2016-03-15', 'F');

set local role authenticated;

-- Droits.
select tests.connecter('00000000-0000-0000-0000-0000000018e1');
select throws_ok($$ select public.importer_apprenants('00000000-0000-0000-0000-00000000180a', '[{"nom":"Diop","prenom":"Ali","sexe":"M"}]') $$,
    '42501', 'droits', 'enseignant : import refusé');
select tests.connecter('00000000-0000-0000-0000-0000000018b1');
select throws_ok($$ select public.importer_apprenants('00000000-0000-0000-0000-00000000180a', '[{"nom":"Diop","prenom":"Ali","sexe":"M"}]') $$,
    '42501', 'droits', 'admin d''une autre daara : import refusé');
select tests.connecter('00000000-0000-0000-0000-0000000018a1', 'aal1');
select throws_ok($$ select public.importer_apprenants('00000000-0000-0000-0000-00000000180a', '[{"nom":"Diop","prenom":"Ali","sexe":"M"}]') $$,
    '42501', 'droits', 'admin sans second facteur (aal1) : import refusé');

select tests.connecter('00000000-0000-0000-0000-0000000018a1');

-- Taille.
select throws_ok($$ select public.importer_apprenants('00000000-0000-0000-0000-00000000180a', '[]') $$,
    '22023', 'import_vide', 'fichier vide : refusé');
select throws_ok($$ select public.importer_apprenants('00000000-0000-0000-0000-00000000180a',
    (select jsonb_agg(jsonb_build_object('nom', 'Diop', 'prenom', 'E' || g, 'sexe', 'M')) from generate_series(1, 501) g)) $$,
    '22023', 'import_trop_grand', '501 lignes : refusé');
select throws_ok($$ select public.importer_apprenants('00000000-0000-0000-0000-00000000180a',
    jsonb_build_array(jsonb_build_object('nom', 'Diop', 'prenom', 'Ali', 'sexe', 'M', 'classe', repeat('x', 1100000)))) $$,
    '22023', 'import_trop_grand', 'import de plus de 1 Mo : refusé');
select is(public.importer_apprenants('00000000-0000-0000-0000-00000000180a',
    jsonb_build_array(jsonb_build_object('nom', 'Diop', 'prenom', 'Ali', 'sexe', 'M', 'classe', repeat('x', 101)))) -> 'erreurs',
    '[{"ligne":1,"champ":"classe","code":"inconnue"}]'::jsonb, 'nom de classe de plus de 100 caractères : refusé');
select throws_ok($$ select public.importer_apprenants('00000000-0000-0000-0000-00000000180a', '[{"nom":"Diop","prenom":"Ali","sexe":"M"}]',
    '00000000-0000-0000-0000-0000000018c4') $$, '23514', 'classe_inconnue', 'classe par défaut d''une autre daara : refusée');
select throws_ok($$ select public.importer_apprenants('00000000-0000-0000-0000-00000000180a', '[{"nom":"Diop","prenom":"Ali","sexe":"M"}]',
    '00000000-0000-0000-0000-0000000018c3') $$, '23514', 'classe_inconnue', 'classe par défaut d''une année inactive : refusée');

-- Erreurs ligne par ligne, rien d'écrit.
select is(public.importer_apprenants('00000000-0000-0000-0000-00000000180a', $j$[
    {"nom":"Diop","prenom":"Ali","sexe":"M","date_naissance":"2017-01-02","classe":"CP"},
    {"nom":"","prenom":"Moussa","sexe":"M"},
    {"nom":"Fall","prenom":"Ibou","sexe":"X","date_naissance":"2017-02-30"},
    {"nom":"Sy","prenom":"Lala","sexe":"F","classe":"CM1"},
    {"nom":"ndiaye","prenom":"AWA","sexe":"F","date_naissance":"2016-03-15"},
    {"nom":"Diop","prenom":"Ali","sexe":"M","date_naissance":"2017-01-02"},
    "texte"
]$j$) -> 'erreurs', $j$[
    {"ligne":2,"champ":"nom","code":"requis"},
    {"ligne":3,"champ":"date_naissance","code":"invalide"},
    {"ligne":3,"champ":"sexe","code":"invalide"},
    {"ligne":4,"champ":"classe","code":"inconnue"},
    {"ligne":5,"champ":"ligne","code":"doublon"},
    {"ligne":6,"champ":"ligne","code":"doublon_fichier"},
    {"ligne":7,"champ":"ligne","code":"invalide"}
]$j$::jsonb, 'erreurs signalées par ligne et par champ (date impossible, classe d''une année inactive, doublons)');
select is(tests.nb_eleves(), 1::bigint, 'tout ou rien : aucune ligne écrite tant qu''il reste une erreur');
select is((public.importer_apprenants('00000000-0000-0000-0000-00000000180a',
    $j$[{"nom":"Diop","prenom":"Ali","sexe":"M","date_naissance":"1949-12-31"}, {"nom":" Ba ","prenom":"Ndèye\u200b","sexe":"F"}]$j$) -> 'erreurs'),
    $j$[{"ligne":1,"champ":"date_naissance","code":"invalide"}, {"ligne":2,"champ":"prenom","code":"invalide"}]$j$::jsonb,
    'date hors limites et caractère invisible refusés ; blancs autour retirés');

-- Simulation : rien d'écrit.
select is(public.importer_apprenants('00000000-0000-0000-0000-00000000180a',
    '[{"nom":"Diop","prenom":"Ali","sexe":"M"}]', null, true),
    '{"crees":0,"lignes":1,"erreurs":[]}'::jsonb, 'simulation sans erreur : rien d''écrit');
select is(tests.nb_eleves(), 1::bigint, 'simulation : aucune ligne écrite');

-- Import réel : matricules, classe par nom sans accents ni casse, classe par défaut pour les lignes sans classe.
select is(public.importer_apprenants('00000000-0000-0000-0000-00000000180a', $j$[
    {"nom":"Diop","prenom":"Ali","sexe":"M","date_naissance":"2017-01-02","classe":"etoile ce1"},
    {"nom":"Ba","prenom":"Ndèye","sexe":"F"},
    {"nom":"Ndiaye","prenom":"Awa","sexe":"F","date_naissance":"2018-05-01"}
]$j$, '00000000-0000-0000-0000-0000000018c2') -> 'crees', '3'::jsonb, 'import : 3 élèves créés (homonyme d''une autre date accepté)');
select is(tests.nb_eleves(), 4::bigint, '3 élèves de plus dans la daara');
select ok((select bool_and(matricule ~ '^[0-9]{4}-[0-9]{4,}$') from public.apprenants where daara_id = '00000000-0000-0000-0000-00000000180a'),
    'matricules attribués par la base');
select results_eq($$ select a.prenom, i.classe_id from public.inscriptions i join public.apprenants a on a.id = i.apprenant_id
    where i.daara_id = '00000000-0000-0000-0000-00000000180a' order by a.prenom $$,
    $$ values ('Ali'::text, '00000000-0000-0000-0000-0000000018c1'::uuid), ('Awa', '00000000-0000-0000-0000-0000000018c2'),
        ('Ndèye', '00000000-0000-0000-0000-0000000018c2') $$,
    'inscriptions : classe du fichier (sans accents) ou classe par défaut');

-- Réimport du même fichier : doublons, rien d'écrit.
select is(jsonb_array_length(public.importer_apprenants('00000000-0000-0000-0000-00000000180a',
    '[{"nom":"Diop","prenom":"Ali","sexe":"M","date_naissance":"2017-01-02"}]') -> 'erreurs'), 1, 'réimport : doublon signalé');

reset role;
select ok(not exists (select 1 from public.audit_log where table_name = 'apprenants'
    and daara_id = '00000000-0000-0000-0000-00000000180a' and new_data::text ~ 'Ndèye'), 'journal sans valeurs');

select * from finish();
rollback;
