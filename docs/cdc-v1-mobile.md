**  DAARA  **— Cahier des Charges  |  V1.0

**DAARA**

دارا

*Plateforme d**'**Apprentissage du Coran*

**Cahier des Charges Complet**

Pour Oustaz, Apprenants et Parents

| **Version : **1.0 — MVP | **Statut : **Document de reference |
| --- | --- |
| **Cible : **Afrique de l'Ouest & Monde musulman | **Stack : **Flutter + Firebase |
| **Langues V1 : **Francais, Arabe | **Modele : **100% Gratuit pour tous |
| **Couleur principale : **#1a6b3c (vert islamique) | **Accent : **#C9A84C (or) |

# **Table des matieres**

# **1. Vision et Contexte**

## **1.1 Le probleme actuel**

Aujourd'hui, la majorite des cours de Coran a distance se font via WhatsApp ou Telegram. Ces applications generalistes n'ont pas ete concues pour l'enseignement. Les oustaz, apprenants et parents se heurtent chaque jour aux memes problemes :

- Les discussions personnelles et les cours se melangent dans les memes groupes

- Les audios de recitation sont disperses et difficiles a retrouver

- Le suivi de la memorisation est manuel, approximatif et fastidieux

- Les parents ne peuvent pas consulter la progression de leurs enfants

- Les oustaz gerent difficilement plusieurs groupes en parallele

- Il n'existe aucun programme pedagogique integre ni evaluation systematique

## **1.2 La vision de DAARA**

DAARA est une plateforme mobile gratuite entierement dediee a l'enseignement et l'apprentissage du Coran. Le nom « Daara » designe l'ecole coranique traditionnelle en Afrique de l'Ouest — un lieu de savoir, de transmission et de spiritualite.

DAARA n'est pas 'un nouveau WhatsApp'. C'est un assistant intelligent de l'enseignement du Coran, concu specifiquement pour les oustaz, leurs apprenants et leurs familles, adapte aux realites de l'Afrique et du monde musulman.

L'objectif : permettre a chaque oustaz de suivre facilement la progression de ses apprenants et de gerer leurs recitations — depuis un seul outil, simple, sobre, et spirituellement ancre.

## **1.3 Identite visuelle**

| **Nom** | DAARA (دارا) — ecole coranique en Afrique de l'Ouest |
| --- | --- |
| **Couleur principale** | #1a6b3c — Vert islamique, symbole de paix et de connaissance |
| **Couleur d****'****accent** | #C9A84C — Or, symbole de sagesse et de lumiere |
| **Logo** | Etoile islamique geometrique sur fond vert, nom en arabe calligraphie en or |
| **Typographie** | Sobre, lisible, bilingue Francais et Arabe |

## **1.4 Public cible**

### **Phase 1 — MVP**

- Oustaz independants enseignant a distance

- Apprenants adultes et enfants

- Parents souhaitant suivre la progression de leur enfant

### **Phase 2 — Expansion**

- Daaras et ecoles coraniques locales

- Instituts islamiques et associations

- Grandes madrasas avec plusieurs oustaz

## **1.5 Objectif principal**

Chaque action dans DAARA doit etre plus simple et plus rapide que son equivalent sur WhatsApp. L'application resout un probleme reel, quotidien, pour des milliers d'oustaz et d'apprenants a travers le monde.

# **2. Fonctionnalites**

## **2.1 Vue d****'****ensemble par version**

| **Fonctionnalite** | **Description** | **Version** |
| --- | --- | --- |
| Comptes utilisateurs | Oustaz, Eleve, Parent — inscription et connexion securisee | V1 |
| Creation de classes (Halaqas) | Par niveau, code d'acces, lien QR partageble | V1 |
| Cahier numerique du Coran | Suivi sourate par sourate, statut par verset | V1 |
| Envoi de recitations audio | Enregistrement direct, envoi a l'oustaz, organisation par eleve | V1 |
| Correction et feedback | Validation, note vocale, commentaire texte de l'oustaz | V1 |
| Tableau de progression | Sourates apprises, en cours, a reviser — visuel et chiffre | V1 |
| Notifications push | Nouveau devoir, correction recue, rappel de revision | V1 |
| Suivi parent | Vue lecture seule : progression, recitations, devoirs | V1 |
| Mode hors-ligne | Cahier et contenu telecharges disponibles sans connexion | V1 |
| Revisions intelligentes | Algorithme de repetition espacee (type Anki) | V2 |
| Planning personnalise | Programme de memorisation sur mesure par objectif | V2 |
| Statistiques avancees | Graphiques, series d'apprentissage, temps de recitation | V2 |
| Bibliotheque islamique | Coran integre, traductions, Tafsir, regles de Tajwid | V2 |
| Sessions live audio/video | Halaqa en direct integree, sans Zoom ni WhatsApp | V2 |
| IA de correction Tajwid | Analyse vocale automatique, score, erreurs soulignees | V3 |
| Suggestions IA | Versets a retravailler identifies par l'IA | V3 |
| Gamification | Badges, niveaux (Debutant, Hafiz Junior, Excellence Tajwid) | V3 |
| Certificats numeriques | Ijaza electronique officielle signee par l'oustaz | V3 |
| Marketplace oustaz | Profils publics, recherche par specialite et ville | V4 |
| Dons a l'oustaz integres | Les apprenants peuvent soutenir leur oustaz via l'app | V4 |
| Gestion de Madrasa | Multi-oustaz, tableau de bord administrateur complet | V4 |

## **2.2 Detail des fonctionnalites V1**

### **2.2.1 Comptes utilisateurs**

Trois profils distincts avec des interfaces et des permissions differentes :

| **Oustaz** | Cree et gere les Halaqas, assigne les devoirs, corrige les recitations, consulte les progres de chaque apprenant. |
| --- | --- |
| **Eleve** | Rejoint une Halaqa, enregistre et envoie ses recitations, consulte son cahier numerique et ses devoirs. |
| **Parent** | Vue en lecture seule : progression de l'enfant, recitations validees, devoirs assignes. Rapport hebdomadaire automatique. |

### **2.2.2 Classes virtuelles — Halaqas**

Chaque oustaz cree des Halaqas correspondant a ses groupes. Une Halaqa possede :

- Un nom libre et un niveau (debutant, intermediaire, avance)

- Un code d'acces unique a 6 caracteres alphanumeriques

- Un lien d'invitation partageble par SMS ou messagerie

- Un QR code imprimable ou a afficher

Regles metier importantes :

- Un eleve appartient a une seule Halaqa active a la fois (assoupli en V2)

- L'oustaz peut avoir jusqu'a 10 Halaqas actives en V1

- La suppression d'une Halaqa archive les donnees, elle ne les efface pas

- Le code d'acces est regenerable sans impacter les eleves deja inscrits

### **2.2.3 Cahier numerique du Coran**

Chaque apprenant dispose d'un cahier personnel qui suit l'etat de chacune des 114 sourates :

| **Validee** | Sourate entierement memorisee et approuvee par l'oustaz. Badge vert. |
| --- | --- |
| **En cours** | Sourate partiellement apprise ou en attente de validation. Badge orange. |
| **A reviser** | Sourate validee mais necessitant une revision. Badge bleu. |
| **Non commencee** | Etat par defaut a l'inscription. Pas de badge. |

Le cahier est mis a jour automatiquement lors d'une validation par l'oustaz. L'oustaz peut aussi le modifier manuellement a tout moment.

### **2.2.4 Cycle de recitation et correction**

Flux complet du cycle recitation → correction → mise a jour du cahier :

- L'eleve ouvre son cahier numerique et selectionne la sourate

- Il appuie sur 'Enregistrer' et recite dans le micro de son telephone

- Il peut reecouter son audio avant envoi

- Il envoie la recitation — l'audio est stocke securise sur Firebase Storage

- L'oustaz recoit une notification push

- L'oustaz ecoute l'audio et prend sa decision :

- Valider : le statut de la sourate passe automatiquement a 'validee'

- Demander une correction : l'oustaz enregistre un feedback texte et/ou une note vocale

- L'eleve recoit une notification avec le resultat et le feedback

- Si correction demandee, l'eleve reprend depuis l'etape 2

### **2.2.5 Devoirs**

L'oustaz peut assigner des devoirs a une Halaqa entiere ou a un eleve specifique :

- Sourate a memoriser avant une date limite

- Exercice de Tajwid sur des versets precis

- Revision d'une sourate deja validee

Les eleves et les parents recoivent une notification a l'assignation et un rappel 24h avant la deadline.

### **2.2.6 Mode hors-ligne**

Fonctionnalite critique pour l'Afrique de l'Ouest ou la connexion peut etre instable :

