-- Sprint 2, S2.4 : gestion des membres (LLD §3.2, §4 ; docs/features/membres.md).
-- Aucune écriture directe du client sur memberships : RPC changer_role et definir_actif (admin aal2), garde-fous
-- (dernier admin, lignes immuables), nom figé à la désactivation, enseignant limité aux collègues actifs, auteur des
-- écritures tracé dans audit_log même en service_role.

-- Nom figé à la désactivation : l'admin ne lit plus le profil d'un membre désactivé (membres_administres) mais doit
-- le reconnaître dans la liste pour le réactiver. Mêmes caractères interdits que les noms du socle (LLD §3.2).
alter table public.memberships
    add column nom_affiche text check (char_length(nom_affiche) <= 201)
        check (nom_affiche !~ '[[:cntrl:]\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]');

-- Une ligne active n'expose jamais de nom figé (définir_actif, puis accepter_invitation au S2.5, doivent l'effacer).
alter table public.memberships
    add constraint memberships_nom_affiche_inactif check (not actif or nom_affiche is null);

-- L'enseignant ne voit que ses collègues ACTIFS (audits S2.4) : sans ce filtre, il lirait le nom figé des collègues
-- désactivés, alors qu'aucun profil de collègue ne lui est lisible.
drop policy memberships_select_enseignant on public.memberships;
create policy memberships_select_enseignant on public.memberships for select to authenticated
    using (role = 'enseignant' and actif and (select public.has_role(daara_id, array['enseignant']::public.role_membre[])));

-- =====================================================================================================
-- Auteur des écritures : auth.uid(), ou `daara.auteur` fixé (transaction locale) par une RPC appelée en service_role
-- par une Edge Function (S2.5, S2.6). Une valeur malformée est ignorée plutôt que de bloquer l'écriture.
-- =====================================================================================================
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_colonne text := coalesce(tg_argv[0], 'daara_id');
    v_ligne jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
    v_auteur text := current_setting('daara.auteur', true);
begin
    insert into public.audit_log (daara_id, table_name, record_id, action, old_data, new_data, user_id)
    values (
        (v_ligne ->> v_colonne)::uuid,
        tg_table_name,
        (v_ligne ->> 'id')::uuid,
        tg_op,
        case when tg_op <> 'INSERT' then to_jsonb(old) end,
        case when tg_op <> 'DELETE' then to_jsonb(new) end,
        coalesce(
            auth.uid(),
            case when v_auteur ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_auteur::uuid end
        )
    );
    return null;
end;
$$;
revoke execute on function public.audit_trigger() from public, anon, authenticated;

-- =====================================================================================================
-- Garde-fous de memberships
-- =====================================================================================================

-- Une ligne ne change ni de daara ni de personne (sinon un `update … set daara_id` vide une daara de son admin sans
-- passer par garder_un_admin) : pour déplacer quelqu'un, on désactive une ligne et on en crée une autre.
create function public.memberships_immuables()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.daara_id <> old.daara_id or new.user_id <> old.user_id then
        raise exception 'membership_immuable' using errcode = '23514';
    end if;
    return new;
end;
$$;
revoke execute on function public.memberships_immuables() from public, anon, authenticated;

create trigger memberships_immuables before update of daara_id, user_id on public.memberships
    for each row execute function public.memberships_immuables();

