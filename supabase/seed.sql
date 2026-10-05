-- Données de développement chargées par `supabase db reset` (LOCAL uniquement). `db push` ne l'exécute pas, SAUF avec
-- `--include-seed` ; `db reset --linked` l'exécuterait aussi sur une base distante : ces deux commandes sont interdites
-- sur les projets cloud (docs/deploiement.md §2.7).
-- Comptes fictifs, mot de passe commun : daara2026dev (règle ADR-006 : 8 caractères, lettres et chiffres).
-- Aucun n'a de double authentification : un compte admin devrait l'activer à sa première connexion (enrôlement imposé).
--
-- | Compte                    | Daara Serigne Touba      | Daara Keur Thiès |
-- |---------------------------|--------------------------|------------------|
-- | enseignant.dev@daara.local | enseignant               | parent           |
-- | parent.dev@daara.local     | parent                   | —                |
-- | admin.dev@daara.local      | admin                    | admin            |
-- À compléter au sprint 5 (données de démonstration du pilote).

-- Garde-fou : une base contenant de vrais comptes (adresse hors `.local`) n'est pas une base locale de développement.
do $$
begin
    if exists (select 1 from auth.users where email is not null and email not like '%.local') then
        raise exception 'seed.sql : base non locale (comptes réels présents), chargement refusé';
    end if;
end;
$$;

insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
)
select
    '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
    extensions.crypt('daara2026dev', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', u.meta, now(), now(), '', '', '', ''
from (values
    ('d0000000-0000-0000-0000-000000000001'::uuid, 'enseignant.dev@daara.local', '{"prenom": "Modou", "nom": "Fall", "langue": "fr"}'::jsonb),
    ('d0000000-0000-0000-0000-000000000002'::uuid, 'parent.dev@daara.local', '{"prenom": "Fatou", "nom": "Ndiaye", "langue": "fr"}'::jsonb),
    ('d0000000-0000-0000-0000-000000000003'::uuid, 'admin.dev@daara.local', '{"prenom": "Awa", "nom": "Diop", "langue": "fr"}'::jsonb)
) as u(id, email, meta);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text, 'email', jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
from auth.users u
where u.email like '%.dev@daara.local';

insert into public.daaras (id, nom, slug, ville, created_by) values
    ('d1000000-0000-0000-0000-000000000001', 'Daara Serigne Touba', 'daara-serigne-touba', 'Mbacké', 'd0000000-0000-0000-0000-000000000003'),
    ('d1000000-0000-0000-0000-000000000002', 'Daara Keur Thiès', 'daara-keur-thies', 'Thiès', 'd0000000-0000-0000-0000-000000000003');

insert into public.memberships (daara_id, user_id, role, created_by) values
    ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'enseignant', 'd0000000-0000-0000-0000-000000000003'),
    ('d1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'parent', 'd0000000-0000-0000-0000-000000000003'),
    ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'parent', 'd0000000-0000-0000-0000-000000000003'),
    ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'admin', 'd0000000-0000-0000-0000-000000000003'),
    ('d1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'admin', 'd0000000-0000-0000-0000-000000000003');
