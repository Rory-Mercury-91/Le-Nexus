/**
 * Service de matching unifié pour toutes les sources d'import
 * Utilisé par Mihon, Nautiljon, MAL pour mangas ET animes
 * 
 * Logique unifiée :
 * 1. Recherche par mal_id si disponible
 * 2. Recherche par titre principal avec normalisation et Levenshtein
 * 3. Recherche par titres secondaires (découpés par "/" avant normalisation)
 * 4. Si concordance parfaite (exacte) → retourne avec isExactMatch: true
 * 5. Si similarité détectée (>= 75%) → retourne avec isExactMatch: false et similarity
 * 6. Si aucune concordance → retourne null
 */

const { normalizeTitle, checkStrictMatch, calculateSimilarity } = require('./mangas/import-utils');

/**
 * Divise une chaîne de titres alternatifs séparés par "/", "|", etc.
 * @param {string|string[]|null} altTitles - Titres alternatifs (peut être une chaîne séparée, un array, ou null)
 * @returns {string[]} - Tableau de titres nettoyés et découpés
 */
function splitAlternativeTitles(altTitles) {
  if (!altTitles) return [];
  
  // Si c'est déjà un array, le retourner directement
  if (Array.isArray(altTitles)) {
    return altTitles
      .map(t => String(t).trim())
      .filter(Boolean);
  }
  
  // Si c'est une chaîne JSON, essayer de la parser
  if (typeof altTitles === 'string') {
    const trimmed = altTitles.trim();
    
    // Essayer de parser du JSON (format MAL: ["Titre1","Titre2"])
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map(t => String(t).trim())
            .filter(Boolean);
        }
        if (typeof parsed === 'string') {
          // C'est un string JSON, le traiter comme chaîne normale
        }
      } catch {
        // Ignorer et fallback sur la logique de split
      }
    }
    
    // Découper par "/", "|", ",", ";", ou retour à la ligne
    return trimmed
      .split(/[\n\r;,\/|]+/)
      .map(t => t.trim().replace(/^\[|\]$/g, ''))
      .filter(Boolean);
  }
  
  return [];
}

/**
 * Extrait tous les titres d'une série manga depuis la base de données
 * @param {Object} serie - Série depuis la base de données
 * @returns {Array<{original: string, normalized: string, priority: number}>} - Liste des titres avec leur version normalisée et priorité
 * priority: 1 = titre_romaji (prioritaire), 2 = titre_natif, 3 = titre_anglais, 4 = titre principal, 5 = titres alternatifs
 */
function extractAllSerieTitles(serie) {
  const titles = [];
  
  // Titre romaji (priorité 1 - le plus fiable pour matching entre sources)
  if (serie.titre_romaji) {
    titles.push({ original: serie.titre_romaji, normalized: normalizeTitle(serie.titre_romaji), priority: 1 });
  }
  
  // Titre natif (priorité 2 - japonais, très unique)
  if (serie.titre_natif) {
    titles.push({ original: serie.titre_natif, normalized: normalizeTitle(serie.titre_natif), priority: 2 });
  }
  
  // Titre anglais (priorité 3 - international)
  if (serie.titre_anglais) {
    titles.push({ original: serie.titre_anglais, normalized: normalizeTitle(serie.titre_anglais), priority: 3 });
  }
  
  // Titre principal (priorité 4 - peut varier selon la langue)
  if (serie.titre) {
    titles.push({ original: serie.titre, normalized: normalizeTitle(serie.titre), priority: 4 });
  }
  
  // Titres alternatifs (priorité 5)
  if (serie.titres_alternatifs) {
    const altTitles = splitAlternativeTitles(serie.titres_alternatifs);
    altTitles.forEach(alt => {
      if (alt && alt.trim()) {
        titles.push({ original: alt.trim(), normalized: normalizeTitle(alt.trim()), priority: 5 });
      }
    });
  }
  
  // Fallback sur titre_alternatif pour compatibilité (priorité 5)
  if (serie.titre_alternatif) {
    const altTitles = splitAlternativeTitles(serie.titre_alternatif);
    altTitles.forEach(alt => {
      if (alt && alt.trim()) {
        titles.push({ original: alt.trim(), normalized: normalizeTitle(alt.trim()), priority: 5 });
      }
    });
  }
  
  return titles;
}

