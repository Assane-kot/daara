-- Sprint 2, S2.5b : acceptation d'une invitation par téléphone avec création du compte (ADR-009, décision I3 du
-- 2026-10-05). L'Edge Function `accept-invitation` crée le compte (API d'administration) puis le rattache à la daara
-- dans la foulée par `accepter_invitation_nouveau_compte` : jamais de compte téléphone orphelin, réutilisable ailleurs.
-- La logique d'acceptation est mise en commun (`accepter_invitation_pour`).

create function public.accepter_invitation_pour(p_token text, p_uid uuid, p_nouveau_compte boolean)
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

    update public.invitations set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
    return (select d.slug from public.daaras d where d.id = v_inv.daara_id);
end;
$$;
revoke execute on function public.accepter_invitation_pour(text, uuid, boolean) from public, anon, authenticated, service_role;

-- RPC du client (inchangée pour lui) : utilisateur connecté.
create or replace function public.accepter_invitation(p_token text)
returns text
language sql
security definer
set search_path = ''
as $$
    select public.accepter_invitation_pour(p_token, auth.uid(), false);
$$;
revoke execute on function public.accepter_invitation(text) from public, anon;
grant execute on function public.accepter_invitation(text) to authenticated;

-- Pour `accept-invitation` (service_role) : rattache le compte téléphone qu'elle vient de créer pour cette invitation.
-- Auteur tracé : le nouveau membre (definir_auteur, même transaction).
create function public.accepter_invitation_nouveau_compte(p_token text, p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform public.definir_auteur(p_user);
    return public.accepter_invitation_pour(p_token, p_user, true);
end;
$$;
revoke execute on function public.accepter_invitation_nouveau_compte(text, uuid) from public, anon, authenticated;
grant execute on function public.accepter_invitation_nouveau_compte(text, uuid) to service_role;

-- =====================================================================================================
-- Audit S2.5b
-- =====================================================================================================

-- Aperçu et contrôle avant création de compte : l'état tient compte de tout ce que vérifie l'acceptation (daara
-- suspendue, auteur qui n'est plus admin actif), pour ne jamais créer un compte voué à être supprimé.
create or replace function public.invitation_par_jeton(p_token text)
returns table (
    id uuid,
    daara_nom text,
    role public.role_membre,
    email text,
    telephone text,
    langue text,
    etat text,
    compte_existant boolean
)
language sql
stable
security definer
set search_path = ''
as $$
    select i.id, d.nom, i.role, i.email, i.telephone, i.langue,
        case
            when public.etat_invitation(i) <> 'valide' then public.etat_invitation(i)
            when d.statut <> 'active' then 'suspendue'
            when not exists (
                select 1 from public.memberships m
                where m.daara_id = i.daara_id and m.user_id = i.invited_by and m.role = 'admin' and m.actif
            ) then 'revoquee'
            else 'valide'
        end,
        public.compte_du_contact(i.email, i.telephone) is not null
    from public.invitations i
    join public.daaras d on d.id = i.daara_id
    where i.token_hash = public.hacher_jeton(p_token);
$$;
revoke execute on function public.invitation_par_jeton(text) from public, anon, authenticated;
grant execute on function public.invitation_par_jeton(text) to service_role;

-- E-mail d'invitation : séparateurs et caractères d'adresse composée refusés (une seule adresse, transmise telle quelle
-- au fournisseur d'e-mails).
alter table public.invitations drop constraint invitations_email_check;
alter table public.invitations add constraint invitations_email_check check (
    char_length(email) <= 254
    and email = lower(email)
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and email !~ '[][,;<>"()\\]'
);
