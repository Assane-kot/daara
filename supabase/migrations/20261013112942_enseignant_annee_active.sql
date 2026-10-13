-- Décision du développeur (2026-10-13, audit de fin de sprint 4, ADR-010) : un enseignant ne lit la fiche et la photo
-- d'un élève que s'il est inscrit (statut « inscrit ») dans une de ses classes de l'année ACTIVE. Plus d'accès aux élèves
-- des années passées ni aux élèves partis. Les parents gardent l'accès à leur enfant sans limite de temps (tant que le lien
-- existe et que leur compte est actif). Les politiques et `photo_apprenant_lisible` appellent cette fonction : inchangées.

create or replace function public.enseigne_apprenant(p_apprenant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.inscriptions i
        join public.annees_scolaires an on an.id = i.annee_id and an.active
        join public.apprenants a on a.id = i.apprenant_id and a.statut = 'inscrit'
        where i.apprenant_id = p_apprenant and public.teaches_class(i.classe_id)
    );
$$;
