/**
 * Service de matching de séries
 * Gère la recherche et la correspondance de séries existantes
 */

const { findSerieByTitleNormalized } = require('./import-search');
const { inferMediaType } = require('./manga-import-parser');

/**
 * Normalise un titre pour la comparaison (case-insensitive, trim)
 * @param {string} str - Titre à normaliser
 * @returns {string} - Titre normalisé
 */
function normalizeForComparison(str) {
  if (!str) return '';
  return str.toLowerCase().trim();
}

/**
 * Parse un titre alternatif en tableau
 * @param {string} altTitle - Titre alternatif (format: "Titre1 / Titre2 / Titre3")
 * @returns {string[]} - Tableau de titres
 */
function parseAltTitles(altTitle) {
  if (!altTitle) return [];
  return altTitle.split('/').map(t => t.trim()).filter(Boolean);
}

/**
 * Combine et déduplique des titres alternatifs
 * @param {string[]} titles - Tableau de titres alternatifs
 * @returns {string[]} - Titres uniques
 */
function deduplicateAltTitles(titles) {
  const uniqueTitles = [];
  const seen = new Set();
  
  for (const title of titles) {
    const normalized = normalizeForComparison(title);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueTitles.push(title);
    }
  }
  
  return uniqueTitles;
}

/**
 * Trouve une série existante et prépare les données de fusion
 * Vérifie aussi le type de média pour éviter qu'un light novel écrase un manga (ou vice versa)
 * @param {Database} db - Instance de la base de données
 * @param {Object} parsedData - Données parsées depuis Nautiljon
 * @returns {Object|null} - Série existante ou null
 */
function findExistingSerie(db, parsedData) {
  // Utiliser titres_alternatifs au lieu de titre_alternatif
  const altTitlesForMatching = [];
  const pushAlt = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(pushAlt);
      return;
    }
    const str = String(value).trim();
    if (!str) return;
    altTitlesForMatching.push(str);
  };

  if (parsedData.titres_alternatifs) {
    try {
      const parsed = JSON.parse(parsedData.titres_alternatifs);
      if (Array.isArray(parsed)) {
        pushAlt(parsed);
      }
    } catch {
      pushAlt(parsedData.titres_alternatifs);
    }
  }

  // Inclure les titres originaux/VO pour améliorer le matching
  if (parsedData.titre_vo) {
    pushAlt(parsedData.titre_vo.split('/'));
  }
  if (parsedData.titre_natif) {
    pushAlt(parsedData.titre_natif.split('/'));
  }
  if (parsedData.titre_original) {
    pushAlt(parsedData.titre_original.split('/'));
  }
  
  // Déterminer le type de média de la nouvelle série (avant recherche pour filtrer)
  const normalizeMediaType = (type) => {
    if (!type) return null;
    const lower = type.toLowerCase();
    if (lower.includes('light novel') || lower.includes('novel')) return 'light novel';
    if (lower.includes('manga')) return 'manga';
    if (lower.includes('manhwa')) return 'manhwa';
    if (lower.includes('manhua')) return 'manhua';
    return lower;
  };

  const newMediaTypeRaw = parsedData.media_type || inferMediaType({
    demographie: parsedData.demographie,
    type_volume: parsedData.type_volume
  });
  const newMediaTypeNormalized = normalizeMediaType(newMediaTypeRaw);
  const newTypeVolume = parsedData.type_volume || '';

  const matchResult = findSerieByTitleNormalized(
    db,
    parsedData.titre,
    altTitlesForMatching,
    newMediaTypeNormalized
  );
  
  if (!matchResult) {
    return null;
  }
  
  const existingSerie = matchResult.serie;
  
  // Récupérer le type de média complet de la série existante
  const fullSerie = db.prepare('SELECT id, titre, media_type, type_volume FROM manga_series WHERE id = ?').get(existingSerie.id);
  
  const existingMediaType = normalizeMediaType(fullSerie.media_type);
  
  // Vérifier aussi type_volume pour les light novels (car type_volume peut être "Light Novel")
  const isExistingLightNovel = existingMediaType === 'light novel' || 
                               (fullSerie.type_volume && fullSerie.type_volume.toLowerCase().includes('light novel'));
  const isNewLightNovel = newMediaTypeNormalized === 'light novel' || 
                          (newTypeVolume && newTypeVolume.toLowerCase().includes('light novel'));
  
  // Si les types de média ne correspondent pas, ne pas retourner la série existante
  if (isExistingLightNovel !== isNewLightNovel) {
    return null;
  }
  
  // Retourner la série avec les informations de matching
  return {
    serie: existingSerie,
    isExactMatch: matchResult.isExactMatch,
    similarity: matchResult.similarity,
    matchedTitle: matchResult.matchedTitle
  };
}

