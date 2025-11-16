/**
 * Dictionnaire de traductions pour les données MyAnimeList
 */

// Genres
export const genreTranslations: Record<string, string> = {
  'Action': 'Action',
  'Adventure': 'Aventure',
  'Comedy': 'Comédie',
  'Drama': 'Drame',
  'Ecchi': 'Ecchi',
  'Fantasy': 'Fantastique',
  'Horror': 'Horreur',
  'Mystery': 'Mystère',
  'Psychological': 'Psychologique',
  'Romance': 'Romance',
  'Sci-Fi': 'Science-Fiction',
  'Slice of Life': 'Tranche de vie',
  'Sports': 'Sport',
  'Supernatural': 'Surnaturel',
  'Thriller': 'Thriller',
  'Suspense': 'Suspense',
  'Award Winning': 'Primé',
  'Avant Garde': 'Avant-garde',
  'Gourmet': 'Gastronomie',
  'Girls Love': 'Amour entre filles',
  'Boys Love': 'Amour entre garçons',
  // Variantes courantes
  'Sci-Fi & Fantasy': 'Science-Fiction & Fantastique',
  'Science Fiction': 'Science-Fiction',
  'Slice-of-Life': 'Tranche de vie',
  'Shounen': 'Shōnen',
  'Shoujo': 'Shōjo',
  'Seinen': 'Seinen',
  'Josei': 'Josei',
  'Isekai': 'Isekai',
  'Mecha': 'Mecha',
  'Harem': 'Harem',
  'Reverse Harem': 'Harem inversé'
};

// Thèmes
export const themeTranslations: Record<string, string> = {
  'Adult Cast': 'Distribution adulte',
  'Anthropomorphic': 'Anthropomorphe',
  'CGDCT': 'Filles mignonnes',
  'Childcare': 'Garde d\'enfants',
  'Combat Sports': 'Sports de combat',
  'Crossdressing': 'Travestissement',
  'Delinquents': 'Délinquants',
  'Detective': 'Détective',
  'Educational': 'Éducatif',
  'Gag Humor': 'Humour absurde',
  'Gore': 'Gore',
  'Harem': 'Harem',
  'High Stakes Game': 'Jeu à haut risque',
  'Historical': 'Historique',
  'Idols (Female)': 'Idoles (Femmes)',
  'Idols (Male)': 'Idoles (Hommes)',
  'Isekai': 'Isekai',
  'Iyashikei': 'Iyashikei',
  'Love Polygon': 'Triangle amoureux',
  'Magical Sex Shift': 'Changement de sexe magique',
  'Mahou Shoujo': 'Magical Girl',
  'Martial Arts': 'Arts martiaux',
  'Mecha': 'Mecha',
  'Medical': 'Médical',
  'Military': 'Militaire',
  'Music': 'Musique',
  'Mythology': 'Mythologie',
  'Organized Crime': 'Crime organisé',
  'Otaku Culture': 'Culture otaku',
  'Parody': 'Parodie',
  'Performing Arts': 'Arts du spectacle',
  'Pets': 'Animaux de compagnie',
  'Psychological': 'Psychologique',
  'Racing': 'Course',
  'Reincarnation': 'Réincarnation',
  'Reverse Harem': 'Harem inversé',
  'Romantic Subtext': 'Sous-texte romantique',
  'Samurai': 'Samouraï',
  'School': 'École',
  'Showbiz': 'Show-business',
  'Space': 'Espace',
  'Strategy Game': 'Jeu de stratégie',
  'Super Power': 'Super pouvoir',
  'Survival': 'Survie',
  'Team Sports': 'Sports d\'équipe',
  'Time Travel': 'Voyage dans le temps',
  'Vampire': 'Vampire',
  'Video Game': 'Jeu vidéo',
  'Visual Arts': 'Arts visuels',
  'Workplace': 'Travail',
  'Zombies': 'Zombies',
  // Variantes depuis Nautiljon
  'Autre monde': 'Autre monde',
  'Magie': 'Magie',
  'Réincarnation / Transmigration': 'Réincarnation / Transmigration',
  'Transmigration': 'Transmigration'
};

// Démographies
export const demographicTranslations: Record<string, string> = {
  'Shounen': 'Shōnen',
  'Shoujo': 'Shōjo',
  'Seinen': 'Seinen',
  'Josei': 'Josei',
  'Kids': 'Enfants',
  // Variantes
  'Shonen': 'Shōnen', // Nautiljon parfois sans accent
  'Shōnen': 'Shōnen',
  'Shōjo': 'Shōjo'
};