- Le cahier numerique est entierement disponible hors-ligne

- Les recitations telechargees sont consultables sans connexion

- L'eleve peut enregistrer une recitation hors-ligne — elle est envoyee automatiquement a la reconnexion

- Synchronisation silencieuse en arriere-plan

# **3. Architecture Technique**

## **3.1 Stack technologique**

Stack choisie pour minimiser les couts au demarrage tout en permettant une montee en charge progressive jusqu'a des centaines de milliers d'utilisateurs.

| **Application mobile** | Flutter — iOS et Android depuis une seule base de code |
| --- | --- |
| **Authentification** | Firebase Auth — email/password + Google Sign-In |
| **Base de donnees** | Cloud Firestore — NoSQL temps reel, synchronisation hors-ligne |
| **Stockage audio** | Firebase Storage — recitations, notes vocales, photos profil |
| **Notifications** | Firebase Cloud Messaging (FCM) — gratuit |
| **Live audio/video (V2)** | Agora.io — gratuit jusqu'a 10 000 min/mois |
| **Texte du Coran** | Quran.com API — 114 sourates, traductions, audio recitateurs |
| **CI/CD** | GitHub Actions + Fastlane pour les deploiements stores |

## **3.2 Structure du projet Flutter**

Architecture modulaire par feature (Clean Architecture adaptee) :

| lib/ | Racine du projet Flutter |
| --- | --- |
| core/ | Services partages : Firebase, navigation, theme DAARA, localisation |
| features/auth/ | Inscription, connexion, choix de role, verification email |
| features/halaqas/ | Creation, liste, gestion des classes virtuelles |
| features/cahier/ | Cahier numerique, etat 114 sourates, historique |
| features/recitations/ | Enregistrement audio, envoi, lecture, feedback |
| features/devoirs/ | Creation (oustaz) et reception (eleve) des devoirs |
| features/notifications/ | Gestion FCM, badges, historique des alertes |
| features/parent/ | Tableau de bord lecture seule pour les parents |
| features/profil/ | Profil oustaz, bio, specialite, niveau de verification |
| shared/widgets/ | Composants UI reutilisables (boutons, cards, audio player) |
| shared/models/ | Modeles Dart : User, Halaqa, Eleve, Recitation... |

## **3.3 Modele de donnees Firestore**

Firestore est une base NoSQL orientee documents. Les collections ci-dessous constituent le coeur du schema de donnees de DAARA.

### **Collection : users**

| **users — Comptes principaux** |
| --- |
| **Champ** | **Type** | **Description** |
| uid | string (PK) | Identifiant Firebase Auth (genere automatiquement) |
| email | string | Adresse email de connexion |
| displayName | string | Nom affiche dans l'application |
| role | enum | oustaz │ eleve │ parent |
| photoUrl | string? | URL photo de profil (optionnel) |
| isVerified | boolean | Email confirme par l'utilisateur |
| langue | enum | fr │ ar │ wo │ pu (langue preferee) |
| createdAt | timestamp | Date de creation du compte |

### **Collection : oustaz_profiles**

| **oustaz_profiles — Profils enseignants** |
| --- |
| **Champ** | **Type** | **Description** |
| uid | string (PK) | Meme uid que users |
| userId | string (FK) | Reference vers users |
| bio | string | Presentation courte de l'oustaz |
| specialite | enum | lecture │ tajwid │ hifz │ revision │ tout |
| ville | string | Ville principale d'exercice |
| niveauVerification | int | 0=inscrit, 1=verifie, 2=certifie |
| ijazaUrl | string? | URL du document d'Ijaza (optionnel) |
| nbEleves | int | Compteur mis a jour automatiquement |
| notesMoyenne | float? | Note moyenne donnee par les apprenants (V4) |

### **Collection : halaqas**

| **halaqas — Classes virtuelles** |
| --- |
| **Champ** | **Type** | **Description** |
| uid | string (PK) | Identifiant unique de la Halaqa |
| oustazId | string (FK) | Reference vers oustaz_profiles |
| nom | string | Ex: Halaqa Fajr, Groupe Enfants Samedi |
| niveau | enum | debutant │ intermediaire │ avance |
| codeAcces | string (unique) | Code 6 caracteres pour rejoindre |
| lienInvitation | string | URL courte partageble |
| active | boolean | Halaqa active ou archivee |
| createdAt | timestamp | Date de creation |

