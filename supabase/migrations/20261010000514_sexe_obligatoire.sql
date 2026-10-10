-- Sexe de l'élève obligatoire : Garçon ou Fille seulement, jamais « non précisé » (décision du développeur,
-- 2026-10-10 ; ADR-010 mis à jour). Aucune donnée réelle n'existe encore (sprint 4 non déployé).
alter table public.apprenants alter column sexe set not null;
