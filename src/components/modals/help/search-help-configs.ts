export interface SortOption {
  value: string;
  label: string;
  description: string;
}

export interface StatusOption {
  value: string;
  label: string;
  description: string;
}

export interface FilterToggle {
  name: string;
  icon: string;
  description: string;
}

export interface CustomFilter {
  name: string;
  description: string;
}

export interface SearchHelpConfig {
  collectionType: 'animes' | 'mangas' | 'movies' | 'series' | 'adulte-game' | 'books';
  collectionName: string;
  searchPlaceholder: string;
  searchExamples: string[];
  searchDescription: string;
  sortOptions: SortOption[];
  statusOptions: StatusOption[];
  filterToggles: FilterToggle[];
  customFilters?: CustomFilter[];
  additionalFilters?: Array<{
    name: string;
    description: string;
  }>;
}

export const ANIMES_SEARCH_HELP_CONFIG: SearchHelpConfig = {
  collectionType: 'animes',
  collectionName: 'Animés',
  searchPlaceholder: 'Rechercher un anime (titre ou MAL ID)...',
  searchExamples: [
    'Attack on Titan',
    '12345',
    'https://myanimelist.net/anime/16498'
  ],
  searchDescription: 'Vous pouvez rechercher par titre ou par ID MAL. Les URLs MAL sont automatiquement détectées.',
  sortOptions: [
    { value: 'title-asc', label: '📖 Titre (A → Z)', description: 'Trier par titre alphabétique croissant' },
    { value: 'title-desc', label: '📖 Titre (Z → A)', description: 'Trier par titre alphabétique décroissant' },
    { value: 'date-desc', label: '🆕 Ajout récent', description: 'Afficher les animés ajoutés récemment en premier' },
    { value: 'date-asc', label: '🕐 Ajout ancien', description: 'Afficher les animés ajoutés en premier en dernier' }
  ],
  statusOptions: [
    { value: 'À regarder', label: 'À regarder', description: 'Animés que vous n\'avez pas encore commencés' },
    { value: 'En cours', label: 'En cours', description: 'Animés que vous regardez actuellement' },
    { value: 'Terminé', label: 'Terminé', description: 'Animés que vous avez terminés' },
    { value: 'En pause', label: 'En pause', description: 'Animés mis en pause temporairement' },
    { value: 'Abandonné', label: 'Abandonné', description: 'Animés que vous avez abandonnés' }
  ],
  filterToggles: [
    { name: 'MAJ', icon: '🔔', description: 'Affiche uniquement les animés avec de nouveaux épisodes disponibles (maj_disponible = 1). Le flag est automatiquement réinitialisé quand vous avez vu tous les nouveaux épisodes.' },
    { name: 'Favoris', icon: '❤️', description: 'Affiche uniquement vos animés favoris' },
    { name: 'Animés masqués', icon: '👁️', description: 'Affiche uniquement les animés que vous avez masqués. Les animés masqués sont cachés par défaut.' }
  ],
  customFilters: [
    { name: 'Genres', description: 'Filtre par un ou plusieurs genres. Tous les genres sélectionnés doivent être présents dans l\'animé.' },
    { name: 'Thèmes', description: 'Filtre par un ou plusieurs thèmes. Tous les thèmes sélectionnés doivent être présents dans l\'animé.' },
    { name: 'Labels', description: 'Filtre par labels personnalisés. Au moins un label sélectionné doit être présent sur l\'animé.' }
  ],
  additionalFilters: [
    { name: 'Type', description: 'Filtre par type d\'animé : TV, Film, OVA, ONA, ou Spécial' },
    { name: 'Complétion', description: 'Filtre par statut de visionnage (identique au filtre Statut mais avec une logique différente)' }
  ]
};

