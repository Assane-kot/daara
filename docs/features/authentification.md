# Feature : authentification et onboarding (sprint 1 : S1.4, S1.5, S1.6 côté front)

## Objectif
Inscription, connexion, déconnexion, mot de passe oublié par code, double authentification TOTP obligatoire
pour les admins, création de sa daara. Références : ADR-006 (niveaux 1 et 3), LLD §7.0, §2 (routage, services).

## Profils concernés et droits (lecture / écriture par rôle)
- Visiteur : inscription, connexion, mot de passe oublié.
- Utilisateur connecté sans daara : onboarding (TOTP puis création de la daara).
- Admin : TOTP obligatoire ; sans session `aal2`, redirigé vers `/auth/mfa`. La RLS l'exige de toute façon.

## Données (tables, colonnes, contraintes)
`auth.users` (Supabase Auth), `profiles` (créé par trigger), `rpc('creer_daara')`, lecture des memberships de
l'utilisateur pour le routage. Voir `socle-multi-tenant.md`.

Configuration Supabase (`supabase/config.toml`, reportée à l'identique en cloud dans `docs/deploiement.md` §2) :
- `[auth.mfa.totp]` : `enroll_enabled` et `verify_enabled` à `true` ;
- `otp_expiry = 1800` (30 min), `otp_length = 6` ;
- modèles `confirmation` et `recovery` dans `supabase/templates/` : code `{{ .Token }}`, sans lien, fr/en selon
  `{{ .Data.langue }}` ;
- `[auth.captcha]` Turnstile ; local : clés de test Cloudflare ; cloud : clés réelles (secret dans Supabase,
  jamais dans Git). CSP (`public/_headers`) : `https://challenges.cloudflare.com` en `script-src` et `frame-src`.

## Règles métier
- Mot de passe : ≥ 8 caractères, au moins une lettre et un chiffre (validé au front et par Supabase Auth).
- Confirmation d'e-mail et réinitialisation par code à 6 chiffres saisi dans l'écran ouvert ; renvoi du code
  limité (minuteur 60 s).
- Messages neutres : « Si un compte existe, un code vient d'être envoyé » ; « Identifiants incorrects » sans
  préciser lequel.
- Après connexion : facteur TOTP vérifié → code demandé ; admin sans facteur → enrôlement imposé ; puis aucune
  daara → `/onboarding`, sinon → `/dashboard` (provisoire jusqu'au sprint 2).
- Onboarding : la création de la daara exige `aal2` → l'enrôlement TOTP est la première étape.
- Slug proposé à partir du nom (minuscules, sans accents, tirets), modifiable ; slug déjà pris → message dédié.
- Second facteur TOTP et codes de secours : **reportés au sprint 2** (vérifié à l'implémentation : codes de secours
  disponibles mais expérimentaux dans supabase-js 2.117 / Auth 2.197 ; à décider avec la procédure super-admin de
  retrait d'un facteur).
- Turnstile aussi sur la **connexion** : Supabase Auth l'exige sur `signInWithPassword` dès que le captcha est activé.
- Mot de passe oublié sur un compte avec TOTP : Supabase exige `aal2` pour changer le mot de passe → code TOTP
  demandé après le code e-mail.
- Aucun texte en dur : clés `auth.*`, `onboarding.*` en fr et en.

## Écrans (liste, détail, formulaire) — composants Vristo de référence
Layout `auth-layout`, style « cover » avec motif géométrique (reporté du sprint 0) : référence Vristo
`auth/cover-login`, `cover-register`, `cover-password-reset`.
- `/auth/connexion`, `/auth/inscription`, `/auth/confirmation` (code), `/auth/mot-de-passe-oublie` (e-mail puis
  code + nouveau mot de passe), `/auth/mfa` (enrôlement : QR code + clé texte copiable ; vérification : code).
- `/onboarding` : étapes (1. sécuriser le compte, 2. créer la daara).
- Header : menu utilisateur avec déconnexion.
États : chargement (boutons désactivés + indicateur), erreurs traduites (LLD §8), mode sombre, 375 px, champs code
`inputmode="numeric"` + `autocomplete="one-time-code"`.

Code : `core/auth/` (`AuthService`, `authGuard`, `anonymeGuard`, `mfaGuard`), `features/auth/`,
`features/onboarding/`. `SupabaseService` : `flowType: 'pkce'`.

## Temps réel / notifications
Aucun (e-mails d'Auth uniquement).

## Cas de test (dont accès refusés inter-daara)
Unitaires :
- `AuthService` : connexion, erreurs traduites, état `aal`, déconnexion, réaction à `onAuthStateChange`.
- Guards : non connecté → `/auth/connexion` ; connecté sur `/auth/*` → redirigé ; admin `aal1` → `/auth/mfa`.
- Routage après connexion : 0 daara → onboarding ; ≥ 1 → dashboard.
- Validateur de mot de passe ; génération du slug (accents, espaces, caractères spéciaux, longueur).
- Onboarding : erreur slug pris, erreur `aal2`.
Manuels (navigateur + Mailpit) : parcours complet inscription → code → onboarding (TOTP via une application
d'authentification) → daara créée ; mot de passe oublié ; reconnexion d'un admin avec code TOTP.
Base : couvert par `socle-multi-tenant.md` (`aal2` exigé côté RLS).

## Hors périmètre
Invitations, réinitialisation assistée (niveau 2), sélecteur de daaras, `/d/:slug` (sprint 2) ; connexion par
téléphone (ADR du sprint 2) ; procédure super-admin de retrait d'un facteur (à documenter au sprint 2).
