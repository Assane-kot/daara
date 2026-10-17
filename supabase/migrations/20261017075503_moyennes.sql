-- S6.4 Moyennes calculées par la base selon les réglages de la daara (ADR-012 ; LLD §7.3 ; spec notes.md).
-- Jamais stockées : calculées à la demande, en security invoker (chacun obtient les moyennes de ce qu'il peut lire :
-- l'enseignant ses classes, le parent les notes visibles de son enfant). Rang et bulletins : sprint 7.

-- Arrondi d'une moyenne affichée : centième, dixième, quart ou demi-point (au plus proche, moitié vers le haut).
create function public.arrondir_note(p_valeur numeric, p_mode public.arrondi_note)
returns numeric
language sql
immutable
set search_path = ''
as $$
    select case p_mode
        when 'centieme' then round(p_valeur, 2)
        when 'dixieme' then round(p_valeur, 1)
        when 'quart' then round(round(p_valeur * 4) / 4, 2)
        when 'demi' then round(round(p_valeur * 2) / 2, 1)
    end;
$$;
revoke execute on function public.arrondir_note(numeric, public.arrondi_note) from public, anon;
grant execute on function public.arrondir_note(numeric, public.arrondi_note) to authenticated;

-- Moyennes d'une classe pour une période (ou d'un seul élève) :
--   note ramenée au barème de la daara (valeur / barème de l'évaluation × barème de la daara) ;
--   élève absent : ne compte pas, compte 0, ou compte 0 si son absence du jour n'est pas justifiée (réglage) ;
--   moyenne d'une matière : pondérée par le coefficient des évaluations ;
--   moyenne générale : pondérée par le coefficient des matières de la classe, ou simple (réglage) ; matière sans note
--   ignorée ; arrondi (réglage) appliqué aux valeurs renvoyées, la générale étant calculée sur les valeurs non arrondies.
-- Parent : `{ "masquees": true }` si la daara masque les moyennes aux familles.
create function public.moyennes(p_classe uuid, p_periode uuid, p_apprenant uuid default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
    v_daara uuid;
    v_bareme numeric;
    v_reglages record;
    v_resultat jsonb;
begin
    select c.daara_id into v_daara from public.classes c where c.id = p_classe;
    if v_daara is not null then
        -- Lisibles par les membres actuels quand le module `notes` est actif.
        select r.daara_id, r.absence_evaluation, r.moyenne_generale, r.arrondi, r.seuil_reussite, r.moyennes_visibles into v_reglages
        from public.reglages_notes r where r.daara_id = v_daara;
    end if;
    if v_daara is null or v_reglages.daara_id is null then
        raise exception 'droits' using errcode = '42501';
    end if;
    if not v_reglages.moyennes_visibles and not public.has_role(v_daara, array['admin', 'enseignant']::public.role_membre[]) then
        return jsonb_build_object('masquees', true);
    end if;
    select d.bareme into v_bareme from public.daaras d where d.id = v_daara;

    with eleves as (
        select i.apprenant_id, a.nom, a.prenom
        from public.inscriptions i
        join public.apprenants a on a.id = i.apprenant_id and a.statut = 'inscrit'
        where i.classe_id = p_classe and (p_apprenant is null or i.apprenant_id = p_apprenant)
    ),
    evals as (
        select e.id, e.classe_matiere_id, e.bareme, e.coefficient, e.date_eval
        from public.evaluations e
        where e.classe_id = p_classe and e.periode_id = p_periode
    ),
    points as (
        select el.apprenant_id, ev.classe_matiere_id, ev.coefficient as poids,
            coalesce(n.valeur / ev.bareme * v_bareme, 0) as valeur
        from eleves el
        join public.notes n on n.apprenant_id = el.apprenant_id
        join evals ev on ev.id = n.evaluation_id
        where n.valeur is not null
           or (n.absent and v_reglages.absence_evaluation = 'zero')
           or (n.absent and v_reglages.absence_evaluation = 'zero_si_non_justifiee' and not exists (
                select 1 from public.absences ab
                where ab.apprenant_id = el.apprenant_id and ab.date_absence = ev.date_eval and ab.etat = 'justifiee'))
    ),
    par_matiere as (
        select p.apprenant_id, p.classe_matiere_id, sum(p.valeur * p.poids) / sum(p.poids) as moyenne
        from points p
        group by p.apprenant_id, p.classe_matiere_id
    ),
    matieres_classe as (
        select cm.id, m.nom, cm.coefficient
        from public.classe_matieres cm
        join public.matieres m on m.id = cm.matiere_id
        where cm.classe_id = p_classe
    ),
    generales as (
        select pm.apprenant_id,
            case when v_reglages.moyenne_generale = 'simple' then avg(pm.moyenne)
                 else sum(pm.moyenne * mc.coefficient) / sum(mc.coefficient) end as moyenne
        from par_matiere pm
        join matieres_classe mc on mc.id = pm.classe_matiere_id
        group by pm.apprenant_id
    )
    select jsonb_build_object(
        'bareme', v_bareme,
        'seuil', coalesce(v_reglages.seuil_reussite, v_bareme / 2),
        'matieres', coalesce((
            select jsonb_agg(jsonb_build_object('id', mc.id, 'nom', mc.nom, 'coefficient', mc.coefficient) order by mc.nom)
            from matieres_classe mc
        ), '[]'::jsonb),
        'eleves', coalesce((
            select jsonb_agg(jsonb_build_object(
                'apprenant_id', el.apprenant_id,
                'nom', el.nom,
                'prenom', el.prenom,
                'matieres', coalesce((
                    select jsonb_object_agg(pm.classe_matiere_id, public.arrondir_note(pm.moyenne, v_reglages.arrondi))
                    from par_matiere pm where pm.apprenant_id = el.apprenant_id
                ), '{}'::jsonb),
                'generale', (select public.arrondir_note(g.moyenne, v_reglages.arrondi) from generales g where g.apprenant_id = el.apprenant_id)
            ) order by el.nom, el.prenom)
            from eleves el
        ), '[]'::jsonb)
    ) into v_resultat;
    return v_resultat;
end;
$$;
revoke execute on function public.moyennes(uuid, uuid, uuid) from public, anon;
grant execute on function public.moyennes(uuid, uuid, uuid) to authenticated;

-- Parent : matières (et coefficients) de la classe de ses enfants, pour leurs moyennes et leurs notes (LLD §4).
create policy classe_matieres_select_parent on public.classe_matieres for select to authenticated
    using ((select public.module_actif(daara_id, 'structure')) and (select public.classe_d_un_enfant(classe_id)));
