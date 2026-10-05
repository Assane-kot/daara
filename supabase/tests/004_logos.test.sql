-- S2.3 : logo de la daara (bucket `logos`, LLD §5, docs/features/parametres-daara.md « Cas de test »).
-- Les limites de taille et de type sont appliquées par l'API Storage (vérifiées à la main) ; ici : bucket et RLS.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

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
    ('00000000-0000-0000-0000-0000000004a1', 'admin.l@test.local', 'authenticated', 'authenticated', '{"nom": "Diop"}'),
    ('00000000-0000-0000-0000-0000000004a2', 'ens.l@test.local', 'authenticated', 'authenticated', '{"nom": "Fall"}'),
    ('00000000-0000-0000-0000-0000000004b1', 'admin.k@test.local', 'authenticated', 'authenticated', '{"nom": "Sow"}');

insert into public.daaras (id, nom, slug, created_by) values
    ('00000000-0000-0000-0000-00000000040a', 'Daara L', 'test-daara-l', '00000000-0000-0000-0000-0000000004a1'),
    ('00000000-0000-0000-0000-00000000040b', 'Daara K', 'test-daara-k', '00000000-0000-0000-0000-0000000004b1');

insert into public.memberships (daara_id, user_id, role) values
    ('00000000-0000-0000-0000-00000000040a', '00000000-0000-0000-0000-0000000004a1', 'admin'),
    ('00000000-0000-0000-0000-00000000040a', '00000000-0000-0000-0000-0000000004a2', 'enseignant'),
    ('00000000-0000-0000-0000-00000000040b', '00000000-0000-0000-0000-0000000004b1', 'admin');

-- Bucket
select ok((select public from storage.buckets where id = 'logos'), 'bucket logos public en lecture');
select is((select file_size_limit from storage.buckets where id = 'logos'), 524288::bigint, 'bucket logos : 512 Ko maximum');
select is(
    (select allowed_mime_types from storage.buckets where id = 'logos'),
    array['image/png', 'image/jpeg', 'image/webp'],
    'bucket logos : PNG, JPEG, WebP uniquement (pas de SVG)'
);

-- L'API Storage autorise elle-même la suppression SQL (déclencheur `protect_delete`) ; ici on teste la RLS.
set local storage.allow_delete_query = 'true';
set local role authenticated;

-- Admin aal2 : dépôt, remplacement, suppression dans son dossier.
select tests.connecter('00000000-0000-0000-0000-0000000004a1', 'aal2');
select lives_ok(
    $$ insert into storage.objects (bucket_id, name, owner_id)
       values ('logos', '00000000-0000-0000-0000-00000000040a/logo.png', '00000000-0000-0000-0000-0000000004a1') $$,
    'logos : l''admin aal2 dépose le logo de sa daara'
);
select results_eq(
    $$ update storage.objects set metadata = '{"v": 2}'
       where bucket_id = 'logos' and name = '00000000-0000-0000-0000-00000000040a/logo.png' returning name $$,
    array['00000000-0000-0000-0000-00000000040a/logo.png'],
    'logos : l''admin aal2 remplace le logo de sa daara'
);
select throws_ok(
    $$ insert into storage.objects (bucket_id, name, owner_id)
       values ('logos', '00000000-0000-0000-0000-00000000040b/logo.png', '00000000-0000-0000-0000-0000000004a1') $$,
    '42501', null, 'logos : dépôt dans le dossier d''une autre daara refusé'
);
select throws_ok(
    $$ insert into storage.objects (bucket_id, name, owner_id)
       values ('logos', '00000000-0000-0000-0000-00000000040a/photo.png', '00000000-0000-0000-0000-0000000004a1') $$,
    '42501', null, 'logos : nom autre que logo.<ext> refusé'
);
select throws_ok(
    $$ insert into storage.objects (bucket_id, name, owner_id)
       values ('logos', '00000000-0000-0000-0000-00000000040a/logo.svg', '00000000-0000-0000-0000-0000000004a1') $$,
    '42501', null, 'logos : extension SVG refusée'
);
select throws_ok(
    $$ insert into storage.objects (bucket_id, name, owner_id)
       values ('logos', '00000000-0000-0000-0000-00000000040a/sous/logo.png', '00000000-0000-0000-0000-0000000004a1') $$,
    '42501', null, 'logos : sous-dossier refusé'
);
select throws_ok(
    $$ insert into storage.objects (bucket_id, name, owner_id)
       values ('logos', 'pas-un-uuid/logo.png', '00000000-0000-0000-0000-0000000004a1') $$,
    '42501', null, 'logos : dossier qui n''est pas un uuid refusé (sans erreur de conversion)'
);

