# ADR-009 — Identifiant des comptes sans e-mail

Statut : **acceptée** (2026-10-05), avec l'alternative issue du spike S2.0 · Remplace la « décision OTP téléphone » prévue
au sprint 2 (ADR-006 §1)

## Contexte
- Beaucoup de parents n'ont pas d'adresse e-mail utilisable, mais ont tous un téléphone et WhatsApp.
- L'OTP par SMS ou par WhatsApp est payant (fournisseur), exclu par l'ADR-003 tant que l'offre est gratuite.
- La récupération d'accès sans e-mail existe déjà : codes remis par l'admin (ADR-006 niveau 2).

## Décision proposée
- **Identifiant = numéro de téléphone (format E.164) + mot de passe**, sans aucun SMS.
- Le compte n'est **jamais créé librement** : uniquement à l'acceptation d'une invitation **par téléphone**
  (Edge Function `accept-invitation`, `auth.admin.createUser` avec téléphone confirmé). Le lien d'invitation est
  envoyé par l'admin sur WhatsApp au numéro saisi : son ouverture vaut preuve raisonnable de détention du numéro.
- Inscription libre par téléphone **désactivée** ; connexion par téléphone + mot de passe **activée**.
- Mot de passe oublié : niveau 2 (code de l'admin). Pas de niveau 1 sans e-mail.
- Un parent qui a aussi un e-mail peut être invité par e-mail : même parcours que les autres comptes.
- Écran de connexion : un seul champ « E-mail ou téléphone » ; le front reconnaît un numéro et le normalise
  (`+221` par défaut pour un numéro à 9 chiffres).

## À vérifier par le spike S2.0 (Supabase Auth local, version des projets cloud)
1. `auth.admin.createUser({ phone, password, phone_confirm: true })` sans fournisseur SMS configuré.
2. `signInWithPassword({ phone, password })` avec l'inscription par téléphone désactivée et sans fournisseur SMS.
3. Comportement de Turnstile et des limites de débit sur la connexion par téléphone.
4. Effet de `auth.admin.updateUserById(..., { password })` et de la révocation des sessions (ADR-006 niveau 2).

Si le point 1 ou 2 échoue (fournisseur SMS exigé même inutilisé) : alternative à présenter au développeur avant
toute implémentation (par exemple identifiant de connexion interne associé au numéro, résolu par une Edge Function).

## Résultats du spike S2.0 (2026-10-04, Supabase local, Auth 2.197)
| Point | Résultat |
|---|---|
| 1. `createUser(phone, password, phone_confirm)` sans fournisseur SMS | **OK** ; profil créé par `handle_new_user` ; téléphone stocké **sans « + »** (`221770009901`), e-mail vide |
| 2. `signInWithPassword(phone)` sans fournisseur SMS | **Échec** : `phone_provider_disabled`. La CLI (et Supabase) n'active le fournisseur téléphone (`GOTRUE_EXTERNAL_PHONE_ENABLED`) que si un fournisseur SMS est configuré |
| 2 bis. Avec un fournisseur SMS **déclaré mais factice** (identifiants Twilio fictifs) | **OK** : connexion avec `+221…`, `221…` ou avec espaces ; aucun SMS possible |
| 3. Turnstile, mauvais mot de passe | jeton exigé (`captcha_failed`) ; `invalid_credentials` neutre |
| 3 bis. Inscription libre par téléphone (fournisseur factice) | échoue à l'envoi du SMS (`sms_send_failed`), **aucun compte créé** (pas de squat de numéro), mais Supabase appelle réellement l'API Twilio avec les identifiants fictifs |
| 3 ter. Hook `before_user_created` | appelé pour **toutes les inscriptions publiques** (payload : `provider` `phone` ou `email`, téléphone) et **pas** pour `auth.admin.createUser` : il peut refuser toute inscription libre par téléphone avant la moindre tentative de SMS |
| 4. `updateUserById(password)` | OK ; **les jetons de rafraîchissement existants sont révoqués** (ancienne session refusée) : pas besoin de RPC `revoquer_sessions` dédiée ; les jetons d'accès déjà émis restent valides jusqu'à leur expiration |

## Décision retenue (alternative validée le 2026-10-05)
- Déclarer un **fournisseur SMS factice** (identifiants fictifs, jamais d'envoi), seule façon d'activer la connexion
  par téléphone ;
- **hook `before_user_created`** (fonction Postgres versionnée par migration) : refuse toute inscription publique
  par téléphone ; les comptes téléphone ne naissent que par `accept-invitation` (API d'administration) ;
- configuration retenue : `[auth.sms] enable_signup = true` et `enable_confirmations = true` (confirmation SMS exigée :
  défense en profondeur derrière le hook). **Vérifié en S2.5 : `enable_signup = false` désactive tout le fournisseur
  téléphone, connexion comprise** (`phone_provider_disabled`) → impossible ; le hook bloque les inscriptions ;
- comparaison du téléphone d'une invitation avec `auth.users.phone` **sur les chiffres seuls** (stocké sans « + ») ;
- en cloud (à vérifier par le développeur sur `daara-dev`) : accepter des identifiants Twilio fictifs dans le
  tableau de bord, activer le hook ;
- ~~reste ouvert : `signInWithOtp` / `resend` par téléphone déclenchent une tentative d'envoi vers Twilio~~ → réglé en
  S2.5 (audit) : le hook **`send_sms`** = `public.envoi_sms_factice` (fonction Postgres qui ne fait rien) remplace
  l'envoi ; le fournisseur Twilio factice reste déclaré (seul moyen d'activer le téléphone) mais n'est plus jamais
  appelé : **aucun numéro ne quitte la plateforme** (vérifié : demande d'OTP → 200 sans appel externe).

## Risque résiduel accepté (audit S2.5a, point I3 ; décision du développeur le 2026-10-05)
L'admin qui invite par téléphone détient le lien (il l'envoie sur WhatsApp) : il peut ouvrir lui-même `/invitation` et
créer le compte de ce numéro avec un mot de passe de son choix. Le vrai titulaire serait alors bloqué, y compris quand
une **autre** daara l'invite. Sans vérification du numéro par SMS (payant, exclu par l'ADR-003), ce risque ne peut pas
être supprimé ; il est **accepté et limité** :
- `accept-invitation` crée le compte **et** le rattache à la daara dans la même opération (pas de compte orphelin
  réutilisable) ; le compte porte `app_metadata.invitation` (invitation d'origine, non modifiable par l'utilisateur) ;
- création et rattachement journalisés (`audit_log`, invitation avec son auteur) ;
- `invitation-apercu` ne révèle jamais si un compte existe ; seul le détenteur d'un jeton valide l'apprend, à
  l'acceptation (`compte_existant`, ou numéro déjà pris), ce qui permet à un admin de tester un numéro par invitation :
  inévitable sans SMS, limité par les quotas d'invitations par auteur (50 / 24 h) et journalisé ;
- récupération d'un numéro usurpé : procédure super-admin (S2.7) ;
- évolution possible sans refonte : vérification du numéro par SMS ou WhatsApp quand l'offre le permettra.

## Conséquences
+ Aucun coût, adapté aux usages locaux (WhatsApp).
+ Pas de création de comptes en masse par des inconnus (création seulement sur invitation).
− Le numéro n'est vérifié que par la remise du lien : l'admin doit saisir le bon numéro.
− La récupération dépend de l'admin de la daara (à expliquer dans le guide utilisateur).