/**
 * Parse les titres alternatifs depuis MAL (peut être JSON array ou chaîne séparée par virgules)
 * @param {string} titresAlternatifs - Titres alternatifs depuis MAL
 * @returns {string[]} - Tableau de titres
 */
function parseMALAltTitles(titresAlternatifs) {
  if (!titresAlternatifs) return [];
  
  try {
    const parsed = JSON.parse(titresAlternatifs);
    if (Array.isArray(parsed)) {
      return parsed.map(t => String(t).trim()).filter(Boolean);
    }
  } catch {
    // Si ce n'est pas du JSON, traiter comme une chaîne séparée par des virgules ou "//"
    return titresAlternatifs
      .split(/[,/|]+/)
      .map(t => t.trim())
      .filter(Boolean);
  }
  
  return [];
}

/**
 * Prépare les titres alternatifs pour la fusion
 * Fusionne titres_alternatifs existants avec les nouveaux titres depuis Nautiljon avec déduplication
 * @param {Object} currentData - Données actuelles de la série
 * @param {Object} parsedData - Données parsées depuis Nautiljon
 * @returns {string|null} - Titres alternatifs fusionnés (format: "Titre1 / Titre2")
 */
function prepareMergedAltTitles(currentData, parsedData) {
  const allAltTitles = [];
  const seenNormalized = new Set();
  
  // Normaliser pour comparaison (amélioré pour mieux détecter les doublons)
  const normalizeForDedup = (str) => {
    if (!str) return '';
    // Normaliser les caractères (NFKC pour unifier les variantes)
    let normalized = str
      .normalize('NFKC')
      .toLowerCase()
      .trim();
    
    // Supprimer les accents latins
    normalized = normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    // Supprimer les espaces et ponctuation
    normalized = normalized
      .replace(/[\s\u2000-\u200B\u2028\u2029]+/g, '')
      .replace(/[.,;:!?()[\]{}'"`~\-_=+*&^%$#@]/g, '')
      .replace(/[！？。、，；：（）【】「」『』]/g, '');
    
    // Garder uniquement les caractères alphanumériques et CJK
    normalized = normalized.replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/g, '');
    
    return normalized;
  };
  
  // Ajouter les titres alternatifs existants depuis titres_alternatifs (format JSON array)
  const existingAltTitles = parseMALAltTitles(currentData.titres_alternatifs);
  for (const title of existingAltTitles) {
    const normalized = normalizeForDedup(title);
    if (!seenNormalized.has(normalized)) {
      seenNormalized.add(normalized);
      allAltTitles.push(title);
    }
  }
  
  // Préserver l'ancien titre si différent du nouveau
  const newTitle = parsedData.titre || currentData.titre;
  const oldTitle = currentData.titre;
  
  if (parsedData.titre && parsedData.titre !== oldTitle && oldTitle) {
    const oldTitleNormalized = normalizeForDedup(oldTitle);
    if (!seenNormalized.has(oldTitleNormalized)) {
      seenNormalized.add(oldTitleNormalized);
      allAltTitles.push(oldTitle);
    }
  }
  
  // Fusionner avec les nouveaux titres depuis Nautiljon (déjà dans titres_alternatifs au format JSON)
  const newAltTitles = parseMALAltTitles(parsedData.titres_alternatifs);
  for (const title of newAltTitles) {
    const normalized = normalizeForDedup(title);
    if (!seenNormalized.has(normalized)) {
      seenNormalized.add(normalized);
      allAltTitles.push(title);
    }
  }
  
  return allAltTitles.length > 0 ? allAltTitles.join(' / ') : null;
}

module.exports = {
  normalizeForComparison,
  parseAltTitles,
  parseMALAltTitles,
  deduplicateAltTitles,
  findExistingSerie,
  prepareMergedAltTitles
};