export const MANGAS_SEARCH_HELP_CONFIG: SearchHelpConfig = {
  collectionType: 'mangas',
  collectionName: 'Mangas',
  searchPlaceholder: 'Rechercher une série (titre ou MAL ID)...',
  searchExamples: [
    'One Piece',
    '13',
    'https://myanimelist.net/manga/13'
  ],
  searchDescription: 'Vous pouvez rechercher par titre ou par ID MAL. Les URLs MAL sont automatiquement détectées.',
  sortOptions: [
    { value: 'title-asc', label: '📖 Titre (A → Z)', description: 'Trier par titre alphabétique croissant' },
    { value: 'title-desc', label: '📖 Titre (Z → A)', description: 'Trier par titre alphabétique décroissant' },
    { value: 'date-desc', label: '🆕 Ajout récent', description: 'Afficher les séries ajoutées récemment en premier' },
    { value: 'date-asc', label: '🕐 Ajout ancien', description: 'Afficher les séries ajoutées en premier en dernier' },
    { value: 'cost-desc', label: '💰 Coût total (décroissant)', description: 'Trier par coût total décroissant (séries les plus chères en premier)' },
    { value: 'cost-asc', label: '💰 Coût total (croissant)', description: 'Trier par coût total croissant (séries les moins chères en premier)' }
  ],
  statusOptions: [
    { value: 'En cours', label: '🔵 En cours', description: 'Séries que vous lisez actuellement' },
    { value: 'Terminée', label: '✅ Terminée', description: 'Séries que vous avez terminées' },
    { value: 'Abandonnée', label: '🚫 Abandonnée', description: 'Séries que vous avez abandonnées' }
  ],
  filterToggles: [
    { name: 'Favoris', icon: '❤️', description: 'Affiche uniquement vos séries favorites' },
    { name: 'Séries masquées', icon: '👁️', description: 'Affiche uniquement les séries que vous avez masquées. Les séries masquées sont cachées par défaut.' }
  ],
  customFilters: [
    { name: 'Genres', description: 'Filtre par un ou plusieurs genres. Tous les genres sélectionnés doivent être présents dans la série.' },
    { name: 'Thèmes', description: 'Filtre par un ou plusieurs thèmes. Tous les thèmes sélectionnés doivent être présents dans la série.' },
    { name: 'Labels', description: 'Filtre par labels personnalisés. Au moins un label sélectionné doit être présent sur la série.' }
  ],
  additionalFilters: [
    { name: 'Type de volume', description: 'Filtre par type de volume : Broché, Kindle, Webtoon, etc.' },
    { name: 'Propriétaire', description: 'Filtre par propriétaire des tomes' }
  ]
};

export const MOVIES_SEARCH_HELP_CONFIG: SearchHelpConfig = {
  collectionType: 'movies',
  collectionName: 'Films',
  searchPlaceholder: 'Rechercher un film (titre ou TMDb ID)...',
  searchExamples: [
    'Inception',
    '27205',
    'https://www.themoviedb.org/movie/27205'
  ],
  searchDescription: 'Vous pouvez rechercher par titre ou par ID TMDb. Les URLs TMDb sont automatiquement détectées.',
  sortOptions: [
    { value: 'title-asc', label: '📖 Titre (A → Z)', description: 'Trier par titre alphabétique croissant' },
    { value: 'title-desc', label: '📖 Titre (Z → A)', description: 'Trier par titre alphabétique décroissant' },
    { value: 'date-desc', label: '🆕 Date de sortie (récent)', description: 'Afficher les films récents en premier' },
    { value: 'score-desc', label: '⭐ Note TMDb', description: 'Trier par note TMDb décroissante' }
  ],
  statusOptions: [
    { value: 'À regarder', label: 'À regarder', description: 'Films que vous n\'avez pas encore vus' },
    { value: 'En cours', label: 'En cours', description: 'Films que vous regardez actuellement' },
    { value: 'Terminé', label: 'Terminé', description: 'Films que vous avez terminés' },
    { value: 'En pause', label: 'En pause', description: 'Films mis en pause temporairement' },
    { value: 'Abandonné', label: 'Abandonné', description: 'Films que vous avez abandonnés' }
  ],
  filterToggles: [
    { name: 'MAJ', icon: '🔔', description: 'Affiche uniquement les films avec des mises à jour disponibles' },
    { name: 'Favoris', icon: '❤️', description: 'Affiche uniquement vos films favoris' },
    { name: 'Films masqués', icon: '👁️', description: 'Affiche uniquement les films que vous avez masqués. Les films masqués sont cachés par défaut.' }
  ],
  customFilters: [
    { name: 'Genres', description: 'Filtre par un ou plusieurs genres. Tous les genres sélectionnés doivent être présents dans le film.' }
  ]
};

