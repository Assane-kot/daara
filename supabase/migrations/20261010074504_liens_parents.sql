-- S4.3 Liens parents ↔ enfants (socle ; LLD §3.4, §4 ; ADR-010 ; spec apprenants.md) : liens créés par l'admin ou à
-- l'acceptation d'une invitation envoyée depuis la fiche d'un enfant ; le parent lit ses enfants, leurs inscriptions,
-- leurs classes et leurs photos (is_parent_of).

create type public.lien_parent as enum ('pere', 'mere', 'tuteur');

create table public.parent_links (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    parent_user_id uuid not null references auth.users (id) on delete cascade,
    apprenant_id uuid not null references public.apprenants (id) on delete cascade,
    lien public.lien_parent not null,
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null,
    unique (parent_user_id, apprenant_id)
);
create index parent_links_daara_id_idx on public.parent_links (daara_id);
create index parent_links_apprenant_id_idx on public.parent_links (apprenant_id);

-- Enfants rattachés à une invitation de parent en attente (un parent, plusieurs enfants) ; liens créés à l'acceptation.
create table public.invitation_enfants (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    invitation_id uuid not null references public.invitations (id) on delete cascade,
    apprenant_id uuid not null references public.apprenants (id) on delete cascade,
    lien public.lien_parent not null,
    created_at timestamptz not null default now(),
    unique (invitation_id, apprenant_id)
);
create index invitation_enfants_daara_id_idx on public.invitation_enfants (daara_id);
create index invitation_enfants_apprenant_id_idx on public.invitation_enfants (apprenant_id);

-- Lien : enfant de la daara, parent membre actif `parent` de la daara ; seul `lien` modifiable. Droits de l'écrivain
-- contrôlés en tête (admin), sauf pendant l'acceptation d'une invitation : la RPC pose l'indicateur de transaction
-- `daara.acceptation_invitation` après avoir vérifié l'invitation (aucune fonction exposée ne permet au client de
-- le poser ; une écriture directe reste de toute façon soumise à la RLS admin).
create function public.parent_links_coherents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if coalesce(current_setting('daara.acceptation_invitation', true), '') <> 'oui' then
        perform public.ecrivain_admin(new.daara_id);
    end if;
    if tg_op = 'UPDATE' then
        if new.daara_id <> old.daara_id or new.parent_user_id <> old.parent_user_id or new.apprenant_id <> old.apprenant_id then
            raise exception 'autre_daara' using errcode = '23514';
        end if;
        return new;
    end if;
    if not exists (select 1 from public.apprenants a where a.id = new.apprenant_id and a.daara_id = new.daara_id) then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    if not exists (
        select 1 from public.memberships m
        where m.daara_id = new.daara_id and m.user_id = new.parent_user_id and m.role = 'parent' and m.actif
    ) then
        raise exception 'parent_invalide' using errcode = '23514';
    end if;
    return new;
end;
$$;
revoke execute on function public.parent_links_coherents() from public, anon, authenticated;
create trigger parent_links_coherents before insert or update on public.parent_links
    for each row execute function public.parent_links_coherents();
create trigger parent_links_audit after insert or update or delete on public.parent_links
    for each row execute function public.audit_trigger_colonnes();
create trigger invitation_enfants_audit after insert or update or delete on public.invitation_enfants
    for each row execute function public.audit_trigger_colonnes();

