const { getUserIdByName, ensureAnimeUserDataRow } = require('./anime-helpers');
const { safeJsonParse } = require('../common-helpers');

/**
 * Helper : Récupérer le nombre d'épisodes d'un anime
 */
function getAnimeEpisodeCount(db, animeId) {
  const anime = db.prepare('SELECT nb_episodes FROM anime_series WHERE id = ?').get(animeId);
  return anime ? anime.nb_episodes : 0;
}

/**
 * Enregistre les handlers IPC pour la gestion des épisodes d'animes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerAnimeEpisodesHandlers(ipcMain, getDb, store) {
  
  /**
   * Toggle un épisode vu
   */
  ipcMain.handle('toggle-episode-vu', (event, animeId, episodeNumero, vu) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');

      const { getUserIdByName } = require('./anime-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // S'assurer que la ligne anime_user_data existe
      ensureAnimeUserDataRow(db, animeId, userId);

      // Récupérer l'état actuel de episode_progress
      const userData = db.prepare(`
        SELECT episode_progress, episodes_vus, statut_visionnage FROM anime_user_data
        WHERE anime_id = ? AND user_id = ?
      `).get(animeId, userId);

      let episodeProgress = safeJsonParse(userData?.episode_progress, {});
      const previousEpisodesVus = userData?.episodes_vus || 0;

      // Mettre à jour episode_progress
      if (vu) {
        episodeProgress[String(episodeNumero)] = {
          vu: true,
          date_visionnage: new Date().toISOString()
        };
      } else {
        delete episodeProgress[String(episodeNumero)];
      }

      // Calculer le nouveau nombre d'épisodes vus
      const episodesVusCount = Object.keys(episodeProgress).filter(
        epNum => episodeProgress[epNum]?.vu === true
      ).length;

      // Calculer automatiquement le statut de visionnage
      const nbEpisodes = getAnimeEpisodeCount(db, animeId);
      let autoStatut = userData?.statut_visionnage || 'À regarder';
      const wasZero = previousEpisodesVus === 0;
      const isNowOneOrMore = episodesVusCount >= 1;

      if (nbEpisodes > 0) {
        if (episodesVusCount === 0) {
          autoStatut = 'À regarder';
        } else if (episodesVusCount === nbEpisodes) {
          autoStatut = 'Terminé';
        } else if (episodesVusCount >= 1) {
          autoStatut = 'En cours';
        }

        // Mettre à jour le statut automatiquement si nécessaire
        const shouldUpdate = autoStatut && (
          (wasZero && isNowOneOrMore) || // Passage de 0 à >= 1
          (episodesVusCount === nbEpisodes) || // 100% complété
          (!userData || userData.statut_visionnage === 'À regarder' || userData.statut_visionnage === 'En cours' || userData.statut_visionnage === 'Terminé') // Statut automatique
        );

        if (shouldUpdate) {
          db.prepare(`
            UPDATE anime_user_data 
            SET episode_progress = ?, episodes_vus = ?, statut_visionnage = ?, updated_at = datetime('now')
            WHERE anime_id = ? AND user_id = ?
          `).run(JSON.stringify(episodeProgress), episodesVusCount, autoStatut, animeId, userId);
          
          console.log(`✅ Auto-update: Anime ${animeId} statut mis à jour vers "${autoStatut}" (${episodesVusCount}/${nbEpisodes} épisodes)`);
        } else {
          // Mettre à jour seulement episode_progress et episodes_vus
          db.prepare(`
            UPDATE anime_user_data 
            SET episode_progress = ?, episodes_vus = ?, updated_at = datetime('now')
            WHERE anime_id = ? AND user_id = ?
          `).run(JSON.stringify(episodeProgress), episodesVusCount, animeId, userId);
        }
      } else {
        // Mettre à jour seulement episode_progress et episodes_vus
        db.prepare(`
          UPDATE anime_user_data 
          SET episode_progress = ?, episodes_vus = ?, updated_at = datetime('now')
          WHERE anime_id = ? AND user_id = ?
        `).run(JSON.stringify(episodeProgress), episodesVusCount, animeId, userId);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur toggle-episode-vu:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Marquer tous les épisodes comme vus
   */
  ipcMain.handle('marquer-anime-complet', (event, animeId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const { getUserIdByName } = require('./anime-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      const nbEpisodes = getAnimeEpisodeCount(db, animeId);
      if (nbEpisodes === 0) {
        return { success: false, error: 'Anime non trouvé' };
      }

      // S'assurer que la ligne anime_user_data existe
      ensureAnimeUserDataRow(db, animeId, userId);

      // Créer episode_progress avec tous les épisodes marqués comme vus
      const episodeProgress = {};
      const now = new Date().toISOString();
      for (let ep = 1; ep <= nbEpisodes; ep++) {
        episodeProgress[String(ep)] = {
          vu: true,
          date_visionnage: now
        };
      }

      // Mettre à jour anime_user_data
      db.prepare(`
        UPDATE anime_user_data 
        SET episode_progress = ?, episodes_vus = ?, statut_visionnage = 'Terminé', updated_at = datetime('now')
        WHERE anime_id = ? AND user_id = ?
      `).run(JSON.stringify(episodeProgress), nbEpisodes, animeId, userId);

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur marquer-anime-complet:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Définir le statut de visionnage
   */
  ipcMain.handle('set-anime-statut-visionnage', (event, animeId, statutVisionnage) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const { getUserIdByName } = require('./anime-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // S'assurer que la ligne anime_user_data existe
      ensureAnimeUserDataRow(db, animeId, userId);

      db.prepare(`
        UPDATE anime_user_data 
        SET statut_visionnage = ?, updated_at = datetime('now')
        WHERE anime_id = ? AND user_id = ?
      `).run(statutVisionnage, animeId, userId);

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur set-anime-statut-visionnage:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAnimeEpisodesHandlers };
