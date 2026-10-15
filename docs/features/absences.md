# Feature : absences et espace parent (sprint 5 : S5.1, S5.2, S5.4)

## Objectif
L'enseignant fait l'appel de sa classe sur son téléphone en moins de 30 secondes ; le parent est prévenu dans
l'application (S5.3, `notifications.md`), voit « Présent aujourd'hui » ou l'absence, et la justifie en 2 appuis ;
l'admin (ou l'enseignant titulaire) valide la justification ; l'admin suit les appels et les statistiques simples.
Module `absences` (prérequis `structure`, ADR-008). Ergonomie : `.claude/rules/ux.md`.

## Profils concernés et droits (lecture / écriture par rôle)
| Profil | Appels | Absences | Justification |
|---|---|---|---|
| Admin (aal2) | L E S (toutes les classes, toute date de l'année active) | L E S | décide (justifiée / non justifiée) |
| Enseignant | L E (ses classes `teaches_class`, année active, aujourd'hui et 7 jours en arrière) | L E S (mêmes limites) | décide s'il est **titulaire** de la classe |
| Parent | L (appels des classes de ses enfants : « Présent aujourd'hui ») | L (ses enfants, sans limite de temps, ADR-010 §8) | envoie un motif tant que ce n'est pas décidé |
| Apprenant | — (comptes au sprint 9) | — | — |
Autre daara : rien. Module `absences` inactif : rien, même pour l'admin (données conservées).

## Données (tables, colonnes, contraintes)
Voir LLD §3.5 : réglage `daaras.appel_demi_journee`, enums `creneau_appel`, `type_absence`, `etat_justification`,
tables `appels` et `absences` (journal sans valeurs, ADR-010), RPC `terminer_appel`, `justifier_absence`,
`decider_justification`, `statistiques_absences`.

## Règles métier
- **Présent par défaut** : seules les absences et les retards sont enregistrés ; l'appel (`appels`) dit que la classe a
  été appelée (« Présent aujourd'hui » n'est affiché que si l'appel est terminé).
- **Créneau** : un appel par jour (`journee`) ; si la daara active « Appel matin et après-midi », deux appels (`matin`,
  `apres_midi`). Un appel par classe, date et créneau.
- **Élèves appelés** : inscrits (statut `inscrit`) dans la classe pour l'année de l'appel ; date dans l'année active, pas
  dans le futur.
- **Enseignant** : aujourd'hui et jusqu'à 7 jours en arrière ; au-delà, seul l'admin corrige.
- **Fin de l'appel** (`terminer_appel`) : l'appel passe à « terminé », les parents des absents / retardataires sont
  prévenus ; toute correction ensuite prévient aussi (ADR-011). Un appel terminé peut être corrigé (mêmes limites).
- **Justification** : le parent écrit un motif court (300 caractères au plus, texte sûr) → état « envoyée » ; l'admin
  ou le titulaire de la classe décide « justifiée » ou « non justifiée » (le parent est prévenu) ; après décision, le
  parent ne modifie plus le motif. L'admin peut aussi marquer justifiée sans motif (mot du parent sur papier).
- **Statistiques** : par classe et par période (ou dates) : nombre d'absences et de retards, taux d'absence
  (absences / (élèves × appels terminés)), élèves les plus absents, absences non justifiées.

## Écrans (liste, détail, formulaire) — composants Vristo de référence
- `/d/:slug/appel` (enseignant, admin ; menu « Appel ») : classes du jour (ses classes ; toutes pour l'admin) avec
  l'état « À faire / Fait » ; sélecteur de date (aujourd'hui par défaut) et de créneau si demi-journées.
- `/d/:slug/appel/:classeId` : liste des élèves (photo, prénom nom), présent par défaut, un appui → « Absent », un
  second → « En retard », un troisième → présent ; gros boutons (≥ 44 px), compteurs en haut ; « Terminer l'appel »
  annonce ce qui sera envoyé (« 3 absents, 1 retard : les parents seront prévenus ») ; enregistrement à chaque appui
  (rien à perdre).
- `/d/:slug/absences` (admin ; titulaire : ses classes) : appels non faits aujourd'hui en tête, liste filtrable (dates,
  classe, type, justification), « À décider » (justifications envoyées), statistiques simples ; temps réel.
- Fiche élève : onglet / section « Absences » (historique, état de la justification).
- Parent (S5.4) : accueil = « Mes enfants » (le tableau de bord le redirige ; pas d'entrée « Tableau de bord » pour lui) :
  par enfant, situation du jour (présent / absent / en retard, avec le créneau, d'après les appels terminés ; « l'appel
  d'aujourd'hui n'est pas encore fait » sinon), absences à justifier des 30 derniers jours avec « Justifier », lien vers
  toutes ses absences.
- Paramètres → Général : « Appel : une fois par jour / matin et après-midi » (module `absences` actif).
États : chargement, erreur, vide avec action, 375 px, sombre, fr / en.

## Temps réel / notifications
Voir `notifications.md` et ADR-011 : liste de l'admin en temps réel (`absences`), notifications aux parents à la fin de
l'appel.

## Cas de test (dont accès refusés inter-daara)
pgTAP : admin L E S ; enseignant : ses classes seulement, pas une autre classe, pas au-delà de 7 jours, pas une année
inactive ; parent : ses enfants seulement (L), motif sur son enfant seulement, plus après décision ; titulaire décide,
un autre enseignant non ; élève non inscrit / parti refusé ; date future refusée ; créneau incohérent avec le réglage
refusé ; module désactivé ; autre daara invisible ; journal sans valeurs ; notifications créées à la fin de l'appel
seulement, aux parents actuels seulement. Unitaires : services, écran d'appel (cycle des appuis, compteurs), accueil
parent. E2E (S5.5) : appel → notification au parent en temps réel → justification → décision.

## Hors périmètre
Notifications hors application (sprint 8) ; absences des enseignants ; pièces jointes (certificats) ; appel par matière
ou par heure (à revoir avec les pilotes).
