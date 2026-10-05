-- Sprint 2, S2.5a : invitations (LLD §3.2, §4, §7.1 ; docs/features/invitations.md ; ADR-009).
-- Table `invitations` écrite uniquement par les RPC ; jeton jamais stocké (haché SHA-256) ; acceptation liée au contact
-- invité ; hook `before_user_created` : pas d'inscription publique par téléphone (comptes téléphone créés seulement par
-- l'Edge Function `accept-invitation`, API d'administration).

-- Journal : colonnes exclues passées après la colonne de daara (`audit_trigger('daara_id', 'token_hash')`) ; prépare
-- l'ADR « colonnes exclues » d'avant le sprint 5. Recrée la fonction de S2.4 (même comportement sans exclusion).
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_colonne text := coalesce(tg_argv[0], 'daara_id');
    v_exclues text[] := coalesce(tg_argv[1:tg_nargs - 1], '{}');
    v_ligne jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
    v_auteur text := current_setting('daara.auteur', true);
begin
    insert into public.audit_log (daara_id, table_name, record_id, action, old_data, new_data, user_id)
    values (
        (v_ligne ->> v_colonne)::uuid,
        tg_table_name,
        (v_ligne ->> 'id')::uuid,
        tg_op,
        case when tg_op <> 'INSERT' then to_jsonb(old) - v_exclues end,
        case when tg_op <> 'DELETE' then to_jsonb(new) - v_exclues end,
        coalesce(
            auth.uid(),
            case when v_auteur ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_auteur::uuid end
        )
    );
    return null;
end;
$$;
revoke execute on function public.audit_trigger() from public, anon, authenticated;

create table public.invitations (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    role public.role_membre not null check (role in ('admin', 'enseignant', 'parent')),
    -- Contact : exactement un des deux. E-mail en minuscules ; téléphone au format E.164.
    email text check (char_length(email) <= 254 and email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    telephone text check (telephone ~ '^\+[1-9][0-9]{7,14}$'),
    nom text check (char_length(nom) <= 100) check (nom !~ '[[:cntrl:]\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]'),
    prenom text check (char_length(prenom) <= 100) check (prenom !~ '[[:cntrl:]\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]'),
    langue text not null default 'fr' check (langue in ('fr', 'en')),
    token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
    expires_at timestamptz not null default now() + interval '7 days',
    accepted_at timestamptz,
    accepted_by uuid references auth.users (id) on delete set null,
    revoked_at timestamptz,
    invited_by uuid default auth.uid() references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    check (num_nonnulls(email, telephone) = 1)
);
-- Liste de l'admin et quota journalier (sert aussi d'index sur daara_id).
create index invitations_daara_id_created_at_idx on public.invitations (daara_id, created_at desc);
-- Une seule invitation en attente par (daara, contact, rôle) : creer_invitation révoque la précédente.
create unique index invitations_en_attente_uniq on public.invitations (daara_id, coalesce(email, telephone), role)
    where accepted_at is null and revoked_at is null;

-- Le haché du jeton n'entre pas dans le journal (lisible par l'admin).
create trigger invitations_audit after insert or update on public.invitations
    for each row execute function public.audit_trigger('daara_id', 'token_hash');

alter table public.invitations enable row level security;
revoke insert, update, delete on public.invitations from authenticated;
-- Le haché du jeton n'est jamais lisible par le client.
revoke select on public.invitations from authenticated;
grant select (id, daara_id, role, email, telephone, nom, prenom, langue, expires_at, accepted_at, accepted_by, revoked_at,
    invited_by, created_at) on public.invitations to authenticated;

create policy invitations_select_admin on public.invitations for select to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])));

-- =====================================================================================================
-- Fonctions internes
-- =====================================================================================================

-- Chiffres d'un numéro (Supabase Auth stocke `auth.users.phone` sans « + »).
create function public.chiffres(p_texte text)
returns text
language sql
immutable
set search_path = ''
as $$
    select regexp_replace(coalesce(p_texte, ''), '[^0-9]', '', 'g');
$$;
revoke execute on function public.chiffres(text) from public, anon, authenticated;

