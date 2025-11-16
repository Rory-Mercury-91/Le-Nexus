/**
 * Enregistre les handlers IPC pour la synchronisation Nautiljon
 */
function registerMangaSeriesNautiljonHandlers(ipcMain, getDb, getPathManager, store, getMainWindow = null) {
  // Importer depuis une URL Nautiljon
  ipcMain.handle('import-from-nautiljon-url', async (event, url) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const { scrapeNautiljonPage } = require('../../services/mangas/nautiljon-scraper');
      const { handleNautiljonImport } = require('../../services/mangas/manga-import-service');

      // Scraper la page avec les tomes
      const mangaData = await scrapeNautiljonPage(url, true);

      // Utiliser le handler d'import existant
      const result = await handleNautiljonImport(db, mangaData, getPathManager, store, true);

      return {
        success: true,
        serie: result.serie,
        message: `Série "${mangaData.titre}" importée avec succès`
      };
    } catch (error) {
      console.error('❌ Erreur import depuis URL Nautiljon:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Handlers pour la synchronisation automatique Nautiljon
  ipcMain.handle('nautiljon-set-auto-sync', (event, enabled, intervalHours = 6, includeTomes = false) => {
    try {
      const { restartScheduler } = require('../../services/schedulers/nautiljon-sync-scheduler');
      store.set('nautiljon_auto_sync_enabled', enabled);
      store.set('nautiljon_auto_sync_interval', intervalHours);
      store.set('nautiljon_auto_sync_include_tomes', includeTomes);
      
      // Redémarrer le scheduler avec les nouveaux paramètres
      const mainWindow = getMainWindow ? getMainWindow() : null;
      if (mainWindow) {
        restartScheduler(getDb(), store, mainWindow, getPathManager);
      }
      
      console.log(`✅ Sync auto Nautiljon ${enabled ? 'activée' : 'désactivée'} (intervalle: ${intervalHours}h, tomes: ${includeTomes ? 'oui' : 'non'})`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur config sync auto Nautiljon:', error);
      throw error;
    }
  });
  
  // Récupérer les paramètres de synchronisation automatique Nautiljon
  ipcMain.handle('nautiljon-get-auto-sync-settings', () => {
    try {
      const enabled = store.get('nautiljon_auto_sync_enabled', false);
      const intervalHours = store.get('nautiljon_auto_sync_interval', 6);
      const includeTomes = store.get('nautiljon_auto_sync_include_tomes', false);
      
      return {
        enabled,
        intervalHours,
        includeTomes
      };
    } catch (error) {
      console.error('❌ Erreur récupération paramètres sync auto Nautiljon:', error);
      throw error;
    }
  });

  // Synchronisation manuelle Nautiljon maintenant
  ipcMain.handle('nautiljon-sync-now', async () => {
    try {
      const { scrapeNautiljonPage } = require('../../services/mangas/nautiljon-scraper');
      const { handleNautiljonImport } = require('../../services/mangas/manga-import-service');
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!db || !currentUser) {
        throw new Error('Base de données ou utilisateur non disponible');
      }
      
      // Récupérer toutes les séries avec URL Nautiljon
      const seriesWithNautiljon = db.prepare(`
        SELECT id, titre, relations 
        FROM series 
        WHERE relations IS NOT NULL AND relations != ''
      `).all();
      
      const seriesToSync = [];
      for (const serie of seriesWithNautiljon) {
        try {
          if (serie.relations) {
            const relations = JSON.parse(serie.relations);
            if (relations.nautiljon && relations.nautiljon.url) {
              seriesToSync.push({
                id: serie.id,
                titre: serie.titre,
                url: relations.nautiljon.url
              });
            }
          }
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      }
      
      if (seriesToSync.length === 0) {
        return { success: true, synced: 0, message: 'Aucune série avec URL Nautiljon trouvée' };
      }
      
      const includeTomes = store.get('nautiljon_auto_sync_include_tomes', false);
      let synced = 0;
      let errors = 0;
      
      for (const serie of seriesToSync) {
        try {
          const mangaData = await scrapeNautiljonPage(serie.url, includeTomes);
          await handleNautiljonImport(db, mangaData, getPathManager, store, includeTomes);
          synced++;
        } catch (error) {
          errors++;
          console.error(`❌ Erreur sync "${serie.titre}":`, error.message);
        }
      }
      
      return {
        success: true,
        synced,
        errors,
        total: seriesToSync.length
      };
    } catch (error) {
      console.error('❌ Erreur sync manuelle Nautiljon:', error);
      throw error;
    }
  });
}

module.exports = { registerMangaSeriesNautiljonHandlers };
