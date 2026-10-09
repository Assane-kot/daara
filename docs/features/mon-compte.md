# Feature : mon compte et sécurité (sprint 2 : S2.7)

## Objectif
Chaque utilisateur gère son profil, sa langue et son mot de passe ; les admins enregistrent un second appareil TOTP.
Les modèles d'e-mail restants passent au code seul ; la procédure de retrait d'un facteur est documentée.

## Profils concernés et droits (lecture / écriture par rôle)
Tout utilisateur connecté, sur son propre compte uniquement (`profiles_update_soi`, API Auth).

## Données (tables, colonnes, contraintes)
`profiles` (sprint 1), facteurs TOTP de Supabase Auth. Modèles `supabase/templates/` : `magic_link`, `email_change`,
`reauthentication`, `invite` (code seul, bilingues, uniquement `{{ .Token }}` et `{{ .Data.langue }}`).

## Règles métier
- Profil : nom, prénom, téléphone, langue (contraintes du socle).
- Mot de passe : règle ADR-006 ; `secure_password_change` peut exiger une réauthentification (code par e-mail) ;
  compte téléphone sans e-mail : changement après connexion récente, sinon code de l'admin.
- Appareils TOTP : liste, ajout d'un second appareil (enrôlement), retrait en `aal2` ; un admin garde au moins un
  appareil.
- Codes de secours : non proposés (expérimentaux dans Supabase), à revoir au sprint 12.
- Perte de tous les appareils d'un admin : procédure super-admin (`docs/exploitation.md`) : vérification d'identité
  hors ligne, retrait du facteur en SQL par le développeur, révocation des sessions, ligne de journal.

## Écrans (liste, détail, formulaire) — composants Vristo de référence
`/d/:slug/compte` : onglets Profil, Mot de passe, Sécurité (appareils TOTP, ajout avec le panneau d'enrôlement du
sprint 1). Accès par le menu du compte du header. États : chargement, erreur, succès, 375 px, sombre, fr / en.

## Temps réel / notifications
Aucun.

## Cas de test (dont accès refusés inter-daara)
pgTAP : un utilisateur ne modifie que son profil (sprint 1, déjà couvert).
Unitaires : service du compte, ajout / retrait d'appareil (dernier appareil d'un admin protégé), formulaire du profil.
Manuel : second appareil, connexion avec l'un puis l'autre ; e-mails des nouveaux modèles dans Mailpit.

## Réalisation (S2.7, 2026-10-09)
- Décisions (validées) : D1 fonction SQL `retirer_facteurs` pour la procédure super-admin ; D2 mot de passe : code de
  réauthentification par e-mail (`secure_password_change`), reconnexion pour un compte téléphone.
- Profil modifiable seulement avec une session suffisante (aal2 si facteur vérifié) ; la langue est aussi copiée dans les
  métadonnées Auth (langue des e-mails). Retirer un appareil ferme les autres sessions (`signOut({ scope: 'others' })`).
- Connexion : le code TOTP est essayé sur chaque appareil vérifié (sinon seul le premier était accepté).
- Membre désactivé de toutes ses daaras : message « accès désactivé » sur l'onboarding.
- Écart : Mon compte n'est accessible que depuis une daara active (`/d/:slug/compte`) → « Problèmes ouverts ».

## Hors périmètre
Suppression du compte par l'utilisateur (sprint 12, CDP) ; codes de secours.
