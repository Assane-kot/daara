-- S5.1 Appel du jour (module `absences`, ADR-008 ; LLD §3.5, §4 ; spec absences.md ; ADR-010, ADR-011).
-- L'appel (une classe, une date, un créneau) est enregistré ; seuls les absents et les retardataires ont une ligne
-- (présent par défaut). Enseignant : ses classes de l'année active, aujourd'hui et 7 jours en arrière ; admin : toute
-- l'année active. Motif, justification et notifications : S5.2, S5.3.

-- Réglage de la daara : un appel par jour, ou matin et après-midi.
alter table public.daaras add column appel_demi_journee boolean not null default false;
grant update (appel_demi_journee) on public.daaras to authenticated;

create type public.creneau_appel as enum ('journee', 'matin', 'apres_midi');
create type public.type_absence as enum ('absence', 'retard');
create type public.etat_justification as enum ('aucune', 'envoyee', 'justifiee', 'non_justifiee');

create table public.appels (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    classe_id uuid not null references public.classes (id) on delete cascade,
    -- Copiée de la classe par le trigger.
    annee_id uuid not null references public.annees_scolaires (id) on delete cascade,
    date_appel date not null,
    creneau public.creneau_appel not null default 'journee',
    termine_at timestamptz,
    termine_par uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null,
    unique (classe_id, date_appel, creneau)
);
create index appels_daara_id_idx on public.appels (daara_id, date_appel);
create index appels_annee_id_idx on public.appels (annee_id);

create table public.absences (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    appel_id uuid not null references public.appels (id) on delete cascade,
    apprenant_id uuid not null references public.apprenants (id) on delete cascade,
    -- Copiés de l'appel par le trigger (recherches et statistiques sans jointure).
    classe_id uuid not null references public.classes (id) on delete cascade,
    date_absence date not null,
    creneau public.creneau_appel not null,
    type public.type_absence not null default 'absence',
    motif text check (motif is null or (char_length(motif) between 1 and 300 and public.texte_sur(motif))),
    motif_at timestamptz,
    etat public.etat_justification not null default 'aucune',
    decide_par uuid references auth.users (id) on delete set null,
    decide_at timestamptz,
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null,
    unique (appel_id, apprenant_id),
    unique (apprenant_id, date_absence, creneau)
);
create index absences_daara_id_idx on public.absences (daara_id, date_absence);
create index absences_classe_id_idx on public.absences (classe_id, date_absence);

-- Qui peut faire l'appel de cette classe à cette date (droits contrôlés en tête des triggers security definer) :
-- admin aal2, ou enseignant de la classe (teaches_class) pour aujourd'hui et les 7 jours précédents ; module actif ;
-- classe de l'année active ; date dans l'année et pas dans le futur. auth.uid() nul (service_role) : contrôles de
-- cohérence seulement.
create function public.verifier_appel(p_daara uuid, p_classe uuid, p_date date)
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
            if p_date < current_date - 7 then
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
revoke execute on function public.verifier_appel(uuid, uuid, date) from public, anon, authenticated;

create function public.appels_coherents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_demi boolean;
begin
    -- Droits en tête (avant toute lecture) : seuls un admin ou un enseignant de la daara écrivent ici.
    if auth.uid() is not null and not public.has_role(new.daara_id, array['admin', 'enseignant']::public.role_membre[]) then
        raise exception 'droits' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (new.daara_id <> old.daara_id or new.classe_id <> old.classe_id or new.date_appel <> old.date_appel
        or new.creneau <> old.creneau) then
        raise exception 'appel_immuable' using errcode = '23514';
    end if;
    new.annee_id := public.verifier_appel(new.daara_id, new.classe_id, new.date_appel);
    if tg_op = 'INSERT' then
        select d.appel_demi_journee into v_demi from public.daaras d where d.id = new.daara_id;
        if (new.creneau = 'journee') = coalesce(v_demi, false) then
            raise exception 'creneau_invalide' using errcode = '23514';
        end if;
    end if;
    return new;
end;
$$;
revoke execute on function public.appels_coherents() from public, anon, authenticated;
create trigger appels_coherents before insert or update on public.appels
    for each row execute function public.appels_coherents();
create trigger appels_audit after insert or update or delete on public.appels
    for each row execute function public.audit_trigger_colonnes();

-- Absence : droits et fenêtre de l'appel ; élève inscrit (statut « inscrit ») dans la classe pour l'année de l'appel ;
-- classe, date et créneau copiés de l'appel ; seul le type est modifiable par le client.
create function public.absences_coherentes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_appel public.appels;
begin
    -- Droits en tête (avant toute lecture) : seuls un admin ou un enseignant de la daara écrivent ici.
    if auth.uid() is not null and not public.has_role(new.daara_id, array['admin', 'enseignant']::public.role_membre[]) then
        raise exception 'droits' using errcode = '42501';
    end if;
    select * into v_appel from public.appels a where a.id = new.appel_id and a.daara_id = new.daara_id;
    if v_appel.id is null then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    perform public.verifier_appel(v_appel.daara_id, v_appel.classe_id, v_appel.date_appel);
    if tg_op = 'UPDATE' and (new.daara_id <> old.daara_id or new.appel_id <> old.appel_id or new.apprenant_id <> old.apprenant_id) then
        raise exception 'absence_immuable' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' and not exists (
        select 1 from public.inscriptions i join public.apprenants ap on ap.id = i.apprenant_id
        where i.apprenant_id = new.apprenant_id and i.classe_id = v_appel.classe_id and i.annee_id = v_appel.annee_id
          and ap.statut = 'inscrit'
    ) then
        raise exception 'eleve_hors_classe' using errcode = '23514';
    end if;
    new.classe_id := v_appel.classe_id;
    new.date_absence := v_appel.date_appel;
    new.creneau := v_appel.creneau;
    return new;
