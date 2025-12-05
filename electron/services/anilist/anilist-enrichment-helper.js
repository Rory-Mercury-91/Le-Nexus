/**
 * Helper pour l'enrichissement depuis AniList
 * Transforme les données AniList en format similaire à Jikan pour réutiliser la logique d'enrichissement
 */

/**
 * Transforme les données AniList manga en format Jikan-like pour l'enrichissement
 */
function transformAniListMangaForEnrichment(anilistData) {
  if (!anilistData) return null;
  
  // Extraire les tags pour les thèmes
  const tags = Array.isArray(anilistData.tags) 
    ? anilistData.tags.map(t => ({ name: t.name }))
    : [];
  
  // Formater les dates
  const startDate = anilistData.startDate;
  const endDate = anilistData.endDate;
  
  const published = {
    from: startDate?.year && startDate?.month && startDate?.day
      ? `${startDate.year}-${String(startDate.month).padStart(2, '0')}-${String(startDate.day).padStart(2, '0')}`
      : startDate?.year ? `${startDate.year}-01-01` : null,
    to: endDate?.year && endDate?.month && endDate?.day
      ? `${endDate.year}-${String(endDate.month).padStart(2, '0')}-${String(endDate.day).padStart(2, '0')}`
      : endDate?.year ? `${endDate.year}-12-31` : null
  };
  
  // Convertir le statut AniList vers le format Jikan
  const statusMap = {
    'FINISHED': 'Finished',
    'RELEASING': 'Publishing',
    'NOT_YET_RELEASED': 'Not yet published',
    'CANCELLED': 'Discontinued',
    'HIATUS': 'On Hiatus'
  };
  
  // Convertir le format AniList vers le type Jikan
  // Utiliser la fonction de conversion centralisée
  // Utiliser aussi le titre natif pour détecter manhua/manhwa quand le format est juste "MANGA"
  const { convertAniListFormatToMediaType, cleanHtmlText } = require('./anilist-transformers');
  const jikanType = convertAniListFormatToMediaType(anilistData.format, anilistData.title?.native) || 'Manga';
  
  return {
    mal_id: anilistData.idMal || null,
    title: anilistData.title?.romaji || anilistData.title?.english || anilistData.title?.native || null,
    title_japanese: anilistData.title?.native || null,
    title_english: anilistData.title?.english || anilistData.title?.romaji || null,
    title_synonyms: [
      anilistData.title?.romaji,
      anilistData.title?.english,
      anilistData.title?.native
    ].filter((t, i, arr) => t && arr.indexOf(t) === i && t !== (anilistData.title?.english || anilistData.title?.romaji || anilistData.title?.native)),
    synopsis: cleanHtmlText(anilistData.description), // Nettoyer toutes les balises HTML et entités
    chapters: anilistData.chapters || null,
    volumes: anilistData.volumes || null,
    published: published,
    status: statusMap[anilistData.status] || anilistData.status,
    genres: Array.isArray(anilistData.genres) 
      ? anilistData.genres.map(g => ({ name: g }))
      : [],
    themes: tags.filter(t => {
      // Filtrer les tags qui sont des thèmes (pas des genres)
      const themeKeywords = ['psychological', 'supernatural', 'horror', 'mystery', 'thriller', 'sports', 'martial arts', 'military', 'police', 'super power', 'magic', 'vampire', 'zombie', 'time travel', 'reincarnation', 'isekai', 'harem', 'reverse harem', 'yuri', 'yaoi', 'shounen ai', 'shoujo ai'];
      return themeKeywords.some(keyword => t.name.toLowerCase().includes(keyword));
    }),
    demographics: tags.filter(t => {
      // Filtrer les tags qui sont des démographies
      const demoKeywords = ['shounen', 'shoujo', 'seinen', 'josei', 'kids'];
      return demoKeywords.some(keyword => t.name.toLowerCase().includes(keyword));
    }),
    serializations: [], // AniList n'a pas de champ serialization direct
    score: anilistData.meanScore || anilistData.averageScore || null,
    rank: null, // AniList n'a pas de rank
    popularity: anilistData.popularity || null,
    type: jikanType,
    authors: [], // AniList n'a pas d'auteurs dans la requête de base (nécessiterait une requête supplémentaire)
    background: null, // AniList n'a pas de background séparé
    images: {
      jpg: {
        large_image_url: anilistData.coverImage?.extraLarge || anilistData.coverImage?.large || anilistData.coverImage?.medium || null,
        image_url: anilistData.coverImage?.large || anilistData.coverImage?.medium || null
      }
    },
    relations: anilistData.relations?.edges?.map(edge => ({
      relation: edge.relationType,
      entry: [{
        mal_id: edge.node?.idMal || null,
        name: edge.node?.title?.romaji || edge.node?.title?.english || null,
        type: null // AniList ne fournit pas le type dans les relations
      }]
    })) || []
  };
}

module.exports = {
  transformAniListMangaForEnrichment
};
