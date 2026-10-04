# Feature : paramètres de la daara (sprint 2 : S2.3)

## Objectif
L'admin met à jour les informations de sa daara : nom, ville, téléphone, logo, langue par défaut, barème.

## Profils concernés et droits (lecture / écriture par rôle)
- Admin (`aal2`) : lecture et modification (colonnes accordées au sprint 1 + `logo_path`), dépôt du logo.
- Autres membres : lecture (nom, logo) pour l'en-tête.

## Données (tables, colonnes, contraintes)
`daaras` (sprint 1). Migration : bucket Storage `logos` (public en lecture, 512 Ko, PNG / JPEG / WebP) et politiques
d'écriture sur `storage.objects` (premier segment = daara dont l'appelant est admin `aal2`, nom `logo.<ext>`).

## Règles métier
- Logo : contrôle du type et de la taille côté client et côté Storage ; pas de SVG ; nom imposé `logo.<ext>`
  (remplacement, pas d'accumulation) ; `logo_path` mis à jour après le dépôt.
- Slug et statut non modifiables (sprint 1).
- Changer la langue par défaut n'affecte pas la langue choisie par chaque utilisateur.

## Écrans (liste, détail, formulaire) — composants Vristo de référence
`/d/:slug/parametres`, onglet Général : formulaire (Vristo `forms`), aperçu du logo, bouton de dépôt avec
progression. Onglet Modules : voir `modules.md`.
États : chargement, erreur, succès (message), 375 px, sombre, fr / en.

## Temps réel / notifications
Aucun.

## Cas de test (dont accès refusés inter-daara)
pgTAP / Storage : admin `aal2` dépose dans son dossier ; refus pour un autre dossier, pour un enseignant, pour un
admin en `aal1`, pour un type ou une taille hors limites ; lecture publique du logo.
Unitaires : service (mise à jour, dépôt), formulaire (validation, erreurs traduites).

## Hors périmètre
Paramètres internes des modules (avec leur story) ; domaine personnalisé.
