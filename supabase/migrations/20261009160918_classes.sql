-- S3.3 Classes et affectations (module `structure`, ADR-008 ; LLD §3.3, §4 ; spec structure-scolaire.md).
-- Classes d'une année (titulaire), matières enseignées par classe (coefficient, enseignant), helper teaches_class,
-- RPC enseignants_daara (noms des enseignants lisibles par l'enseignant sans ouvrir les profils).

-- Texte court affiché (nom de classe, niveau) : forme NFC, sans blanc en tête ni en fin, texte_sur (règle de S3.2).
create function public.libelle_valide(p_texte text, p_max integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
    select p_texte = normalize(p_texte, NFC) and p_texte !~ '^[[:space:]\u00A0]|[[:space:]\u00A0]$'
        and char_length(p_texte) between 1 and p_max and public.texte_sur(p_texte);
$$;
revoke execute on function public.libelle_valide(text, integer) from public, anon;
-- Évaluée dans les contraintes check (droits de l'écrivain) : fonction pure.
grant execute on function public.libelle_valide(text, integer) to authenticated;

-- Membre actif `enseignant` ou `admin` de la daara (titulaire, enseignant d'une matière).
create function public.est_enseignant_de(p_daara uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.memberships m
        where m.daara_id = p_daara and m.user_id = p_user and m.actif and m.role in ('enseignant', 'admin')
    );
$$;
revoke execute on function public.est_enseignant_de(uuid, uuid) from public, anon, authenticated;

-- =====================================================================================================
-- Tables
-- =====================================================================================================
create table public.classes (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    annee_id uuid not null references public.annees_scolaires (id) on delete cascade,
    nom text not null check (public.libelle_valide(nom, 50)),
    niveau text check (niveau is null or public.libelle_valide(niveau, 50)),
    titulaire_id uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null
);
create index classes_daara_id_idx on public.classes (daara_id);
-- Nom unique dans l'année (casse et formes Unicode compatibles ignorées) ; sert d'index sur annee_id.
create unique index classes_nom_uniq on public.classes (annee_id, lower(normalize(nom, NFKC)));
create index classes_titulaire_id_idx on public.classes (titulaire_id);

create table public.classe_matieres (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    classe_id uuid not null references public.classes (id) on delete cascade,
    matiere_id uuid not null references public.matieres (id) on delete restrict,
    coefficient numeric(4, 2) not null default 1,
    enseignant_id uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null,
    -- Sert aussi d'index sur classe_id.
    unique (classe_id, matiere_id),
    constraint classe_matieres_coefficient_check check (coefficient between 0.5 and 20)
);
create index classe_matieres_daara_id_idx on public.classe_matieres (daara_id);
create index classe_matieres_matiere_id_idx on public.classe_matieres (matiere_id);
create index classe_matieres_enseignant_id_idx on public.classe_matieres (enseignant_id);

-- =====================================================================================================
-- Triggers : droits de l'écrivain contrôlés EN TÊTE (avant toute lecture ; insert / update seulement : un delete direct
-- est filtré par la RLS, une cascade n'est pas soumise aux droits), puis cohérence des références.
-- =====================================================================================================
create function public.ecrivain_structure(p_daara uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if auth.uid() is not null and not (
        public.has_role(p_daara, array['admin']::public.role_membre[]) and public.module_actif(p_daara, 'structure')
    ) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
end;
$$;
revoke execute on function public.ecrivain_structure(uuid) from public, anon, authenticated;

create function public.classes_coherentes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform public.ecrivain_structure(new.daara_id);
    if tg_op = 'UPDATE' and (new.daara_id <> old.daara_id or new.annee_id <> old.annee_id) then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    if not exists (select 1 from public.annees_scolaires a where a.id = new.annee_id and a.daara_id = new.daara_id) then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    if new.titulaire_id is not null and (tg_op = 'INSERT' or new.titulaire_id is distinct from old.titulaire_id)
        and not public.est_enseignant_de(new.daara_id, new.titulaire_id) then
        raise exception 'enseignant_invalide' using errcode = '23514';
    end if;
    return new;
end;
$$;
revoke execute on function public.classes_coherentes() from public, anon, authenticated;
create trigger classes_coherentes before insert or update on public.classes
    for each row execute function public.classes_coherentes();

create function public.classe_matieres_coherentes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform public.ecrivain_structure(new.daara_id);
    if tg_op = 'UPDATE' and (new.daara_id <> old.daara_id or new.classe_id <> old.classe_id or new.matiere_id <> old.matiere_id) then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' then
        if not exists (select 1 from public.classes c where c.id = new.classe_id and c.daara_id = new.daara_id) then
            raise exception 'autre_daara' using errcode = '23514';
        end if;
        perform 1 from public.matieres m where m.id = new.matiere_id and m.daara_id = new.daara_id;
        if not found then
            raise exception 'autre_daara' using errcode = '23514';
        end if;
        if exists (select 1 from public.matieres m where m.id = new.matiere_id and m.archivee) then
            raise exception 'matiere_archivee' using errcode = '23514';
        end if;
    end if;
    if new.enseignant_id is not null and (tg_op = 'INSERT' or new.enseignant_id is distinct from old.enseignant_id)
        and not public.est_enseignant_de(new.daara_id, new.enseignant_id) then
        raise exception 'enseignant_invalide' using errcode = '23514';
    end if;
    return new;
end;
$$;
revoke execute on function public.classe_matieres_coherentes() from public, anon, authenticated;
create trigger classe_matieres_coherentes before insert or update on public.classe_matieres
    for each row execute function public.classe_matieres_coherentes();

create trigger classes_audit after insert or update or delete on public.classes
    for each row execute function public.audit_trigger('daara_id');
create trigger classe_matieres_audit after insert or update or delete on public.classe_matieres
    for each row execute function public.audit_trigger('daara_id');

-- =====================================================================================================
-- RLS et droits : lecture admin et enseignant (parents et apprenants au sprint 4, via leurs enfants), écriture admin
-- aal2 ; module `structure` actif. created_by illisible ; clés (daara, année, classe, matière) non modifiables.
-- =====================================================================================================
alter table public.classes enable row level security;
alter table public.classe_matieres enable row level security;
revoke select, insert, update on public.classes, public.classe_matieres from authenticated;
grant select (id, daara_id, annee_id, nom, niveau, titulaire_id, created_at) on public.classes to authenticated;
grant insert (daara_id, annee_id, nom, niveau, titulaire_id) on public.classes to authenticated;
grant update (nom, niveau, titulaire_id) on public.classes to authenticated;
grant select (id, daara_id, classe_id, matiere_id, coefficient, enseignant_id, created_at) on public.classe_matieres to authenticated;
grant insert (daara_id, classe_id, matiere_id, coefficient, enseignant_id) on public.classe_matieres to authenticated;
grant update (coefficient, enseignant_id) on public.classe_matieres to authenticated;

create policy classes_select_equipe on public.classes for select to authenticated
    using ((select public.has_role(daara_id, array['admin', 'enseignant']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy classes_insert_admin on public.classes for insert to authenticated
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy classes_update_admin on public.classes for update to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')))
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy classes_delete_admin on public.classes for delete to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));

create policy classe_matieres_select_equipe on public.classe_matieres for select to authenticated
    using ((select public.has_role(daara_id, array['admin', 'enseignant']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy classe_matieres_insert_admin on public.classe_matieres for insert to authenticated
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy classe_matieres_update_admin on public.classe_matieres for update to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')))
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy classe_matieres_delete_admin on public.classe_matieres for delete to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));

-- =====================================================================================================
-- Helpers et RPC
-- =====================================================================================================

-- Enseignant actif de la daara, titulaire de la classe ou affecté à une de ses matières ; module actif (absences,
-- notes : sprints 5-6).
create function public.teaches_class(p_classe uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.classes c
        where c.id = p_classe
          and public.has_role(c.daara_id, array['enseignant']::public.role_membre[])
          and public.module_actif(c.daara_id, 'structure')
          and (c.titulaire_id = auth.uid()
               or exists (select 1 from public.classe_matieres cm where cm.classe_id = c.id and cm.enseignant_id = auth.uid()))
    );
$$;
revoke execute on function public.teaches_class(uuid) from public, anon;
grant execute on function public.teaches_class(uuid) to authenticated;

-- Enseignants et admins de la daara (titulaires, enseignants d'une matière) : l'enseignant ne lit pas les profils de
-- ses collègues. Membre désactivé : nom figé (nom_affiche), pour afficher l'historique.
create function public.enseignants_daara(p_daara uuid)
returns table (user_id uuid, prenom text, nom text, actif boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if not public.has_role(p_daara, array['admin', 'enseignant']::public.role_membre[])
        or not public.module_actif(p_daara, 'structure') then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    return query
    select m.user_id,
        case when bool_or(m.actif) then max(p.prenom) end,
        case when bool_or(m.actif) then max(p.nom) else max(m.nom_affiche) end,
        bool_or(m.actif)
    from public.memberships m
    left join public.profiles p on p.id = m.user_id
    where m.daara_id = p_daara and m.role in ('enseignant', 'admin')
    group by m.user_id;
end;
$$;
revoke execute on function public.enseignants_daara(uuid) from public, anon;
grant execute on function public.enseignants_daara(uuid) to authenticated;