-- Admin aal1, enseignant, admin d'une autre daara : refusés.
select tests.connecter('00000000-0000-0000-0000-0000000004a1', 'aal1');
select throws_ok(
    $$ insert into storage.objects (bucket_id, name, owner_id)
       values ('logos', '00000000-0000-0000-0000-00000000040a/logo.jpg', '00000000-0000-0000-0000-0000000004a1') $$,
    '42501', null, 'logos : admin en aal1 refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000004a2', 'aal2');
select throws_ok(
    $$ insert into storage.objects (bucket_id, name, owner_id)
       values ('logos', '00000000-0000-0000-0000-00000000040a/logo.jpg', '00000000-0000-0000-0000-0000000004a2') $$,
    '42501', null, 'logos : enseignant refusé'
);
select tests.connecter('00000000-0000-0000-0000-0000000004b1', 'aal2');
select is_empty(
    $$ delete from storage.objects where bucket_id = 'logos' and name = '00000000-0000-0000-0000-00000000040a/logo.png' returning name $$,
    'logos : l''admin d''une autre daara ne supprime pas le logo'
);
select is_empty(
    $$ update storage.objects set metadata = '{"pirate": true}'
       where bucket_id = 'logos' and name = '00000000-0000-0000-0000-00000000040a/logo.png' returning name $$,
    'logos : l''admin d''une autre daara ne remplace pas le logo'
);

-- Lecture (liste du bucket) : réservée à l'admin de la daara ; le public passe par l'URL publique, pas par la table.
select is_empty(
    $$ select name from storage.objects where bucket_id = 'logos' $$,
    'logos : l''admin d''une autre daara ne liste pas les logos'
);
select tests.connecter('00000000-0000-0000-0000-0000000004a2', 'aal2');
select is_empty(
    $$ select name from storage.objects where bucket_id = 'logos' $$,
    'logos : un enseignant ne liste pas les logos'
);
reset role;
set local role anon;
select is_empty(
    $$ select name from storage.objects where bucket_id = 'logos' $$,
    'logos : anon ne liste pas les logos'
);
reset role;
set local role authenticated;

-- Chemin enregistré sur la daara : même règle que le Storage.
select tests.connecter('00000000-0000-0000-0000-0000000004a1', 'aal2');
select throws_ok(
    $$ update public.daaras set logo_path = '00000000-0000-0000-0000-00000000040a/photo.png'
       where id = '00000000-0000-0000-0000-00000000040a' $$,
    '23514', null, 'daaras.logo_path : autre nom que logo.<ext> refusé'
);
select results_eq(
    $$ update public.daaras set logo_path = '00000000-0000-0000-0000-00000000040a/logo.webp'
       where id = '00000000-0000-0000-0000-00000000040a' returning logo_path $$,
    array['00000000-0000-0000-0000-00000000040a/logo.webp'],
    'daaras.logo_path : logo.webp accepté'
);

-- L'admin supprime son logo.
select results_eq(
    $$ delete from storage.objects where bucket_id = 'logos' and name = '00000000-0000-0000-0000-00000000040a/logo.png'
       returning name $$,
    array['00000000-0000-0000-0000-00000000040a/logo.png'],
    'logos : l''admin aal2 supprime le logo de sa daara'
);

reset role;
select * from finish();
rollback;
