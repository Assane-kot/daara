-- S2.1 : `aal2` exigé pour tout accès d'un utilisateur ayant un facteur TOTP vérifié (LLD §4, session_suffisante).
-- Jeu : daara A ; enseignant avec facteur vérifié ; parent avec facteur non vérifié ; apprenant sans facteur.
begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

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
    ('00000000-0000-0000-0000-0000000002a1', 'ens.facteur@test.local', 'authenticated', 'authenticated', '{"nom": "Fall"}'),
    ('00000000-0000-0000-0000-0000000002a2', 'parent.nonverifie@test.local', 'authenticated', 'authenticated', '{"nom": "Ba"}'),
    ('00000000-0000-0000-0000-0000000002a3', 'apprenant.sans@test.local', 'authenticated', 'authenticated', '{"nom": "Sy"}'),
    ('00000000-0000-0000-0000-0000000002a4', 'admin.facteur@test.local', 'authenticated', 'authenticated', '{"nom": "Diop"}');

insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000020a', 'Daara S2', 'test-daara-s2', '00000000-0000-0000-0000-0000000002a1');

insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000020a', '00000000-0000-0000-0000-0000000002a1', 'enseignant'),
    ('00000000-0000-0000-0000-00000000020a', '00000000-0000-0000-0000-0000000002a2', 'parent'),
    ('00000000-0000-0000-0000-00000000020a', '00000000-0000-0000-0000-0000000002a3', 'apprenant'),
    ('00000000-0000-0000-0000-00000000020a', '00000000-0000-0000-0000-0000000002a4', 'admin'),
    ('00000000-0000-0000-0000-00000000020a', '00000000-0000-0000-0000-0000000002a4', 'enseignant');

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret) values
    ('00000000-0000-0000-0000-0000000002f1', '00000000-0000-0000-0000-0000000002a1', 'Téléphone', 'totp', 'verified', now(), now(), 'X'),
    ('00000000-0000-0000-0000-0000000002f2', '00000000-0000-0000-0000-0000000002a2', 'Abandonné', 'totp', 'unverified', now(), now(), 'Y'),
    ('00000000-0000-0000-0000-0000000002f3', '00000000-0000-0000-0000-0000000002a4', 'Téléphone admin', 'totp', 'verified', now(), now(), 'Z');

set local role authenticated;

-- Enseignant avec facteur vérifié, session aal1 : plus aucun accès à la daara.
select tests.connecter('00000000-0000-0000-0000-0000000002a1', 'aal1');
select ok(not public.is_member('00000000-0000-0000-0000-00000000020a'), 'facteur vérifié + aal1 : is_member faux');
select ok(
    not public.has_role('00000000-0000-0000-0000-00000000020a', array['enseignant']::public.role_membre[]),
    'facteur vérifié + aal1 : has_role enseignant faux'
);
select is_empty('select id from public.daaras', 'facteur vérifié + aal1 : daara invisible');
select is_empty(
    $$ select id from public.memberships where user_id <> '00000000-0000-0000-0000-0000000002a1' $$,
    'facteur vérifié + aal1 : memberships des autres invisibles'
);
-- …mais son profil et ses memberships restent lisibles (routage vers /auth/mfa).
select results_eq(
    'select id::text from public.profiles',
    array['00000000-0000-0000-0000-0000000002a1'],
    'facteur vérifié + aal1 : son profil reste lisible'
);
select results_eq(
    'select role::text from public.memberships',
    array['enseignant'],
    'facteur vérifié + aal1 : ses memberships restent lisibles'
);
-- Exécutable par authenticated depuis S2.7 (politique profiles_update_soi) : ne renseigne que sur la session de l'appelant.
select is(public.session_suffisante(), false, 'facteur vérifié + aal1 : session_suffisante renvoie faux à l''appelant');

-- Même enseignant en aal2 : accès normal.
select tests.connecter('00000000-0000-0000-0000-0000000002a1', 'aal2');
select ok(public.is_member('00000000-0000-0000-0000-00000000020a'), 'facteur vérifié + aal2 : is_member vrai');
select ok(
    public.has_role('00000000-0000-0000-0000-00000000020a', array['enseignant']::public.role_membre[]),
    'facteur vérifié + aal2 : has_role enseignant vrai'
);
select results_eq('select slug from public.daaras', array['test-daara-s2'], 'facteur vérifié + aal2 : daara visible');

-- Admin + enseignant avec facteur, en aal1 : ni admin ni enseignant, aucun journal, aucun autre profil (audit S2.1, M6).
select tests.connecter('00000000-0000-0000-0000-0000000002a4', 'aal1');
select ok(
    not public.has_role('00000000-0000-0000-0000-00000000020a', array['admin']::public.role_membre[]),
    'admin + enseignant avec facteur, aal1 : has_role admin faux'
);
select ok(
    not public.has_role('00000000-0000-0000-0000-00000000020a', array['enseignant']::public.role_membre[]),
    'admin + enseignant avec facteur, aal1 : has_role enseignant faux'
);
select is_empty('select id from public.audit_log', 'admin + enseignant avec facteur, aal1 : journal illisible');
select results_eq(
    'select id::text from public.profiles',
    array['00000000-0000-0000-0000-0000000002a4'],
    'admin + enseignant avec facteur, aal1 : aucun autre profil'
);
select tests.connecter('00000000-0000-0000-0000-0000000002a4', 'aal2');
select ok(
    (select count(*) from public.profiles) = 4,
    'admin avec facteur, aal2 : lit les profils des 4 membres actifs'
);

-- Facteur non vérifié (enrôlement abandonné) : rien n'est exigé de plus.
select tests.connecter('00000000-0000-0000-0000-0000000002a2', 'aal1');
select ok(public.is_member('00000000-0000-0000-0000-00000000020a'), 'facteur non vérifié + aal1 : is_member vrai');
select results_eq('select slug from public.daaras', array['test-daara-s2'], 'facteur non vérifié + aal1 : daara visible');

-- Sans facteur : inchangé.
select tests.connecter('00000000-0000-0000-0000-0000000002a3', 'aal1');
select ok(public.is_member('00000000-0000-0000-0000-00000000020a'), 'sans facteur + aal1 : is_member vrai');
select ok(
    public.has_role('00000000-0000-0000-0000-00000000020a', array['apprenant']::public.role_membre[]),
    'sans facteur + aal1 : has_role apprenant vrai'
);

-- Le facteur est retiré : l'accès en aal1 revient (lecture en direct, sans cache).
reset role;
delete from auth.mfa_factors where id = '00000000-0000-0000-0000-0000000002f1';
set local role authenticated;
select tests.connecter('00000000-0000-0000-0000-0000000002a1', 'aal1');
select ok(public.is_member('00000000-0000-0000-0000-00000000020a'), 'facteur retiré : is_member vrai en aal1');

-- anon : toujours rien.
reset role;
set local role anon;
select throws_ok($$ select public.is_member('00000000-0000-0000-0000-00000000020a') $$, '42501', null, 'anon : is_member refusé');

reset role;
select * from finish();
rollback;
