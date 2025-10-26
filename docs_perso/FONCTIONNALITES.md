# 📖 FONCTIONNALITÉS - Le Nexus

**Version actuelle** : 3.0.2  
**Date** : 26 octobre 2025  
**Application** : Le Nexus

---

## 📚 À PROPOS

**Le Nexus** est une application de gestion complète pour vos collections multimédias :
- 📚 **Mangas** : Séries, tomes, progression de lecture
- 🎬 **Animes** : Séries, épisodes, films, OVA avec architecture MyAnimeList pure
- 🎮 **AVN** (Adult Visual Novels) : Jeux F95Zone/LewdCorner avec scraping automatique

### Caractéristiques principales

✅ **Multi-utilisateurs** avec avatars et couleurs personnalisées  
✅ **Base de données SQLite locale** avec support cloud (Proton Drive, OneDrive, Google Drive)  
✅ **Synchronisation MyAnimeList** : OAuth 2.0 + sync auto périodique  
✅ **Traduction IA** : Groq AI pour synopsis anglais → français  
✅ **Import automatique** : Scripts Tampermonkey pour 6 sources  
✅ **Scraping F95Zone/LewdCorner** : Extraction automatique données AVN  
✅ **Interface moderne** : Dark/Light mode, 3 vues (grille, liste, images uniquement)  
✅ **Statistiques avancées** : Graphiques Recharts avec évolution temporelle  
✅ **Performance optimisée** : Import 26 animes/min, anti-gel UI, rate limiting intelligent  
✅ **Fusion intelligente Nautiljon** : Matching avec distance Levenshtein + merge conditionnel

---

## 📚 GESTION MANGAS

### Ajout séries

- **Recherche MangaDex/Nautiljon** : Récupération automatique des métadonnées
- **Ajout manuel complet** : Formulaire personnalisé
- **Import Tampermonkey** : Extraction depuis Nautiljon (série + tomes)
- **Import MyAnimeList** : Synchronisation OAuth avec liste manga MAL

### Informations supportées

**Champs de base** :
- Titre, titre alternatif, auteur, éditeur, ISBN
- Type : Broché, Collector, Coffret, Kindle, Webtoon, Light Novel, Scan Manga, Scan Webtoon, Numérique
- Genre, statut publication, description
- Couverture (upload ou URL)
- Date sortie, notes privées

**Multi-propriétaires** :
- Propriétaires multiples avec dropdown multi-sélection
- Calculs automatiques des coûts partagés
- Statistiques individuelles par utilisateur

**Champs MyAnimeList** (18 champs enrichis) :
- `mal_id` : ID unique MyAnimeList
- `titre_romaji`, `titre_anglais`, `titres_alternatifs` (JSON)
- `nb_volumes`, `media_type`, `themes` (JSON), `auteurs` (JSON)
- `date_debut`, `date_fin`
- `volumes_lus`, `statut_lecture`, `score_utilisateur`
- `date_debut_lecture`, `date_fin_lecture`
- `tags` (JSON), `relations` (JSON)
- `source_donnees` : nautiljon, mal, hybride (mal+nautiljon)

### Gestion tomes

- **Ajout** : Numéro, titre, date sortie, date achat, prix, couverture, notes
- **Suivi lecture** : Marquer lu avec timestamp précis (date + heure)
- **Marquer en masse** : Bouton "Marquer plusieurs tomes comme lu"
- **Progression automatique** : Calcul X/Y tomes lus
- **Historique chronologique** : Lectures récentes avec timestamps

### Synchronisation MAL Manga

**Configuration OAuth 2.0** :
- Client ID MAL requis (obtenu via MyAnimeList API)
- PKCE sécurisé (Proof Key for Code Exchange)
- Tokens stockés localement avec refresh automatique

**Import automatique** :
- Liste manga complète depuis compte MAL
- 18 champs enrichis récupérés via MAL API v2
- Création automatique séries manquantes
- Mise à jour intelligente (compare local vs MAL)

**Matching intelligent Nautiljon** :
- Normalisation avancée : Suppression accents, tirets, espaces, ponctuation
- Distance Levenshtein : Tolérance 1-3 caractères selon longueur titre
- 4 critères matching :
  - Titre Nautiljon ↔ Titre DB
  - Titre Nautiljon ↔ Alternatif DB
  - Alternatif Nautiljon ↔ Titre DB
  - Alternatif Nautiljon ↔ Alternatif DB

**Fusion conditionnelle** :
- Merge intelligent : Nautiljon écrase UNIQUEMENT si valeur présente
- Conservation MAL : Rating, genres, etc. préservés si Nautiljon n'a pas l'info
- Écrasement automatique covers MAL par Nautiljon (priorité couvertures françaises)
- Badge visuel source : 📊 MAL, 🇫🇷 Nautiljon, 📊🇫🇷 Hybride

**Scheduler automatique** :
- Synchronisation périodique configurable (ex: toutes les 6 heures)
- Activable/désactivable depuis Paramètres
- Arrière-plan non-bloquant
- Affichage dernière sync avec date/heure

### Tags & Organisation

**Tags automatiques** :
- 🔵 **En cours** : Série avec au moins 1 tome lu mais pas tous
- ✅ **Lu** : Tous les tomes marqués comme lus

**Tags manuels** :
- 📚 **À lire** : Série dans la liste de souhaits
- 🚫 **Abandonné** : Série abandonnée

**Favoris** :
- ⭐ Flag indépendant des tags
- Combinable avec tous les tags
- Affichage prioritaire dans collections

**Bannières diagonales** :
- Affichage visuel coloré selon statut
- Vert : Terminé/Lu
- Orange : En cours
- Gris : Abandonné

**Filtrage avancé** :
- Par tag (En cours, Lu, À lire, Abandonné)
- Par favori uniquement
- Combinaisons multiples

### Vues collection

**Grille (Grid)** :
- Mosaïque responsive 2-6 colonnes selon taille écran
- Cartes complètes avec couverture, titre, progression
- Badges visuels pour tags et statuts
- Infos détaillées visibles

**Liste (List)** :
- Vue verticale compacte
- Miniatures + progression inline
- Tri par titre, date ajout, progression
- Affichage dense pour grandes collections
- Idéal pour scan rapide

**Images uniquement (Images)** :
- Mosaïque focus visuel (200px min par image)
- Couvertures haute définition
- Grille auto-fill responsive
- Hover pour infos rapides
- Idéal pour collections visuelles

### Chapitres-based series

**Support scans/webtoons** :
- Comptage chapitres au lieu de tomes
- Input "Nombre de chapitres" + "Chapitres lus"
- Barre progression chapitres

**Traduction descriptions** :
- Bouton "Traduire" avec Groq AI
- Traduction automatique anglais → français
- Affichage loading pendant traduction

