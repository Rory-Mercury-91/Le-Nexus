const { getUserIdByName } = require('./anime-helpers');

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
      asu.statut_visionnage,
      COALESCE(
        (SELECT COUNT(DISTINCT episode_numero) 
         FROM anime_episodes_vus 
         WHERE anime_id = a.id AND user_id = ? AND vu = 1),
        0
      ) as episodes_vus,
      at.tag,
      at.is_favorite,
      CASE WHEN am.anime_id IS NOT NULL THEN 1 ELSE 0 END as is_masquee
    FROM anime_series a
    LEFT JOIN anime_statut_utilisateur asu ON a.id = asu.anime_id AND asu.user_id = ?
    LEFT JOIN anime_tags at ON a.id = at.anime_id AND at.user_id = ?
    LEFT JOIN anime_masquees am ON a.id = am.anime_id AND am.user_id = ?
    WHERE 1=1
  `;

  const params = [userBinding, userBinding, userBinding, userBinding];

  if (typeof userId === 'number') {
    query += ` AND (a.user_id_ajout = ? OR a.user_id_ajout IS NULL OR a.user_id_ajout = 0)`;
    params.push(userId);
  } else {
    query += ` AND (a.user_id_ajout IS NULL OR a.user_id_ajout = 0)`;
  }

  if (filters.statut) {
    query += ` AND asu.statut_visionnage = ?`;
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
    query += ` AND at.tag = ?`;
    params.push(filters.tag);
  }

  if (filters.favoris) {
    query += ` AND at.is_favorite = 1`;
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
      asu.statut_visionnage,
      COALESCE(
        (SELECT COUNT(DISTINCT episode_numero) 
         FROM anime_episodes_vus 
         WHERE anime_id = a.id AND user_id = ? AND vu = 1),
        0
      ) as episodes_vus,
      at.tag,
      at.is_favorite
    FROM anime_series a
    LEFT JOIN anime_statut_utilisateur asu ON a.id = asu.anime_id AND asu.user_id = ?
    LEFT JOIN anime_tags at ON a.id = at.anime_id AND at.user_id = ?
    WHERE a.id = ?
  `).get(userId, userId, userId, animeId);

  if (!anime) {
    return { success: false, error: 'Anime non trouvé' };
  }

  // Récupérer les épisodes vus
  const episodes = [];
  for (let i = 1; i <= anime.nb_episodes; i++) {
    const vu = userId ? db.prepare(`
      SELECT vu, date_visionnage 
      FROM anime_episodes_vus
      WHERE anime_id = ? AND user_id = ? AND episode_numero = ?
    `).get(animeId, userId, i) : null;

    episodes.push({
      numero: i,
      vu: vu?.vu || 0,
      date_visionnage: vu?.date_visionnage || null
    });
  }

  // Récupérer les animes de la même franchise
  const franchiseAnimes = anime.franchise_name ? db.prepare(`
    SELECT id, titre, type, nb_episodes, annee, franchise_order, couverture_url
    FROM anime_series
    WHERE franchise_name = ? AND id != ?
    ORDER BY franchise_order ASC, annee ASC
  `).all(anime.franchise_name, animeId) : [];

  return {
    success: true,
    anime,
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
      
      const anime = db.prepare('SELECT id, titre, mal_id FROM anime_series WHERE mal_id = ?').get(malId);
      return anime || null;
    } catch (error) {
      console.error('Erreur get-anime-by-mal-id:', error);
      return null;
    }
  });
}

module.exports = { registerAnimeSeriesReadHandlers };
