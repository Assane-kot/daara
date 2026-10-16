-- S6.1 Réglages des notes par daara (module `notes`, ADR-012 ; LLD §3.5 ; spec notes.md).
-- Une ligne de réglages par daara (valeurs par défaut posées à la création de la daara et pour les daaras existantes) et
-- la liste des types d'évaluation (Devoir 1, Composition 2, modifiables). Lecture : membres actuels (les écrans en ont
-- besoin, le parent compris) ; écriture : admin aal2 + module.

create type public.regle_absence_eval as enum ('ignorer', 'zero', 'zero_si_non_justifiee');
create type public.mode_moyenne as enum ('ponderee', 'simple');
create type public.arrondi_note as enum ('centieme', 'dixieme', 'quart', 'demi');
create type public.visibilite_notes as enum ('publication', 'saisie');

create table public.reglages_notes (
    daara_id uuid primary key references public.daaras (id) on delete cascade,
    absence_evaluation public.regle_absence_eval not null default 'ignorer',
    moyenne_generale public.mode_moyenne not null default 'ponderee',
    arrondi public.arrondi_note not null default 'centieme',
    -- Null : la moitié du barème de la daara.
    seuil_reussite numeric(5, 2) check (seuil_reussite is null or seuil_reussite between 0 and 100),
    titulaire_saisit boolean not null default false,
    visibilite public.visibilite_notes not null default 'publication',
    moyennes_visibles boolean not null default true,
    appreciations boolean not null default true,
    updated_at timestamptz not null default now(),
    updated_by uuid default auth.uid() references auth.users (id) on delete set null
);

create table public.types_evaluation (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    nom text not null check (public.libelle_valide(nom, 40)),
    -- 0,25 à 20, par quart de point.
    coefficient numeric(5, 2) not null default 1 check (coefficient between 0.25 and 20 and coefficient * 4 = trunc(coefficient * 4)),
    ordre smallint not null default 0 check (ordre between 0 and 99),
    archive boolean not null default false,
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null
);
create index types_evaluation_daara_id_idx on public.types_evaluation (daara_id, ordre);
create unique index types_evaluation_nom_uniq on public.types_evaluation (daara_id, lower(nom));

-- Valeurs par défaut d'une daara (création, et daaras existantes ci-dessous).
create function public.reglages_par_defaut(p_daara uuid)
returns void
language sql
security definer
set search_path = ''
as $$
    insert into public.reglages_notes (daara_id, updated_by) values (p_daara, null) on conflict do nothing;
    insert into public.types_evaluation (daara_id, nom, coefficient, ordre, created_by)
    select p_daara, t.nom, t.coefficient, t.ordre, null
    from (values ('Devoir', 1.0, 1), ('Composition', 2.0, 2)) as t (nom, coefficient, ordre)
    where not exists (select 1 from public.types_evaluation e where e.daara_id = p_daara);
$$;
revoke execute on function public.reglages_par_defaut(uuid) from public, anon, authenticated;

create function public.daara_reglages_initiaux()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform public.reglages_par_defaut(new.id);
    return null;
end;
$$;
revoke execute on function public.daara_reglages_initiaux() from public, anon, authenticated;
create trigger daaras_reglages_initiaux after insert on public.daaras
    for each row execute function public.daara_reglages_initiaux();

select public.reglages_par_defaut(d.id) from public.daaras d;

-- Droits de l'écrivain en tête (admin aal2 + module notes ; service_role : cohérence seulement), daara immuable.
create function public.reglages_notes_coherents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    -- Valeurs par défaut posées par le trigger de création de la daara (le créateur n'est pas encore admin) : profondeur > 1.
    if auth.uid() is not null and pg_trigger_depth() = 1 and not (public.has_role(new.daara_id, array['admin']::public.role_membre[])
        and public.module_actif(new.daara_id, 'notes')) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' then
        if new.daara_id <> old.daara_id then
            raise exception 'autre_daara' using errcode = '23514';
        end if;
        if tg_table_name = 'reglages_notes' then
            new.updated_at := now();
        end if;
    end if;
    return new;
end;
$$;
revoke execute on function public.reglages_notes_coherents() from public, anon, authenticated;
create trigger reglages_notes_coherents before update on public.reglages_notes
    for each row execute function public.reglages_notes_coherents();
create trigger types_evaluation_coherents before insert or update on public.types_evaluation
    for each row execute function public.reglages_notes_coherents();
create trigger reglages_notes_audit after insert or update or delete on public.reglages_notes
    for each row execute function public.audit_trigger();
create trigger types_evaluation_audit after insert or update or delete on public.types_evaluation
    for each row execute function public.audit_trigger();

-- Mise à jour automatique (S5.0b).
do $$
declare
    v_table text;
begin
    foreach v_table in array array['reglages_notes', 'types_evaluation'] loop
        execute format('create trigger %1$s_signal_ins after insert on public.%1$I referencing new table as nouvelles
            for each statement execute function public.signaler_changement(''daara_id'')', v_table);
        execute format('create trigger %1$s_signal_maj after update on public.%1$I referencing new table as nouvelles old table as anciennes
            for each statement execute function public.signaler_changement(''daara_id'')', v_table);
        execute format('create trigger %1$s_signal_sup after delete on public.%1$I referencing old table as anciennes
            for each statement execute function public.signaler_changement(''daara_id'')', v_table);
    end loop;
end;
$$;

alter table public.reglages_notes enable row level security;
alter table public.types_evaluation enable row level security;
revoke select, insert, update, delete on public.reglages_notes, public.types_evaluation from authenticated;
grant select (daara_id, absence_evaluation, moyenne_generale, arrondi, seuil_reussite, titulaire_saisit, visibilite, moyennes_visibles,
    appreciations, updated_at) on public.reglages_notes to authenticated;
grant update (absence_evaluation, moyenne_generale, arrondi, seuil_reussite, titulaire_saisit, visibilite, moyennes_visibles, appreciations)
    on public.reglages_notes to authenticated;
grant select (id, daara_id, nom, coefficient, ordre, archive, created_at) on public.types_evaluation to authenticated;
grant insert (daara_id, nom, coefficient, ordre) on public.types_evaluation to authenticated;
grant update (nom, coefficient, ordre, archive) on public.types_evaluation to authenticated;
grant delete on public.types_evaluation to authenticated;

create policy reglages_notes_select on public.reglages_notes for select to authenticated
    using ((select public.membre_actuel(daara_id)) and (select public.module_actif(daara_id, 'notes')));
create policy reglages_notes_update on public.reglages_notes for update to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])) and (select public.module_actif(daara_id, 'notes')))
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[])) and (select public.module_actif(daara_id, 'notes')));

create policy types_evaluation_select on public.types_evaluation for select to authenticated
    using ((select public.membre_actuel(daara_id)) and (select public.module_actif(daara_id, 'notes')));
create policy types_evaluation_insert on public.types_evaluation for insert to authenticated
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[])) and (select public.module_actif(daara_id, 'notes')));
create policy types_evaluation_update on public.types_evaluation for update to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])) and (select public.module_actif(daara_id, 'notes')))
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[])) and (select public.module_actif(daara_id, 'notes')));
-- Suppression d'un type utilisé : refusée par la clé étrangère des évaluations (S6.2) → archiver.
create policy types_evaluation_delete on public.types_evaluation for delete to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])) and (select public.module_actif(daara_id, 'notes')));
