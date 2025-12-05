/**
 * Transformateurs de données AniList
 * Convertit les données AniList vers le format interne de l'application
 */

/**
 * Nettoie le texte HTML en supprimant toutes les balises et en convertissant les balises de saut de ligne
 * @param {string} htmlText - Texte contenant du HTML
 * @returns {string} Texte nettoyé
 */
function cleanHtmlText(htmlText) {
  if (!htmlText) return null;

  let cleaned = String(htmlText);

  // Convertir les balises <br>, <br/>, <br /> en sauts de ligne
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');

  // Supprimer toutes les autres balises HTML
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Nettoyer les entités HTML courantes
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, '...')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // Nettoyer les espaces multiples (mais préserver les sauts de ligne)
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // Nettoyer les sauts de ligne multiples (max 2 consécutifs)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Supprimer les espaces en début/fin de ligne
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

  // Supprimer les espaces/tabulations/sauts de ligne en début et fin
  return cleaned.trim();
}

/**
 * Convertit le statut de publication AniList vers le format français
 */
function convertAniListPublicationStatus(anilistStatus) {
  if (!anilistStatus) return null;

  const statusMap = {
    'FINISHED': 'Terminée',
    'RELEASING': 'En cours',
    'NOT_YET_RELEASED': 'Annoncée',
    'CANCELLED': 'Abandonnée',
    'HIATUS': 'En pause'
  };

  return statusMap[anilistStatus] || anilistStatus;
}

/**
 * Convertit le statut utilisateur AniList vers le format de lecture (manga)
 */
function convertAniListReadingStatus(anilistStatus) {
  const statusMap = {
    'PLANNING': 'À lire',
    'CURRENT': 'En cours',
    'COMPLETED': 'Terminé',
    'DROPPED': 'Abandonné',
    'PAUSED': 'En pause',
    'REPEATING': 'En cours'
  };
  return statusMap[anilistStatus] || 'À lire';
}

/**
 * Convertit le statut utilisateur AniList vers le format de l'application (anime)
 */
function convertAniListUserStatus(anilistStatus) {
  const statusMap = {
    'PLANNING': 'À regarder',
    'CURRENT': 'En cours',
    'COMPLETED': 'Terminé',
    'DROPPED': 'Abandonné',
    'PAUSED': 'En pause',
    'REPEATING': 'En cours'
  };
  return statusMap[anilistStatus] || 'À regarder';
}

/**
 * Détecte si un texte contient des caractères japonais (hiragana ou katakana)
 * Les hiragana et katakana sont spécifiques au japonais
 */
function hasJapaneseKana(text) {
  if (!text) return false;
  // Hiragana: \u3040-\u309f (ひらがな)
  // Katakana: \u30a0-\u30ff (カタカナ)
  return /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
}

/**
 * Détecte si un texte contient des caractères coréens (Hangul)
 */
function hasKoreanCharacters(text) {
  if (!text) return false;
  // Caractères Hangul coréens (한글)
  return /[\uac00-\ud7af]/.test(text);
}

/**
 * Détecte si un texte est probablement du chinois
 * Distinction : chinois = caractères CJK SANS hiragana/katakana (japonais) et SANS Hangul (coréen)
 */
function isLikelyChinese(text) {
  if (!text) return false;

  // Si le texte contient du hiragana ou katakana, c'est du japonais (pas du chinois)
  if (hasJapaneseKana(text)) {
    return false;
  }

  // Si le texte contient du Hangul, c'est du coréen (pas du chinois)
  if (hasKoreanCharacters(text)) {
    return false;
  }

  // Si le texte ne contient QUE des caractères CJK (idéogrammes chinois/kanji)
  // sans hiragana/katakana et sans Hangul, c'est probablement du chinois
  // Caractères CJK (Chinese, Japanese, Korean Unified Ideographs)
  const cjkRegex = /[\u4e00-\u9faf\u3400-\u4dbf\uf900-\ufaff]/;
  return cjkRegex.test(text);
}

/**
 * Convertit le format AniList vers le media_type (Manga, Manhwa, Manhua, etc.)
 * Gère les formats avec parenthèses comme "Manga (Chinese)" ou "Manga (South Korean)"
 * Peut aussi utiliser le titre natif pour détecter manhua/manhwa si le format est juste "MANGA"
 */
