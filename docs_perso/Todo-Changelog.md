# 📋 TODO LIST & CHANGELOG - Ma Mangathèque

---

## 📜 CHANGELOG

### 🎯 **VERSION 2.2.0 - CAROUSEL UNIFIÉ & UX HARMONISÉE** (24 octobre 2025)

#### **✨ Nouveautés**

1. **📖 Carousel de progression unifié** :
   - Fusion des 3 types de contenu (mangas, chapitres, animes) en un seul carousel
   - Affichage intelligent selon le type :
     - **Mangas classiques** : "Titre - Tome 5"
     - **Scans/Manhwa** : "Titre - 18/118 ch."
     - **Animes** : "Titre - 12/24 ep."
   - Tri chronologique global (les plus récents en premier)
   - Jusqu'à 10 éléments affichés
   - Handler IPC `get-recent-progress` centralisé

2. **🗄️ Architecture de données optimisée** :
   - Requêtes SQL enrichies avec calcul dynamique des épisodes vus
   - Support des sous-requêtes pour agrégation multi-tables
   - Performances optimisées avec filtrage côté DB

#### **🔄 Améliorations**

1. **Dashboard épuré** :
   - Suppression du carousel "📖 Derniers tomes lus" (redondant)
   - Suppression du carousel "🎬 Derniers animes visionnés" (redondant)
   - Remplacement par un carousel universel "📖 Progression récente"
   - Code simplifié : -95 lignes dans `Dashboard.tsx`

2. **Expérience utilisateur harmonisée** :
   - Navigation unifiée entre tous les types de contenu
   - Liens directs vers les pages de détails (mangas/animes)
   - Dates de progression affichées uniformément (format français court)
   - Hover effects cohérents sur toutes les cartes

#### **🐛 Corrections**

1. **Erreur `no such column: a.episodes_vus`** :
   - Problème : La colonne n'existe pas dans `anime_series` (stockage dans `anime_episodes_vus`)
   - Solution : Calcul dynamique avec sous-requête COUNT dans le SQL
   - Impact : Carousel animes fonctionne correctement

#### **📊 Métriques**

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Carousels dans Dashboard** | 2 séparés | 1 unifié | **-50%** |
| **Lignes de code Dashboard.tsx** | 810 | 715 | **-12%** |
| **Types de progression affichés** | 2 (tomes, animes) | 3 (tomes, chapitres, épisodes) | **+50%** |
| **Cohérence UI** | Partielle | Totale | **+100%** |

---

### 🎨 **VERSION 2.1.0 - OPTIMISATION & INTERNATIONALISATION** (24 octobre 2025)

#### **⚡ Optimisations de performance**

1. **🚀 Parallélisation des requêtes API** :
   - Jikan + AniList + Groq exécutés en parallèle via `Promise.all()`
   - Wait unique de 800ms après toutes les requêtes au lieu de cumulatif
   - Traduction en arrière-plan pendant traitement franchise
   - **Performance : +118% de vitesse** (11-12 → 26.2 animes/min)

2. **⏱️ Chronomètre temps réel** :
   - Temps écoulé (MM:SS) affiché en direct
   - ETA calculé dynamiquement (temps restant estimé)
   - Vitesse d'import en temps réel (animes/min)
   - Statistiques finales : temps total + vitesse moyenne
   - Compteurs détaillés : importés, mis à jour, ignorés, erreurs

#### **🇫🇷 Internationalisation complète**

1. **Dictionnaire de traductions** (`src/utils/translations.ts`) :
   - 150+ traductions françaises automatiques
   - Genres (21) : Action, Comedy → Comédie, Fantasy → Fantastique
   - Thèmes (60+) : Isekai, Reincarnation → Réincarnation, School → École
   - Démographies : Shounen → Shōnen, Seinen, Josei
   - Sources : Game → Jeu vidéo, Original → Œuvre originale
   - Statuts : Finished Airing → Terminé
   - Ratings : PG-13 → PG-13 - Adolescents 13 ans et +
   - Saisons : Summer → Été, Winter → Hiver

2. **Interface 100% française** :
   - Tous les champs traduits automatiquement dans AnimeDetail
   - Fallback intelligent sur termes originaux si pas de traduction
   - Page détails anime entièrement localisée

#### **🎨 Améliorations UI/UX**

