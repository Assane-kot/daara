# ADR-009 — Identifiant des comptes sans e-mail

Statut : **proposée** (2026-10-04), à confirmer par le spike S2.0 · Remplace la « décision OTP téléphone » prévue
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

## Conséquences
+ Aucun coût, adapté aux usages locaux (WhatsApp).
+ Pas de création de comptes en masse par des inconnus (création seulement sur invitation).
− Le numéro n'est vérifié que par la remise du lien : l'admin doit saisir le bon numéro.
− La récupération dépend de l'admin de la daara (à expliquer dans le guide utilisateur).
