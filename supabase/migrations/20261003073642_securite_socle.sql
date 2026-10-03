-- Sécurité du schéma public (audit du sprint 0, LLD §4 « Privilèges »).
-- À appliquer AVANT toute table ou fonction métier.
--
-- Supabase accorde par défaut à `anon` et `authenticated` tous les droits sur les tables, séquences et fonctions
-- créées par `postgres` dans `public`. La RLS protège les lignes, mais :
--   - `anon` n'a aucun usage légitime dans DAARA (aucune politique ne le vise) → on lui retire tout ;
--   - TRUNCATE, REFERENCES, TRIGGER et MAINTAIN ne sont pas soumis à la RLS → retirés à `authenticated` ;
--   - les séquences n'ont pas de RLS (setval casserait les identités) → retirées à `authenticated` ; les colonnes
--     identity sont alimentées sans contrôle de droit sur la séquence.
--
-- Fonctions : l'exécution par PUBLIC est un défaut global de Postgres. Seul un privilège par défaut global (sans
-- `in schema`) le retire pour les fonctions futures ; chaque fonction appelable reçoit un `grant execute ... to
-- authenticated` explicite. Le garde-fou `000_garde_fous` tient la liste blanche de ces fonctions.
-- Les extensions s'installent dans le schéma `extensions`, jamais dans `public` (vérifié par le garde-fou).

-- Objets existants
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon;
revoke truncate, references, trigger, maintain on all tables in schema public from authenticated;

-- Objets futurs créés par postgres (migrations)
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon;
alter default privileges for role postgres in schema public
    revoke truncate, references, trigger, maintain on tables from authenticated;
