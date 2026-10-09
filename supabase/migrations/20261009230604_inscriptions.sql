-- S4.2 Inscriptions des élèves dans les classes (module `structure` ; LLD §3.4, §4 ; ADR-010 ; spec apprenants.md).
-- Une classe par élève et par année ; l'enseignant lit les élèves (et leurs photos) des classes qu'il enseigne.

create table public.inscriptions (
    id uuid primary key default gen_random_uuid(),
    daara_id uuid not null references public.daaras (id) on delete cascade,
    apprenant_id uuid not null references public.apprenants (id) on delete cascade,
    -- Une classe qui a des inscrits ne se supprime pas (retirer d'abord les élèves).
    classe_id uuid not null references public.classes (id) on delete restrict,
    -- Copiée de la classe par le trigger (unicité par année).
    annee_id uuid not null references public.annees_scolaires (id) on delete cascade,
    date_inscription date not null default current_date,
    created_at timestamptz not null default now(),
    created_by uuid default auth.uid() references auth.users (id) on delete set null,
    unique (apprenant_id, annee_id)
);
create index inscriptions_daara_id_idx on public.inscriptions (daara_id);
create index inscriptions_classe_id_idx on public.inscriptions (classe_id);
create index inscriptions_annee_id_idx on public.inscriptions (annee_id);

-- Droits de l'écrivain en tête ; classe et élève de la même daara ; année copiée de la classe ; élève parti non
-- inscriptible ; changer de classe seulement dans la même année ; daara et élève immuables.
create function public.inscriptions_coherentes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_annee uuid;
begin
    perform public.ecrivain_structure(new.daara_id);
    if tg_op = 'UPDATE' and (new.daara_id <> old.daara_id or new.apprenant_id <> old.apprenant_id) then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    select c.annee_id into v_annee from public.classes c where c.id = new.classe_id and c.daara_id = new.daara_id;
    if v_annee is null then
        raise exception 'autre_daara' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and v_annee <> old.annee_id then
        raise exception 'autre_annee' using errcode = '23514';
    end if;
    new.annee_id := v_annee;
    if tg_op = 'INSERT' then
        perform 1 from public.apprenants a where a.id = new.apprenant_id and a.daara_id = new.daara_id;
        if not found then
            raise exception 'autre_daara' using errcode = '23514';
        end if;
        if exists (select 1 from public.apprenants a where a.id = new.apprenant_id and a.statut = 'parti') then
            raise exception 'eleve_parti' using errcode = '23514';
        end if;
    end if;
    return new;
end;
$$;
revoke execute on function public.inscriptions_coherentes() from public, anon, authenticated;
create trigger inscriptions_coherentes before insert or update on public.inscriptions
    for each row execute function public.inscriptions_coherentes();
create trigger inscriptions_audit after insert or update or delete on public.inscriptions
    for each row execute function public.audit_trigger_colonnes();

alter table public.inscriptions enable row level security;
revoke select, insert, update on public.inscriptions from authenticated;
grant select (id, daara_id, apprenant_id, classe_id, annee_id, date_inscription, created_at) on public.inscriptions to authenticated;
-- annee_id fournie par le trigger (défaut impossible : valeur remplacée avant la vérification de la clé étrangère).
grant insert (daara_id, apprenant_id, classe_id, annee_id, date_inscription) on public.inscriptions to authenticated;
grant update (classe_id, date_inscription) on public.inscriptions to authenticated;

create policy inscriptions_select_admin on public.inscriptions for select to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy inscriptions_select_enseignant on public.inscriptions for select to authenticated
    using ((select public.teaches_class(classe_id)));
create policy inscriptions_insert_admin on public.inscriptions for insert to authenticated
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy inscriptions_update_admin on public.inscriptions for update to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')))
    with check ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));
create policy inscriptions_delete_admin on public.inscriptions for delete to authenticated
    using ((select public.has_role(daara_id, array['admin']::public.role_membre[]))
        and (select public.module_actif(daara_id, 'structure')));

-- =====================================================================================================
-- Enseignant : élèves inscrits dans une classe qu'il enseigne (toutes années), et leurs photos.
-- =====================================================================================================
create function public.enseigne_apprenant(p_apprenant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.inscriptions i
        where i.apprenant_id = p_apprenant and public.teaches_class(i.classe_id)
    );
$$;
revoke execute on function public.enseigne_apprenant(uuid) from public, anon;
-- Appelée par les politiques (droits de l'appelant).
grant execute on function public.enseigne_apprenant(uuid) to authenticated;

create policy apprenants_select_enseignant on public.apprenants for select to authenticated
    using ((select public.enseigne_apprenant(id)));

-- Photo lisible : admin de la daara du chemin, ou enseignant de l'élève (parents : S4.3).
create function public.photo_apprenant_lisible(p_nom text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.photo_apprenant_administree(p_nom)
        or case
            when p_nom ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/apprenants/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png)$'
                then exists (
                    select 1 from public.apprenants a
                    where a.id = split_part(split_part(p_nom, '/', 3), '.', 1)::uuid
                      and a.daara_id = split_part(p_nom, '/', 1)::uuid
                      and public.enseigne_apprenant(a.id)
                )
            else false
        end;
$$;
revoke execute on function public.photo_apprenant_lisible(text) from public, anon;
grant execute on function public.photo_apprenant_lisible(text) to authenticated;

drop policy photos_lecture_admin on storage.objects;
create policy photos_lecture on storage.objects for select to authenticated
    using (bucket_id = 'photos' and (select public.photo_apprenant_lisible(name)));
