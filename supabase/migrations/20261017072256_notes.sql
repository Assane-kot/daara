-- S6.3 Saisie des notes (module `notes`, ADR-012 ; LLD §3.5, §4 ; spec notes.md).
-- Une ligne par élève noté (note vide = pas de ligne) : valeur de 0 au barème de l'évaluation, par quart de point, ou
-- « absent » ; appréciation facultative (réglage). Mêmes droits que l'évaluation (`peut_ecrire_evaluation`), période non
-- clôturée, élève inscrit dans la classe. Lecture : admin, enseignants de la classe (année active), parents de l'élève
-- quand l'évaluation leur est visible (publiée, ou dès la saisie selon le réglage). Journal sans valeurs (ADR-010).

create table public.notes (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    evaluation_id uuid not null references public.evaluations (id) on delete cascade,
    apprenant_id uuid not null references public.apprenants (id) on delete cascade,
    -- Copiées de l'évaluation par le trigger (politiques sans jointure).
    classe_id uuid not null references public.classes (id) on delete cascade,
    classe_matiere_id uuid not null references public.classe_matieres (id) on delete cascade,
    valeur numeric(5, 2) check (valeur is null or (valeur >= 0 and valeur * 4 = trunc(valeur * 4))),
    absent boolean not null default false,
    appreciation text check (appreciation is null or (char_length(appreciation) between 1 and 200 and public.texte_sur(appreciation))),
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null,
    updated_at timestamptz not null default now(),
    updated_by uuid default auth.uid() references auth.users (id) on delete set null,
    unique (evaluation_id, apprenant_id),
    constraint notes_valeur_ou_absent check (absent = (valeur is null))
);
create index notes_daara_id_idx on public.notes (daara_id);
create index notes_apprenant_id_idx on public.notes (apprenant_id);
create index notes_classe_id_idx on public.notes (classe_id);
create index notes_classe_matiere_id_idx on public.notes (classe_matiere_id);

create function public.notes_coherentes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_eval public.evaluations;
    v_periode public.periodes;
begin
    -- Droits en tête (avant toute lecture) ; la matière est ensuite contrôlée contre celle de l'évaluation.
    if auth.uid() is not null and not public.peut_ecrire_evaluation(new.daara_id, new.classe_matiere_id) then
        raise exception 'droits' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (new.daara_id <> old.daara_id or new.evaluation_id <> old.evaluation_id or new.apprenant_id <> old.apprenant_id) then
        raise exception 'note_immuable' using errcode = '23514';
    end if;
    select e.* into v_eval from public.evaluations e
    where e.id = new.evaluation_id and e.daara_id = new.daara_id and e.classe_matiere_id = new.classe_matiere_id;
    if v_eval.id is null then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    select p.* into v_periode from public.periodes p where p.id = v_eval.periode_id;
    if v_periode.cloturee then
        raise exception 'periode_cloturee' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' and not exists (
        select 1 from public.inscriptions i join public.apprenants ap on ap.id = i.apprenant_id
        where i.apprenant_id = new.apprenant_id and i.classe_id = v_eval.classe_id and ap.statut = 'inscrit'
    ) then
        raise exception 'eleve_hors_classe' using errcode = '23514';
    end if;
    if new.valeur > v_eval.bareme then
        raise exception 'note_hors_bareme' using errcode = '23514';
    end if;
    if new.appreciation is not null and (tg_op = 'INSERT' or new.appreciation is distinct from old.appreciation)
        and not exists (select 1 from public.reglages_notes r where r.daara_id = new.daara_id and r.appreciations) then
        raise exception 'appreciations_desactivees' using errcode = '23514';
    end if;
    new.classe_id := v_eval.classe_id;
    new.updated_at := now();
    new.updated_by := auth.uid();
    if tg_op = 'UPDATE' then
        new.created_by := old.created_by;
        new.created_at := old.created_at;
    end if;
    return new;
end;
$$;
revoke execute on function public.notes_coherentes() from public, anon, authenticated;
create trigger notes_coherentes before insert or update on public.notes
    for each row execute function public.notes_coherentes();

-- Suppression (note effacée) : mêmes droits, période non clôturée ; cascade (évaluation, élève, daara) : pas de contrôle.
create function public.notes_suppression()
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
        if exists (select 1 from public.evaluations e join public.periodes p on p.id = e.periode_id where e.id = old.evaluation_id and p.cloturee) then
            raise exception 'periode_cloturee' using errcode = '23514';
        end if;
    end if;
    return old;
end;
$$;
revoke execute on function public.notes_suppression() from public, anon, authenticated;
create trigger notes_suppression before delete on public.notes
    for each row execute function public.notes_suppression();
create trigger notes_audit after insert or update or delete on public.notes
    for each row execute function public.audit_trigger_colonnes();

-- Mise à jour automatique (S5.0b).
create trigger notes_signal_ins after insert on public.notes referencing new table as nouvelles
    for each statement execute function public.signaler_changement('daara_id');
create trigger notes_signal_maj after update on public.notes referencing new table as nouvelles old table as anciennes
    for each statement execute function public.signaler_changement('daara_id');
create trigger notes_signal_sup after delete on public.notes referencing old table as anciennes
    for each statement execute function public.signaler_changement('daara_id');

alter table public.notes enable row level security;
revoke select, insert, update, delete on public.notes from authenticated;
grant select (id, daara_id, evaluation_id, apprenant_id, classe_id, valeur, absent, appreciation, updated_at) on public.notes to authenticated;
grant insert (daara_id, evaluation_id, apprenant_id, classe_id, classe_matiere_id, valeur, absent, appreciation) on public.notes to authenticated;
grant update (valeur, absent, appreciation) on public.notes to authenticated;
grant delete on public.notes to authenticated;

-- Parent : la note de son enfant si l'évaluation lui est lisible (politique des évaluations : publiée, ou dès la saisie).
create policy notes_select on public.notes for select to authenticated
    using ((select public.module_actif(daara_id, 'notes')) and (
        (select public.has_role(daara_id, array['admin']::public.role_membre[]))
        or (select public.enseigne_classe_active(classe_id))
        or ((select public.is_parent_of(apprenant_id)) and exists (select 1 from public.evaluations e where e.id = notes.evaluation_id))));
create policy notes_insert on public.notes for insert to authenticated
    with check ((select public.peut_ecrire_evaluation(daara_id, classe_matiere_id)));
create policy notes_update on public.notes for update to authenticated
    using ((select public.peut_ecrire_evaluation(daara_id, classe_matiere_id)))
    with check ((select public.peut_ecrire_evaluation(daara_id, classe_matiere_id)));
create policy notes_delete on public.notes for delete to authenticated
    using ((select public.peut_ecrire_evaluation(daara_id, classe_matiere_id)));

-- Évaluations : barème abaissé sous une note saisie refusé ; évaluation publiée avec des notes non supprimable.
create or replace function public.evaluations_coherentes()
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
    -- S6.3 : un barème abaissé sous une note déjà saisie est refusé.
    if tg_op = 'UPDATE' and new.bareme < old.bareme and exists (
        select 1 from public.notes n where n.evaluation_id = new.id and n.valeur > new.bareme
    ) then
        raise exception 'bareme_inferieur_notes' using errcode = '23514';
    end if;
    new.classe_id := v_cm.classe_id;
    return new;
end;
$$;

create or replace function public.evaluations_suppression()
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
        if old.publiee_at is not null and exists (select 1 from public.notes n where n.evaluation_id = old.id) then
            raise exception 'evaluation_publiee' using errcode = '23514';
        end if;
    end if;
    return old;
end;
$$;
