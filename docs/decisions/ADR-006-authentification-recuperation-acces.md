# ADR-006 — Authentification et récupération d'accès

Statut : acceptée (2026-10-03) · Mise en œuvre : sprint 1 (§1, §2, §4), sprint 2 (§3)

## Contexte
- Utilisateurs aux usages très différents : admins et enseignants (e-mail professionnel ou personnel),
  parents qui consultent peu leurs e-mails mais utilisent WhatsApp, apprenants souvent sans e-mail.
- Données de mineurs (CDP) : le compte admin d'une daara donne accès à toutes ses données.
- Zéro abonnement (ADR-003) : pas de SMS ni d'API WhatsApp payante en V1 ; e-mails via Brevo (300 / jour).
- Audit du sprint 0 : passer le client Supabase en flux PKCE ; politique de mot de passe et double
  authentification à décider.

## Décision

### 1. Connexion
- Supabase Auth, e-mail + mot de passe ; confirmation de l'e-mail obligatoire à l'inscription.
- Mot de passe : **8 caractères minimum, lettres et chiffres** (choix du développeur : des exigences plus
  fortes feraient oublier leur mot de passe aux parents ; la double authentification protège les admins).
- Client Supabase en **flux PKCE** (`flowType: 'pkce'`) : plus de jetons dans le fragment de l'URL.
- Limites de débit d'Auth par défaut conservées.
- L'identifiant des parents et apprenants sans e-mail (téléphone, identifiant de daara…) est décidé au
  sprint 2 par l'ADR « OTP téléphone » ; la récupération d'accès ci-dessous fonctionne quel que soit ce choix.

### 2. Niveau 1 — code à 6 chiffres par e-mail (autonomie)
Pour tout utilisateur ayant un e-mail (admins, enseignants, parents qui le souhaitent).
- Écran « Mot de passe oublié » : `resetPasswordForEmail` ; l'e-mail affiche un **code à 6 chiffres**
  (`{{ .Token }}`), pas de lien : un lien ouvert depuis une application de messagerie s'ouvre souvent dans un
  autre navigateur et la réinitialisation échoue (perte de la session PKCE).
- L'utilisateur saisit le code dans l'écran ouvert (`verifyOtp`, type `recovery`), puis son nouveau mot de passe.
- Code valable **30 minutes** ; tentatives limitées par Supabase Auth.
- Message toujours neutre (« Si un compte existe, un code vient d'être envoyé ») : impossible de savoir si une
  adresse est inscrite.
- Modèles d'e-mails en français et en anglais, versionnés dans `supabase/templates/`.

### 3. Niveau 2 — réinitialisation assistée par l'admin de la daara
Recours normal pour les parents sans e-mail utilisable et pour les apprenants.
- Sur la fiche d'un membre, l'admin clique « Réinitialiser l'accès ». Edge Function `reset-access` :
  - appelant **admin de la daara** (JWT + membership, niveau d'authentification `aal2`) ;
  - personne visée **membre de la même daara**, **non admin** (un admin ne réinitialise jamais un autre admin) ;
  - génère un **code de 8 caractères** sans caractères ambigus (ni 0/O ni 1/l/I), **usage unique**,
    valable **24 heures**, stocké **haché** (table `codes_acces`) ; un nouveau code annule le précédent.
- Transmission par l'admin : **lien WhatsApp `wa.me` pré-rempli** vers le numéro de la fiche (« Votre code
  DAARA : … »), ou de vive voix. Aucun envoi automatique (gratuit, ADR-003).
- Edge Function `use-access-code` : identifiant + code, **5 essais maximum** puis code invalidé ; la personne
  choisit **elle-même** son nouveau mot de passe (l'admin ne le connaît jamais).
- Effets : toutes les sessions de la personne sont révoquées, l'action est inscrite au journal d'audit, un
  e-mail de notification est envoyé si la personne en a un.
- Seuls les admins ont ce pouvoir (pas les enseignants).

### 4. Niveau 3 — double authentification obligatoire pour les admins
- **TOTP** (application d'authentification, gratuit sur Supabase) obligatoire pour le rôle `admin` et pour les
  super-admins de la plateforme ; enrôlement imposé à la première connexion en tant qu'admin.
- Vérification **côté serveur** : les politiques RLS et les Edge Functions réservées aux admins exigent
  `auth.jwt() ->> 'aal' = 'aal2'` (dans `has_role` pour le rôle admin) ; l'écran n'est qu'un confort.
- Une réinitialisation du mot de passe (niveau 1) ne suffit donc pas pour prendre la main sur un compte admin.
- Perte du téléphone : codes de secours remis à l'activation si la version de Supabase Auth les propose
  (à vérifier au sprint 1), sinon enrôlement de deux appareils ; en dernier recours, le super-admin retire le
  facteur après vérification d'identité (appel ou rencontre), action inscrite au journal d'audit.

### 5. Évolution
Au passage payant (ADR-003), l'envoi automatique du code du niveau 2 par SMS ou WhatsApp (fournisseur
payant) pourra remplacer la transmission manuelle, sans changer le reste du mécanisme.

## Conséquences
+ Récupération possible pour tous les profils, sans coût, adaptée aux usages locaux (WhatsApp).
+ Comptes admin protégés même si leur mot de passe est faible ou volé.
+ Aucune personne autre que l'utilisateur ne connaît son mot de passe.
− Le niveau 2 sollicite l'admin de la daara ; à présenter dans le guide utilisateur comme le moyen normal
  pour les parents (« demandez à votre daara »).
− La double authentification ajoute une étape aux admins et un risque de blocage en cas de perte du
  téléphone (procédure du super-admin à documenter).
− Une table (`codes_acces`) et deux Edge Functions supplémentaires à tester (pgTAP + tests unitaires).