-- Parent actif de l'enfant (daara de l'enfant), session suffisante (aal2 s'il a un facteur).
create function public.is_parent_of(p_apprenant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.session_suffisante() and exists (
        select 1 from public.parent_links pl
        join public.memberships m on m.daara_id = pl.daara_id and m.user_id = pl.parent_user_id and m.role = 'parent' and m.actif
        where pl.apprenant_id = p_apprenant and pl.parent_user_id = auth.uid()
    );
$$;
revoke execute on function public.is_parent_of(uuid) from public, anon;
grant execute on function public.is_parent_of(uuid) to authenticated;

-- Classe d'un enfant du parent connecté (lecture de la classe par le parent).
create function public.classe_d_un_enfant(p_classe uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.inscriptions i where i.classe_id = p_classe and public.is_parent_of(i.apprenant_id)
    );
$$;
revoke execute on function public.classe_d_un_enfant(uuid) from public, anon;
grant execute on function public.classe_d_un_enfant(uuid) to authenticated;

-- =====================================================================================================
-- RLS et droits
-- =====================================================================================================
alter table public.parent_links enable row level security;
revoke select, insert, update on public.parent_links from authenticated;
grant select (id, daara_id, parent_user_id, apprenant_id, lien, created_at) on public.parent_links to authenticated;
grant insert (daara_id, parent_user_id, apprenant_id, lien) on public.parent_links to authenticated;
grant update (lien) on public.parent_links to authenticated;
create policy parent_links_select_admin on public.parent_links for select to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])));
create policy parent_links_select_parent on public.parent_links for select to authenticated
    using (parent_user_id = (select auth.uid()) and (select public.session_suffisante()));
create policy parent_links_insert_admin on public.parent_links for insert to authenticated
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[])));
create policy parent_links_update_admin on public.parent_links for update to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])))
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[])));
create policy parent_links_delete_admin on public.parent_links for delete to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])));

alter table public.invitation_enfants enable row level security;
revoke insert, update, delete on public.invitation_enfants from authenticated;
create policy invitation_enfants_select_admin on public.invitation_enfants for select to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])));

-- Parent : ses enfants, leurs inscriptions, leurs classes (module structure), leurs photos.
create policy apprenants_select_parent on public.apprenants for select to authenticated
    using ((select public.is_parent_of(id)));
create policy inscriptions_select_parent on public.inscriptions for select to authenticated
    using ((select public.is_parent_of(apprenant_id)) and (select public.module_actif(daara_id, 'structure')));
create policy classes_select_parent on public.classes for select to authenticated
    using ((select public.classe_d_un_enfant(id)) and (select public.module_actif(daara_id, 'structure')));

create or replace function public.photo_apprenant_lisible(p_nom text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.photo_apprenant_administree(p_nom)
        or case
            when p_nom ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/apprenants/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png)$'
                then exists (
                    select 1 from public.apprenants a
                    where a.id = split_part(split_part(p_nom, '/', 3), '.', 1)::uuid
                      and a.daara_id = split_part(p_nom, '/', 1)::uuid
                      and (public.enseigne_apprenant(a.id) or public.is_parent_of(a.id))
                )
            else false
        end;
$$;

-- =====================================================================================================
-- RPC : rattacher un enfant à une invitation de parent en attente (admin aal2).
-- =====================================================================================================
create function public.rattacher_enfant_invitation(p_invitation uuid, p_apprenant uuid, p_lien public.lien_parent)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_inv public.invitations;
begin
    select * into v_inv from public.invitations i where i.id = p_invitation;
    if v_inv.id is null or not public.has_role(v_inv.daara_id, array['admin']::public.role_membre[]) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    if v_inv.role <> 'parent' or public.etat_invitation(v_inv) <> 'valide' or p_lien is null then
        raise exception 'invitation_invalide' using errcode = '22023';
    end if;
    if not exists (select 1 from public.apprenants a where a.id = p_apprenant and a.daara_id = v_inv.daara_id) then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    insert into public.invitation_enfants (daara_id, invitation_id, apprenant_id, lien)
    values (v_inv.daara_id, v_inv.id, p_apprenant, p_lien)
    on conflict (invitation_id, apprenant_id) do update set lien = excluded.lien;
end;
$$;
revoke execute on function public.rattacher_enfant_invitation(uuid, uuid, public.lien_parent) from public, anon;
grant execute on function public.rattacher_enfant_invitation(uuid, uuid, public.lien_parent) to authenticated;

-- creer_invitation : enfants reportés de l'invitation annulée vers la nouvelle (corps repris de S2.5a).
create or replace function public.creer_invitation(
    p_daara uuid,
    p_role public.role_membre,
    p_email text,
    p_telephone text,
    p_nom text,
    p_prenom text,
    p_langue text
)
returns table (id uuid, jeton text)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_email text := nullif(lower(btrim(p_email)), '');
    v_telephone text := nullif(btrim(p_telephone), '');
    v_compte uuid;
    v_jeton text := translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
    v_id uuid;
    v_annulees uuid[];