// Sources
export const sourceTranslations: Record<string, string> = {
  'Manga': 'Manga',
  'Light novel': 'Light novel',
  'Visual novel': 'Visual novel',
  'Game': 'Jeu vidéo',
  'Original': 'Œuvre originale',
  '4-koma manga': 'Manga 4-koma',
  'Web manga': 'Web manga',
  'Novel': 'Roman',
  'Book': 'Livre',
  'Card game': 'Jeu de cartes',
  'Radio': 'Radio',
  'Music': 'Musique',
  'Other': 'Autre',
  'Unknown': 'Inconnu'
};

// Statuts de diffusion/publication
export const statusTranslations: Record<string, string> = {
  // Formats anime standards
  'Currently Airing': 'En cours de diffusion',
  'Finished Airing': 'Terminé',
  'Not yet aired': 'Pas encore diffusé',
  // Formats anime avec underscore (MAL API)
  'currently_airing': 'En cours de diffusion',
  'finished_airing': 'Terminé',
  'not_yet_aired': 'Pas encore diffusé',
  // Formats anime minuscules
  'currently airing': 'En cours de diffusion',
  'finished airing': 'Terminé',
  'not yet aired': 'Pas encore diffusé',
  // Statuts de publication manga
  'Publishing': 'En cours',
  'Finished': 'Terminé',
  'Not yet published': 'Pas encore publié',
  'On Hiatus': 'En pause',
  'Discontinued': 'Arrêté',
  // Variantes françaises
  'En cours': 'En cours',
  'Terminée': 'Terminé',
  'Terminé': 'Terminé',
  'En pause': 'En pause',
  'Arrêté': 'Arrêté'
};

// Ratings
export const ratingTranslations: Record<string, string> = {
  'G - All Ages': 'G - Tout public',
  'PG - Children': 'PG - Enfants',
  'PG-13 - Teens 13 or older': 'PG-13 - Adolescents 13 ans et +',
  'R - 17+ (violence & profanity)': 'R - 17+ (violence et langage)',
  'R+ - Mild Nudity': 'R+ - Nudité légère',
  'Rx - Hentai': 'Rx - Hentai'
};

// Saisons
export const seasonTranslations: Record<string, string> = {
  'winter': 'Hiver',
  'spring': 'Printemps',
  'summer': 'Été',
  'fall': 'Automne',
  'Winter': 'Hiver',
  'Spring': 'Printemps',
  'Summer': 'Été',
  'Fall': 'Automne'
};

/**
 * Traduit une liste de genres séparés par des virgules
 */
export function translateGenres(genres: string): string {
  return genres
    .split(',')
    .map(g => genreTranslations[g.trim()] || g.trim())
    .join(', ');
}

/**
 * Traductions des statuts de publication
 */
export const publicationStatusTranslations: Record<string, string> = {
  // Formats MAL standards
  'Finished': 'Terminée',
  'Publishing': 'En cours',
  'On Hiatus': 'En pause',
  'Discontinued': 'Abandonnée',
  'Not yet published': 'Annoncée',
  // Formats alternatifs possibles
  'currently_publishing': 'En cours',
  'finished': 'Terminée',
  'on_hiatus': 'En pause',
  'discontinued': 'Abandonnée',
  'not_yet_published': 'Annoncée',
  // Formats déjà traduits
  'Terminée': 'Terminée',
  'En cours': 'En cours',
  'En pause': 'En pause',
  'Abandonnée': 'Abandonnée',
  'Annoncée': 'Annoncée'
};

/**
 * Traduit un statut de publication en français
 */
export function translatePublicationStatus(status: string | null | undefined): string {
  if (!status) return 'En cours';
  return publicationStatusTranslations[status] || status;
}

/**
 * Traduit une liste de thèmes séparés par des virgules
 */
export function translateThemes(themes: string): string {
  return themes
    .split(',')
    .map(t => themeTranslations[t.trim()] || t.trim())
    .join(', ');
}

/**
 * Traduit une démographie
 */
export function translateDemographic(demographic: string): string {
  return demographicTranslations[demographic.trim()] || demographic;
}

/**
 * Traduit une source
 */
export function translateSource(source: string): string {
  return sourceTranslations[source.trim()] || source;
}

/**
 * Traduit un statut de diffusion
 */
export function translateStatus(status: string): string {
  return statusTranslations[status.trim()] || status;
}

/**
 * Traduit un rating
 */
export function translateRating(rating: string): string {
  return ratingTranslations[rating.trim()] || rating;
}

/**
 * Traduit une saison
 */
export function translateSeason(season: string): string {
  return seasonTranslations[season.trim()] || season;
}
