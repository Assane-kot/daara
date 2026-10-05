-- Sprint 2, S2.3 : logo de la daara dans le Storage (LLD §5, docs/features/parametres-daara.md).
-- Bucket public en lecture (logo affiché à tous, y compris un jour sur l'écran de connexion de la daara) ;
-- écriture par l'admin aal2 de la daara, dans son dossier, sous le nom imposé logo.<ext>.

-- Créé par migration pour exister à l'identique en local et en cloud. PNG, JPEG, WebP uniquement : pas de SVG
-- (un SVG peut contenir du script). 512 Ko maximum (contrôlés par l'API Storage).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 524288, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- Chemin accepté : <uuid de la daara>/logo.(png|jpg|webp). Le `case` garantit que le uuid n'est converti qu'après
-- contrôle du format (l'ordre d'évaluation d'un `and` n'est pas garanti).
create policy logos_lecture_admin on storage.objects for select to authenticated
    using (
        bucket_id = 'logos'
        and case
            when name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo\.(png|jpg|webp)$'
                then (select public.has_role(split_part(name, '/', 1)::uuid, array['admin']::public.role_membre[]))
            else false
        end
    );

create policy logos_depot_admin on storage.objects for insert to authenticated
    with check (
        bucket_id = 'logos'
        and case
            when name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo\.(png|jpg|webp)$'
                then (select public.has_role(split_part(name, '/', 1)::uuid, array['admin']::public.role_membre[]))
            else false
        end
    );

create policy logos_remplacement_admin on storage.objects for update to authenticated
    using (
        bucket_id = 'logos'
        and case
            when name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo\.(png|jpg|webp)$'
                then (select public.has_role(split_part(name, '/', 1)::uuid, array['admin']::public.role_membre[]))
            else false
        end
    )
    with check (
        bucket_id = 'logos'
        and case
            when name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo\.(png|jpg|webp)$'
                then (select public.has_role(split_part(name, '/', 1)::uuid, array['admin']::public.role_membre[]))
            else false
        end
    );

create policy logos_suppression_admin on storage.objects for delete to authenticated
    using (
        bucket_id = 'logos'
        and case
            when name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo\.(png|jpg|webp)$'
                then (select public.has_role(split_part(name, '/', 1)::uuid, array['admin']::public.role_membre[]))
            else false
        end
    );

-- Le chemin enregistré sur la daara suit la même règle que le Storage (au lieu de « n'importe quel fichier du dossier »).
alter table public.daaras drop constraint daaras_check; -- nom généré par Postgres (contrainte du socle sur id et logo_path)
alter table public.daaras add constraint daaras_logo_path_check
    check (logo_path ~ ('^' || id::text || '/logo\.(png|jpg|webp)$'));