-- Haché du jeton (base64url de 32 octets, 43 caractères) ; null si le format est invalide.
create function public.hacher_jeton(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
    select case when p_token ~ '^[A-Za-z0-9_-]{43}$'
        then encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex') end;
$$;
revoke execute on function public.hacher_jeton(text) from public, anon, authenticated;

-- État d'une invitation.
create function public.etat_invitation(p_invitation public.invitations)
returns text
language sql
stable
set search_path = ''
as $$
    select case
        when p_invitation.revoked_at is not null then 'revoquee'
        when p_invitation.accepted_at is not null then 'utilisee'
        when p_invitation.expires_at <= now() then 'expiree'
        else 'valide'
    end;
$$;
revoke execute on function public.etat_invitation(public.invitations) from public, anon, authenticated;

-- Compte existant pour un contact (e-mail ou téléphone, comparé sur les chiffres).
create function public.compte_du_contact(p_email text, p_telephone text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    -- Comptes confirmés et non supprimés seulement : une inscription non confirmée avec l'adresse d'un autre ne doit
    -- pas faire croire au vrai titulaire qu'il a déjà un compte.
    select u.id from auth.users u
    where u.deleted_at is null
      and (
        (p_email is not null and lower(u.email) = p_email and u.email_confirmed_at is not null)
        or (p_telephone is not null and u.phone is not null and u.phone_confirmed_at is not null
            and public.chiffres(u.phone) = public.chiffres(p_telephone))
      )
    limit 1;
$$;
revoke execute on function public.compte_du_contact(text, text) from public, anon, authenticated;

-- Pour les Edge Functions (service_role) : aperçu d'une invitation à partir du jeton (`invitation-apercu`) et contrôle
-- avant création d'un compte téléphone (`accept-invitation`). Contact en clair : l'Edge Function le masque.
create function public.invitation_par_jeton(p_token text)
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
    select i.id, d.nom, i.role, i.email, i.telephone, i.langue, public.etat_invitation(i),
        public.compte_du_contact(i.email, i.telephone) is not null
    from public.invitations i
    join public.daaras d on d.id = i.daara_id
    where i.token_hash = public.hacher_jeton(p_token);
$$;
revoke execute on function public.invitation_par_jeton(text) from public, anon, authenticated;
grant execute on function public.invitation_par_jeton(text) to service_role;

-- Auteur des écritures faites en service_role (LLD §3.2) : fixé pour la transaction seulement (jamais pour la
-- connexion du pool). Interne : appelée par les RPC réservées à service_role (S2.5b, S2.6) dans la même transaction
-- que l'écriture (un appel PostgREST séparé serait une autre transaction, sans effet).
create function public.definir_auteur(p_auteur uuid)
returns void
language sql
set search_path = ''
as $$
    select set_config('daara.auteur', coalesce(p_auteur::text, ''), true);
$$;
revoke execute on function public.definir_auteur(uuid) from public, anon, authenticated, service_role;

-- =====================================================================================================
-- RPC
-- Erreurs : 42501 admin_aal2_requis / non_authentifie / contact_different / aal2_requis / daara_suspendue ; 22023
-- role_invalide / contact_invalide / jeton_invalide / invitation_<etat> ; 23505 deja_membre ; 23514 donnee_invalide ;
-- P0001 quota_invitations / quota_global_email.
-- =====================================================================================================

-- Crée une invitation (appelée par `invite-member` avec le JWT de l'admin) et renvoie le jeton, une seule fois : il est
-- tiré ici (32 octets aléatoires, base64url) et seul son haché est stocké.
-- Quotas sur 24 h glissantes (audit S2.5a : un compte peut créer 3 daaras) : 50 par daara, 50 par auteur toutes daaras
-- confondues, 200 invitations par e-mail pour toute la plateforme (quota Brevo de 300 / jour partagé avec l'Auth,
-- ADR-003). Compteurs lus sous verrous (daara, auteur, global) pris toujours dans le même ordre.
create function public.creer_invitation(
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
    update public.invitations i set revoked_at = now()
    where i.daara_id = p_daara and i.role = p_role and coalesce(i.email, i.telephone) = coalesce(v_email, v_telephone)
      and i.accepted_at is null and i.revoked_at is null;

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
    return query select v_id, v_jeton;
end;
$$;
revoke execute on function public.creer_invitation(uuid, public.role_membre, text, text, text, text, text) from public, anon;
grant execute on function public.creer_invitation(uuid, public.role_membre, text, text, text, text, text) to authenticated;

-- Annule une invitation en attente (sans effet si elle ne l'est plus).
create function public.revoquer_invitation(p_invitation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_daara uuid;
begin
    select i.daara_id into v_daara from public.invitations i where i.id = p_invitation;
    if v_daara is null or not public.has_role(v_daara, array['admin']::public.role_membre[]) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    update public.invitations i set revoked_at = now()
    where i.id = p_invitation and i.accepted_at is null and i.revoked_at is null;
end;
$$;
revoke execute on function public.revoquer_invitation(uuid) from public, anon;
grant execute on function public.revoquer_invitation(uuid) to authenticated;

-- Accepte une invitation pour l'utilisateur connecté : le contact du compte doit être celui de l'invitation (e-mail
-- confirmé ou téléphone confirmé) ; invitation admin : session aal2. Renvoie le slug de la daara.
create function public.accepter_invitation(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
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

    select u.email, u.email_confirmed_at, u.phone, u.phone_confirmed_at into v_user from auth.users u where u.id = v_uid;
    if not (
        (v_inv.email is not null and lower(v_user.email) = v_inv.email and v_user.email_confirmed_at is not null)
        or (v_inv.telephone is not null and v_user.phone_confirmed_at is not null
            and public.chiffres(v_user.phone) = public.chiffres(v_inv.telephone))
    ) then
        raise exception 'contact_different' using errcode = '42501';
    end if;
    -- Admin : double authentification exigée (ADR-006) ; tout compte avec un facteur vérifié : session aal2.
    if (v_inv.role = 'admin' and coalesce(auth.jwt() ->> 'aal', '') <> 'aal2') or not public.session_suffisante() then
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
revoke execute on function public.accepter_invitation(text) from public, anon;
grant execute on function public.accepter_invitation(text) to authenticated;

-- Un admin retiré (désactivé ou rétrogradé) : ses invitations en attente dans la daara sont révoquées. Un membre
-- désactivé : les invitations en attente vers son contact dans la daara aussi (il ne revient pas par un lien envoyé
-- plus tôt). L'acceptation revérifie de toute façon que l'auteur est encore admin.
create function public.revoquer_invitations_du_membre()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user record;
begin
    if old.role = 'admin' and old.actif and not (new.role = 'admin' and new.actif) then
        update public.invitations i set revoked_at = now()
        where i.daara_id = old.daara_id and i.invited_by = old.user_id
          and i.accepted_at is null and i.revoked_at is null;
    end if;
    if old.actif and not new.actif then
        select u.email, u.phone into v_user from auth.users u where u.id = old.user_id;
        update public.invitations i set revoked_at = now()
        where i.daara_id = old.daara_id and i.accepted_at is null and i.revoked_at is null
          and ((i.email is not null and i.email = lower(v_user.email))
            or (i.telephone is not null and v_user.phone is not null
                and public.chiffres(i.telephone) = public.chiffres(v_user.phone)));
    end if;
    return null;
end;
$$;
revoke execute on function public.revoquer_invitations_du_membre() from public, anon, authenticated;

create trigger memberships_revoquer_invitations after update of role, actif on public.memberships
    for each row execute function public.revoquer_invitations_du_membre();

-- =====================================================================================================
-- Hook Auth `before_user_created` (ADR-009) : appelé pour toute inscription publique, pas pour l'API d'administration.
-- Refuse une inscription qui porte un téléphone : les comptes téléphone naissent uniquement d'une invitation
-- (`accept-invitation`). Activé dans config.toml (local) et dans le tableau de bord (cloud, docs/deploiement.md).
-- =====================================================================================================
create function public.avant_creation_utilisateur(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
    if coalesce(event -> 'user' ->> 'phone', '') <> ''
       or coalesce(event -> 'user' -> 'app_metadata' ->> 'provider', '') = 'phone' then
        return jsonb_build_object('error', jsonb_build_object(
            'http_code', 403,
            'message', 'Inscription par téléphone réservée aux invitations.'
        ));
    end if;
    return '{}'::jsonb;
end;
$$;
revoke execute on function public.avant_creation_utilisateur(jsonb) from public, anon, authenticated;
grant execute on function public.avant_creation_utilisateur(jsonb) to supabase_auth_admin;

-- Hook Auth `send_sms` (ADR-009, audit S2.5a) : fournisseur SMS FACTICE local. Active la connexion par téléphone sans
-- aucun appel externe (un fournisseur Twilio factice transmettait quand même chaque numéro à api.twilio.com, hors UE).
-- Aucun SMS n'est envoyé : réponse vide = « envoyé » pour Auth, mais le code n'arrive nulle part.
create function public.envoi_sms_factice(event jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
    select '{}'::jsonb;
$$;
revoke execute on function public.envoi_sms_factice(jsonb) from public, anon, authenticated;
grant execute on function public.envoi_sms_factice(jsonb) to supabase_auth_admin;
