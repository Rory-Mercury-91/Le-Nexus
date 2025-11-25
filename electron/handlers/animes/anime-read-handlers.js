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
      COALESCE(aud.is_hidden, 0) as is_masquee
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
    query += ` AND (a.titre LIKE ? OR a.titre_anglais LIKE ? OR a.titre_romaji LIKE ?)`;
    const searchPattern = `%${filters.search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
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

  return { success: true, animes };
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
      aud.display_preferences
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

  return {
    success: true,
    anime: {
      ...anime,
      nautiljon_url: nautiljonUrl
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
}

module.exports = { registerAnimeSeriesReadHandlers };
