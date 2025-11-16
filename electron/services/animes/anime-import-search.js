/**
 * Recherche d'animes pour l'import
 * Fonctions de recherche par titre exact ou normalisé
 */

const { normalizeTitle, areSimilar, levenshteinDistance, checkStrictMatch } = require('../mangas/import-utils');

const TYPE_PRECEDENCE = {
  'movie': 1,
  'special': 2,
  'ova': 3,
  'ona': 4,
  'tv': 5,
  'music': 6,
  'unknown': 7,
  '': 8
};

function normalizeAnimeType(type) {
  if (!type) return '';
  return String(type).toLowerCase().trim();
}

/**
 * Parse un champ de titres alternatifs (peut être JSON, chaîne séparée, etc.)
 * @param {string|string[]|null} rawTitles
 * @returns {string[]} Tableau de titres nettoyés
 */
function parseAlternativeTitles(rawTitles) {
  if (!rawTitles) return [];

  const cleanStringArray = (arr) =>
    arr
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0 && value !== '[]');

  if (Array.isArray(rawTitles)) {
    return cleanStringArray(rawTitles);
  }

  if (typeof rawTitles === 'string') {
    const trimmed = rawTitles.trim();

    // Essayer de parser du JSON (format MAL: ["Titre1","Titre2"])
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return cleanStringArray(parsed);
        }
        if (typeof parsed === 'string') {
          return cleanStringArray([parsed]);
        }
      } catch {
        // Ignorer et fallback sur la logique de split
      }
    }

    // Fallback : séparer sur les séparateurs courants (/, |, virgules, point-virgule, retour ligne)
    return cleanStringArray(
      trimmed
        .split(/[\n\r;,/|]+/)
        .map((value) => value.replace(/^\[|\]$/g, '').trim())
    );
  }

  return [];
}

/**
 * Extrait tous les titres d'un anime depuis la base de données pour comparaison
 * @param {Object} anime - Anime depuis la base de données
 * @returns {Array<{original: string, normalized: string}>} - Liste des titres avec leur version normalisée
 */
function extractAllAnimeTitles(anime) {
  const titles = [];
  
  // Titre principal
  if (anime.titre) {
    titles.push({ original: anime.titre, normalized: normalizeTitle(anime.titre) });
  }
  
  // Titre romaji
  if (anime.titre_romaji) {
    titles.push({ original: anime.titre_romaji, normalized: normalizeTitle(anime.titre_romaji) });
  }
  
  // Titre natif
  if (anime.titre_natif) {
    titles.push({ original: anime.titre_natif, normalized: normalizeTitle(anime.titre_natif) });
  }
  
  // Titre anglais
  if (anime.titre_anglais) {
    titles.push({ original: anime.titre_anglais, normalized: normalizeTitle(anime.titre_anglais) });
  }
  
  // Titres alternatifs (JSON array ou chaîne séparée)
  const altTitles = parseAlternativeTitles(anime.titres_alternatifs);
  altTitles.forEach(alt => {
    if (alt && alt.trim()) {
      titles.push({ original: alt.trim(), normalized: normalizeTitle(alt.trim()) });
    }
  });
  
  return titles;
}

/**
 * Compare un titre normalisé avec tous les titres d'un anime
 * @param {string} normalizedTitle - Titre normalisé à comparer
 * @param {Array<{original: string, normalized: string}>} animeTitles - Liste des titres de l'anime
 * @returns {Object|null} - { match: boolean, similarity: number, matchedTitle: string, consecutiveCount: number } ou null
 */
function compareTitleWithAnimeTitles(normalizedTitle, animeTitles) {
  if (!normalizedTitle || animeTitles.length === 0) return null;
  
  // D'abord vérifier correspondance exacte
  for (const title of animeTitles) {
    if (title.normalized === normalizedTitle) {
      return { match: true, similarity: 100, matchedTitle: title.original, exact: true, consecutiveCount: normalizedTitle.length };
    }
  }
  
  // Ensuite vérifier matching strict (5+ caractères consécutifs depuis le début)
  let bestMatch = null;
  let bestSimilarity = 0;
  let bestConsecutiveCount = 0;
  
  for (const title of animeTitles) {
    const matchResult = checkStrictMatch(normalizedTitle, title.normalized);
    if (matchResult.match) {
      // Prioriser le match avec le plus de caractères consécutifs depuis le début
      // Si même nombre de caractères consécutifs, alors on prend celui avec la meilleure similarité
      if (matchResult.consecutiveCount > bestConsecutiveCount || 
          (matchResult.consecutiveCount === bestConsecutiveCount && matchResult.similarity > bestSimilarity)) {
        bestMatch = {
          match: true,
          similarity: matchResult.similarity,
          matchedTitle: title.original,
          exact: false,
          consecutiveCount: matchResult.consecutiveCount
        };
        bestSimilarity = matchResult.similarity;
        bestConsecutiveCount = matchResult.consecutiveCount;
      }
    }
  }
  
  return bestMatch;
}

/**
 * Cherche un anime existant avec normalisation et matching strict
 * Similaire à findSerieByTitleNormalized pour les mangas
 */