**Bannière completion** :
- "Tout lu" si 100% chapitres lus
- Affichage visuel distinct

### Masquage de séries

**Fonctionnement** :
- Masquer une série sans la supprimer pour les autres utilisateurs
- Bouton 🚫 (orange) en bas à gauche des cartes
- Confirmation avant masquage
- Suppression données lecture utilisateur

**Afficher séries masquées** :
- Checkbox "Afficher les séries masquées" dans Collection
- Séries masquées apparaissent avec bouton 👁️ (bleu)
- Clic pour démasquer

**Persistance** :
- Masquage personnel par utilisateur
- Table `series_masquees` dans base de données

---

## 🎬 GESTION ANIMES

### Architecture MAL pure

- **1 anime = 1 entrée distincte** avec `mal_id` unique
- Relations franchise natives (prequel, sequel)
- Plus de groupement saisons automatique
- Gestion manuelle des relations

### Ajout animes

**Par MAL ID/URL** :
- Handler `addAnimeByMalId(59027)` ou `addAnimeByMalId('https://myanimelist.net/anime/59027')`
- Fetch automatique : Jikan (MAL API v4) + AniList GraphQL + Groq AI
- Proposition import prequels/sequels automatique

**Import XML MyAnimeList** :
- Export liste depuis compte MAL (format XML)
- Import en masse avec progression temps réel
- Barre détaillée : X/Y animes, ETA, vitesse import
- 26.2 animes/min grâce parallélisation

**Scripts Tampermonkey** :
- ADKami Episode Tracker
- Crunchyroll Episode Tracker
- ADN Episode Tracker
- MyAnimeList Quick Add

**Synchronisation OAuth MAL** :
- Sync unidirectionnelle automatique (MAL → App)
- Scheduler périodique configurable
- Import/MAJ automatique liste anime complète

### 28 champs enrichis

**Titres multiples** :
- `titre` : Titre principal
- `titre_romaji` : Romanisation japonaise
- `titre_natif` : Titre original (japonais/coréen/chinois)
- `titre_anglais` : Titre anglais officiel
- `titres_alternatifs` : JSON array titres alternatifs

**Informations de base** :
- `type` : TV, Movie, OVA, ONA, Special
- `source` : Manga, Light Novel, Jeu vidéo, Original
- `nb_episodes` : Nombre total épisodes
- `duree` : Durée épisode (ex: "24 min")
- `annee` : Année diffusion
- `saison_diffusion` : Winter, Spring, Summer, Fall

**Métadonnées** :
- `couverture_url` : HD depuis AniList (prioritaire) ou Jikan
- `description` : Synopsis traduit automatiquement en français
- `statut_diffusion` : Terminé, En cours, À venir
- `en_cours_diffusion` : Boolean pour diffusion en cours
- `date_debut`, `date_fin` : Dates diffusion

**Classification** :
- `genres` : JSON array (Action, Comédie, Romance, etc.)
- `themes` : JSON array (École, Réincarnation, Temps, etc.)
- `demographics` : Shōnen, Seinen, Shōjo, Josei
- `rating` : G, PG, PG-13, R, R+, Rx

**Production** :
- `studios` : JSON array studios animation
- `producteurs` : JSON array producteurs
- `diffuseurs` : JSON array plateformes streaming

**Scoring & Relations** :
- `score` : Note MyAnimeList (0-10)
- `franchise_name` : Nom franchise
- `franchise_order` : Ordre dans franchise
- `prequel_mal_id`, `sequel_mal_id` : Relations directes
- `liens_externes` : JSON array liens externes
- `liens_streaming` : JSON array liens streaming

**Badge plateforme** :
- 🇫🇷 ADN (Anime Digital Network)
- 🟠 Crunchyroll
- 🎬 ADKami

### Suivi progression

**Épisodes** :
- Toggle individuel par épisode (checkbox cliquable)
- Marquer tout vu d'un coup (bouton masse)
- Timestamp précis (date + heure)
- Calcul automatique progression X/Y épisodes
- Table `anime_episodes_vus` avec foreign key

**Statuts personnels** :
- À regarder
- En cours
- Terminé
- Abandonné
- Table `anime_statut_utilisateur` séparée

### Import optimisé

**Parallélisation** :
- Jikan + AniList + Groq en parallèle (Promise.all())
- Wait unique 800ms après toutes requêtes
- Traduction arrière-plan pendant traitement franchise
- **Performance : +118%** (11-12 → 26.2 animes/min)

**Chronomètre temps réel** :
- Temps écoulé (MM:SS)
- ETA calculé dynamiquement
- Vitesse import (animes/min)
- Stats finales (temps total + vitesse moyenne)
- Compteurs : importés, mis à jour, ignorés, erreurs

**Traduction automatique synopsis** :
- Groq AI (llama-3.3-70b-versatile)
- Background non-bloquant post-sync
- Rate limiting intelligent (3.5s, retry 10s/20s)
- Progression détaillée (compteurs, ETA, durée)
- Quota gratuit : 14 400 traductions/jour

### Traductions françaises automatiques

**Dictionnaire translations.ts** (150+ termes) :

**Genres (21)** :
- Comedy → Comédie
- Fantasy → Fantastique
- Drama → Drame
- Romance → Romance
- Etc.

**Thèmes (60+)** :
- School → École
- Reincarnation → Réincarnation
- Time Travel → Voyage temporel
- Supernatural → Surnaturel
- Etc.

**Demographics** :
- Shounen → Shōnen
- Seinen → Seinen
- Shoujo → Shōjo
- Josei → Josei

**Sources** :
- Game → Jeu vidéo
- Original → Œuvre originale
- Light novel → Light novel
- Manga → Manga

**Statuts** :
- Finished Airing → Terminé
- Currently Airing → En cours
- Not yet aired → À venir

**Ratings** :
- PG-13 → PG-13 - Adolescents 13 ans et +
- R → R - 17+ (violence & profanité)
- Etc.

**Saisons** :
- Summer → Été
- Winter → Hiver
- Spring → Printemps
- Fall → Automne

### Vues collection

**Grille (Grid)** :
- Cartes avec image + informations complètes
- Badges type + plateforme
- Progression visible
- Bannières diagonales colorées
- Responsive 2-6 colonnes

**Liste (List)** :
- Vue verticale compacte
- Miniatures + progression inline
- Affichage dense
- Tri multiple

**Images uniquement (Images)** :
- Focus couvertures haute définition
- Grille responsive auto-fill (200px min)
- Hover pour infos rapides
- Idéal pour collections visuelles

**Bannières diagonales** (mode Grille) :
- Vert : Terminé
- Orange : En cours
- Gris : Abandonné
- Rouge : À regarder

