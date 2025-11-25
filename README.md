# Le Nexus

Application de gestion de collections multimédias (Mangas, Animés, Films, Séries TV, Jeux Adultes) développée avec Electron et React.

## ✨ Fonctionnalités

### 📚 Gestion des Mangas
- Gestion complète de vos séries de mangas (volumes ET chapitres)
- Suivi détaillé de chaque tome et progression des scans/manhwa
- Import automatique depuis **Nautiljon** via script Tampermonkey
- Import complet (série + tomes) ou import de tomes uniquement
- **Enrichissement automatique** : Synchronisation avec Jikan API pour métadonnées complètes
- **Nettoyage intelligent des titres** : Déduplication automatique des titres alternatifs (romaji, natif, anglais)
- **Propagation logique des relations** : Relations bidirectionnelles automatiques (prequel/sequel, adaptations)
- Masquage de séries (conserve les données pour les autres utilisateurs)
- Recherche et filtres avancés

### 🎬 Gestion des Animes
- Suivi de vos séries animées avec architecture MyAnimeList pure
- Import XML depuis MyAnimeList + Sync OAuth automatique
- Gestion complète des épisodes (TV, Movie, OVA, ONA, Special)
- Progression de visionnage avec timestamps précis
- 28 champs enrichis (titres multiples, genres, thèmes, studios, etc.)
- Traduction automatique synopsis (Groq AI)
- **Enrichissement automatique** : Synchronisation avec Jikan API et AniList pour métadonnées complètes
- **Liens de streaming** : Intégration AniList (Netflix, Crunchyroll, Disney+, Prime Video, etc.)
- **Propagation logique des relations** : Relations bidirectionnelles automatiques (prequel/sequel, adaptations)
- Scripts Tampermonkey (Nautiljon, MyAnimeList)

### 🎮 Gestion des Jeux Adultes
- Scraping automatique **F95Zone** et **LewdCorner**
- Recherche par ID avec extraction complète (titre, version, statut, moteur, tags)
- **Authentification F95Zone & LewdCorner** : Système OAuth intégré pour accès contenu protégé
- Vérification automatique des mises à jour avec notifications
- Import JSON depuis scripts Tampermonkey (F95 Extractor, LC Extractor)
- Données utilisateur-spécifiques : chemin exécutable, notes privées, statut personnel
- Lancement direct des jeux depuis l'application
- Protection images locales (conservation lors MAJ)
- **Protection par mot de passe** : Section verrouillable pour préserver la confidentialité

### 👥 Multi-utilisateurs
- **Onboarding au premier lancement** : Assistant guidé pour créer votre profil
- **Gestion dynamique des utilisateurs** : Création, modification, suppression depuis les Paramètres
- **Multi-propriétaires pour les tomes** : Partage de l'achat avec calcul automatique des coûts
- **Profils personnalisés** : Avatar (image ou emoji) + couleur personnalisée
- Données de lecture individuelles par utilisateur
- Masquage de séries par utilisateur

### 💰 Calculs automatiques
- Calcul des coûts totaux
- Division automatique pour les achats en commun
- Propagation automatique du prix du tome 1 aux autres tomes

### 📊 Statistiques
- **Tableau de bord épuré** avec KPIs visuels (Séries, Tomes, Investissement, Progression)
- **Graphiques interactifs** : Évolution temporelle (achats/dépenses par mois), répartition par propriétaire
- **Filtres avancés** : Par type de volume (Broché, Collector, Kindle, Webtoon, Light Novel, Scans...)
- **Graphiques collapsibles** : Plier/déplier pour plus de clarté
- Progression de lecture par série
- Carousels pour séries/animes en cours

### 🎨 Interface utilisateur
- **Mode sombre/clair** : Basculement depuis les Paramètres avec thème clair adapté (textes adaptatifs)
- **Sidebar collapsible** : Réduire la barre latérale pour afficher uniquement les icônes
- **Page Paramètres dédiée** : Interface complète avec auto-save (création/édition utilisateurs, thème, DB...)
- **Personnalisation de l'affichage** : Choisissez quelles sections afficher sur chaque type de fiche
- **Recherche globale** : Raccourci clavier Ctrl+K pour rechercher dans toutes les collections
- **Animations fluides** : Transitions CSS pour un rendu professionnel
- **Bordures dynamiques** : Couleur de l'avatar liée au profil utilisateur
- **Barres de progression** : Suivi visuel des opérations en cours (enrichissement, synchronisation)

