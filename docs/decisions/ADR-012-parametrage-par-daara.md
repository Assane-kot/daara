# ADR-012 — Paramétrage par daara (et calcul des moyennes)

Statut : accepté (2026-10-15, demande du développeur : « chaque école a ses réalités »)

## Contexte
- Les daaras et écoles franco-arabes ne fonctionnent pas toutes pareil : poids d'une composition, absence à un devoir,
  arrondis, qui saisit les notes, délai de correction de l'appel, qui valide une justification…
- Figer ces règles dans le code obligerait chaque école à s'adapter à l'application ; tout rendre réglable sans cadre
  rendrait l'application compliquée (exigence « très, très facile à utiliser », `.claude/rules/ux.md`).

## Décision
1. **Toute règle qui varie d'une école à l'autre devient un réglage de la daara**, avec une **valeur par défaut** qui
   marche tout de suite : une daara qui ne touche à rien fonctionne.
2. **Rangés par module** dans Paramètres (Général, Modules, Absences, Notes, puis Bulletins, Coran) ; un onglet n'apparaît
   que si son module est actif ; l'admin seul (aal2) modifie, tous les membres actuels lisent (les écrans en ont besoin).
3. **Chaque réglage s'explique en une phrase et un exemple** (« Une composition compte 2 fois plus qu'un devoir »).
4. **Le profil d'onboarding pré-remplit** les réglages (« École franco-arabe », « Daara coranique »).
5. **En base, une table par module** (`reglages_absences`, `reglages_notes`…) : une ligne par daara, colonnes typées et
   contraintes (pas de JSON libre), créée avec les valeurs par défaut à la création de la daara (et pour les daaras
   existantes), journalisée. Listes propres à la daara (types d'évaluation) : tables dédiées.
6. **La base applique les réglages** (droits, fenêtres, calculs) : un réglage n'est jamais seulement un masquage d'écran.
7. **Changer un réglage de calcul recalcule** (les moyennes sont calculées, pas stockées) ; l'écran prévient avant
   (« les moyennes déjà visibles par les parents vont changer »). Les bulletins publiés (sprint 7) figent leurs valeurs.

## Calcul des moyennes (sprint 6)
- Note ramenée au barème de la daara : `valeur / bareme_evaluation × bareme_daara`.
- Élève absent à une évaluation (réglage) : ne compte pas (défaut) / compte 0 / compte 0 si l'absence du jour n'est pas
  justifiée (absences du sprint 5).
- Moyenne d'une matière sur une période : moyenne pondérée par le coefficient de chaque évaluation (défaut du type :
  devoir 1, composition 2, modifiables ; coefficient modifiable par évaluation).
- Moyenne générale (réglage) : pondérée par les coefficients des matières de la classe (défaut) ou simple. Une matière
  sans note comptée est ignorée.
- Arrondi (réglage) : au centième (défaut), au dixième, au quart ou au demi-point ; appliqué au résultat affiché.
- Calcul par une fonction SQL (security invoker) : chacun obtient les moyennes de ce qu'il a le droit de lire (le parent :
  notes publiées de son enfant). Tests pgTAP sur des cas chiffrés, un par réglage.

## Conséquences
+ Chaque école retrouve ses habitudes sans développement spécifique ; aucune configuration obligatoire.
+ Les règles sont vérifiées par la base (même via l'API).
− Plus de combinaisons à tester : chaque réglage de calcul a ses tests chiffrés.
− Un réglage changé en cours de période modifie des moyennes déjà vues : avertissement à l'écran ; figé au bulletin.