---

## 🎮 GESTION AVN (Adult Visual Novels)

### Scraping F95Zone

**Recherche par ID** :
- Handler `addAvnFromF95(thread_id)`
- Scraping direct HTML avec regex robustes
- Décodage HTML entities automatique

**Données extraites** :
- Titre complet
- Version actuelle
- Statut jeu (Completed, Abandoned, Ongoing → EN COURS, TERMINÉ, ABANDONNÉ)
- Moteur (RenPy, Unity, RPGM, Unreal, HTML, etc.)
- Tags multiples (JSON array)
- Image couverture pleine résolution (suppression /thumb/)

**Téléchargement images** :
- Electron.net.request (moteur Chromium)
- Contournement CORS (headers User-Agent, Referer, Accept)
- Validation magic bytes (JPEG, PNG, WEBP, AVIF)
- Extension automatique ajoutée
- Stockage local : `covers/avn/{slug}/cover.jpg`
- Fallback URL distante si échec téléchargement

### Scraping LewdCorner

**Support pages LewdCorner** :
- Extraction similaire F95Zone
- Authentification requise pour accès complet
- Détection automatique protection anti-scraping

**Téléchargement images désactivé** :
- Protection anti-scraping LewdCorner (403 Forbidden persistant)
- Fallback : Stockage URL directe
- Alternative : Upload manuel via formulaire édition

**Extraction haute résolution** :
- Priorité : `<a href>` (lien parent) → `data-url` → `src` (fallback)
- Complétion URLs relatives automatique
- Debug logs améliorés

### Authentification F95Zone & LewdCorner

**Système OAuth intégré** :
- Section dédiée Paramètres AVN
- Fenêtre connexion dédiée pour chaque site
- Session cookies partagée avec app principale
- Badge statut temps réel : ✅ Connecté / ⚠️ Non connecté

**Intercepteur automatique** :
- Module `lewdcorner-interceptor.js` + `f95zone-interceptor.js`
- Injection automatique cookies dans requêtes webRequest
- Rechargement fenêtre principale après connexion (prod + dev)

**UI complète** :
- Boutons "Se connecter" / "Se déconnecter"
- Section aide collapsible "Pourquoi me connecter ?"
- Vérification session au démarrage Paramètres
- Messages inline (pas de popups)

### Ajout jeux

**Par ID F95Zone/LewdCorner** :
- Scraping automatique complet
- Tentative téléchargement image (F95: ✅, LC: fallback URL)
- Création entrée base de données

**Ajout manuel** :
- Formulaire complet personnalisé
- Accepte chemins locaux + URLs
- Tous champs éditables

**Import JSON** :
- Modal `ImportAvnJsonModal` dédiée
- Support LC Extractor (Tampermonkey LewdCorner)
- Support F95 Extractor (Tampermonkey F95Zone)
- Téléchargement images local avec fallback
- Création/MAJ automatique (détection doublon par f95_thread_id ou titre)
- Instructions intégrées dans modal

### Informations supportées

**Données globales** (table `avn_games`) :
- `f95_thread_id` : ID unique F95Zone
- `titre`, `version`, `statut_jeu`, `moteur`
- `couverture_url` : Chemin local ou URL
- `tags` : JSON array
- `lien_f95`, `lien_lewdcorner`, `lien_traduction`, `lien_jeu`, `lien_telechargement`

**Champs traduction** :
- `version_traduction` : Version traduite
- `statut_traduction` : Traduction, Traduction (Mod inclus), Traduction intégré
- `type_traduction` : Manuelle, Semi-automatique, Automatique, VO française

**Contrôle version** :
- `version_disponible` : Version détectée via scraping
- `maj_disponible` : Boolean
- `derniere_verif` : Timestamp dernière vérification

**Multi-propriétaires** :
- Table `avn_proprietaires` séparée
- Plusieurs utilisateurs peuvent posséder le même jeu

### Données utilisateur-spécifiques

**Table `avn_user_games`** (séparée des données globales) :
- `chemin_executable` : Chemin .exe du jeu (par utilisateur)
- `notes_privees` : Notes personnelles privées
- `statut_perso` : À jouer, En cours, Complété, Abandonné
- `derniere_session` : Date dernière session de jeu

**Queries jointes** :
- JOIN automatique pour récupérer données user
- Handlers séparés : Update global vs update user-specific

### Lancement jeux

- Bouton "🎮 Jouer" dans page détails
- Ouverture chemin exécutable si configuré
- MAJ automatique `derniere_session`
- Affichage date dernière session

### Filtrage et recherche

**Barre de recherche** :
- Recherche par titre de jeu
- Filtrage temps réel

**Filtres avancés** :
- **Par statut personnel** : À jouer, En cours, Complété, Abandonné
- **Par moteur** : RenPy, Unity, RPGM, Unreal, HTML, Flash, QSP, Autre
- **Par tags** (nouveau) :
  - Affichage tous les tags existants extraits des jeux
  - Sélection multiple par clic (pills interactifs)
  - Filtre ET logique : jeux doivent avoir TOUS les tags sélectionnés
  - Badge compteur nombre tags actifs
  - Bouton "Réinitialiser" pour effacer sélection
  - Scroll automatique si nombreux tags (max 200px)
  - Tri alphabétique automatique
  - UI moderne avec hover effects
- **MAJ disponible uniquement** : Checkbox pour afficher seulement jeux avec mise à jour détectée

**Compteurs visuels** :
- Nombre total de jeux
- Nombre de jeux filtrés
- Stats en temps réel

### Système MAJ automatique

**Vérification manuelle** :
- Bouton "Vérifier MAJ" dans page AVN
- Scraping complet de chaque jeu
- Comparaison intelligente données (version, statut, tags, etc.)

**Support double** :
- F95Zone : Toujours disponible
- LewdCorner : Uniquement si connecté (check cookies automatique)

**Protection images locales** :
- Détection chemin local vs URL
- Conservation automatique images déjà téléchargées
- Log explicite : "Image locale conservée (non écrasée)"

**MAJ automatiques** :
- Version, statut jeu, moteur, tags
- Image uniquement si pas de chemin local
- MAJ timestamp `derniere_verif`

**Notifications visuelles** :
- Badge 🔄 "Mise à jour disponible !" sur cartes
- Bouton "Marquer comme vu" pour dismiss notification
- Système silencieux (pas de popups)

**Délais adaptatifs** :
- F95Zone : 500ms entre requêtes
- LewdCorner : 1000ms entre requêtes
- Anti-rate-limiting intelligent

---

## 👥 MULTI-UTILISATEURS

### Gestion profils

**Création** :
- Nom utilisateur (unique)
- Avatar : Image personnalisée (drag & drop ou sélection) OU emoji
- Couleur personnalisée (color picker)
- Stockage images profil : `profiles/`

