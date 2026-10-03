# Feature : socle multi-tenant (sprint 1 : S1.1, S1.2, S1.3, S1.6 côté base)

## Objectif
Poser les tables du socle et prouver par les tests que chaque daara est isolée des autres, pour les 4 rôles.
Référence : LLD §3.2 (tables), §4 (droits, privilèges, `creer_daara`, triggers).

## Profils concernés et droits (lecture / écriture par rôle)
Voir LLD §4, « Socle (sprint 1) : politiques détaillées ». Résumé :
- membre : lit sa daara, ses propres memberships, son profil ;
- admin (`aal2` obligatoire) : modifie les colonnes autorisées de sa daara, lit tous les memberships, les profils
  de ses membres actifs et le journal d'audit ;
- enseignant : lit les memberships des enseignants de sa daara (pas ceux des parents ni des apprenants) ;
- super-admin (`aal2`) : lit toutes les daaras ;
- `anon` : aucun accès.

## Données (tables, colonnes, contraintes)
LLD §3.2 : `daaras`, `profiles`, `memberships`, `audit_log`, `platform_admins`, enum `role_membre`.

Migrations :
1. `securite_socle` : retrait des droits d'exécution (`public`, `anon`) et des droits de `anon` sur les tables,
   privilèges par défaut compris.
2. `socle_multi_tenant` : enum, tables, index, RLS et politiques, helpers, triggers (`handle_new_user`,
   `set_updated_at`, `audit_trigger`), `creer_daara`, droits par colonne.

## Règles métier
- Une daara est créée uniquement par `creer_daara` : session `aal2`, 3 daaras créées au plus par utilisateur ; le
  créateur devient admin dans la même transaction.
- Aucun membership n'est écrit directement par le client (sprint 2 : invitations, gestion des membres).
- Le rôle admin n'existe qu'en `aal2` ; les autres rôles du même utilisateur restent actifs en `aal1`.
- `statut` et `slug` d'une daara ne sont pas modifiables par l'admin.
- Toute modification de `daaras` et `memberships` est journalisée dans `audit_log`.
- Métadonnées d'inscription nettoyées par `handle_new_user` (trim, longueur, langue, caractères de contrôle,
  invisibles et bidirectionnels) ; les mêmes caractères sont refusés par contrainte en mise à jour directe.
- `logo_path` / `avatar_path` : `<id de la ligne>/<fichier>.<ext>` uniquement.
- Slugs réservés (segments de routes, `admin`, `api`…) refusés ; `creer_daara` renvoie `23514` pour toute donnée
  invalide.

## Écrans (liste, détail, formulaire) — composants Vristo de référence
Écran d'onboarding : voir `authentification.md`.

## Temps réel / notifications
Aucun.

## Cas de test (dont accès refusés inter-daara)
Garde-fous (`000_garde_fous`, étendus) :
- RLS activée et au moins une politique sur toute table de `public` (existant) ;
- vues de `public` avec `security_invoker = true`, aucune vue matérialisée dans `public` ;
- toute fonction de `public` avec `search_path = ''` ; aucune table étrangère ni extension dans `public` ;
- toute table de `public` a `daara_id uuid not null` + un index qui commence par `daara_id`, sauf la liste
  blanche `daaras`, `profiles`, `platform_admins` ; `daara_id` référence `daaras(id)` (sauf `audit_log`) ;
- `anon` n'a d'exécution sur aucune fonction de `public` et aucun droit sur les tables ;
- liste blanche des fonctions exécutables par `authenticated` ; aucune séquence utilisable par `anon` /
  `authenticated`.

Isolation (`001_socle_isolation`) — jeu : daaras A et B ; admin, enseignant, parent, apprenant de A ; admin de B ;
utilisateur sans daara ; super-admin. Sessions simulées (`request.jwt.claims` : `sub`, `role`, `aal`).
- `daaras` : chaque membre de A voit A et pas B ; l'utilisateur sans daara ne voit rien ; super-admin `aal2` voit
  tout, `aal1` rien ; admin A `aal2` modifie le nom de A, pas celui de B ; admin A `aal1` ne modifie rien ;
  modification de `statut` / `slug` refusée ; insertion directe refusée ; `anon` ne voit rien.
- `profiles` : chacun lit et modifie son profil ; admin A `aal2` lit les profils des membres de A, pas ceux de B ni
  de l'utilisateur sans daara ; enseignant A ne lit pas le profil du parent ; modification de l'`id` refusée.
- `memberships` : parent / apprenant ne voient que les leurs ; enseignant A voit les enseignants de A ; admin A
  `aal2` voit tous ceux de A ; aucun de B ; insertion, modification et suppression directes refusées pour tous.
- Admin désactivé (`aal2`) : aucun droit ; super-admin : ne lit que les daaras ; admin B ne modifie ni ne lit A ;
  colonnes protégées (`id`, `created_by`, `created_at`) non modifiables ; `audit_log` et `platform_admins` non
  modifiables ; contraintes de texte et de chemin (`23514`) ; `anon` refusé sur toutes les tables et helpers.
- `audit_log` : admin A `aal2` voit les lignes de A seulement ; enseignant et admin `aal1` ne voient rien ;
  insertion directe refusée ; la création d'une daara produit les lignes attendues (daara + membership).
- `platform_admins` : chacun ne voit que sa propre ligne.
- `creer_daara` : refusée sans utilisateur, en `aal1` et pour `anon` ; crée daara + membership admin ; 4e création
  refusée ; slug invalide, réservé ou déjà pris refusé ; langue / barème invalides → `23514` ; créateur
  immédiatement admin (`has_role` vrai en `aal2`).
- `handle_new_user` : profil créé, métadonnées trop longues tronquées, caractères interdits retirés, langue
  invalide → `fr`.
- `profiles` : l'admin ne lit plus le profil d'un membre désactivé.
- Helpers : `has_role` faux pour un membership `actif = false` ; vrai pour enseignant en `aal1` même s'il est
  aussi admin.

## Hors périmètre
`invitations`, `codes_acces`, `notifications`, gestion des membres, garde-fou du dernier admin (sprint 2) ;
suspension des daaras (sprint 11) ; logo (Storage, sprint 2).
