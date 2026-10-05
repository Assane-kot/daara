-- Sprint 2, S2.2 : modules activables par daara (ADR-008, LLD §3.2 et §4, docs/features/modules.md).
-- Ce que l'admin active est ce que tous les membres voient ; la RLS des tables de module exigera module_actif().

create type public.module_daara as enum (
    'structure', 'absences', 'notes', 'bulletins', 'coran_cahier', 'coran_recitations', 'coran_nafar', 'notifications'
);

-- Une ligne par (daara, module). Clé primaire en tête daara_id : sert d'index (garde-fou du socle).
create table public.daara_modules (
    daara_id uuid not null references public.daaras (id) on delete cascade,
    module public.module_daara not null,
    actif boolean not null default true,
    updated_at timestamptz not null default now(),
    updated_by uuid default auth.uid() references auth.users (id) on delete set null,
    primary key (daara_id, module)
);

create trigger daara_modules_set_updated_at before update on public.daara_modules
    for each row execute function public.set_updated_at();
create trigger daara_modules_audit after insert or update on public.daara_modules
    for each row execute function public.audit_trigger();

-- Lecture : membres de la daara (menus) et super-admin ; aucune écriture directe (RPC uniquement).
alter table public.daara_modules enable row level security;
revoke insert, update, delete on public.daara_modules from authenticated;
-- Minimisation : l'auteur d'un changement (updated_by) reste dans audit_log, réservé à l'admin.
revoke select on public.daara_modules from authenticated;
grant select (daara_id, module, actif, updated_at) on public.daara_modules to authenticated;

create policy daara_modules_select_membre on public.daara_modules for select to authenticated
    using ((select public.is_member(daara_id)));
create policy daara_modules_select_plateforme on public.daara_modules for select to authenticated
    using ((select public.is_platform_admin()));

-- =====================================================================================================
-- Prérequis (ADR-008) : absences, notes → structure ; bulletins → notes ; récitations, nafar → cahier.
-- =====================================================================================================
create function public.prerequis_module(p_module public.module_daara)
returns public.module_daara[]
language sql
immutable
set search_path = ''
as $$
    select case p_module
        when 'absences' then array['structure']::public.module_daara[]
        when 'notes' then array['structure']::public.module_daara[]
        when 'bulletins' then array['notes']::public.module_daara[]
        when 'coran_recitations' then array['coran_cahier']::public.module_daara[]
        when 'coran_nafar' then array['coran_cahier']::public.module_daara[]
        else array[]::public.module_daara[]
    end;
$$;
revoke execute on function public.prerequis_module(public.module_daara) from public, anon, authenticated;

-- Ensemble complété de tous ses prérequis (fermeture transitive : bulletins → notes → structure).
create function public.avec_prerequis(p_modules public.module_daara[])
returns public.module_daara[]
language plpgsql
immutable
set search_path = ''
as $$
declare
    -- Dédoublonné d'abord : sinon la boucle, qui s'arrête quand la taille ne change plus, sortirait trop tôt
    -- (['bulletins', 'bulletins'] donnait notes + bulletins sans structure : audit RLS S2.2).
    v_ensemble public.module_daara[] := array(select distinct m from unnest(coalesce(p_modules, array[]::public.module_daara[])) as m);
    v_avant integer;
begin
    loop
        v_avant := cardinality(v_ensemble);
        select array_agg(distinct m order by m) into v_ensemble
        from (
            select unnest(v_ensemble) as m
            union
            select unnest(public.prerequis_module(x)) from unnest(v_ensemble) as x
        ) t;
        v_ensemble := coalesce(v_ensemble, array[]::public.module_daara[]);
        exit when cardinality(v_ensemble) = v_avant;
    end loop;
    return v_ensemble;
end;
$$;
revoke execute on function public.avec_prerequis(public.module_daara[]) from public, anon, authenticated;

-- Tableau de modules acceptable : non nul, une dimension, sans élément nul, 16 éléments au plus (audit RLS S2.2 :
-- un tableau multidimensionnel faisait échouer array_position, un tableau énorme coûtait inutilement).
create function public.modules_valides(p_modules public.module_daara[])
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
    if p_modules is null then
        return false;
    end if;
    if cardinality(p_modules) = 0 then
        return true;
    end if;
    if array_ndims(p_modules) > 1 or cardinality(p_modules) > 16 then
        return false;
    end if;
    return array_position(p_modules, null) is null;
end;
$$;
revoke execute on function public.modules_valides(public.module_daara[]) from public, anon, authenticated;

-- Écrit l'état des 8 modules d'une daara (interne : appelée par definir_modules et creer_daara).
create function public.ecrire_modules(p_daara uuid, p_actifs public.module_daara[])
returns void
language sql
set search_path = ''
as $$
    insert into public.daara_modules (daara_id, module, actif)
    select p_daara, m, m = any (p_actifs)
    from unnest(enum_range(null::public.module_daara)) as m
    on conflict (daara_id, module) do update
        set actif = excluded.actif, updated_by = auth.uid()
        where public.daara_modules.actif is distinct from excluded.actif;
$$;
revoke execute on function public.ecrire_modules(uuid, public.module_daara[]) from public, anon, authenticated;