export const BOOKS_SEARCH_HELP_CONFIG: SearchHelpConfig = {
  collectionType: 'books',
  collectionName: 'Livres',
  searchPlaceholder: 'Rechercher un livre, un auteur...',
  searchExamples: [
    'Le Seigneur des Anneaux',
    'J.R.R. Tolkien',
    '978-2070612758'
  ],
  searchDescription: 'Vous pouvez rechercher par titre, auteur ou ISBN.',
  sortOptions: [
    { value: 'title-asc', label: '📖 Titre (A → Z)', description: 'Trier par titre alphabétique croissant' },
    { value: 'title-desc', label: '📖 Titre (Z → A)', description: 'Trier par titre alphabétique décroissant' },
    { value: 'author-asc', label: '👤 Auteur (A → Z)', description: 'Trier par auteur alphabétique croissant' },
    { value: 'date-desc', label: '🆕 Date de publication (récent)', description: 'Afficher les livres récents en premier' }
  ],
  statusOptions: [
    { value: 'À lire', label: 'À lire', description: 'Livres que vous n\'avez pas encore commencés' },
    { value: 'En cours', label: 'En cours', description: 'Livres que vous lisez actuellement' },
    { value: 'Terminé', label: 'Terminé', description: 'Livres que vous avez terminés' },
    { value: 'En pause', label: 'En pause', description: 'Livres mis en pause temporairement' },
    { value: 'Abandonné', label: 'Abandonné', description: 'Livres que vous avez abandonnés' }
  ],
  filterToggles: [
    { name: 'Favoris', icon: '❤️', description: 'Affiche uniquement vos livres favoris' },
    { name: 'Livres masqués', icon: '👁️', description: 'Affiche uniquement les livres que vous avez masqués. Les livres masqués sont cachés par défaut.' }
  ],
  customFilters: [
    { name: 'Genres', description: 'Filtre par un ou plusieurs genres. Tous les genres sélectionnés doivent être présents dans le livre.' },
    { name: 'Type', description: 'Filtre par type de livre : Roman, Biographie, Essai, etc.' }
  ]
};

export const SERIES_SEARCH_HELP_CONFIG: SearchHelpConfig = {
  collectionType: 'series',
  collectionName: 'Séries TV',
  searchPlaceholder: 'Rechercher une série (titre, TMDb ID...)',
  searchExamples: [
    'Breaking Bad',
    '1396',
    'https://www.themoviedb.org/tv/1396'
  ],
  searchDescription: 'Vous pouvez rechercher par titre ou par ID TMDb. Les URLs TMDb sont automatiquement détectées.',
  sortOptions: [
    { value: 'date-desc', label: '🗓️ Date de diffusion', description: 'Trier par date de première diffusion décroissante' },
    { value: 'title-asc', label: '📖 Titre (A → Z)', description: 'Trier par titre alphabétique croissant' },
    { value: 'title-desc', label: '📖 Titre (Z → A)', description: 'Trier par titre alphabétique décroissant' },
    { value: 'score-desc', label: '⭐ Note TMDb', description: 'Trier par note TMDb décroissante' },
    { value: 'popularite-desc', label: '🔥 Popularité TMDb', description: 'Trier par popularité TMDb décroissante' }
  ],
  statusOptions: [
    { value: 'À regarder', label: 'À regarder', description: 'Séries que vous n\'avez pas encore commencées' },
    { value: 'En cours', label: 'En cours', description: 'Séries que vous regardez actuellement' },
    { value: 'Terminé', label: 'Terminé', description: 'Séries que vous avez terminées' },
    { value: 'En pause', label: 'En pause', description: 'Séries mises en pause temporairement' },
    { value: 'Abandonné', label: 'Abandonné', description: 'Séries que vous avez abandonnées' }
  ],
  filterToggles: [
    { name: 'MAJ', icon: '🔔', description: 'Affiche uniquement les séries avec des mises à jour disponibles' },
    { name: 'Favoris', icon: '❤️', description: 'Affiche uniquement vos séries favorites' },
    { name: 'Séries masquées', icon: '👁️', description: 'Affiche uniquement les séries que vous avez masquées. Les séries masquées sont cachées par défaut.' }
  ],
  customFilters: [
    { name: 'Genres', description: 'Filtre par un ou plusieurs genres. Tous les genres sélectionnés doivent être présents dans la série.' }
  ]
};

export const ADULTE_GAME_SEARCH_HELP_CONFIG: SearchHelpConfig = {
  collectionType: 'adulte-game',
  collectionName: 'Jeux adultes',
  searchPlaceholder: 'Rechercher un jeu (titre, F95 ID, LewdCorner ID)...',
  searchExamples: [
    'Being a DIK',
    '123456',
    'https://f95zone.to/threads/being-a-dik.123456/'
  ],
  searchDescription: 'Vous pouvez rechercher par titre, ID F95 ou ID LewdCorner. Les URLs F95 sont automatiquement détectées.',
  sortOptions: [
    { value: 'title-asc', label: '📖 Titre (A → Z)', description: 'Trier par titre alphabétique croissant' },
    { value: 'title-desc', label: '📖 Titre (Z → A)', description: 'Trier par titre alphabétique décroissant' },
    { value: 'date-desc', label: '🆕 Ajout récent', description: 'Afficher les jeux ajoutés récemment en premier' },
    { value: 'date-asc', label: '🕐 Ajout ancien', description: 'Afficher les jeux ajoutés en premier en dernier' },
    { value: 'platform-asc', label: '📦 Plateforme (A → Z)', description: 'Trier par plateforme alphabétique croissante' },
    { value: 'platform-desc', label: '📦 Plateforme (Z → A)', description: 'Trier par plateforme alphabétique décroissante' }
  ],
  statusOptions: [
    { value: 'À lire', label: 'À lire', description: 'Jeux que vous n\'avez pas encore commencés' },
    { value: 'En cours', label: 'En cours', description: 'Jeux que vous jouez actuellement' },
    { value: 'Terminé', label: 'Terminé', description: 'Jeux que vous avez terminés' },
    { value: 'En pause', label: 'En pause', description: 'Jeux mis en pause temporairement' },
    { value: 'Abandonné', label: 'Abandonné', description: 'Jeux que vous avez abandonnés' }
  ],
  filterToggles: [
    { name: 'MAJ', icon: '🔔', description: 'Affiche uniquement les jeux avec des mises à jour disponibles' },
    { name: 'Favoris', icon: '❤️', description: 'Affiche uniquement vos jeux favoris' },
    { name: 'Jeux masqués', icon: '👁️', description: 'Affiche uniquement les jeux que vous avez masqués. Les jeux masqués sont cachés par défaut.' },
    { name: 'Traduction obsolète', icon: '🔄', description: 'Affiche uniquement les jeux dont la traduction est obsolète' }
  ],
  customFilters: [
    { name: 'Tags', description: 'Filtre par un ou plusieurs tags. Tous les tags sélectionnés doivent être présents dans le jeu.' },
    { name: 'Labels', description: 'Filtre par labels personnalisés. Au moins un label sélectionné doit être présent sur le jeu.' },
    { name: 'Plateforme', description: 'Filtre par plateforme : Windows, Mac, Linux, Android, etc.' },
    { name: 'Moteur', description: 'Filtre par moteur de jeu : Ren\'Py, Unity, RPG Maker, etc.' },
    { name: 'Traduction', description: 'Filtre par disponibilité de traduction française' }
  ],
  additionalFilters: [
    { name: 'Statut jeu', description: 'Filtre par statut du jeu : EN COURS, TERMINÉ, ABANDONNÉ' },
    { name: 'Statut perso', description: 'Filtre par statut de progression personnelle' }
  ]
};

export const SEARCH_HELP_CONFIGS: Record<string, SearchHelpConfig> = {
  'animes': ANIMES_SEARCH_HELP_CONFIG,
  'mangas': MANGAS_SEARCH_HELP_CONFIG,
  'movies': MOVIES_SEARCH_HELP_CONFIG,
  'series': SERIES_SEARCH_HELP_CONFIG,
  'books': BOOKS_SEARCH_HELP_CONFIG,
  'adulte-game': ADULTE_GAME_SEARCH_HELP_CONFIG,
};
