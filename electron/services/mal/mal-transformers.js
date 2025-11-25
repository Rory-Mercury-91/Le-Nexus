/**
 * Transformateurs de données MAL
 * Convertit les données MAL vers le format interne de l'application
 */

/**
 * Convertit le statut MAL vers le format de publication
 */
function convertMALPublicationStatus(malStatus) {
  if (!malStatus) return null;

  const statusMap = {
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
    'not_yet_published': 'Annoncée'
  };

  return statusMap[malStatus] || malStatus; // Retourne la valeur originale si non trouvée
}

/**
 * Convertit le statut utilisateur MAL vers le format de lecture (manga)
 */
function convertMALReadingStatus(malStatus) {
  const statusMap = {
    'plan_to_read': 'À lire',
    'reading': 'En cours',
    'completed': 'Terminé',
    'on_hold': 'En pause',
    'dropped': 'Abandonné'
  };
  return statusMap[malStatus] || 'À lire';
}

/**
 * Convertit le statut utilisateur MAL vers le format de l'application (anime)
 */
function convertMALUserStatus(malStatus) {
  const statusMap = {
    'plan_to_watch': 'À regarder',
    'watching': 'En cours',
    'completed': 'Terminé',
    'on_hold': 'En pause',
    'dropped': 'Abandonné'
  };
  return statusMap[malStatus] || 'À regarder';
}

/**
 * Convertit le statut de diffusion MAL vers le format français (anime)
 */
function convertMALAnimeStatus(malStatus) {
  if (!malStatus) return null;

  const statusMap = {
    // Formats MAL standards
    'Currently Airing': 'En cours de diffusion',
    'Finished Airing': 'Terminé',
    'Not yet aired': 'Pas encore diffusé',
    // Formats avec underscore (MAL API)
    'currently_airing': 'En cours de diffusion',
    'finished_airing': 'Terminé',
    'not_yet_aired': 'Pas encore diffusé',
    // Formats minuscules
    'currently airing': 'En cours de diffusion',
    'finished airing': 'Terminé',
    'not yet aired': 'Pas encore diffusé'
  };

  return statusMap[malStatus] || malStatus; // Retourne la valeur originale si non trouvée
}

/**
 * Transforme les données MAL manga en format interne
 */
