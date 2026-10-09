# Feature : structure scolaire (sprint 3 : S3.1 à S3.4, module `structure`)

## Objectif
L'admin configure son année complète : année scolaire active, périodes (trimestres ou semestres), catalogue des matières,
classes avec leur titulaire, matières enseignées par classe (coefficient, enseignant). Base des absences (sprint 5), des
notes (sprint 6) et des bulletins (sprint 7).

## Profils concernés et droits (lecture / écriture par rôle)
Toutes les tables sont du module `structure` (ADR-008) : module désactivé → aucune lecture ni écriture, admin compris.
| Table | Admin (aal2) | Enseignant | Parent | Apprenant |
|---|---|---|---|---|
| `annees_scolaires`, `periodes`, `matieres` | L E S | L | L | L |
| `classes`, `classe_matieres` | L E S | L (toute la daara) | — (sprint 4 : classes de ses enfants) | — (sprint 4 : sa classe) |
Écritures directes sous RLS (admin `aal2` + module actif), sauf l'année active (RPC `activer_annee`).
Noms des enseignants (titulaire, enseignant d'une matière) : RPC `enseignants_daara` (admin et enseignant).

## Données (tables, colonnes, contraintes)
Détail : LLD §3.3 (colonnes, contraintes, triggers) et §4 (politiques, RPC, helpers). En bref :
- `annees_scolaires` : libellé unique par daara, dates (fin après début, 18 mois au plus), une seule active ;
- `periodes` : ordre unique par année, dates dans l'année, sans chevauchement, `cloturee` (réouverture possible) ;
- `matieres` : catalogue de la daara (pas par année), code unique, type `scolaire` / `coran` / `religieux`, archivage ;
- `classes` : par année, nom unique dans l'année, niveau en texte libre, titulaire = enseignant actif de la daara ;
- `classe_matieres` : matière enseignée dans une classe, coefficient (0,5 à 20), enseignant actif de la daara ou aucun.
Cohérence : toute référence (année, classe, matière) appartient à la même daara (trigger `meme_daara`).

## Règles métier
- Une seule année active par daara : `activer_annee` bascule atomiquement (l'ancienne devient inactive).
- Modèles de périodes en un clic : « 3 trimestres » ou « 2 semestres » (dates proposées à partir des dates de l'année,
  modifiables) ; saisie libre aussi.
- Période clôturée : notes verrouillées (sprint 6), dates, ordre et libellé figés, suppression refusée ; l'admin peut
  la rouvrir (journalisé).
- Matière utilisée dans une classe : suppression refusée, archivage proposé (masquée des nouveaux choix).
- Suppression d'une année : refusée si elle est active ; supprime ses périodes, classes et affectations (tant qu'aucune
  donnée des sprints suivants n'y est rattachée : clés étrangères `restrict` à partir du sprint 4).
- Titulaire et enseignants : membres **actifs** avec le rôle `enseignant` (ou `admin`) de la daara. Un enseignant
  désactivé reste affiché (historique) mais perd ses droits (`teaches_class` exige un membre actif).
- `teaches_class(classe_id)` : enseignant actif, titulaire de la classe ou affecté à une de ses matières (servira aux
  absences et aux notes).
- Journal (`audit_trigger`) sur les 5 tables.
- Niveau : texte libre (≤ 50) avec suggestions (CI, CP, CE1, CE2, CM1, CM2, 6e… ; niveaux coraniques).

## Écrans (liste, détail, formulaire) — composants Vristo de référence
`/d/:slug/structure` (module `structure`, admin et enseignant ; enseignant en lecture seule) :
- **Années** (admin) : liste, création / modification (modale), « Rendre active », périodes de l'année (modèles,
  ajout, modification, clôture / réouverture avec confirmation) ;
- **Matières** : liste (`data-table`), création / modification (modale), archivage ;
- **Classes** : sélecteur d'année (active par défaut), liste (`data-table` : nom, niveau, titulaire, nombre de
  matières), détail d'une classe : informations, matières (coefficient, enseignant), ajout / retrait.
`app-data-table` (S3.4) : pagination, tri et recherche côté serveur (debounce), tableau au-delà de 640 px et cartes en
dessous, états chargement / vide / erreur ; appliqué aussi à la liste des membres (recherche serveur sans accents).
États : chargement, erreur, vide, 375 px, sombre, fr / en. Menu « Structure » (module `structure`).

## Temps réel / notifications
Aucun.

## Cas de test (dont accès refusés inter-daara)
pgTAP par table : admin aal2 L E S ; admin aal1 refusé ; enseignant L seul (classes comprises) ; parent / apprenant :
années, périodes, matières en lecture, classes et affectations invisibles ; autre daara invisible et non modifiable ;
module désactivé → tout refusé, admin compris, données retrouvées après réactivation ; `daara_id` immuable ; références
d'une autre daara refusées (année, classe, matière, titulaire, enseignant) ; une seule année active ; périodes hors année
ou chevauchantes refusées ; matière utilisée non supprimable ; `teaches_class` (titulaire, affecté, désactivé, autre
daara) ; `enseignants_daara` (parent refusé, autre daara refusée).
Unitaires : services, formulaires (dates, coefficients), `data-table` (pagination, tri, recherche, cartes).

## Hors périmètre
Inscriptions des apprenants dans les classes (sprint 4) ; emploi du temps ; copie de l'année précédente (« Préparer la
rentrée », reportée avant la deuxième année des pilotes) ; salles.