end;
$$;
revoke execute on function public.absences_coherentes() from public, anon, authenticated;
create trigger absences_coherentes before insert or update on public.absences
    for each row execute function public.absences_coherentes();
create trigger absences_audit after insert or update or delete on public.absences
    for each row execute function public.audit_trigger_colonnes();

-- Suppression : mêmes droits et même fenêtre (la RLS filtre déjà les lignes lisibles).
create function public.absences_suppression()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    -- Cascade (appel, classe, élève, daara supprimés) : pas de contrôle de droits.
    if pg_trigger_depth() = 1 then
        perform public.verifier_appel(old.daara_id, old.classe_id, old.date_absence);
    end if;
    return old;
end;
$$;
revoke execute on function public.absences_suppression() from public, anon, authenticated;
create trigger absences_suppression before delete on public.absences
    for each row execute function public.absences_suppression();

-- Mise à jour automatique (S5.0b) : signaux « table modifiée » sur le canal de la daara.
do $$
declare
    v_table text;
begin
    foreach v_table in array array['appels', 'absences'] loop
        execute format('create trigger %1$s_signal_ins after insert on public.%1$I referencing new table as nouvelles
            for each statement execute function public.signaler_changement(''daara_id'')', v_table);
        execute format('create trigger %1$s_signal_maj after update on public.%1$I referencing new table as nouvelles old table as anciennes
            for each statement execute function public.signaler_changement(''daara_id'')', v_table);
        execute format('create trigger %1$s_signal_sup after delete on public.%1$I referencing old table as anciennes
            for each statement execute function public.signaler_changement(''daara_id'')', v_table);
    end loop;
end;
$$;

-- =====================================================================================================
-- RLS et droits par colonne. termine_* (RPC terminer_appel), motif / etat / decide_* (RPC S5.2) hors droits d'écriture ;
-- created_by illisible.
-- =====================================================================================================
alter table public.appels enable row level security;
alter table public.absences enable row level security;

-- Privilèges par défaut de Supabase retirés : seules les colonnes ci-dessous.
revoke select, insert, update on public.appels, public.absences from authenticated;
grant select (id, daara_id, classe_id, annee_id, date_appel, creneau, termine_at, termine_par, created_at) on public.appels to authenticated;
grant insert (daara_id, classe_id, date_appel, creneau) on public.appels to authenticated;
grant delete on public.appels to authenticated;
grant select (id, daara_id, appel_id, apprenant_id, classe_id, date_absence, creneau, type, motif, motif_at, etat, decide_par, decide_at,
    created_at) on public.absences to authenticated;
grant insert (daara_id, appel_id, apprenant_id, type) on public.absences to authenticated;
grant update (type) on public.absences to authenticated;
grant delete on public.absences to authenticated;

create policy appels_select on public.appels for select to authenticated
    using ((select public.module_actif(daara_id, 'absences')) and (
        (select public.has_role(daara_id, array['admin']::public.role_membre[]))
        or (select public.teaches_class(classe_id))
        or (select public.classe_d_un_enfant(classe_id))));
create policy appels_insert on public.appels for insert to authenticated
    with check ((select public.module_actif(daara_id, 'absences')) and (
        (select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.teaches_class(classe_id))));
-- Appel ouvert par erreur : supprimable tant qu'il n'est pas terminé.
create policy appels_delete on public.appels for delete to authenticated
    using (termine_at is null and (select public.module_actif(daara_id, 'absences')) and (
        (select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.teaches_class(classe_id))));

create policy absences_select on public.absences for select to authenticated
    using ((select public.module_actif(daara_id, 'absences')) and (
        (select public.has_role(daara_id, array['admin']::public.role_membre[]))
        or (select public.teaches_class(classe_id))
        or (select public.is_parent_of(apprenant_id))));
create policy absences_insert on public.absences for insert to authenticated
    with check ((select public.module_actif(daara_id, 'absences')) and (
        (select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.teaches_class(classe_id))));
create policy absences_update on public.absences for update to authenticated
    using ((select public.module_actif(daara_id, 'absences')) and (
        (select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.teaches_class(classe_id))))
    with check ((select public.module_actif(daara_id, 'absences')) and (
        (select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.teaches_class(classe_id))));
create policy absences_delete on public.absences for delete to authenticated
    using ((select public.module_actif(daara_id, 'absences')) and (
        (select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.teaches_class(classe_id))));

-- « Terminer l'appel » : l'appel passe à terminé (S5.3 : les parents des absents et retardataires seront prévenus).
create function public.terminer_appel(p_appel uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_appel public.appels;
begin
    -- Droits vérifiés avant le verrou (pas de verrou posé par un étranger), puis revérifiés.
    select * into v_appel from public.appels a where a.id = p_appel;
    if v_appel.id is null then
        raise exception 'appel_inconnu' using errcode = '42501';
    end if;
    perform public.verifier_appel(v_appel.daara_id, v_appel.classe_id, v_appel.date_appel);
    select * into v_appel from public.appels a where a.id = p_appel for update;
    if v_appel.termine_at is null then
        update public.appels set termine_at = now(), termine_par = auth.uid() where id = p_appel;
    end if;
end;
$$;
revoke execute on function public.terminer_appel(uuid) from public, anon;
grant execute on function public.terminer_appel(uuid) to authenticated;