function transformMangaData(malEntry) {
  const manga = malEntry.node || malEntry;
  const listStatus = malEntry.list_status || {};
  const mediaType = (manga.media_type || '').toLowerCase();

  const typeVolumeMap = {
    manga: 'Broché',
    oel: 'Broché',
    one_shot: 'Broché',
    doujinshi: 'Broché',
    manhwa: 'Webtoon',
    manhua: 'Webtoon',
    webtoon: 'Webtoon',
    light_novel: 'Light Novel',
    novel: 'Light Novel'
  };

  const typeVolume = typeVolumeMap[mediaType] || 'Broché';
  const genres = Array.isArray(manga.genres) ? manga.genres.map(g => g.name).join(', ') : null;
  const isR18 =
    (genres && (genres.includes('Hentai') || genres.includes('Erotica'))) ||
    mediaType === 'doujinshi';

  // Log pour déboguer les données de progression
  if (listStatus.status) {
    console.log(`📚 MAL manga ${manga.id} (${manga.title}): status="${listStatus.status}", volumes_read=${listStatus.num_volumes_read || 0}, chapters_read=${listStatus.num_chapters_read || 0}`);
  }

  // Préparer les titres alternatifs (synonyms depuis MAL)
  let titresAlternatifs = null;
  if (manga.alternative_titles?.synonyms && Array.isArray(manga.alternative_titles.synonyms) && manga.alternative_titles.synonyms.length > 0) {
    titresAlternatifs = JSON.stringify(manga.alternative_titles.synonyms);
  }

  // Déterminer le media_type pour le matching
  let normalizedMediaType = null;
  if (mediaType === 'manga') normalizedMediaType = 'Manga';
  else if (mediaType === 'light_novel' || mediaType === 'novel') normalizedMediaType = 'Light Novel';
  else if (mediaType === 'manhwa') normalizedMediaType = 'Manhwa';
  else if (mediaType === 'manhua') normalizedMediaType = 'Manhua';
  else if (mediaType) normalizedMediaType = mediaType.charAt(0).toUpperCase() + mediaType.slice(1);

  return {
    mal_id: manga.id,
    titre: manga.title || null,
    titre_romaji: manga.alternative_titles?.en || null,
    titre_anglais: manga.alternative_titles?.en || null,
    titre_natif: manga.alternative_titles?.ja || null,
    titres_alternatifs: titresAlternatifs, // Pour le matching
    media_type: normalizedMediaType, // Pour le matching
    couverture_url: manga.main_picture?.large || manga.main_picture?.medium || null,
    description: manga.synopsis || null,
    statut_publication: convertMALPublicationStatus(manga.status), // Traduit en français
    statut: convertMALPublicationStatus(manga.status) || 'En cours', // Pour la colonne NOT NULL (avec valeur par défaut)
    annee_publication: manga.start_date ? new Date(manga.start_date).getFullYear() : null,
    genres,
    nb_volumes: manga.num_volumes || null,
    nb_chapitres: manga.num_chapters || null,
    score_mal: manga.mean || null,
    rank_mal: manga.rank || null,
    popularity_mal: manga.popularity || null,
    source_donnees: 'mal',
    statut_perso: listStatus.status || 'plan_to_read',
    statut_lecture: convertMALReadingStatus(listStatus.status || 'plan_to_read'), // Pour statut_lecture
    score_perso: listStatus.score || null,
    volumes_lus: listStatus.num_volumes_read || 0,
    chapitres_lus: listStatus.num_chapters_read || 0,
    date_debut: listStatus.start_date || null,
    date_fin: listStatus.finish_date || null,
    updated_at: listStatus.updated_at || null,
    type_volume: typeVolume, // Valeur par défaut pour la colonne NOT NULL
    est_r18: isR18 ? 1 : 0
  };
}

/**
 * Transforme les données MAL anime en format interne
 */
function transformAnimeData(malEntry) {
  const anime = malEntry.node || malEntry;
  const listStatus = malEntry.list_status || {};
  const mediaType = (anime.media_type || '').toLowerCase();

  const mediaTypeMap = {
    tv: 'TV',
    ova: 'OVA',
    ona: 'ONA',
    special: 'Special',
    movie: 'Movie',
    music: 'Music'
  };

  const normalizedMediaType = mediaTypeMap[mediaType] || (anime.media_type ? anime.media_type.toString() : 'TV');

  return {
    mal_id: anime.id,
    titre: anime.title || null,
    titre_natif: anime.alternative_titles?.ja || null,
    titre_romaji: anime.alternative_titles?.en || null,
    couverture_url: anime.main_picture?.large || anime.main_picture?.medium || null,
    description: anime.synopsis || null,
    statut_diffusion: convertMALAnimeStatus(anime.status), // Traduit en français
    type: normalizedMediaType,
    annee: anime.start_date ? new Date(anime.start_date).getFullYear() : null,
    genres: anime.genres ? anime.genres.map(g => g.name).join(', ') : null,
    studios: anime.studios ? anime.studios.map(s => s.name).join(', ') : null,
    nb_episodes: anime.num_episodes || 0,
    source_import: 'myanimelist',
    statut_perso: listStatus.status || 'plan_to_watch',
    score_perso: listStatus.score || null,
    episodes_vus: listStatus.num_episodes_watched || 0,
    date_debut: listStatus.start_date || null,
    date_fin: listStatus.finish_date || null,
    updated_at: listStatus.updated_at || null
  };
}

module.exports = {
  convertMALPublicationStatus,
  convertMALReadingStatus,
  convertMALUserStatus,
  convertMALAnimeStatus,
  transformMangaData,
  transformAnimeData
};
