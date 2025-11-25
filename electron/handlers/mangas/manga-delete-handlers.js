const fs = require('fs');
const path = require('path');
const { createSlug } = require('../../utils/slug');
const { getSerieTitle } = require('./manga-helpers');

// Import des fonctions communes
const { getPaths } = require('../common-helpers');

/**
 * Supprime une série (avec gestion multi-utilisateur)
 */

async function handleDeleteSerie(db, getPathManager, store, id) {
  const currentUser = store.get('currentUser', '');
  const paths = getPaths(getPathManager);

  // Récupérer les infos de la série avant suppression
  const serieTitle = getSerieTitle(db, id);
  if (!serieTitle) {
    console.warn(`⚠️ Série ${id} introuvable`);
    return true;
  }

  // Récupérer tous les tome_id de cette série
  const tomeIds = db.prepare('SELECT id FROM manga_tomes WHERE serie_id = ?').all(id).map(t => t.id);
  
  // Vérifier si d'autres utilisateurs ont cette série
  let otherUsersHaveSerie = false;
  const dbFolder = paths.databases;
  
  if (fs.existsSync(dbFolder) && tomeIds.length > 0) {
    const userDbs = fs.readdirSync(dbFolder).filter(f => f.endsWith('.db'));
    
    for (const userDbFile of userDbs) {
      // Ignorer la base de l'utilisateur actuel
      const userName = path.basename(userDbFile, '.db');
      if (userName.toLowerCase() === currentUser.toLowerCase()) {
        continue;
      }

      // Ouvrir la base de cet utilisateur et vérifier s'il a des données de lecture pour cette série
      const userDbPath = path.join(dbFolder, userDbFile);
      try {
        const userDb = require('better-sqlite3')(userDbPath, { readonly: true });
        
        // Vérifier si cet utilisateur a des données pour cette série dans manga_user_data
        const hasData = userDb.prepare(`
          SELECT id 
          FROM manga_user_data 
          WHERE serie_id = ?
        `).get(id);
        userDb.close();

        if (hasData) {
          otherUsersHaveSerie = true;
          break;
        }
      } catch (err) {
        console.warn(`⚠️ Impossible de lire la base de ${userName}:`, err.message);
      }
    }
  }

  if (otherUsersHaveSerie) {
    // D'autres utilisateurs ont cette série → supprimer SEULEMENT les données de lecture de l'utilisateur actuel
    // Supprimer les données de lecture de l'utilisateur actuel pour tous les manga_tomes de cette série
      const { getUserIdByName } = require('./manga-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }
      
      // Supprimer les données utilisateur pour cette série
      db.prepare(`
        DELETE FROM manga_user_data 
        WHERE serie_id = ? AND user_id = ?
      `).run(id, userId);

    return { success: true, partial: true, message: 'Série retirée de votre collection (conservée pour les autres utilisateurs)' };
  } else {
    // Aucun autre utilisateur n'a cette série → suppression complète
    
    // 1. Supprimer les images (dossier complet)
    const slug = createSlug(serieTitle);
    const serieFolderPath = path.join(paths.covers, 'manga_series', slug);
    
    if (fs.existsSync(serieFolderPath)) {
      try {
        // Suppression robuste avec retry (Proton Drive peut causer des verrous de fichiers)
        let retries = 3;
        let deleted = false;
        
        while (retries > 0 && !deleted) {
          try {
            // Supprimer d'abord tous les fichiers dans les sous-dossiers
            const deleteFolderRecursive = (folderPath) => {
              if (fs.existsSync(folderPath)) {
                fs.readdirSync(folderPath).forEach((file) => {
                  const curPath = path.join(folderPath, file);
                  if (fs.lstatSync(curPath).isDirectory()) {
                    deleteFolderRecursive(curPath);
                  } else {
                    fs.unlinkSync(curPath);
                  }
                });
                fs.rmdirSync(folderPath);
              }
            };
            
            deleteFolderRecursive(serieFolderPath);
            deleted = true;

          } catch (err) {
            retries--;
            if (retries > 0) {
              // Attendre un peu avant de réessayer (pour Proton Drive)
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              throw err;
            }
          }
        }
      } catch (err) {
        console.warn(`⚠️ Impossible de supprimer complètement le dossier (peut-être verrouillé par Proton Drive) : ${err.message}`);
        // Ne pas throw, continuer la suppression en BDD
      }
    }

    // 2. Supprimer les données utilisateur (cascade via FK sur manga_series)
    // Pas besoin de supprimer manuellement manga_user_data, le ON DELETE CASCADE le fera
    
    // 3. Supprimer la série de la base de données (cascade supprime aussi les manga_tomes)
    db.prepare('DELETE FROM manga_series WHERE id = ?').run(id);

    return { success: true, partial: false, message: 'Série supprimée complètement' };
  }
}

/**
 * Enregistre les handlers IPC pour les opérations de suppression
 */
function registerMangaSeriesDeleteHandlers(ipcMain, getDb, getPathManager, store) {
  // Supprimer une série (avec gestion multi-utilisateur)
  ipcMain.handle('delete-serie', async (event, id) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }
      return await handleDeleteSerie(db, getPathManager, store, id);
    } catch (error) {
      console.error('❌ Erreur delete-serie:', error);
      throw error;
    }
  });
}

module.exports = { registerMangaSeriesDeleteHandlers };
