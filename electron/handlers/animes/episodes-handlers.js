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

      if (vu) {
        db.prepare(`
          INSERT OR REPLACE INTO anime_episodes_vus (anime_id, user_id, episode_numero, vu, date_visionnage)
          VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        `).run(animeId, userId, episodeNumero);
      } else {
        db.prepare(`
          DELETE FROM anime_episodes_vus
          WHERE anime_id = ? AND user_id = ? AND episode_numero = ?
        `).run(animeId, userId, episodeNumero);
      }

      // Mettre à jour automatiquement le statut de visionnage basé sur episodes_vus
      const nbEpisodes = getAnimeEpisodeCount(db, animeId);
      if (nbEpisodes > 0) {
        const episodesVus = db.prepare(`
          SELECT COUNT(DISTINCT episode_numero) as count
          FROM anime_episodes_vus
          WHERE anime_id = ? AND user_id = ? AND vu = 1
        `).get(animeId, userId);

        const episodesVusCount = episodesVus ? episodesVus.count : 0;

        // Mettre à jour episodes_vus dans anime_statut_utilisateur
        db.prepare(`
          INSERT OR REPLACE INTO anime_statut_utilisateur (anime_id, user_id, episodes_vus, date_modification)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(anime_id, user_id) DO UPDATE SET
            episodes_vus = excluded.episodes_vus,
            date_modification = CURRENT_TIMESTAMP
        `).run(animeId, userId, episodesVusCount);

        // Récupérer le statut actuel et l'ancien nombre d'épisodes vus
        const currentStatut = db.prepare(`
          SELECT statut_visionnage, episodes_vus FROM anime_statut_utilisateur
          WHERE anime_id = ? AND user_id = ?
        `).get(animeId, userId);

        const previousEpisodesVus = currentStatut ? (currentStatut.episodes_vus || 0) : 0;
        const wasZero = previousEpisodesVus === 0;
        const isNowOneOrMore = episodesVusCount >= 1;

        // Calculer automatiquement le statut de visionnage
        let autoStatut = null;
        if (episodesVusCount === 0) {
          autoStatut = 'À regarder';
        } else if (episodesVusCount === nbEpisodes) {
          autoStatut = 'Terminé';
        } else if (episodesVusCount >= 1) {
          autoStatut = 'En cours';
        }

        // Mettre à jour le statut automatiquement si :
        // 1. On passe de 0 à >= 1 (forcer "En cours" même si statut était "Abandonné" ou "En pause")
        // 2. Le statut actuel est automatique (À regarder, En cours, Terminé)
        // 3. On atteint 100% (forcer "Terminé")
        const shouldUpdate = autoStatut && (
          (wasZero && isNowOneOrMore) || // Passage de 0 à >= 1
          (episodesVusCount === nbEpisodes) || // 100% complété
          (!currentStatut || currentStatut.statut_visionnage === 'À regarder' || currentStatut.statut_visionnage === 'En cours' || currentStatut.statut_visionnage === 'Terminé') // Statut automatique
        );

        if (shouldUpdate) {
          db.prepare(`
            INSERT OR REPLACE INTO anime_statut_utilisateur (anime_id, user_id, statut_visionnage, episodes_vus, date_modification)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(anime_id, user_id) DO UPDATE SET
              statut_visionnage = excluded.statut_visionnage,
              episodes_vus = excluded.episodes_vus,
              date_modification = CURRENT_TIMESTAMP
          `).run(animeId, userId, autoStatut, episodesVusCount);
          
          console.log(`✅ Auto-update: Anime ${animeId} statut mis à jour vers "${autoStatut}" (${episodesVusCount}/${nbEpisodes} épisodes)`);
        }
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

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO anime_episodes_vus (anime_id, user_id, episode_numero, vu, date_visionnage)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
      `);

      for (let ep = 1; ep <= nbEpisodes; ep++) {
        stmt.run(animeId, userId, ep);
      }

      // Mettre à jour le statut
      db.prepare(`
        INSERT OR REPLACE INTO anime_statut_utilisateur (anime_id, user_id, statut_visionnage)
        VALUES (?, ?, 'Terminé')
      `).run(animeId, userId);

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

      db.prepare(`
        INSERT OR REPLACE INTO anime_statut_utilisateur (anime_id, user_id, statut_visionnage, date_modification)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(animeId, userId, statutVisionnage);

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur set-anime-statut-visionnage:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAnimeEpisodesHandlers };
