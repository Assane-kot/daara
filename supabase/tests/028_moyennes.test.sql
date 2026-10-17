-- S6.4 : moyennes calculées selon les réglages (ADR-012), cas chiffrés. Classe C1 : Maths (coef 2), Français (coef 1).
-- Évaluations du T1 : Maths D1 sur 10 coef 1, Maths C1 sur 20 coef 2, Français D sur 20 coef 1.
-- Awa : 5/10, 16/20, 12/20 → Maths (10×1 + 16×2) / 3 = 14 ; Français 12 ; générale pondérée (14×2 + 12) / 3 = 13,333…
-- Bineta : absente au D1, 11/20 au C1, pas de note en français.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create schema tests;
grant usage on schema tests to authenticated;
create function tests.connecter(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
    select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;
grant execute on function tests.connecter(uuid, text) to authenticated;
create function tests.postgres()
returns void language sql as $$ select set_config('request.jwt.claims', '', true); $$;
-- Moyenne d'un élève (matière donnée, sinon générale) pour C1 au T1, avec les droits de l'appelant.
create function tests.moy(p_eleve uuid, p_cm uuid default null)
returns numeric language sql as $$
    select (case when p_cm is null then e ->> 'generale' else e -> 'matieres' ->> p_cm::text end)::numeric
    from jsonb_array_elements(public.moyennes('00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002831') -> 'eleves') e
    where e ->> 'apprenant_id' = p_eleve::text;
$$;
grant execute on function tests.moy(uuid, uuid) to authenticated;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
    ('00000000-0000-0000-0000-0000000028a1', 'admin.p28@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000028e1', 'ens1.p28@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000028c1', 'pa.p28@test.local', 'authenticated', 'authenticated', now()),
    ('00000000-0000-0000-0000-0000000028b1', 'admin.r28@test.local', 'authenticated', 'authenticated', now());
insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000280a', 'Daara P28', 'test-daara-p28', '00000000-0000-0000-0000-0000000028a1'),
    ('00000000-0000-0000-0000-00000000280b', 'Daara R28', 'test-daara-r28', '00000000-0000-0000-0000-0000000028b1');
insert into public.daara_modules (daara_id, module, actif) values
    ('00000000-0000-0000-0000-00000000280a', 'structure', true), ('00000000-0000-0000-0000-00000000280a', 'notes', true),
    ('00000000-0000-0000-0000-00000000280a', 'absences', true),
    ('00000000-0000-0000-0000-00000000280b', 'structure', true), ('00000000-0000-0000-0000-00000000280b', 'notes', true);
insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-0000000028a1', 'admin'),
    ('00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-0000000028e1', 'enseignant'),
    ('00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-0000000028c1', 'parent'),
    ('00000000-0000-0000-0000-00000000280b', '00000000-0000-0000-0000-0000000028b1', 'admin');
insert into public.annees_scolaires (id, daara_id, libelle, date_debut, date_fin, active) values
    ('00000000-0000-0000-0000-000000002810', '00000000-0000-0000-0000-00000000280a', 'Année P', current_date - 60, current_date + 200, true);
insert into public.periodes (id, daara_id, annee_id, libelle, ordre, date_debut, date_fin) values
    ('00000000-0000-0000-0000-000000002831', '00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-000000002810', 'T1', 1, current_date - 60, current_date + 30);
insert into public.matieres (id, daara_id, nom, code) values
    ('00000000-0000-0000-0000-000000002841', '00000000-0000-0000-0000-00000000280a', 'Maths', 'MATH'),
    ('00000000-0000-0000-0000-000000002842', '00000000-0000-0000-0000-00000000280a', 'Français', 'FR');
insert into public.classes (id, daara_id, annee_id, nom) values
    ('00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-000000002810', 'C1');
insert into public.classe_matieres (id, daara_id, classe_id, matiere_id, coefficient, enseignant_id) values
    ('00000000-0000-0000-0000-000000002851', '00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002841', 2, '00000000-0000-0000-0000-0000000028e1'),
    ('00000000-0000-0000-0000-000000002852', '00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002842', 1, null);
insert into public.apprenants (id, daara_id, nom, prenom, sexe) values
    ('00000000-0000-0000-0000-0000000028f1', '00000000-0000-0000-0000-00000000280a', 'Ndiaye', 'Awa', 'F'),
    ('00000000-0000-0000-0000-0000000028f2', '00000000-0000-0000-0000-00000000280a', 'Sow', 'Bineta', 'F');
insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id) values
    ('00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-0000000028f1', '00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002810'),
    ('00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-0000000028f2', '00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002810');
insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien) values
    ('00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-0000000028c1', '00000000-0000-0000-0000-0000000028f1', 'mere');
insert into public.evaluations (id, daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, date_eval, bareme, coefficient)
select v.id::uuid, '00000000-0000-0000-0000-00000000280a', v.cm::uuid, '00000000-0000-0000-0000-0000000028d1',
    '00000000-0000-0000-0000-000000002831', (select id from public.types_evaluation where daara_id = '00000000-0000-0000-0000-00000000280a' and nom = 'Devoir'),
    v.libelle, v.jour, v.bareme, v.coef
from (values
    ('00000000-0000-0000-0000-000000002861', '00000000-0000-0000-0000-000000002851', 'Maths D1', current_date - 5, 10, 1),
    ('00000000-0000-0000-0000-000000002862', '00000000-0000-0000-0000-000000002851', 'Maths C1', current_date - 3, 20, 2),
    ('00000000-0000-0000-0000-000000002863', '00000000-0000-0000-0000-000000002852', 'Français D', current_date - 2, 20, 1)
) as v (id, cm, libelle, jour, bareme, coef);
insert into public.notes (daara_id, evaluation_id, apprenant_id, classe_id, classe_matiere_id, valeur, absent) values
    ('00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-000000002861', '00000000-0000-0000-0000-0000000028f1', '00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002851', 5, false),
    ('00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-000000002862', '00000000-0000-0000-0000-0000000028f1', '00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002851', 16, false),
    ('00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-000000002863', '00000000-0000-0000-0000-0000000028f1', '00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002852', 12, false),
    ('00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-000000002861', '00000000-0000-0000-0000-0000000028f2', '00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002851', null, true),
    ('00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-000000002862', '00000000-0000-0000-0000-0000000028f2', '00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002851', 11, false);

-- Calculs (sans RLS : propriétaire).
select is(array[public.arrondir_note(12.345, 'centieme'), public.arrondir_note(13.3333, 'dixieme'), public.arrondir_note(13.3333, 'quart'),
    public.arrondir_note(13.3333, 'demi'), public.arrondir_note(13.75, 'demi')], array[12.35, 13.3, 13.25, 13.5, 14.0]::numeric[],
    'arrondis : centième, dixième, quart, demi-point (moitié vers le haut)');
select is(tests.moy('00000000-0000-0000-0000-0000000028f1', '00000000-0000-0000-0000-000000002851'), 14.00::numeric,
    'matière : barème ramené et coefficients des évaluations (10×1 + 16×2) / 3 = 14');
select is(tests.moy('00000000-0000-0000-0000-0000000028f1', '00000000-0000-0000-0000-000000002852'), 12.00::numeric, 'français : 12');
select is(tests.moy('00000000-0000-0000-0000-0000000028f1'), 13.33::numeric, 'générale pondérée (14×2 + 12) / 3 = 13,33');
select is(tests.moy('00000000-0000-0000-0000-0000000028f2', '00000000-0000-0000-0000-000000002851'), 11.00::numeric,
    'absent « ne compte pas » : seule la composition compte (11)');
select is(tests.moy('00000000-0000-0000-0000-0000000028f2'), 11.00::numeric, 'matière sans note ignorée dans la générale');
select is(tests.moy('00000000-0000-0000-0000-0000000028f2', '00000000-0000-0000-0000-000000002852'), null::numeric, 'matière sans note : pas de moyenne');
select is((public.moyennes('00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002831') ->> 'seuil')::numeric, 10::numeric,
    'seuil par défaut : moitié du barème');

update public.reglages_notes set moyenne_generale = 'simple' where daara_id = '00000000-0000-0000-0000-00000000280a';
select is(tests.moy('00000000-0000-0000-0000-0000000028f1'), 13.00::numeric, 'générale simple (14 + 12) / 2 = 13');
update public.reglages_notes set moyenne_generale = 'ponderee', absence_evaluation = 'zero' where daara_id = '00000000-0000-0000-0000-00000000280a';
select is(tests.moy('00000000-0000-0000-0000-0000000028f2', '00000000-0000-0000-0000-000000002851'), 7.33::numeric,
    'absent compte 0 : (0×1 + 11×2) / 3 = 7,33');
