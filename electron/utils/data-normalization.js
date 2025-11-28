/**
 * Utilitaires pour la normalisation et la déduplication des données
 */

const { genreTranslations, themeTranslations, deduplicateUsingTranslations } = require('./translation-dictionaries');

/**
 * Déduplique une liste de genres/thèmes/tags séparés par des virgules
 * Utilise d'abord la déduplication basée sur les traductions, puis la déduplication basique
 * @param {string|null|undefined} itemsString - Chaîne de genres/thèmes séparés par des virgules
 * @param {Object|null} translationDictionary - Dictionnaire de traductions (genreTranslations, themeTranslations) ou null pour déduplication basique
 * @returns {string|null} - Chaîne dédupliquée ou null si vide
 */
function deduplicateCommaSeparatedItems(itemsString, translationDictionary = null) {
  if (!itemsString || typeof itemsString !== 'string') {
    return null;
  }
  
  const trimmed = itemsString.trim();
  if (trimmed === '') {
    return null;
  }
  
  // Si un dictionnaire de traduction est fourni, utiliser la déduplication basée sur les traductions
  if (translationDictionary) {
    return deduplicateUsingTranslations(itemsString, translationDictionary);
  }
  
  // Sinon, déduplication basique (sans traduction)
  // Séparer par virgules et nettoyer chaque élément
  const items = trimmed
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  if (items.length === 0) {
    return null;
  }
  
  // Dédupliquer en normalisant pour la comparaison
  const seen = new Set();
  const result = [];
  
  for (const item of items) {
    // Normaliser pour la comparaison (minuscules, espaces multiples)
    const normalized = item.toLowerCase().replace(/\s+/g, ' ').trim();
    
    if (!seen.has(normalized)) {
      seen.add(normalized);
      // Conserver la casse originale du premier élément trouvé
      result.push(item);
    }
  }
  
  return result.length > 0 ? result.join(', ') : null;
}

/**
 * Normalise et déduplique les genres depuis Nautiljon
 * (normalise aussi le séparateur " - " en ", " et utilise les traductions pour dédupliquer)
 * @param {string|null|undefined} itemsString - Chaîne de genres
 * @returns {string|null} - Chaîne normalisée et dédupliquée ou null si vide
 */
function normalizeAndDeduplicateNautiljonGenres(itemsString) {
  if (!itemsString || typeof itemsString !== 'string') {
    return null;
  }
  
  const trimmed = itemsString.trim();
  if (trimmed === '') {
    return null;
  }
  
  // Normaliser le séparateur " - " en ", "
  const normalized = trimmed.replace(/\s*-\s*/g, ', ');
  
  // Dédupliquer en utilisant les traductions de genres
  return deduplicateCommaSeparatedItems(normalized, genreTranslations);
}

/**
 * Normalise et déduplique les thèmes depuis Nautiljon
 * (normalise aussi le séparateur " - " en ", " et utilise les traductions pour dédupliquer)
 * @param {string|null|undefined} itemsString - Chaîne de thèmes
 * @returns {string|null} - Chaîne normalisée et dédupliquée ou null si vide
 */
function normalizeAndDeduplicateNautiljonThemes(itemsString) {
  if (!itemsString || typeof itemsString !== 'string') {
    return null;
  }
  
  const trimmed = itemsString.trim();
  if (trimmed === '') {
    return null;
  }
  
  // Normaliser le séparateur " - " en ", "
  const normalized = trimmed.replace(/\s*-\s*/g, ', ');
  
  // Dédupliquer en utilisant les traductions de thèmes
  return deduplicateCommaSeparatedItems(normalized, themeTranslations);
}

/**
 * Normalise et déduplique les genres/thèmes depuis Nautiljon (version générique, sans traduction)
 * (normalise aussi le séparateur " - " en ", ")
 * @param {string|null|undefined} itemsString - Chaîne de genres/thèmes
 * @returns {string|null} - Chaîne normalisée et dédupliquée ou null si vide
 * @deprecated Utiliser normalizeAndDeduplicateNautiljonGenres ou normalizeAndDeduplicateNautiljonThemes à la place
 */
function normalizeAndDeduplicateNautiljonItems(itemsString) {
  if (!itemsString || typeof itemsString !== 'string') {
    return null;
  }
  
  const trimmed = itemsString.trim();
  if (trimmed === '') {
    return null;
  }
  
  // Normaliser le séparateur " - " en ", "
  const normalized = trimmed.replace(/\s*-\s*/g, ', ');
  
  // Dédupliquer (sans traduction pour compatibilité)
  return deduplicateCommaSeparatedItems(normalized);
}

module.exports = {
  deduplicateCommaSeparatedItems,
  normalizeAndDeduplicateNautiljonItems, // Version générique (dépréciée, pour compatibilité)
  normalizeAndDeduplicateNautiljonGenres, // Version avec déduplication basée sur traductions
  normalizeAndDeduplicateNautiljonThemes  // Version avec déduplication basée sur traductions
};
