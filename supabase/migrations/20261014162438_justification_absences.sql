-- S5.2 Justification des absences et suivi (module `absences` ; LLD §3.5, §4 ; spec absences.md).
-- Le parent envoie un motif ; l'admin ou le TITULAIRE de la classe décide (justifiée / non justifiée) ; statistiques
-- simples. Motif, état et décision ne s'écrivent que par ces RPC (hors droits par colonne du client).

-- Les RPC ci-dessous modifient une absence au nom d'un parent ou d'un titulaire : le trigger de cohérence (droits de
-- saisie de l'appel, fenêtre de 7 jours) est sauté pendant leur écriture, signalée par un indicateur de transaction
-- qu'aucun client ne peut poser (set_config n'est pas exposé par l'API) et remis à vide aussitôt.
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
    new.classe_id := v_appel.classe_id;
    new.date_absence := v_appel.date_appel;
    new.creneau := v_appel.creneau;
    return new;
end;
$$;

-- Le parent envoie (ou corrige) le motif tant que l'absence n'est pas décidée.
create function public.justifier_absence(p_absence uuid, p_motif text)
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
revoke execute on function public.justifier_absence(uuid, text) from public, anon;
grant execute on function public.justifier_absence(uuid, text) to authenticated;

-- L'admin (aal2) ou le titulaire de la classe décide ; une décision peut être corrigée. Sans motif : mot du parent sur
-- papier, appel téléphonique…
create function public.decider_justification(p_absence uuid, p_justifiee boolean)
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
            and exists (select 1 from public.classes c where c.id = v_abs.classe_id and c.titulaire_id = auth.uid()))
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
revoke execute on function public.decider_justification(uuid, boolean) from public, anon;
grant execute on function public.decider_justification(uuid, boolean) to authenticated;

-- Statistiques simples sur une période (security invoker : la RLS limite l'enseignant à ses classes). Taux d'absence :
-- absences / (élèves inscrits × appels terminés), par classe.
create function public.statistiques_absences(p_daara uuid, p_debut date, p_fin date, p_classe uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
    with classes as (
        select c.id, c.nom,
            (select count(*) from public.inscriptions i join public.apprenants ap on ap.id = i.apprenant_id
             where i.classe_id = c.id and ap.statut = 'inscrit') as eleves,
            (select count(*) from public.appels a where a.classe_id = c.id and a.termine_at is not null
             and a.date_appel between p_debut and p_fin) as appels
        from public.classes c join public.annees_scolaires an on an.id = c.annee_id and an.active
        where c.daara_id = p_daara and (p_classe is null or c.id = p_classe)
          and exists (select 1 from public.appels a where a.classe_id = c.id)
    ),
    abs as (
        select a.classe_id, a.apprenant_id, a.type, a.etat
        from public.absences a
        where a.daara_id = p_daara and a.date_absence between p_debut and p_fin and (p_classe is null or a.classe_id = p_classe)
    )
    select jsonb_build_object(
        'classes', coalesce((
            select jsonb_agg(jsonb_build_object(
                'classe_id', c.id, 'nom', c.nom, 'eleves', c.eleves, 'appels', c.appels,
                'absences', (select count(*) from abs where abs.classe_id = c.id and abs.type = 'absence'),
                'retards', (select count(*) from abs where abs.classe_id = c.id and abs.type = 'retard'),
                'non_justifiees', (select count(*) from abs where abs.classe_id = c.id and abs.type = 'absence'
                    and abs.etat in ('aucune', 'envoyee', 'non_justifiee')),
                'taux', case when c.eleves * c.appels = 0 then 0
                    else round(100.0 * (select count(*) from abs where abs.classe_id = c.id and abs.type = 'absence') / (c.eleves * c.appels), 1) end
            ) order by c.nom)
            from classes c), '[]'::jsonb),
        'eleves', coalesce((
            select jsonb_agg(e order by (e ->> 'absences')::int desc, (e ->> 'retards')::int desc)
            from (
                select jsonb_build_object('apprenant_id', abs.apprenant_id,
                    'absences', count(*) filter (where abs.type = 'absence'),
                    'retards', count(*) filter (where abs.type = 'retard')) as e
                from abs group by abs.apprenant_id
                order by count(*) filter (where abs.type = 'absence') desc, count(*) filter (where abs.type = 'retard') desc
                limit 10
            ) t), '[]'::jsonb)
    );
$$;
revoke execute on function public.statistiques_absences(uuid, date, date, uuid) from public, anon;
grant execute on function public.statistiques_absences(uuid, date, date, uuid) to authenticated;
