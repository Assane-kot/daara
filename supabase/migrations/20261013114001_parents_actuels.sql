-- Anciens parents (décision du développeur, 2026-10-13, ADR-010 §9) : un parent dont aucun enfant n'est inscrit dans la
-- daara garde son compte et l'historique de ses enfants (is_parent_of, sans limite), mais ne voit plus rien de ce qui
-- concerne toute l'école. « Membre actuel » = admin, enseignant, apprenant, ou parent ayant au moins un enfant inscrit.
-- Toute lecture « pour tous les membres » (années, périodes, matières ; annonces, notifications, calendrier à venir)
-- passe par membre_actuel au lieu de is_member.

create function public.parent_actuel(p_daara uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.has_role(p_daara, array['parent']::public.role_membre[]) and exists (
        select 1 from public.parent_links pl
        join public.apprenants a on a.id = pl.apprenant_id and a.statut = 'inscrit'
        where pl.daara_id = p_daara and pl.parent_user_id = (select auth.uid())
    );
$$;
revoke execute on function public.parent_actuel(uuid) from public, anon;
grant execute on function public.parent_actuel(uuid) to authenticated;

create function public.membre_actuel(p_daara uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.has_role(p_daara, array['admin', 'enseignant', 'apprenant']::public.role_membre[]) or public.parent_actuel(p_daara);
$$;
revoke execute on function public.membre_actuel(uuid) from public, anon;
grant execute on function public.membre_actuel(uuid) to authenticated;

drop policy annees_select_membre on public.annees_scolaires;
create policy annees_select_membre on public.annees_scolaires for select to authenticated
    using ((select public.membre_actuel(daara_id)) and (select public.module_actif(daara_id, 'structure')));
drop policy periodes_select_membre on public.periodes;
create policy periodes_select_membre on public.periodes for select to authenticated
    using ((select public.membre_actuel(daara_id)) and (select public.module_actif(daara_id, 'structure')));
drop policy matieres_select_membre on public.matieres;
create policy matieres_select_membre on public.matieres for select to authenticated
    using ((select public.membre_actuel(daara_id)) and (select public.module_actif(daara_id, 'structure')));

-- Membres (admin) : indicateur « ancien parent » et filtre « anciens_parents » (parents actifs sans enfant inscrit).
drop function public.rechercher_membres(uuid, text, public.role_membre, text, text, integer, integer);
create function public.rechercher_membres(
    p_daara uuid,
    p_texte text,
    p_role public.role_membre,
    p_etat text,
    p_tri text,
    p_offset integer,
    p_limite integer
)
returns table (
    id uuid,
    user_id uuid,
    role public.role_membre,
    actif boolean,
    nom text,
    telephone text,
    depuis timestamptz,
    ancien_parent boolean,
    total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_motif text;
begin
    if not public.has_role(p_daara, array['admin']::public.role_membre[]) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    if coalesce(p_etat, 'actifs') not in ('actifs', 'desactives', 'tous', 'anciens_parents')
        or coalesce(p_tri, 'role') not in ('role', 'nom', '-nom', 'depuis', '-depuis')
        or coalesce(p_offset, 0) < 0 or coalesce(p_limite, 20) not between 1 and 100
        or char_length(coalesce(p_texte, '')) > 100 then
        raise exception 'parametre_invalide' using errcode = '22023';
    end if;
    -- Motif LIKE calculé après la validation (longueur bornée) : spéciaux neutralisés, accents et casse ignorés.
    v_motif := '%' || replace(replace(replace(public.sans_accents(btrim(coalesce(p_texte, ''))), '\', '\\'), '%', '\%'), '_', '\_') || '%';

    return query
    with lignes as (
        select m.id, m.user_id, m.role, m.actif,
            coalesce(m.nom_affiche, case when m.actif then btrim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')) end, '') as nom,
            case when m.actif then p.telephone end as telephone,
            m.created_at as depuis,
            -- Parent actif sans aucun enfant inscrit dans la daara (2026-10-13).
            (m.role = 'parent' and m.actif and not exists (
                select 1 from public.parent_links pl
                join public.apprenants a on a.id = pl.apprenant_id and a.statut = 'inscrit'
                where pl.daara_id = m.daara_id and pl.parent_user_id = m.user_id
            )) as ancien_parent
        from public.memberships m
        left join public.profiles p on p.id = m.user_id
        where m.daara_id = p_daara
          and (p_role is null or m.role = p_role)
          and (coalesce(p_etat, 'actifs') in ('tous', 'anciens_parents') or m.actif = (coalesce(p_etat, 'actifs') = 'actifs'))
    )
    select l.id, l.user_id, l.role, l.actif, l.nom, l.telephone, l.depuis, l.ancien_parent, count(*) over ()
    from lignes l
    where public.sans_accents(l.nom || ' ' || coalesce(l.telephone, '')) like v_motif
      and (coalesce(p_etat, 'actifs') <> 'anciens_parents' or l.ancien_parent)
    order by
        case when coalesce(p_tri, 'role') = 'role' then array_position(enum_range(null::public.role_membre), l.role) end,
        case when coalesce(p_tri, 'role') in ('role', 'nom') then lower(l.nom) end,
        case when p_tri = '-nom' then lower(l.nom) end desc,
        case when p_tri = 'depuis' then l.depuis end,
        case when p_tri = '-depuis' then l.depuis end desc,
        l.id
    offset coalesce(p_offset, 0) limit coalesce(p_limite, 20);
end;
$$;
revoke execute on function public.rechercher_membres(uuid, text, public.role_membre, text, text, integer, integer) from public, anon;
grant execute on function public.rechercher_membres(uuid, text, public.role_membre, text, text, integer, integer) to authenticated;
