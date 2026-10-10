# ADR-010 — Données des apprenants (mineurs)

Statut : acceptée (2026-10-09) · Mise en œuvre : sprint 4 (fiches, journal), sprint 12 (purge, effacement CDP)

## Contexte
- Le sprint 4 crée les premières données d'enfants : identité, date de naissance, photo, liens avec les parents.
  Elles relèvent de la loi sénégalaise sur les données personnelles (CDP) et demandent une protection renforcée.
- `audit_trigger` copie aujourd'hui des lignes entières dans `audit_log`, sans durée de conservation (point ouvert à
  trancher « avant le sprint 5 »).

## Décision
1. **Minimisation** : la fiche ne contient que nom, prénom, date de naissance (facultative), sexe (**obligatoire :
   Garçon ou Fille seulement**, jamais « non précisé », décision du développeur du 2026-10-10), statut
   (`inscrit` / `parti`), matricule et photo (facultative). Pas d'adresse, de lieu de naissance, de données médicales,
   de religion ni de numéro d'identité. Toute nouvelle donnée d'enfant passe par une mise à jour de cet ADR.
2. **Matricule** généré par la base (`AAAA-NNNN`, année d'inscription + compteur de la daara), unique par daara, non
   modifiable : il ne révèle rien de l'enfant.
3. **Photo** dans un bucket **privé** `photos`, lue par URL signée de courte durée (1 h), ré-encodée dans le navigateur
   (512 px, WebP, métadonnées EXIF retirées, comme les logos) ; visible par l'admin, les enseignants de l'enfant et ses
   parents seulement.
4. **Journal sans valeurs** : pour les tables d'enfants (`apprenants`, `inscriptions`, `parent_links`), `audit_log`
   garde l'auteur, la date, l'action, l'identifiant de la ligne et la **liste des colonnes modifiées**, jamais leurs
   valeurs (trigger `audit_trigger_colonnes`). Les autres tables gardent le journal complet.
5. **Conservation** : lignes de journal des tables d'enfants conservées 1 an ; purge planifiée et effacement à la
   suppression d'une daara ou d'un enfant à mettre en place au sprint 12 (avec la procédure CDP).
6. **Comptes apprenants** (connexion des élèves) : reportés au sprint 9 (récitations) ; d'ici là, `apprenants.user_id`
   reste nul.
7. **Pas de données d'enfant** dans les journaux applicatifs, Sentry ni les messages d'erreur (règle de sécurité).

## Conséquences
+ Exposition limitée en cas de fuite ; conformité plus simple (CDP).
+ Le journal reste utile (qui a modifié quelle fiche, quand) sans dupliquer les données personnelles.
− Pas d'historique des valeurs : une erreur de saisie ne se « rejoue » pas depuis le journal.
− Travail de purge à faire au sprint 12.