function findAnimeByTitleNormalized(db, titre, titreRomaji, titreNatif, titreAnglais, titreAlternatif, expectedType = null) {
  console.log('🔍 Vérification existence anime avec titre:', titre);
  console.log('   🏷️  Titre romaji:', titreRomaji || '(aucun)');
  console.log('   🏷️  Titre natif:', titreNatif || '(aucun)');
  console.log('   🏷️  Titre anglais:', titreAnglais || '(aucun)');
  console.log('   🏷️  Titre alternatif:', titreAlternatif || '(aucun)');
  
  // Normaliser le titre principal
  const normalizedMainTitle = normalizeTitle(titre);
  
  // Normaliser les autres titres
  const normalizedRomaji = titreRomaji ? normalizeTitle(titreRomaji) : '';
  const normalizedNatif = titreNatif ? normalizeTitle(titreNatif) : '';
  const normalizedAnglais = titreAnglais ? normalizeTitle(titreAnglais) : '';
  
  // Normaliser les titres secondaires (alternatifs)
  const newAltTitles = parseAlternativeTitles(titreAlternatif);
  const normalizedSecondaryTitles = Array.from(new Set(newAltTitles
    .map((title) => normalizeTitle(title))
    .filter(Boolean)));
  
  console.log('   🔄 Recherche par titre normalisé:', normalizedMainTitle);
  if (normalizedSecondaryTitles.length > 0) {
    console.log('   🔄 Alternatif divisé en', normalizedSecondaryTitles.length, 'partie(s) normalisée(s):', normalizedSecondaryTitles);
  }
  
  // Récupérer tous les animes
  const allAnimes = db.prepare(`
    SELECT id, titre, titre_romaji, titre_natif, titre_anglais, titres_alternatifs, type
    FROM anime_series
  `).all();
  
  console.log(`   📚 Base de données: ${allAnimes.length} anime(s) à comparer`);
  
  let exactMatch = null;
  let strictMatch = null;
  let bestStrictSimilarity = 0;
  let bestStrictMatchedTitle = null;
  let bestConsecutiveCount = 0; // Prioriser le match avec le plus de caractères consécutifs
  
  // Liste de tous les titres à comparer (principal + secondaires)
  const allNewTitles = [
    { normalized: normalizedMainTitle, original: titre },
    ...(normalizedRomaji ? [{ normalized: normalizedRomaji, original: titreRomaji }] : []),
    ...(normalizedNatif ? [{ normalized: normalizedNatif, original: titreNatif }] : []),
    ...(normalizedAnglais ? [{ normalized: normalizedAnglais, original: titreAnglais }] : []),
    ...normalizedSecondaryTitles.map((norm, idx) => ({ normalized: norm, original: newAltTitles[idx] }))
  ].filter(t => t.normalized);
  
  for (const anime of allAnimes) {
    // Vérifier le type si spécifié
    if (expectedType) {
      const existingType = normalizeAnimeType(anime.type);
      const desiredType = normalizeAnimeType(expectedType);
      if (desiredType && existingType && existingType !== desiredType) {
        continue; // Skip si types différents
      }
    }
    
    // Extraire tous les titres de l'anime
    const animeTitles = extractAllAnimeTitles(anime);
    
    // ÉTAPE 1 : Comparer tous les titres de Nautiljon avec tous les titres de l'anime
    for (const newTitle of allNewTitles) {
      const matchResult = compareTitleWithAnimeTitles(newTitle.normalized, animeTitles);
      if (matchResult) {
        if (matchResult.exact) {
          exactMatch = anime;
          break; // Correspondance exacte trouvée, on s'arrête
        } else if (matchResult.consecutiveCount !== undefined) {
          // Prioriser le match avec le plus de caractères consécutifs depuis le début
          // Si même nombre de caractères consécutifs, alors on prend celui avec la meilleure similarité
          if (matchResult.consecutiveCount > bestConsecutiveCount || 
              (matchResult.consecutiveCount === bestConsecutiveCount && matchResult.similarity > bestStrictSimilarity)) {
            strictMatch = anime;
            bestStrictSimilarity = matchResult.similarity;
            bestStrictMatchedTitle = matchResult.matchedTitle;
            bestConsecutiveCount = matchResult.consecutiveCount;
          }
        }
      }
    }
    
    if (exactMatch) {
      break; // Correspondance exacte trouvée, on s'arrête
    }
  }
  
  // Retourner la correspondance exacte si trouvée
  if (exactMatch) {
    console.log(`   ✅ Match exact trouvé: "${exactMatch.titre}"`);
    return { anime: exactMatch, isExactMatch: true, similarity: 100 };
  }
  
  // Si matching strict trouvé (selon les critères de checkStrictMatch), on le retourne avec l'info pour proposer à l'utilisateur
  // Le seuil minimum est maintenant 75% (pour l'option 3 avec 15+ caractères consécutifs)
  if (strictMatch && bestStrictSimilarity >= 75) {
    console.log(`   ⚠️ Match strict trouvé: "${strictMatch.titre}" (${bestStrictSimilarity.toFixed(2)}% de similarité, ${bestConsecutiveCount} caractères consécutifs depuis le début)`);
    return { 
      anime: strictMatch, 
      isExactMatch: false, 
      similarity: bestStrictSimilarity,
      matchedTitle: bestStrictMatchedTitle
    };
  }
  
  console.log('   ❌ Aucune correspondance trouvée');
  return null;
}

module.exports = {
  findAnimeByTitleNormalized
};
