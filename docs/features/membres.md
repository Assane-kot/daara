# Feature : gestion des membres (sprint 2 : S2.4)

## Objectif
L'admin voit les membres de sa daara et les invitations en attente, change un rôle, désactive ou réactive un membre,
sans jamais laisser la daara sans admin.

## Profils concernés et droits (lecture / écriture par rôle)
- Admin (`aal2`) : liste, rôle, désactivation, réactivation (RPC).
- Enseignant : voit les enseignants (sprint 1), aucune action.
- Parent, apprenant : aucun accès à la liste.

## Données (tables, colonnes, contraintes)
`memberships` + colonne `nom_affiche` ; `audit_log.user_id` alimenté aussi par `daara.auteur` ; RPC `changer_role`,
`definir_actif` ; trigger `garder_un_admin` (LLD §3.2, §4).

## Règles métier
- Aucune écriture directe sur `memberships` (décision du sprint 1) : uniquement par RPC.
- Une daara garde toujours au moins un admin actif (changement de rôle, désactivation, y compris de soi-même).
- Désactiver : le membre perd tout accès immédiatement (RLS) ; son nom est figé dans `nom_affiche` ; ses données
  restent.
- Promouvoir admin : le membre devra activer la double authentification à sa prochaine connexion (ADR-006).
- Toute action est journalisée avec son auteur.

## Écrans (liste, détail, formulaire) — composants Vristo de référence
`/d/:slug/membres` : onglets « Membres » et « Invitations » ; tableau (Vristo `datatables`, simple au sprint 2 :
recherche locale, pas encore le composant `data-table` du sprint 3) ; badges de rôle et d'état ; actions dans un menu
par ligne ; confirmation (`ConfirmDialogService`) avant désactivation et changement de rôle admin.
Cartes à la place du tableau en 375 px. États : chargement, erreur, vide (« Invitez votre premier membre »).

## Temps réel / notifications
Aucun.

## Cas de test (dont accès refusés inter-daara)
pgTAP : `changer_role` / `definir_actif` par admin `aal2` OK ; refus pour admin `aal1`, enseignant, admin d'une autre
daara ; dernier admin protégé (rôle et désactivation) ; `nom_affiche` figé ; auteur tracé dans `audit_log`.
Unitaires : service, liste (filtres, actions selon le rôle), confirmations.

## Hors périmètre
Rattachement parent ↔ enfant et comptes apprenants (sprint 4) ; suppression définitive d'un compte (sprint 12, CDP).
