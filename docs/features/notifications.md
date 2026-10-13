# Feature : notifications dans l'application et temps réel (sprint 5 : S5.3)

## Objectif
Prévenir les membres dans l'application (cloche, centre de notifications) en quelques secondes, gratuitement (ADR-011).
Premier usage : les absences (S5.1, S5.2). Module `notifications` (ADR-008) : inactif → aucune notification créée.

## Profils concernés et droits (lecture / écriture par rôle)
Chacun lit ses propres notifications (`user_id = auth.uid()`, membre actif de la daara) et peut seulement les marquer
lues (`lu_at`). Aucune création par le client : triggers et RPC `security definer`. Autre utilisateur, autre daara : rien.

## Données (tables, colonnes, contraintes)
LLD §3.5 : `notifications` (daara_id, user_id, type `type_notification`, apprenant_id, absence_id, lien, lu_at,
created_at) ; **pas de texte ni de nom d'enfant** stocké : le message est composé à l'écran (ADR-010, ADR-011).

## Règles métier
| Type | Quand | Destinataires |
|---|---|---|
| `absence` / `retard` | fin de l'appel, ou ajout après la fin | parents actuels de l'enfant |
| `absence_annulee` | absence retirée après la fin de l'appel | parents actuels de l'enfant |
| `justification_envoyee` | le parent envoie un motif | admins actifs + titulaire de la classe |
| `justification_decidee` | justifiée / non justifiée | parents actuels de l'enfant |
- Jamais de notification à l'auteur de l'action.
- Conservation : lues 90 jours, non lues 1 an (purge, sprint 12).

## Écrans (liste, détail, formulaire) — composants Vristo de référence
- Cloche dans l'en-tête (tous les rôles, module actif) : pastille du nombre de non lus (99+), menu des 10 dernières,
  « Tout marquer comme lu », « Voir tout ».
- `/d/:slug/notifications` : liste paginée, non lues en gras ; un appui ouvre le lien (ex. l'absence à justifier) et
  marque lue. Parent : barre basse mobile.
- Messages fr / en composés à l'écran (« Awa était absente ce matin (CE1 A) »).

## Temps réel / notifications
`NotificationCenterService` : un canal Realtime `notifications` filtré sur `user_id`, ouvert à l'entrée dans la daara,
fermé à la sortie ou au changement de daara ; compteur de non lus en signal.

## Cas de test (dont accès refusés inter-daara)
pgTAP : lecture de ses notifications seulement ; marquer lue ses notifications seulement, aucune autre colonne ; aucune
insertion par le client ; module inactif → aucune création ; ancien parent non prévenu ; autre daara. Unitaires :
service (compteur, réception en temps réel simulée), cloche.

## Hors périmètre
Web Push, WhatsApp, e-mail, préférences de notification (sprint 8).
