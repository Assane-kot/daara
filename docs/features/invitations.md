# Feature : invitations (sprint 2 : S2.5)

## Objectif
L'admin invite un admin, un enseignant ou un parent par e-mail ou par téléphone ; l'invité rejoint la daara en
créant son compte ou en se connectant. Premières Edge Functions du projet.

## Profils concernés et droits (lecture / écriture par rôle)
- Admin (`aal2`) : crée, voit et révoque les invitations de sa daara.
- Invité : aperçu de l'invitation (sans compte), puis acceptation une fois connecté.
- Les autres membres n'ont aucun accès.

## Données (tables, colonnes, contraintes)
`invitations` (LLD §3.2) ; RPC `creer_invitation`, `revoquer_invitation`, `accepter_invitation` ; Edge Functions
`invite-member`, `invitation-apercu`, `accept-invitation` (LLD §6) ; `supabase/functions/_shared/`.

## Règles métier
- Jeton : 32 octets aléatoires, transmis dans le **fragment** de l'URL (`/invitation#…`), seul son haché est stocké ;
  valable 7 jours, usage unique, révocable ; une nouvelle invitation identique annule la précédente.
- **Contact lié** : l'acceptation exige que l'e-mail confirmé ou le téléphone du compte soit celui de l'invitation.
- Invitation admin : acceptation en `aal2` (TOTP activé avant de rejoindre).
- Envoi : e-mail via l'API Brevo si adresse (Mailpit en local) ; l'admin reçoit toujours le lien (copier, WhatsApp
  `wa.me` vers le numéro, message dans la langue de l'invité).
- Quota : 50 invitations par daara et par jour.
- Invitation par téléphone sans compte existant : création du compte par `accept-invitation` (ADR-009).
- Connexion par téléphone (ADR-009) : fournisseur SMS factice dans `config.toml` et en cloud, hook
  `before_user_created` (migration) qui refuse les inscriptions publiques par téléphone ; numéros comparés sur les
  chiffres seuls (Supabase les stocke sans « + ») ; champ « E-mail ou téléphone » à la connexion ; procédure cloud dans
  `docs/deploiement.md`.
- Déjà membre actif avec ce rôle : message « déjà membre » ; membership inactif : réactivé.
- Rôles invitables au sprint 2 : admin, enseignant, parent.

## Écrans (liste, détail, formulaire) — composants Vristo de référence
- Modale « Inviter » depuis `/d/:slug/membres` : rôle, e-mail **ou** téléphone, nom, prénom, langue ; résultat : lien,
  boutons Copier et WhatsApp.
- Onglet « Invitations » : en attente / expirées, révoquer, renvoyer.
- `/invitation` (layout « cover ») : aperçu (daara, rôle, contact masqué) → « Créer mon compte » / « Me connecter »
  (e-mail prérempli et verrouillé, ou téléphone) → acceptation → `/d/:slug`. Lien expiré ou utilisé : message dédié.
États : chargement, erreur, 375 px, sombre, fr / en ; modèle d'e-mail d'invitation bilingue (sans nom saisi).

## Temps réel / notifications
Aucun.

## Cas de test (dont accès refusés inter-daara)
pgTAP : `creer_invitation` (admin `aal2` OK ; `aal1`, enseignant, autre daara refusés ; quota ; doublon annulé) ;
`accepter_invitation` (jeton invalide, expiré, utilisé, révoqué ; **contact différent refusé** ; admin sans `aal2`
refusé ; réactivation) ; `token_hash` illisible ; journalisation ; hook : inscription publique par téléphone refusée,
par e-mail acceptée.
Deno : validation des entrées, masquage du contact, jeton et haché, réponses `{ code }`.
Unitaires : service d'invitation, page `/invitation` (états, conservation du jeton pendant l'inscription).
Manuel : parcours e-mail (Mailpit) et téléphone de bout en bout.

## Réalisation
- S2.5a (base) : migration `invitations`, 78 tests pgTAP ; jeton tiré par la base ; quotas daara / auteur / global e-mail.
- S2.5b (Edge Functions) : `invite-member`, `invitation-apercu`, `accept-invitation` + migration
  `invitation_nouveau_compte` (création du compte téléphone et rattachement dans la même opération, décision I3) ;
  27 tests Deno (`npm run edge:test`, dépendances verrouillées), job CI `edge` ; parcours vérifié de bout en bout sur le
  runtime local (Mailpit, compte téléphone). Codes d'erreur pour le front : `captcha`, `jeton_invalide`,
  `invitation_expiree|utilisee|revoquee|suspendue`, `invitation_email`, `compte_existant`, `mot_de_passe_faible`,
  `donnee_invalide`, `contact_invalide`, `admin_aal2_requis`, `deja_membre`, `quota_invitations`, `quota_global_email`,
  `daara_suspendue`, `inattendue`.
- S2.5c (front) : à faire.

## Hors périmètre
Invitations d'apprenants et rattachement aux enfants (sprint 4) ; import CSV (sprint 4).