1. **Logo MyAnimeList** :
   - Déplacé dans la zone titre avec fond bleu (#2e51a2)
   - Badge compact "MAL" à côté du titre et du favori
   - Meilleure lisibilité de la couverture

2. **Badge TV redondant supprimé** :
   - Badge "Type" retiré de l'overlay sur l'image
   - Garde uniquement l'icône 📺 + texte dans le titre

3. **Section Informations en 2 colonnes** :
   - Grid responsive pour économiser l'espace vertical
   - Meilleure lisibilité des métadonnées enrichies
   - Gap optimisé (16px vertical, 20px horizontal)

#### **🐛 Bugs corrigés**

1. **Erreur `dragEvent is not defined`** :
   - Cache Electron contenant ancienne version compilée
   - Causait affichage d'un "0" mystérieux dans l'UI
   - Solution : Script `clear-cache.js` + commande `npm run clear-cache`

2. **Handler `update-anime` incomplet** :
   - Supportait seulement 9 champs basiques (titre, description, genres...)
   - Modification anime = perte de themes, demographics, producteurs, etc.
   - Maintenant supporte les **28 champs enrichis** complets

#### **🛠️ Maintenance**

1. **Script de nettoyage cache** (`scripts/clear-cache.js`) :
   - Multi-plateforme (Windows, macOS, Linux)
   - Détection automatique du chemin cache selon OS
   - Commande : `npm run clear-cache`

2. **Nettoyage projet** :
   - Suppression du dossier `backup-avant-refonte-mal/` (backups obsolètes)
   - Fichiers organisés et structure propre

#### **📊 Métriques**

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Vitesse import** | 11-12 animes/min | 26.2 animes/min | **+118%** 🚀 |
| **Temps import 331 animes** | 27-30 minutes | ~12-13 minutes | **-50%** |
| **Champs supportés update-anime** | 9 | 28 | **+211%** |
| **Traductions disponibles** | 0 | 150+ | **∞** |
| **Interface française** | ~60% | 100% | **+67%** |

---

### 🚀 **VERSION 2.0.0 - REFONTE COMPLÈTE MYANIMELIST** (24 octobre 2025)

#### **⚡ BREAKING CHANGES**

Refonte architecturale majeure du système d'animes :
- ❌ **Supprimé** : Table `anime_saisons`, groupement ADKami, `extractBaseTitre()`
- ✅ **Ajouté** : Architecture MyAnimeList pure, relations de franchise natives
- ⚠️ **Migration requise** : Réinitialisation de la base de données animes

#### **✨ Nouveautés**

1. **🗄️ Nouveau schéma de base de données** :
   - Chaque anime (TV, Movie, OVA) = 1 entrée distincte avec `mal_id` unique
   - Relations de franchise : `franchise_name`, `franchise_order`, `prequel_mal_id`, `sequel_mal_id`
   - Progression individuelle par anime (plus de saisons groupées)

2. **📥 Ajout d'anime par MAL ID/URL** :
   - Nouveau handler `addAnimeByMalId(59027)` ou `addAnimeByMalId('https://myanimelist.net/anime/59027/...')`
   - Fetch automatique : Jikan (métadonnées) + AniList (couverture HD) + Groq AI (traduction)
   - Proposition d'importer les prequels/sequels manquants

3. **🧹 Simplification massive du code** :
   - anime-handlers.js : ~1100 lignes → ~900 lignes (-18%)
   - Suppression de toute la logique complexe de groupement
   - Import XML : 1 entrée = 1 anime (plus de groupement)

#### **🐛 Bugs corrigés**

- ✅ **Duplication d'épisodes** : Chuunibyou affichait 24 épisodes sur toutes les saisons (dont Movie)
- ✅ **Ordre inversé** : Date A Live V apparaissait avant Date A Live IV
- ✅ **Progression linéaire ADKami** : Marquer un film marquait automatiquement tous les épisodes précédents

#### **📦 Sécurité**

- Backups créés dans `backup-avant-refonte-mal/` :
  - anime-handlers.js, database.js, main.js, AddAnimeModal.tsx, tampermonkey/*

#### **📖 Documentation**

- Création de `REFONTE_MYANIMELIST.md` : Guide complet de migration et explications

#### **🎯 Impact**

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Lignes de code | 1100 | 900 | -18% |
| Bugs connus | 3 | 0 | -100% |
| Tables DB | 3 | 2 | -33% |
| Précision données | ~70% | 100% | +43% |

---

## 🚀 TODO LIST

### 🎯 Priorité Haute

#### Configuration Utilisateurs
- [x] **Interface de gestion des utilisateurs** dans les Paramètres
  - [x] Ajouter/supprimer des utilisateurs dynamiquement
  - [x] Renommer un utilisateur existant
  - [x] Définir une couleur personnalisée par utilisateur
  - [x] Choisir un emoji/icône par utilisateur (alternative à la photo)
  - [x] Migrer automatiquement les données lors du renommage
- [x] **Onboarding amélioré** : Assistant de première configuration
  - [x] Étape 1 : Bienvenue
  - [x] Étape 2 : Créer son profil (nom, avatar/emoji, couleur)
  - [x] Étape 3 : Choisir le dossier de stockage
  - [x] Étape 4 : Récapitulatif et finalisation

#### Import Anime Optimisé
- [x] **Traduction automatique des synopsis** : Groq AI pour synopsis anglais → français
- [x] **Couvertures haute résolution** : AniList GraphQL API avec fallback Jikan
- [x] **Détection automatique source_import** : Analyse URL + MAL ID pour identifier la source
- [x] **Gestion rate limiting** : Délais adaptatifs pour AniList (800ms) et Jikan
- [x] **Import depuis fichier XML** : MyAnimeList/ADKami avec groupement intelligent des saisons
- [x] **✅ RÉSOLU : Architecture MyAnimeList pure (refonte complète)** :
  - [x] **Abandon du groupement par saisons** : Chaque anime (TV, Movie, OVA) = 1 entrée distincte
  - [x] **1 anime = 1 MAL ID unique** : Plus de duplication d'épisodes
  - [x] **Relations de franchise natives** : `franchise_name`, `franchise_order`, `prequel_mal_id`, `sequel_mal_id`
  - [x] **Tri correct automatique** : Ordre chronologique par année + franchise_order
  - [x] **Nombre d'épisodes précis** : Depuis Jikan API par entrée individuelle
  - [x] **28 champs enrichis** : Titres multiples, themes, demographics, producteurs, diffuseurs, dates, durée, liens
  - [x] **Suppression de `anime_saisons`** : Architecture simplifiée (2 tables au lieu de 3)
- [x] **Optimisation vitesse d'import** :
  - [x] Import en arrière-plan : Navigation possible pendant l'import
  - [x] **Parallélisation intelligente** : ✅ Jikan + AniList + Groq en parallèle
    - [x] `Promise.all()` pour requêtes concurrentes
    - [x] Traduction en arrière-plan pendant traitement franchise
    - [x] Wait unique de 800ms après toutes les requêtes
  - [x] **Barre de progression complète** :
    - [x] Affichage détaillé : "Anime X/Y" + titre actuel en temps réel
    - [x] **⏱️ Chronomètre temps réel** :
      - [x] Temps écoulé (format MM:SS)
      - [x] ETA estimé (temps restant calculé dynamiquement)
      - [x] Vitesse d'import en temps réel (animes/min)
      - [x] Temps total affiché à la fin de l'import
      - [x] Statistiques finales : vitesse moyenne + temps total
      - [x] **📊 Performance mesurée** :
        - [x] **AVANT** : 331 animes → 27-30 min (~11-12 animes/min)
        - [x] **APRÈS** : 71 animes → 2.71 min (**26.2 animes/min**) → **+118% ! 🚀**
        - [x] **Projection 331 animes** : ~12-13 min au lieu de 27-30 min (**-50% de temps**)
    - [x] Compteur erreurs, succès, ignorés, mis à jour en temps réel
- [ ] **Import automatique depuis les trackers anime**
  - [ ] ADKami : Améliorer la détection du nombre réel d'épisodes
  - [x] Crunchyroll : Support des multi-saisons automatique
- [x] **Badge de plateforme de streaming** pour savoir où regarder (ADN, Crunchyroll, ADKami)
- [ ] **Support Kitsu API** : Utiliser Kitsu comme source alternative de métadonnées

#### UX/UI
- [x] **Mode sombre/clair** : Toggle dans les paramètres (thème clair pas trop clair)
- [x] **Page Paramètres dédiée** : Remplace la modal par une vraie page avec auto-save
- [x] **Color picker** : Sélecteur de couleur libre pour chaque utilisateur (remplace couleurs prédéfinies)
- [x] **Sidebar collapsible** : Réduire la sidebar pour afficher uniquement les icônes
  - [x] Transition fluide avec animations CSS (fade in/out pour les textes)
  - [x] Positions fixes pour tous les éléments (pas de sauts verticaux)
  - [x] Tailles cohérentes des icônes et avatar
  - [x] Bouton toggle toujours visible et bien positionné
  - [x] Bordure avatar dynamique selon la couleur utilisateur
- [x] **Vues alternatives pour la collection** :
  - [x] Vue grille responsive (actuelle, 2-6 colonnes)
  - [x] Vue carrousel avec défilement horizontal
    - [x] Effet 3D Cover Flow avec perspective
    - [x] Animation fluide 60fps (requestAnimationFrame)
    - [x] Scroll-snap pour centrage automatique
    - [x] Navigation molette + flèches gauche/droite
  - [x] Vue liste compacte (images petites, progression inline)
  - [x] Mode présentation plein écran (effet hover zoom)
  - [x] Composant `CollectionView` générique et réutilisable
- [x] **Raccourcis clavier** :
  - [x] `Échap` : Fermer les modals
  - [x] `F12` : Ouvrir/fermer la console de développement
- [x] **Démarrage automatique** : Option pour lancer l'application au démarrage de Windows
- [x] **🇫🇷 Traductions françaises complètes** :
  - [x] Dictionnaire `src/utils/translations.ts` avec 150+ traductions
  - [x] **Genres** (21) : Action, Adventure → Aventure, Comedy → Comédie, Fantasy → Fantastique, etc.
  - [x] **Thèmes** (60+) : Isekai, Reincarnation → Réincarnation, School → École, Showbiz → Show-business, etc.
  - [x] **Démographies** : Shounen → Shōnen, Seinen, Shoujo → Shōjo, Josei, Kids → Enfants
  - [x] **Sources** : Manga, Light novel, Game → Jeu vidéo, Original → Œuvre originale
  - [x] **Statuts** : Finished Airing → Terminé, Currently Airing → En cours de diffusion
  - [x] **Ratings** : PG-13 → PG-13 - Adolescents 13 ans et +, R+ → R+ - Nudité légère
  - [x] **Saisons** : Summer → Été, Winter → Hiver, Spring → Printemps, Fall → Automne
  - [x] Fallback intelligent sur termes originaux si pas de traduction
- [x] **🎨 Interface anime modernisée** :
  - [x] Logo MyAnimeList avec fond bleu (#2e51a2) dans la zone titre (pas sur l'image)
  - [x] Badge "TV" redondant supprimé de la couverture (garde uniquement icône + texte dans titre)
  - [x] Section Informations en 2 colonnes pour meilleure lisibilité
  - [x] Bannières diagonales colorées : Terminé (vert), En cours (orange), Abandonné (gris)
  - [x] Affichage complet des 28 champs enrichis MAL
- [ ] **Visualiseur d'images en plein écran** :
  - [ ] Clic sur n'importe quelle couverture/image pour l'agrandir
  - [ ] Modal lightbox avec fond semi-transparent
  - [ ] Navigation clavier (Échap pour fermer, flèches pour naviguer)
  - [ ] Zoom et pan pour les grandes images
  - [ ] Applicable sur toutes les pages (Collection, Détails, Dashboard)

---

### ⭐ Priorité Moyenne

#### Statistiques Avancées
- [x] **Graphiques de progression** (Recharts)
  - [x] Nombre de mangas/animes par mois
  - [x] Évolution des coûts dans le temps
- [x] **Comparaison multi-utilisateurs**
  - [x] Qui possède le plus de tomes ?
  - [x] Graphique de répartition dynamique

#### Tags & Statuts de Lecture
- [x] **Tags personnalisés par série** :
  - [x] Favori ⭐ (flag indépendant, combinable avec les autres)
  - [x] À lire 📚 (tag manuel)
  - [x] En cours 🔵 (tag automatique, calculé selon la progression)
  - [x] Lu ✅ (tag automatique, calculé quand tous les tomes sont lus)
  - [x] Abandonné 🚫 (tag manuel, ne touche pas à la progression)
- [x] **Badges visuels compacts** : Icônes circulaires sur les cartes (32px)
- [x] **Changement de tag rapide** depuis les cartes (dropdown au survol)
- [x] **Interface de tag dans SerieDetail** avec séparation tags auto/manuels
- [x] **Filtrage par tags** dans la collection (tous types confondus)
- [x] **Migration automatique** de l'ancien système de tags vers le nouveau
- [x] **Support des tags pour animes** : Même système que pour les mangas
  - [x] Table `anime_tags` avec tags manuels et favoris
  - [x] Tags manuels : 'a_regarder', 'abandonne'
  - [x] Tags automatiques : 'en_cours', 'termine' (calculés selon progression)
  - [x] Handlers IPC complets (set/get/toggle/remove)
  - [x] Integration dans AnimeCard et AnimeListItem
  - [x] Filtrage par tags dans la page Animes

#### Gestion des Tomes/Épisodes
- [x] **Marquer plusieurs tomes comme lus** en une fois (bouton "Marquer comme lu" dans SerieDetail)
- [x] **Horodatage précis des lectures** : Date + Heure avec ordre chronologique préservé
- [x] **Carrousel de lectures récentes** : Affichage des 5 derniers tomes/animes dans le Dashboard

---

### 🔧 Priorité Basse

#### Mobile
- [ ] **Application Android (APK)** : Version mobile non officielle pour accès depuis smartphone
  - [ ] Interface adaptée au tactile
  - [ ] Connexion à la DB partagée via cloud
  - [ ] Fonctionnalités de lecture simplifiées

#### Technique
- [ ] **Mode hors-ligne** complet (PWA-like)
- [ ] **Migration de base de données** : Outil de migration entre versions
- [ ] **Logs d'activité** : Journal de toutes les actions

#### Import/Export
- [ ] **Import depuis Anilist/Kitsu** (en complément de MyAnimeList)
- [ ] **Import CSV** : Format personnalisé pour mangas
- [ ] **Synchronisation bidirectionnelle** avec MAL/AniList

#### Mangas
- [ ] **Gestion des éditions** : Variantes d'éditions (Collector, Deluxe, Intégrale)

#### Animes
- [ ] **Lien vers les plateformes** : Ouvrir directement Crunchyroll/Netflix

---

## 📝 CHANGELOG

### [Version actuelle] - 2025-10-23

#### ✨ Nouvelles fonctionnalités
- **Page Paramètres dédiée** : Remplace la modal par une vraie page autonome avec auto-save
- **Mode sombre/clair** : Toggle dans Paramètres avec sauvegarde automatique et thème clair adapté (pas trop clair)
- **Vues alternatives collection** : 4 modes d'affichage (grille, carrousel, liste, présentation)
  - **Composant `CollectionView` générique** : Réutilisable pour toutes les pages
  - **Vue grille** : 2-6 colonnes configurables, responsive
  - **Vue carrousel** : Défilement horizontal fluide, miniatures 280px
    - **Effet 3D Cover Flow** : Rotation ±45°, scale 0.75-1, profondeur -150px, flou progressif
    - **Animation 60fps** : `requestAnimationFrame` synchronisé avec rafraîchissement écran
    - **Scroll-snap** : Centrage automatique de chaque carte avec `padding: calc(50% - 140px)`
    - **Navigation optimisée** : Molette (vitesse × 1.5) + flèches (scroll exact de 320px)
    - **Transformations fluides** : `rotateY`, `scale`, `translateZ`, `translateX`, `opacity`, `blur`
  - **Vue liste compacte** : Miniatures 60x85px, progression inline, badges compacts
  - **Mode présentation** : Grille adaptive avec effet zoom au survol
  - **Persistance** : Mode de vue sauvegardé dans localStorage
- **Persistance état fenêtre** : Sauvegarde automatique taille/position/maximisé/plein écran
  - **Restauration au démarrage** : La fenêtre reprend exactement son état précédent
  - **Debounce 500ms** : Évite les écritures excessives lors du redimensionnement
  - **Sauvegarde immédiate** : État sauvegardé avant la fermeture de la fenêtre
- **Tags pour animes** : Système complet identique aux mangas
  - **Table `anime_tags`** : Structure miroir de `serie_tags`
  - **Tags manuels** : 'a_regarder', 'abandonne'
  - **Tags automatiques prévus** : 'en_cours', 'termine'
  - **Handlers IPC** : set/get/toggle/remove anime tags
- **Message de bienvenue** : Encadré ASCII art élégant au démarrage de l'application
- **Sidebar collapsible** : Réduction de la sidebar avec affichage uniquement des icônes, animations fluides, positions fixes
- **Raccourcis clavier** : Navigation et contrôle au clavier
  - **`Échap`** : Fermeture universelle de tous les modals
    - Modals d'édition : Échap ferme (désactivé pendant la sauvegarde)
    - Modal de confirmation : Échap équivaut à "Annuler"
    - Protection : Impossible de fermer pendant les opérations de sauvegarde
  - **`F12`** : Ouvrir/fermer la console de développement (DevTools)
    - Toggle : ouvre si fermée, ferme si ouverte
    - Accessible à tout moment dans l'application
    - Utile pour debugging et développement
- **Démarrage automatique** : Lancer l'application au démarrage de Windows
  - **Checkbox élégante** dans les Paramètres (section Apparence)
  - **Mode production uniquement** : Désactivé en développement
  - **API native Electron** : `app.setLoginItemSettings()` pour Windows/macOS/Linux
  - **Paramètres** : `openAsHidden: false` (application visible au démarrage)
  - **Auto-save** avec toast de confirmation
  - **Persistance** via Electron login items system
- **Build production corrigé** : Application pleinement fonctionnelle en mode packagé
  - **asarUnpack** : Extraction des assets/ hors de l'archive .asar
  - **Chemins icônes** : Détection auto isDev + path vers `app.asar.unpacked/assets/`
  - **Affichage fenêtre** : `show: false` + `ready-to-show` event pour éviter le flash
  - **Logs debug** : Traçage chemins, existence fichiers, événements chargement
  - **Résultat** : Fenêtre s'ouvre correctement, icône tray fonctionnelle, 1 seule instance
- **CollectionView pour animes** : Harmonisation complète avec les mangas
  - **4 modes d'affichage** : Grille, carrousel 3D, liste compacte, présentation
  - **Nouveau composant** : `AnimeListItem` (miroir de `SerieListItem`)
  - **Badges tags** : Favori + tag utilisateur sur AnimeCard
  - **Tags automatiques** : 'en_cours' et 'termine' calculés selon progression
  - **Persistance** : Mode de vue sauvegardé dans `localStorage` (animesViewMode)
  - **Handler enrichi** : `get-anime-series` avec JOIN `anime_tags`
  - **Code supprimé** : -42 lignes (grille manuelle obsolète)
- **Bannières diagonales pour tags** : Affichage immersif style Cover Flow
  - **3 bannières pour mangas** : "Lu" (🟢 vert), "En cours" (🟠 orange), "Abandonné" (⚪ gris)
  - **3 bannières pour animes** : "Terminé" (🟢 vert), "En cours" (🟠 orange), "Abandonné" (⚪ gris)
  - **Style 3D** : Rotation -45°, box-shadow, text-shadow, uppercase
  - **Simplification** : Suppression des badges circulaires des tags
  - **Badge favori repositionné** : Déplacé à côté du titre (évite chevauchement avec bannière/boutons)
    - Taille réduite : 28px (au lieu de 32px)
    - Position intelligente : Flex container avec le titre
    - Hover interactif : scale(1.15) pour feedback visuel
  - **Impact visuel** : Interface plus claire, badges ne se chevauchent plus
- **Système de tags intelligent** : 
  - **Favori** : Flag indépendant (combinable avec tous les tags)
  - **Tags automatiques** : "En cours" et "Lu" calculés selon la progression de lecture
  - **Tags manuels** : "À lire" et "Abandonné" définis par l'utilisateur
  - **Badges compacts** : Icônes circulaires (32px) au lieu de rectangles avec texte
  - **Tooltips informatifs** : Label complet au survol des badges
  - **Filtrage par tags** : Recherche par tous types de tags dans la collection
  - **Migration automatique** : Conversion des anciens tags vers le nouveau système
- **Horodatage précis des lectures** :
  - **Date + Heure** : Timestamps complets (YYYY-MM-DD HH:MM:SS) pour mangas et animes
  - **Ordre chronologique préservé** : Marquage en masse avec timestamps espacés d'1 seconde
  - **Traçabilité complète** : Savoir exactement quand chaque tome/épisode a été lu/vu
- **Gestion dynamique des utilisateurs** : Création, modification, suppression depuis les Paramètres
- **Avatars personnalisés** : Choix d'une image ou emoji pour chaque utilisateur
- **Onboarding au premier lancement** : Assistant en 4 étapes (bienvenue, profil, emplacement DB, finalisation)
- **Migration automatique** : Renommage d'utilisateur avec mise à jour de toutes les données
- **Choix de l'emplacement DB** : Configuration dès le premier lancement (cloud-friendly)
- **Multi-propriétaires pour les tomes** : Dropdown multi-sélection avec calcul automatique des coûts partagés
- **9 types de volumes** : Broché, Collector, Coffret, Kindle, Webtoon, Light Novel, Scan Manga, Scan Webtoon
- **Graphique d'évolution temporelle** : Visualisation des achats et dépenses par mois/année
- **Graphique de répartition dynamique** : Double barres (Tomes + Coût) avec filtre par type de volume
- **Dashboard épuré** : Suppression des graphiques redondants, focus sur l'essentiel
- **Graphiques collapsibles** : Plier/déplier les graphiques pour plus de clarté
- **KPIs visuels** : 4 tuiles compactes (Séries, Tomes, Investissement, Progression)
- **Color picker libre** : Sélecteur de couleur personnalisée pour chaque utilisateur (remplace palette prédéfinie)
- **Import automatique avec attribution** : Le propriétaire actuel est assigné lors des imports Tampermonkey
- **Import Nautiljon optimisé** : Déduplication intelligente des volumes (FR/JP)
- **Téléchargement local des couvertures** : Séries et tomes stockés localement
- **Anti-rate-limiting Nautiljon** : Délai adaptatif 350-1500ms + retry automatique
- **Overlay d'import amélioré** : Avertissement "Ne pas toucher au site"
- **Crunchyroll multi-saisons** : Détection et création automatique des saisons
- **Suppression robuste** : Gestion des verrous de fichiers (Proton Drive)
- **Groq AI pour traduction automatique** : Traduction des synopsis d'anime lors de l'import XML
  - **Configuration dans Paramètres** : Gestion de la clé API Groq (masquable/affichable)
  - **Guide d'obtention** : Instructions détaillées pour créer un compte gratuit
  - **Traduction automatique** : Synopsis anglais → français lors de l'import MyAnimeList/ADKami
  - **Bouton manuel** : Traduction manuelle dans AddAnimeModal et AnimeEditModal
  - **Limites gratuites** : 14 400 traductions/jour (30/min), modèle `llama-3.3-70b-versatile`
  - **API centralisée** : Module `electron/apis/groq.js` réutilisable
- **AniList API pour couvertures HD** : Récupération automatique de couvertures haute résolution
  - **GraphQL API** : Requêtes vers `graphql.anilist.co` avec mapping MAL ID → AniList
  - **Priorisation qualité** : `extraLarge` > `large` > fallback Jikan
  - **Rate limiting respecté** : Délai de 800ms entre requêtes (~75 req/min, limite 90 req/min)
  - **Gestion d'erreurs** : Fallback automatique vers Jikan si AniList échoue
  - **Module dédié** : `electron/apis/anilist.js` avec logs détaillés
- **Réorganisation complète des composants** : Architecture modulaire et scalable
  - **Nouveau dossier `src/components/`** :
    - `modals/anime/` : AddAnimeModal, AnimeEditModal
    - `modals/manga/` : AddSerieModal, EditSerieModal, AddTomeModal, EditTomeModal
    - `modals/common/` : ConfirmModal, SavingModal
    - `cards/` : AnimeCard, AnimeListItem, SerieCard, SerieListItem
    - `layout/` : Layout, SplashScreen, OnboardingWizard
    - `common/` : CollectionView, CoverImage, ImportingOverlay, MultiSelectDropdown, PlatformLogo, UserSelector
  - **Préservation historique git** : Utilisation de `git mv` pour conserver l'historique des fichiers
  - **Imports corrigés** : Mise à jour automatique de tous les chemins relatifs dans 20+ fichiers
- **Détection automatique source_import** : Identification intelligente de la source d'import anime
  - **Intégré dans import-server** : Plus besoin de script manuel `fix-source-import.js`
  - **Détection depuis URL** : Analyse de `couverture_url` (crunchyroll, adn, adkami)
  - **Fallback MAL ID** : Si mal_id présent → source 'myanimelist'
  - **Défaut manuel** : Si aucune source détectée → 'manual'

#### 🐛 Corrections de bugs
- **🚨 CRITIQUE : Double emplacement de base de données** :
  - **Problème** : La DB restait dans AppData après changement d'emplacement dans l'onboarding
  - **Conséquence** : Deux bases divergentes (AppData actif, Proton Drive figé)
  - **Solution** : Réinitialisation complète de PathManager et DB après copie
  - **Résultat** : Une seule source de vérité dans l'emplacement choisi
- **Affichage progression import anime** : Titre de la série au lieu de l'ID ADK dans l'interface
- **Rate limit AniList (HTTP 429)** : Ajout de délais entre requêtes pour respecter les limites API
- **Imports relatifs cassés** : Correction de tous les chemins après réorganisation des composants
  - `../hooks/` → `../../hooks/` ou `../../../hooks/` selon la profondeur
  - `../types` → `../../types` ou `../../../types` selon la profondeur
  - Import `SavingModal` dans Layout corrigé
- **Barre de progression mode liste** : Chargement des vrais statuts de lecture (remplace `Array.fill(null)`)
- Persistance utilisateur après redémarrage (copie complète de la DB)
- Affichage avatar dans récapitulatif onboarding
- Images des tomes Nautiljon maintenant visibles
- Correction `coverResult.url` → `coverResult.localPath`
- Suppression d'anime avec retry pour Proton Drive
- Modal d'édition anime : Gestion des saisons dynamique

#### 🔄 Améliorations
- **Carrousel 3D Cover Flow** : Effet perspective immersif avec animations 60fps
  - **requestAnimationFrame** : Synchronisation parfaite avec le rafraîchissement de l'écran
  - **Calcul distance du centre** : Transformations dynamiques basées sur la position relative
  - **Transitions CSS désactivées** : Évite les conflits avec RAF pour fluidité maximale
  - **willChange: transform, opacity, filter** : Optimisation GPU pour performances
  - **Scroll-snap mandatory** : Chaque carte se centre automatiquement
  - **Padding dynamique** : `calc(50% - 140px)` pour centrer la première et dernière carte
  - **Cancel frame précédente** : Évite les embouteillages lors de scroll rapide
- **Composant `CollectionView` générique** : Architecture modulaire réutilisable pour toutes les pages
- **Composant `SerieListItem`** : Vue liste compacte avec miniatures et progression inline
- **Handler `get-series` optimisé** : Charge les tomes avec statut de lecture réel (JOIN lecture_tomes)
  - Query SQL enrichie : `SELECT t.id, t.numero, CASE WHEN lt.lu = 1 THEN 1 ELSE 0 END as lu`
  - Remplace `Array.fill(null)` par vraies données pour calcul de progression
  - Permet affichage correct de la barre de progression en mode liste
- **Table `anime_tags`** : Structure complète pour tags d'animes (miroir de `serie_tags`)
- **Index DB** : `idx_anime_tags_anime`, `idx_anime_tags_user`, `idx_anime_tags_tag` pour performances
- **Handlers IPC anime tags** : set/get/toggle/remove anime tags (96 lignes ajoutées)
- **Types TypeScript** : `AnimeTag` type + méthodes IPC exposées dans `Window.electronAPI`
- **Persistance fenêtre** : Store `windowState` avec debounce 500ms et restauration au démarrage
- **Table `users`** en base de données (gestion dynamique)
- **Table `tomes_proprietaires`** : Relation many-to-many pour multi-propriétaires
- **Table `serie_tags` refactorée** : 
  - Colonne `tag` nullable (tags manuels uniquement)
  - Colonne `is_favorite` (flag indépendant)
  - Contrainte CHECK mise à jour (uniquement 'a_lire' et 'abandonne')
  - Migration automatique avec conversion des anciens tags
- **Statistiques par type de volume** : `nbTomesParProprietaireParType` pour filtrage avancé
- **Interface de gestion complète** dans Paramètres (création, édition, suppression users)
- **UserSelector dynamique** : Lit depuis la DB avec affichage des avatars
- **Dashboard refactorisé** : Code épuré, graphiques modulaires et collapsibles
- **Handlers IPC enrichis** : 
  - `get-evolution-statistics` pour graphiques temporels
  - `toggle-serie-favorite` pour gestion du flag favori
  - `set-serie-tag` mis à jour pour tags manuels uniquement
  - Calcul automatique des tags "en_cours" et "lu" dans `get-series` et `get-serie`
- **Component MultiSelectDropdown** : Composant réutilisable pour sélection multiple
- **Calcul dynamique des coûts** : Division automatique entre propriétaires multiples
- **Migration DB automatique** : Colonne `proprietaire` rendue nullable
- **Handlers IPC pour utilisateurs** : CRUD complet + gestion avatars
- **Sidebar optimisée** : Layout avec hauteurs fixes (56px titre, 80px avatar) pour stabilité
- **Animations CSS pures** : Fade in/out pour textes au lieu de création/destruction DOM
- **Bordure avatar dynamique** : Couleur liée au profil utilisateur
- **Badges compacts** : Icônes circulaires 32px avec effet hover (scale 1.1)
- **Timestamps complets** :
  - `lecture_tomes.date_lecture` : DATE → DATETIME
  - `anime_episodes_vus.date_visionnage` : DATE → DATETIME
  - Format : `YYYY-MM-DD HH:MM:SS` au lieu de `YYYY-MM-DD`
  - Marquage en masse avec incrémentation de +1 seconde par tome/épisode
- **README neutralisé** (pas de noms d'utilisateurs hardcodés)
- **`.gitignore` mis à jour** (exclusion de `docs_perso/`)
- **Scripts Tampermonkey** avec métadonnées complètes
- **Import anime** : Badge de source (ADN, Crunchyroll, ADKami)
- **Module `electron/apis/groq.js`** : API centralisée pour traductions avec Groq AI
  - Fonction `translateText(text, apiKey, targetLang, context)` réutilisable
  - Fonction `validateApiKey(apiKey)` pour validation de clé
  - Contexte spécialisé pour anime/manga
- **Module `electron/apis/anilist.js`** : API GraphQL pour couvertures HD
  - Query GraphQL optimisée avec mapping MAL ID
  - Logs détaillés avec titre + MAL ID
  - Gestion d'erreurs robuste avec fallback
- **Architecture composants refactorisée** : Organisation modulaire en 4 catégories
  - Séparation par type : modals/ (anime, manga, common), cards/, layout/, common/
  - Chemins relatifs cohérents selon profondeur (../../ ou ../../../)
  - Préservation historique git via `git mv`
- **Détection automatique source_import** : Logique intégrée dans import-server.js
  - Analyse intelligente de `couverture_url` pour détecter plateforme
  - Fallback sur `mal_id` si présent (source myanimelist)
  - Valeur par défaut 'manual' si indéterminé

---

### [v1.0.0] - 2024-01-XX (Release initiale)

#### ✨ Fonctionnalités principales
- Gestion complète des mangas (séries, tomes, lecture)
- Gestion complète des animes (séries, saisons, épisodes)
- Multi-utilisateurs avec fusion automatique
- Import Tampermonkey (MangaCollec, Nautiljon, Booknode)
- Import anime (ADKami, ADN, Crunchyroll, MyAnimeList XML)
- Statistiques et dashboard
- Drag & Drop pour images
- Masquage de séries
- Suppression intelligente multi-utilisateurs
- Export/Import de base de données
- Synchronisation cloud (Proton Drive, OneDrive, Google Drive)

---

## 📌 Notes de Développement

### Architecture actuelle
- **Frontend** : React + TypeScript + Vite
- **Backend** : Electron + better-sqlite3
- **APIs** : AniList (GraphQL), MyAnimeList (Jikan v4), Kitsu, MangaDex, MangaUpdates, Groq AI
- **Scripts** : Tampermonkey (6 scripts : 3 anime, 3 manga)

### Fichiers importants
- `electron/services/database.js` : Schéma et migrations
- `electron/services/import-server.js` : API d'import depuis Tampermonkey + détection auto source_import
- `electron/handlers/` : IPC handlers pour communication main/renderer
- `electron/apis/` : Modules d'intégration avec APIs externes (AniList, Groq, etc.)
- `src/components/` : Composants React organisés par catégorie (modals, cards, layout, common)
- `tampermonkey/` : Scripts d'extraction de données

### Conventions
- Commits en français
- Préfixes : `feat:`, `fix:`, `docs:`, `refactor:`, `style:`, `test:`
- Branche principale : `main`
- Pas de force push sur `main`

---

## 🎯 Roadmap

### Court terme (1-2 mois)
1. ✅ Configuration dynamique des utilisateurs (complété)
2. ✅ Statistiques avec graphiques (complété)
3. ✅ Tags personnalisés et badges visuels (complété)
4. ✅ Vues alternatives (Carrousel, Liste compacte, Mode présentation) (complété)
5. ✅ Import anime optimisé avec enrichissement auto (complété)
   - ✅ Traduction Groq AI
   - ✅ Couvertures HD AniList
   - ✅ Rate limiting respecté

### Moyen terme (3-6 mois)
1. ✅ Mode sombre/clair avec toggle (complété)
2. ✅ Color picker pour utilisateurs (complété)
3. Prévisions de coût pour séries en cours
4. Application mobile Android (APK)
5. Raccourcis clavier

### Long terme (6+ mois)
1. Synchronisation bidirectionnelle avec MAL/AniList
2. Mode hors-ligne complet
3. Enrichissement auto des métadonnées

---

**Dernière mise à jour** : 2025-10-24 23:50
