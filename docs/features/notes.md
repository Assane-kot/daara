# Feature : évaluations, notes et moyennes (sprint 6 : S6.1 à S6.5) — et réglages par daara (ADR-012)

## Objectif
L'admin règle le fonctionnement des notes de sa daara (ou garde les valeurs par défaut) ; l'enseignant crée ses
évaluations, saisit les notes au clavier sur un seul écran, les publie ; les moyennes sont calculées par la base selon
les réglages ; le parent voit les notes publiées et les moyennes provisoires de son enfant. Module `notes` (prérequis
`structure`). S6.1b : réglages des absences. Ergonomie : `.claude/rules/ux.md`.

## Profils concernés et droits (lecture / écriture par rôle)
| Profil | Réglages | Évaluations | Notes |
|---|---|---|---|
| Admin (aal2) | L E | L E S, publie | L E S |
| Enseignant | L | L (classes enseignées, année active) ; E S et publie pour les matières qu'il enseigne dans la classe (+ toutes les matières de sa classe s'il est titulaire et que le réglage l'autorise) | mêmes règles ; période non clôturée |
| Parent (actuel) | L | L publiées (ou toutes si « dès la saisie ») des classes de ses enfants | L de ses enfants, mêmes conditions |
| Apprenant | — (sprint 9) | — | — |
Autre daara : rien. Module `notes` inactif : rien (données conservées).

## Données (tables, colonnes, contraintes)
LLD §3.5 : `reglages_notes`, `types_evaluation`, `evaluations`, `notes`, `reglages_absences` ; fonctions `moyennes`,
`arrondir_note`, `publier_evaluation` ; type de notification `notes_publiees`.

## Règles métier
- Réglages (valeurs par défaut) : barème de la daara 20 (existant) ; types d'évaluation Devoir (1) et Composition (2),
  modifiables ; élève absent : ne compte pas ; moyenne générale pondérée ; arrondi au centième ; seuil de réussite =
  moitié du barème ; le titulaire ne saisit pas les autres matières ; parents : notes après publication, moyennes
  visibles ; appréciations activées.
- Évaluation : classe + matière de la classe + période de l'année active (non clôturée), type, intitulé proposé (« Devoir
  1 », numéroté), date dans la période (aujourd'hui par défaut), barème (celui de la daara par défaut), coefficient (celui
  du type par défaut). Supprimable tant qu'elle n'est pas publiée ou qu'elle n'a pas de notes.
- Note : de 0 au barème de l'évaluation, par demi-point au plus fin (0,25 accepté) ; ou « Absent » ; appréciation de 200
  caractères au plus si le réglage l'active. Période clôturée : notes et évaluations en lecture seule.
- Publication : rend l'évaluation visible des parents (réglage « après publication ») et les prévient (notification
  `notes_publiees`) ; une note corrigée après publication reste visible corrigée (pas de nouvelle notification).
- Moyennes : ADR-012 ; calculées à la demande (jamais stockées) ; rang et bulletins : sprint 7.

## Écrans (liste, détail, formulaire) — composants Vristo de référence
- Paramètres → **Notes** (module actif) : barème, types d'évaluation (liste avec coefficient, ajout, renommage), absent,
  moyenne générale, arrondi, seuil, titulaire, visibilité parents, appréciations ; une phrase d'exemple par réglage ;
  avertissement si un réglage de calcul change.
- Paramètres → **Absences** (S6.1b) : appel (une fois / matin et après-midi), délai de correction de l'enseignant (0 à 30
  jours, défaut 7), qui décide d'une justification (admin + titulaire / admin seul), justification par les parents (oui /
  non).
- `/d/:slug/notes` (enseignant, admin ; menu « Notes ») : choix de la classe puis de la matière (les siennes) et de la
  période (en cours par défaut) → évaluations (état : à saisir / saisie / publiée), « Nouvelle évaluation ».
- `/d/:slug/notes/evaluations/:id` : saisie : tous les élèves sur un écran, champ numérique (`inputmode="decimal"`),
  Entrée → élève suivant, enregistrement automatique à la sortie du champ (indicateur « Enregistré »), bouton « Absent »,
  appréciation repliée ; « Publier les notes » (résumé : n notes, n absents, n non saisies).
- `/d/:slug/notes/moyennes?classe=&periode=` : tableau élèves × matières + moyenne générale, sous le seuil en rouge.
- Parent : page de l'enfant → « Notes » (par matière : évaluations publiées, notes, appréciations, moyenne provisoire si
  le réglage l'autorise ; moyenne générale).
États : chargement, erreur, vide avec action, 375 px, sombre, fr / en. Mise à jour automatique (signaux S5.0b).

## Temps réel / notifications
Signaux « table modifiée » pour `evaluations`, `notes`, `reglages_notes`, `types_evaluation`, `reglages_absences` ;
notification `notes_publiees` aux parents actuels des élèves de la classe à la publication.

## Cas de test (dont accès refusés inter-daara)
pgTAP : réglages créés pour chaque daara, modifiables par l'admin seul ; enseignant : saisie de sa matière, pas d'une
autre ; titulaire selon le réglage ; année inactive et période clôturée refusées ; note hors barème refusée ; parent :
notes publiées seulement (et dès la saisie selon le réglage), moyennes masquées selon le réglage ; autre daara ; module
désactivé ; journal sans valeurs ; **moyennes chiffrées** : barèmes différents, coefficients, absent (3 réglages),
pondérée / simple, 4 arrondis, matière sans note. Unitaires : services, grille de saisie (clavier, enregistrement),
réglages, page parent.

## Hors périmètre
Rang, appréciation générale, bulletins PDF (sprint 7) ; notes des apprenants eux-mêmes (sprint 9) ; import de notes.