**Modification** :
- Renommer : Migration automatique toutes données utilisateur
- Changer avatar/emoji
- Changer couleur personnalisée
- Interface édition intégrée Paramètres

**Suppression** :
- Confirmation double sécurité
- Réassignation données si nécessaire
- Suppression avatar associé

**Aucune limite profils** :
- Création illimitée utilisateurs
- Idéal partage familial

### Multi-propriétaires

**Dropdown multi-sélection** :
- Sélection multiple propriétaires pour chaque tome/jeu
- Badges visuels avec couleurs utilisateurs
- Interface intuitive

**Calcul automatique coûts partagés** :
- Division automatique prix selon nombre propriétaires
- Affichage coût individuel
- Statistiques par utilisateur

**Statistiques individuelles** :
- Tomes possédés par utilisateur
- Investissement total
- Répartition collections
- Graphiques comparatifs

**Comparaison multi-users** :
- Graphiques Recharts répartition
- Tomes par propriétaire
- Coûts par propriétaire
- Évolution temporelle

### Onboarding

**4 étapes guidées** :

**1. Bienvenue** :
- Présentation application
- Fonctionnalités principales
- Navigation avec boutons

**2. Création Profil** :
- Nom utilisateur
- Avatar (image ou emoji)
- Couleur personnalisée
- Validation champs

**3. Emplacement Base de Données** :
- Sélection dossier cloud-friendly
- Support Proton Drive, OneDrive, Google Drive
- Création automatique structure dossiers

**4. Configuration Home Boarding** :
- Choix contenus affichés (Mangas, Animes, AVN)
- Customisation interface selon préférences

**5. Finalisation** :
- Récapitulatif configuration
- Validation et initialisation
- Redirection vers Dashboard

### Préférences contenu personnalisées

**Customisation Home Boarding** :
- Choix contenus affichés : Mangas, Animes, AVN
- Configuration onboarding OU édition post-config
- Modifiable depuis Paramètres → Apparence

**Sidebar dynamique** :
- Liens navigation affichés selon préférences
- Masquage automatique sections non activées
- Real-time update

**Dashboard adaptatif** :
- Sections affichées selon choix utilisateur
- KPIs dynamiques
- Carousels filtrés

**Storage & Sync** :
- Storage electron-store par utilisateur
- Event emitter pour communication changes
- Pas de refresh nécessaire

---

## 🎨 INTERFACE & NAVIGATION

### Pages principales

**Collection Mangas** :
- Titre : 📚 Collection Mangas
- Compteur séries en temps réel
- Émoji cohérent avec sidebar
- Icône vide state : 📚 (64px, opacité 0.3)

**Collection Animés** :
- Titre : 🎬 Collection Animés
- Compteur animes en temps réel
- Émoji cohérent avec sidebar
- Icône vide state : 🎬 (64px, opacité 0.3)

**Collection AVN** :
- Titre : 🎮 Collection AVN
- Compteur jeux en temps réel
- Émoji cohérent avec sidebar
- Message vide personnalisé

**Design uniforme** :
- Émojis 32px dans titres pages
- Gap 12px entre émoji et texte
- Alignement vertical centré
- Police 32px, bold 700

### Recherche globale

**Accès rapide** :
- Raccourci clavier : `Ctrl+K` (Windows/Linux) ou `Cmd+K` (Mac)
- Bouton "Rechercher..." dans sidebar avec hint du raccourci
- Modal style Spotlight avec fond blur

**Fonctionnalités** :
- Recherche unifiée dans toutes les collections (Mangas, Animes, AVN)
- Requête SQL directe dans la base de données
- Debounce 300ms pour optimiser les performances
- Limite 10 résultats par type de contenu (30 max total)

**Critères de recherche** :
- **Mangas** : Titre, description, auteurs
- **Animes** : Titre, description
- **AVN** : Titre, tags

**Affichage résultats** :
- Groupés par type avec émojis (📚 Mangas, 🎬 Animes, 🎮 AVN)
- Compteurs par catégorie
- Miniatures couvertures avec fallback émoji
- Progression affichée (tomes lus, épisodes vus, version)
- Highlight résultat sélectionné

**Navigation clavier** :
- `↑` `↓` : Naviguer entre résultats
- `Enter` : Ouvrir page détail du résultat sélectionné
- `ESC` : Fermer la recherche
- Hover souris : Sélection automatique

**Redirection intelligente** :
- Manga → `/serie/{id}`
- Anime → `/anime/{id}`
- AVN → `/avn/{id}`
- Fermeture automatique modal après sélection

**Footer aide** (si résultats) :
- `↑↓` Naviguer
- `↵` Ouvrir
- `ESC` Fermer

**État vide** :
- Message explicatif avec émoji 🔍
- Instructions claires : "Recherchez dans toutes vos collections"
- Liste types disponibles : Mangas • Animes • AVN

---

## 📊 DASHBOARD & STATISTIQUES

### Dashboard

**KPIs visuels** :
- 📚 Nombre séries mangas
- 📖 Nombre tomes possédés
- 💰 Investissement total
- 📈 Progression lecture globale
- 🎬 Nombre animes
- 🎮 Nombre jeux AVN

**Cartes progression séparées** :
- **Progression Mangas** : Séries en cours + tomes lus
- **Progression Animes** : Animes en cours + épisodes vus
- Design cohérent avec icônes

**Carousel progression unifié** :
- Fusion mangas + chapitres + animes en un seul carrousel
- Badges type : 🎬 Anime / 📚 Manga
- Tri chronologique (10 éléments récents)
- Affichage intelligent selon type :
  - Mangas : "Titre - Tome 5"
  - Scans : "Titre - 18/118 ch."
  - Animes : "Titre - 12/24 ep."

### Statistiques

**Graphique évolution temporelle** :
- Achats par mois (barres empilées)
- Dépenses par mois (ligne)
- Recharts avec animations
- Filtrage par année

**Graphique répartition** :
- Tomes par propriétaire (camembert)
- Coûts par propriétaire (camembert)
- Couleurs utilisateurs cohérentes
- Légende interactive

**Filtres avancés** :
- Par année d'achat
- Par type volume (Broché, Collector, Kindle, etc.)
- Combinaisons multiples

**Graphiques collapsibles** :
- Boutons plier/déplier
- État persistant
- Économie espace écran

**Statistiques par type volume** :
- Répartition par type (Broché, Collector, Webtoon, etc.)
- Affichage pourcentages
- Tri automatique

---

## 💾 IMPORT & EXPORT

### Import Mangas

