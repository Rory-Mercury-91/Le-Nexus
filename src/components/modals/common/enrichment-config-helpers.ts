import { EnrichmentConfigModalConfig, EnrichmentField } from './EnrichmentConfigModal';

export function createAnimeEnrichmentConfig(): EnrichmentConfigModalConfig {
  const fields: EnrichmentField[] = [
    // Titres alternatifs
    { key: 'titre_romaji', label: 'Titre romaji', section: 'Titres', sectionIcon: '📝' },
    { key: 'titre_natif', label: 'Titre natif', section: 'Titres' },
    { key: 'titre_anglais', label: 'Titre anglais', section: 'Titres' },
    { key: 'titres_alternatifs', label: 'Titres alternatifs', section: 'Titres' },
    
    // Métadonnées
    { key: 'source', label: 'Source (Manga, LN, etc.)', section: 'Métadonnées', sectionIcon: '📊' },
    { key: 'duree', label: 'Durée par épisode', section: 'Métadonnées' },
    { key: 'saison_diffusion', label: 'Saison de diffusion', section: 'Métadonnées' },
    { key: 'date_debut', label: 'Date de début', section: 'Métadonnées' },
    { key: 'date_fin', label: 'Date de fin', section: 'Métadonnées' },
    { key: 'en_cours_diffusion', label: 'En cours de diffusion', section: 'Métadonnées' },
    
    // Classification
    { key: 'themes', label: 'Thèmes', section: 'Classification', sectionIcon: '🏷️' },
    { key: 'demographics', label: 'Démographie (Shounen, etc.)', section: 'Classification' },
    { key: 'rating', label: 'Classification (G, PG-13, R)', section: 'Classification' },
    { key: 'score', label: 'Note MAL', section: 'Classification' },
    
    // Production
    { key: 'producteurs', label: 'Producteurs', section: 'Production', sectionIcon: '🎬' },
    { key: 'diffuseurs', label: 'Diffuseurs', section: 'Production' },
    { key: 'franchise', label: 'Relations de franchise', section: 'Production' },
  ];

  return {
    mediaType: 'anime',
    title: '⚙️ Configuration de l\'enrichissement des animes',
    description: 'Choisissez les données à récupérer depuis Jikan lors de la synchronisation MAL',
    fields,
    additionalOptions: [
      {
        key: 'imageSource',
        label: 'Source des images',
        type: 'select',
        value: 'anilist',
        options: [
          { value: 'mal', label: 'MyAnimeList' },
          { value: 'anilist', label: 'AniList (HD)' },
          { value: 'tmdb', label: 'TMDb' }
        ],
        onChange: () => {}
      },
      {
        key: 'autoTranslate',
        label: 'Traduction automatique',
        type: 'toggle',
        value: false,
        onChange: () => {}
      }
    ],
    defaultConfig: {
      enabled: true,
      autoTranslate: false,
      imageSource: 'anilist'
    },
    getConfigApi: () => window.electronAPI.getAnimeEnrichmentConfig(),
    saveConfigApi: (config) => window.electronAPI.saveAnimeEnrichmentConfig(config),
    startEnrichmentApi: () => window.electronAPI.startAnimeEnrichment(),
    stopEnrichmentApi: () => window.electronAPI.stopAnimeEnrichment?.(),
    onProgress: (_progress) => {
      // Géré par les event listeners dans le composant
    },
    onComplete: (_stats) => {
      // Géré par les event listeners dans le composant
    },
    warningMessage: '⚠️ L\'enrichissement se fait en arrière-plan après la synchronisation MAL (~2-3 secondes par anime) pour respecter les limites de l\'API Jikan. Seuls les nouveaux animes seront enrichis, pas ceux déjà présents.',
    themeColor: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      info: '#3b82f6'
    }
  };
}

export function createMangaEnrichmentConfig(): EnrichmentConfigModalConfig {
  const fields: EnrichmentField[] = [
    // Titres alternatifs
    { key: 'titre_romaji', label: 'Titre romaji', section: 'Titres', sectionIcon: '📝' },
    { key: 'titre_natif', label: 'Titre natif (japonais/coréen)', section: 'Titres' },
    { key: 'titre_anglais', label: 'Titre anglais', section: 'Titres' },
    { key: 'titres_alternatifs', label: 'Titres alternatifs', section: 'Titres' },
    
    // Publication
    { key: 'date_debut', label: 'Date de début', section: 'Publication', sectionIcon: '📅' },
    { key: 'date_fin', label: 'Date de fin', section: 'Publication' },
    { key: 'serialization', label: 'Magazine de prépublication', section: 'Publication' },
    
    // Classification
    { key: 'themes', label: 'Thèmes', section: 'Classification', sectionIcon: '🏷️' },
    { key: 'demographics', label: 'Démographie (Seinen, Shōnen, etc.)', section: 'Classification' },
    { key: 'genres', label: 'Genres', section: 'Classification' },
    
    // Statistiques MAL
    { key: 'score', label: 'Score MAL', section: 'Statistiques MAL', sectionIcon: '📊' },
    { key: 'rank', label: 'Classement MAL', section: 'Statistiques MAL' },
    { key: 'popularity', label: 'Popularité MAL', section: 'Statistiques MAL' },
    
    // Production & Contenu
    { key: 'auteurs', label: 'Auteurs', section: 'Production & Contenu', sectionIcon: '✍️' },
    { key: 'synopsis', label: 'Synopsis complet', section: 'Production & Contenu' },
    { key: 'background', label: 'Informations contextuelles', section: 'Production & Contenu' },
  ];

  return {
    mediaType: 'manga',
    title: '📚 Configuration de l\'enrichissement des mangas',
    description: 'Choisissez les données à récupérer depuis Jikan lors de la synchronisation MAL',
    fields,
    additionalOptions: [
      {
        key: 'autoTranslate',
        label: 'Traduction automatique',
        type: 'toggle',
        value: false,
        onChange: () => {}
      }
    ],
    defaultConfig: {
      enabled: true,
      autoTranslate: false
    },
    getConfigApi: () => window.electronAPI.getMangaEnrichmentConfig(),
    saveConfigApi: (config) => window.electronAPI.saveMangaEnrichmentConfig(config),
    startEnrichmentApi: () => window.electronAPI.startMangaEnrichment(),
    stopEnrichmentApi: () => window.electronAPI.stopMangaEnrichment?.(),
    onProgress: (_progress) => {
      // Géré par les event listeners dans le composant
    },
    onComplete: (_stats) => {
      // Géré par les event listeners dans le composant
    },
    warningMessage: '⚠️ L\'enrichissement se fait en arrière-plan après la synchronisation MAL (~2-3 secondes par manga) pour respecter les limites de l\'API Jikan. Seuls les nouveaux mangas seront enrichis, pas ceux déjà présents.',
    themeColor: {
      primary: '#f59e0b',
      secondary: '#d97706',
      info: '#f59e0b'
    }
  };
}
