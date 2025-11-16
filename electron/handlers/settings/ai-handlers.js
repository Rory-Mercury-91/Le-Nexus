const { translateText: groqTranslate, validateApiKey: validateGroqApiKey } = require('../../apis/groq');

/**
 * Enregistre les handlers IPC pour GROQ AI et l'enrichissement
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Store} store - Instance d'electron-store
 */
function registerAiHandlers(ipcMain, getDb, getMainWindow, store, getPathManager = null) {
  
  // Récupérer la clé API Groq
  ipcMain.handle('get-groq-api-key', () => {
    return store.get('groqApiKey', '');
  });

  // Définir la clé API Groq
  ipcMain.handle('set-groq-api-key', (event, apiKey) => {
    store.set('groqApiKey', apiKey);
    return { success: true };
  });

  // Tester la connexion Groq
  ipcMain.handle('test-groq-connection', async (event, apiKey) => {
    try {
      if (!apiKey) {
        return { success: false, error: 'Veuillez saisir une clé API Groq.' };
      }

      const valid = await validateGroqApiKey(apiKey.trim());
      if (!valid) {
        return { success: false, error: 'Clé API invalide ou refusée par Groq.' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Impossible de contacter Groq.' };
    }
  });

  // Traduire un texte avec Groq AI
  ipcMain.handle('translate-text', async (event, text, targetLang = 'fr') => {
    const apiKey = store.get('groqApiKey', '');
    return await groqTranslate(text, apiKey, targetLang);
  });

  // Source images anime
  ipcMain.handle('get-anime-image-source', () => {
    return store.get('animeImageSource', 'anilist');
  });

  ipcMain.handle('set-anime-image-source', (event, source) => {
    store.set('animeImageSource', source);
    console.log(`✅ Source images anime définie: ${source}`);
    return { success: true };
  });

  // Configuration enrichissement anime
  ipcMain.handle('get-anime-enrichment-config', () => {
    const defaultConfig = {
      enabled: true,
      imageSource: 'anilist',
      autoTranslate: false,
      fields: {
        // Titres
        titre_romaji: true,
        titre_natif: true,
        titre_anglais: true,
        titres_alternatifs: true,
        
        // Métadonnées de base
        source: true,
        duree: true,
        saison_diffusion: true,
        date_debut: true,
        date_fin: true,
        en_cours_diffusion: true,
        
        // Classification et contenu
        genres: true,
        themes: true,
        demographics: true,
        rating: true,
        
        // Scores et statistiques
        score: true,
        rank: true,
        popularity: true,
        scored_by: true,
        favorites: true,
        
        // Producteurs et diffuseurs
        producteurs: true,
        diffuseurs: true,
        
        // Relations et franchise
        franchise: true,
        
        // Informations contextuelles
        synopsis: true,
        background: true,
      }
    };
    
    const savedConfig = store.get('animeEnrichmentConfig', {});
    
    // Fusionner avec les valeurs par défaut pour s'assurer que tous les champs sont présents
    return {
      enabled: savedConfig.enabled !== undefined ? savedConfig.enabled : defaultConfig.enabled,
      imageSource: savedConfig.imageSource || defaultConfig.imageSource,
      autoTranslate: savedConfig.autoTranslate !== undefined ? savedConfig.autoTranslate : defaultConfig.autoTranslate,
      fields: {
        ...defaultConfig.fields,
        ...(savedConfig.fields || {})
      }
    };
  });

  ipcMain.handle('save-anime-enrichment-config', (event, config) => {
    store.set('animeEnrichmentConfig', config);
    console.log('✅ Configuration enrichissement anime sauvegardée:', config);
  });

  ipcMain.handle('start-anime-enrichment', async () => {
    try {
      const { processEnrichmentQueue } = require('../../services/animes/anime-enrichment-queue');
      const currentUser = store.get('currentUser', '');
      
      console.log('🚀 Démarrage de l\'enrichissement anime en arrière-plan...');
      
      processEnrichmentQueue(getDb, currentUser, (progress) => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('anime-enrichment-progress', progress);
        }
      }).then((stats) => {
        if (stats?.alreadyRunning) {
          console.warn('⚠️ Enrichissement anime déjà en cours, aucun nouveau traitement lancé.');
          return;
        }

        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('anime-enrichment-complete', stats);
        }
        if (stats?.cancelled) {
          console.log('⏹️ Enrichissement anime interrompu:', stats);
        } else {
          console.log('✅ Enrichissement anime terminé:', stats);
        }
        store.set('anime_enrichment_last', {
          timestamp: new Date().toISOString(),
          stats
        });
      }).catch((error) => {
        console.error('❌ Erreur enrichissement anime:', error);
      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur démarrage enrichissement anime:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stop-anime-enrichment', async () => {
    try {
      const { cancelEnrichment } = require('../../services/animes/anime-enrichment-queue');
      const result = cancelEnrichment();
      if (!result.success) {
        return { success: false, error: 'Aucun enrichissement anime en cours' };
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur arrêt enrichissement anime:', error);
      return { success: false, error: error.message };
    }
  });

  // Configuration enrichissement manga
  ipcMain.handle('get-manga-enrichment-config', () => {
    const defaultConfig = {
      enabled: true,
      autoTranslate: false,
      fields: {
        titre_romaji: true,
        titre_natif: true,
        titre_anglais: true,
        titres_alternatifs: true,
        date_debut: true,
        date_fin: true,
        serialization: true,
        themes: true,
        demographics: true,
        genres: true,
        score: true,
        rank: true,
        popularity: true,
        auteurs: true,
        synopsis: true,
        background: true,
      }
    };
    
    const savedConfig = store.get('mangaEnrichmentConfig', {});
    
    // Fusionner avec les valeurs par défaut pour s'assurer que tous les champs sont présents
    return {
      enabled: savedConfig.enabled !== undefined ? savedConfig.enabled : defaultConfig.enabled,
      autoTranslate: savedConfig.autoTranslate !== undefined ? savedConfig.autoTranslate : defaultConfig.autoTranslate,
      fields: {
        ...defaultConfig.fields,
        ...(savedConfig.fields || {})
      }
    };
  });

  ipcMain.handle('save-manga-enrichment-config', (event, config) => {
    store.set('mangaEnrichmentConfig', config);
    console.log('✅ Configuration enrichissement manga sauvegardée:', config);
  });
  
  ipcMain.handle('start-manga-enrichment', async () => {
    try {
      const { processEnrichmentQueue } = require('../../services/mangas/manga-enrichment-queue');
      const currentUser = store.get('currentUser', '');
      
      console.log('🚀 Démarrage de l\'enrichissement manga en arrière-plan...');
      
      processEnrichmentQueue(getDb, currentUser, (progress) => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('manga-enrichment-progress', progress);
        }
      }, getPathManager).then((stats) => {
        if (stats?.alreadyRunning) {
          console.warn('⚠️ Enrichissement manga déjà en cours, aucun nouveau traitement lancé.');
          return;
        }

        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('manga-enrichment-complete', stats);
        }
        if (stats?.cancelled) {
          console.log('⏹️ Enrichissement manga interrompu:', stats);
        } else {
          console.log('✅ Enrichissement manga terminé:', stats);
        }
        store.set('manga_enrichment_last', {
          timestamp: new Date().toISOString(),
          stats
        });
      }).catch((error) => {
        console.error('❌ Erreur enrichissement manga:', error);
      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur démarrage enrichissement manga:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stop-manga-enrichment', async () => {
    try {
      const { cancelEnrichment } = require('../../services/mangas/manga-enrichment-queue');
      const result = cancelEnrichment();
      if (!result.success) {
        return { success: false, error: 'Aucun enrichissement manga en cours' };
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur arrêt enrichissement manga:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('enrich-manga-now', async (event, mangaId, force = false) => {
    try {
      const db = getDb();
      if (!db) return { success: false, error: 'Base de données non initialisée' };
      const currentUser = store.get('currentUser', '');
      const serie = db.prepare('SELECT id, mal_id, titre FROM series WHERE id = ?').get(mangaId);
      if (!serie) return { success: false, error: 'Manga introuvable' };
      if (!serie.mal_id) return { success: false, error: 'MAL ID manquant' };

      const { enrichManga } = require('../../services/mangas/manga-enrichment-queue');
      const { resetEnrichmentStatus } = require('../../utils/enrichment-helpers');

      // Si forcé, réinitialiser le statut d'enrichissement
      if (force) {
        resetEnrichmentStatus(db, 'series', mangaId);
      }

      // Utiliser la même logique que get-manga-enrichment-config pour avoir les valeurs par défaut complètes
      const enrichmentConfig = store.get('mangaEnrichmentConfig', {
        enabled: true,
        autoTranslate: false,
        fields: {
          titre_romaji: true,
          titre_natif: true,
          titre_anglais: true,
          titres_alternatifs: true,
          date_debut: true,
          date_fin: true,
          serialization: true,
          themes: true,
          demographics: true,
          genres: true,
          score: true,
          rank: true,
          popularity: true,
          auteurs: true,
          synopsis: true,
          background: true,
        }
      });
      
      // Fusionner avec les valeurs par défaut pour s'assurer que tous les champs sont présents
      const defaultFields = {
        titre_romaji: true,
        titre_natif: true,
        titre_anglais: true,
        titres_alternatifs: true,
        date_debut: true,
        date_fin: true,
        serialization: true,
        themes: true,
        demographics: true,
        genres: true,
        score: true,
        rank: true,
        popularity: true,
        auteurs: true,
        synopsis: true,
        background: true,
      };
      
      const finalConfig = {
        enabled: enrichmentConfig.enabled !== undefined ? enrichmentConfig.enabled : true,
        autoTranslate: enrichmentConfig.autoTranslate !== undefined ? enrichmentConfig.autoTranslate : false,
        fields: {
          ...defaultFields,
          ...(enrichmentConfig.fields || {})
        }
      };
      
      const result = await enrichManga(getDb, serie.id, serie.mal_id, currentUser, finalConfig, getPathManager, null, force);
      return result;
    } catch (error) {
      console.error('❌ enrich-manga-now:', error);
      return { success: false, error: error.message };
    }
  });

  // Ré-enrichissement forcé d'un anime
  ipcMain.handle('enrich-anime-now', async (event, animeId, force = false) => {
    try {
      const db = getDb();
      if (!db) return { success: false, error: 'Base de données non initialisée' };
      const currentUser = store.get('currentUser', '');
      const anime = db.prepare('SELECT id, mal_id, titre FROM anime_series WHERE id = ?').get(animeId);
      if (!anime) return { success: false, error: 'Anime introuvable' };
      if (!anime.mal_id) return { success: false, error: 'MAL ID manquant' };

      const { enrichAnime } = require('../../services/animes/anime-enrichment-queue');
      const { resetEnrichmentStatus } = require('../../utils/enrichment-helpers');

      // Si forcé, réinitialiser le statut d'enrichissement
      if (force) {
        resetEnrichmentStatus(db, 'anime_series', animeId);
      }

      const enrichmentConfig = store.get('animeEnrichmentConfig', {
        enabled: true,
        autoTranslate: false,
        imageSource: 'anilist',
        fields: {}
      });
      
      const finalConfig = {
        enabled: enrichmentConfig.enabled !== undefined ? enrichmentConfig.enabled : true,
        autoTranslate: enrichmentConfig.autoTranslate !== undefined ? enrichmentConfig.autoTranslate : false,
        imageSource: enrichmentConfig.imageSource || 'anilist',
        fields: enrichmentConfig.fields || {}
      };
      
      const result = await enrichAnime(getDb, anime.id, anime.mal_id, currentUser, finalConfig, null, force);
      return result;
    } catch (error) {
      console.error('❌ enrich-anime-now:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAiHandlers };
