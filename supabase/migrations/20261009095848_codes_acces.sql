-- S2.6 Réinitialisation d'accès assistée (ADR-006 niveau 2, LLD §3.2, §4, §6, spec reinitialisation-assistee.md).
-- L'admin (aal2) génère un code de 8 caractères pour un membre actif non admin ; le membre l'utilise sur
-- `/auth/code-acces` via l'Edge Function `use-access-code` (service_role) qui change son mot de passe.

create table public.codes_acces (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
    expires_at timestamptz not null default now() + interval '24 hours',
    -- Utilisé, annulé par un nouveau code ou invalidé après 5 essais : le code n'est plus actif.
    used_at timestamptz,
    tentatives smallint not null default 0 check (tentatives between 0 and 5),
    cree_par uuid default auth.uid() references auth.users (id) on delete set null,
    created_at timestamptz not null default now()
);
create index codes_acces_daara_id_created_at_idx on public.codes_acces (daara_id, created_at desc);
-- Un seul code actif par utilisateur (toutes daaras confondues) : un nouveau code annule le précédent.
create unique index codes_acces_actif_uniq on public.codes_acces (user_id) where used_at is null;

-- Le haché du code n'entre pas dans le journal (lisible par l'admin).
create trigger codes_acces_audit after insert or update on public.codes_acces
    for each row execute function public.audit_trigger('daara_id', 'code_hash');

alter table public.codes_acces enable row level security;
revoke insert, update, delete on public.codes_acces from authenticated;
revoke select on public.codes_acces from authenticated;
grant select (id, daara_id, user_id, expires_at, used_at, tentatives, created_at) on public.codes_acces to authenticated;

create policy codes_acces_select_admin on public.codes_acces for select to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])));

-- =====================================================================================================
-- Fonctions internes
-- =====================================================================================================

-- Code saisi normalisé (majuscules, sans espaces ni tirets) ; null si ce n'est pas un code de 8 caractères de
-- l'alphabet (A-Z sans I ni O, chiffres 2-9).
create function public.normaliser_code_acces(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
    select c from (select upper(regexp_replace(coalesce(p_code, ''), '[[:space:]-]', '', 'g')) as c) n
    where c ~ '^[A-HJ-NP-Z2-9]{8}$';
$$;
revoke execute on function public.normaliser_code_acces(text) from public, anon, authenticated;

-- Haché lié au compte (un même code n'a pas le même haché pour deux comptes).
create function public.hacher_code_acces(p_user uuid, p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
    select encode(extensions.digest(convert_to(p_user::text || ':' || p_code, 'UTF8'), 'sha256'), 'hex');
$$;
revoke execute on function public.hacher_code_acces(uuid, text) from public, anon, authenticated;

-- Admin actif d'au moins une daara, ou super-admin : jamais réinitialisé par un code (ADR-006, décision D1 de S2.6 ;
-- super-admin ajouté par l'audit RLS).
create function public.est_admin_quelque_part(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (select 1 from public.memberships m where m.user_id = p_user and m.role = 'admin' and m.actif)
        or exists (select 1 from public.platform_admins pa where pa.user_id = p_user);
$$;
revoke execute on function public.est_admin_quelque_part(uuid) from public, anon, authenticated;

-- =====================================================================================================
-- RPC
-- Erreurs : 42501 admin_aal2_requis / daara_suspendue ; 22023 cible_invalide.
-- =====================================================================================================

-- Crée un code pour un membre actif non admin (dans aucune daara) de la daara de l'admin, autre que lui-même. Renvoie
-- le code en clair (`XXXX-XXXX`), une seule fois : seul son haché est stocké. Le précédent code actif est annulé.
create function public.creer_code_acces(p_membership uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_cible public.memberships := public.membership_administre(p_membership);
    v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_octets bytea := extensions.gen_random_bytes(8);
    v_code text;
begin
    -- membership_administre a verrouillé la daara : son état est stable jusqu'à la fin de la transaction.
    if not exists (select 1 from public.daaras d where d.id = v_cible.daara_id and d.statut = 'active') then
        raise exception 'daara_suspendue' using errcode = '42501';
    end if;
    if not v_cible.actif or v_cible.user_id = auth.uid() or public.est_admin_quelque_part(v_cible.user_id) then
        raise exception 'cible_invalide' using errcode = '22023';
    end if;

    -- 32 symboles : octet modulo 32 sans biais.
    select string_agg(substr(v_alphabet, get_byte(v_octets, i) % 32 + 1, 1), '' order by i) into v_code
    from generate_series(0, 7) i;

    -- Un code actif par compte, toutes daaras confondues : deux admins de daaras différentes qui visent la même
    -- personne en même temps passent l'un après l'autre (sinon violation de l'index unique).
    perform pg_advisory_xact_lock(hashtextextended('codes_acces:' || v_cible.user_id::text, 0));
    update public.codes_acces c set used_at = now() where c.user_id = v_cible.user_id and c.used_at is null;
    insert into public.codes_acces (daara_id, user_id, code_hash)
    values (v_cible.daara_id, v_cible.user_id, public.hacher_code_acces(v_cible.user_id, v_code));
    return substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
end;
$$;
revoke execute on function public.creer_code_acces(uuid) from public, anon;
grant execute on function public.creer_code_acces(uuid) to authenticated;

-- Pour `use-access-code` (service_role) : vérifie et consomme le code du compte désigné par son identifiant (e-mail
-- confirmé ou téléphone confirmé). Renvoie le compte (et son e-mail confirmé, pour la notification) si le code est bon ;
-- aucune ligne sinon, sans dire pourquoi. Un essai faux est compté (5 au plus, puis le code est invalidé). Le code ne
-- vaut plus si, depuis sa création, le membre a été désactivé ou est devenu admin, si son auteur n'est plus admin actif
-- de la daara ou si la daara est suspendue.
create function public.consommer_code_acces(p_identifiant text, p_code text)
returns table (user_id uuid, email text, langue text)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_identifiant text := lower(btrim(coalesce(p_identifiant, '')));
    v_code text := public.normaliser_code_acces(p_code);
    v_user uuid;
    v_ligne public.codes_acces;
begin
    if v_code is null or v_identifiant = '' then
        return;
    end if;
    v_user := case when position('@' in v_identifiant) > 0
        then public.compte_du_contact(v_identifiant, null)
        else public.compte_du_contact(null, nullif(public.chiffres(v_identifiant), '')) end;
    if v_user is null then
        return;
    end if;

    select * into v_ligne from public.codes_acces c
    where c.user_id = v_user and c.used_at is null and c.expires_at > now()
    for update;
    if v_ligne.id is null then
        return;
    end if;

    if v_ligne.code_hash <> public.hacher_code_acces(v_user, v_code) then
        update public.codes_acces c
        set tentatives = c.tentatives + 1, used_at = case when c.tentatives + 1 >= 5 then now() end
        where c.id = v_ligne.id;
        return;
    end if;

    -- Auteur des écritures de cette transaction : le membre lui-même (LLD §3.2).
    perform public.definir_auteur(v_user);
    update public.codes_acces c set used_at = now() where c.id = v_ligne.id;
    if not exists (select 1 from public.daaras d where d.id = v_ligne.daara_id and d.statut = 'active')
        or not exists (
            select 1 from public.memberships m
            where m.daara_id = v_ligne.daara_id and m.user_id = v_user and m.actif and m.role <> 'admin'
        )
        or not exists (
            select 1 from public.memberships m
            where m.daara_id = v_ligne.daara_id and m.user_id = v_ligne.cree_par and m.actif and m.role = 'admin'
        )
        or public.est_admin_quelque_part(v_user) then
        return;
    end if;

    return query
    select u.id, case when u.email_confirmed_at is not null then u.email::text end, coalesce(p.langue, 'fr')
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = v_user;
end;
$$;
revoke execute on function public.consommer_code_acces(text, text) from public, anon, authenticated;
grant execute on function public.consommer_code_acces(text, text) to service_role;