### **Collection : eleves**

| **eleves — Inscription des apprenants** |
| --- |
| **Champ** | **Type** | **Description** |
| uid | string (PK) | Identifiant unique |
| userId | string (FK) | Reference vers users |
| halaqaId | string (FK) | Halaqa active de l'eleve |
| parentId | string? (FK) | Compte parent lie (optionnel) |
| dateInscription | timestamp | Date de rejoindre la Halaqa |

### **Collection : cahier_entrees**

| **cahier_entrees — Suivi sourate par sourate** |
| --- |
| **Champ** | **Type** | **Description** |
| uid | string (PK) | Identifiant unique de l'entree |
| eleveId | string (FK) | Reference vers eleves |
| sourate | string | Nom de la sourate (ex: Al-Fatiha) |
| numeroSourate | int | Numero 1 a 114 |
| statut | enum | validee │ en_cours │ a_reviser │ non_commencee |
| versetDebut | int? | Premier verset concerne (partiel) |
| versetFin | int? | Dernier verset concerne (partiel) |
| dateMaj | timestamp | Date de la derniere mise a jour |
| miseAJourPar | enum | oustaz │ systeme │ auto |

### **Collection : recitations**

| **recitations — Audios envoyes par les eleves** |
| --- |
| **Champ** | **Type** | **Description** |
| uid | string (PK) | Identifiant unique |
| eleveId | string (FK) | Reference vers eleves |
| halaqaId | string (FK) | Reference vers halaqas |
| sourate | string | Sourate recitee |
| audioUrl | string | URL Firebase Storage (acces prive, signe) |
| dureeSecondes | int | Duree de l'audio en secondes |
| statut | enum | en_attente │ valide │ a_revoir |
| feedbackTexte | string? | Commentaire texte de l'oustaz |
| feedbackAudioUrl | string? | Note vocale de l'oustaz |
| envoyeAt | timestamp | Date d'envoi par l'eleve |
| corrigeAt | timestamp? | Date de traitement par l'oustaz |

### **Collection : devoirs**

| **devoirs — Travaux assignes par l****'****oustaz** |
| --- |
| **Champ** | **Type** | **Description** |
| uid | string (PK) | Identifiant unique |
| oustazId | string (FK) | Reference vers oustaz_profiles |
| halaqaId | string (FK) | Halaqa ciblee |
| eleveId | string? (FK) | Eleve specifique (optionnel, sinon toute la Halaqa) |
| type | enum | memorisation │ tajwid │ revision |
| description | string | Instructions detaillees du devoir |
| sourate | string? | Sourate concernee |
| deadline | timestamp | Date et heure limite |
| actif | boolean | Devoir visible par les eleves |

### **Collection : notifications**

| **notifications — Alertes utilisateurs** |
| --- |
| **Champ** | **Type** | **Description** |
| uid | string (PK) | Identifiant unique |
| userId | string (FK) | Destinataire de la notification |
| type | enum | nouveau_devoir │ recitation_corrigee │ rappel │ validation |
| titre | string | Titre court de la notification |
| message | string | Corps du message |
| refId | string? | ID de l'objet concerne |
| lue | boolean | Notification lue (false par defaut) |
| createdAt | timestamp | Horodatage d'envoi |

# **4. Parcours Utilisateurs**

## **4.1 Inscription et premiere connexion**

- L'utilisateur ouvre DAARA pour la premiere fois

- Il choisit : 'Creer un compte' ou 'Se connecter'

- S'il cree un compte, il choisit son role : Oustaz / Eleve / Parent

- Saisie email + mot de passe, confirmation par email

- Selon le role :

- Oustaz : complete son profil (bio, specialite, ville, Ijaza optionnel) puis cree sa premiere Halaqa

- Eleve : saisit le code de Halaqa ou scanne le QR code fourni par son oustaz

- Parent : saisit le code fourni par l'oustaz pour lier le compte de son enfant

- Redirection vers le tableau de bord correspondant au role

## **4.2 Cycle complet d****'****une recitation**

- L'eleve ouvre son cahier numerique dans DAARA

- Il selectionne la sourate qu'il souhaite envoyer

- Il appuie sur 'Enregistrer' et recite

- Il reecoute son audio avant envoi (optionnel)

- Il appuie sur 'Envoyer' — l'audio est uploade sur Firebase Storage

