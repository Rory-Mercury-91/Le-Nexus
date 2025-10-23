# 📚 Système Multi-API pour Manga & Anime

## Vue d'ensemble

L'application "Ma Mangathèque" intègre un système de recherche multi-sources sophistiqué qui interroge automatiquement plusieurs bases de données d'anime et manga pour offrir les métadonnées les plus complètes et précises.

## 🎯 Architectures

### Pour les Animes

```
┌─────────────────────────────────────────────────────────┐
│           Flux d'import des animes                       │
└─────────────────────────────────────────────────────────┘

1️⃣ Import depuis plateformes de streaming (Tampermonkey)
   │
   ├─ ADN          → source_import: 'adn'
   ├─ Crunchyroll  → source_import: 'crunchyroll'
   └─ ADKami       → source_import: 'adkami'
   │
   ↓
2️⃣ Enrichissement optionnel via API (si nécessaire)
   │
   ├─ AniList         → api_source: 'anilist'      (Priorité 1)
   ├─ MyAnimeList     → api_source: 'myanimelist'  (Priorité 2)
   └─ Kitsu           → api_source: 'kitsu'        (Priorité 3)
```

### Pour les Mangas

```
┌─────────────────────────────────────────────────────────┐
│           Flux de recherche des mangas                   │
└─────────────────────────────────────────────────────────┘

Recherche manuelle → Multi-API automatique
   │
   ├─ MangaDex        (Priorité 1)
   ├─ AniList         (Priorité 2)
   ├─ Kitsu           (Priorité 3)
   ├─ MyAnimeList     (Priorité 4)
   └─ MangaUpdates    (Priorité 5)
```

## 📊 Bases de données intégrées

### 1. **AniList** ⭐ (Recommandée)
- **Type**: GraphQL API
- **Gratuité**: Oui, sans limite stricte
- **Pas de clé API**: Non requise
- **Données**:
  - Titres (romaji, anglais, natif)
  - Descriptions complètes
  - Images HD (extraLarge)
  - Genres, studios, format
  - Nombre d'épisodes/chapitres
  - Statut, dates, scores
