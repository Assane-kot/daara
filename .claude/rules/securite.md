# Règles de sécurité (tout le projet)

- Aucun secret dans le code ou Git. Front : uniquement `SUPABASE_URL` et clé `anon`/publishable.
- Clé `service_role` : uniquement dans les Edge Functions (variables d'environnement), jamais ailleurs.
- Ne jamais lire ni afficher le contenu des fichiers `.env`.
- Pas de `innerHTML` / `bypassSecurityTrust*` sans justification écrite et assainissement.
- Les Edge Functions vérifient le JWT et le membership de l'appelant avant toute action.
- Les identifiants venant du client (daara_id, apprenant_id) ne sont jamais crus : la RLS ou la fonction revérifie.
- Données de mineurs : minimiser les données collectées, pas de données d'apprenant dans les logs.
- Uploads : vérifier type MIME et taille (audio ≤ 50 Mo), noms de fichiers générés côté serveur.
- Dépendances : pas de nouveau paquet npm sans le signaler et le justifier.
- Toute faille découverte est notée dans PROGRESS.md (section « Problèmes ouverts ») si non corrigée immédiatement.
