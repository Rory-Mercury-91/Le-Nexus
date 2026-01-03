const { searchGames, getGameDetails } = require('../../apis/rawg');
const { syncGameFromRawg, enrichGameFromRawg } = require('../../services/adulte-game/game-enrichment-service');
const { registerRawgGameGalleryHandlers } = require('./rawg-game-gallery-handlers');
const { registerRawgGameVideoHandlers } = require('./rawg-game-video-handlers');

/**
 * Enregistre les handlers IPC pour l'intégration RAWG
 * @param {IpcMain} ipcMain - Instance IPC main
 * @param {Function} getDb - Fonction pour obtenir la base de données
 * @param {Store} store - Store Electron
 * @param {Object} dialog - Module dialog d'Electron
 * @param {Function} getMainWindow - Fonction pour obtenir la fenêtre principale
 * @param {Function} getPathManager - Fonction pour obtenir le PathManager
 */
function registerRawgHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager) {
  /**
   * Recherche des jeux sur RAWG
   */
  ipcMain.handle('games-search-rawg', async (event, { query, page = 1 } = {}) => {
    const searchTerm = (query || '').trim();
    if (!searchTerm) {
      return { results: [], totalResults: 0, totalPages: 0, page: 1 };
    }

    try {
      const apiKey = store.get('rawg.apiKey', process.env.RAWG_API_KEY || '');
      if (!apiKey) {
        throw new Error('Aucune clé API RAWG définie. Configurez-la dans les paramètres.');
      }

      const db = getDb();
      const response = await searchGames(searchTerm, {
        apiKey,
        page,
        pageSize: 20
      });

      const findExistingStmt = db.prepare('SELECT id FROM adulte_game_games WHERE rawg_id = ? LIMIT 1');

      const results = (response?.results || []).map((item) => {
        const existing = findExistingStmt.get(item.id);
        return {
          rawgId: item.id,
          name: item.name || 'Sans titre',
          released: item.released || null,
          backgroundImage: item.background_image || null,
          rating: item.rating ? parseFloat(item.rating) : null,
          metacritic: item.metacritic || null,
          platforms: item.platforms?.map(p => p.platform?.name || p.name).filter(Boolean) || [],
          genres: item.genres?.map(g => g.name).filter(Boolean) || [],
          inLibrary: Boolean(existing)
        };
      });

      return {
        results,
        totalResults: response?.count ?? results.length,
        totalPages: Math.ceil((response?.count ?? 0) / 20),
        page: response?.page ?? page
      };
    } catch (error) {
      console.error('[RAWG] games-search error:', error);
      throw new Error(error?.message || 'Impossible de rechercher sur RAWG.');
    }
  });

  /**
   * Récupère les détails d'un jeu depuis RAWG
   */
  ipcMain.handle('games-get-rawg-details', async (event, rawgId) => {
    if (!rawgId) {
      throw new Error('rawgId est requis');
    }

    try {
      const apiKey = store.get('rawg.apiKey', process.env.RAWG_API_KEY || '');
      if (!apiKey) {
        throw new Error('Aucune clé API RAWG définie. Configurez-la dans les paramètres.');
      }

      const game = await getGameDetails(rawgId, { apiKey });

      if (!game) {
        throw new Error(`Jeu RAWG ${rawgId} introuvable`);
      }

      return {
        rawgId: game.id,
        name: game.name || 'Sans titre',
        description: game.description || null,
        released: game.released || null,
        backgroundImage: game.background_image || null,
        website: game.website || null,
        rating: game.rating ? parseFloat(game.rating) : null,
        metacritic: game.metacritic || null,
        platforms: game.platforms?.map(p => ({
          id: p.platform?.id || p.id,
          name: p.platform?.name || p.name
        })).filter(Boolean) || [],
        genres: game.genres?.map(g => ({
          id: g.id,
          name: g.name
        })) || [],
        tags: game.tags?.map(t => ({
          id: t.id,
          name: t.name
        })) || [],
        developers: game.developers?.map(d => d.name).filter(Boolean) || [],
        publishers: game.publishers?.map(p => p.name).filter(Boolean) || [],
        screenshots: game.short_screenshots?.map(s => s.image).filter(Boolean) || []
      };
    } catch (error) {
      console.error('[RAWG] games-get-details error:', error);
      throw new Error(error?.message || 'Impossible de récupérer les détails du jeu.');
    }
  });

  /**
   * Récupère les détails complets d'un jeu RAWG depuis la base locale et l'API si nécessaire
   * Retourne toutes les données disponibles de l'API RAWG
   */
  ipcMain.handle('get-rawg-game-detail', async (event, gameId) => {
    if (!gameId) {
      throw new Error('gameId est requis');
    }

    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const { getUserIdByName } = require('./adulte-game-helpers');
      const userId = getUserIdByName(db, currentUser);
      
      // Récupérer le jeu depuis la base locale
      const game = db.prepare(`
        SELECT 
          g.*,
          ud.chemin_executable,
          ud.notes_privees,
          ud.derniere_session,
          ud.version_jouee,
          ud.is_favorite,
          ud.completion_perso as statut_perso,
          ud.is_hidden,
          ud.labels,
          ud.display_preferences
        FROM adulte_game_games g
        LEFT JOIN adulte_game_user_data ud ON g.id = ud.game_id AND ud.user_id = ?
        WHERE g.id = ? AND g.game_site = 'RAWG'
      `).get(userId, gameId);
      
      if (!game) {
        throw new Error(`Jeu RAWG non trouvé (ID: ${gameId})`);
      }

      if (!game.rawg_id) {
        throw new Error('Ce jeu n\'a pas d\'ID RAWG associé');
      }

      // Récupérer les détails complets depuis l'API RAWG
      const apiKey = store.get('rawg.apiKey', process.env.RAWG_API_KEY || '');
      if (!apiKey) {
        throw new Error('Aucune clé API RAWG définie. Configurez-la dans les paramètres.');
      }

      const rawgGame = await getGameDetails(game.rawg_id, { apiKey });

      if (!rawgGame) {
        throw new Error(`Jeu RAWG ${game.rawg_id} introuvable sur l'API`);
      }

      // Parser les champs JSON de la base locale
      const { safeJsonParse } = require('../common-helpers');
      let labels = [];
      let displayPreferences = {};
      
      try {
        if (game.labels) {
          labels = safeJsonParse(game.labels, []);
        }
      } catch (e) {
        console.warn('Erreur parsing labels:', e);
      }
      
      displayPreferences = safeJsonParse(game.display_preferences, {});

      // Retourner les données combinées : base locale + API RAWG complète
      return {
        // Données de la base locale
        id: game.id,
        titre: game.titre,
        game_version: game.game_version,
        game_statut: game.game_statut,
        game_engine: game.game_engine,
        game_developer: game.game_developer,
        game_site: game.game_site,
        couverture_url: game.couverture_url,
        tags: game.tags,
        rawg_id: game.rawg_id,
        rawg_rating: game.rawg_rating,
        rawg_released: game.rawg_released,
        rawg_platforms: game.rawg_platforms,
        rawg_description: game.rawg_description,
        rawg_website: game.rawg_website,
        esrb_rating: game.esrb_rating,
        chemin_executable: game.chemin_executable,
        notes_privees: game.notes_privees,
        derniere_session: game.derniere_session,
        version_jouee: game.version_jouee,
        is_favorite: game.is_favorite,
        statut_perso: game.statut_perso,
        is_hidden: game.is_hidden,
        labels: labels,
        display_preferences: displayPreferences,
        created_at: game.created_at,
        updated_at: game.updated_at,
        
        // Données complètes de l'API RAWG
        rawgData: {
          id: rawgGame.id,
          name: rawgGame.name,
          slug: rawgGame.slug,
          description: rawgGame.description,
          description_raw: rawgGame.description_raw,
          released: rawgGame.released,
          tba: rawgGame.tba,
          background_image: rawgGame.background_image,
          background_image_additional: rawgGame.background_image_additional,
          website: rawgGame.website,
          rating: rawgGame.rating ? parseFloat(rawgGame.rating) : null,
          rating_top: rawgGame.rating_top,
          ratings: rawgGame.ratings || [],
          ratings_count: rawgGame.ratings_count,
          metacritic: rawgGame.metacritic,
          metacritic_platforms: rawgGame.metacritic_platforms || [],
          playtime: rawgGame.playtime,
          screenshots_count: rawgGame.screenshots_count,
          movies_count: rawgGame.movies_count,
          platforms: rawgGame.platforms || [],
          genres: rawgGame.genres || [],
          tags: rawgGame.tags || [],
          developers: rawgGame.developers || [],
          publishers: rawgGame.publishers || [],
          stores: rawgGame.stores || [],
          short_screenshots: rawgGame.short_screenshots || [],
          screenshots: rawgGame.screenshots || [],
          movies: rawgGame.movies || [],
          updated: rawgGame.updated,
          added: rawgGame.added,
          added_by_status: rawgGame.added_by_status,
          parent_platforms: rawgGame.parent_platforms || [],
          dominant_color: rawgGame.dominant_color,
          saturated_color: rawgGame.saturated_color,
          reddit_url: rawgGame.reddit_url,
          reddit_name: rawgGame.reddit_name,
          reddit_description: rawgGame.reddit_description,
          reddit_count: rawgGame.reddit_count,
          twitch_count: rawgGame.twitch_count,
          youtube_count: rawgGame.youtube_count,
          reviews_text_count: rawgGame.reviews_text_count,
          reviews_count: rawgGame.reviews_count,
          suggestions_count: rawgGame.suggestions_count,
          alternative_names: rawgGame.alternative_names || [],
          community_rating: rawgGame.community_rating,
          status: rawgGame.status,
          esrb_rating: rawgGame.esrb_rating,
          clip: rawgGame.clip
        }
      };
    } catch (error) {
      console.error('[RAWG] get-rawg-game-detail error:', error);
      throw error;
    }
  });

  /**
   * Synchronise un jeu depuis RAWG dans la base locale
   */
  ipcMain.handle('games-sync-from-rawg', async (event, { rawgId, gameId, autoTranslate = true }) => {
    if (!rawgId) {
      throw new Error('rawgId est requis');
    }

    const db = getDb();
    const autoTranslateSetting = store.get('media.autoTranslate', true);

    return await syncGameFromRawg({
      rawgId,
      gameId,
      db,
      store,
      enableTranslation: autoTranslate ?? autoTranslateSetting
    });
  });

  /**
   * Enrichit un jeu existant avec les données RAWG
   */
  ipcMain.handle('games-enrich-from-rawg', async (event, { gameId, rawgId, autoTranslate = true }) => {
    if (!gameId) {
      throw new Error('gameId est requis');
    }

    const db = getDb();
    const autoTranslateSetting = store.get('media.autoTranslate', true);

    return await enrichGameFromRawg({
      gameId,
      rawgId,
      db,
      store,
      enableTranslation: autoTranslate ?? autoTranslateSetting
    });
  });

  /**
   * Crée un jeu directement depuis RAWG
   */
  ipcMain.handle('create-game-from-rawg', async (event, { rawgId, autoTranslate = true }) => {
    if (!rawgId) {
      throw new Error('rawgId est requis');
    }

    const db = getDb();
    const currentUser = store.get('currentUser', '');
    const autoTranslateSetting = store.get('media.autoTranslate', true);

    if (!currentUser) {
      throw new Error('Aucun utilisateur actuel sélectionné');
    }

    try {
      // Récupérer les détails du jeu depuis RAWG
      const apiKey = store.get('rawg.apiKey', process.env.RAWG_API_KEY || '');
      if (!apiKey) {
        throw new Error('Aucune clé API RAWG définie. Configurez-la dans les paramètres.');
      }

      const game = await getGameDetails(rawgId, { apiKey });
      if (!game) {
        throw new Error(`Jeu RAWG ${rawgId} introuvable`);
      }

      // Vérifier si le jeu existe déjà
      const existing = db.prepare('SELECT id FROM adulte_game_games WHERE rawg_id = ?').get(rawgId);
      if (existing) {
        throw new Error('Ce jeu existe déjà dans votre bibliothèque');
      }

      // Synchroniser les données RAWG
      const syncResult = await syncGameFromRawg({
        rawgId,
        gameId: null,
        db,
        store,
        enableTranslation: autoTranslate ?? autoTranslateSetting
      });

      if (!syncResult.gameData) {
        throw new Error('Impossible de récupérer les données du jeu');
      }

      // Créer le jeu dans la base
      const { getUserIdByName } = require('../common-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }

      // Extraire les tags (combiner genres et tags)
      const genres = game.genres?.map(g => g.name).filter(Boolean) || [];
      const tags = game.tags?.map(t => t.name).filter(Boolean) || [];
      const allTags = [...new Set([...genres, ...tags])];

      // Créer le jeu avec les données RAWG
      const result = db.prepare(`
        INSERT INTO adulte_game_games (
          titre, game_version, game_statut, game_engine, game_developer,
          game_site, couverture_url, tags, rawg_id, rawg_rating, rawg_released,
          rawg_platforms, rawg_description, rawg_website, esrb_rating, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        game.name || 'Sans titre',
        null, // version non disponible depuis RAWG
        'EN COURS', // statut par défaut
        null, // moteur non disponible depuis RAWG
        game.developers?.[0]?.name || null,
        'RAWG',
        game.background_image || null,
        allTags.length > 0 ? JSON.stringify(allTags) : null,
        rawgId,
        syncResult.gameData.rawg_rating,
        syncResult.gameData.rawg_released,
        syncResult.gameData.rawg_platforms,
        syncResult.gameData.rawg_description,
        syncResult.gameData.rawg_website,
        syncResult.gameData.esrb_rating
      );

      const gameId = result.lastInsertRowid;

      // Créer l'entrée dans adulte_game_user_data
      db.prepare(`
        INSERT INTO adulte_game_user_data (
          game_id, user_id, completion_perso, created_at, updated_at
        ) VALUES (?, ?, 'À jouer', datetime('now'), datetime('now'))
      `).run(gameId, userId);

      return {
        success: true,
        id: gameId,
        rawgId,
        usedTranslation: syncResult.usedTranslation
      };
    } catch (error) {
      console.error('[RAWG] Erreur création jeu:', error);
      throw error;
    }
  });

  // Enregistrer les handlers pour la galerie d'images et vidéos
  registerRawgGameGalleryHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager);
  registerRawgGameVideoHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager);
}

module.exports = {
  registerRawgHandlers
};
