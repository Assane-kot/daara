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
- [ ] Table d'un module : politiques conditionnées par `module_actif` + test pgTAP « module désactivé » ; menu et routes déclarent le module (ADR-008)
- [ ] Types régénérés, aucun `any`
- [ ] Écrans : chargement / erreur / vide, français + anglais, mode sombre, mobile 375 px
- [ ] Tests unitaires du service et du composant principal
- [ ] `npm run lint` et `npm run format:check` verts, CI verte sur `develop`
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
- [x] CI GitHub Actions (lint, tests, build, pgTAP, scan secrets)
- [ ] Cloudflare Pages branché sur le dépôt (production `main`, preview `develop`) — fichiers prêts, branchement par le développeur
- [ ] Projets Supabase Free `daara-dev` et `daara-prod`, SMTP Brevo — procédure prête, création par le développeur
- [ ] Workflows planifiés : sauvegarde `pg_dump` → R2, anti-pause — code testé en local, configuration et premier run à faire
- [ ] Sentry branché sur Angular — code testé, DSN à configurer
Livrable : application vide aux couleurs DAARA, en ligne sur Cloudflare Pages, CI verte. Coût : 0.

## Sprint 1 — Socle multi-tenant
Objectif : isolation des daaras prouvée par les tests.
- [x] Tables `daaras`, `profiles`, `memberships`, `audit_log`, `platform_admins`
- [x] Helpers RLS + triggers `handle_new_user`, `audit_trigger`
- [x] Tests pgTAP d'isolation (2 daaras, 4 rôles)
- [x] Inscription, connexion, déconnexion (flux PKCE) ; mot de passe oublié par code à 6 chiffres (ADR-006 niveau 1)
- [x] Double authentification TOTP obligatoire pour les admins, `aal2` exigé dans `has_role` (ADR-006 niveau 3)
- [x] Onboarding : création d'une daara (le créateur devient admin)
Livrable : un utilisateur crée sa daara ; une autre daara est invisible.

## Sprint 2 — Membres et navigation
Objectif : chaque profil accède à son espace et ne voit que ses modules ; l'admin invite, gère ses membres et paramètre
sa daara ; un parent sans e-mail se connecte et récupère son accès.
Planification validée le 2026-10-04 (LLD §2, §3.2, §4, §5, §6, §7.1 ; specs dans `docs/features/`). Un commit par story.
- [x] S2.0 Spike + ADR-009 : compte téléphone + mot de passe sans fournisseur SMS (`identifiant-sans-email`)
- [x] S2.1 Navigation par daara : `/d/:slug`, `DaaraResolver`, `CurrentDaaraService`, `/select-daara`, menus par rôle, `roleGuard`, barre basse mobile ; `aal2` exigé pour qui a un facteur (`navigation-daara.md`)
- [x] S2.2 Modules activables (ADR-008) : `daara_modules`, `module_actif`, `definir_modules`, écran Modules, profils à l'onboarding, `moduleGuard` (`modules.md`)
- [x] S2.3 Paramètres de la daara : informations, logo (Storage `logos`), langue, barème (`parametres-daara.md`)
- [x] S2.4 Gestion des membres : liste, rôle, désactivation, dernier admin, auteur des écritures dans `audit_log` (`membres.md`)
- [x] S2.5 Invitations : Edge Functions `invite-member`, `invitation-apercu`, `accept-invitation`, e-mail Brevo, lien WhatsApp, page `/invitation`, job CI `edge` (`invitations.md`)
- [x] S2.6 Réinitialisation assistée (ADR-006 niveau 2) : `codes_acces`, `creer_code_acces`, Edge `use-access-code`, révocation des sessions (`reinitialisation-assistee.md`)
- [x] S2.7 Mon compte et sécurité : profil, mot de passe, second appareil TOTP, modèles d'e-mail restants, procédure super-admin (`mon-compte.md`)
Livrable : l'admin invite un enseignant (e-mail) et un parent (téléphone), chacun voit son menu ; une daara coranique
ne voit aucun écran scolaire ; un parent récupère son accès avec le code de l'admin.

