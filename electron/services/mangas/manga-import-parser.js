/**
 * Convertit le rating de Nautiljon (format MAL) vers notre format standardisé
 * @param {string} rating - Rating au format MAL depuis Nautiljon
 * @returns {string|null} - Rating standardisé ('erotica', 'suggestive', 'safe') ou null
 */
function convertNautiljonRating(rating) {
  if (!rating) return null;
  
  const ratingLower = rating.toLowerCase();
  
  // Rating très explicite (Rx/Hentai) → erotica
  if (ratingLower.includes('rx') || ratingLower.includes('hentai')) {
    return 'erotica';
  }
  
  // Rating explicite (R+) → erotica
  if (ratingLower.includes('r+') || ratingLower.includes('mild nudity')) {
    return 'erotica';
  }
  
  // Rating suggestif → suggestive (contenu mature mais pas explicite)
  if (ratingLower.includes('r - 17') || ratingLower.includes('17+') || 
      ratingLower.includes('violence') || ratingLower.includes('ecchi')) {
    return 'suggestive';
  }
  
  // Rating pour adolescents (PG-13) → safe (contenu adapté aux adolescents)
  if (ratingLower.includes('pg-13') || ratingLower.includes('13')) {
    return 'safe';
  }
  
  // Par défaut → safe
  if (ratingLower.includes('pg') || ratingLower.includes('children') || 
      ratingLower.includes('g') || ratingLower.includes('tout public')) {
    return 'safe';
  }
  
  // Si format non reconnu, retourner null pour laisser le système déduire depuis les genres
  return null;
}

/**
 * Parser et validation des données Nautiljon
 * Extrait et normalise les données reçues depuis Nautiljon
 */

/**
 * Parse et valide les données Nautiljon
 * @param {Object} mangaData - Données brutes depuis Nautiljon
 * @returns {Object} - Données parsées et validées
 * @throws {Error} - Si les données sont invalides
 */
