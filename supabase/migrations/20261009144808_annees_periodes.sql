-- S3.1 Années scolaires et périodes (module `structure`, ADR-008 ; LLD §3.3, §4 ; spec structure-scolaire.md).

-- =====================================================================================================
-- Fonctions communes à la structure scolaire (réutilisées par les migrations suivantes)
-- =====================================================================================================

-- Texte affichable : sans caractère de contrôle, invisible ni de mise en forme bidirectionnelle (LLD §3.2), plus la
-- marque de lettre arabe U+061C, U+034F, U+180E, U+2028 et U+2029 (audit RLS S3.1 : libellés en arabe).
create function public.texte_sur(p_texte text)
returns boolean
language sql
immutable
set search_path = ''
as $$
    select p_texte !~ '[[:cntrl:]\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u061C\u034F\u180E\u2028\u2029]';
$$;
revoke execute on function public.texte_sur(text) from public, anon;
-- Évaluée dans les contraintes check, donc avec les droits de l'écrivain : exécutable par authenticated (fonction pure).
grant execute on function public.texte_sur(text) to authenticated;

-- =====================================================================================================
-- Tables
-- =====================================================================================================
create table public.annees_scolaires (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    libelle text not null check (libelle = btrim(libelle) and char_length(libelle) between 1 and 20 and public.texte_sur(libelle)),
    date_debut date not null,
    date_fin date not null,
    active boolean not null default false,
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null,
    unique (daara_id, libelle),
    constraint annees_dates_check check (date_fin > date_debut and date_fin <= date_debut + interval '18 months')
);
-- Une seule année active par daara ; sert aussi d'index sur daara_id (avec l'unicité du libellé).
create unique index annees_scolaires_active_uniq on public.annees_scolaires (daara_id) where active;
create index annees_scolaires_daara_id_idx on public.annees_scolaires (daara_id, date_debut desc);

create table public.periodes (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    annee_id uuid not null references public.annees_scolaires (id) on delete cascade,
    libelle text not null check (libelle = btrim(libelle) and char_length(libelle) between 1 and 40 and public.texte_sur(libelle)),
    ordre smallint not null check (ordre between 1 and 12),
    date_debut date not null,
    date_fin date not null,
    cloturee boolean not null default false,
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null,
    unique (annee_id, ordre),
    constraint periodes_dates_check check (date_fin > date_debut)
);
create index periodes_daara_id_idx on public.periodes (daara_id);

-- =====================================================================================================
-- Triggers
-- =====================================================================================================

-- Période : écrivain autorisé AVANT toute lecture (un trigger BEFORE passe avant la RLS : sans ce contrôle, la fonction
-- servait d'oracle sur les dates d'une autre daara et y posait un verrou ; audits S3.1), même daara que son année, dates
-- dans l'année, sans chevauchement (année verrouillée : écritures concurrentes sérialisées). Période clôturée : seule
-- la réouverture est possible (ni dates, ni ordre, ni libellé, ni suppression). daara_id et annee_id immuables.
create function public.periodes_coherentes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_annee public.annees_scolaires;
    v_ligne public.periodes := case when tg_op = 'DELETE' then old else new end;
begin
    -- Insertion et mise à jour seulement : un delete direct est déjà filtré par la RLS avant le trigger, et une
    -- cascade (année, daara) n'a pas à être soumise aux droits de l'utilisateur. auth.uid() nul : service_role, postgres.
    if tg_op <> 'DELETE' and auth.uid() is not null and not (
        public.has_role(v_ligne.daara_id, array['admin']::public.role_membre[])
        and public.module_actif(v_ligne.daara_id, 'structure')
    ) then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;

    if tg_op = 'DELETE' then
        -- Suppression d'une période clôturée refusée, sauf en cascade (année ou daara déjà supprimée).
        if old.cloturee and exists (select 1 from public.annees_scolaires a where a.id = old.annee_id) then
            raise exception 'periode_cloturee' using errcode = '23514';
        end if;
        return old;
    end if;

    if tg_op = 'UPDATE' then
        if new.daara_id <> old.daara_id or new.annee_id <> old.annee_id then
            raise exception 'autre_daara' using errcode = '23514';
        end if;
        if old.cloturee and new.cloturee and (new.libelle, new.ordre, new.date_debut, new.date_fin)
            is distinct from (old.libelle, old.ordre, old.date_debut, old.date_fin) then
            raise exception 'periode_cloturee' using errcode = '23514';
        end if;
    end if;

    select * into v_annee from public.annees_scolaires a
    where a.id = new.annee_id and a.daara_id = new.daara_id
    for update;
    if not found then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    if new.date_debut < v_annee.date_debut or new.date_fin > v_annee.date_fin then
        raise exception 'periode_hors_annee' using errcode = '23514';
    end if;
    if exists (
        select 1 from public.periodes p
        where p.annee_id = new.annee_id and p.id <> new.id
          and daterange(p.date_debut, p.date_fin, '[]') && daterange(new.date_debut, new.date_fin, '[]')
    ) then
        raise exception 'periodes_chevauchement' using errcode = '23514';
    end if;
    return new;
