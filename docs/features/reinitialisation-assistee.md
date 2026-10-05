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

## Hors périmètre
Envoi automatique du code par SMS / WhatsApp (offre payante, ADR-006 §5).
