# Plan de sprints · DAARA SaaS

Hypothèse : sprints de 2 semaines, développeur à temps partiel assisté par Claude Code.
Ajuster la durée après le sprint 1 selon la vélocité réelle.
Règle : une story n'entre dans un sprint que si sa section du LLD est détaillée.

## Releases
| Release | Sprints | Contenu | Cible |
|---|---|---|---|
| R0 — Fondations | 0-2 | Socle multi-tenant, membres, layout | Démo interne |
| R1 — Pilote | 3-5 | Structure, apprenants, absences temps réel, espace parent | 1 à 3 daaras pilotes |
| R2 — Scolarité | 6-8 | Notes, bulletins, notifications, tableaux de bord | Pilotes élargis |
| R3 — Coran | 9-10 | Cahier, récitations, moteur nafar | Pilotes |
| R4 — Commercial | 11-12 | Offres, paiement, super-admin, durcissement | Lancement |

## Definition of Done (toutes les stories)
- [ ] Section LLD à jour
- [ ] Migration avec RLS + tests pgTAP verts (accès autorisés et refusés inter-daara)
- [ ] Types régénérés, aucun `any`
- [ ] Écrans : chargement / erreur / vide, français + anglais, mode sombre, mobile 375 px
- [ ] Tests unitaires du service et du composant principal
- [ ] Rapport `auditeur-securite` sans critique ni important ouvert
- [ ] PROGRESS.md mis à jour, commit Conventional Commits

---

## Sprint 0 — Installation (1 semaine)
Objectif : un projet propre qui tourne, avec l'outillage en place.
- [x] Analyser le starter Vristo (versions, structure), mettre à niveau si nécessaire (ADR-004)
- [x] Nettoyer le starter, renommer en DAARA, appliquer la charte vert/or
- [x] `SupabaseService`, environnements, `supabase init` / `start`
- [x] i18n fr/en (ADR-005)
- [x] Composants `shared/ui` de base : page-header, empty-state, badge, confirm-dialog
- [ ] CI GitHub Actions (lint, tests, build, pgTAP, scan secrets)
- [ ] Cloudflare Pages branché sur le dépôt (production `main`, preview `develop`)
- [ ] Projets Supabase Free `daara-dev` et `daara-prod`, SMTP Brevo/Resend
- [ ] Workflows planifiés : sauvegarde `pg_dump` → R2, anti-pause
- [ ] Sentry branché sur Angular
Livrable : application vide aux couleurs DAARA, en ligne sur Cloudflare Pages, CI verte. Coût : 0.

## Sprint 1 — Socle multi-tenant
Objectif : isolation des daaras prouvée par les tests.
- [ ] Tables `daaras`, `profiles`, `memberships`, `audit_log`, `platform_admins`
- [ ] Helpers RLS + triggers `handle_new_user`, `audit_trigger`
- [ ] Tests pgTAP d'isolation (2 daaras, 4 rôles)
- [ ] Inscription, connexion, déconnexion, mot de passe oublié
- [ ] Onboarding : création d'une daara (le créateur devient admin)
Livrable : un utilisateur crée sa daara ; une autre daara est invisible.

## Sprint 2 — Membres et navigation
Objectif : chaque profil accède à son espace.
- [ ] Invitations (`invite-member`, `accept-invitation`), email
- [ ] Gestion des membres (liste, rôle, désactivation)
- [ ] Routage `/d/:slug`, `DaaraResolver`, `CurrentDaaraService`, sélecteur multi-daaras
- [ ] Layout et menus par rôle, `roleGuard`
- [ ] Paramètres de la daara (nom, logo, barème)
- [ ] Décision OTP téléphone (ADR)
Livrable : l'admin invite un enseignant et un parent, chacun voit son menu.

## Sprint 3 — Structure scolaire
- [ ] Années scolaires (une active), périodes, clôture
- [ ] Classes, matières, `classe_matieres` (coefficients, enseignant)
- [ ] Helper `teaches_class`, tests
- [ ] Composant `data-table` (pagination, tri, recherche serveur)
Livrable : l'admin configure son année complète.

