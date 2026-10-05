# ADR-008 — Modules activables par daara

Statut : acceptée (2026-10-04) · Mise en œuvre : sprint 2 (socle), puis chaque story de module (sprints 3 à 10),
offres au sprint 11

## Contexte
- Les daaras sont très différentes : certaines sont purement coraniques (cahier, récitations, nafar), d'autres
  sont des écoles franco-arabes (classes, notes, bulletins, absences). Une daara qui ne fait pas de bulletins ne
  doit pas voir d'écrans de bulletins, ni ses enseignants, ni ses parents.
- Le HLD §5 découpe déjà l'application en modules ; le LLD §3.7 prévoit `offres.fonctionnalites` (sprint 11).
- Aucun module métier n'est encore codé : poser le mécanisme maintenant évite de reprendre toutes les tables et
  tous les écrans plus tard.

## Décision
**Chaque daara active les modules qu'elle utilise. Ce que l'admin active est ce que tous les membres voient.**

### Modules (enum `public.module_daara`)
| Module | Code | Contenu | Requiert |
|---|---|---|---|
| Socle | — (toujours actif) | membres, rôles, invitations, paramètres, tableau de bord | — |
| Structure scolaire | `structure` | années, périodes, classes, matières, affectations | — |
| Absences | `absences` | appel, justification, alertes aux parents | `structure` |
| Notes | `notes` | évaluations, saisie, moyennes | `structure` |
| Bulletins | `bulletins` | calcul, rang, PDF, publication | `notes` |
| Cahier de Coran | `coran_cahier` | sourates, statuts, devoirs | — |
| Récitations audio | `coran_recitations` | enregistrement, correction | `coran_cahier` |
| Nafar | `coran_nafar` | planning de révision | `coran_cahier` |
| Notifications | `notifications` | push, rapports hebdomadaires aux parents | — |

Les apprenants et les liens parents (sprint 4) appartiennent au socle : toute daara a des élèves.

### Règles
1. **Qui active** : l'admin de la daara (`aal2`), librement. À partir du sprint 11, l'offre de la daara fixe le
   plafond : un module hors offre ne peut être ni activé ni utilisé.
2. **Dépendances** vérifiées côté base : activer un module active ce qu'il requiert ; désactiver un module requis
   par un module actif est refusé (message qui nomme le module dépendant).
3. **Désactivation = masquage, jamais suppression** : les données restent ; une réactivation retrouve l'historique.
4. **Protection côté base, pas seulement à l'écran** : toutes les politiques RLS (lecture et écriture) d'une table
   de module exigent `module_actif(daara_id, '<module>')`. Les Edge Functions d'un module le vérifient aussi.
5. **Onboarding** : la création de la daara propose des profils (« Daara coranique », « École franco-arabe »,
   « Personnalisé ») qui pré-cochent les modules ; modifiables ensuite dans Paramètres → Modules.
6. Toute activation / désactivation est journalisée (`audit_log`).

### Mise en œuvre
- Table `daara_modules(daara_id, module, actif, updated_at, updated_by)`, clé `(daara_id, module)` ; écrite
  uniquement par `definir_modules` et `creer_daara` (aucune écriture client directe).
- Helper `module_actif(daara_id, module)` (`security definer`, `stable`), appelé via `(select …)` dans les politiques.
- RPC `definir_modules(p_daara, p_modules module_daara[])` : admin `aal2`, fermeture des dépendances, refus de
  désactiver un module requis ; renvoie la liste active.
- `creer_daara` reçoit `p_modules` (défaut : tous les modules) avec les mêmes contrôles.
- Front : `CurrentDaaraService.modules()` (signal), entrées de menu et routes déclarant leur module,
  `moduleGuard('<module>')`.
- Réglages internes d'un module (trimestres / semestres, rang sur le bulletin, appréciations…) : paramètres du
  module, détaillés avec sa story.

## Conséquences
+ Une daara ne voit que ce qu'elle utilise : interface plus simple, notamment pour les parents.
+ Base prête pour les offres (sprint 11) sans refonte.
+ Données jamais perdues en cas de désactivation.
− Chaque story de module ajoute la condition `module_actif` à ses politiques et ses tests pgTAP « module désactivé »
  (inscrit dans la Definition of Done et dans `.claude/rules/supabase-rls.md`).
− Un appel par ligne : la forme `(select module_actif(daara_id, …))` n'est pas mise en cache quand l'argument est une
  colonne (SubPlan évalué par ligne, vérifié par l'audit RLS de S2.2). Pour les grosses tables de module, préférer un
  helper ensembliste évalué une fois (`daara_id in (select …)`, modèle de `membres_administres`) ; à mesurer au sprint 12.
