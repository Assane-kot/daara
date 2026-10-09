-- S4.1 Fiches apprenants (socle ; LLD §3.4, §4, §5 ; ADR-010 ; spec apprenants.md). Lecture et écriture par l'admin
-- (aal2) ; enseignants (S4.2) et parents (S4.3) ajoutés par leurs stories. Journal sans valeurs (ADR-010).

create type public.sexe_apprenant as enum ('F', 'M');
create type public.statut_apprenant as enum ('inscrit', 'parti');

-- =====================================================================================================
-- Fonctions communes
-- =====================================================================================================

-- Écrivain admin aal2 de la daara : contrôlé en tête des triggers security definer (auth.uid() nul : service_role,
-- postgres, cascade).
create function public.ecrivain_admin(p_daara uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if auth.uid() is not null and not public.has_role(p_daara, array['admin']::public.role_membre[]) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
end;
$$;
revoke execute on function public.ecrivain_admin(uuid) from public, anon, authenticated;

-- Journal sans valeurs (ADR-010) : auteur, action, ligne et liste des colonnes modifiées ; jamais les données de
-- l'enfant. Argument : colonne qui porte la daara (défaut daara_id).
create function public.audit_trigger_colonnes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_ligne jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
    v_auteur text := current_setting('daara.auteur', true);
    v_colonnes jsonb := '[]'::jsonb;
begin
    if tg_op = 'UPDATE' then
        select coalesce(jsonb_agg(n.key order by n.key), '[]'::jsonb) into v_colonnes
        from jsonb_each(to_jsonb(new)) n
        where n.key not in ('updated_at', 'recherche') and n.value is distinct from (to_jsonb(old) -> n.key);
        if v_colonnes = '[]'::jsonb then
            return null;
        end if;
    end if;
    insert into public.audit_log (daara_id, table_name, record_id, action, old_data, new_data, user_id)
    values (
        (v_ligne ->> coalesce(tg_argv[0], 'daara_id'))::uuid,
        tg_table_name,
        (v_ligne ->> 'id')::uuid,
        tg_op,
        null,
        jsonb_build_object('colonnes', v_colonnes),
        coalesce(
            auth.uid(),
            case when v_auteur ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_auteur::uuid end
        )
    );
    return null;
end;
$$;
revoke execute on function public.audit_trigger_colonnes() from public, anon, authenticated;

-- =====================================================================================================
-- Tables
-- =====================================================================================================

-- Compteur des matricules par daara et par année (écrit par le trigger seulement).
create table public.compteurs_matricule (
    daara_id uuid not null references public.daaras (id) on delete cascade,
    annee smallint not null check (annee between 2000 and 2999),
    dernier integer not null default 0 check (dernier >= 0),
    primary key (daara_id, annee)
);
alter table public.compteurs_matricule enable row level security;
revoke all on public.compteurs_matricule from authenticated, anon;
-- Aucun accès client (politique explicite pour le garde-fou « au moins une politique »).
create policy compteurs_matricule_aucun on public.compteurs_matricule for select to authenticated using (false);

create table public.apprenants (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    -- Défaut vide remplacé par le trigger BEFORE (la contrainte est vérifiée après) : jamais fourni par le client.
    matricule text not null default '' check (matricule ~ '^[0-9]{4}-[0-9]{4,}$'),
    nom text not null check (public.libelle_valide(nom, 100)),
    prenom text not null check (public.libelle_valide(prenom, 100)),
    date_naissance date check (date_naissance between date '1950-01-01' and current_date),
    sexe public.sexe_apprenant,
    statut public.statut_apprenant not null default 'inscrit',
    photo_path text,
    -- Comptes apprenants : sprint 9 (ADR-010).
    user_id uuid references auth.users (id) on delete set null,
    recherche text generated always as (public.sans_accents(prenom || ' ' || nom || ' ' || matricule)) stored,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null,
    -- Sert aussi d'index sur daara_id.
    unique (daara_id, matricule),
    constraint apprenants_photo_path_check
        check (photo_path is null or photo_path ~ ('^' || daara_id::text || '/apprenants/' || id::text || '\.(webp|png)$'))
);
create index apprenants_nom_idx on public.apprenants (daara_id, nom, prenom);

-- Matricule attribué à l'insertion (AAAA-NNNN : année + compteur de la daara, verrou de la ligne du compteur) ;
-- droits de l'écrivain contrôlés en tête ; daara_id et matricule immuables.
create function public.apprenants_coherents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_annee smallint := extract(year from current_date)::smallint;
    v_numero integer;
begin
    perform public.ecrivain_admin(new.daara_id);
    if tg_op = 'INSERT' then
        insert into public.compteurs_matricule as c (daara_id, annee, dernier) values (new.daara_id, v_annee, 1)
        on conflict (daara_id, annee) do update set dernier = c.dernier + 1
        returning dernier into v_numero;
        new.matricule := v_annee::text || '-' || lpad(v_numero::text, 4, '0');
    elsif new.daara_id <> old.daara_id or new.matricule <> old.matricule then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    return new;
end;
$$;
revoke execute on function public.apprenants_coherents() from public, anon, authenticated;
create trigger apprenants_coherents before insert or update on public.apprenants
    for each row execute function public.apprenants_coherents();
create trigger apprenants_updated_at before update on public.apprenants
    for each row execute function public.set_updated_at();
create trigger apprenants_audit after insert or update or delete on public.apprenants
    for each row execute function public.audit_trigger_colonnes();

-- =====================================================================================================
-- RLS et droits (S4.1 : admin ; enseignants S4.2, parents S4.3). matricule (généré), user_id et created_by hors droits
-- d'écriture ; created_by illisible.
-- =====================================================================================================
alter table public.apprenants enable row level security;
revoke select, insert, update on public.apprenants from authenticated;
grant select (id, daara_id, matricule, nom, prenom, date_naissance, sexe, statut, photo_path, recherche, created_at, updated_at)
    on public.apprenants to authenticated;
-- matricule attribué par le trigger BEFORE (le not null est vérifié après) : jamais fourni par le client.
grant insert (daara_id, nom, prenom, date_naissance, sexe, statut) on public.apprenants to authenticated;
grant update (nom, prenom, date_naissance, sexe, statut, photo_path) on public.apprenants to authenticated;

create policy apprenants_select_admin on public.apprenants for select to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])));
create policy apprenants_insert_admin on public.apprenants for insert to authenticated
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[])));
create policy apprenants_update_admin on public.apprenants for update to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])))
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[])));
create policy apprenants_delete_admin on public.apprenants for delete to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])));