update public.reglages_notes set absence_evaluation = 'zero_si_non_justifiee' where daara_id = '00000000-0000-0000-0000-00000000280a';
select is(tests.moy('00000000-0000-0000-0000-0000000028f2', '00000000-0000-0000-0000-000000002851'), 7.33::numeric,
    'absent non justifié : compte 0');
insert into public.appels (id, daara_id, classe_id, date_appel) values
    ('00000000-0000-0000-0000-000000002871', '00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-0000000028d1', current_date - 5);
insert into public.absences (daara_id, appel_id, apprenant_id, classe_id, date_absence, creneau, etat) values
    ('00000000-0000-0000-0000-00000000280a', '00000000-0000-0000-0000-000000002871', '00000000-0000-0000-0000-0000000028f2',
     '00000000-0000-0000-0000-0000000028d1', current_date - 5, 'journee', 'justifiee');
select is(tests.moy('00000000-0000-0000-0000-0000000028f2', '00000000-0000-0000-0000-000000002851'), 11.00::numeric,
    'absence du jour justifiée : ne compte pas');
update public.reglages_notes set absence_evaluation = 'ignorer', arrondi = 'dixieme' where daara_id = '00000000-0000-0000-0000-00000000280a';
select is(tests.moy('00000000-0000-0000-0000-0000000028f1'), 13.3::numeric, 'arrondi au dixième : 13,3');
update public.reglages_notes set arrondi = 'quart' where daara_id = '00000000-0000-0000-0000-00000000280a';
select is(tests.moy('00000000-0000-0000-0000-0000000028f1'), 13.25::numeric, 'arrondi au quart : 13,25');
update public.reglages_notes set arrondi = 'demi' where daara_id = '00000000-0000-0000-0000-00000000280a';
select is(tests.moy('00000000-0000-0000-0000-0000000028f1'), 13.5::numeric, 'arrondi au demi-point : 13,5');
update public.reglages_notes set arrondi = 'centieme' where daara_id = '00000000-0000-0000-0000-00000000280a';
update public.daaras set bareme = 10 where id = '00000000-0000-0000-0000-00000000280a';
select is(tests.moy('00000000-0000-0000-0000-0000000028f1', '00000000-0000-0000-0000-000000002851'), 7.00::numeric,
    'daara notée sur 10 : (5×1 + 8×2) / 3 = 7');
update public.daaras set bareme = 20 where id = '00000000-0000-0000-0000-00000000280a';

-- Droits : enseignant, parent, autre daara, module désactivé.
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000028e1');
select is(tests.moy('00000000-0000-0000-0000-0000000028f1', '00000000-0000-0000-0000-000000002851'), 14.00::numeric,
    'enseignant de la classe : moyennes de ses élèves');
select tests.connecter('00000000-0000-0000-0000-0000000028c1', 'aal1');
select is(tests.moy('00000000-0000-0000-0000-0000000028f1'), null::numeric, 'parent : rien de compté avant publication');
reset role;
select tests.postgres();
update public.evaluations set publiee_at = now() where daara_id = '00000000-0000-0000-0000-00000000280a';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000028c1', 'aal1');
select is(jsonb_array_length(public.moyennes('00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002831') -> 'eleves')
    || ':' || tests.moy('00000000-0000-0000-0000-0000000028f1'), '1:13.33', 'parent : son enfant seulement, notes publiées');
reset role;
select tests.postgres();
update public.reglages_notes set moyennes_visibles = false where daara_id = '00000000-0000-0000-0000-00000000280a';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000028c1', 'aal1');
select is(public.moyennes('00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002831'), '{"masquees": true}'::jsonb,
    'moyennes masquées aux parents (réglage)');
select tests.connecter('00000000-0000-0000-0000-0000000028b1');
select throws_ok($$ select public.moyennes('00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002831') $$, '42501', null,
    'admin d''une autre daara : refusé');
reset role;
select tests.postgres();
update public.daara_modules set actif = false where daara_id = '00000000-0000-0000-0000-00000000280a' and module = 'notes';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000028a1');
select throws_ok($$ select public.moyennes('00000000-0000-0000-0000-0000000028d1', '00000000-0000-0000-0000-000000002831') $$, '42501', null,
    'module notes désactivé : refusé, même pour l''admin');

select * from finish();
rollback;
