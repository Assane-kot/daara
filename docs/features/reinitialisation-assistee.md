# Feature : réinitialisation d'accès assistée (sprint 2 : S2.6, ADR-006 niveau 2)

## Objectif
Un membre sans e-mail utilisable (parent surtout) retrouve l'accès grâce à un code remis par l'admin de sa daara,
et choisit lui-même son nouveau mot de passe.

## Profils concernés et droits (lecture / écriture par rôle)
- Admin (`aal2`) : génère un code pour un membre actif **non admin** de sa daara.
- Membre : utilise le code sur `/auth/code-acces`.
- Enseignants : aucun pouvoir de réinitialisation.

## Données (tables, colonnes, contraintes)
`codes_acces` (LLD §3.2) ; RPC `creer_code_acces`, `consommer_code_acces` ; Edge Function `use-access-code` (LLD §6),
qui change le mot de passe par l'API d'administration (sessions révoquées, spike S2.0).

## Règles métier
- Code : 8 caractères sans 0 / O / 1 / l / I, usage unique, 24 h, haché ; un nouveau code annule le précédent.
- 5 essais puis code invalidé ; réponse toujours neutre (« Code invalide ou expiré »).
- Turnstile sur `/auth/code-acces`, vérifié par l'Edge Function.
- Effets : mot de passe changé, sessions révoquées, journal, e-mail de notification si le membre a une adresse.
- Le code ne contourne jamais la double authentification d'un compte qui en a une.
- Transmission : bouton WhatsApp (`wa.me`, numéro du profil, message traduit) ou de vive voix ; aucun envoi automatique.

## Écrans (liste, détail, formulaire) — composants Vristo de référence
- Fiche / ligne du membre : « Réinitialiser l'accès » → modale avec le code (affiché une fois, copiable), bouton
  WhatsApp, rappel des 24 h.
- `/auth/code-acces` (layout « cover ») : identifiant (e-mail ou téléphone), code, nouveau mot de passe + confirmation,
  Turnstile → succès → connexion.
États : chargement, erreur, 375 px, sombre, fr / en.

## Temps réel / notifications
Aucun.

## Cas de test (dont accès refusés inter-daara)
pgTAP : `creer_code_acces` (admin `aal2` OK ; cible admin refusée ; autre daara refusée ; enseignant refusé ; ancien
code annulé ; code haché) ; `consommer_code_acces` (service_role seulement ; 5 essais ; expiré ; usage unique).
Deno : validation, réponse neutre, contrôle Turnstile.
Manuel : parcours complet avec un compte téléphone (ADR-009), sessions révoquées sur un second navigateur.

## Réalisation (S2.6, 2026-10-09)
- Migration `codes_acces` ; `consommer_code_acces(p_identifiant, p_code)` prend l'identifiant (la base retrouve le
  compte) au lieu de `p_user` (LLD corrigé). Code `XXXX-XXXX` sur 32 symboles (A-Z sans I ni O, 2-9), saisie
  normalisée (minuscules, espaces, tiret acceptés).
- Décisions D1 (non admin dans aucune daara, ni super-admin) et D2 (risque résiduel accepté) : ADR-006, avec les
  conséquences acceptées (code unique par compte toutes daaras confondues, code invalidable par un tiers).
- Mot de passe : lettre ASCII exigée et 72 octets au plus (comme Auth), sinon un code serait consommé pour un mot de
  passe refusé ensuite. Haché des codes exclu de la sauvegarde nocturne.
- Écart : après le changement, l'écran invite à se connecter (pas de connexion automatique : aucun mot de passe gardé
  en mémoire, et le TOTP éventuel est demandé normalement).

## Hors périmètre
Envoi automatique du code par SMS / WhatsApp (offre payante, ADR-006 §5).