-- =====================================================================================================
-- Storage : bucket privé `photos` (ADR-010). Chemin <daara>/apprenants/<apprenant>.(webp|png), l'apprenant devant
-- appartenir à la daara du chemin ; uuid converti seulement après contrôle du format (case).
-- =====================================================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 1048576, array['image/webp', 'image/png', 'image/jpeg']);

create function public.photo_apprenant_administree(p_nom text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select case
        when p_nom ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/apprenants/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png)$'
            then public.has_role(split_part(p_nom, '/', 1)::uuid, array['admin']::public.role_membre[])
                and exists (
                    select 1 from public.apprenants a
                    where a.id = split_part(split_part(p_nom, '/', 3), '.', 1)::uuid
                      and a.daara_id = split_part(p_nom, '/', 1)::uuid
                )
        else false
    end;
$$;
revoke execute on function public.photo_apprenant_administree(text) from public, anon;
-- Appelée par les politiques de storage.objects (droits de l'appelant).
grant execute on function public.photo_apprenant_administree(text) to authenticated;

create policy photos_lecture_admin on storage.objects for select to authenticated
    using (bucket_id = 'photos' and (select public.photo_apprenant_administree(name)));
create policy photos_depot_admin on storage.objects for insert to authenticated
    with check (bucket_id = 'photos' and (select public.photo_apprenant_administree(name)));
create policy photos_remplacement_admin on storage.objects for update to authenticated
    using (bucket_id = 'photos' and (select public.photo_apprenant_administree(name)))
    with check (bucket_id = 'photos' and (select public.photo_apprenant_administree(name)));
create policy photos_suppression_admin on storage.objects for delete to authenticated
    using (bucket_id = 'photos' and (select public.photo_apprenant_administree(name)));