-- Une daara garde toujours au moins un admin actif : changement de rôle, désactivation (y compris de soi-même),
-- suppression. Seule la suppression en cascade d'une daara passe (la daara n'est alors plus visible) ; la suppression
-- d'un compte qui est le dernier admin d'une daara est refusée (effacement CDP, sprint 12 : nommer un autre admin ou
-- supprimer la daara d'abord).
-- Verrous : la daara (`for no key update`, qui ne bloque pas les clés étrangères), puis les autres admins actifs.
-- Deux retraits simultanés passent l'un après l'autre et le second voit le premier (READ COMMITTED : nouvel
-- instantané ; en REPEATABLE READ, le verrou sur une ligne modifiée par l'autre transaction lève une erreur de
-- sérialisation : jamais zéro admin).
create function public.garder_un_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if old.role <> 'admin' or not old.actif then
        return null;
    end if;
    if tg_op = 'UPDATE' and new.role = 'admin' and new.actif then
        return null;
    end if;
    perform 1 from public.daaras d where d.id = old.daara_id for no key update;
    if not found then
        return null; -- daara supprimée (cascade)
    end if;
    perform 1 from public.memberships m
    where m.daara_id = old.daara_id and m.role = 'admin' and m.actif and m.id <> old.id
    for update;
    if not found then
        raise exception 'dernier_admin' using errcode = '23514';
    end if;
    return null;
end;
$$;
revoke execute on function public.garder_un_admin() from public, anon, authenticated;

create trigger memberships_garder_un_admin after update of role, actif or delete on public.memberships
    for each row execute function public.garder_un_admin();

-- =====================================================================================================
-- RPC
-- Erreurs : 42501 admin_aal2_requis (y compris membership inconnu ou d'une autre daara : pas d'oracle) ;
-- 22023 role_invalide ; 23505 role_deja_attribue ; 23514 dernier_admin / donnee_invalide.
-- =====================================================================================================

-- Membership ciblé, verrouillé, si l'appelant est admin aal2 de sa daara. Droits vérifiés AVANT tout verrou (un
-- inconnu ne verrouille rien), puis verrous dans un ordre unique (daara, puis membership : pas d'interblocage entre
-- deux RPC) et revérification : un admin désactivé entre-temps par un autre admin n'agit plus.
create function public.membership_administre(p_membership uuid)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_daara uuid;
    v_cible public.memberships;
begin
    select m.daara_id into v_daara from public.memberships m where m.id = p_membership;
    if v_daara is null or not public.has_role(v_daara, array['admin']::public.role_membre[]) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    perform 1 from public.daaras d where d.id = v_daara for no key update;
    select * into v_cible from public.memberships m where m.id = p_membership for update;
    if v_cible.id is null or not public.has_role(v_daara, array['admin']::public.role_membre[]) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    return v_cible;
end;
$$;
revoke execute on function public.membership_administre(uuid) from public, anon, authenticated;

-- Change le rôle d'un membre (admin, enseignant, parent ; les comptes apprenants arrivent au sprint 4).
-- Promu admin, le membre devra activer la double authentification à sa prochaine connexion (ADR-006).
create function public.changer_role(p_membership uuid, p_role public.role_membre)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_cible public.memberships := public.membership_administre(p_membership);
begin
    if p_role is null or p_role = 'apprenant' or v_cible.role = 'apprenant' then
        raise exception 'role_invalide' using errcode = '22023';
    end if;
    if v_cible.role = p_role then
        return;
    end if;
    if exists (
        select 1 from public.memberships m
        where m.daara_id = v_cible.daara_id and m.user_id = v_cible.user_id and m.role = p_role
    ) then
        raise exception 'role_deja_attribue' using errcode = '23505';
    end if;
    update public.memberships set role = p_role where id = v_cible.id;
end;
$$;
revoke execute on function public.changer_role(uuid, public.role_membre) from public, anon;
grant execute on function public.changer_role(uuid, public.role_membre) to authenticated;

-- Désactive (accès retiré immédiatement par la RLS, données conservées, nom figé) ou réactive un membre.
create function public.definir_actif(p_membership uuid, p_actif boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_cible public.memberships := public.membership_administre(p_membership);
begin
    if p_actif is null then
        raise exception 'donnee_invalide' using errcode = '23514';
    end if;
    if v_cible.actif = p_actif then
        return;
    end if;
    update public.memberships m
    set actif = p_actif,
        nom_affiche = case
            when p_actif then null
            else (
                select nullif(left(btrim(p.prenom || ' ' || p.nom), 201), '')
                from public.profiles p where p.id = m.user_id
            )
        end
    where m.id = v_cible.id;
end;
$$;
revoke execute on function public.definir_actif(uuid, boolean) from public, anon;
grant execute on function public.definir_actif(uuid, boolean) to authenticated;