- L'oustaz recoit une notification push : 'Nouvelle recitation de [Prenom]'

- L'oustaz ouvre DAARA, acceede a la recitation, ecoute l'audio

- L'oustaz choisit :

- Valider : statut de la sourate passe a 'validee' dans le cahier de l'eleve

- Demander correction : l'oustaz laisse un feedback texte et/ou enregistre une note vocale

- L'eleve recoit une notification avec le resultat

- Si correction demandee, l'eleve recommence depuis l'etape 3

## **4.3 Suivi parent**

- Le parent se connecte sur son compte DAARA

- Il accede au tableau de bord de son enfant (lecture seule)

- Il consulte :

- Pourcentage du Coran memorise (calculable sur 114 sourates)

- Detail des sourates par statut (validees, en cours, a reviser)

- Historique des recitations (validees ou a revoir)

- Devoirs en cours avec deadline et statut de completion

- Il recoit automatiquement un rapport hebdomadaire par notification

## **4.4 Creation d****'****une Halaqa par l****'****oustaz**

- L'oustaz appuie sur 'Nouvelle Halaqa' depuis son tableau de bord

- Il renseigne le nom, le niveau et une description optionnelle

- L'application genere automatiquement un code d'acces et un QR code

- L'oustaz partage le code ou le QR code a ses apprenants

- Les eleves rejoignent — l'oustaz recoit une notification par inscription

- L'oustaz peut desormais assigner des devoirs et suivre les recitations

# **5. Regles Metier**

## **5.1 Regles sur les comptes**

- Un compte a exactement un role (oustaz, eleve, ou parent), non modifiable apres inscription

- Un eleve appartient a une seule Halaqa active a la fois

- Un parent peut superviser plusieurs enfants

- Un oustaz peut creer jusqu'a 10 Halaqas actives en V1

- La suppression d'un compte est irrevocable et entraine l'anonymisation des donnees associees

## **5.2 Regles sur les Halaqas**

- La suppression d'une Halaqa archive les donnees — elle ne les efface pas

- Un eleve exclu d'une Halaqa conserve son cahier numerique

- Le code d'acces est regenerable par l'oustaz sans affecter les eleves deja inscrits

- Une Halaqa peut etre desactivee temporairement (pause) sans perte de donnees

## **5.3 Regles sur les recitations**

- Un eleve peut avoir une seule recitation 'en_attente' par sourate a la fois

- L'audio est conserve 90 jours apres validation, indefiniment si statut 'a_revoir'

- Le feedback audio de l'oustaz est optionnel

- L'oustaz ne peut pas modifier le statut d'une recitation apres validation definitive

- La taille maximale d'un audio est de 50 Mo (environ 30 minutes de recitation)

## **5.4 Regles sur le cahier numerique**

- Le statut 'validee' ne peut etre attribue que suite a une validation explicite de l'oustaz

- L'oustaz peut modifier manuellement le statut de toute sourate dans le cahier d'un eleve

- La progression est calculee : (sourates validees / 114) x 100

- Un retour en arriere (valide -> en cours) est possible uniquement par l'oustaz

# **6. Securite et Confiance**

## **6.1 Verification des oustaz**

Systeme progressif de verification pour garantir la qualite et la confiance :

| **Niveau 0 — Inscrit** | Compte cree, email confirme. Badge gris. Fonctionnalites de base disponibles. |
| --- | --- |
| **Niveau 1 — Verifie** | Piece d'identite fournie et verifiee. Badge argent. Acces aux statistiques avancees. |
| **Niveau 2 — Certifie** | Verifie par un partenaire reconnu (association islamique, universite islamique). Badge or. |

*En V1, seul le niveau 0 est implemente. Les niveaux 1 et 2 sont prevus en V3.*

## **6.2 Protection des mineurs**

- Les comptes d'eleves mineurs sont obligatoirement lies a un compte parent

- La messagerie directe entre oustaz et eleve mineur est visible par le parent

- Tout contenu peut etre signale par l'oustaz, le parent ou un administrateur

- L'historique complet des interactions est conserve pendant 3 ans

- Aucune donnee d'un eleve mineur n'est partagee avec des tiers

## **6.3 Securite des donnees**

- Authentification Firebase avec verification email obligatoire

- Les audios sont stockes dans des buckets Firebase prives, inaccessibles publiquement

