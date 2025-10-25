/**
 * Service de synchronisation avec MyAnimeList
 * Récupère et synchronise les listes manga et anime de l'utilisateur
 */

const fetch = require('node-fetch');
const { refreshAccessToken } = require('../apis/myanimelist-oauth');

/**
 * Récupère la liste complète des mangas de l'utilisateur depuis MAL
 * @param {string} accessToken - Access token MAL
 * @param {number} limit - Nombre d'entrées par page (max 1000)
 * @returns {Promise<Array>} Liste des mangas
 */
async function getUserMangaList(accessToken, limit = 1000) {
  const allMangas = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const url = new URL('https://api.myanimelist.net/v2/users/@me/mangalist');
    url.searchParams.set('fields', 'list_status{num_chapters_read,status,score,start_date,finish_date}');
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());
    
    console.log(`📡 Récupération mangas MAL (offset: ${offset})...`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch manga list: ${response.status}`);
    }
    
    const data = await response.json();
    allMangas.push(...data.data);
    
    // Vérifier s'il y a plus de résultats
    if (data.paging && data.paging.next) {
      offset += limit;
    } else {
      hasMore = false;
    }
    
    // Rate limiting: pause de 500ms entre les requêtes
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ ${allMangas.length} mangas récupérés depuis MAL`);
  return allMangas;
}

/**
 * Récupère la liste complète des animes de l'utilisateur depuis MAL
 * @param {string} accessToken - Access token MAL
 * @param {number} limit - Nombre d'entrées par page (max 1000)
 * @returns {Promise<Array>} Liste des animes
 */
async function getUserAnimeList(accessToken, limit = 1000) {
  const allAnimes = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const url = new URL('https://api.myanimelist.net/v2/users/@me/animelist');
    url.searchParams.set('fields', 'list_status{num_episodes_watched,status,score,start_date,finish_date}');
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());
    
    console.log(`📡 Récupération animes MAL (offset: ${offset})...`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch anime list: ${response.status}`);
    }
    
    const data = await response.json();
    allAnimes.push(...data.data);
    
    // Vérifier s'il y a plus de résultats
    if (data.paging && data.paging.next) {
      offset += limit;
    } else {
      hasMore = false;
    }
    
    // Rate limiting: pause de 500ms entre les requêtes
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ ${allAnimes.length} animes récupérés depuis MAL`);
  return allAnimes;
}

/**
 * Synchronise les chapitres lus pour les mangas
 * @param {Object} db - Instance de la base de données
 * @param {Array} malMangas - Liste des mangas depuis MAL
 * @param {string} currentUser - Nom de l'utilisateur actuel
 * @returns {Promise<Object>} Statistiques de synchronisation
 */
async function syncMangaProgress(db, malMangas, currentUser) {
  const stats = {
    updated: 0,
    skipped: 0,
    notFound: 0,
    errors: []
  };
  
  for (const malEntry of malMangas) {
    try {
      const malId = malEntry.node.id;
      const chaptersRead = malEntry.list_status?.num_chapters_read || 0;
      const malStatus = malEntry.list_status?.status; // reading, completed, on_hold, dropped, plan_to_read
      
      // Chercher la série dans la DB par MAL ID (dans le champ description ou titre alternatif)
      // Note: Pour les mangas, il faudrait idéalement un champ mal_id dédié
      const serie = db.prepare(`
        SELECT id, titre, chapitres_lus, type_contenu
        FROM series
        WHERE description LIKE ?
        OR description LIKE ?
        LIMIT 1
      `).get(`%myanimelist.net/manga/${malId}%`, `%mal.to/manga/${malId}%`);
      
      if (!serie) {
        stats.notFound++;
        continue;
      }
      
      // Ne mettre à jour que si MAL a plus de chapitres lus
      const currentChapters = serie.chapitres_lus || 0;
      
      if (chaptersRead > currentChapters) {
        // Mettre à jour la progression
        db.prepare(`
          UPDATE series
          SET chapitres_lus = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(chaptersRead, serie.id);
        
        stats.updated++;
        console.log(`✅ Manga "${serie.titre}": ${currentChapters} → ${chaptersRead} chapitres`);
      } else {
        stats.skipped++;
      }
      
    } catch (error) {
      stats.errors.push({
        malId: malEntry.node.id,
        titre: malEntry.node.title,
        error: error.message
      });
      console.error(`❌ Erreur sync manga ${malEntry.node.title}:`, error.message);
    }
  }
  
  return stats;
}

/**
 * Synchronise les épisodes vus pour les animes
 * @param {Object} db - Instance de la base de données
 * @param {Array} malAnimes - Liste des animes depuis MAL
 * @param {string} currentUser - Nom de l'utilisateur actuel
 * @returns {Promise<Object>} Statistiques de synchronisation
 */
async function syncAnimeProgress(db, malAnimes, currentUser) {
  const stats = {
    updated: 0,
    skipped: 0,
    notFound: 0,
    errors: []
  };
  
  for (const malEntry of malAnimes) {
    try {
      const malId = malEntry.node.id;
      const episodesWatched = malEntry.list_status?.num_episodes_watched || 0;
      const malStatus = malEntry.list_status?.status; // watching, completed, on_hold, dropped, plan_to_watch
      
      // Chercher l'anime dans la DB par MAL ID
      const anime = db.prepare(`
        SELECT id, titre
        FROM anime_series
        WHERE mal_id = ?
      `).get(malId);
      
      if (!anime) {
        stats.notFound++;
        continue;
      }
      
      // Compter les épisodes actuellement marqués comme vus
      const currentEpisodes = db.prepare(`
        SELECT COUNT(*) as count
        FROM anime_episodes_vus
        WHERE anime_id = ? AND utilisateur = ? AND vu = 1
      `).get(anime.id, currentUser)?.count || 0;
      
      if (episodesWatched > currentEpisodes) {
        // Marquer les épisodes comme vus (de 1 à episodesWatched)
        const stmt = db.prepare(`
          INSERT INTO anime_episodes_vus (anime_id, utilisateur, episode_numero, vu, date_visionnage)
          VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
          ON CONFLICT(anime_id, utilisateur, episode_numero)
          DO UPDATE SET vu = 1, date_visionnage = CURRENT_TIMESTAMP
        `);
        
        for (let ep = 1; ep <= episodesWatched; ep++) {
          stmt.run(anime.id, currentUser, ep);
        }
        
        stats.updated++;
        console.log(`✅ Anime "${anime.titre}": ${currentEpisodes} → ${episodesWatched} épisodes`);
      } else {
        stats.skipped++;
      }
      
    } catch (error) {
      stats.errors.push({
        malId: malEntry.node.id,
        titre: malEntry.node.title,
        error: error.message
      });
      console.error(`❌ Erreur sync anime ${malEntry.node.title}:`, error.message);
    }
  }
  
  return stats;
}

/**
 * Synchronisation complète MAL → App
 * @param {Object} db - Instance de la base de données
 * @param {Object} store - Electron store (pour les tokens)
 * @param {string} currentUser - Nom de l'utilisateur actuel
 * @returns {Promise<Object>} Résultat de la synchronisation
 */
async function performFullSync(db, store, currentUser) {
  console.log('🔄 Début de la synchronisation MAL...');
  const startTime = Date.now();
  
  try {
    // Récupérer les tokens
    let accessToken = store.get('mal_access_token');
    const refreshToken = store.get('mal_refresh_token');
    const expiresAt = store.get('mal_token_expires_at');
    
    if (!refreshToken) {
      throw new Error('Aucun refresh token MAL trouvé. Veuillez vous reconnecter.');
    }
    
    // Rafraîchir l'access token si expiré
    if (!accessToken || Date.now() >= expiresAt - 60000) {
      console.log('🔄 Rafraîchissement du token MAL...');
      const tokens = await refreshAccessToken(refreshToken);
      
      store.set('mal_access_token', tokens.access_token);
      store.set('mal_refresh_token', tokens.refresh_token);
      store.set('mal_token_expires_at', tokens.expires_at);
      
      accessToken = tokens.access_token;
    }
    
    // Récupérer les listes
    const [malMangas, malAnimes] = await Promise.all([
      getUserMangaList(accessToken),
      getUserAnimeList(accessToken)
    ]);
    
    // Synchroniser
    const [mangaStats, animeStats] = await Promise.all([
      syncMangaProgress(db, malMangas, currentUser),
      syncAnimeProgress(db, malAnimes, currentUser)
    ]);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const result = {
      success: true,
      duration,
      timestamp: new Date().toISOString(),
      manga: mangaStats,
      anime: animeStats,
      total: {
        updated: mangaStats.updated + animeStats.updated,
        skipped: mangaStats.skipped + animeStats.skipped,
        notFound: mangaStats.notFound + animeStats.notFound,
        errors: [...mangaStats.errors, ...animeStats.errors]
      }
    };
    
    // Sauvegarder la dernière synchronisation
    store.set('mal_last_sync', result);
    
    console.log(`✅ Synchronisation terminée en ${duration}s`);
    console.log(`   - Mangas mis à jour: ${mangaStats.updated}`);
    console.log(`   - Animes mis à jour: ${animeStats.updated}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur synchronisation MAL:', error);
    
    const result = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    store.set('mal_last_sync', result);
    
    throw error;
  }
}

module.exports = {
  getUserMangaList,
  getUserAnimeList,
  syncMangaProgress,
  syncAnimeProgress,
  performFullSync
};

