-- S3.4 Liste paginée des membres pour `data-table` (LLD §4 ; spec structure-scolaire.md, membres.md) : recherche sans
-- accents (extension unaccent), filtres rôle / état, tri et pagination côté serveur. Mêmes données que la lecture directe
-- de S2.4 : nom du profil pour un membre actif, nom figé (`nom_affiche`) pour un désactivé, téléphone des actifs seulement.

create extension if not exists unaccent with schema extensions;

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
    total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    -- Motif LIKE : caractères spéciaux neutralisés, accents et casse ignorés.
    v_motif text := '%' || replace(replace(replace(
        extensions.unaccent('extensions.unaccent', lower(btrim(coalesce(p_texte, '')))), '\', '\\'), '%', '\%'), '_', '\_') || '%';
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
    where extensions.unaccent('extensions.unaccent', lower(l.nom || ' ' || coalesce(l.telephone, ''))) like v_motif
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

-- =====================================================================================================
-- Recherche sans accents des matières et des classes (`data-table`, filtre PostgREST `ilike`) : colonne générée,
-- en minuscules et sans accents. unaccent n'est pas immuable (dictionnaire) : enveloppe immuable à dictionnaire
-- explicite, seule utilisable dans une colonne générée.
-- =====================================================================================================
create function public.sans_accents(p_texte text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
    select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_texte, '')));
$$;
revoke execute on function public.sans_accents(text) from public, anon;
-- Évaluée à l'écriture des colonnes générées, avec les droits de l'écrivain : exécutable par authenticated (pure).
grant execute on function public.sans_accents(text) to authenticated;

alter table public.matieres add column recherche text generated always as (public.sans_accents(nom || ' ' || code)) stored;
alter table public.classes add column recherche text generated always as (public.sans_accents(nom || ' ' || coalesce(niveau, ''))) stored;
grant select (recherche) on public.matieres, public.classes to authenticated;