## Sprint 4 — Apprenants et parents
- [ ] Fiches apprenants (photo dans Storage), matricule
- [ ] Inscriptions dans les classes
- [ ] Liens parent ↔ apprenant, invitation des parents depuis la fiche
- [ ] Import CSV des apprenants (validation, rapport d'erreurs)
- [ ] Helper `is_parent_of`, tests
Livrable : une classe remplie avec ses parents invités.

## Sprint 5 — Absences et espace parent (fin R1 → pilote)
- [ ] Saisie rapide des absences par classe (appel du jour)
- [ ] Justification, historique, statistiques simples
- [ ] Realtime (admin, parent) + table `notifications` + centre de notifications
- [ ] Tableau de bord parent mobile (enfants, absences)
- [ ] Tests e2e : enseignant saisit → parent voit en temps réel
- [ ] Préparation pilote : données de démo, guide utilisateur court
Livrable : déploiement chez les daaras pilotes.

## Sprint 6 — Évaluations et notes
- [ ] Évaluations par classe/matière/période
- [ ] Saisie des notes en grille (clavier, sauvegarde auto), verrouillage période clôturée
- [ ] Calcul des moyennes (fonction SQL + tests pgTAP sur cas chiffrés)
- [ ] Consultation des notes côté parent
Livrable : notes saisies, moyennes justes et testées.

## Sprint 7 — Bulletins
- [ ] Spike PDF français + arabe → ADR
- [ ] `calculer_bulletins`, rang, appréciations
- [ ] Génération PDF (`generate-bulletins`), stockage, publication
- [ ] Consultation / téléchargement par les parents
Livrable : bulletins publiés pour une période.

## Sprint 8 — Notifications et tableaux de bord (fin R2)
- [ ] Web Push (PWA)
- [ ] WhatsApp par liens `wa.me` pré-remplis ; `dispatch-notifications` (push + email)
- [ ] Préférences de notification par parent
- [ ] Rapport hebdomadaire parent
- [ ] Tableaux de bord admin et enseignant
Livrable : parents prévenus même hors de l'application.

## Sprint 9 — Coran : cahier et récitations
Prérequis : `docs/nafar.md` validé, LLD §3.6 détaillé.
- [ ] Table de référence `sourates`, cahier numérique (114 sourates, statuts)
- [ ] Enregistrement audio (Opus) dans le navigateur, upload R2 via `audio-url`, récitations
- [ ] Correction par l'enseignant (texte + note vocale), mise à jour du cahier
- [ ] Devoirs
Livrable : cycle récitation → correction → cahier complet.

## Sprint 10 — Moteur nafar (fin R3)
- [ ] Implémentation selon la spécification (exemples de `nafar.md` = tests)
- [ ] Planning par apprenant, vue enseignant et parent
- [ ] Statistiques de progression Coran
Livrable : planning nafar généré et suivi.

## Sprint 11 — SaaS
- [ ] Offres, abonnements, limites appliquées (nb d'apprenants, fonctionnalités)
- [ ] Paiement mobile (agrégateur à choisir), webhook, factures
- [ ] Console super-admin (daaras, abonnements, suspension)
Livrable : une daara souscrit et paie en ligne.

## Sprint 12 — Durcissement et lancement (fin R4)
- [ ] Revue de sécurité complète (agents + test d'intrusion externe si possible)
- [ ] Performance (index, requêtes lentes, bundle Angular)
- [ ] Bilan des limites de l'offre gratuite → passage à Supabase Pro si seuils ADR-003 atteints
- [ ] Vérification de restauration d'une sauvegarde, monitoring, domaine
- [ ] Mentions légales, politique de confidentialité, conformité CDP
- [ ] Documentation utilisateur
Livrable : mise en production commerciale.

---

## En parallèle (hors sprints de dev)
- Sprints 1-8 : rédaction de `docs/nafar.md` avec les oustaz
- Sprints 2-5 : recrutement des daaras pilotes
- Sprint 5+ : retours pilotes chaque fin de sprint → backlog
