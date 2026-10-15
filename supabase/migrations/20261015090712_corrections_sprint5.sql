-- Corrections de l'audit de fin de sprint 5 (2026-10-15).
-- I1 : l'enseignant n'agit sur les appels et absences que pour les classes qu'il enseigne dans l'ANNÉE ACTIVE (décision
--      du 2026-10-13, ADR-010 §8) : nouvel helper `enseigne_classe_active` dans les politiques et la décision du titulaire
--      (`teaches_class`, utilisé par la structure, reste inchangé).
-- M1 : suppression d'un appel soumise aux mêmes contrôles que sa saisie (fenêtre de 7 jours, année active).
-- M2 : changer le type d'une absence déjà décidée annule la décision (retour à « envoyée » ou « sans justification »).
-- M3 : notifications illisibles par un membre désactivé.

create function public.enseigne_classe_active(p_classe uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.teaches_class(p_classe) and exists (
        select 1 from public.classes c join public.annees_scolaires a on a.id = c.annee_id and a.active where c.id = p_classe
    );
$$;
revoke execute on function public.enseigne_classe_active(uuid) from public, anon;
grant execute on function public.enseigne_classe_active(uuid) to authenticated;

drop policy appels_select on public.appels;
create policy appels_select on public.appels for select to authenticated
    using ((select public.module_actif(daara_id, 'absences')) and ((select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.enseigne_classe_active(classe_id)) or (select public.classe_d_un_enfant(classe_id))));
drop policy appels_insert on public.appels;
create policy appels_insert on public.appels for insert to authenticated
    with check ((select public.module_actif(daara_id, 'absences')) and ((select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.enseigne_classe_active(classe_id))));
drop policy appels_delete on public.appels;
create policy appels_delete on public.appels for delete to authenticated
    using (termine_at is null and (select public.module_actif(daara_id, 'absences')) and ((select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.enseigne_classe_active(classe_id))));

drop policy absences_select on public.absences;
create policy absences_select on public.absences for select to authenticated
    using ((select public.module_actif(daara_id, 'absences')) and ((select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.enseigne_classe_active(classe_id)) or (select public.is_parent_of(apprenant_id))));
drop policy absences_insert on public.absences;
create policy absences_insert on public.absences for insert to authenticated
    with check ((select public.module_actif(daara_id, 'absences')) and ((select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.enseigne_classe_active(classe_id))));
drop policy absences_update on public.absences;
create policy absences_update on public.absences for update to authenticated
    using ((select public.module_actif(daara_id, 'absences')) and ((select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.enseigne_classe_active(classe_id))))
    with check ((select public.module_actif(daara_id, 'absences')) and ((select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.enseigne_classe_active(classe_id))));
drop policy absences_delete on public.absences;
create policy absences_delete on public.absences for delete to authenticated
    using ((select public.module_actif(daara_id, 'absences')) and ((select public.has_role(daara_id, array['admin']::public.role_membre[])) or (select public.enseigne_classe_active(classe_id))));

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

-- M1 : suppression directe d'un appel (non terminé) : droits, fenêtre de 7 jours et année active comme à la saisie.
create function public.appels_suppression()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    -- Cascade (classe, daara supprimées) : pas de contrôle.
    if pg_trigger_depth() = 1 then
        perform public.verifier_appel(old.daara_id, old.classe_id, old.date_appel);
    end if;
    return old;
end;
$$;
revoke execute on function public.appels_suppression() from public, anon, authenticated;
create trigger appels_suppression before delete on public.appels
    for each row execute function public.appels_suppression();

create or replace function public.absences_coherentes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_appel public.appels;
begin
    if tg_op = 'UPDATE' and current_setting('daara.rpc_absence', true) = 'oui' then
        if new.daara_id <> old.daara_id or new.appel_id <> old.appel_id or new.apprenant_id <> old.apprenant_id
            or new.type <> old.type then
            raise exception 'absence_immuable' using errcode = '23514';
        end if;
        return new;
    end if;
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
    -- Type changé après une décision (audit S5) : la décision ne vaut plus, on revient à l'état d'avant décision.
    if tg_op = 'UPDATE' and new.type <> old.type and old.etat in ('justifiee', 'non_justifiee') then
        new.etat := case when new.motif is null then 'aucune'::public.etat_justification else 'envoyee'::public.etat_justification end;
        new.decide_par := null;
        new.decide_at := null;
    end if;
    new.classe_id := v_appel.classe_id;
    new.date_absence := v_appel.date_appel;
    new.creneau := v_appel.creneau;
    return new;
end;
$$;

drop policy notifications_select_soi on public.notifications;
create policy notifications_select_soi on public.notifications for select to authenticated
    using (user_id = (select auth.uid()) and (select public.is_member(daara_id)) and (select public.module_actif(daara_id, 'notifications')));
drop policy notifications_update_soi on public.notifications;
create policy notifications_update_soi on public.notifications for update to authenticated
    using (user_id = (select auth.uid()) and (select public.is_member(daara_id)) and (select public.module_actif(daara_id, 'notifications')))
    with check (user_id = (select auth.uid()));
