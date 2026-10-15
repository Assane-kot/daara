-- S5.3 Notifications dans l'application (module `notifications`, ADR-008, ADR-011 ; LLD §3.5 ; spec notifications.md).
-- Créées par la base seulement ; aucun texte ni nom d'enfant : des identifiants, le message est composé à l'écran avec
-- les droits du destinataire (ADR-010). Signal Realtime privé par utilisateur (`utilisateur:<uuid>`), sans donnée.

create type public.type_notification as enum ('absence', 'retard', 'absence_annulee', 'justification_envoyee', 'justification_decidee');

create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    type public.type_notification not null,
    apprenant_id uuid references public.apprenants (id) on delete cascade,
    -- Absence supprimée (« absence annulée ») : la notification reste, sans lien.
    absence_id uuid references public.absences (id) on delete set null,
    date_absence date,
    creneau public.creneau_appel,
    lu_at timestamptz,
    created_at timestamptz not null default now()
);
create index notifications_daara_id_idx on public.notifications (daara_id);
create index notifications_user_id_idx on public.notifications (user_id, created_at desc);
create index notifications_absence_id_idx on public.notifications (absence_id);

alter table public.notifications enable row level security;
revoke select, insert, update, delete on public.notifications from authenticated;
grant select (id, daara_id, user_id, type, apprenant_id, absence_id, date_absence, creneau, lu_at, created_at) on public.notifications to authenticated;
grant update (lu_at) on public.notifications to authenticated;

create policy notifications_select_soi on public.notifications for select to authenticated
    using (user_id = (select auth.uid()) and (select public.module_actif(daara_id, 'notifications')));
create policy notifications_update_soi on public.notifications for update to authenticated
    using (user_id = (select auth.uid()) and (select public.module_actif(daara_id, 'notifications')))
    with check (user_id = (select auth.uid()));

-- Crée une notification par destinataire (jamais à l'auteur de l'action) si le module `notifications` est actif.
create function public.notifier(p_daara uuid, p_destinataires uuid[], p_type public.type_notification, p_apprenant uuid,
    p_absence uuid, p_date date, p_creneau public.creneau_appel)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not exists (select 1 from public.daara_modules m where m.daara_id = p_daara and m.module = 'notifications' and m.actif) then
        return;
    end if;
    insert into public.notifications (daara_id, user_id, type, apprenant_id, absence_id, date_absence, creneau)
    select distinct p_daara, u, p_type, p_apprenant, p_absence, p_date, p_creneau
    from unnest(p_destinataires) as u
    where u is not null and u is distinct from auth.uid();
end;
$$;
revoke execute on function public.notifier(uuid, uuid[], public.type_notification, uuid, uuid, date, public.creneau_appel) from public, anon, authenticated;

-- Parents actuels d'un enfant (liens, membres parents actifs) ; équipe d'une classe (admins actifs + titulaire actif).
create function public.parents_a_prevenir(p_apprenant uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(array_agg(pl.parent_user_id), '{}')
    from public.parent_links pl
    join public.memberships m on m.daara_id = pl.daara_id and m.user_id = pl.parent_user_id and m.role = 'parent' and m.actif
    where pl.apprenant_id = p_apprenant;
$$;
revoke execute on function public.parents_a_prevenir(uuid) from public, anon, authenticated;

create function public.equipe_a_prevenir(p_classe uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(array_agg(distinct m.user_id), '{}')
    from public.classes c
    join public.memberships m on m.daara_id = c.daara_id and m.actif
        and (m.role = 'admin' or (m.role = 'enseignant' and m.user_id = c.titulaire_id))
    where c.id = p_classe;
$$;
revoke execute on function public.equipe_a_prevenir(uuid) from public, anon, authenticated;

-- Absences : rien pendant l'appel ; après la fin de l'appel, ajout / changement de type / retrait préviennent les
-- parents ; motif envoyé → équipe ; décision → parents (ADR-011).
create function public.notifier_absences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_termine boolean;
begin
    if tg_op = 'DELETE' then
        -- Cascade (appel, élève, daara supprimés) : rien.
        if pg_trigger_depth() > 1 then
            return null;
        end if;
        select a.termine_at is not null into v_termine from public.appels a where a.id = old.appel_id;
        if v_termine then
            perform public.notifier(old.daara_id, public.parents_a_prevenir(old.apprenant_id), 'absence_annulee', old.apprenant_id,
                null, old.date_absence, old.creneau);
        end if;
        return null;
    end if;
    if tg_op = 'UPDATE' and new.motif is distinct from old.motif and new.etat = 'envoyee' then
        perform public.notifier(new.daara_id, public.equipe_a_prevenir(new.classe_id), 'justification_envoyee', new.apprenant_id,
            new.id, new.date_absence, new.creneau);
    end if;
    if tg_op = 'UPDATE' and new.etat is distinct from old.etat and new.etat in ('justifiee', 'non_justifiee') then
        perform public.notifier(new.daara_id, public.parents_a_prevenir(new.apprenant_id), 'justification_decidee', new.apprenant_id,
            new.id, new.date_absence, new.creneau);
    end if;
    if tg_op = 'INSERT' or new.type is distinct from old.type then
        select a.termine_at is not null into v_termine from public.appels a where a.id = new.appel_id;
        if v_termine then
            perform public.notifier(new.daara_id, public.parents_a_prevenir(new.apprenant_id), new.type::text::public.type_notification,
                new.apprenant_id, new.id, new.date_absence, new.creneau);
        end if;
    end if;
    return null;
end;
$$;
revoke execute on function public.notifier_absences() from public, anon, authenticated;
create trigger absences_notifier after insert or update or delete on public.absences
    for each row execute function public.notifier_absences();

-- Fin de l'appel : les parents des absents et des retardataires sont prévenus (une fois).
create function public.notifier_fin_appel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_abs public.absences;
begin
    if old.termine_at is null and new.termine_at is not null then
        for v_abs in select * from public.absences a where a.appel_id = new.id loop
            perform public.notifier(v_abs.daara_id, public.parents_a_prevenir(v_abs.apprenant_id), v_abs.type::text::public.type_notification,
                v_abs.apprenant_id, v_abs.id, v_abs.date_absence, v_abs.creneau);
        end loop;
    end if;
    return null;
end;
$$;
revoke execute on function public.notifier_fin_appel() from public, anon, authenticated;
create trigger appels_notifier after update of termine_at on public.appels
    for each row execute function public.notifier_fin_appel();

-- Signal Realtime au destinataire (nouvelle notification, ou lue dans un autre onglet) : canal privé par utilisateur.
create function public.signaler_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid;
begin
    for v_user in select distinct user_id from nouvelles loop
        perform realtime.send(jsonb_build_object('table', 'notifications'), 'changement', 'utilisateur:' || v_user::text, true);
    end loop;
    return null;
end;
$$;
revoke execute on function public.signaler_notifications() from public, anon, authenticated;
create trigger notifications_signal_ins after insert on public.notifications referencing new table as nouvelles
    for each statement execute function public.signaler_notifications();
create trigger notifications_signal_maj after update on public.notifications referencing new table as nouvelles
    for each statement execute function public.signaler_notifications();

create policy utilisateur_signaux_lecture on realtime.messages for select to authenticated
    using (realtime.messages.extension = 'broadcast' and (select realtime.topic()) = 'utilisateur:' || (select auth.uid())::text);
