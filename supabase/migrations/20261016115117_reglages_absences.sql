-- S6.1b Réglages des absences par daara (module `absences`, ADR-012) : délai de correction de l'enseignant (7 jours par
-- défaut), qui décide d'une justification (admin + titulaire par défaut, ou admin seul), justification par les parents
-- (oui par défaut). Remplace les valeurs fixées au sprint 5. `daaras.appel_demi_journee` reste sur `daaras`.

create type public.decideur_justification as enum ('admin_titulaire', 'admin');

create table public.reglages_absences (
    daara_id uuid primary key references public.daaras (id) on delete cascade,
    delai_correction smallint not null default 7 check (delai_correction between 0 and 30),
    decideur public.decideur_justification not null default 'admin_titulaire',
    justification_parent boolean not null default true,
    updated_at timestamptz not null default now(),
    updated_by uuid default auth.uid() references auth.users (id) on delete set null
);

create or replace function public.reglages_par_defaut(p_daara uuid)
returns void
language sql
security definer
set search_path = ''
as $$
    insert into public.reglages_notes (daara_id, updated_by) values (p_daara, null) on conflict do nothing;
    insert into public.reglages_absences (daara_id, updated_by) values (p_daara, null) on conflict do nothing;
    insert into public.types_evaluation (daara_id, nom, coefficient, ordre, created_by)
    select p_daara, t.nom, t.coefficient, t.ordre, null
    from (values ('Devoir', 1.0, 1), ('Composition', 2.0, 2)) as t (nom, coefficient, ordre)
    where not exists (select 1 from public.types_evaluation e where e.daara_id = p_daara);
$$;

select public.reglages_par_defaut(d.id) from public.daaras d;

-- Droits de l'écrivain en tête (admin aal2 + module absences), daara immuable.
create function public.reglages_absences_coherents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if auth.uid() is not null and pg_trigger_depth() = 1 and not (public.has_role(new.daara_id, array['admin']::public.role_membre[])
        and public.module_actif(new.daara_id, 'absences')) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    if new.daara_id <> old.daara_id then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    new.updated_at := now();
    return new;
end;
$$;
revoke execute on function public.reglages_absences_coherents() from public, anon, authenticated;
create trigger reglages_absences_coherents before update on public.reglages_absences
    for each row execute function public.reglages_absences_coherents();
create trigger reglages_absences_audit after insert or update or delete on public.reglages_absences
    for each row execute function public.audit_trigger();
create trigger reglages_absences_signal_ins after insert on public.reglages_absences referencing new table as nouvelles
    for each statement execute function public.signaler_changement('daara_id');
create trigger reglages_absences_signal_maj after update on public.reglages_absences referencing new table as nouvelles old table as anciennes
    for each statement execute function public.signaler_changement('daara_id');
create trigger reglages_absences_signal_sup after delete on public.reglages_absences referencing old table as anciennes
    for each statement execute function public.signaler_changement('daara_id');

alter table public.reglages_absences enable row level security;
revoke select, insert, update, delete on public.reglages_absences from authenticated;
grant select (daara_id, delai_correction, decideur, justification_parent, updated_at) on public.reglages_absences to authenticated;
grant update (delai_correction, decideur, justification_parent) on public.reglages_absences to authenticated;
create policy reglages_absences_select on public.reglages_absences for select to authenticated
    using ((select public.membre_actuel(daara_id)) and (select public.module_actif(daara_id, 'absences')));
create policy reglages_absences_update on public.reglages_absences for update to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[])) and (select public.module_actif(daara_id, 'absences')))
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[])) and (select public.module_actif(daara_id, 'absences')));

-- Les règles du sprint 5 lisent désormais les réglages.
create or replace function public.verifier_appel(p_daara uuid, p_classe uuid, p_date date)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_annee public.annees_scolaires;
begin
    if auth.uid() is not null then
        if not public.module_actif(p_daara, 'absences') then
            raise exception 'module_inactif' using errcode = '42501';
        end if;
        if not public.has_role(p_daara, array['admin']::public.role_membre[]) then
            if not public.teaches_class(p_classe) then
                raise exception 'classe_non_enseignee' using errcode = '42501';
            end if;
            -- Délai de correction réglé par la daara (ADR-012, défaut 7 jours).
            if p_date < current_date - coalesce((select r.delai_correction from public.reglages_absences r where r.daara_id = p_daara), 7) then
                raise exception 'appel_trop_ancien' using errcode = '23514';
            end if;
        end if;
    end if;
    select a.* into v_annee from public.classes c join public.annees_scolaires a on a.id = c.annee_id
    where c.id = p_classe and c.daara_id = p_daara;
    if v_annee.id is null then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    if not v_annee.active then
        raise exception 'annee_inactive' using errcode = '23514';
    end if;
    if p_date > current_date or p_date not between v_annee.date_debut and v_annee.date_fin then
        raise exception 'date_hors_annee' using errcode = '23514';
    end if;
    return v_annee.id;
end;
$$;

create or replace function public.justifier_absence(p_absence uuid, p_motif text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_abs public.absences;
    v_motif text := nullif(normalize(btrim(p_motif), nfc), '');
begin
    select * into v_abs from public.absences a where a.id = p_absence;
    if v_abs.id is null or not public.is_parent_of(v_abs.apprenant_id) or not public.module_actif(v_abs.daara_id, 'absences') then
        raise exception 'droits' using errcode = '42501';
    end if;
    if not coalesce((select r.justification_parent from public.reglages_absences r where r.daara_id = v_abs.daara_id), true) then
        raise exception 'justification_desactivee' using errcode = '23514';
    end if;
    if v_motif is null or char_length(v_motif) > 300 or not public.texte_sur(v_motif) then
        raise exception 'motif_invalide' using errcode = '23514';
    end if;
    select * into v_abs from public.absences a where a.id = p_absence for update;
    if v_abs.etat in ('justifiee', 'non_justifiee') then
        raise exception 'deja_decidee' using errcode = '23514';
    end if;
    perform set_config('daara.rpc_absence', 'oui', true);
    update public.absences set motif = v_motif, motif_at = now(), etat = 'envoyee' where id = p_absence;
    perform set_config('daara.rpc_absence', '', true);
end;
$$;

create or replace function public.decider_justification(p_absence uuid, p_justifiee boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_abs public.absences;
begin
    select * into v_abs from public.absences a where a.id = p_absence;
    if v_abs.id is null or not public.module_actif(v_abs.daara_id, 'absences') or not (
        public.has_role(v_abs.daara_id, array['admin']::public.role_membre[])
        or (public.has_role(v_abs.daara_id, array['enseignant']::public.role_membre[])
            and coalesce((select r.decideur from public.reglages_absences r where r.daara_id = v_abs.daara_id), 'admin_titulaire') = 'admin_titulaire'
            and exists (select 1 from public.classes c join public.annees_scolaires an on an.id = c.annee_id and an.active
                        where c.id = v_abs.classe_id and c.titulaire_id = auth.uid()))
    ) then
        raise exception 'droits' using errcode = '42501';
    end if;
    if p_justifiee is null then
        raise exception 'decision_invalide' using errcode = '23514';
    end if;
    perform 1 from public.absences a where a.id = p_absence for update;
    perform set_config('daara.rpc_absence', 'oui', true);
    update public.absences
    set etat = case when p_justifiee then 'justifiee'::public.etat_justification else 'non_justifiee'::public.etat_justification end,
        decide_par = auth.uid(), decide_at = now()
    where id = p_absence;
    perform set_config('daara.rpc_absence', '', true);
end;
$$;