function parseNautiljonData(mangaData) {
  if (!mangaData.titre) {
    throw new Error('Le titre est obligatoire');
  }
  
  // Inférer le type de média
  const mediaType = inferMediaType({
    demographie: mangaData.demographie,
    type_volume: mangaData.type_volume
  });
  
  // Préparer les titres alternatifs et originaux
  const normalizeForDedup = (str) => {
    if (!str) return '';
    return str
      .normalize('NFKC')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s\u2000-\u200B\u2028\u2029]+/g, ' ')
      .trim();
  };

  const splitCandidates = (input) => {
    if (input == null) return [];
    const entries = Array.isArray(input) ? input : [input];
    const values = [];
    for (const raw of entries) {
      if (raw == null) continue;
      String(raw)
        .split(/[\\/|]+/)
        .map(part => part.trim())
        .filter(Boolean)
        .forEach(part => values.push(part));
    }
    return values;
  };

  // Parser "Titre original" de Nautiljon (format: "romanji / natif" ou "romanji / natif / autre")
  // Exemple: "8Seokeul Mabeopsaui Hwansaeng / 8서클 마법사의 환생"
  const originalParts = splitCandidates(mangaData.titre_original);

  let titreVoPrimary = mangaData.titre_vo || null;
  let titreNatif = mangaData.titre_natif || null;

  // Parser titre_vo si fourni (peut aussi contenir plusieurs parties séparées par /)
  const voParts = splitCandidates(mangaData.titre_vo);

  if (voParts.length > 0) {
    titreVoPrimary = voParts[0]; // Premier = romaji
    if (!titreNatif && voParts.length > 1) {
      // Dernier = natif (si contient des caractères non-latins)
      const lastPart = voParts[voParts.length - 1];
      // Vérifier si c'est du texte natif (japonais, coréen, chinois)
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]/.test(lastPart)) {
        titreNatif = lastPart;
      }
    }
  }

  // Parser titre_original (format Nautiljon: "romanji / natif")
  if (originalParts.length > 0) {
    // Premier élément = romaji (latin)
    titreVoPrimary = titreVoPrimary || originalParts[0];
    
    // Chercher le natif (dernier élément avec caractères non-latins)
    if (originalParts.length > 1) {
      // Parcourir de la fin pour trouver le natif
      for (let i = originalParts.length - 1; i >= 1; i--) {
        const part = originalParts[i];
        // Vérifier si c'est du texte natif (japonais, coréen, chinois)
        if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]/.test(part)) {
          titreNatif = titreNatif || part;
          break;
        }
      }
      // Si aucun natif trouvé, prendre le dernier élément
      if (!titreNatif) {
        titreNatif = originalParts[originalParts.length - 1];
      }
    }
  }

  const altCandidates = [];
  altCandidates.push(...splitCandidates(mangaData.titre_alternatif));
  altCandidates.push(...splitCandidates(mangaData._titre_vo_list));
  if (originalParts.length > 1) {
    altCandidates.push(...originalParts.slice(1));
  }
  if (voParts.length > 1) {
    altCandidates.push(...voParts.slice(1));
  }

  const altSeen = new Set();
  const altDeduped = [];

  for (const alt of altCandidates) {
    const cleaned = alt.trim();
    if (!cleaned) continue;
    const normalized = normalizeForDedup(cleaned);
    if (!normalized) continue;

    // Ne pas dupliquer les titres originaux
    if (titreVoPrimary && normalizeForDedup(titreVoPrimary) === normalized) continue;
    if (titreNatif && normalizeForDedup(titreNatif) === normalized) continue;

    if (!altSeen.has(normalized)) {
      altSeen.add(normalized);
      altDeduped.push(cleaned);
    }
  }

  let titresAlternatifsJson = null;
  if (altDeduped.length > 0) {
    titresAlternatifsJson = JSON.stringify(altDeduped);
  }
  
  return {
    titre: mangaData.titre.trim(),
    titre_alternatif: null, // Ne plus utiliser titre_alternatif, tout est dans titres_alternatifs
    titre_vo: titreVoPrimary || mangaData.titre_vo || null,
    titre_natif: titreNatif || null,
    titre_original: mangaData.titre_original || null,
    type_volume: mangaData.type_volume || 'Broché',
    type_contenu: mangaData.type_contenu || 'volume',
    media_type: mediaType,
    titres_alternatifs: titresAlternatifsJson, // Stocker dans titres_alternatifs au format JSON array
    description: mangaData.description || null,
    statut_publication: mangaData.statut_publication || null, // Statut VF
    statut_publication_vo: mangaData.statut_publication_vo || null, // Statut VO extrait depuis "Nb volumes VO : X (En cours)"
    annee_publication: mangaData.annee_publication || null,
    annee_publication_vo: mangaData.annee_publication_vo || null,
    genres: mangaData.genres ? mangaData.genres.replace(/\s*-\s*/g, ', ') : null,
    nb_chapitres_vo: mangaData.nb_chapitres_vo || null,
    nb_chapitres: mangaData.nb_chapitres || null,
    nb_volumes_vo: mangaData.nb_volumes_vo,
    nb_volumes: typeof mangaData.nb_volumes === 'number' ? mangaData.nb_volumes : null,
    langue_originale: mangaData.langue_originale || 'ja',
    demographie: mangaData.demographie || null,
    editeur: mangaData.editeur || mangaData._editeur || null,
    editeur_vo: mangaData.editeur_vo || mangaData._editeur_vo || null,
    rating: convertNautiljonRating(mangaData.rating) || null,
    themes: mangaData._themes ? mangaData._themes.replace(/\s*-\s*/g, ', ') : null,
    auteurs: mangaData._auteurs || null,
    serialization: mangaData._prepublication || null,
    couverture_url: mangaData.couverture_url || null,
    nautiljon_url: mangaData.nautiljon_url || mangaData._url || null,
    volumes: Array.isArray(mangaData.volumes) ? mangaData.volumes : []
  };
}

/**
 * Infère le type de média (Manga, Manhwa, Manhua, Light Novel) depuis les données
 * @param {Object} mangaData - Données Nautiljon
 * @returns {string} - 'Manga', 'Manhwa', 'Manhua', 'Light Novel'
 */
function inferMediaType(mangaData) {
  if (mangaData.webnovel) {
    return 'Light Novel';
  }
  const demo = (mangaData.demographie || '').toLowerCase();
  const typeVol = (mangaData.type_volume || '').toLowerCase();
  const origine = (mangaData.origine || '').toLowerCase();
  const source = (mangaData.source || '').toLowerCase();
  
  if (
    typeVol.includes('light novel') ||
    typeVol.includes('roman') ||
    typeVol.includes('novel') ||
    demo.includes('light novel') ||
    origine.includes('roman') ||
    source.includes('roman')
  ) {
    return 'Light Novel';
  }
  
  if (demo.includes('manhwa') || typeVol.includes('webtoon') || typeVol.includes('manhwa')) return 'Manhwa';
  if (demo.includes('manhua') || typeVol.includes('manhua')) return 'Manhua';
  
  return 'Manga';
}

module.exports = {
  parseNautiljonData,
  inferMediaType
};
