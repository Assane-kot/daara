# ADR-011 — Temps réel et notifications (sprint 5)

Statut : accepté (2026-10-13, validé par le développeur avec le plan du sprint 5)

## Contexte
- Le sprint 5 livre l'appel du jour : le parent doit apprendre l'absence de son enfant vite, dans l'application, sans
  service payant (ADR-003) et sans exposer de données d'enfant hors de l'application (ADR-010).
- Supabase Free : Realtime limité à 200 connexions simultanées et 2 millions de messages par mois ; Realtime
  `postgres_changes` applique la RLS de l'utilisateur abonné.

## Décision
1. **Notifications en base** : table `notifications` (destinataire, type, identifiants, lien, lu ou non), créée par la base
   (triggers et RPC `security definer`), jamais par le client. Elle stocke des **identifiants**, pas de texte : le message
   (« Awa était absente ce matin ») est composé à l'écran à partir des données que le destinataire a le droit de lire
   (pas de nom d'enfant recopié, ADR-010). Module `notifications` (ADR-008) : inactif → aucune notification créée.
2. **Quand on prévient** : à la fin de l'appel (« Terminer l'appel »), pas à chaque appui ; une correction faite après la
   fin de l'appel prévient aussi (« absence annulée », « nouvelle absence »). Destinataires : les **parents actuels**
   (ADR-010 §9), membres actifs.
3. **Temps réel** (révisé le 2026-10-13, S5.0b) : **un seul canal privé Realtime Broadcast par utilisateur et par
   daara** (`daara:<uuid>`). Des triggers par instruction publient « la table X a changé » (`realtime.send`, **aucune
   donnée** dans le message, un signal par instruction et par daara) ; chaque écran ouvert recharge ses données par une
   requête normale (RLS), regroupée (400 ms). Écoute réservée aux membres actuels (`canal_daara_autorise`, politique sur
   `realtime.messages`) ; aucun envoi par le client. Filet : rechargement au retour sur l'onglet et après une
   reconnexion. Les absences (S5.1) passent par ce canal ; les notifications (S5.3) par un canal privé propre à
   l'utilisateur (`utilisateur:<uuid>`), même principe. Pas de `postgres_changes` (contrôle RLS par abonné et par
   changement, plus coûteux).
4. **Hors de l'application** (Web Push, liens WhatsApp, e-mail) : sprint 8. Leur texte ne contiendra **aucun nom
   d'enfant** (« Nouvelle information sur votre enfant » + lien vers l'application).
5. **Conservation** : notifications lues effacées après 90 jours, non lues après 1 an (purge planifiée, sprint 12).

## Seuils (passage à Supabase Pro, ADR-003)
- Connexions Realtime simultanées > 150 aux heures de pointe, ou messages > 1,5 million / mois, deux mois de suite.
- Avant ce seuil : réduire les canaux (une seule connexion par onglet, abonnement seulement sur les écrans concernés).

## Conséquences
+ Le parent est prévenu en quelques secondes, gratuitement ; une erreur de saisie corrigée pendant l'appel ne crée
  pas de fausse alerte.
+ Aucune donnée d'enfant dupliquée dans les notifications.
− Un parent qui n'ouvre pas l'application n'est prévenu qu'au sprint 8 (Web Push / WhatsApp).
− Les compteurs Realtime sont à surveiller dans le tableau de bord Supabase (tâche du développeur, `docs/exploitation.md`).