end;
$$;
revoke execute on function public.periodes_coherentes() from public, anon, authenticated;
create trigger periodes_coherentes before insert or update or delete on public.periodes
    for each row execute function public.periodes_coherentes();

-- Année : ses périodes restent dans ses dates ; une année active n'est pas supprimée (sauf cascade de la daara).
create function public.annees_coherentes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'DELETE' then
        if old.active and exists (select 1 from public.daaras d where d.id = old.daara_id) then
            raise exception 'annee_active' using errcode = '23514';
        end if;
        return old;
    end if;
    if new.daara_id <> old.daara_id then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    if exists (
        select 1 from public.periodes p
        where p.annee_id = new.id and (p.date_debut < new.date_debut or p.date_fin > new.date_fin)
    ) then
        raise exception 'periode_hors_annee' using errcode = '23514';
    end if;
    return new;
end;
$$;
revoke execute on function public.annees_coherentes() from public, anon, authenticated;
create trigger annees_coherentes_maj before update of date_debut, date_fin, daara_id on public.annees_scolaires
    for each row execute function public.annees_coherentes();
create trigger annees_coherentes_suppr before delete on public.annees_scolaires
    for each row execute function public.annees_coherentes();

create trigger annees_scolaires_audit after insert or update or delete on public.annees_scolaires
    for each row execute function public.audit_trigger('daara_id');
create trigger periodes_audit after insert or update or delete on public.periodes
    for each row execute function public.audit_trigger('daara_id');

-- =====================================================================================================
-- RLS et droits : lecture par les membres, écriture par l'admin aal2, module `structure` actif (ADR-008).
-- daara_id, annee_id, active et created_by ne sont pas modifiables (droits par colonne).
-- =====================================================================================================
alter table public.annees_scolaires enable row level security;
alter table public.periodes enable row level security;

revoke select, insert, update on public.annees_scolaires, public.periodes from authenticated;
-- created_by (uuid de l'auteur) n'est pas utile à l'écran : illisible (audit RLS S3.1).
grant select (id, daara_id, libelle, date_debut, date_fin, active, created_at) on public.annees_scolaires to authenticated;
grant select (id, daara_id, annee_id, libelle, ordre, date_debut, date_fin, cloturee, created_at) on public.periodes to authenticated;
grant insert (id, daara_id, libelle, date_debut, date_fin) on public.annees_scolaires to authenticated;
grant update (libelle, date_debut, date_fin) on public.annees_scolaires to authenticated;
grant insert (id, daara_id, annee_id, libelle, ordre, date_debut, date_fin) on public.periodes to authenticated;
grant update (libelle, ordre, date_debut, date_fin, cloturee) on public.periodes to authenticated;

create policy annees_select_membre on public.annees_scolaires for select to authenticated
    using ((select public.is_member(daara_id)) and (select public.module_actif(daara_id, 'structure')));
create policy annees_insert_admin on public.annees_scolaires for insert to authenticated
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy annees_update_admin on public.annees_scolaires for update to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')))
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy annees_delete_admin on public.annees_scolaires for delete to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));

create policy periodes_select_membre on public.periodes for select to authenticated
    using ((select public.is_member(daara_id)) and (select public.module_actif(daara_id, 'structure')));
create policy periodes_insert_admin on public.periodes for insert to authenticated
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy periodes_update_admin on public.periodes for update to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')))
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy periodes_delete_admin on public.periodes for delete to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));

-- =====================================================================================================
-- RPC
-- =====================================================================================================

-- Rend une année active (l'ancienne ne l'est plus), en une transaction ; droits vérifiés, verrous (daara puis année),
-- droits revérifiés.
create function public.activer_annee(p_annee uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_daara uuid;
begin
    select a.daara_id into v_daara from public.annees_scolaires a where a.id = p_annee;
    if v_daara is null or not public.has_role(v_daara, array['admin']::public.role_membre[])
        or not public.module_actif(v_daara, 'structure') then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    perform 1 from public.daaras d where d.id = v_daara for no key update;
    -- Revérification après verrou (modèle de membership_administre) : année toujours là, droits toujours valables.
    perform 1 from public.annees_scolaires a where a.id = p_annee and a.daara_id = v_daara for update;
    if not found or not public.has_role(v_daara, array['admin']::public.role_membre[])
        or not public.module_actif(v_daara, 'structure') then
        raise exception 'admin_aal2_requis' using errcode = '42501';
    end if;
    update public.annees_scolaires a set active = false where a.daara_id = v_daara and a.active and a.id <> p_annee;
    update public.annees_scolaires a set active = true where a.id = p_annee and not a.active;
end;
$$;
revoke execute on function public.activer_annee(uuid) from public, anon;
grant execute on function public.activer_annee(uuid) to authenticated;
