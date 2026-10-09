-- Corrections de l'audit de fin de sprint 3 (2026-10-09).

-- =====================================================================================================
-- I1 : enseignants_daara ne rend plus à un enseignant le nom figé de TOUS ses collègues désactivés (lecture retirée
-- en S2.4) : pour un non-admin, un membre désactivé n'apparaît que s'il est encore titulaire ou enseignant d'une
-- classe de la daara (historique affiché dans la structure).
-- =====================================================================================================
create or replace function public.enseignants_daara(p_daara uuid)
returns table (user_id uuid, prenom text, nom text, actif boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_admin boolean := public.has_role(p_daara, array['admin']::public.role_membre[]);
begin
    if not (v_admin or public.has_role(p_daara, array['enseignant']::public.role_membre[]))
        or not public.module_actif(p_daara, 'structure') then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    return query
    select e.user_id, e.prenom, e.nom, e.actif
    from (
        select m.user_id,
            case when bool_or(m.actif) then max(p.prenom) end as prenom,
            case when bool_or(m.actif) then max(p.nom) else max(m.nom_affiche) end as nom,
            bool_or(m.actif) as actif
        from public.memberships m
        left join public.profiles p on p.id = m.user_id
        where m.daara_id = p_daara and m.role in ('enseignant', 'admin')
        group by m.user_id
    ) e
    where e.actif or v_admin
       or exists (select 1 from public.classes c where c.daara_id = p_daara and c.titulaire_id = e.user_id)
       or exists (select 1 from public.classe_matieres cm where cm.daara_id = p_daara and cm.enseignant_id = e.user_id);
end;
$$;

-- =====================================================================================================
-- Libellés des années et des périodes : même règle que les matières et les classes (NFC, sans blanc autour, espace
-- insécable compris) ; id plus choisi par le client.
-- =====================================================================================================
alter table public.annees_scolaires drop constraint annees_scolaires_libelle_check,
    add constraint annees_scolaires_libelle_check check (public.libelle_valide(libelle, 20));
alter table public.periodes drop constraint periodes_libelle_check,
    add constraint periodes_libelle_check check (public.libelle_valide(libelle, 40));
revoke insert on public.annees_scolaires, public.periodes from authenticated;
grant insert (daara_id, libelle, date_debut, date_fin) on public.annees_scolaires to authenticated;
grant insert (daara_id, annee_id, libelle, ordre, date_debut, date_fin) on public.periodes to authenticated;

-- =====================================================================================================
-- rechercher_membres : motif calculé après la validation des paramètres.
-- =====================================================================================================
create or replace function public.rechercher_membres(
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
    if coalesce(p_etat, 'actifs') not in ('actifs', 'desactives', 'tous')
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
            m.created_at as depuis
        from public.memberships m
        left join public.profiles p on p.id = m.user_id
        where m.daara_id = p_daara
          and (p_role is null or m.role = p_role)
          and (coalesce(p_etat, 'actifs') = 'tous' or m.actif = (coalesce(p_etat, 'actifs') = 'actifs'))
    )
    select l.id, l.user_id, l.role, l.actif, l.nom, l.telephone, l.depuis, count(*) over ()
    from lignes l
    where public.sans_accents(l.nom || ' ' || coalesce(l.telephone, '')) like v_motif
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