/**
 * Extrait tous les titres d'un anime depuis la base de données
 * @param {Object} anime - Anime depuis la base de données
 * @returns {Array<{original: string, normalized: string, priority: number}>} - Liste des titres avec leur version normalisée et priorité
 */
function extractAllAnimeTitles(anime) {
  const titles = [];
  
  // Titre romaji (priorité 1)
  if (anime.titre_romaji) {
    titles.push({ original: anime.titre_romaji, normalized: normalizeTitle(anime.titre_romaji), priority: 1 });
  }
  
  // Titre natif (priorité 2)
  if (anime.titre_natif) {
    titles.push({ original: anime.titre_natif, normalized: normalizeTitle(anime.titre_natif), priority: 2 });
  }
  
  // Titre anglais (priorité 3)
  if (anime.titre_anglais) {
    titles.push({ original: anime.titre_anglais, normalized: normalizeTitle(anime.titre_anglais), priority: 3 });
  }
  
  // Titre principal (priorité 4)
  if (anime.titre) {
    titles.push({ original: anime.titre, normalized: normalizeTitle(anime.titre), priority: 4 });
  }
  
  // Titres alternatifs (priorité 5)
  if (anime.titres_alternatifs) {
    const altTitles = splitAlternativeTitles(anime.titres_alternatifs);
    altTitles.forEach(alt => {
      if (alt && alt.trim()) {
        titles.push({ original: alt.trim(), normalized: normalizeTitle(alt.trim()), priority: 5 });
      }
    });
  }
  
  return titles;
}

/**
 * Compare un titre normalisé avec tous les titres d'une série/anime
 * @param {string} normalizedTitle - Titre normalisé à comparer
 * @param {Array<{original: string, normalized: string, priority: number}>} existingTitles - Liste des titres existants
 * @returns {Object|null} - { exact: boolean, similarity: number, matchedTitle: string, consecutiveCount: number, matchedPriority: number } ou null
 */
function compareTitleWithExistingTitles(normalizedTitle, existingTitles) {
  if (!normalizedTitle || existingTitles.length === 0) return null;
  
  // D'abord vérifier correspondance exacte (prioriser par priority)
  let bestExactMatch = null;
  let bestExactPriority = Infinity;
  
  for (const title of existingTitles) {
    if (title.normalized === normalizedTitle) {
      if (title.priority < bestExactPriority) {
        bestExactMatch = {
          exact: true,
          similarity: 100,
          matchedTitle: title.original,
          consecutiveCount: normalizedTitle.length,
          matchedPriority: title.priority
        };
        bestExactPriority = title.priority;
      }
    }
  }
  
  if (bestExactMatch) {
    return bestExactMatch;
  }
  
  // Ensuite vérifier matching strict (5+ caractères consécutifs depuis le début)
  let bestMatch = null;
  let bestSimilarity = 0;
  let bestConsecutiveCount = 0;
  let bestPriority = Infinity;
  
  for (const title of existingTitles) {
    const matchResult = checkStrictMatch(normalizedTitle, title.normalized);
    if (matchResult.match && matchResult.similarity >= 75) {
      // Prioriser par : priorité > caractères consécutifs > similarité
      const isBetter = 
        title.priority < bestPriority ||
        (title.priority === bestPriority && matchResult.consecutiveCount > bestConsecutiveCount) ||
        (title.priority === bestPriority && matchResult.consecutiveCount === bestConsecutiveCount && matchResult.similarity > bestSimilarity);
      
      if (isBetter) {
        bestMatch = {
          exact: false,
          similarity: matchResult.similarity,
          matchedTitle: title.original,
          consecutiveCount: matchResult.consecutiveCount,
          matchedPriority: title.priority
        };
        bestSimilarity = matchResult.similarity;
        bestConsecutiveCount = matchResult.consecutiveCount;
        bestPriority = title.priority;
      }
    }
  }
  
  return bestMatch;
}

/**
 * Prépare les titres à comparer depuis les données de la source
 * @param {Object} sourceData - Données de la source
 * @param {string} sourceType - Type de source : 'mihon' | 'nautiljon' | 'mal'
 * @returns {Array<{original: string, normalized: string, priority: number}>} - Liste des titres à comparer
 */
function prepareSourceTitles(sourceData, sourceType) {
  const titles = [];
  
  // Pour toutes les sources, prioriser titre_romaji s'il existe
  if (sourceData.titre_romaji) {
    titles.push({ original: sourceData.titre_romaji, normalized: normalizeTitle(sourceData.titre_romaji), priority: 1 });
  }
  
  if (sourceData.titre_natif) {
    titles.push({ original: sourceData.titre_natif, normalized: normalizeTitle(sourceData.titre_natif), priority: 2 });
  }
  
  if (sourceData.titre_anglais) {
    titles.push({ original: sourceData.titre_anglais, normalized: normalizeTitle(sourceData.titre_anglais), priority: 3 });
  }
  
  // Titre principal (peut être français pour Nautiljon, romaji pour MAL/Mihon)
  if (sourceData.titre) {
    titles.push({ original: sourceData.titre, normalized: normalizeTitle(sourceData.titre), priority: 4 });
  }
  
  // Titres alternatifs (découper par "/" pour Nautiljon, parser JSON pour MAL)
  const altTitles = splitAlternativeTitles(sourceData.titres_alternatifs || sourceData.titre_alternatif);
  altTitles.forEach(alt => {
    if (alt && alt.trim()) {
      titles.push({ original: alt.trim(), normalized: normalizeTitle(alt.trim()), priority: 5 });
    }
  });
  
  return titles;
}

/**
 * Trouve une série manga existante avec la logique unifiée
 * @param {Database} db - Instance de la base de données
 * @param {Object} sourceData - Données de la source (doit contenir au minimum : titre, et optionnellement : mal_id, titre_romaji, titre_natif, titre_anglais, titres_alternatifs)
 * @param {string} sourceType - Type de source : 'mihon' | 'nautiljon' | 'mal'
 * @param {string|null} expectedMediaType - Type de média attendu (manga, light novel, manhwa, manhua) pour filtrer
 * @returns {Object|null} - { serie: Object, isExactMatch: boolean, similarity: number, matchedTitle: string, matchMethod: string } ou null
 */
