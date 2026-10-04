# Feature : modules activables par daara (sprint 2, ADR-008)

## Objectif
Chaque daara n'active que les modules qu'elle utilise (structure scolaire, absences, notes, bulletins, Coran…).
Un module désactivé disparaît des menus, des routes et des tableaux de bord de tous les membres, et la base refuse
son usage ; ses données sont conservées.

## Profils concernés et droits (lecture / écriture par rôle)
- Admin (`aal2`) : lit et modifie les modules de sa daara (`definir_modules`).
- Enseignant, parent, apprenant : lisent les modules actifs de leur daara (pour leur menu), ne les modifient pas.
- Super-admin : lit les modules de toutes les daaras (support) ; plafond des offres au sprint 11.
- `anon` : aucun accès.

## Données (tables, colonnes, contraintes)
LLD §3.2 et §4 : enum `module_daara`, table `daara_modules`, helper `module_actif`, RPC `definir_modules`,
paramètre `p_modules` de `creer_daara`. Migration de reprise : tous les modules actifs pour les daaras existantes.

## Règles métier
- Dépendances (ADR-008) : `absences` et `notes` requièrent `structure` ; `bulletins` requiert `notes` ;
  `coran_recitations` et `coran_nafar` requièrent `coran_cahier`.
- Activer un module active ses prérequis ; désactiver un prérequis d'un module actif est refusé.
- Désactivation : données conservées, réactivation sans perte.
- Profils à l'onboarding : « Daara coranique » (coran_cahier, coran_recitations, coran_nafar, absences, structure,
  notifications), « École franco-arabe » (tous), « Personnalisé » (cases à cocher).
- Toute modification journalisée.

## Écrans (liste, détail, formulaire) — composants Vristo de référence
- Paramètres → Modules (admin) : une carte par module (nom, description, prérequis), interrupteur ; confirmation
  avant désactivation (`ConfirmDialogService`) rappelant que les données sont conservées. Vristo : switches de
  `forms/switches`.
- Onboarding, étape 2 : choix du profil (3 cartes) avant les informations de la daara ; « Personnalisé » ouvre les
  cases à cocher.
- Menus et routes : chaque entrée déclare son module ; `moduleGuard` renvoie au tableau de bord avec un message si
  le module est désactivé.
États : chargement, erreur, mode sombre, 375 px, fr / en.

## Temps réel / notifications
Aucun en V1 : les modules sont relus à l'ouverture de la daara et après `definir_modules`.

## Cas de test (dont accès refusés inter-daara)
pgTAP :
- `definir_modules` : admin `aal2` OK ; admin `aal1`, enseignant, parent, admin d'une autre daara refusés ;
  prérequis ajoutés automatiquement ; désactivation d'un prérequis d'un module actif refusée ; journalisation.
- `module_actif` : vrai / faux selon la daara ; faux pour un module d'une autre daara.
- `daara_modules` : lecture limitée aux membres de la daara ; aucune écriture directe.
- `creer_daara` avec `p_modules` : profil appliqué, dépendances fermées, module inconnu refusé.
- Gabarit pour chaque story de module : table du module illisible et non modifiable quand le module est désactivé,
  y compris par l'admin ; données retrouvées après réactivation.
Unitaires : `moduleGuard`, filtrage du menu, écran Modules (dépendances, confirmation), profils de l'onboarding.

## Hors périmètre
Plafond par offre et facturation (sprint 11) ; réglages internes de chaque module (avec leur story).
