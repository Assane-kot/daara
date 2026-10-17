-- S6.2 Évaluations par classe, matière et période (module `notes`, ADR-012 ; LLD §3.5, §4 ; spec notes.md).
-- Une évaluation appartient à une matière d'une classe (`classe_matieres`) et à une période de l'année de la classe.
-- Écriture : admin aal2, enseignant de la matière dans la classe, ou titulaire si `reglages_notes.titulaire_saisit` ;
-- classe de l'année active, période non clôturée. Lecture : admin, enseignants de la classe (année active), parents des
-- élèves de la classe (évaluations publiées, ou toutes si `visibilite = 'saisie'`). Notes : S6.3 ; publication : S6.5.

create table public.evaluations (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    -- Pas de suppression d'une matière de classe ni d'une période qui ont des évaluations (contrôle en fin d'instruction :
    -- la suppression d'une daara passe).
    classe_matiere_id uuid not null references public.classe_matieres (id),
    -- Copiée de la matière de la classe par le trigger.
    classe_id uuid not null references public.classes (id) on delete cascade,
    periode_id uuid not null references public.periodes (id),
    type_id uuid not null references public.types_evaluation (id),
    libelle text not null check (public.libelle_valide(libelle, 60)),
    date_eval date not null default current_date,
    -- Remplis par le trigger s'ils sont absents : barème de la daara, coefficient du type.
    bareme numeric(5, 2) not null check (bareme between 1 and 100 and bareme * 4 = trunc(bareme * 4)),
    coefficient numeric(5, 2) not null check (coefficient between 0.25 and 20 and coefficient * 4 = trunc(coefficient * 4)),
    -- Posé par `publier_evaluation` (S6.5) seulement.
    publiee_at timestamptz,
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null
);
create index evaluations_daara_id_idx on public.evaluations (daara_id);
create index evaluations_classe_periode_idx on public.evaluations (classe_id, periode_id);
create index evaluations_classe_matiere_idx on public.evaluations (classe_matiere_id, periode_id);
create index evaluations_periode_id_idx on public.evaluations (periode_id);
create index evaluations_type_id_idx on public.evaluations (type_id);

-- Qui écrit les évaluations (et, en S6.3, les notes) de cette matière de classe : module `notes` actif, classe de l'année
-- active, et admin aal2, enseignant de la matière, ou titulaire de la classe si le réglage l'autorise.
create function public.peut_ecrire_evaluation(p_daara uuid, p_classe_matiere uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.classe_matieres cm
        join public.classes c on c.id = cm.classe_id
        join public.annees_scolaires a on a.id = c.annee_id and a.active
        where cm.id = p_classe_matiere and cm.daara_id = p_daara
          and public.module_actif(cm.daara_id, 'notes')
          and (public.has_role(cm.daara_id, array['admin']::public.role_membre[])
               or (public.has_role(cm.daara_id, array['enseignant']::public.role_membre[])
                   and (cm.enseignant_id = (select auth.uid())
                        or (c.titulaire_id = (select auth.uid()) and exists (
                            select 1 from public.reglages_notes r where r.daara_id = cm.daara_id and r.titulaire_saisit)))))
    );
$$;
revoke execute on function public.peut_ecrire_evaluation(uuid, uuid) from public, anon;
grant execute on function public.peut_ecrire_evaluation(uuid, uuid) to authenticated;

create function public.evaluations_coherentes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_cm public.classe_matieres;
    v_annee public.annees_scolaires;
    v_periode public.periodes;
    v_type public.types_evaluation;
begin
    -- Droits en tête (avant toute lecture).
    if auth.uid() is not null and not public.peut_ecrire_evaluation(new.daara_id, new.classe_matiere_id) then
        raise exception 'droits' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' then
        if new.daara_id <> old.daara_id or new.classe_matiere_id <> old.classe_matiere_id or new.created_by is distinct from old.created_by
            -- Publication : par `publier_evaluation` seulement (S6.5, indicateur de transaction), jamais par le client.
            or (new.publiee_at is distinct from old.publiee_at and auth.uid() is not null
                and coalesce(current_setting('daara.publication', true), '') <> 'oui') then
            raise exception 'evaluation_immuable' using errcode = '23514';
        end if;
        if exists (select 1 from public.periodes p where p.id = old.periode_id and p.cloturee) then
            raise exception 'periode_cloturee' using errcode = '23514';
        end if;
    end if;
    select cm.* into v_cm from public.classe_matieres cm where cm.id = new.classe_matiere_id and cm.daara_id = new.daara_id;
    if v_cm.id is null then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    select a.* into v_annee from public.classes c join public.annees_scolaires a on a.id = c.annee_id where c.id = v_cm.classe_id;
    if not v_annee.active then
        raise exception 'annee_inactive' using errcode = '23514';
    end if;
    select p.* into v_periode from public.periodes p where p.id = new.periode_id and p.annee_id = v_annee.id;
    if v_periode.id is null then
        raise exception 'periode_invalide' using errcode = '23514';
    end if;
    if v_periode.cloturee then
        raise exception 'periode_cloturee' using errcode = '23514';
    end if;
    if new.date_eval not between v_periode.date_debut and v_periode.date_fin then
        raise exception 'date_hors_periode' using errcode = '23514';
    end if;
    select t.* into v_type from public.types_evaluation t where t.id = new.type_id and t.daara_id = new.daara_id;
    if v_type.id is null then
        raise exception 'type_invalide' using errcode = '23514';
    end if;
    if v_type.archive and (tg_op = 'INSERT' or new.type_id <> old.type_id) then
        raise exception 'type_archive' using errcode = '23514';
    end if;
    if new.bareme is null then
        select d.bareme into new.bareme from public.daaras d where d.id = new.daara_id;
    end if;
    new.coefficient := coalesce(new.coefficient, v_type.coefficient);
    new.classe_id := v_cm.classe_id;
    return new;
end;
$$;
revoke execute on function public.evaluations_coherentes() from public, anon, authenticated;
create trigger evaluations_coherentes before insert or update on public.evaluations
    for each row execute function public.evaluations_coherentes();

-- Suppression : mêmes droits, période non clôturée (cascade d'une daara ou d'une classe : pas de contrôle).
create function public.evaluations_suppression()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if pg_trigger_depth() = 1 and auth.uid() is not null then
        if not public.peut_ecrire_evaluation(old.daara_id, old.classe_matiere_id) then
            raise exception 'droits' using errcode = '42501';
        end if;
        if exists (select 1 from public.periodes p where p.id = old.periode_id and p.cloturee) then
            raise exception 'periode_cloturee' using errcode = '23514';
        end if;
    end if;
    return old;
end;
$$;
revoke execute on function public.evaluations_suppression() from public, anon, authenticated;
create trigger evaluations_suppression before delete on public.evaluations
    for each row execute function public.evaluations_suppression();
create trigger evaluations_audit after insert or update or delete on public.evaluations
    for each row execute function public.audit_trigger();

-- Mise à jour automatique (S5.0b).
create trigger evaluations_signal_ins after insert on public.evaluations referencing new table as nouvelles
    for each statement execute function public.signaler_changement('daara_id');
create trigger evaluations_signal_maj after update on public.evaluations referencing new table as nouvelles old table as anciennes
    for each statement execute function public.signaler_changement('daara_id');
create trigger evaluations_signal_sup after delete on public.evaluations referencing old table as anciennes
    for each statement execute function public.signaler_changement('daara_id');

alter table public.evaluations enable row level security;
revoke select, insert, update, delete on public.evaluations from authenticated;
grant select (id, daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, date_eval, bareme, coefficient, publiee_at, created_at)
    on public.evaluations to authenticated;
grant insert (daara_id, classe_matiere_id, classe_id, periode_id, type_id, libelle, date_eval, bareme, coefficient)
    on public.evaluations to authenticated;
grant update (periode_id, type_id, libelle, date_eval, bareme, coefficient) on public.evaluations to authenticated;
grant delete on public.evaluations to authenticated;

create policy evaluations_select on public.evaluations for select to authenticated
    using ((select public.module_actif(daara_id, 'notes')) and (
        (select public.has_role(daara_id, array['admin']::public.role_membre[]))
        or (select public.enseigne_classe_active(classe_id))
        or ((select public.classe_d_un_enfant(classe_id)) and (publiee_at is not null or exists (
            select 1 from public.reglages_notes r where r.daara_id = evaluations.daara_id and r.visibilite = 'saisie')))));
create policy evaluations_insert on public.evaluations for insert to authenticated
    with check ((select public.peut_ecrire_evaluation(daara_id, classe_matiere_id)));
create policy evaluations_update on public.evaluations for update to authenticated
    using ((select public.peut_ecrire_evaluation(daara_id, classe_matiere_id)))
    with check ((select public.peut_ecrire_evaluation(daara_id, classe_matiere_id)));
create policy evaluations_delete on public.evaluations for delete to authenticated
    using ((select public.peut_ecrire_evaluation(daara_id, classe_matiere_id)));