- Les URLs d'acces aux audios sont des Signed URLs avec expiration (1 heure)

- Regles Firestore strictes : un utilisateur ne peut lire que ses propres donnees et celles de sa Halaqa

- Les mots de passe ne sont jamais stockes en clair (Firebase Auth les hache avec bcrypt)

# **7. Localisation et Adaptation Locale**

## **7.1 Langues supportees**

| **V1 — Lancement** | Francais et Arabe (interface complete bidirectionnelle RTL/LTR) |
| --- | --- |
| **V2 — Expansion** | Anglais |
| **V3 — Afrique de l****'****Ouest** | Wolof, Pulaar, Haoussa |
| **V4 — Mondial** | Turc, Indonesien, Urdu, Swahili |

## **7.2 Adaptation au contexte africain**

- Mode hors-ligne complet : cahier et recitations telechargees disponibles sans connexion

- Synchronisation automatique et silencieuse a la reconnexion

- Interface optimisee pour les connexions 2G/3G (images compressees, lazy loading)

- APK disponible en telechargement direct hors Play Store pour les appareils sans acces au store

- Taille de l'application cible au lancement : moins de 30 Mo

- Support des SMS pour les notifications (fallback si FCM indisponible)

## **7.3 Calendrier islamique**

- Affichage optionnel des dates en calendrier hegirien (Hijri)

- Rappels automatiques pendant le Ramadan (objectifs de recitation quotidiens)

- Notifications pour les nuits speciales (Laylat al-Qadr, etc.)

# **8. Plan de Lancement**

## **8.1 Methode : Lean Startup**

L'objectif n'est pas de construire toutes les fonctionnalites d'un coup. La methode consiste a valider le probleme le plus vite possible, avec le minimum de developpement, aupres de vrais utilisateurs.

## **8.2 Les 4 phases**

### **Phase 1 — Recherche utilisateur (avant tout developpement)**

- Interviewer 20 oustaz : leurs 3 plus grandes frustrations avec WhatsApp

- Interviewer 20 parents : ce qu'ils aimeraient pouvoir suivre facilement

- Interviewer 20 eleves : ce qui les decourage dans l'apprentissage a distance

- Objectif : confirmer que le probleme #1 justifie le developpement

### **Phase 2 — Developpement MVP (mois 1 a 3)**

- Inscription et connexion par role (Oustaz, Eleve, Parent)

- Creation et rejoindre une Halaqa

- Envoi et correction de recitations audio

- Cahier numerique basique (114 sourates)

- Notifications push

- Mode hors-ligne basique

- Objectif : 100 utilisateurs actifs dans les 30 jours post-lancement

### **Phase 3 — Test et iteration (mois 4 a 6)**

- Deployer aupres de 5 a 10 oustaz partenaires et leurs apprenants

- Recueillir des retours chaque semaine

- Mesurer : retention J+7 et J+30, frequence d'envoi de recitations

- Corriger uniquement ce qui bloque les utilisateurs

### **Phase 4 — Croissance (a partir du mois 7)**

- Ajouter uniquement les fonctionnalites demandees par les utilisateurs actifs

- Cibler les associations islamiques et les daaras pour adoption groupee

- Campagnes de sensibilisation via les imams et les reseaux islamiques

- Internationalisation progressive

## **8.3 Ce qu****'****il ne faut pas construire au debut**

Pour garder le focus et eviter les depenses prematurees, ces fonctionnalites sont explicitement exclues du MVP :

- Visioconference integree — Zoom ou Google Meet suffisent en attendant

- IA de correction du Tajwid — infrastructure couteuse, a valider l'interet d'abord

- Marketplace des oustaz — necessite une masse critique d'utilisateurs

- Paiements integres — complexite reglementaire, a aborder en V4

- Bibliotheque islamique complete — effort editorial important, non critique au lancement

- Gamification avancee — une barre de progression simple suffit en V1

# **9. Modele Economique**

## **9.1 Principe fondamental — Gratuit pour tout le monde**

DAARA est entierement gratuite pour tous les utilisateurs, sans exception et sans limitation : oustaz, apprenants, parents, ecoles coraniques, instituts islamiques. Il n'existe aucun compte premium, aucun abonnement payant, aucune fonctionnalite reservee aux utilisateurs payants.

L'acces a l'enseignement du Coran ne doit jamais etre conditionne a un paiement. Cette conviction est au coeur de DAARA et ne changera pas.

