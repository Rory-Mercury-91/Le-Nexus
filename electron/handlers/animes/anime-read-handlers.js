const { getUserIdByName, ensureAnimeUserDataRow } = require('./anime-helpers');
const { safeJsonParse } = require('../common-helpers');

/**
 * Handlers pour les opérations de lecture (READ) sur les séries d'animes
 */

/**
 * Récupérer la liste des animes
 */
function handleGetAnimeSeries(db, store, filters = {}) {
  const currentUser = store.get('currentUser', '');
  const userId = getUserIdByName(db, currentUser);
  const userBinding = typeof userId === 'number' ? userId : -1;

  let query = `
    SELECT 
      a.*,
      aud.statut_visionnage,
      COALESCE(aud.episodes_vus, 0) as episodes_vus,
      aud.tag,
      COALESCE(aud.is_favorite, 0) as is_favorite,
      COALESCE(aud.is_hidden, 0) as is_masquee,
      aud.labels as labels
    FROM anime_series a
    LEFT JOIN anime_user_data aud ON a.id = aud.anime_id AND aud.user_id = ?
    WHERE 1=1
  `;

  const params = [userBinding];

  if (typeof userId === 'number') {
    query += ` AND (a.user_id_ajout = ? OR a.user_id_ajout IS NULL OR a.user_id_ajout = 0)`;
    params.push(userId);
  } else {
    query += ` AND (a.user_id_ajout IS NULL OR a.user_id_ajout = 0)`;
  }

  if (filters.statut) {
    query += ` AND aud.statut_visionnage = ?`;
    params.push(filters.statut);
  }

  if (filters.type) {
    query += ` AND a.type = ?`;
    params.push(filters.type);
  }

  if (filters.franchise) {
    query += ` AND a.franchise_name = ?`;
    params.push(filters.franchise);
  }

  if (filters.search) {
    query += ` AND (
      a.titre LIKE ? 
      OR a.titre_anglais LIKE ? 
      OR a.titre_romaji LIKE ?
      OR a.titre_natif LIKE ?
      OR a.titres_alternatifs LIKE ?
      OR a.description LIKE ?
      OR a.genres LIKE ?
      OR a.themes LIKE ?
    )`;
    const searchPattern = `%${filters.search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (filters.tag) {
    query += ` AND aud.tag = ?`;
    params.push(filters.tag);
  }

  if (filters.favoris) {
    query += ` AND aud.is_favorite = 1`;
  }

  if (filters.sortBy === 'titre') {
    query += ` ORDER BY a.titre ASC`;
  } else if (filters.sortBy === 'annee') {
    query += ` ORDER BY a.annee DESC, a.franchise_order ASC`;
  } else {
    query += ` ORDER BY a.created_at DESC`;
  }

  const animes = db.prepare(query).all(...params);

  // Parser les labels pour chaque anime
  const animesWithLabels = animes.map(anime => {
    const labels = anime.labels ? safeJsonParse(anime.labels, []) : [];
    return {
      ...anime,
      labels: labels
    };
  });

  return { success: true, animes: animesWithLabels };
}

/**
 * Récupérer les détails d'un anime
 */
function handleGetAnimeDetail(db, store, animeId) {
  const currentUser = store.get('currentUser', '');
  const userId = getUserIdByName(db, currentUser);

  const anime = db.prepare(`
    SELECT 
      a.*,
      aud.statut_visionnage,
      COALESCE(aud.episodes_vus, 0) as episodes_vus,
      aud.tag,
      COALESCE(aud.is_favorite, 0) as is_favorite,
      aud.episode_progress,
      aud.display_preferences,
      aud.labels as labels
    FROM anime_series a
    LEFT JOIN anime_user_data aud ON a.id = aud.anime_id AND aud.user_id = ?
    WHERE a.id = ?
  `).get(userId, animeId);

  if (!anime) {
    return { success: false, error: 'Anime non trouvé' };
  }

  // Récupérer les épisodes vus depuis episode_progress JSON
  const episodesVusMap = new Map();
  if (userId && anime.episode_progress) {
    try {
      const episodeProgress = safeJsonParse(anime.episode_progress, {});
      Object.entries(episodeProgress).forEach(([episodeNumero, data]) => {
        episodesVusMap.set(parseInt(episodeNumero), {
          vu: data.vu || false,
          date_visionnage: data.date_visionnage || null
        });
      });
    } catch (e) {
      console.warn('⚠️ Erreur parsing episode_progress:', e);
    }
  }

  // Construire la liste des épisodes
  const episodes = [];
  for (let i = 1; i <= anime.nb_episodes; i++) {
    const vuData = episodesVusMap.get(i);
    episodes.push({
      numero: i,
      vu: vuData?.vu || 0,
      date_visionnage: vuData?.date_visionnage || null
    });
  }

  // Récupérer les animes de la même franchise
  const franchiseAnimes = anime.franchise_name ? db.prepare(`
    SELECT id, titre, type, nb_episodes, annee, franchise_order, couverture_url
    FROM anime_series
    WHERE franchise_name = ? AND id != ?
    ORDER BY franchise_order ASC, annee ASC
  `).all(anime.franchise_name, animeId) : [];

  // Extraire l'URL Nautiljon depuis le champ dédié
  let nautiljonUrl = anime.nautiljon_url || null;

  if (nautiljonUrl) {
    console.log(`✅ URL Nautiljon extraite depuis champ dédié pour anime ${animeId}: ${nautiljonUrl}`);
  } else {
    // Fallback : vérifier si mal_url est une URL Nautiljon (anciennes données)
    if (anime.mal_url && anime.mal_url.includes('nautiljon.com')) {
      nautiljonUrl = anime.mal_url;
      console.log(`✅ URL Nautiljon extraite depuis mal_url (fallback) pour anime ${animeId}: ${nautiljonUrl}`);
      // Migrer vers le champ dédié
      db.prepare('UPDATE anime_series SET nautiljon_url = ?, mal_url = NULL WHERE id = ?').run(nautiljonUrl, animeId);
    } else {
      // Fallback : essayer depuis relations (pour compatibilité avec les très anciennes données)
      try {
        if (anime.relations) {
          const relations = safeJsonParse(anime.relations, {});
          nautiljonUrl = relations.nautiljon?.url
            || relations.nautiljon
            || relations.Nautiljon?.url
            || relations.Nautiljon
            || null;

          if (nautiljonUrl) {
            console.log(`✅ URL Nautiljon extraite depuis relations (fallback) pour anime ${animeId}: ${nautiljonUrl}`);
            // Migrer vers le champ dédié
            db.prepare('UPDATE anime_series SET nautiljon_url = ? WHERE id = ?').run(nautiljonUrl, animeId);
          }
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
        console.warn('⚠️ Erreur parsing relations pour anime', animeId, ':', e.message);
      }
    }
  }

  // Parser les labels
  const labels = anime.labels ? safeJsonParse(anime.labels, []) : [];

  return {
    success: true,
    anime: {
      ...anime,
      nautiljon_url: nautiljonUrl,
      labels: labels
    },
    episodes,
    franchiseAnimes
  };
}

/**
 * Enregistre les handlers IPC pour les opérations de lecture
 */
function registerAnimeSeriesReadHandlers(ipcMain, getDb, store) {
  // Récupérer la liste des animes
  ipcMain.handle('get-anime-series', (event, filters = {}) => {
    try {
      const db = getDb();
      return handleGetAnimeSeries(db, store, filters);
    } catch (error) {
      console.error('❌ Erreur get-anime-series:', error);
      return { success: false, error: error.message, animes: [] };
    }
  });

  // Récupérer les détails d'un anime
  ipcMain.handle('get-anime-detail', (event, animeId) => {
    try {
      const db = getDb();
      return handleGetAnimeDetail(db, store, animeId);
    } catch (error) {
      console.error('❌ Erreur get-anime-detail:', error);
      return { success: false, error: error.message };
    }
  });

  // Récupérer un anime par MAL ID
  ipcMain.handle('get-anime-by-mal-id', async (event, malId) => {
    try {
      const db = getDb();
      if (!db) throw new Error('Base de données non initialisée');

      const anime = db.prepare('SELECT id, titre, mal_id, couverture_url FROM anime_series WHERE mal_id = ?').get(malId);
      return anime || null;
    } catch (error) {
      console.error('Erreur get-anime-by-mal-id:', error);
      return null;
    }
  });

  // Récupérer tous les genres uniques (dédupliqués après traduction)
  ipcMain.handle('get-all-anime-genres', async () => {
    try {
      const db = getDb();
      if (!db) throw new Error('Base de données non initialisée');
      const { genreTranslations, translateItem, isScanTeam, getExcludedScanTeams } = require('../../utils/translation-dictionaries');
      
      const animes = db.prepare('SELECT genres FROM anime_series WHERE genres IS NOT NULL AND genres <> \'\' AND LENGTH(genres) > 0').all();
      const allGenresRaw = new Set();
      animes.forEach(anime => {
        if (anime.genres) {
          const genres = anime.genres.split(',').map(g => g.trim()).filter(Boolean);
          genres.forEach(genre => allGenresRaw.add(genre));
        }
      });
      
      // Liste des valeurs à exclure (ratings qui peuvent être dans les genres par erreur)
      const excludedValues = new Set([
        'Content rating: Suggestive',
        'Suggestive',
        'Suggestif',
        'safe',
        'suggestive',
        'erotica',
        'R+',
        'R - 17+',
        'PG-13',
        'G - All Ages',
        'PG - Children'
      ]);
      
      // Charger les équipes de scanlation à exclure
      const excludedScanTeams = getExcludedScanTeams();
      
      // Traduire tous les genres et dédupliquer sur les traductions
      const translatedGenresSet = new Set();
      const genreToOriginal = new Map(); // Pour conserver la première occurrence de chaque traduction
      
      for (const genre of allGenresRaw) {
        // Exclure les ratings qui peuvent être dans les genres par erreur
        if (excludedValues.has(genre) || excludedValues.has(genre.toLowerCase())) {
          continue;
        }
        
        // Exclure les équipes de scanlation
        if (isScanTeam(genre, excludedScanTeams)) {
          continue;
        }
        
        // Traduire le genre
        const translated = translateItem(genre, genreTranslations);
        
        // Exclure aussi si la traduction est un rating
        if (excludedValues.has(translated) || excludedValues.has(translated.toLowerCase())) {
          continue;
        }
        
        // Exclure aussi si la traduction est une équipe de scanlation
        if (isScanTeam(translated, excludedScanTeams)) {
          continue;
        }
        
        // Normaliser la traduction pour la comparaison (minuscules, espaces multiples)
        const normalizedTranslation = translated.toLowerCase().replace(/\s+/g, ' ').trim();
        
        // Si cette traduction n'a pas encore été vue, l'ajouter
        if (!translatedGenresSet.has(normalizedTranslation)) {
          translatedGenresSet.add(normalizedTranslation);
          // Conserver le genre original (VO) pour le retour
          genreToOriginal.set(normalizedTranslation, genre);
        }
      }
      
      // Retourner les genres originaux (VO) triés, mais dédupliqués sur les traductions
      const result = Array.from(genreToOriginal.values()).sort();
      return result;
    } catch (error) {
      console.error('❌ Erreur get-all-anime-genres:', error);
      throw error;
    }
  });

  // Récupérer tous les thèmes uniques (dédupliqués après traduction)
  ipcMain.handle('get-all-anime-themes', async () => {
    try {
      const db = getDb();
      if (!db) throw new Error('Base de données non initialisée');
      const { themeTranslations, translateItem, isScanTeam, getExcludedScanTeams } = require('../../utils/translation-dictionaries');
      
      const animes = db.prepare('SELECT themes FROM anime_series WHERE themes IS NOT NULL AND themes <> \'\' AND LENGTH(themes) > 0').all();
      const allThemesRaw = new Set();
      animes.forEach(anime => {
        if (anime.themes) {
          const themes = anime.themes.split(',').map(t => t.trim()).filter(Boolean);
          themes.forEach(theme => allThemesRaw.add(theme));
        }
      });
      
      // Charger les équipes de scanlation à exclure
      const excludedScanTeams = getExcludedScanTeams();
      
      // Traduire tous les thèmes et dédupliquer sur les traductions
      const translatedThemesSet = new Set();
      const themeToOriginal = new Map(); // Pour conserver la première occurrence de chaque traduction
      
      for (const theme of allThemesRaw) {
        // Exclure les équipes de scanlation
        if (isScanTeam(theme, excludedScanTeams)) {
          continue;
        }
        
        // Traduire le thème
        const translated = translateItem(theme, themeTranslations);
        
        // Exclure aussi si la traduction est une équipe de scanlation
        if (isScanTeam(translated, excludedScanTeams)) {
          continue;
        }
        
        // Normaliser la traduction pour la comparaison (minuscules, espaces multiples)
        const normalizedTranslation = translated.toLowerCase().replace(/\s+/g, ' ').trim();
        
        // Si cette traduction n'a pas encore été vue, l'ajouter
        if (!translatedThemesSet.has(normalizedTranslation)) {
          translatedThemesSet.add(normalizedTranslation);
          // Conserver le thème original (VO) pour le retour
          themeToOriginal.set(normalizedTranslation, theme);
        }
      }
      
      // Retourner les thèmes originaux (VO) triés, mais dédupliqués sur les traductions
      const result = Array.from(themeToOriginal.values()).sort();
      return result;
    } catch (error) {
      console.error('❌ Erreur get-all-anime-themes:', error);
      throw error;
    }
  });
}

module.exports = { registerAnimeSeriesReadHandlers };