begin
    if not public.has_role(p_daara, array['admin']::public.role_membre[]) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    if p_role is null or p_role not in ('admin', 'enseignant', 'parent') then
        raise exception 'role_invalide' using errcode = '22023';
    end if;
    if num_nonnulls(v_email, v_telephone) <> 1 then
        raise exception 'contact_invalide' using errcode = '22023';
    end if;

    perform 1 from public.daaras d where d.id = p_daara and d.statut = 'active' for no key update;
    if not found then
        raise exception 'daara_suspendue' using errcode = '42501';
    end if;
    if (select count(*) from public.invitations i
        where i.daara_id = p_daara and i.created_at > now() - interval '24 hours') >= 50 then
        raise exception 'quota_invitations' using errcode = 'P0001';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('invitations:auteur:' || auth.uid()::text, 0));
    if (select count(*) from public.invitations i
        where i.invited_by = auth.uid() and i.created_at > now() - interval '24 hours') >= 50 then
        raise exception 'quota_invitations' using errcode = 'P0001';
    end if;
    if v_email is not null then
        perform pg_advisory_xact_lock(hashtextextended('invitations:email:global', 0));
        if (select count(*) from public.invitations i
            where i.email is not null and i.created_at > now() - interval '24 hours') >= 200 then
            raise exception 'quota_global_email' using errcode = 'P0001';
        end if;
    end if;

    v_compte := public.compte_du_contact(v_email, v_telephone);
    if v_compte is not null and exists (
        select 1 from public.memberships m
        where m.daara_id = p_daara and m.user_id = v_compte and m.role = p_role and m.actif
    ) then
        raise exception 'deja_membre' using errcode = '23505';
    end if;

    -- Une nouvelle invitation identique annule la précédente (« Renvoyer » : nouveau jeton).
    with annulees as (
        update public.invitations i set revoked_at = now()
        where i.daara_id = p_daara and i.role = p_role and coalesce(i.email, i.telephone) = coalesce(v_email, v_telephone)
          and i.accepted_at is null and i.revoked_at is null
        returning i.id
    )
    select array_agg(a.id) into v_annulees from annulees a;

    begin
        insert into public.invitations (daara_id, role, email, telephone, nom, prenom, langue, token_hash)
        values (p_daara, p_role, v_email, v_telephone, nullif(btrim(p_nom), ''), nullif(btrim(p_prenom), ''),
            coalesce(p_langue, 'fr'), public.hacher_jeton(v_jeton))
        returning invitations.id into v_id;
    exception
        -- Données invalides (contraintes) ; jamais le détail de la contrainte (pas d'oracle sur les hachés).
        when check_violation or not_null_violation or string_data_right_truncation or unique_violation then
            raise exception 'donnee_invalide' using errcode = '23514';
    end;
    -- Enfants rattachés à l'invitation annulée (« Renvoyer », nouvel enfant d'une fratrie) : reportés sur la nouvelle.
    if v_annulees is not null then
        update public.invitation_enfants ie set invitation_id = v_id
        where ie.invitation_id = any (v_annulees)
          and not exists (select 1 from public.invitation_enfants x where x.invitation_id = v_id and x.apprenant_id = ie.apprenant_id);
    end if;
    return query select v_id, v_jeton;
end;
$$;

