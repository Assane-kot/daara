-- S3.2 Matières : catalogue de la daara, réutilisé d'une année à l'autre (module `structure`, ADR-008 ; LLD §3.3, §4 ;
-- spec structure-scolaire.md). Archivage plutôt que suppression d'une matière utilisée (fk `restrict` en S3.3).

-- texte_sur : ajoute les caractères de remplissage Hangul, invisibles (U+115F, U+1160, U+3164 ; audit sécurité S3.2).
create or replace function public.texte_sur(p_texte text)
returns boolean
language sql
immutable
set search_path = ''
as $$
    select p_texte !~ '[[:cntrl:]\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u061C\u034F\u180E\u2028\u2029\u115F\u1160\u3164]';
$$;

create type public.type_matiere as enum ('scolaire', 'coran', 'religieux');

create table public.matieres (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    nom text not null check (nom = normalize(nom, NFC) and nom !~ '^[[:space:]\u00A0]|[[:space:]\u00A0]$'
        and char_length(nom) between 1 and 80 and public.texte_sur(nom)),
    code text not null check (code ~ '^[A-Z0-9_-]{1,10}$'),
    type public.type_matiere not null default 'scolaire',
    archivee boolean not null default false,
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null,
    -- Sert aussi d'index sur daara_id.
    unique (daara_id, code)
);
-- Deux matières de même nom (casse et formes Unicode compatibles ignorées) seraient indiscernables dans les listes.
create unique index matieres_nom_uniq on public.matieres (daara_id, lower(normalize(nom, NFKC)));

-- daara_id immuable (droits par colonne + trigger, défense en profondeur ; réutilisable par les tables suivantes).
create function public.daara_id_immuable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.daara_id is distinct from old.daara_id then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    return new;
end;
$$;
revoke execute on function public.daara_id_immuable() from public, anon, authenticated;
create trigger matieres_daara_immuable before update of daara_id on public.matieres
    for each row execute function public.daara_id_immuable();

create trigger matieres_audit after insert or update or delete on public.matieres
    for each row execute function public.audit_trigger('daara_id');

-- =====================================================================================================
-- RLS et droits : lecture par les membres, écriture par l'admin aal2, module `structure` actif. created_by illisible ;
-- daara_id non modifiable.
-- =====================================================================================================
alter table public.matieres enable row level security;
revoke select, insert, update on public.matieres from authenticated;
grant select (id, daara_id, nom, code, type, archivee, created_at) on public.matieres to authenticated;
grant insert (daara_id, nom, code, type) on public.matieres to authenticated;
grant update (nom, code, type, archivee) on public.matieres to authenticated;

create policy matieres_select_membre on public.matieres for select to authenticated
    using ((select public.is_member(daara_id)) and (select public.module_actif(daara_id, 'structure')));
create policy matieres_insert_admin on public.matieres for insert to authenticated
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy matieres_update_admin on public.matieres for update to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')))
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy matieres_delete_admin on public.matieres for delete to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