### 🖼️ Gestion des images
- Intégration avec MyAnimeList (Jikan) et AniList pour les couvertures
- Drag & Drop pour ajouter des images rapidement
- Organisation automatique (covers/series/slug/tomes/)
- Suppression intelligente (conserve si utilisée par d'autres utilisateurs)
- Synchronisation cloud automatique

### 🎞️ Gestion des Films et Séries TV
- Import depuis **TMDb** avec métadonnées complètes
- Gestion des saisons et épisodes pour les séries TV
- Suivi de visionnage personnalisé par utilisateur
- Distribution, genres, et informations détaillées
- Couvertures HD et affiches depuis TMDb
- Personnalisation de l'affichage des sections

### 🔄 Partage et synchronisation
- Export/Import de la base de données
- Fusion automatique des bases de données familiales
- Compatible Proton Drive, OneDrive, Google Drive
- **Synchronisation MAL automatique** : Synchronisation périodique avec MyAnimeList

### 🛠️ Import automatisé
- Script Tampermonkey optimisé pour **Nautiljon** :
  - Support mangas, manhwa, webtoons et scans
  - Détection automatique du type de contenu (volume/chapitre)
  - Extraction des métadonnées complètes (titre, genres, démographie, etc.)
  - Gestion intelligente des tomes (déduplication, priorité VF)
- 2 modes d'import :
  - 📚 **Import complet** : Série + tous les tomes
  - 📖 **Import tomes uniquement** : Compléter une série existante
- Overlay visuel pendant l'import
- Rafraîchissement automatique des données

### 🔀 Fusion avancée d'entités
- **Système de fusion générique** : Disponible pour tous les types de contenu (Mangas, Animes, Films, Séries, Jeux Adultes)
- **Interface visuelle** : Modal de comparaison côte à côte (source vs cible)
- **Sélection personnalisée** : Choisissez quels champs transférer depuis la source
- **Aperçu des images** : Visualisation des couvertures avant fusion
- **Indicateurs visuels** : Flèches vertes/rouges pour les champs sélectionnés/désélectionnés
- **Suppression automatique** : La source est supprimée après fusion réussie
- Accessible depuis **Paramètres → Dev Settings**

## 🚀 Installation

### Prérequis

- Node.js 18 ou supérieur
- npm ou yarn

### Étapes

1. Installer les dépendances :
```bash
npm install
```

2. Lancer l'application en mode développement :
```bash
npm start
```

## 📦 Compilation et Release

### Build local

Pour créer un fichier exécutable Windows localement :

```bash
npm run build:win
```

Le fichier .exe sera disponible dans le dossier `dist/`.

### Build automatique avec GitHub Actions

Le projet inclut un workflow GitHub Actions qui :
- Se déclenche automatiquement lors du push d'un tag (format `v*.*.*`)
- Met à jour automatiquement la version dans `package.json` depuis le tag
- Build l'application Windows
- Crée une release GitHub avec les fichiers de build
- Envoie une notification Discord automatique

**Utilisation :**
```bash
# Mettre à jour la version manuellement (optionnel)
npm run version:update 1.2.3

# Créer et pousser le tag
git tag v1.2.3
git push origin v1.2.3
```

**Icône de l'application :**
- L'icône est située dans `assets/icon.ico`
- Elle s'affiche dans la barre des tâches, le fichier .exe et l'installateur
- Vous pouvez la remplacer par votre propre icône (format .ico)

## 🧩 Conventions de développement

### Migrations de base de données

- Toute évolution du schéma SQLite (ajout/modification de colonnes, nouvelles tables, index, triggers, etc.) doit obligatoirement passer par une **migration versionnée** dans `electron/services/database/migrations/`.
- Les migrations suivent le format horodaté (ex. `20250108_add_new_column.js`) et doivent être référencées par le gestionnaire de migrations côté Electron afin d'être exécutées au démarrage.
- Lors d'une Pull Request ou d'une revue de code, vérifiez systématiquement que la migration correspondante est présente dès qu'un changement de schéma est introduit et qu'elle couvre aussi les données existantes (valeurs par défaut, backfill, nettoyage…).

### Versioning

- Le versioning suit le [Semantic Versioning](https://semver.org/lang/fr/)
- La version est définie dans `package.json` et synchronisée avec les tags Git
- Utilisez `npm run version:update <version>` pour mettre à jour la version manuellement
- Le CHANGELOG.md suit le format [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)

## ⚙️ Configuration

### Première utilisation

Au premier lancement, un **assistant d'onboarding** vous guide en 4 étapes :

1. **Bienvenue** : Présentation de l'application
2. **Création de profil** : Nom, avatar (image ou emoji) et couleur personnalisée
3. **Emplacement de la base de données** : Sélectionner un dossier (de préférence cloud synchronisé)
4. **Récapitulatif** : Validation et finalisation

L'application créera automatiquement la structure de dossiers et initialisera votre base de données.

### Gestion des utilisateurs (Paramètres)

Après l'onboarding, vous pouvez gérer les utilisateurs depuis **Paramètres** :
- **Créer** de nouveaux utilisateurs (nom, avatar, couleur)
- **Modifier** un profil existant
- **Supprimer** un utilisateur (demande confirmation)
- **Changer le thème** : Mode sombre ou clair

### Types de volumes supportés

L'application supporte **9 types de volumes** pour une indexation complète :
- **Broché** (défaut pour imports automatiques)
- **Broché Collector**
- **Coffret**
- **Kindle** (numérique)
- **Webtoon** (numérique)
- **Webtoon Physique**
- **Light Novel**
- **Scan Manga**
- **Scan Webtoon**

### Structure des dossiers

L'application crée automatiquement :

```
Le Nexus/
├── configs/
│   └── manga.db              ← Base de données principale
├── covers/
│   └── series/
│       ├── one-piece/
│       │   ├── cover.jpg     ← Couverture de la série
│       │   └── tomes/
│       │       ├── tome-1.jpg
│       │       ├── tome-2.jpg
│       │       └── ...
│       └── ...
└── profiles/
    ├── utilisateur1.jpg      ← Avatars personnalisés
    ├── utilisateur2.png
    └── ...
```

### Dossier de stockage partagé

1. Cliquer sur "Paramètres" dans la barre latérale
2. Cliquer sur "Changer le dossier"
3. Sélectionner votre dossier Proton Drive/OneDrive/Google Drive synchronisé
   - Exemple : `C:\Users\VotreNom\Proton Drive\...\Le Nexus`
4. L'application créera automatiquement la structure

## 🔗 Scripts Tampermonkey

Les scripts sont disponibles dans le dossier `tampermonkey/`.

### Installation

1. Installer l'extension **Tampermonkey** dans votre navigateur
2. Ouvrir le fichier du script souhaité (`.user.js`)
3. Cliquer sur "Installer"
4. Le bouton d'import apparaîtra automatiquement sur les pages compatibles

### Script Nautiljon

**Données extraites** :
- ✅ Titre, titre alternatif, genres, démographie (Manga/Manhwa/Manhua)
- ✅ Synopsis, couverture série, année de publication
- ✅ Statut de publication (priorité VF)
- ✅ Support volumes ET chapitres (scans, webtoons)
- ✅ Extraction tome par tome : image, date, ISBN, prix
- ✅ Déduplication intelligente (priorité éditions françaises)

**Boutons disponibles** :
- 📚 **Import complet** : Crée la série + importe tous les tomes
- 📖 **Tomes uniquement** : Ajoute des tomes à une série existante

### Utilisation

1. Naviguez vers une page manga sur **Nautiljon**  
   Exemple : `https://www.nautiljon.com/mangas/one+piece.html`

2. Cliquez sur le bouton souhaité (📚 ou 📖)

3. L'extraction démarre automatiquement :
   - Progression visible dans la console (`F12`)
   - Notification de succès/erreur
   - Rafraîchissement automatique de l'UI

**Exemple** :
- Importer "Chainsaw Man" → Série créée avec 16 tomes, couvertures HD
- Compléter avec le tome 17 plus tard → Cliquer sur 📖 (tomes uniquement)

Voir `tampermonkey/README.md` pour le guide complet.

## 👁️ Masquage de séries

Permet de masquer une série de votre vue sans la supprimer pour les autres utilisateurs.

### Comment masquer

1. Survoler une série dans la collection
2. Cliquer sur le bouton **orange** (🚫) en bas à gauche
3. Confirmer → La série disparaît de votre vue + vos données de lecture sont supprimées

### Afficher les séries masquées

1. Dans la page Collection
2. Cocher "Afficher les séries masquées"
3. Les séries masquées apparaissent avec un bouton **bleu** (👁️)
4. Cliquer pour démasquer

**Important** : Le masquage est **personnel**. Si un utilisateur masque une série, les autres utilisateurs la voient toujours.

## 🗑️ Suppression intelligente

### Suppression de tome
- Supprime le tome de la base de données
- Supprime l'image associée

### Suppression de série

**Si la série est unique à vous** :
- ✅ Supprime la série de `manga.db`
- ✅ Supprime toutes les images (dossier complet)
- ✅ Supprime vos données de lecture

**Si d'autres utilisateurs l'ont aussi** :
- ❌ Conserve la série dans `manga.db`
- ❌ Conserve les images
- ✅ Supprime uniquement vos données de lecture
- 💡 **Conseil** : Utilisez plutôt le bouton "Masquer"

## 📤 Partage de la base de données

### Export

1. Cliquer sur "Exporter" dans la barre latérale
2. Choisir l'emplacement de sauvegarde
3. Partager le fichier .db généré

### Import

1. Cliquer sur "Importer" dans la barre latérale
2. Sélectionner le fichier .db reçu
3. Confirmer le remplacement des données

### Import d'animes (MyAnimeList)

1. Exporter votre liste depuis MyAnimeList (format XML)
2. Dans Paramètres → "Importer des animes"
3. Sélectionner le fichier XML
4. Suivi de la progression avec barre détaillée
5. Les animes sont importés avec leurs métadonnées complètes

## 🔄 Partage familial (Cloud)

**Configuration recommandée :**

1. Créez un dossier partagé dans votre cloud : `Le Nexus/`
   - Proton Drive, OneDrive, Google Drive, etc.
2. **Chaque membre de la famille** configure ce dossier dans l'onboarding ou Paramètres
3. **Chaque personne crée son profil** avec son propre nom et avatar

**Fonctionnement :**
- ✅ **Base de données unique** (`manga.db`) partagée entre tous
- ✅ **Multi-propriétaires** : Plusieurs personnes peuvent posséder le même tome
- ✅ **Données de lecture individuelles** : Chacun a ses propres marques "Lu/Non lu"
- ✅ **Images synchronisées** automatiquement
- ✅ **Vue complète** de toute la collection familiale
- ✅ **Pas de doublons** : Même série = une seule entrée
- ✅ **Ajout de tomes sans conflit** : Import automatique avec attribution au propriétaire actuel

**Exemple d'usage :**
- Utilisateur A importe "One Piece" tome 1 → Il en est propriétaire
- Utilisateur B achète le tome 2 → Multi-sélection : A + B propriétaires, coût divisé automatiquement

## 🛡️ Gestion des données

### Supprimer vos données de lecture

Dans Paramètres → Zone dangereuse → **Supprimer mes données**
- Supprime vos données de lecture (lecture_tomes, lecture_episodes)
- Conserve les séries et animes
- Ne supprime pas les images

### Réinitialiser l'application

Dans Paramètres → Zone dangereuse → **TOUT supprimer**
- Supprime TOUTES les séries et animes
- Supprime TOUTES les bases utilisateur
- Supprime TOUTES les images
- Conserve uniquement les images de profil
- L'application redémarre automatiquement

⚠️ **Action irréversible** : Utilisez l'export avant de réinitialiser !

## 📊 Structure des données

### Série (Manga)
- Titre, statut, type de volume, description
- Genres, démographie, langue originale
- Année de publication, nombre de chapitres
- Couverture (automatique depuis MyAnimeList/AniList ou personnalisée)

### Tome
- Numéro, prix, **multi-propriétaires** (partage possible), date d'achat
- Type de volume (Broché, Collector, Kindle, Webtoon, Light Novel, Scan...)
- Couverture (automatique depuis import ou personnalisée)
- Lu/Non lu par utilisateur

### Série (Anime)
- Titre, type, statut, année, rating
- Nombre d'épisodes, saisons
- Couverture (automatique depuis Jikan/MyAnimeList)

### Épisode
- Numéro, saison
- Visionné/Non visionné par utilisateur

## 🛠️ Technologies

- **Frontend** : React, TypeScript, Vite
- **Backend** : Electron
- **Base de données** : SQLite (better-sqlite3) avec migrations automatiques
- **API externes** : 
  - **MyAnimeList** (via Jikan API) - recherche, métadonnées et enrichissement animes/mangas
  - **AniList** - couvertures HD et liens de streaming
  - **TMDb** - import et métadonnées films/séries TV
  - **Groq AI** - traduction automatique des synopsis
  - **Nautiljon** (import mangas via Tampermonkey)
  - **F95Zone & LewdCorner** - scraping et vérification mises à jour jeux adultes
- **Icônes** : Lucide React
- **Build** : Electron Builder
- **CI/CD** : GitHub Actions (build automatique et notifications Discord)

## 📝 Licence

Projet personnel - Tous droits réservés