## **9.2 Sources de financement**

### **9.2.1 Publicites non intrusives**

Pour couvrir les couts d'infrastructure au fur et a mesure de la croissance, DAARA integrera un systeme de publicites respectueux :

- Publicites uniquement sur les ecrans non lies a la recitation ou a la priere

- Aucune publicite pendant l'enregistrement ou l'ecoute d'une recitation

- Aucune publicite pendant les sessions live

- Contenu publicitaire filtre : uniquement des annonceurs compatibles avec les valeurs islamiques

- Technologie envisagee : Google AdMob (integre nativement avec Flutter)

*En V1, aucune publicite n**'**est integree. Elles seront ajoutees progressivement a partir de la V2, une fois la base d**'**utilisateurs atteinte.*

### **9.2.2 Systeme de dons volontaires**

DAARA integrera un mecanisme de dons simple et transparent pour ceux qui souhaitent soutenir le projet :

- Bouton 'Soutenir DAARA' discret accessible depuis le menu profil

- Dons ponctuels ou mensuels via les plateformes de paiement mobile (Wave, Orange Money, PayPal)

- Rapport de transparence annuel : comment les dons sont utilises (hebergement, developpement)

- Les donateurs ne beneficient d'aucun avantage — le don est un acte desinteresse

*Les dons sont destines uniquement a couvrir les couts techniques et a financer le developpement des nouvelles versions. Aucun profit n**'**est extrait.*

### **9.2.3 Partenariats institutionnels (long terme)**

A terme, DAARA pourra nouer des partenariats avec des organisations islamiques qui souhaitent soutenir le projet en echange d'une visibilite institutionnelle :

- Organisations islamiques nationales et internationales

- Fondations caritatives islamiques (Zakat, Waqf)

- Universites islamiques souhaitant promouvoir leur offre de formation

*Ces partenariats ne changent pas le caractere 100% gratuit de l**'**application pour les utilisateurs.*

## **9.3 Couts d****'****infrastructure estimes**

Sur la base de 1 000 utilisateurs actifs par mois en V1 :

- Firebase Spark (plan gratuit) : 50 000 lectures/jour — suffisant jusqu'a 500 utilisateurs actifs

- Firebase Storage : 5 Go gratuits — environ 500 recitations de 2 minutes

- Firebase Cloud Messaging : entierement gratuit

- Agora.io (live, V2) : gratuit jusqu'a 10 000 minutes/mois

Cout total infrastructure estime pour le MVP : 0 a 20 USD/mois jusqu'a 500 utilisateurs actifs. Les revenus publicitaires couvriront les couts des la V2.

# **10. Glossaire**

| **Oustaz** | Enseignant du Coran (terme usuel en Afrique de l'Ouest). Equivalents : Cheikh, Muallim, Muallimat. |
| --- | --- |
| **Daara / Halaqa** | Daara : ecole coranique traditionnelle (Afrique de l'Ouest). Halaqa : cercle d'etude, classe virtuelle dans l'app. |
| **Hifz** | Memorisation integrale ou partielle du Coran. Hafiz/Hafiza : personne ayant memorise le Coran. |
| **Ijaza** | Autorisation formelle accordee par un maitre apres verification de la maitrise du texte coranique. |
| **Tajwid** | Regles de recitation correcte du Coran : prononciation, rythme, pauses, elisions. |
| **Madrasa** | Ecole coranique, de la petite structure locale au grand institut islamique. |
| **Sourate** | Chapitre du Coran. Le Coran comprend 114 sourates. |
| **Aya (verset)** | Unite au sein d'une sourate. Le Coran contient 6 236 versets. |
| **Juz****'** | Trentieme partie du Coran, utilisee pour organiser la memorisation. |
| **FCM** | Firebase Cloud Messaging — service de notifications push de Google/Firebase. |
| **Firestore** | Base de donnees NoSQL temps reel de Firebase (Google Cloud Platform). |
| **Flutter** | Framework de developpement mobile multiplateforme de Google (iOS + Android). |
| **MVP** | Minimum Viable Product — version minimale permettant de valider le concept. |
| **RTL** | Right To Left — sens de lecture de l'arabe, gere nativement par Flutter. |

**DAARA — دارا**

*Plateforme d**'**Apprentissage du Coran — Version 1.0*

Document confidentiel — Tous droits reserves

Page   —  Confidentiel  —  DAARA