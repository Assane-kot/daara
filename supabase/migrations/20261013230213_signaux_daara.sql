-- S5.0b Mise à jour automatique entre profils (ADR-011 révisé, 2026-10-13).
-- Chaque écriture sur une table de la daara publie un signal Realtime Broadcast « la table X a changé » sur le canal
-- privé `daara:<uuid>` : AUCUNE donnée dans le message (seulement le nom de la table) ; l'écran ouvert recharge ses
-- données par une requête normale, soumise à la RLS. Un signal par instruction et par daara (un import de 20 élèves =
-- un seul signal). Écoute réservée aux membres actuels de la daara (ADR-010 §9) ; aucun envoi par le client.

-- Le canal `daara:<uuid>` est-il ouvert à l'utilisateur connecté ?
create function public.canal_daara_autorise(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if p_topic is null or p_topic !~ '^daara:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        return false;
    end if;
    return public.membre_actuel(substring(p_topic from 7)::uuid);
end;
$$;
revoke execute on function public.canal_daara_autorise(text) from public, anon;
-- Évaluée par la politique de realtime.messages avec les droits de l'abonné.
grant execute on function public.canal_daara_autorise(text) to authenticated;

create policy daara_signaux_lecture on realtime.messages for select to authenticated
    using (realtime.messages.extension = 'broadcast' and (select public.canal_daara_autorise((select realtime.topic()))));

-- Publie un signal par daara touchée par l'instruction (tables de transition). `realtime.send` n'interrompt jamais
-- l'écriture (erreur changée en avertissement). Exécutée avec les droits de son propriétaire (seul `postgres` peut
-- appeler realtime.send).
create function public.signaler_changement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_daara uuid;
    v_colonne text := coalesce(tg_argv[0], 'daara_id');
begin
    for v_daara in
        execute format(
            'select distinct %1$I from (%2$s) t where %1$I is not null',
            v_colonne,
            case tg_op
                when 'INSERT' then format('select %I from nouvelles', v_colonne)
                when 'DELETE' then format('select %I from anciennes', v_colonne)
                else format('select %1$I from nouvelles union select %1$I from anciennes', v_colonne)
            end
        )
    loop
        perform realtime.send(jsonb_build_object('table', tg_table_name), 'changement', 'daara:' || v_daara::text, true);
    end loop;
    return null;
end;
$$;
revoke execute on function public.signaler_changement() from public, anon, authenticated;

-- Trois triggers par table (une table de transition par événement).
do $$
declare
    v_table text;
    v_colonne text;
begin
    for v_table, v_colonne in
        select t, case when t = 'daaras' then 'id' else 'daara_id' end
        from unnest(array['daaras', 'daara_modules', 'memberships', 'invitations', 'annees_scolaires', 'periodes', 'matieres',
            'classes', 'classe_matieres', 'apprenants', 'inscriptions', 'parent_links', 'invitation_enfants']) as t
    loop
        execute format('create trigger %1$s_signal_ins after insert on public.%1$I referencing new table as nouvelles
            for each statement execute function public.signaler_changement(%2$L)', v_table, v_colonne);
        execute format('create trigger %1$s_signal_maj after update on public.%1$I referencing new table as nouvelles old table as anciennes
            for each statement execute function public.signaler_changement(%2$L)', v_table, v_colonne);
        execute format('create trigger %1$s_signal_sup after delete on public.%1$I referencing old table as anciennes
            for each statement execute function public.signaler_changement(%2$L)', v_table, v_colonne);
    end loop;
end;
$$;
