# ADR-003 — Fonctionnement sans abonnement jusqu'aux premiers revenus

Statut : acceptée

## Contexte
Aucune dépense récurrente souhaitée avant que les daaras paient. Claude Code est déjà couvert (Claude Pro).

## Décision
| Besoin | Service gratuit |
|---|---|
| Backend | Supabase Free : 2 projets (`daara-dev`, `daara-prod`), région Europe de l'Ouest |
| Front | Cloudflare Pages (preview sur `develop`, production sur `main`) |
| Fichiers lourds (audios) | Cloudflare R2 (10 Go gratuits), URLs signées via Edge Function |
| Sauvegardes | `pg_dump` quotidien par GitHub Actions → R2 |
| Anti-pause | Requête planifiée GitHub Actions (vacances scolaires) |
| Emails | Brevo, offre gratuite 300 e-mails/jour (SMTP branché sur Supabase Auth ; choisi le 2026-10-01) |
| Notifications | Web Push ; WhatsApp par liens `wa.me` ; pas de SMS en V1 |
| Erreurs | Sentry (offre gratuite) |
| CI | GitHub Actions |

## Conséquences
+ Coût fixe nul. Code identique à Supabase Pro ou auto-hébergé : migration sans réécriture.
− Limites : base 500 Mo, stockage Supabase ~1 Go, connexions temps réel limitées, pas de sauvegardes managées.
− Purge/archivage de `audit_log` obligatoire (> 12 mois).
− E-mails : 300 / jour (Brevo Free). Un nom de domaine authentifié (DKIM, DMARC) est nécessaire pour ne pas
  tomber en spam : seule dépense annuelle (quelques euros par an), à engager au plus tard avant le pilote (R1).
→ E-mails (2026-10-05) : l'e-mail est réservé aux codes d'authentification et aux invitations ; les notifications
  passent d'abord par Web Push et WhatsApp, le rapport hebdomadaire reste dans l'application par défaut. Passage à une
  offre e-mail payante (forfait Brevo ou Amazon SES, tarif à vérifier le moment venu) au-delà d'environ 200 e-mails par
  jour en moyenne OU au lancement commercial (R4). Envoi centralisé dans une seule fonction des Edge Functions
  (fournisseur changé par configuration) et compteur global d'envois pour alerter avant le quota.
→ Passage à Supabase Pro (ou auto-hébergement) déclenché par : premières daaras payantes, OU base > 350 Mo,
  OU besoin de SLA.
