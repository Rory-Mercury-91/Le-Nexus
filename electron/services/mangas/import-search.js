/**
 * Recherche de séries pour l'import de mangas
 * Fonctions de recherche par titre exact ou normalisé
 */

const { normalizeTitle, areSimilar, levenshteinDistance, checkStrictMatch } = require('./import-utils');

/**
 * Cherche une série existante par titre (exact ou avec titres alternatifs)
 */
function findSerieByTitle(db, titre) {
  // Recherche exacte
  let serie = db.prepare('SELECT * FROM series WHERE titre = ?').get(titre);
  
  if (serie) {
    return serie;
  }
  
  // Recherche dans titre_romaji, titre_anglais, et titres_alternatifs (JSON)
  const altSearch = db.prepare(`
    SELECT * FROM series 
    WHERE titre LIKE ? 
      OR titre_romaji LIKE ?
      OR titre_anglais LIKE ?
      OR titres_alternatifs LIKE ?
    ORDER BY 
      CASE 
        WHEN titre = ? THEN 1
        WHEN titre_romaji = ? THEN 2
        WHEN titre_anglais = ? THEN 3
        ELSE 4
      END
    LIMIT 1
  `).get(
    `%${titre}%`,
    `%${titre}%`,
    `%${titre}%`,
    `%${titre}%`,
    titre,
    titre,
    titre
  );

  if (altSearch) {
    return altSearch;
  }

  // Chercher dans l'autre sens (le titre de la DB contient le titre recherché)
  const reverseSimilar = db.prepare(
    'SELECT * FROM series WHERE ? LIKE \'%\' || titre || \'%\' ORDER BY titre'
  ).all(titre);
  
  if (reverseSimilar.length > 0) {
    return reverseSimilar[0];
  }

  return null;
}

/**
 * Cherche une série existante avec normalisation et Levenshtein
 */
function normalizeMediaType(type) {
  if (!type) return null;
  const lower = type.toLowerCase();
  if (lower.includes('light novel') || lower.includes('novel')) return 'light novel';
  if (lower.includes('manga')) return 'manga';
  if (lower.includes('manhwa')) return 'manhwa';
  if (lower.includes('manhua')) return 'manhua';
  return lower;
}

function mediaTypesMatch(expected, serie) {
  if (!expected) return true;
  const serieType = normalizeMediaType(serie.media_type) ||
    (serie.type_volume ? normalizeMediaType(serie.type_volume) : null);
  if (!serieType) {
    // Aucun type enregistré côté base → accepter la correspondance
    return true;
  }
  return serieType === expected;
}

/**
 * Extrait tous les titres d'une série depuis la base de données pour comparaison
 * @param {Object} serie - Série depuis la base de données
 * @returns {Array<{original: string, normalized: string}>} - Liste des titres avec leur version normalisée
 */
function extractAllSerieTitles(serie) {
  const titles = [];
  
  // Titre principal
  if (serie.titre) {
    titles.push({ original: serie.titre, normalized: normalizeTitle(serie.titre) });
  }
  
  // Titre romaji
  if (serie.titre_romaji) {
    titles.push({ original: serie.titre_romaji, normalized: normalizeTitle(serie.titre_romaji) });
  }
  
  // Titre natif
  if (serie.titre_natif) {
    titles.push({ original: serie.titre_natif, normalized: normalizeTitle(serie.titre_natif) });
  }
  
  // Titre anglais
  if (serie.titre_anglais) {
    titles.push({ original: serie.titre_anglais, normalized: normalizeTitle(serie.titre_anglais) });
  }
  
  // Titres alternatifs (JSON array)
  if (serie.titres_alternatifs) {
    try {
      const parsed = JSON.parse(serie.titres_alternatifs);
      if (Array.isArray(parsed)) {
        parsed.forEach(alt => {
          if (alt && alt.trim()) {
            titles.push({ original: alt.trim(), normalized: normalizeTitle(alt.trim()) });
          }
        });
      }
    } catch {
      // Ignorer si ce n'est pas du JSON valide
    }
  }
  
  // Fallback sur titre_alternatif pour compatibilité
  if (serie.titre_alternatif) {
    serie.titre_alternatif.split('/').forEach(alt => {
      const trimmed = alt.trim();
      if (trimmed) {
        titles.push({ original: trimmed, normalized: normalizeTitle(trimmed) });
      }
    });
  }
  
  return titles;
}

/**
 * Compare un titre normalisé avec tous les titres d'une série
 * @param {string} normalizedTitle - Titre normalisé à comparer
 * @param {Array<{original: string, normalized: string}>} serieTitles - Liste des titres de la série
 * @returns {Object|null} - { match: boolean, similarity: number, matchedTitle: string, consecutiveCount: number } ou null
 */
function compareTitleWithSerieTitles(normalizedTitle, serieTitles) {
  if (!normalizedTitle || serieTitles.length === 0) return null;
  
  // D'abord vérifier correspondance exacte
  for (const title of serieTitles) {
    if (title.normalized === normalizedTitle) {
      return { match: true, similarity: 100, matchedTitle: title.original, exact: true, consecutiveCount: normalizedTitle.length };
    }
  }
  
  // Ensuite vérifier matching strict (5+ caractères consécutifs depuis le début)
  let bestMatch = null;
  let bestSimilarity = 0;
  let bestConsecutiveCount = 0;
  
  for (const title of serieTitles) {
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

function findSerieByTitleNormalized(db, titre, titresAlternatifs, expectedMediaType = null) {
  // Préparer les titres secondaires de Nautiljon
  const rawAltList = Array.isArray(titresAlternatifs)
    ? titresAlternatifs
    : (titresAlternatifs ? [titresAlternatifs] : []);
  const altList = [];
  const seenAltRaw = new Set();
  rawAltList.forEach(raw => {
    if (raw == null) return;
    const str = String(raw).trim();
    if (!str) return;
    const key = str.toLowerCase();
    if (seenAltRaw.has(key)) return;
    seenAltRaw.add(key);
    altList.push(str);
  });
  
  // Normaliser le titre principal
  const normalizedMainTitle = normalizeTitle(titre);
  
  // Normaliser les titres secondaires (diviser par "/" d'abord)
  const normalizedSecondaryTitles = Array.from(new Set(altList
    .flatMap(alt => String(alt)
      .split(/[/|]+/)
      .map(p => normalizeTitle(p.trim()))
      .filter(Boolean)
    )));
  
  // Récupérer toutes les séries
  const allSeries = db.prepare('SELECT id, source_donnees, titre, titre_alternatif, titres_alternatifs, titre_romaji, titre_natif, titre_anglais, media_type, type_volume FROM series').all();
  
  let exactMatch = null;
  let strictMatch = null;
  let bestStrictSimilarity = 0;
  let bestStrictMatchedTitle = null;
  let bestConsecutiveCount = 0; // Prioriser le match avec le plus de caractères consécutifs
  
  for (const serie of allSeries) {
    // Vérifier le type de média
    if (!mediaTypesMatch(expectedMediaType, serie)) {
      continue;
    }
    
    // Extraire tous les titres de la série
    const serieTitles = extractAllSerieTitles(serie);
    
    // ÉTAPE 1 : Comparer le titre principal de Nautiljon avec tous les titres de la série
    const mainTitleMatch = compareTitleWithSerieTitles(normalizedMainTitle, serieTitles);
    if (mainTitleMatch) {
      if (mainTitleMatch.exact) {
        exactMatch = serie;
        break; // Correspondance exacte trouvée, on s'arrête
      } else if (mainTitleMatch.consecutiveCount !== undefined) {
        // Prioriser le match avec le plus de caractères consécutifs depuis le début
        // Si même nombre de caractères consécutifs, alors on prend celui avec la meilleure similarité
        if (mainTitleMatch.consecutiveCount > bestConsecutiveCount || 
            (mainTitleMatch.consecutiveCount === bestConsecutiveCount && mainTitleMatch.similarity > bestStrictSimilarity)) {
          strictMatch = serie;
          bestStrictSimilarity = mainTitleMatch.similarity;
          bestStrictMatchedTitle = mainTitleMatch.matchedTitle;
          bestConsecutiveCount = mainTitleMatch.consecutiveCount;
        }
      }
    }
    
    // ÉTAPE 2 : Si pas de match exact, comparer les titres secondaires de Nautiljon
    if (!exactMatch) {
      for (const normalizedSecondaryTitle of normalizedSecondaryTitles) {
        const secondaryMatch = compareTitleWithSerieTitles(normalizedSecondaryTitle, serieTitles);
        if (secondaryMatch) {
          if (secondaryMatch.exact) {
            exactMatch = serie;
            break; // Correspondance exacte trouvée, on s'arrête
          } else if (secondaryMatch.consecutiveCount !== undefined) {
            // Prioriser le match avec le plus de caractères consécutifs depuis le début
            if (secondaryMatch.consecutiveCount > bestConsecutiveCount || 
                (secondaryMatch.consecutiveCount === bestConsecutiveCount && secondaryMatch.similarity > bestStrictSimilarity)) {
              strictMatch = serie;
              bestStrictSimilarity = secondaryMatch.similarity;
              bestStrictMatchedTitle = secondaryMatch.matchedTitle;
              bestConsecutiveCount = secondaryMatch.consecutiveCount;
            }
          }
        }
      }
      
      if (exactMatch) {
        break; // Correspondance exacte trouvée, on s'arrête
      }
    }
  }
  
  // Retourner la correspondance exacte si trouvée
  if (exactMatch) {
    return { serie: exactMatch, isExactMatch: true, similarity: 100 };
  }
  
  // Si matching strict trouvé (selon les critères de checkStrictMatch), on le retourne avec l'info pour proposer à l'utilisateur
  // Le seuil minimum est maintenant 75% (pour l'option 3 avec 15+ caractères consécutifs)
  if (strictMatch && bestStrictSimilarity >= 75) {
    return { 
      serie: strictMatch, 
      isExactMatch: false, 
      similarity: bestStrictSimilarity,
      matchedTitle: bestStrictMatchedTitle
    };
  }
  
  return null;
}

module.exports = {
  findSerieByTitle,
  findSerieByTitleNormalized
};
