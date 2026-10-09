# Feature : apprenants et parents (sprint 4 : S4.1 à S4.6)

## Objectif
L'admin crée les fiches des élèves (une par une ou par import), les inscrit dans les classes de l'année et les relie à
leurs parents (invitation depuis la fiche). Le parent voit ses enfants et leur classe. Livrable : une classe remplie
avec ses parents invités. Ergonomie : `.claude/rules/ux.md` (« Enregistrer et ajouter un autre », import, démarrage
guidé).

## Profils concernés et droits (lecture / écriture par rôle)
| Table | Admin (aal2) | Enseignant | Parent | Apprenant |
|---|---|---|---|---|
| `apprenants` | L E S | L (élèves de ses classes) | L (ses enfants) | — (sprint 9) |
| `inscriptions` (module `structure`) | L E S | L (ses classes) | L (ses enfants) | — |
| `parent_links` | L E S | — | L (les siens) | — |
| `classes` (ajout) | — | — | L (classes de ses enfants) | — |
| Photos (bucket `photos`) | L E S | L (ses élèves) | L (ses enfants) | — |

## Données (tables, colonnes, contraintes)
Détail : LLD §3.4, §4, §5 ; ADR-010 (minimisation, journal sans valeurs, photo privée).

## Règles métier
- Matricule `AAAA-NNNN` généré par la base, unique par daara, non modifiable.
- Statut `inscrit` / `parti` (un élève parti reste dans l'historique, n'est plus proposé à l'inscription).
- Inscription : une classe par élève et par année ; changer de classe dans l'année = modifier l'inscription ; une classe
  qui a des inscrits ne se supprime pas.
- Lien parent : `pere` / `mere` / `tuteur` ; le parent est un membre actif `parent` de la daara ; plusieurs parents
  par enfant, plusieurs enfants par parent.
- Invitation d'un parent depuis la fiche : l'invitation porte l'enfant et le lien ; le lien est créé à l'acceptation.
  Parent déjà membre : simple choix dans la liste, sans invitation.
- Import CSV : modèle téléchargeable (nom, prénom, date de naissance, sexe, classe), analyse dans le navigateur,
  rapport ligne par ligne, 500 lignes au plus, tout ou rien (RPC `importer_apprenants`).

## Écrans (liste, détail, formulaire) — composants Vristo de référence
- `/d/:slug/apprenants` (admin, enseignant en lecture) : `data-table` (recherche nom / prénom / matricule sans accents,
  filtres classe et statut), « Ajouter un élève », « Importer ».
- Fiche `/d/:slug/apprenants/:id` : identité, photo, classe de l'année, parents (ajouter un parent existant, inviter).
- Formulaire élève (modale) : nom, prénom, date de naissance, sexe, classe ; « Enregistrer et ajouter un autre ».
- Classe (détail, S3.3) : onglet / liste des élèves inscrits, « Inscrire des élèves ».
- Import `/d/:slug/apprenants/import` : étape fichier → aperçu et erreurs → confirmation.
- Parent : « Mes enfants » (`/d/:slug/enfants`) : cartes enfant (photo, classe), barre basse mobile.
- S4.5 : « Démarrage guidé » de l'admin sur le tableau de bord. S4.6 : revue ergonomique des écrans des sprints 1 à 3.
États : chargement, erreur, vide (avec action), 375 px, sombre, fr / en.

## Temps réel / notifications
Aucun (sprint 5).

## Cas de test (dont accès refusés inter-daara)
pgTAP : admin L E S ; enseignant : élèves de ses classes seulement (pas ceux d'une autre classe) ; parent : ses enfants
seulement (pas les autres, pas leurs photos) ; autre daara invisible ; matricule généré et non modifiable ; journal
sans valeurs ; inscription unique par année, classe d'une autre daara refusée ; lien vers un non-parent refusé ;
acceptation d'invitation qui crée le lien ; import : tout ou rien, 500 lignes, données invalides signalées.
Unitaires : services, formulaires (saisie en série), analyse CSV, démarrage guidé.

## Hors périmètre
Comptes apprenants (sprint 9) ; transferts entre daaras ; documents d'inscription ; frais de scolarité.
