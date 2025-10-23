# Ma Mangathèque

Application de gestion de collection de mangas et animes développée avec Electron et React.

## ✨ Fonctionnalités

### 📚 Gestion des Mangas
- Gestion complète de vos séries de mangas
- Suivi détaillé de chaque tome
- Import automatique depuis **MangaCollec**, **Nautiljon** et **Booknode** via scripts Tampermonkey
- Import complet (série + tomes) ou import de tomes uniquement
- Masquage de séries (conserve les données pour les autres utilisateurs)
- Recherche et filtres avancés

### 📺 Gestion des Animes
- Suivi de vos séries animées
- Import XML depuis MyAnimeList
- Gestion des saisons et épisodes
- Progression de visionnage

### 👥 Multi-utilisateurs
- Gestion multi-propriétaires (configuration personnalisable)
- Données de lecture individuelles par utilisateur
- Masquage de séries par utilisateur
- Images de profil personnalisées

### 💰 Calculs automatiques
- Calcul des coûts totaux
- Division automatique pour les achats en commun
- Propagation automatique du prix du tome 1 aux autres tomes

### 📊 Statistiques
- Tableau de bord avec statistiques détaillées
- Progression de lecture par série
- Carousels pour séries/animes en cours
- Filtres de visionnage pour les animes

### 🖼️ Gestion des images
- Intégration avec MangaDex pour les couvertures
- Drag & Drop pour ajouter des images rapidement
- Organisation automatique (covers/series/slug/tomes/)
- Suppression intelligente (conserve si utilisée par d'autres utilisateurs)
- Synchronisation cloud automatique

### 🔄 Partage et synchronisation
- Export/Import de la base de données
- Fusion automatique des bases de données familiales
- Compatible Proton Drive, OneDrive, Google Drive

### 🛠️ Import automatisé
- Scripts Tampermonkey pour 3 sites :
  - **MangaCollec** (violet/orange)
  - **Nautiljon** (orange/rose)
  - **Booknode** (bleu/violet)
- 2 modes d'import :
  - 📚 **Import complet** : Série + tous les tomes
  - 📖 **Import tomes uniquement** : Compléter une série existante
- Overlay visuel pendant l'import
- Rafraîchissement automatique des données

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

## 📦 Compilation en .exe

Pour créer un fichier exécutable Windows :

```bash
npm run build:win
```

Le fichier .exe sera disponible dans le dossier `dist/`.

**Icône de l'application :**
- L'icône est située dans `assets/icon.ico`
- Elle s'affiche dans la barre des tâches, le fichier .exe et l'installateur
- Vous pouvez la remplacer par votre propre icône (format .ico)

## ⚙️ Configuration

### Première utilisation

1. **Sélection de l'utilisateur** : Choisir votre prénom parmi ceux configurés
2. **Emplacement de stockage** : Sélectionner un dossier (de préférence synchronisé)
3. **Image de profil** (optionnel) : Ajouter votre photo dans Paramètres

### Structure des dossiers

L'application crée automatiquement :

```
Ma mangathèque/
├── configs/
│   ├── manga.db              ← Base fusionnée (toutes données)
│   └── databases/
│       ├── utilisateur1.db   ← Données de lecture Utilisateur 1
│       ├── utilisateur2.db   ← Données de lecture Utilisateur 2
│       └── utilisateur3.db   ← Données de lecture Utilisateur 3
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
    ├── utilisateur1.jpg      ← Image de profil
    ├── utilisateur2.jpg
    └── utilisateur3.jpg
```

### Dossier de stockage partagé

1. Cliquer sur "Paramètres" dans la barre latérale
2. Cliquer sur "Changer le dossier"
3. Sélectionner votre dossier Proton Drive/OneDrive/Google Drive synchronisé
   - Exemple : `C:\Users\VotreNom\Proton Drive\...\Ma mangathèque`
4. L'application créera automatiquement la structure

## 🔗 Scripts Tampermonkey

Les scripts sont disponibles dans le dossier `tampermonkey/`.

### Installation

1. Installer l'extension **Tampermonkey** dans votre navigateur
2. Ouvrir le fichier du script souhaité (`.user.js`)
3. Cliquer sur "Installer"
4. Le bouton d'import apparaîtra automatiquement sur les pages compatibles

### Scripts disponibles

| Site | Bouton complet | Bouton tomes | Données |
|------|----------------|--------------|---------|
| **MangaCollec** | 📚 Violet | 📖 Orange | Titre, genres, éditeur, synopsis, tous les tomes avec images et dates |
| **Nautiljon** | 📚 Orange | 📖 Rose | Titre, type, genres, auteurs, éditeur, statut, couverture |
| **Booknode** | 📚 Bleu | 📖 Violet | Titre, auteur, thèmes, type, tous les tomes avec images et dates |

### Utilisation

**Import complet (📚)** :
- Crée la série avec toutes ses métadonnées
- Ajoute automatiquement tous les tomes disponibles
- Télécharge les couvertures

**Import tomes uniquement (📖)** :
- Recherche la série par titre (doit exister)
- N'ajoute que les tomes manquants
- Parfait pour compléter une collection depuis plusieurs sources

**Exemple d'usage** :
1. Importer "Le Huitième fils" depuis Booknode (📚) → 12 tomes, images japonaises
2. Aller sur MangaCollec, chercher la même série
3. Cliquer sur 📖 (tomes uniquement) → Ajoute le tome 13 avec image française

Voir `tampermonkey/README.md` pour plus de détails.

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

## 🔄 Fusion automatique multi-utilisateurs

**Configuration recommandée :**

**Étape 1 : Configuration initiale (une seule fois)**
1. Créez un dossier partagé dans Proton Drive : `Ma mangathèque/`
2. Tout le monde configure ce dossier dans les paramètres de l'application

**Fonctionnement automatique :**
1. **Au démarrage**, l'application scanne le dossier
2. **Détecte** les bases utilisateur (`utilisateur1.db`, `utilisateur2.db`, etc.)
3. **Fusionne automatiquement** dans `manga.db`
4. **Dédoublonne** les séries par titre
5. **Conserve tous les tomes** avec leurs propriétaires respectifs
6. **Charge les données de lecture** de l'utilisateur actuel

**Avantages :**
- ✅ Chacun peut ajouter des mangas sans conflit
- ✅ Fusion automatique au démarrage (aucune action manuelle)
- ✅ Pas de doublons (même série = une seule entrée)
- ✅ Images synchronisées automatiquement
- ✅ Vue complète de toute la collection familiale
- ✅ Données de lecture personnelles par utilisateur

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
- Couverture (automatique depuis MangaDex ou personnalisée)

### Tome
- Numéro, prix, propriétaire, date d'achat
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
- **Base de données** : SQLite (better-sqlite3)
- **API externes** : 
  - MangaDex (couvertures mangas)
  - Jikan (MyAnimeList pour animes)
  - MangaCollec, Nautiljon, Booknode (via Tampermonkey)
- **Icônes** : Lucide React
- **Build** : Electron Builder

## 📝 Licence

Projet personnel - Tous droits réservés