- **Badge**: Bleu ciel (#02A9FF)

### 2. **MyAnimeList (via Jikan)**
- **Type**: REST API (non-officielle)
- **Gratuité**: Oui
- **Pas de clé API**: Non requise
- **Données**:
  - Titres (romaji, anglais, japonais)
  - Descriptions
  - Images
  - Genres, studios
  - Épisodes, chapitres, volumes
  - MAL ID unique
- **Badge**: Bleu marine (#2E51A2)

### 3. **Kitsu**
- **Type**: REST API (JSON:API)
- **Gratuité**: Oui
- **Pas de clé API**: Non requise
- **Données**:
  - Titres multiples
  - Descriptions
  - Images (poster)
  - Statut, dates
  - Nombre d'épisodes/chapitres
- **Badge**: Orange-rouge (#F75239)

### 4. **MangaDex** (Mangas uniquement)
- **Type**: REST API
- **Gratuité**: Oui
- **Pas de clé API**: Non requise
- **Données**:
  - Titres multilingues (dont français)
  - Descriptions FR/EN
  - Couvertures HD
  - Tags détaillés
  - Démographie

### 5. **MangaUpdates** (Mangas uniquement)
- **Type**: REST API
- **Gratuité**: Oui
- **Pas de clé API**: Non requise
- **Données**:
  - Titres
  - Descriptions
  - Genres
  - Statut de publication

## 🔧 Utilisation technique

### Modules API

Les modules sont situés dans `electron/apis/`:

- `anilist.js` - Recherche anime & manga sur AniList
- `myanimelist.js` - Recherche anime & manga sur MyAnimeList
- `kitsu.js` - Recherche anime & manga sur Kitsu
- `unified-search.js` - Système unifié avec fallback automatique
- `searchHelper.js` - Traduction FR→EN et variantes de recherche

### Système de fallback

Le module `unified-search.js` implémente un système de fallback automatique :

```javascript
import { searchAnime, searchManga } from './apis/unified-search.js';

// Recherche avec fallback automatique
const results = await searchAnime("Attack on Titan");
// 1. Essaie AniList
// 2. Si échec → MyAnimeList
// 3. Si échec → Kitsu

// Recherche sur toutes les sources
const allResults = await searchAnime("Attack on Titan", { tryAllSources: true });
// Interroge toutes les API et merge les résultats
```

### Handlers IPC

Les handlers sont dans `electron/handlers/search-handlers.js` :

- `search-anime` - Recherche d'animes (AniList + Kitsu + MAL)
- `search-manga` - Recherche de mangas (MangaDex + AniList + Kitsu + MAL + MangaUpdates)

### Badges visuels

Le composant `PlatformLogo.tsx` affiche des badges pour identifier les sources :

#### Sources de streaming
- 🟠 **ADN** (blanc sur fond ADN)
- 🟣 **ADKami** (violet avec étoile dorée)
- 🟠 **Crunchyroll** (orange)

#### Sources API de métadonnées
- 🔵 **AniList** (bleu ciel)
- 🔵 **MyAnimeList** (bleu marine)
- 🔴 **Kitsu** (orange-rouge)

```tsx
import PlatformLogo from './components/PlatformLogo';

// Badge de streaming
<PlatformLogo platform="crunchyroll" height={28} />

// Badge d'API
<PlatformLogo platform="anilist" height={24} />
```

## 💾 Stockage en base de données

### Table `anime_series`

```sql
CREATE TABLE anime_series (
  id INTEGER PRIMARY KEY,
  titre TEXT NOT NULL,
  ...
  source_import TEXT,  -- 'adn', 'crunchyroll', 'adkami'
  api_source TEXT,     -- 'anilist', 'myanimelist', 'kitsu'
  ...
);
```

- **`source_import`** : Plateforme de streaming d'origine
- **`api_source`** : API utilisée pour enrichir les métadonnées

## 🚀 Avantages du système multi-API

### 1. Résilience
Si une API est indisponible, les autres prennent le relais automatiquement.

### 2. Complétude des données
Différentes API ont des forces différentes :
- AniList : Images HD, descriptions complètes
- MAL : Plus grande base de données
- Kitsu : Bons titres alternatifs

### 3. Support multilingue
- Recherches en français avec traduction automatique
- Variantes générées automatiquement (articles, synonymes)

### 4. Traçabilité
Les badges visuels permettent de savoir d'où proviennent les données.

## 📈 Performances

### Recherche parallèle
Le système peut interroger plusieurs API simultanément pour maximiser la vitesse.

### Cache intelligent
Les résultats peuvent être mis en cache pour éviter des requêtes répétées.

### Déduplication
Les résultats identiques de différentes sources sont automatiquement fusionnés.

## 🛠️ Configuration

Aucune clé API n'est nécessaire ! Toutes les API utilisées sont gratuites et publiques.

## 📝 Exemples d'utilisation

### Frontend (React)

```typescript
// Recherche d'anime
const results = await window.electronAPI.searchAnime("One Piece");

// Affichage avec badge
<AnimeCard anime={anime}>
  <PlatformLogo platform={anime.source_import} />
  {anime.api_source && <PlatformLogo platform={anime.api_source} height={20} />}
</AnimeCard>
```

### Backend (Electron)

```javascript
// Import unifié
const { searchAnime } = require('./apis/unified-search.js');

// Recherche avec fallback
const results = await searchAnime("Naruto");

// Recherche exhaustive
const allResults = await searchAnime("Naruto", { tryAllSources: true });
```

## 🎨 Design des badges

### Codes couleur
- **Streaming**: Couleurs officielles des plateformes
- **API**: 
  - AniList : #02A9FF (bleu clair tech)
  - MyAnimeList : #2E51A2 (bleu MAL officiel)
  - Kitsu : #F75239 (orange Kitsu officiel)

### Tailles recommandées
- Principal (streaming) : 28px
- Secondaire (API) : 20-24px
- Compact : 16px

## 📚 Ressources

- [AniList GraphQL Docs](https://anilist.gitbook.io/anilist-apiv2-docs)
- [Jikan API Docs](https://docs.api.jikan.moe/)
- [Kitsu API Docs](https://kitsu.docs.apiary.io/)
- [MangaDex API Docs](https://api.mangadex.org/docs/)
- [MangaUpdates API Docs](https://api.mangaupdates.com/v1/docs)