function findExistingSerieUnified(db, sourceData, sourceType = 'mihon', expectedMediaType = null) {
  // ÉTAPE 1 : Recherche par mal_id si disponible
  if (sourceData.mal_id) {
    const existingByMalId = db.prepare('SELECT * FROM manga_series WHERE mal_id = ?').get(sourceData.mal_id);
    if (existingByMalId) {
      return {
        serie: existingByMalId,
        isExactMatch: true,
        similarity: 100,
        matchedTitle: existingByMalId.titre,
        matchMethod: 'mal_id'
      };
    }
  }
  
  // ÉTAPE 2 et 3 : Recherche par titres (principal + secondaires)
  const sourceTitles = prepareSourceTitles(sourceData, sourceType);
  
  if (sourceTitles.length === 0) {
    return null; // Pas de titre à comparer
  }
  
  // Récupérer toutes les séries (filtrées par type de média si spécifié)
  let allSeries;
  if (expectedMediaType) {
    // Normaliser le type de média pour la comparaison
    const normalizeMediaType = (type) => {
      if (!type) return null;
      const lower = String(type).toLowerCase();
      if (lower.includes('light novel') || lower.includes('novel')) return 'light novel';
      if (lower.includes('manhwa')) return 'manhwa';
      if (lower.includes('manhua')) return 'manhua';
      if (lower.includes('manga')) return 'manga';
      return lower;
    };
    
    const expectedNormalized = normalizeMediaType(expectedMediaType);
    allSeries = db.prepare('SELECT * FROM manga_series').all().filter(serie => {
      const serieType = normalizeMediaType(serie.media_type) || normalizeMediaType(serie.type_volume);
      return !serieType || serieType === expectedNormalized;
    });
  } else {
    allSeries = db.prepare('SELECT * FROM manga_series').all();
  }
  
  let exactMatch = null;
  let bestSimilarityMatch = null;
  let bestSimilarity = 0;
  let bestMatchedTitle = null;
  
  // Comparer chaque titre de la source avec toutes les séries existantes
  for (const sourceTitle of sourceTitles) {
    for (const serie of allSeries) {
      const serieTitles = extractAllSerieTitles(serie);
      
      // Comparer le titre de la source avec tous les titres de la série
      const matchResult = compareTitleWithExistingTitles(sourceTitle.normalized, serieTitles);
      
      if (matchResult) {
        // Un match exact n'est valide pour fusion automatique que s'il est sur un titre principal
        // (priority 1-4: romaji, natif, anglais, titre principal)
        // Les matches sur titres alternatifs (priority 5) ne doivent pas être considérés comme exacts
        // car plusieurs séries différentes peuvent partager le même titre alternatif
        const isExactMatchForMerge = matchResult.exact && matchResult.matchedPriority <= 4;
        
        if (isExactMatchForMerge) {
          // Match exact trouvé sur un titre principal
          if (!exactMatch || matchResult.matchedPriority < extractAllSerieTitles(exactMatch)[0].priority) {
            exactMatch = serie;
          }
          break; // On s'arrête dès qu'on trouve un match exact
        } else if (matchResult.exact && matchResult.matchedPriority === 5) {
          // Match exact sur un titre alternatif - traiter comme match avec similarité
          // Ne pas fusionner automatiquement, laisser l'utilisateur décider
          if (!bestSimilarityMatch || 
              matchResult.similarity > bestSimilarity) {
            bestSimilarityMatch = {
              serie: serie,
              similarity: matchResult.similarity,
              matchedTitle: matchResult.matchedTitle,
              matchedPriority: matchResult.matchedPriority
            };
            bestSimilarity = matchResult.similarity;
            bestMatchedTitle = matchResult.matchedTitle;
          }
        } else if (matchResult.similarity >= 75) {
          // Match avec similarité (>= 75%)
          if (!bestSimilarityMatch || 
              matchResult.matchedPriority < bestSimilarityMatch.matchedPriority ||
              (matchResult.matchedPriority === bestSimilarityMatch.matchedPriority && matchResult.similarity > bestSimilarity)) {
            bestSimilarityMatch = {
              serie: serie,
              similarity: matchResult.similarity,
              matchedTitle: matchResult.matchedTitle,
              matchedPriority: matchResult.matchedPriority
            };
            bestSimilarity = matchResult.similarity;
            bestMatchedTitle = matchResult.matchedTitle;
          }
        }
      }
    }
    
    // Si on a trouvé un match exact, on peut s'arrêter
    if (exactMatch) {
      break;
    }
  }
  
  // Retourner le match exact s'il existe
  if (exactMatch) {
    return {
      serie: exactMatch,
      isExactMatch: true,
      similarity: 100,
      matchedTitle: exactMatch.titre,
      matchMethod: 'title_exact'
    };
  }
  
  // Retourner le match avec similarité s'il existe
  if (bestSimilarityMatch && bestSimilarity >= 75) {
    return {
      serie: bestSimilarityMatch.serie,
      isExactMatch: false,
      similarity: bestSimilarity,
      matchedTitle: bestMatchedTitle,
      matchMethod: 'title_similarity'
    };
  }
  
  return null;
}

/**
 * Trouve un anime existant avec la logique unifiée
 * @param {Database} db - Instance de la base de données
 * @param {Object} sourceData - Données de la source (doit contenir au minimum : titre, et optionnellement : mal_id, titre_romaji, titre_natif, titre_anglais, titres_alternatifs)
 * @param {string} sourceType - Type de source : 'nautiljon' | 'mal'
 * @param {string|null} expectedType - Type d'anime attendu (tv, movie, ova, etc.) pour filtrer
 * @returns {Object|null} - { anime: Object, isExactMatch: boolean, similarity: number, matchedTitle: string, matchMethod: string } ou null
 */