**Tampermonkey Nautiljon** :
- Extraction complète série + tomes
- 2 modes : Import complet OU Import tomes uniquement
- Serveur local port 51234
- Déduplication intelligente (priorité VF)
- Attribution automatique propriétaire actif

**Import XML MyAnimeList** :
- OAuth sync automatique
- Import liste manga complète
- 18 champs enrichis MAL
- Matching intelligent avec Nautiljon
- Fusion conditionnelle données

**Serveur import local** :
- Port 51234 (API REST)
- Détection automatique source (URL)
- Overlay progression visuel
- Rafraîchissement automatique données

### Import Animes

**XML MyAnimeList** :
- Export depuis compte MAL (format XML standard)
- Bouton import dans Paramètres
- Import en masse avec barre progression
- Enrichissement automatique (Jikan + AniList + traduction)
- 26.2 animes/min grâce parallélisation

**Tampermonkey** :
- ADKami Episode Tracker
- Crunchyroll Episode Tracker
- ADN Episode Tracker
- MyAnimeList Quick Add

**Sync OAuth** :
- Synchronisation automatique liste anime
- Multi-saisons automatique (Crunchyroll)
- Scheduler périodique configurable

### Import AVN

**Tampermonkey F95Zone** :
- Script F95Zone AVN Extractor
- Extraction automatique depuis page F95
- Envoi JSON vers serveur local

**Import JSON** :
- Modal ImportAvnJsonModal dédiée
- Support LC Extractor (LewdCorner)
- Support F95 Extractor (F95Zone)
- Détection doublon automatique
- Téléchargement images avec fallback

**Serveur local** :
- Port 51234
- API REST réception imports
- Attribution propriétaire actif

### Import BDD

**Import base de données complète** :
- Bouton import dans Paramètres
- Sélection fichier .db externe
- Fusion automatique avec DB existante
- `INSERT OR IGNORE` pour éviter doublons
- Confirmation avant écrasement

**Merge databases** :
- Fonction `mergeDatabases()` lors changement emplacement
- Conservation toutes données existantes
- Évite perte données lors déplacement DB

### Export

**Export SQLite complet** :
- Bouton export dans Paramètres
- Sélection emplacement sauvegarde
- Format : `mangatheque_backup_YYYYMMDD_HHMMSS.db`
- Tous contenus inclus (Mangas, Animes, AVN)
- Transfert entre machines facilité
- Backup avant réinitialisation

---

## 🔄 SYNCHRONISATION MYANIMELIST

### OAuth 2.0