function convertAniListFormatToMediaType(anilistFormat, nativeTitle = null) {
  if (!anilistFormat) {
    // Si pas de format, essayer de détecter depuis le titre natif
    if (nativeTitle) {
      if (isLikelyChinese(nativeTitle)) {
        return 'Manhua';
      } else if (hasKoreanCharacters(nativeTitle)) {
        return 'Manhwa';
      }
    }
    return null;
  }

  const format = String(anilistFormat);
  const formatUpper = format.toUpperCase();

  // Gérer les formats avec parenthèses (ex: "Manga (Chinese)", "Manga (South Korean)")
  if (format.includes('(Chinese)') || format.includes('Chinese')) {
    return 'Manhua';
  } else if (format.includes('(South Korean)') || format.includes('South Korean') || format.includes('Korean')) {
    return 'Manhwa';
  } else if (formatUpper === 'MANHWA') {
    return 'Manhwa';
  } else if (formatUpper === 'MANHUA') {
    return 'Manhua';
  } else if (formatUpper === 'NOVEL') {
    return 'Light Novel';
  } else if (formatUpper === 'ONE_SHOT') {
    return 'One-shot';
  } else if (formatUpper === 'MANGA') {
    // Si le format est juste "MANGA", vérifier le titre natif pour détecter manhua/manhwa
    // L'API AniList renvoie souvent juste "MANGA" même pour les manhua/manhwa
    if (nativeTitle) {
      // Si le titre contient du hiragana/katakana, c'est définitivement un manga japonais
      if (hasJapaneseKana(nativeTitle)) {
        return 'Manga';
      }
      // Si le titre semble être du chinois (CJK sans hiragana/katakana), c'est un manhua
      if (isLikelyChinese(nativeTitle)) {
        console.log(`📋 [AniList] Format "MANGA" détecté comme Manhua via titre natif: "${nativeTitle}" (caractères chinois sans hiragana/katakana)`);
        return 'Manhua';
      }
      // Si le titre contient du Hangul, c'est un manhwa
      if (hasKoreanCharacters(nativeTitle)) {
        console.log(`📋 [AniList] Format "MANGA" détecté comme Manhwa via titre natif: "${nativeTitle}" (caractères Hangul)`);
        return 'Manhwa';
      }
    }
    return 'Manga';
  } else if (format) {
    // Fallback : capitaliser la première lettre
    return format.charAt(0).toUpperCase() + format.slice(1).toLowerCase().replace('_', ' ');
  }

  return null;
}

/**
 * Convertit le format AniList vers le format de type de volume
 */
function convertAniListFormatToTypeVolume(anilistFormat) {
  if (!anilistFormat) return 'Broché';

  const format = String(anilistFormat);
  const formatUpper = format.toUpperCase();

  // Gérer les formats avec parenthèses
  if (format.includes('(Chinese)') || format.includes('Chinese') || formatUpper === 'MANHUA') {
    return 'Webtoon';
  } else if (format.includes('(South Korean)') || format.includes('South Korean') || format.includes('Korean') || formatUpper === 'MANHWA') {
    return 'Webtoon';
  }

  const formatMap = {
    'MANGA': 'Broché',
    'NOVEL': 'Light Novel',
    'ONE_SHOT': 'Broché',
    'DOUJINSHI': 'Broché',
    'MANHWA': 'Webtoon',
    'MANHUA': 'Webtoon'
  };

  return formatMap[formatUpper] || 'Broché';
}

/**
 * Convertit le format AniList vers le format de type d'anime
 */
function convertAniListFormatToAnimeType(anilistFormat) {
  if (!anilistFormat) return 'TV';

  const format = String(anilistFormat).trim().toUpperCase();

  // Vérifier d'abord les types contenant "SPECIAL" (TV_SPECIAL, SPECIAL, etc.)
  if (format.includes('SPECIAL')) {
    return 'Special';
  }

  const formatMap = {
    'TV': 'TV',
    'TV_SHORT': 'TV',
    'OVA': 'OVA',
    'ONA': 'ONA',
    'MOVIE': 'Movie',
    'SPECIAL': 'Special',
    'MUSIC': 'Music'
  };

  return formatMap[format] || 'TV';
}

/**
 * Formate une date AniList (objet avec year, month, day) vers une string ISO
 */
