# 📚 Scripts Tampermonkey pour Ma Mangathèque

Scripts d'import automatique pour faciliter l'ajout de **mangas** et **animes** dans votre collection.

---

## ⚠️ Avertissement

**Usage personnel uniquement**

Ces scripts sont conçus pour automatiser l'import de données depuis des sites web publics vers votre application locale. Ils sont fournis à titre d'exemple et d'aide personnelle.

**Important :**
- Ces scripts peuvent cesser de fonctionner si les sites modifient leur structure HTML ou API
- Respectez les conditions d'utilisation de chaque site
- Usage modéré recommandé (pas de scraping massif)
- Aucune garantie de fonctionnement ou de maintenance

---

## 📦 Scripts disponibles

### 🎬 Animes

#### 1. **ADKami Integration** 🟣🟢
- **Site** : [ADKami.com](https://www.adkami.com/)
- **URL supportées** : `/anime/*` (toutes les pages anime)
- **Fonctionnalités** :
  - **Sur `/anime/ID` ou `/anime/ID/info`** : 🟣 Bouton d'import d'anime (bas droite)
    - ✅ Import complet d'animes depuis ADKami
    - ✅ MAL ID, titre natif, couverture
    - ✅ Genres, studios, auteur, saison
    - ✅ Création automatique des saisons et épisodes
    - ✅ Description et métadonnées complètes
  - **Sur pages épisode** : 🟢 Bouton de marquage (haut droite)
    - ✅ Marquer un épisode comme vu depuis ADKami
    - ✅ Détection automatique de l'anime, saison et épisode via MAL ID
    - ✅ Synchronisation directe avec Ma Mangathèque
    - ✅ Marquage automatique du statut "Terminé" si tous les épisodes sont vus

> **⚠️ Important** : Ce script remplace les anciens scripts "ADKami Anime Extractor" et "ADKami Episode Tracker". Si vous les aviez installés, **désinstallez-les** avant d'installer ce nouveau script unifié.

#### 2. **Crunchyroll Episode Tracker** 🟠📥
- **Site** : [Crunchyroll](https://www.crunchyroll.com/)
- **URL supportées** : `/series/*` (import), `/watch/*` (marquage)
- **Fonctionnalités** :
  - **Sur `/series/*` (page principale)** : 📥 Bouton d'import orange (bas droite)
    - ✅ **Import complet depuis la page série** (JSON-LD + DOM)
    - 📸 Vraie couverture de l'anime (haute qualité, sans blur)
    - 📝 Description complète de la série
    - 🏷️ Genres nettoyés et dédupliqués (Action, Aventure, Fantastique)
    - 🎬 Détection automatique du nombre d'épisodes
    - 🏷️ Badge de source d'import (logo Crunchyroll) dans l'application
    - 🔢 **Affichage bannière pleine largeur** pour les couvertures paysage Crunchyroll
  - **Sur `/watch/*` (page épisode)** : 👁️ Bouton de marquage vert (bas droite)
    - ✅ Marquer un épisode comme vu depuis Crunchyroll
    - ✅ **Auto-incrémentation** : Marquer l'épisode 5 marque automatiquement les épisodes 1-5 comme vus
    - ⚠️ Si l'anime n'existe pas : message d'erreur → Allez sur la page série pour l'importer
  - ✅ **Auto-détection SPA** : Les boutons se mettent à jour automatiquement lors de la navigation
  - ✅ **Détection avancée des saisons** (multi-niveaux) :
    - 📊 JSON-LD (`seasonNumber`)
    - 🔍 Patterns dans le titre (`Season 2`, `S2`, `Part 2`, `Saison 2`, `Cour 2`)
    - 🧹 Nettoyage automatique du titre (ex: `"Titre Season 2"` → `"Titre"` + Saison 2)
    - 🔄 **Création automatique des saisons précédentes** : Si vous importez la saison 2, la saison 1 sera créée automatiquement (12 épisodes par défaut)
  - ✅ Marquage automatique du statut "Terminé" quand tous les épisodes sont vus
  - ✅ Synchronisation directe avec Ma Mangathèque

> **💡 Workflow recommandé** : 
> 1. Allez sur la page série (`/series/`) et cliquez sur 📥 pour importer
> 2. Regardez un épisode et cliquez sur 👁️ pour marquer comme vu
> 3. Les boutons changent automatiquement selon la page (SPA)
> 4. **Pour les séries multi-saisons** : Importez chaque saison depuis sa page dédiée

> **⚠️ Note** : Crunchyroll est une SPA (Single Page Application). Les boutons se mettent à jour automatiquement lors de la navigation, mais un délai de 1 seconde peut être nécessaire.

#### 3. **ADN Episode Tracker** 🔵 ⭐ Recommandé
- **Site** : [ADN](https://animationdigitalnetwork.com/) (AnimationDigitalNetwork)
- **URL supportées** : `/video/*`
- **Fonctionnalités** :
  - ✅ Marquer un épisode comme vu depuis ADN
  - ✅ **Auto-incrémentation** : Marquer l'épisode 5 marque automatiquement les épisodes 1-5 comme vus
  - ✅ **Import automatique optimisé** depuis la page principale de l'anime
    - 📸 Vraie couverture de l'anime (pas de capture d'écran d'épisode)
    - 🎯 Nombre réel d'épisodes (pas d'estimation)
    - 📝 Description complète et métadonnées détaillées
    - 🏢 Studios, genres, année précise
    - 🏷️ Badge de source d'import (logo ADN) dans l'application
  - ✅ Détection automatique via JSON-LD
  - ✅ Bouton flottant vert en bas à droite
  - ✅ Mise à jour automatique du bouton lors du changement d'épisode
  - ✅ Marquage automatique du statut "Terminé" quand tous les épisodes sont vus
  - ✅ Synchronisation directe avec Ma Mangathèque

> **🚀 Pourquoi ADN est recommandé ?** ADN et Crunchyroll récupèrent tous deux les données depuis les pages principales pour garantir des informations complètes. ADN est légèrement plus recommandé car il a un meilleur accès aux métadonnées complètes (nombre réel d'épisodes, studios, etc.) sur la plateforme française.

### 📚 Mangas

#### 5. **MangaCollec Extractor** 🟣
- **Site** : [MangaCollec.com](https://www.mangacollec.com/)
- **URL supportées** : `/series/*`, `/editions/*`
- **Fonctionnalités** :
  - ✅ Import via API (fiable et rapide)
  - ✅ Création automatique des tomes avec couvertures
  - ✅ Dates de sortie et ISBN
  - ✅ Genres, éditeur, auteurs, démographie
  - ✅ Interception API pour données complètes

#### 6. **Nautiljon Extractor** 🟠
- **Site** : [Nautiljon.com](https://www.nautiljon.com/)
- **URL supportées** : `/mangas/*`
- **Fonctionnalités** :
  - ✅ Import complet avec fetch multipage optimisé
  - ✅ **Déduplication intelligente des volumes** (éditions française/japonaise)
  - ✅ Création automatique des tomes avec couvertures (série + tomes)
  - ✅ Téléchargement local des images (série et tous les tomes)
  - ✅ Titre, titre alternatif, type (Shonen/Seinen/Shojo)
  - ✅ Genres et thèmes séparés
  - ✅ Auteurs, éditeur VF, synopsis complet
  - ✅ Prix automatique par tome (7.20€ par défaut si non trouvé)
  - ✅ Dates de sortie VF (seuls les tomes avec date VF sont importés)
  - ✅ Détection et import de tous les volumes disponibles
  - ✅ **Anti-rate-limiting** : Délai adaptatif 350ms → 1500ms avec retry automatique
  - ✅ **Protection contre le HTTP 429** : Backoff exponentiel (2s, 4s, 8s)

> **⚠️ Performance** : L'import de séries longues (40+ tomes) peut prendre 45-60 secondes en raison des limites de rate du serveur Nautiljon. Le script s'adapte automatiquement pour garantir un import complet sans erreur.

#### 7. **Booknode Extractor** 🔵
- **Site** : [Booknode.com](https://booknode.com/)
- **URL supportées** : `/serie/*`
- **Fonctionnalités** :
  - ✅ Import complet (titre, auteurs, thèmes, synopsis)
  - ✅ Création automatique des tomes avec couvertures
  - ✅ Dates de sortie récupérées individuellement
  - ✅ Support Manga et Light Novel
  - ✅ Scroll automatique pour lazy loading

---

## 🚀 Installation

### Étape 1 : Installer Tampermonkey

1. **Chrome/Edge** : [Tampermonkey sur Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. **Firefox** : [Tampermonkey sur Firefox Add-ons](https://addons.mozilla.org/fr/firefox/addon/tampermonkey/)
3. **Safari** : [Tampermonkey sur App Store](https://apps.apple.com/app/tampermonkey/id1482490089)

### Étape 2 : Installer les scripts

1. Cliquez sur l'icône **Tampermonkey** dans votre navigateur
2. Cliquez sur **"Créer un nouveau script..."**
3. Copiez le contenu d'un script (ex: `MangaCollec Extractor.user.js`)
4. Collez-le dans l'éditeur Tampermonkey
5. **Fichier** → **Enregistrer** (ou `Ctrl+S`)
6. Répétez pour chaque script souhaité

---

## 📖 Utilisation

### Pré-requis
✅ **Ma Mangathèque** doit être **démarrée** (l'application Electron doit tourner)

### Workflow d'import

#### 🎬 Pour les animes

1. **Lancez** Ma Mangathèque sur votre ordinateur
2. **Pour importer un anime** :
   - **ADKami** : Allez sur la page **info** (`/anime/ID` ou `/info`) et cliquez sur 📥
   - **Crunchyroll** : Allez sur la page **série** (`/series/*`) et cliquez sur 📥 (bas droite)
   - L'anime sera ajouté avec ses saisons et épisodes
3. **Pour marquer un épisode comme vu** :
   - **ADN** : Le bouton ✅ apparaît sur la page épisode (import auto si besoin)
   - **Crunchyroll** : Le bouton 👁️ apparaît sur la page épisode (requiert import préalable via `/series/*`)
   - **ADKami** : Le bouton ✅ apparaît sur la page épisode (requiert import préalable via `/info`)
   - L'épisode sera automatiquement marqué dans votre collection
   - **Auto-incrémentation** : Marquer l'épisode 5 marque aussi automatiquement 1-4 (toutes plateformes)
   - Si tous les épisodes sont vus, le statut passe automatiquement à "Terminé"
   - Un **badge de source** (logo ADN/Crunchyroll/ADKami) s'affiche dans l'application

> **💡 Workflow Crunchyroll** : 
> 1. Allez sur la page série → Cliquez sur 📥 orange pour importer
> 2. Regardez un épisode → Cliquez sur 👁️ vert pour marquer comme vu
> 3. Les boutons changent automatiquement quand vous naviguez

#### 📚 Pour les mangas

1. **Lancez** Ma Mangathèque sur votre ordinateur
2. **Naviguez** vers un site supporté :
   - MangaCollec : Page d'une série (`/series/xxx`) ou édition (`/editions/xxx`)
   - Nautiljon : Page d'un manga (`/mangas/xxx`)
   - Booknode : Page d'une série (`/serie/xxx`)
3. **Choisissez** le type d'import :
   - 📚 **Import complet** (série + tomes) : Crée une nouvelle série avec tous ses tomes
   - 📖 **Import tomes uniquement** : Ajoute les tomes manquants à une série existante
4. **Attendez** l'extraction et l'import (notification de confirmation)
5. L'application se rafraîchit automatiquement pour afficher les nouvelles données

### Import multi-sources

Vous pouvez combiner différentes sources pour optimiser vos imports :

**Exemple :**
1. Importez une série depuis **Booknode** (📚) pour avoir le synopsis complet
2. Complétez les tomes manquants depuis **Nautiljon** (📖) pour avoir les prix
3. Ou utilisez **MangaCollec** (📖) pour ajouter les ISBN

**Note :** L'import "tomes uniquement" ne créera que les tomes qui n'existent pas encore.

---

## 🎨 Identification visuelle

### Animes

#### Import d'animes
| Script | Bouton | Position | Page |
|--------|--------|----------|------|
| **ADKami Integration** | 🟣 Violet 📥 Import | Bas droite | `/anime/ID` ou `/info` |
| **Crunchyroll Episode Tracker** | 🟠 Orange 📥 Import | Bas droite | `/series/*` |

#### Marquage d'épisodes
| Script | Bouton | Position | Import auto | Auto-incrémentation | Page |
|--------|--------|----------|-------------|---------------------|----- |
| **ADKami Integration** | 🟢 Vert 👁️ Ep.X | Haut droite | ❌ Non (requiert import via `/info`) | ✅ Oui | Pages épisode |
| **Crunchyroll Episode Tracker** | 🟢 Vert 👁️ | Bas droite | ❌ Non (requiert import via `/series/*`) | ✅ Oui | `/watch/*` |
| **ADN Episode Tracker** | 🟢 Vert ✅ Ep.X | Bas droite | ✅ Oui (optimisé) | ✅ Oui | `/video/*` |

### Mangas
Chaque script affiche **deux boutons flottants** dans le coin inférieur droit :

| Script | Import complet | Import tomes |
|--------|----------------|--------------|
| **MangaCollec** | 🟣 Violet 📚 | 🟠 Orange 📖 |
| **Nautiljon** | 🟠 Orange 📚 | 🩷 Rose 📖 |
| **Booknode** | 🔵 Bleu 📚 | 🟣 Violet 📖 |

---

## 🔧 Configuration

Par défaut, les scripts se connectent au serveur local sur le port **51234**.

Si vous avez modifié le port dans `electron/main.js`, vous devrez aussi modifier la constante `PORT` dans chaque script :

```javascript
const PORT = 51234; // ← Changez ici si nécessaire
```

---

## 🐛 Dépannage

### Le bouton 📚 n'apparaît pas
- ✅ Vérifiez que Tampermonkey est activé (icône colorée)
- ✅ Vérifiez que le script est activé dans Tampermonkey
- ✅ Rafraîchissez la page (`F5`)

### "Ma Mangathèque n'est pas démarré"
- ✅ Lancez l'application Electron
- ✅ Vérifiez que le port 51234 est bien utilisé
- ✅ Désactivez votre pare-feu/antivirus temporairement

### "Impossible de trouver le titre de la série"
- ⚠️ Le site a peut-être changé sa structure HTML
- ⚠️ La page utilise peut-être un chargement JavaScript différé
- 🔄 Attendez quelques secondes et réessayez

### Les images des tomes ne s'affichent pas (Booknode)
- 🔄 Réessayez l'import (le scroll automatique peut parfois échouer)
- 📸 Vérifiez que les images sont bien chargées dans votre navigateur
- 🗂️ Vérifiez le dossier `covers/` de Ma Mangathèque

### L'import Nautiljon est très lent ou bloqué (HTTP 429)
- ⏱️ **C'est normal** : Pour les séries longues (40+ tomes), l'import prend 45-60 secondes
- ⚠️ **Ne touchez pas au site** pendant l'extraction (changement de page, fermeture d'onglet)
- 🔄 Le script utilise un délai adaptatif (350-1500ms) et des retries automatiques
- 🛡️ Si vous voyez "HTTP 429" dans la console, le script réessaiera automatiquement (2s, 4s, 8s)
- ✅ Attendez la fin de l'import : l'overlay disparaîtra automatiquement

### "Anime non trouvé dans votre collection" (Streaming Tracker)
- ❗ Vous devez d'abord **importer l'anime** depuis ADKami avec le script ADKami Anime Extractor
- 🔍 Vérifiez que le titre de l'anime correspond dans votre collection
- 📺 Si le titre est légèrement différent, modifiez-le dans l'application pour qu'il corresponde

### Le bouton "Marquer comme vu" ne fonctionne pas
- ✅ Vérifiez que vous avez bien importé l'anime dans Ma Mangathèque
- ✅ Vérifiez que la saison existe dans l'anime
- ✅ Ouvrez la console (`F12`) pour voir les erreurs détaillées

---

## 📊 Comparaison des sources

| Fonctionnalité | MangaCollec | Nautiljon | Booknode |
|----------------|-------------|-----------|----------|
| **Fiabilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Données complètes** | ✅ | ✅ | ✅ |
| **Tomes auto** | ✅ | ✅ | ✅ |
| **Images des tomes** | ✅ | ✅ (local) | ✅ |
| **Image de série** | ❌ | ✅ (local) | ❌ |
| **Dates de sortie** | ✅ | ✅ | ✅ |
| **Prix** | ❌ | ✅ | ❌ |
| **Synopsis** | ⚠️ | ✅ | ✅ |
| **ISBN** | ✅ | ❌ | ❌ |
| **Titre alternatif** | ❌ | ✅ | ❌ |
| **Thèmes** | ❌ | ✅ | ✅ |
| **Déduplication** | ❌ | ✅ | ❌ |
| **Anti-rate-limit** | N/A | ✅ | ❌ |
| **Vitesse** | ⚡ Rapide | 🐢 Lent* | 🐢 Lent* |

\* *Nautiljon et Booknode sont plus lents car ils doivent fetch chaque tome individuellement pour les détails. Nautiljon utilise un système de délai adaptatif (350-1500ms) pour garantir un import complet sans erreur HTTP 429.*

---

## 🤝 Contribution

Si un site change sa structure et qu'un script ne fonctionne plus :

1. Ouvrez la **console du navigateur** (`F12`)
2. Notez les erreurs affichées
3. Créez une issue sur GitHub avec les détails

---

## 📜 Licence

Ces scripts sont fournis "en l'état" sans aucune garantie. Utilisez-les à vos propres risques.