-- =====================================================================================================
-- Helper RLS et RPC
-- =====================================================================================================

-- Module activé pour la daara (sprint 11 : et permis par son offre). Faux pour qui n'est ni membre (session suffisante)
-- ni super-admin : aucun renseignement sur la configuration, ni sur l'existence, d'une autre daara (audit RLS S2.2).
create function public.module_actif(p_daara uuid, p_module public.module_daara)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select (public.is_member(p_daara) or public.is_platform_admin())
       and exists (
           select 1 from public.daara_modules dm
           where dm.daara_id = p_daara and dm.module = p_module and dm.actif
       );
$$;
revoke execute on function public.module_actif(uuid, public.module_daara) from public, anon;
grant execute on function public.module_actif(uuid, public.module_daara) to authenticated;

-- Fixe les modules actifs. Prérequis inactifs ajoutés ; désactiver un prérequis d'un module gardé actif est refusé.
-- Erreurs : 42501 non admin aal2 ; 23514 donnee_invalide / module_requis:<prérequis>:<module dépendant>.
create function public.definir_modules(p_daara uuid, p_modules public.module_daara[])
returns public.module_daara[]
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_demandes public.module_daara[];
    v_actuels public.module_daara[];
    v_final public.module_daara[];
    v_manque record;
begin
    if not public.has_role(p_daara, array['admin']::public.role_membre[]) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    if not public.modules_valides(p_modules) then
        raise exception 'donnee_invalide' using errcode = '23514';
    end if;

    v_demandes := array(select distinct unnest(p_modules));
    v_actuels := array(select dm.module from public.daara_modules dm where dm.daara_id = p_daara and dm.actif);

    -- Un prérequis actif retiré alors qu'un module qui en dépend reste demandé : refus explicite.
    select p.prerequis, d.module into v_manque
    from unnest(v_demandes) as d(module)
    cross join lateral unnest(public.avec_prerequis(array[d.module])) as p(prerequis)
    where p.prerequis <> d.module
      and not p.prerequis = any (v_demandes)
      and p.prerequis = any (v_actuels)
    limit 1;
    if found then
        raise exception 'module_requis:%:%', v_manque.prerequis, v_manque.module using errcode = '23514';
    end if;

    v_final := public.avec_prerequis(v_demandes);
    perform public.ecrire_modules(p_daara, v_final);
    return v_final;
end;
$$;
revoke execute on function public.definir_modules(uuid, public.module_daara[]) from public, anon;
grant execute on function public.definir_modules(uuid, public.module_daara[]) to authenticated;

-- Active ou désactive UN module à partir de l'état en base (écran Modules) : deux admins sur le même écran ne
-- s'écrasent pas (audit S2.2). Mêmes règles que definir_modules, qui fait le contrôle des droits.
create function public.basculer_module(p_daara uuid, p_module public.module_daara, p_actif boolean)
returns public.module_daara[]
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_actuels public.module_daara[];
begin
    if not public.has_role(p_daara, array['admin']::public.role_membre[]) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    if p_module is null or p_actif is null then
        raise exception 'donnee_invalide' using errcode = '23514';
    end if;
    -- Verrou des lignes de la daara : deux bascules simultanées s'enchaînent au lieu de se croiser.
    perform 1 from public.daara_modules dm where dm.daara_id = p_daara for update;
    v_actuels := array(select dm.module from public.daara_modules dm where dm.daara_id = p_daara and dm.actif);
    return public.definir_modules(
        p_daara,
        case when p_actif then array_append(v_actuels, p_module) else array_remove(v_actuels, p_module) end
    );
end;
$$;
revoke execute on function public.basculer_module(uuid, public.module_daara, boolean) from public, anon;
grant execute on function public.basculer_module(uuid, public.module_daara, boolean) to authenticated;

-- =====================================================================================================
-- creer_daara : modules choisis à l'onboarding (profil), tous par défaut.
-- =====================================================================================================
drop function public.creer_daara(text, text, text, text, text, integer);

create function public.creer_daara(
    p_nom text,
    p_slug text,
    p_ville text default null,
    p_telephone text default null,
    p_langue_defaut text default 'fr',
    p_bareme integer default 20,
    p_modules public.module_daara[] default null
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
       or p_bareme is null or p_bareme not in (10, 20)
       or (p_modules is not null and not public.modules_valides(p_modules)) then
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

    perform public.ecrire_modules(
        v_daara,
        public.avec_prerequis(coalesce(p_modules, enum_range(null::public.module_daara)))
    );

    return v_slug;
end;
$$;
revoke execute on function public.creer_daara(text, text, text, text, text, integer, public.module_daara[]) from public, anon;
grant execute on function public.creer_daara(text, text, text, text, text, integer, public.module_daara[]) to authenticated;

-- =====================================================================================================
-- Reprise : les daaras existantes gardent tout (rien ne disparaît sans décision de leur admin).
-- =====================================================================================================
insert into public.daara_modules (daara_id, module, actif)
select d.id, m, true
from public.daaras d
cross join unnest(enum_range(null::public.module_daara)) as m
on conflict do nothing;