function findExistingAnimeUnified(db, sourceData, sourceType = 'nautiljon', expectedType = null) {
  // ÉTAPE 1 : Recherche par mal_id si disponible
  if (sourceData.mal_id) {
    const existingByMalId = db.prepare('SELECT * FROM anime_series WHERE mal_id = ?').get(sourceData.mal_id);
    if (existingByMalId) {
      return {
        anime: existingByMalId,
        isExactMatch: true,
        similarity: 100,
        matchedTitle: existingByMalId.titre,
        matchMethod: 'mal_id'
      };
    }
  }
  
  // ÉTAPE 2 et 3 : Recherche par titres (principal + secondaires)
  const sourceTitles = prepareSourceTitles(sourceData, sourceType);
  
  if (sourceTitles.length === 0) {
    return null; // Pas de titre à comparer
  }
  
  // Récupérer tous les animes (filtrés par type si spécifié)
  let allAnimes;
  if (expectedType) {
    const normalizeAnimeType = (type) => {
      if (!type) return '';
      return String(type).toLowerCase().trim();
    };
    
    const expectedNormalized = normalizeAnimeType(expectedType);
    allAnimes = db.prepare('SELECT * FROM anime_series').all().filter(anime => {
      const animeType = normalizeAnimeType(anime.type);
      return !animeType || animeType === expectedNormalized;
    });
  } else {
    allAnimes = db.prepare('SELECT * FROM anime_series').all();
  }
  
  let exactMatch = null;
  let bestSimilarityMatch = null;
  let bestSimilarity = 0;
  let bestMatchedTitle = null;
  
  // Comparer chaque titre de la source avec tous les animes existants
  for (const sourceTitle of sourceTitles) {
    for (const anime of allAnimes) {
      const animeTitles = extractAllAnimeTitles(anime);
      
      // Comparer le titre de la source avec tous les titres de l'anime
      const matchResult = compareTitleWithExistingTitles(sourceTitle.normalized, animeTitles);
      
      if (matchResult) {
        // Un match exact n'est valide pour fusion automatique que s'il est sur un titre principal
        // (priority 1-4: romaji, natif, anglais, titre principal)
        // Les matches sur titres alternatifs (priority 5) ne doivent pas être considérés comme exacts
        // car plusieurs animes différents peuvent partager le même titre alternatif
        const isExactMatchForMerge = matchResult.exact && matchResult.matchedPriority <= 4;
        
        if (isExactMatchForMerge) {
          // Match exact trouvé sur un titre principal
          if (!exactMatch || matchResult.matchedPriority < extractAllAnimeTitles(exactMatch)[0].priority) {
            exactMatch = anime;
          }
          break; // On s'arrête dès qu'on trouve un match exact
        } else if (matchResult.exact && matchResult.matchedPriority === 5) {
          // Match exact sur un titre alternatif - traiter comme match avec similarité
          // Ne pas fusionner automatiquement, laisser l'utilisateur décider
          if (!bestSimilarityMatch || 
              matchResult.similarity > bestSimilarity) {
            bestSimilarityMatch = {
              anime: anime,
              similarity: matchResult.similarity,
              matchedTitle: matchResult.matchedTitle,
              matchedPriority: matchResult.matchedPriority
            };
            bestSimilarity = matchResult.similarity;
            bestMatchedTitle = matchResult.matchedTitle;
          }
        } else if (matchResult.similarity >= 75) {
          // Match avec similarité (>= 75%)
          if (!bestSimilarityMatch || 
              matchResult.matchedPriority < bestSimilarityMatch.matchedPriority ||
              (matchResult.matchedPriority === bestSimilarityMatch.matchedPriority && matchResult.similarity > bestSimilarity)) {
            bestSimilarityMatch = {
              anime: anime,
              similarity: matchResult.similarity,
              matchedTitle: matchResult.matchedTitle,
              matchedPriority: matchResult.matchedPriority
            };
            bestSimilarity = matchResult.similarity;
            bestMatchedTitle = matchResult.matchedTitle;
          }
        }
      }
    }
    
    // Si on a trouvé un match exact, on peut s'arrêter
    if (exactMatch) {
      break;
    }
  }
  
  // Retourner le match exact s'il existe
  if (exactMatch) {
    return {
      anime: exactMatch,
      isExactMatch: true,
      similarity: 100,
      matchedTitle: exactMatch.titre,
      matchMethod: 'title_exact'
    };
  }
  
  // Retourner le match avec similarité s'il existe
  if (bestSimilarityMatch && bestSimilarity >= 75) {
    return {
      anime: bestSimilarityMatch.anime,
      isExactMatch: false,
      similarity: bestSimilarity,
      matchedTitle: bestMatchedTitle,
      matchMethod: 'title_similarity'
    };
  }
  
  return null;
}

module.exports = {
  findExistingSerieUnified,
  findExistingAnimeUnified,
  splitAlternativeTitles,
  extractAllSerieTitles,
  extractAllAnimeTitles,
  prepareSourceTitles
};