**Configuration** :
- Client ID MAL requis (obtenu via https://myanimelist.net/apiconfig)
- PKCE sécurisé (Proof Key for Code Exchange)
- Fenêtre authentification dédiée
- Tokens stockés localement avec electron-store
- Refresh automatique tokens expirés

### Sync unidirectionnelle

**Direction** : MAL → Application

**Contenu synchronisé** :
- Liste manga complète
- Liste anime complète
- Progression utilisateur (chapitres lus, épisodes vus)
- Scores personnels
- Dates lecture/visionnage
- Tags utilisateur

### Création automatique

**Séries/animes manquants** :
- Création automatique si pas dans DB locale
- Métadonnées complètes MAL API v2
- 18 champs manga + 28 champs anime
- Couvertures HD automatiques

### MAJ intelligente

**Comparaison local vs MAL** :
- MAJ uniquement si changements détectés
- Conservation maximum informations locales
- Fusion conditionnelle Nautiljon (mangas)
- Garde données enrichies localement

### Scheduler auto

**Configuration** :
- Périodique configurable (ex: toutes les 6 heures)
- Activable/désactivable dans Paramètres
- Exécution arrière-plan non-bloquante
- Node-cron pour scheduling
- Affichage dernière sync (date + heure)

### Traduction auto synopsis

**Groq AI intégré** :
- Modèle : llama-3.3-70b-versatile
- Lancé automatiquement après sync MAL
- Progression détaillée temps réel :
  - Compteur X/Y
  - Anime/manga en cours traduction
  - ETA calculé dynamiquement
  - Durée totale
- Rate limiting intelligent :
  - Délai 3.5s entre requêtes
  - Retry automatique 10s/20s si erreur
  - 99%+ taux succès
- Quota gratuit : 14 400 traductions/jour

---

## 🔧 SCRIPTS TAMPERMONKEY

### 6 scripts actifs

#### Anime (4 scripts)

**1. ADKami Episode Tracker** :
- Détection automatique épisodes visionnés sur ADKami
- Marquage automatique dans application
- Badge plateforme ADKami
- URL : `https://www.adkami.com/*`

**2. Crunchyroll Episode Tracker** :
- Détection épisodes visionnés Crunchyroll
- Support multi-saisons automatique
- Badge plateforme Crunchyroll
- URL : `https://www.crunchyroll.com/*`

**3. ADN Episode Tracker** :
- Détection épisodes ADN (Anime Digital Network)
- Marquage automatique progression
- Badge plateforme ADN
- URL : `https://animedigitalnetwork.fr/*`

**4. MyAnimeList Quick Add** :
- Bouton ajout rapide depuis pages MAL
- Fetch automatique métadonnées
- Import direct dans application
- URL : `https://myanimelist.net/anime/*`

#### Manga (1 script)

**Nautiljon Extractor** :
- Menu ⋮ en bas à gauche pages Nautiljon
- 2 options :
  - 📚 Import complet : Série + tous les tomes
  - 📖 Import tomes : Ajouter tomes à série existante
- Extraction complète métadonnées
- Support volumes ET chapitres
- Rate limiting adaptatif (350-1500ms)
- URL : `https://www.nautiljon.com/mangas/*`

#### AVN (1 script)

**F95Zone AVN Extractor** :
- Bouton extraction sur pages F95Zone
- Export JSON complet
- Envoi automatique vers application
- Support tous types jeux
- URL : `https://f95zone.to/threads/*`

### Serveur import local

**Configuration** :
- Port : 51234
- API REST réception imports
- Endpoints :
  - `/import-manga` : Import Nautiljon
  - `/import-anime` : Import trackers anime
  - `/import-avn` : Import F95Zone/LewdCorner
- Détection automatique source (analyse URL)
- Attribution propriétaire actif automatique

**Overlay progression** :
- Affichage visuel pendant import
- Compteurs temps réel
- Animations fluides
- Fermeture automatique après succès

### Installation guidée

**Page HTML moderne** :
- Fichier : `tampermonkey/INSTALLATION.html`
- Design responsive et professionnel
- Instructions pas-à-pas
- Liens directs vers scripts
- Ouverture navigateur par défaut

**Bouton Paramètres** :
- Section TampermonkeySettings dans Paramètres
- Bouton "Ouvrir le guide d'installation"
- Tuiles visuelles pour 4 scripts principaux
- Design cohérent avec app

**Prérequis** :
- Extension Tampermonkey installée
- Le Nexus en cours d'exécution (serveur port 51234)
- Connexion Internet stable

---

## ⚙️ PARAMÈTRES & CONFIGURATION

### 7 modules séparés

#### 1. UserManagement

**Gestion utilisateurs** :
- Liste utilisateurs existants avec avatars
- Création formulaire dédié :
  - Nom (validation unicité)
  - Avatar image OU emoji
  - Couleur personnalisée (color picker)
- Modification inline :
  - Renommer (migration auto données)
  - Changer avatar/emoji
  - Changer couleur
- Suppression avec confirmation :
  - Vérification dépendances
  - Réassignation données si nécessaire
  - Suppression avatar associé

#### 2. AppearanceSettings

**Layout 2 colonnes** :

**Colonne 1 - Thème & Lancement** :
- Toggle Dark/Light mode
- Aperçu temps réel
- Checkbox "Démarrer automatiquement Le Nexus avec Windows"
- Configuration auto-launch système

**Colonne 2 - Préférences Contenu** :
- Checkboxes : Mangas, Animes, AVN
- Customisation sidebar dynamique
- Dashboard adaptatif
- Real-time update sans refresh

#### 3. AISettings

**Configuration Groq AI** :
- Input clé API Groq
- Bouton masquer/afficher clé
- Validation clé (test ping API)
- Guide obtention clé intégré
- Lien direct : https://console.groq.com/keys

**Utilisation** :
- Traduction automatique synopsis
- Modèle : llama-3.3-70b-versatile
- 14 400 traductions/jour (gratuit)

#### 4. MALSettings

**OAuth Configuration** :
- Input Client ID MyAnimeList
- Guide obtention : https://myanimelist.net/apiconfig
- Bouton "Se connecter à MyAnimeList"
- Affichage utilisateur connecté + avatar
- Bouton "Se déconnecter"

**Synchronisation** :
- Bouton "Synchroniser maintenant" (manuelle)
- Toggle "Synchronisation automatique"
- Input intervalle (heures) : 1-24h
- Affichage dernière sync (date + heure)
- Progression temps réel avec barre

**Traduction synopsis** :
- Bouton "Traduire tous les synopsis"
- Progression détaillée :
  - Compteur X/Y
  - Nom anime/manga en cours
  - ETA dynamique
  - Durée totale
- Bouton annulation

**Import XML** :
- Bouton "Importer depuis XML"
- Sélection fichier .xml exporté depuis MAL
- Import en masse avec barre progression
- Stats finales (importés, MAJ, ignorés, erreurs)

#### 5. AVNSettings

**Section F95Zone** :
- Badge statut : ✅ Connecté / ⚠️ Non connecté
- Bouton "Se connecter à F95Zone"
- Bouton "Se déconnecter"
- Vérification session au démarrage

**Section LewdCorner** :
- Badge statut : ✅ Connecté / ⚠️ Non connecté
- Bouton "Se connecter à LewdCorner"
- Bouton "Se déconnerer"
- Vérification session automatique

**Vérification MAJ** :
- Bouton "Vérifier les mises à jour maintenant"
- Texte explicatif : Scraping direct F95/LC (pas d'API)
- Messages inline (pas de popups)
- Progression détaillée pendant vérif

**Section aide collapsible** :
- "Pourquoi me connecter ?"
- Explication protection anti-scraping
- Avantages connexion (images, MAJ, etc.)

#### 6. DatabaseSettings

**Affichage chemin actuel** :
- Path complet base de données
- Icône dossier
- Texte descriptif simplifié

**Changement emplacement** :
- Bouton "Changer l'emplacement de la base de données"
- Sélection nouveau dossier
- Merge automatique DB existante + nouvelle
- Confirmation avant copie
- Close DB avant copy + reopen après

**Import/Export** :
- Bouton "Importer une base de données"
  - Sélection fichier .db
  - Fusion automatique (INSERT OR IGNORE)
  - Confirmation avant écrasement
- Bouton "Exporter la base de données"
  - Sélection emplacement sauvegarde
  - Format : `mangatheque_backup_YYYYMMDD_HHMMSS.db`
  - Notification succès avec chemin

**Support cloud** :
- Compatible Proton Drive, OneDrive, Google Drive
- Synchronisation automatique
- Partage familial facilité

**Backup automatique** :
- **Configuration** :
  - Toggle activation backup automatique
  - Fréquences : Quotidien (2h du matin), Hebdomadaire (Dimanche 2h), Manuel uniquement
  - Nombre de backups à conserver (1-30, défaut: 7)
  - Rotation automatique (suppression anciens backups)
  
- **Backup sécurisé au lancement/arrêt** :
  - ✅ **Backup au démarrage** : Activé par défaut
  - ✅ **Backup à la fermeture** : Activé par défaut
  - Création automatique backup à chaque démarrage/arrêt de l'application
  - Sécurité maximale des données
  - Configurable indépendamment

- **Backup manuel** :
  - Bouton "Créer un backup maintenant"
  - Création instantanée
  - Notification succès avec nom fichier

- **Gestion backups** :
  - Liste backups disponibles (nom, date, taille)
  - Bouton "Restaurer" par backup
  - Confirmation avant restauration
  - Backup sécurité avant restauration
  - Bouton "Supprimer" par backup
  - Confirmation avant suppression

- **Stockage** :
  - Emplacement : `AppData/Roaming/Le Nexus/backups/`
  - Format nom : `backup_YYYY-MM-DD_HH-MM-SS.db`
  - Tri par date (plus récent en premier)

- **Restauration** :
  - Confirmation requise (opération critique)
  - Création backup sécurité automatique avant restauration
  - Rollback automatique si échec
  - Message redémarrage nécessaire

- **Affichage dernière backup** :
  - Date et heure dernière sauvegarde
  - Mise à jour automatique après chaque backup

#### 7. DangerZone

**Suppression données utilisateur** :
- Bouton rouge "Supprimer mes données de lecture"
- Confirmation modal
- Supprime uniquement données lecture utilisateur actif :
  - Table `lecture_tomes`
  - Table `anime_episodes_vus`
- Conserve séries/animes/tomes/jeux
- Conserve images

**Suppression totale application** :
- Bouton rouge foncé "TOUT SUPPRIMER"
- Confirmation double sécurité
- Supprime :
  - TOUTES les séries (mangas)
  - TOUS les animes
  - TOUS les jeux AVN
  - TOUTES les bases utilisateur
  - TOUTES les images (séries, tomes, animes, AVN)
- Conserve uniquement :
  - Images profil utilisateurs
- Redémarrage automatique application
- ⚠️ **Action irréversible**

#### 8. TampermonkeySettings

**Tuiles visuelles** :
- 4 cartes scripts principaux :
  - Nautiljon Extractor
  - ADKami Episode Tracker
  - Crunchyroll Episode Tracker
  - F95Zone AVN Extractor
- Design cohérent avec reste app
- Icônes explicites

**Guide installation** :
- Bouton "Ouvrir le guide d'installation"
- Ouverture `INSTALLATION.html` dans navigateur par défaut
- Instructions pas-à-pas
- Liens directs scripts

### Fenêtre application

**Persistance état** :
- Taille fenêtre
- Position écran
- État (maximisée/normale)
- Debounce 500ms pour éviter spam
- Restauration automatique au démarrage

**Système tray** :
- Icône dans barre système
- Tooltip "Le Nexus"
- Menu contextuel :
  - Afficher/Masquer
  - Quitter
- Click gauche : Toggle affichage
- Click droit : Menu

### Raccourcis clavier

**Ctrl+K (Cmd+K sur Mac)** :
- Ouvrir la recherche globale
- Accès rapide à tous les contenus
- Modal Spotlight

**Échap** :
- Fermer modals actives
- Retour navigation
- Fermer overlays

**F12** :
- Ouvrir/fermer DevTools
- Debug console
- Inspect éléments

### Sidebar

**Collapsible** :
- Bouton toggle en haut
- État réduit : Icônes uniquement
- État normal : Icônes + labels
- Animation fluide transition
- État persistant (electron-store)

**Navigation dynamique** :
- Liens affichés selon préférences contenu
- Masquage automatique sections désactivées
- Badges compteurs (optionnel)

**Avatar utilisateur** :
- Affichage avatar actif en haut
- Bordure couleur utilisateur
- Nom utilisateur
- Click : Dropdown changement utilisateur

---

## 🛠️ TECHNOLOGIES

### Frontend

**Framework & Bundler** :
- React 18.2.0
- TypeScript 5.3.3
- Vite 5.0.11 (build ultra-rapide)
- @vitejs/plugin-react

**Routing** :
- React Router DOM 6.21.0

**UI Components** :
- Lucide React 0.303.0 (icônes SVG)
- Color picker natif HTML5

**Graphiques** :
- Recharts 2.10.3 (graphiques interactifs)
- Charts : LineChart, BarChart, PieChart
- Animations fluides

**Styling** :
- CSS custom (index.css)
- CSS variables pour thèmes
- Animations CSS natives
- Responsive design

### Backend

**Runtime** :
- Electron 28.1.0 (Chromium + Node.js)
- Node.js 18+

**Base de données** :
- SQLite (better-sqlite3 9.2.2)
- Synchrone, ultra-rapide
- Transactions ACID
- Migrations automatiques

**Configuration** :
- electron-store 8.1.0 (config persistante)
- JSON storage avec encryption optionnelle

**Scheduling** :
- node-cron 4.2.1 (tâches périodiques)
- Sync MAL automatique
- Vérif MAJ AVN

**Build** :
- electron-builder 24.9.1
- NSIS installer Windows
- Auto-update support (désactivé par défaut)

### APIs Externes

**Mangas** :
- MangaDex API (couvertures HD)
- MangaUpdates API (métadonnées)
- Kitsu API (alternative)

**Animes** :
- Jikan API v4 (MyAnimeList unofficial)
- AniList GraphQL (couvertures HD prioritaires)
- MyAnimeList API v2 (OAuth, sync officielle)

**Traduction** :
- Groq AI (llama-3.3-70b-versatile)
- Quota gratuit : 14 400 req/jour
- Rate limit : 30 req/min

### Scraping

**F95Zone** :
- HTML parsing avec regex
- Electron.net.request (contournement CORS)
- Rate limit : 500ms entre requêtes
- Magic bytes validation images

**LewdCorner** :
- HTML parsing similaire F95
- Authentification OAuth requise
- Intercepteur cookies automatique
- Rate limit : 1000ms entre requêtes

**Nautiljon** :
- Extraction via Tampermonkey
- Rate limiting adaptatif (350-1500ms)
- Retry automatique sur 429
- Priorité VF > VO

### Services Internes

**PathManager** :
- Gestion chemins covers/DB
- Support relatif + absolu
- Cross-platform (Windows, Linux, macOS)

**CoverManager** :
- Téléchargement images intelligent
- Validation magic bytes
- Extension automatique
- Fallback URL si échec

**ImportServer** :
- Express-like API REST
- Port 51234
- CORS enabled
- Endpoints multiples

**MAL Sync Service** :
- OAuth 2.0 PKCE flow
- Token refresh automatique
- Scheduler périodique

**AVN Update Scheduler** :
- Vérif MAJ périodique (optionnel)
- Scraping F95/LC
- Notifications visuelles

**Auth Services** :
- `lewdcorner-auth.js` : OAuth LewdCorner
- `f95zone-auth.js` : OAuth F95Zone
- `lewdcorner-interceptor.js` : Injection cookies LC
- `f95zone-interceptor.js` : Injection cookies F95

---

## 📈 PERFORMANCES

### Vitesse import

**Animes** :
- Avant optimisation : ~11-12 animes/min
- Après parallélisation : **26.2 animes/min**
- **Amélioration : +118%**
- Test : 331 animes → ~12-13 min (au lieu de 27-30 min)

**Parallélisation** :
- Promise.all() : Jikan + AniList + Groq simultanés
- Wait unique 800ms après batch complet
- Traduction arrière-plan pendant traitement franchise

### Anti-gel UI

**setImmediate() dans boucles** :
- Import XML anime : pause tous les 5 animes
- Sync MAL : pause tous les 5 éléments
- Traduction : pause chaque itération
- Vérif MAJ AVN : pause tous les 3 jeux

**Résultat** :
- Application reste réactive
- UI jamais bloquée
- Animations fluides maintenues
- Annulation possible durant opérations

### Rate Limiting

**Groq AI** :
- Délai : 3.5s entre requêtes
- Retry automatique : 10s → 20s si erreur
- Taux succès : 99%+
- Quota : 14 400 traductions/jour

**AniList** :
- Délai : 800ms entre requêtes
- Limite : 90 req/min
- GraphQL optimisé (1 query = toutes infos)

**F95Zone** :
- Délai : 500ms entre scrapes
- Respect robots.txt

**LewdCorner** :
- Délai : 1000ms entre scrapes
- Authentification obligatoire

**Nautiljon** :
- Délai adaptatif : 350-1500ms
- Retry automatique sur 429
- Backoff exponentiel

### Stockage Local

**Organisation images** :
- Mangas : `covers/series/{slug}/cover.jpg` + `tomes/tome-{numero}.jpg`
- Animes : `covers/animes/{slug}/cover.jpg`
- AVN : `covers/avn/{slug}/cover.jpg`
- Profils : `profiles/{username}.{ext}`

**Avantages** :
- Évite requêtes réseau répétées
- Chargement instantané
- Fonctionne hors-ligne
- Synchronisation cloud automatique

### Matching intelligent

**Normalisation Unicode** :
- `.normalize('NFD')` : Décomposition accents
- Suppression diacritiques : `replace(/[\u0300-\u036f]/g, '')`
- Lowercase + trim + suppression ponctuation

**Distance Levenshtein** :
- Implémentation complète algorithme
- Seuil adaptatif selon longueur :
  - Titres courts (≤10 car) : tolérance 1
  - Titres moyens (11-20) : tolérance 2
  - Titres longs (>20) : tolérance 3

**4 critères matching** :
- Titre Nautiljon ↔ Titre DB
- Titre Nautiljon ↔ Alternatif DB
- Alternatif Nautiljon ↔ Titre DB
- Alternatif Nautiljon ↔ Alternatif DB

**Fusion conditionnelle** :
- Nautiljon écrase UNIQUEMENT si valeur présente
- Conservation maximale données existantes
- Préservation ratings, genres MAL, etc.

---

## 🔒 SÉCURITÉ & VIE PRIVÉE

✅ **Données 100% locales**  
- Stockage SQLite sur disque local
- Aucun serveur distant
- Aucune télémétrie

✅ **Pas de tracking**  
- Zero analytics
- Aucune collecte données usage
- Aucun beacon

✅ **Tokens MAL stockés sécurisé**  
- electron-store avec encryption
- Refresh automatique tokens expirés
- Jamais envoyés à tiers

✅ **Clé API Groq masquable UI**  
- Input password type
- Toggle affichage
- Validation côté client uniquement

✅ **Sessions LewdCorner/F95Zone locales**  
- Cookies stockés partition Electron
- Pas de partage cross-domain
- Nettoyage automatique déconnexion

✅ **Cloud optionnel**  
- Support Proton Drive (chiffrement E2E)
- OneDrive, Google Drive
- Synchronisation passive (pas de monitoring actif)

✅ **Open Source potentiel**  
- Code auditable
- Aucune obfuscation
- Transparence totale

---

## 📝 NOTES DÉVELOPPEMENT

### Architecture

**Séparation Frontend/Backend** :
- Frontend : `src/` (React + TypeScript)
- Backend : `electron/` (Node.js + Electron)
- Communication : IPC (Inter-Process Communication)

**Organisation modules** :
- `electron/apis/` : Modules API externes (11 fichiers)
- `electron/handlers/` : IPC handlers (10 fichiers)
- `electron/services/` : Services internes (6 fichiers)
- `electron/utils/` : Utilitaires partagés (3 fichiers)
- `src/components/` : Composants React (30+ fichiers)
- `src/pages/` : Pages principales (8 fichiers)
- `src/hooks/` : Custom hooks (3 fichiers)

### Fichiers clés

**Backend** :
- `electron/main.js` : Entry point Electron
- `electron/preload.js` : Bridge sécurisé IPC
- `electron/services/database.js` : Schéma + migrations
- `electron/services/import-server.js` : API import Tampermonkey
- `electron/config.js` : Configuration centralisée

**Frontend** :
- `src/App.tsx` : Router principal
- `src/main.tsx` : Entry point React
- `src/index.css` : Styles globaux + thèmes
- `src/types.ts` : TypeScript interfaces
- `src/utils/translations.ts` : Dictionnaire traductions

**Configuration** :
- `package.json` : Dépendances + scripts + build config
- `vite.config.ts` : Configuration Vite
- `tsconfig.json` : Configuration TypeScript
- `electron-builder.yml` : Build configuration (intégré dans package.json)

### Conventions code

**Commits** :
- Langue : Français
- Préfixes :
  - `feat:` Nouvelle fonctionnalité
  - `fix:` Correction bug
  - `docs:` Documentation
  - `refactor:` Refactoring sans changement fonctionnel
  - `style:` Formatage, style
  - `test:` Tests
  - `chore:` Maintenance, build, etc.

**Branches** :
- Branche principale : `main`
- Feature branches : `feature/nom-fonctionnalite`
- Hotfix : `hotfix/nom-bug`

**Règles Git** :
- Pas de force push sur `main`
- Pas de commit direct sur `main` (sauf owner)
- Pull requests pour features importantes
- Squash commits si historique verbeux

**Style code** :
- TypeScript strict mode
- ESLint (configuration par défaut React)
- Prettier (formatage automatique)
- Nommage : camelCase variables, PascalCase composants

---

## 🎯 ROADMAP

### Court terme (1-2 mois)

1. **Visualiseur images plein écran**
   - Lightbox modal fond semi-transparent
   - Navigation clavier (Échap, flèches)
   - Zoom et pan grandes images
   - Applicable toutes pages

2. **Import automatique trackers anime optimisé**
   - ADKami : Améliorer détection nombre réel épisodes
   - Crunchyroll : Optimiser détection multi-saisons

3. **Support Kitsu API complet**
   - Alternative AniList/Jikan
   - Métadonnées complémentaires

4. **Prévisions coût séries en cours**
   - Estimation basée historique prix
   - Projection budget futur

### Moyen terme (3-6 mois)

1. **Application mobile Android**
   - Interface tactile adaptée
   - Connexion DB cloud partagée
   - Fonctionnalités lecture simplifiées
   - APK installable

2. **Mode hors-ligne complet**
   - PWA-like functionality
   - Cache données essentielles
   - Sync différée

3. **Synchronisation bidirectionnelle**
   - MAL/AniList → App + App → MAL/AniList
   - Push modifications locales
   - Résolution conflits

4. **Notifications desktop**
   - Nouveaux épisodes disponibles
   - MAJ AVN détectées
   - Sync MAL terminée

### Long terme (6+ mois)

1. **Gestion éditions manga**
   - Variantes (Collector, Deluxe, Intégrale)
   - Comparaison éditions
   - Historique rééditions

2. **Liens directs plateformes streaming**
   - Ouvrir Crunchyroll/Netflix directement
   - Deep links vers épisodes spécifiques

3. **Import CSV personnalisé**
   - Format flexible pour mangas
   - Mapping colonnes configurable

4. **Enrichissement auto métadonnées**
   - Refresh périodique données
   - Détection changements (nouvelles couvertures, synopsis, etc.)

---

**💜 Le Nexus - Votre hub de collections multimédias**

**Développeur** : Rory Mercury 91  
**Version actuelle** : 3.0.2  
**Dernière mise à jour** : 26 octobre 2025  
**Licence** : Propriétaire

---