-- accepter_invitation_pour : liens parent ↔ enfant créés à l'acceptation (corps repris de S2.5b).
create or replace function public.accepter_invitation_pour(p_token text, p_uid uuid, p_nouveau_compte boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := p_uid;
    v_inv public.invitations;
    v_user record;
    v_membership public.memberships;
    v_etat text;
    v_daara uuid;
begin
    if v_uid is null then
        raise exception 'non_authentifie' using errcode = '42501';
    end if;
    -- Verrous dans le même ordre que creer_invitation (daara, puis invitation) : pas d'interblocage avec « Renvoyer ».
    select i.daara_id into v_daara from public.invitations i where i.token_hash = public.hacher_jeton(p_token);
    if v_daara is null then
        raise exception 'jeton_invalide' using errcode = '22023';
    end if;
    perform 1 from public.daaras d where d.id = v_daara for no key update;
    select * into v_inv from public.invitations i where i.token_hash = public.hacher_jeton(p_token) for update;
    v_etat := public.etat_invitation(v_inv);
    -- L'auteur doit être encore admin actif de la daara : un admin retiré ne revient pas par une invitation créée
    -- avant son départ (audits S2.5a).
    if v_etat = 'valide' and not exists (
        select 1 from public.memberships m
        where m.daara_id = v_inv.daara_id and m.user_id = v_inv.invited_by and m.role = 'admin' and m.actif
    ) then
        v_etat := 'revoquee';
    end if;
    if v_etat <> 'valide' then
        raise exception 'invitation_%', v_etat using errcode = '22023';
    end if;

    select u.email, u.email_confirmed_at, u.phone, u.phone_confirmed_at, u.raw_app_meta_data as app_metadata
    into v_user from auth.users u where u.id = v_uid;
    if not (
        (v_inv.email is not null and lower(v_user.email) = v_inv.email and v_user.email_confirmed_at is not null)
        or (v_inv.telephone is not null and v_user.phone_confirmed_at is not null
            and public.chiffres(v_user.phone) = public.chiffres(v_inv.telephone))
    ) then
        raise exception 'contact_different' using errcode = '42501';
    end if;
    if p_nouveau_compte then
        -- Compte créé à l'instant par `accept-invitation` POUR cette invitation (marqueur posé par l'API d'administration,
        -- que l'utilisateur ne peut pas modifier) : pas de rattachement d'un autre compte par ce chemin. Invité admin :
        -- l'accès reste fermé jusqu'à l'enrôlement TOTP (has_role exige aal2, enrôlement imposé à la connexion).
        if v_inv.telephone is null or v_user.app_metadata ->> 'invitation' is distinct from v_inv.id::text then
            raise exception 'contact_different' using errcode = '42501';
        end if;
    -- Admin : double authentification exigée (ADR-006) ; tout compte avec un facteur vérifié : session aal2.
    elsif (v_inv.role = 'admin' and coalesce(auth.jwt() ->> 'aal', '') <> 'aal2') or not public.session_suffisante() then
        raise exception 'aal2_requis' using errcode = '42501';
    end if;

    if not exists (select 1 from public.daaras d where d.id = v_inv.daara_id and d.statut = 'active') then
        raise exception 'daara_suspendue' using errcode = '42501';
    end if;
    select * into v_membership from public.memberships m
    where m.daara_id = v_inv.daara_id and m.user_id = v_uid and m.role = v_inv.role for update;
    if v_membership.id is null then
        insert into public.memberships (daara_id, user_id, role, created_by)
        values (v_inv.daara_id, v_uid, v_inv.role, v_inv.invited_by);
    elsif not v_membership.actif then
        update public.memberships set actif = true, nom_affiche = null where id = v_membership.id;
    end if;
    -- Déjà membre actif avec ce rôle : l'invitation est simplement consommée.

    -- Invitation d'un parent depuis la fiche d'un enfant (S4.3) : liens créés (enfants encore dans la daara).
    perform set_config('daara.acceptation_invitation', 'oui', true);
    insert into public.parent_links (daara_id, parent_user_id, apprenant_id, lien)
    select ie.daara_id, v_uid, ie.apprenant_id, ie.lien
    from public.invitation_enfants ie
    join public.apprenants a on a.id = ie.apprenant_id and a.daara_id = ie.daara_id
    where ie.invitation_id = v_inv.id and v_inv.role = 'parent'
    on conflict (parent_user_id, apprenant_id) do nothing;
    perform set_config('daara.acceptation_invitation', '', true);
    update public.invitations set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
    return (select d.slug from public.daaras d where d.id = v_inv.daara_id);
end;
$$;