function formatAniListDate(dateObj) {
  if (!dateObj || !dateObj.year) return null;
  const year = dateObj.year;
  const month = dateObj.month || 1;
  const day = dateObj.day || 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Formate une date de début/fin AniList (startedAt/completedAt) vers une string ISO
 */
function formatAniListUserDate(dateObj) {
  if (!dateObj || !dateObj.year) return null;
  const year = dateObj.year;
  const month = dateObj.month || 1;
  const day = dateObj.day || 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Transforme les données AniList manga en format interne
 */
function transformMangaData(anilistEntry) {
  const media = anilistEntry.media || {};
  const listStatus = anilistEntry;

  const genres = Array.isArray(media.genres) ? media.genres.join(', ') : null;
  const tags = Array.isArray(media.tags) ? media.tags.map(t => t.name).join(', ') : null;
  const allGenres = [genres, tags].filter(Boolean).join(', ') || null;

  // Déterminer si R18 basé sur les tags
  const isR18 = tags && (tags.toLowerCase().includes('hentai') || tags.toLowerCase().includes('erotica'));

  // Préparer les titres alternatifs
  let titresAlternatifs = null;
  const altTitles = [];
  if (media.title?.romaji && media.title.romaji !== media.title?.english) {
    altTitles.push(media.title.romaji);
  }
  if (media.title?.native && media.title.native !== media.title?.english) {
    altTitles.push(media.title.native);
  }
  if (altTitles.length > 0) {
    titresAlternatifs = JSON.stringify(altTitles);
  }

  // Déterminer le media_type pour le matching
  // Utiliser aussi le titre natif pour détecter manhua/manhwa quand le format est juste "MANGA"
  // Log pour debug : voir ce que l'API retourne réellement
  if (media.format) {
    console.log(`📋 [AniList] Format reçu depuis l'API: "${media.format}" (type: ${typeof media.format})`);
  }
  const normalizedMediaType = convertAniListFormatToMediaType(media.format, media.title?.native);
  if (normalizedMediaType) {
    console.log(`✅ [AniList] Format converti en media_type: "${normalizedMediaType}"`);
  }

  return {
    anilist_id: media.id,
    mal_id: media.idMal || null,
    titre: media.title?.english || media.title?.romaji || media.title?.native || null,
    titre_romaji: media.title?.romaji || null,
    titre_anglais: media.title?.english || null,
    titre_natif: media.title?.native || null,
    titres_alternatifs: titresAlternatifs,
    media_type: normalizedMediaType,
    couverture_url: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || null,
    description: cleanHtmlText(media.description),
    statut_publication: convertAniListPublicationStatus(media.status),
    statut: convertAniListPublicationStatus(media.status) || 'En cours',
    annee_publication: media.startDate?.year || null,
    genres: allGenres,
    nb_volumes: media.volumes || null,
    nb_chapitres: media.chapters || null,
    score_mal: media.meanScore || media.averageScore || null,
    source_donnees: 'anilist',
    statut_perso: listStatus.status || 'PLANNING',
    statut_lecture: convertAniListReadingStatus(listStatus.status || 'PLANNING'),
    score_perso: listStatus.score || null,
    volumes_lus: listStatus.progressVolumes || 0,
    chapitres_lus: listStatus.progress || 0,
    date_debut: formatAniListUserDate(listStatus.startedAt),
    date_fin: formatAniListUserDate(listStatus.completedAt),
    updated_at: listStatus.updatedAt ? new Date(listStatus.updatedAt * 1000).toISOString() : null,
    // Utiliser le media_type détecté pour définir le type_volume si c'est un manhua/manhwa
    // Sinon utiliser la fonction de conversion basée sur le format
    type_volume: normalizedMediaType === 'Manhua' || normalizedMediaType === 'Manhwa'
      ? 'Webtoon'
      : convertAniListFormatToTypeVolume(media.format),
    est_r18: isR18 ? 1 : 0
  };
}

/**
 * Transforme les données AniList anime en format interne
 */
function transformAnimeData(anilistEntry) {
  const media = anilistEntry.media || {};
  const listStatus = anilistEntry;

  const genres = Array.isArray(media.genres) ? media.genres.join(', ') : null;
  const studios = Array.isArray(media.studios?.nodes)
    ? media.studios.nodes.map(s => s.name).join(', ')
    : null;

  return {
    anilist_id: media.id,
    mal_id: media.idMal || null,
    titre: media.title?.english || media.title?.romaji || media.title?.native || null,
    titre_natif: media.title?.native || null,
    titre_romaji: media.title?.romaji || null,
    couverture_url: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || null,
    description: cleanHtmlText(media.description),
    statut_diffusion: convertAniListPublicationStatus(media.status),
    type: convertAniListFormatToAnimeType(media.format),
    annee: media.startDate?.year || null,
    genres: genres,
    studios: studios,
    nb_episodes: media.episodes || 0,
    source_import: 'anilist',
    statut_perso: listStatus.status || 'PLANNING',
    score_perso: listStatus.score || null,
    episodes_vus: listStatus.progress || 0,
    date_debut: formatAniListUserDate(listStatus.startedAt),
    date_fin: formatAniListUserDate(listStatus.completedAt),
    updated_at: listStatus.updatedAt ? new Date(listStatus.updatedAt * 1000).toISOString() : null
  };
}

module.exports = {
  convertAniListPublicationStatus,
  convertAniListReadingStatus,
  convertAniListUserStatus,
  convertAniListFormatToMediaType,
  convertAniListFormatToTypeVolume,
  convertAniListFormatToAnimeType,
  cleanHtmlText,
  transformMangaData,
  transformAnimeData
};
