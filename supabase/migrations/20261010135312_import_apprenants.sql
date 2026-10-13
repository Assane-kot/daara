-- S4.4 Import CSV des apprenants (LLD §3.4, §5 ; spec apprenants.md). Le fichier est analysé dans le navigateur ; la base
-- revalide tout, signale les erreurs ligne par ligne et n'écrit rien tant qu'il en reste (tout ou rien, 500 lignes).
-- Security invoker : RLS, triggers (matricule, droits, journal sans valeurs) et droits par colonne s'appliquent comme
-- pour une saisie à la main.

create function public.importer_apprenants(
    p_daara uuid,
    p_lignes jsonb,
    p_classe uuid default null,
    p_simuler boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_ligne jsonb;
    v_n integer;
    v_nom text;
    v_prenom text;
    v_date_texte text;
    v_date date;
    v_sexe text;
    v_classe_texte text;
    v_classe uuid;
    v_nb integer;
    v_apprenant uuid;
    v_erreurs jsonb := '[]'::jsonb;
    v_valides jsonb := '[]'::jsonb;
    v_vus text[] := '{}';
    v_cle text;
    v_crees integer := 0;
begin
    if not public.has_role(p_daara, array['admin']::public.role_membre[]) then
        raise exception 'droits' using errcode = '42501';
    end if;
    if jsonb_typeof(p_lignes) is distinct from 'array' or jsonb_array_length(p_lignes) = 0 then
        raise exception 'import_vide' using errcode = '22023';
    end if;
    if jsonb_array_length(p_lignes) > 500 then
        raise exception 'import_trop_grand' using errcode = '22023';
    end if;
    -- Classe par défaut (lignes sans classe) : une classe de l'année active de la daara.
    if p_classe is not null and not exists (
        select 1 from public.classes c join public.annees_scolaires a on a.id = c.annee_id
        where c.id = p_classe and c.daara_id = p_daara and a.active
    ) then
        raise exception 'classe_inconnue' using errcode = '23514';
    end if;

    for v_ligne, v_n in select e, n::integer from jsonb_array_elements(p_lignes) with ordinality as t (e, n) loop
        if jsonb_typeof(v_ligne) is distinct from 'object' then
            v_erreurs := v_erreurs || jsonb_build_object('ligne', v_n, 'champ', 'ligne', 'code', 'invalide');
            continue;
        end if;
        v_nom := nullif(normalize(btrim(v_ligne ->> 'nom'), nfc), '');
        v_prenom := nullif(normalize(btrim(v_ligne ->> 'prenom'), nfc), '');
        v_date_texte := nullif(btrim(v_ligne ->> 'date_naissance'), '');
        v_sexe := v_ligne ->> 'sexe';
        v_classe_texte := nullif(btrim(v_ligne ->> 'classe'), '');
        v_date := null;
        v_classe := p_classe;

        if v_nom is null then
            v_erreurs := v_erreurs || jsonb_build_object('ligne', v_n, 'champ', 'nom', 'code', 'requis');
        elsif not public.libelle_valide(v_nom, 100) then
            v_erreurs := v_erreurs || jsonb_build_object('ligne', v_n, 'champ', 'nom', 'code', 'invalide');
        end if;
        if v_prenom is null then
            v_erreurs := v_erreurs || jsonb_build_object('ligne', v_n, 'champ', 'prenom', 'code', 'requis');
        elsif not public.libelle_valide(v_prenom, 100) then
            v_erreurs := v_erreurs || jsonb_build_object('ligne', v_n, 'champ', 'prenom', 'code', 'invalide');
        end if;
        if v_date_texte is not null then
            if v_date_texte ~ '^\d{4}-\d{2}-\d{2}$' and pg_catalog.pg_input_is_valid(v_date_texte, 'date') then
                v_date := v_date_texte::date;
            end if;
            if v_date is null or v_date not between date '1950-01-01' and current_date then
                v_erreurs := v_erreurs || jsonb_build_object('ligne', v_n, 'champ', 'date_naissance', 'code', 'invalide');
            end if;
        end if;
        if v_sexe is null then
            v_erreurs := v_erreurs || jsonb_build_object('ligne', v_n, 'champ', 'sexe', 'code', 'requis');
        elsif v_sexe not in ('F', 'M') then
            v_erreurs := v_erreurs || jsonb_build_object('ligne', v_n, 'champ', 'sexe', 'code', 'invalide');
        end if;
        if v_classe_texte is not null then
            select count(*), min(c.id::text)::uuid into v_nb, v_classe
            from public.classes c join public.annees_scolaires a on a.id = c.annee_id
            where c.daara_id = p_daara and a.active and public.sans_accents(btrim(c.nom)) = public.sans_accents(v_classe_texte);
            if v_nb <> 1 then
                v_classe := null;
                v_erreurs := v_erreurs || jsonb_build_object('ligne', v_n, 'champ', 'classe', 'code', 'inconnue');
            end if;
        end if;

        -- Doublons : même nom, prénom et date de naissance (sans casse ni accents), dans le fichier ou dans la daara.
        if v_nom is not null and v_prenom is not null then
            v_cle := public.sans_accents(v_nom) || '|' || public.sans_accents(v_prenom) || '|' || coalesce(v_date::text, '');
            if v_cle = any (v_vus) then
                v_erreurs := v_erreurs || jsonb_build_object('ligne', v_n, 'champ', 'ligne', 'code', 'doublon_fichier');
            elsif exists (
                select 1 from public.apprenants ap
                where ap.daara_id = p_daara and public.sans_accents(ap.nom) = public.sans_accents(v_nom)
                    and public.sans_accents(ap.prenom) = public.sans_accents(v_prenom)
                    and ap.date_naissance is not distinct from v_date
            ) then
                v_erreurs := v_erreurs || jsonb_build_object('ligne', v_n, 'champ', 'ligne', 'code', 'doublon');
            end if;
            v_vus := v_vus || v_cle;
        end if;

        v_valides := v_valides || jsonb_build_object('nom', v_nom, 'prenom', v_prenom, 'date', v_date, 'sexe', v_sexe, 'classe', v_classe);
    end loop;

    if jsonb_array_length(v_erreurs) > 0 or p_simuler then
        return jsonb_build_object('crees', 0, 'lignes', jsonb_array_length(p_lignes), 'erreurs', v_erreurs);
    end if;

    for v_ligne in select e from jsonb_array_elements(v_valides) as t (e) loop
        insert into public.apprenants (daara_id, nom, prenom, date_naissance, sexe)
        values (p_daara, v_ligne ->> 'nom', v_ligne ->> 'prenom', (v_ligne ->> 'date')::date, (v_ligne ->> 'sexe')::public.sexe_apprenant)
        returning id into v_apprenant;
        if v_ligne ->> 'classe' is not null then
            insert into public.inscriptions (daara_id, apprenant_id, classe_id, annee_id)
            select p_daara, v_apprenant, c.id, c.annee_id from public.classes c where c.id = (v_ligne ->> 'classe')::uuid;
        end if;
        v_crees := v_crees + 1;
    end loop;
    return jsonb_build_object('crees', v_crees, 'lignes', v_crees, 'erreurs', '[]'::jsonb);
end;
$$;
revoke execute on function public.importer_apprenants(uuid, jsonb, uuid, boolean) from public, anon;
grant execute on function public.importer_apprenants(uuid, jsonb, uuid, boolean) to authenticated;
