# Règles d'ergonomie (toutes les fonctionnalités)

Exigence du développeur (2026-10-09) : chaque fonctionnalité doit être **très, très facile à utiliser**. Public : admins
de daaras, enseignants, parents souvent peu à l'aise avec le numérique, surtout sur téléphone. À appliquer à chaque
story, à annoncer dans son plan et à vérifier dans le navigateur.

- **Guider** : chaque écran dit quoi faire ensuite. Un état vide propose toujours l'action (bouton « Créer la première
  classe »), jamais un simple « Aucune donnée ».
- **Valeurs par défaut** : pré-remplir tout ce qui se devine (année en cours, code proposé, dates des trimestres, langue,
  classe déjà choisie, indicatif +221…).
- **Une action principale par écran**, visible, en bouton plein ; les actions rares dans un menu « … ».
- **Mots simples** : pas de jargon technique (aal2, membership, RLS, uuid…) ; phrases courtes ; libellés de boutons à
  l'infinitif précis (« Inscrire l'élève », pas « Valider »).
- **Erreurs qui aident** : dire comment corriger (« Ce code existe déjà : choisissez-en un autre »), près du champ concerné.
- **Mobile d'abord** : cibles ≥ 44 px, formulaires courts (un écran), clavier adapté (`inputmode`), cartes sous 640 px.
- **Moins de clics** : « Enregistrer et ajouter un autre » pour les saisies en série, import CSV pour les listes,
  confirmation seulement pour les actions destructrices ou irréversibles.
- **Retour immédiat** : message de succès après chaque action, bouton désactivé + indicateur pendant l'envoi ; rien en
  silence.
- **Ne rien perdre** : ne pas effacer un formulaire en erreur ; prévenir avant de quitter une saisie non enregistrée
  quand elle est longue.
- **Pas de choix inutile** : jamais d'option « Non précisé » / « Autre » quand la réponse est connue et attendue ;
  proposer seulement les vraies réponses (ex. sexe : Garçon ou Fille) et rendre le champ obligatoire (décision du
  développeur, 2026-10-10).
- **Cohérence** : mêmes composants (`shared/ui`), mêmes places pour les mêmes actions, mêmes mots d'un écran à l'autre.
