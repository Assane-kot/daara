# Feature : navigation par daara (sprint 2 : S2.1)

## Objectif
Chaque membre arrive dans l'espace de sa daara (`/d/:slug`), voit le menu de son rôle et des modules actifs, et
change de daara s'il en a plusieurs. Le second facteur s'applique à tout accès pour qui l'a activé.

## Profils concernés et droits (lecture / écriture par rôle)
Tous les membres. Lecture de la daara, de ses rôles et de ses modules (RLS du socle). Aucune écriture.

## Données (tables, colonnes, contraintes)
Aucune table nouvelle. Migration : helper `session_suffisante()` intégré à `is_member`, `has_role`,
`membres_administres` (LLD §4) + tests pgTAP (utilisateur avec facteur en `aal1` : plus aucun accès sauf son profil
et ses memberships ; sans facteur : inchangé).

## Règles métier
- `/` : 0 daara → onboarding ; 1 → `/d/:slug` ; plusieurs → dernière utilisée si toujours membre, sinon `/select-daara`.
- Dernier slug mémorisé dans le navigateur (préférence de confort, revérifiée à chaque fois).
- Daara inconnue ou non membre : `/select-daara`, message neutre (« Cette daara n'est pas accessible »).
- Menus : définis en données (libellé, icône, route, rôles, module) ; une entrée n'apparaît que si le rôle et le module
  le permettent.
- Mobile (< 640 px) : barre basse pour parents et apprenants (4 entrées max), sidebar pour admin et enseignant.

## Écrans (liste, détail, formulaire) — composants Vristo de référence
- `/select-daara` : cartes (logo, nom, ville, rôles), layout « cover ».
- Sidebar : sélecteur de daara en tête si plusieurs ; menu filtré.
- Barre basse mobile : inspirée de la navigation mobile Vristo, icônes + libellés courts.
États : chargement (squelette), erreur, 375 px, sombre, fr / en.

## Temps réel / notifications
Aucun.

## Cas de test (dont accès refusés inter-daara)
pgTAP : `session_suffisante` ; enseignant avec facteur en `aal1` → aucune donnée de sa daara ; sans facteur → inchangé.
Unitaires : `CurrentDaaraService`, `DaaraResolver` (slug inconnu, non membre), redirection de `/`, `roleGuard`,
`moduleGuard`, filtrage du menu par rôle et module, barre basse par rôle.

## Hors périmètre
Tableaux de bord par rôle (sprint 8) ; espace super-admin (sprint 11).
