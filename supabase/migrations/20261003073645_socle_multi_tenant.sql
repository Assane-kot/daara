-- Socle multi-tenant (sprint 1, LLD §3.2 et §4, docs/features/socle-multi-tenant.md) :
-- daaras, profiles, memberships, audit_log, platform_admins ; helpers RLS ; triggers ; creer_daara().

-- =====================================================================================================
-- Types et fonctions utilitaires
-- =====================================================================================================
create type public.role_membre as enum ('admin', 'enseignant', 'parent', 'apprenant');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- =====================================================================================================
-- Tables
-- =====================================================================================================

-- Textes affichés (noms, ville) : caractères de contrôle et caractères invisibles ou de mise en forme
-- bidirectionnelle interdits (usurpation d'un nom dans les listes, e-mails, PDF). Même liste dans handle_new_user.
--   [[:cntrl:]] ­ ​-‏ ‪-‮ ⁠-⁤ ⁦-⁩
-- Chemins Storage : `<id de la ligne>/<fichier>.<ext>`, sans sous-dossier ni `..` (règle supabase-rls, Storage).

-- Daara (tenant). Sans daara_id : c'est la racine. Créée uniquement par creer_daara().
create table public.daaras (
    id uuid primary key default gen_random_uuid(),
    nom text not null check (char_length(btrim(nom)) between 2 and 120)
        check (nom !~ '[[:cntrl:]­​-‏‪-‮⁠-⁤⁦-⁩﻿]'),
    -- Slugs réservés : segments de routes de l'application et noms trompeurs.
    slug text not null unique
        check (char_length(slug) between 3 and 50 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
        check (slug not in (
            'admin', 'administration', 'aide', 'api', 'app', 'assets', 'auth', 'compte', 'connexion', 'daara',
            'daaras', 'dashboard', 'demo', 'dev', 'help', 'i18n', 'images', 'inscription', 'login', 'logout',
            'mot-de-passe', 'onboarding', 'parametres', 'plateforme', 'root', 'select-daara', 'settings', 'signup',
            'static', 'support', 'superadmin', 'super-admin', 'system', 'test', 'www'
        )),
    ville text check (char_length(ville) <= 80)
        check (ville !~ '[[:cntrl:]­​-‏‪-‮⁠-⁤⁦-⁩﻿]'),
    telephone text check (telephone ~ '^\+?[0-9][0-9 .-]{5,19}$'),
    logo_path text check (logo_path ~ ('^' || id::text || '/[a-z0-9_-]{1,100}\.[a-z0-9]{2,5}$')),
    langue_defaut text not null default 'fr' check (langue_defaut in ('fr', 'en')),
    bareme smallint not null default 20 check (bareme in (10, 20)),
    statut text not null default 'active' check (statut in ('active', 'suspendue')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null
);
create index daaras_created_by_idx on public.daaras (created_by);

-- Profil d'un utilisateur (1-1 avec auth.users). Sans daara_id : une personne peut appartenir à plusieurs daaras.
create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    nom text not null default '' check (char_length(nom) <= 100)
        check (nom !~ '[[:cntrl:]­​-‏‪-‮⁠-⁤⁦-⁩﻿]'),
    prenom text not null default '' check (char_length(prenom) <= 100)
        check (prenom !~ '[[:cntrl:]­​-‏‪-‮⁠-⁤⁦-⁩﻿]'),
    telephone text check (telephone ~ '^\+?[0-9][0-9 .-]{5,19}$'),
    langue text not null default 'fr' check (langue in ('fr', 'en')),
    avatar_path text check (avatar_path ~ ('^' || id::text || '/[a-z0-9_-]{1,100}\.[a-z0-9]{2,5}$')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Appartenance d'un utilisateur à une daara, avec un rôle. Aucune écriture directe par le client (LLD §4).
-- L'index unique (daara_id, user_id, role) sert d'index sur daara_id.
create table public.memberships (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    role public.role_membre not null,
    actif boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null,
    unique (daara_id, user_id, role)
);
create index memberships_user_id_daara_id_idx on public.memberships (user_id, daara_id);

-- Journal d'audit. Pas de clé étrangère sur daara_id : le journal doit pouvoir être écrit pendant la
-- suppression en cascade d'une daara (et lui survivre). Durée de conservation et purge : à décider avant le
-- sprint 5 (PROGRESS.md, problèmes ouverts).
create table public.audit_log (
    id bigint generated always as identity primary key,
    daara_id uuid not null,
    table_name text not null,
    record_id uuid,
    action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
    old_data jsonb,
    new_data jsonb,
    user_id uuid default auth.uid(),
    at timestamptz not null default now()
);
create index audit_log_daara_id_at_idx on public.audit_log (daara_id, at desc);

-- Super-admins de la plateforme : renseignés à la main en SQL par le développeur.
create table public.platform_admins (
    user_id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

create trigger daaras_set_updated_at before update on public.daaras
    for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
    for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships
    for each row execute function public.set_updated_at();

-- =====================================================================================================
-- Helpers RLS (security definer : lisent memberships sans repasser par sa RLS)
-- =====================================================================================================

-- Membre actif de la daara, quel que soit le rôle.
create function public.is_member(p_daara uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.memberships m
        where m.daara_id = p_daara and m.user_id = auth.uid() and m.actif
    );
$$;

-- Membre actif avec un des rôles ; le rôle admin ne compte qu'en session aal2 (ADR-006).
create function public.has_role(p_daara uuid, p_roles public.role_membre[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.memberships m
        where m.daara_id = p_daara
          and m.user_id = auth.uid()
          and m.actif
          and m.role = any (p_roles)
          and (m.role <> 'admin' or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
    );
$$;

-- Membres actifs des daaras dont l'appelant est admin (aal2) : lecture des profils. Renvoie un ensemble pour
-- être évalué une seule fois par requête (`id in (select ...)`) et non pour chaque profil.
-- Un membre désactivé n'est plus lisible : minimisation des données (téléphone, apprenants mineurs).
create function public.membres_administres()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
    select distinct cible.user_id
    from public.memberships cible
    join public.memberships moi on moi.daara_id = cible.daara_id
    where coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
      and moi.user_id = auth.uid()
      and moi.role = 'admin'
      and moi.actif
      and cible.actif;
$$;

-- Super-admin de la plateforme, en session aal2 (ADR-006).
create function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
       and exists (select 1 from public.platform_admins p where p.user_id = auth.uid());
$$;

revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.has_role(uuid, public.role_membre[]) from public, anon;
revoke execute on function public.membres_administres() from public, anon;
revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.role_membre[]) to authenticated;
grant execute on function public.membres_administres() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;

-- =====================================================================================================
-- Triggers
-- =====================================================================================================

-- Crée le profil à l'inscription. Les métadonnées sont saisies par l'utilisateur : nettoyées et bornées.
-- Ne jamais s'appuyer sur raw_user_meta_data ailleurs : l'utilisateur peut le modifier à tout moment.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
    v_interdits constant text := '[[:cntrl:]­​-‏‪-‮⁠-⁤⁦-⁩﻿]';
begin
    insert into public.profiles (id, nom, prenom, langue)
    values (
        new.id,
        left(btrim(regexp_replace(coalesce(v_meta ->> 'nom', ''), v_interdits, '', 'g')), 100),
        left(btrim(regexp_replace(coalesce(v_meta ->> 'prenom', ''), v_interdits, '', 'g')), 100),
        case when v_meta ->> 'langue' in ('fr', 'en') then v_meta ->> 'langue' else 'fr' end
    );
    return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();

-- Journal d'audit générique. Argument facultatif : colonne portant l'identifiant de la daara (défaut daara_id).
create function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_colonne text := coalesce(tg_argv[0], 'daara_id');
    v_ligne jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
    insert into public.audit_log (daara_id, table_name, record_id, action, old_data, new_data, user_id)
    values (
        (v_ligne ->> v_colonne)::uuid,
        tg_table_name,
        (v_ligne ->> 'id')::uuid,
        tg_op,
        case when tg_op <> 'INSERT' then to_jsonb(old) end,
        case when tg_op <> 'DELETE' then to_jsonb(new) end,
        auth.uid()
    );
    return null;
end;
$$;
revoke execute on function public.audit_trigger() from public, anon, authenticated;

-- daaras : pas d'audit à la suppression (la ligne de journal ne doit pas bloquer la cascade).
create trigger daaras_audit after insert or update on public.daaras
    for each row execute function public.audit_trigger('id');
create trigger memberships_audit after insert or update or delete on public.memberships
    for each row execute function public.audit_trigger();

-- =====================================================================================================
-- RPC
-- =====================================================================================================

-- Crée une daara et rend son créateur admin, dans la même transaction (LLD §4, onboarding §7.0).
-- Erreurs : 42501 non authentifié / aal2 requis ; P0001 limite atteinte ; 23505 slug pris ; 23514 donnée invalide
-- (paramètre manquant, langue ou barème hors liste, slug réservé ou mal formé, nom invalide).
create function public.creer_daara(
    p_nom text,
    p_slug text,
    p_ville text default null,
    p_telephone text default null,
    p_langue_defaut text default 'fr',
    p_bareme integer default 20
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := auth.uid();
    v_daara uuid;
    v_slug text;
begin
    if v_user is null then
        raise exception 'non_authentifie' using errcode = '42501';
    end if;
    if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
        raise exception 'aal2_requis' using errcode = '42501';
    end if;
    -- Paramètres hors des contraintes de table (null, barème hors smallint) : une seule erreur 23514 pour le front.
    if p_nom is null or p_slug is null
       or p_langue_defaut is null or p_langue_defaut not in ('fr', 'en')
       or p_bareme is null or p_bareme not in (10, 20) then
        raise exception 'donnee_invalide' using errcode = '23514';
    end if;

    -- Sérialise les créations d'un même utilisateur pour que la limite ne soit pas contournée en parallèle.
    perform pg_advisory_xact_lock(hashtextextended('creer_daara:' || v_user::text, 0));
    if (select count(*) from public.daaras d where d.created_by = v_user) >= 3 then
        raise exception 'limite_daaras' using errcode = 'P0001';
    end if;

    insert into public.daaras (nom, slug, ville, telephone, langue_defaut, bareme, created_by)
    values (
        btrim(p_nom),
        lower(btrim(p_slug)),
        nullif(btrim(p_ville), ''),
        nullif(btrim(p_telephone), ''),
        p_langue_defaut,
        p_bareme,
        v_user
    )
    returning id, slug into v_daara, v_slug;

    insert into public.memberships (daara_id, user_id, role, created_by)
    values (v_daara, v_user, 'admin', v_user);

    return v_slug;
end;
$$;
revoke execute on function public.creer_daara(text, text, text, text, text, integer) from public, anon;
grant execute on function public.creer_daara(text, text, text, text, text, integer) to authenticated;

-- =====================================================================================================
-- RLS et privilèges (toutes les politiques visent authenticated ; anon n'a aucun droit, cf. securite_socle)
-- =====================================================================================================

-- daaras
alter table public.daaras enable row level security;
revoke insert, update, delete on public.daaras from authenticated;
grant update (nom, ville, telephone, logo_path, langue_defaut, bareme) on public.daaras to authenticated;

create policy daaras_select_membre on public.daaras for select to authenticated
    using ((select public.is_member(id)));
create policy daaras_select_plateforme on public.daaras for select to authenticated
    using ((select public.is_platform_admin()));
create policy daaras_update_admin on public.daaras for update to authenticated
    using ((select public.has_role(id, array['admin']::public.role_membre[])))
    with check ((select public.has_role(id, array['admin']::public.role_membre[])));

-- profiles
alter table public.profiles enable row level security;
revoke insert, update, delete on public.profiles from authenticated;
grant update (nom, prenom, telephone, langue, avatar_path) on public.profiles to authenticated;

create policy profiles_select_soi on public.profiles for select to authenticated
    using (id = (select auth.uid()));
create policy profiles_select_admin on public.profiles for select to authenticated
    using (id in (select public.membres_administres()));
create policy profiles_update_soi on public.profiles for update to authenticated
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));

-- memberships : lecture seule pour le client (écritures : creer_daara, puis Edge Functions au sprint 2)
alter table public.memberships enable row level security;
revoke insert, update, delete on public.memberships from authenticated;

create policy memberships_select_soi on public.memberships for select to authenticated
    using (user_id = (select auth.uid()));
create policy memberships_select_admin on public.memberships for select to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])));
-- L'enseignant ne voit que ses collègues ; parents et apprenants restent visibles par l'admin seul.
create policy memberships_select_enseignant on public.memberships for select to authenticated
    using (role = 'enseignant' and (select public.has_role(daara_id, array['enseignant']::public.role_membre[])));

-- audit_log : lecture par l'admin de la daara, écriture par audit_trigger uniquement
alter table public.audit_log enable row level security;
revoke insert, update, delete on public.audit_log from authenticated;

create policy audit_log_select_admin on public.audit_log for select to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])));

-- platform_admins : chacun sait s'il est super-admin, personne n'écrit
alter table public.platform_admins enable row level security;
revoke insert, update, delete on public.platform_admins from authenticated;

create policy platform_admins_select_soi on public.platform_admins for select to authenticated
    using (user_id = (select auth.uid()));
