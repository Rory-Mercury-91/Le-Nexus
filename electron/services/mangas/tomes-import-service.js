/**
 * Service d'import de manga_tomes uniquement
 * Gère la logique métier d'import de manga_tomes pour une série existante
 * Utilisé par les routes HTTP (import-routes.js)
 */

const { parseRequestBody, sendErrorResponse, sendSuccessResponse, validateDbAndUser, notifyImportComplete } = require('../import-server-common');
const coverManager = require('../cover/cover-manager');
const { findSerieByTitle } = require('./import-search');
const { setExclusiveSerieOwnership, setExclusiveSerieUserStatus } = require('../../handlers/mangas/manga-helpers');
const { recordExtractedData } = require('../../utils/sync-error-reporter');

/**
 * Fonction principale d'import de manga_tomes uniquement
 */
async function handleImportTomesOnly(req, res, getDb, store, mainWindow, getPathManager) {
  try {
    const body = await parseRequestBody(req);
    const mangaData = JSON.parse(body);

    recordExtractedData({
      entityType: 'manga-volumes',
      entityId: mangaData.titre || mangaData.id || `payload-${Date.now()}`,
      data: mangaData
    });

    // Valider les données
    if (!mangaData.titre) {
      return sendErrorResponse(res, 400, 'Le titre est obligatoire');
    }

    if (!mangaData.volumes || !Array.isArray(mangaData.volumes)) {
      return sendErrorResponse(res, 400, 'Aucun tome à importer');
    }

    const { db, currentUser } = validateDbAndUser(getDb, store);

    // Chercher la série existante
    const serie = findSerieByTitle(db, mangaData.titre);
    if (!serie) {
      const allSeries = db.prepare('SELECT titre FROM manga_series ORDER BY titre LIMIT 10').all();
      const suggestions = allSeries.map(s => s.titre).join('", "');
      return sendErrorResponse(res, 404, `Série "${mangaData.titre}" introuvable. Séries existantes: "${suggestions}"...`);
    }

    // Récupérer les manga_tomes existants
    const existingTomes = db.prepare('SELECT numero FROM manga_tomes WHERE serie_id = ?').all(serie.id);
    const existingNumeros = new Set(existingTomes.map(t => t.numero));

    // Filtrer les manga_tomes à ajouter
    const manga_tomesToAdd = mangaData.volumes.filter(vol => 
      !existingNumeros.has(vol.numero) && vol.date_sortie
    );
    
    const manga_tomesIgnored = mangaData.volumes.filter(vol => 
      !existingNumeros.has(vol.numero) && !vol.date_sortie
    ).length;
    
    if (manga_tomesIgnored > 0) {
      // Ignorés faute de date VF
    }

    if (manga_tomesToAdd.length === 0) {
      notifyImportComplete(mainWindow);
      return sendSuccessResponse(res, {
        serieId: serie.id,
        manga_tomesCreated: 0,
        message: 'Tous les manga_tomes sont déjà présents'
      });
    }

    // Ajouter les manga_tomes manquants
    const stmtTome = db.prepare(`
      INSERT INTO manga_tomes (serie_id, numero, prix, date_sortie, couverture_url)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const stmtProprietaire = db.prepare(`
      INSERT INTO manga_manga_tomes_proprietaires (serie_id, tome_id, user_id) VALUES (?, ?, ?)
    `);

    const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
    if (!user) {
      throw new Error(`Utilisateur "${currentUser}" introuvable dans la BDD`);
    }

    let manga_tomesCreated = 0;
    const autoDownload = store.get('autoDownloadCovers', false) === true;
    for (const volume of manga_tomesToAdd) {
      try {
        let effectiveCover = null;
        const pm = getPathManager();
        if (autoDownload && volume.couverture_url && pm) {
          const coverResult = await coverManager.downloadCover(
            pm,
            volume.couverture_url,
            serie.titre,
            'tome',
            volume.numero,
            {
              mediaType: serie.media_type,
              typeVolume: serie.type_volume
            }
          );
          
          if (coverResult.success && coverResult.localPath) {
            effectiveCover = coverResult.localPath;
          } else {
            effectiveCover = volume.couverture_url || null;
          }
        } else {
          // Utiliser l'URL distante si on ne télécharge pas
          effectiveCover = volume.couverture_url || null;
        }

        const result = stmtTome.run(
          serie.id,
          volume.numero,
          volume.prix || 0.00,
          volume.date_sortie || null,
          effectiveCover
        );

        stmtProprietaire.run(serie.id, result.lastInsertRowid, user.id);
        db.prepare('DELETE FROM manga_manga_tomes_proprietaires WHERE tome_id = ? AND user_id != ?')
          .run(result.lastInsertRowid, user.id);
        manga_tomesCreated++;
      } catch (error) {
        console.error(`❌ Erreur tome ${volume.numero}:`, error.message);
      }
    }

    if (manga_tomesCreated > 0) {
      setExclusiveSerieOwnership(db, serie.id, user.id);
      setExclusiveSerieUserStatus(db, serie.id, user.id);
    }

    // Écraser la couverture série si nécessaire
    if (autoDownload && mangaData.couverture_url && serie.source_donnees === 'mal') {
      try {
        const pm = getPathManager();
        if (pm) {
          const coverResult = await coverManager.downloadCover(
            pm,
            mangaData.couverture_url,
            serie.titre,
            'serie',
            serie.id,
            {
              mediaType: serie.media_type,
              typeVolume: serie.type_volume
            }
          );
          
          if (coverResult.success && coverResult.localPath) {
            db.prepare(`
              UPDATE manga_series
              SET couverture_url = ?,
                  source_donnees = 'mal+nautiljon',
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(coverResult.localPath, serie.id);
          }
        }
      } catch (error) {
        console.warn('⚠️ Impossible d\'écraser la couverture série:', error.message);
      }
    }

    // Notifier l'UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('manga-imported', {
        serieId: serie.id,
        titre: serie.titre,
        manga_tomesCreated
      });
    }

    notifyImportComplete(mainWindow);
    sendSuccessResponse(res, {
      serieId: serie.id,
      manga_tomesCreated,
      volumesIgnored: manga_tomesIgnored
    });

  } catch (error) {
    console.error('Erreur import manga_tomes:', error);
    notifyImportComplete(mainWindow);
    sendErrorResponse(res, 500, error.message);
  }
}

module.exports = {
  handleImportTomesOnly
};