## Sprint 3 — Structure scolaire
Planification validée le 2026-10-09 (LLD §3.3, §4 ; spec `structure-scolaire.md`). Module `structure` (ADR-008). Un
commit par story.
- [x] S3.0 Conception : LLD §3.3 et §4 détaillés, spec, plan du sprint
- [x] S3.1 Années scolaires et périodes : une année active (`activer_annee`), modèles trimestres / semestres, clôture et réouverture
- [x] S3.2 Matières : catalogue de la daara (code, type), archivage
- [x] S3.3 Classes et affectations : `classes`, `classe_matieres` (coefficient, enseignant), `teaches_class`, `enseignants_daara`
- [x] S3.4 Composant `data-table` (pagination, tri, recherche serveur) appliqué aux matières, classes et membres (`rechercher_membres`)
Reporté : « Préparer la rentrée » (copie de l'année précédente), avant la deuxième année des pilotes.
Audit de fin de sprint fait et corrigé (2026-10-09).
Livrable : l'admin configure son année complète.

## Sprint 4 — Apprenants et parents
Planification validée le 2026-10-09 (LLD §3.4, §4, §5 ; spec `apprenants.md` ; ADR-010 ; règles `.claude/rules/ux.md`).
Un commit par story ; audit unique en fin de sprint.
- [x] S4.0 Conception : LLD §3.4, ADR-010 (données des apprenants), spec, règle d'ergonomie
- [x] S4.1 Fiches apprenants : matricule généré, statut, photo privée, liste (`data-table`), saisie en série
- [x] S4.2 Inscriptions dans les classes, élèves d'une classe, `enseigne_apprenant`
- [x] S4.3 Liens parents (`is_parent_of`), invitation d'un parent depuis la fiche, « Mes enfants »
- [x] S4.4 Import CSV des apprenants (modèle, rapport d'erreurs, tout ou rien)
- [x] S4.5 Démarrage guidé de l'admin (tableau de bord : étapes et avancement)
- [x] S4.6 Revue ergonomique des écrans des sprints 1 à 3 (grille `.claude/rules/ux.md`) et corrections
Audit de fin de sprint fait et corrigé (2026-10-13).
Livrable : une classe remplie avec ses parents invités.

## Sprint 5 — Absences et espace parent (fin R1 → pilote)
Planification validée le 2026-10-13 (LLD §3.5, §4, §7.2 ; specs `absences.md`, `notifications.md` ; ADR-011). Modules
`absences` et `notifications` (ADR-008). Un commit par story ; audit unique en fin de sprint.
- [x] S5.0 Conception : LLD, specs, ADR-011 (temps réel et notifications)
- [x] S5.0b Mise à jour automatique entre profils (signaux Realtime par daara, ajouté le 2026-10-13)
- [x] S5.1 Appel du jour : `appels`, `absences`, réglage demi-journée, écran d'appel mobile, « Terminer l'appel »
- [x] S5.2 Justification (parent) et décision (admin, titulaire), historique, écran Absences, statistiques simples
- [x] S5.3 Notifications dans l'application : `notifications`, cloche, centre, temps réel
- [x] S5.4 Accueil parent mobile : présent / absent aujourd'hui, absences récentes, « Justifier »
- [ ] S5.5 Tests e2e Playwright (appel → parent en temps réel → justification → décision), job CI — **reportée** (décision du
  2026-10-15) : à faire **juste avant le lancement du pilote**, puis à compléter au sprint 12 (durcissement)
- [ ] S5.6 Préparation pilote : daara de démonstration (`daara-dev`), guide utilisateur par rôle, check-list pilote —
  **reportée** (2026-10-15) : à faire **quand la date du pilote est fixée** (écrans stabilisés après les sprints 6-7)
Audit de fin de sprint fait et corrigé (2026-10-15).
Livrable : déploiement chez les daaras pilotes (après S5.5 et S5.6, reportées avant le pilote).

## Sprint 6 — Évaluations et notes
Planification validée le 2026-10-15 (LLD §3.5, §4, §7.3 ; spec `notes.md` ; ADR-012 paramétrage par daara). Module
`notes`. Un commit par story ; audit unique en fin de sprint.
- [x] S6.0 Conception : ADR-012 (paramétrage par daara, calcul des moyennes), spec, LLD
- [x] S6.1 Paramètres → Notes : `reglages_notes`, types d'évaluation, valeurs par défaut (daaras existantes comprises), profils d'onboarding
- [x] S6.1b Paramètres → Absences : délai de correction, qui décide, justification par les parents
- [x] S6.2 Évaluations par classe, matière et période
- [x] S6.3 Saisie des notes (un écran par évaluation, clavier, enregistrement automatique, période clôturée)
- [x] S6.4 Moyennes calculées par la base selon les réglages (tests chiffrés), tableau des moyennes
- [ ] S6.5 Publication, notification et consultation par les parents
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
- [ ] Tests e2e Playwright des parcours critiques (repris de S5.5 ; le premier lot est à faire avant le pilote)
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
