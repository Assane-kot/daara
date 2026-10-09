-- S2.7 Mon compte et sécurité (spec mon-compte.md, ADR-006).

-- =====================================================================================================
-- Profil : écriture soumise à session_suffisante (audit RLS S2.7). Qui a un facteur vérifié doit être en aal2 pour
-- modifier son profil, comme pour tout accès à une daara : sinon le seul mot de passe d'un admin suffirait à changer
-- son nom affiché (usurpation) et son téléphone. La lecture de son propre profil reste possible en aal1.
-- =====================================================================================================
-- Appelée directement par la politique : exécutable par authenticated (ne renseigne que sur sa propre session).
grant execute on function public.session_suffisante() to authenticated;
drop policy profiles_update_soi on public.profiles;
create policy profiles_update_soi on public.profiles for update to authenticated
    using (id = (select auth.uid()) and (select public.session_suffisante()))
    with check (id = (select auth.uid()) and (select public.session_suffisante()));

-- =====================================================================================================
-- Procédure super-admin (docs/exploitation.md) : un utilisateur a perdu tous ses appareils TOTP. Après vérification de
-- son identité hors ligne, le développeur lance dans le SQL Editor (rôle postgres) :
--     select public.retirer_facteurs('<uuid>', '<motif>');
-- Supprime les facteurs et les sessions : plus aucun rafraîchissement possible. Un jeton d'accès déjà émis reste
-- valable jusqu'à son expiration (1 h au plus : PostgREST ne consulte pas auth.sessions) ; d'où, dans la procédure,
-- le changement du mot de passe et le délai d'une heure. Exécutable par aucun rôle de l'API.
-- =====================================================================================================
create function public.retirer_facteurs(p_user uuid, p_motif text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
    v_motif text := btrim(coalesce(p_motif, ''));
    v_nombre integer;
begin
    if not exists (select 1 from auth.users u where u.id = p_user) then
        raise exception 'utilisateur_inconnu' using errcode = '22023';
    end if;
    if char_length(v_motif) < 5 or char_length(v_motif) > 200 or v_motif ~ '[[:cntrl:]]' then
        raise exception 'motif_requis' using errcode = '22023';
    end if;

    delete from auth.mfa_factors f where f.user_id = p_user;
    get diagnostics v_nombre = row_count;
    delete from auth.refresh_tokens r where r.user_id = p_user::text;
    delete from auth.sessions s where s.user_id = p_user;

    -- Ligne « plateforme » (daara nulle, lisible par aucun admin) : motif complet et opérateur.
    insert into public.audit_log (daara_id, table_name, record_id, action, old_data, user_id)
    values ('00000000-0000-0000-0000-000000000000', 'auth.mfa_factors', p_user, 'DELETE',
        jsonb_build_object('facteurs', v_nombre, 'motif', v_motif, 'operateur', current_user, 'procedure', 'retirer_facteurs'),
        null);
    -- Daaras où l'utilisateur est membre actif : l'admin voit l'opération, sans le motif (audits S2.7).
    insert into public.audit_log (daara_id, table_name, record_id, action, old_data, user_id)
    select distinct m.daara_id, 'auth.mfa_factors', p_user, 'DELETE',
        jsonb_build_object('facteurs', v_nombre, 'procedure', 'retirer_facteurs'), null::uuid
    from public.memberships m
    where m.user_id = p_user and m.actif;

    return v_nombre;
end;
$$;
revoke execute on function public.retirer_facteurs(uuid, text) from public, anon, authenticated, service_role;
