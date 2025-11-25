/**
 * Service de gestion des volumes/manga_tomes
 * Gère la création et mise à jour des manga_tomes depuis les données Nautiljon
 */

const coverManager = require('../cover/cover-manager');
const { setExclusiveSerieOwnership, setExclusiveSerieUserStatus } = require('../../handlers/mangas/manga-helpers');

/**
 * Filtre les volumes ayant une date de sortie
 * @param {Array} volumes - Liste des volumes
 * @returns {Array} - Volumes avec date de sortie
 */
function filterVolumesWithDate(volumes) {
  if (!Array.isArray(volumes)) return [];
  return volumes.filter(vol => vol.date_sortie);
}

/**
 * Télécharge la couverture d'un tome
 * @param {Object} pm - PathManager
 * @param {string} coverUrl - URL de la couverture
 * @param {string} serieTitle - Titre de la série
 * @param {number} volumeNumber - Numéro du volume
 * @returns {Promise<string|null>} - Chemin local ou null
 */
async function downloadTomeCover(pm, coverUrl, serieTitle, volumeNumber, options = {}) {
  if (!coverUrl || !pm) return null;
  if (options.autoDownloadCovers === false) return null;
  
  try {
    const coverResult = await coverManager.downloadCover(
      pm,
      coverUrl,
      serieTitle,
      'tome',
      volumeNumber,
      options
    );
    return coverResult.success ? coverResult.localPath : null;
  } catch (error) {
    console.error(`❌ Erreur téléchargement couverture tome ${volumeNumber}:`, error);
    return null;
  }
}

/**
 * Crée un tome dans la base de données
 * @param {Database} db - Instance de la base de données
 * @param {Object} pm - PathManager
 * @param {Object} volume - Données du volume
 * @param {number} serieId - ID de la série
 * @param {string} serieTitle - Titre de la série
 * @param {number} userId - ID de l'utilisateur propriétaire
 * @returns {Promise<number|null>} - ID du tome créé ou null
 */
async function createTome(db, pm, volume, serieId, serieTitle, userId, options = {}) {
  // Vérifier si le tome existe déjà
  const stmtCheckTome = db.prepare('SELECT id FROM manga_tomes WHERE serie_id = ? AND numero = ?');
  const existingTome = stmtCheckTome.get(serieId, volume.numero);
  
  if (existingTome) {
    return null;
  }
  
  const stmtTome = db.prepare(`
    INSERT INTO manga_tomes (serie_id, numero, prix, date_sortie, couverture_url)
    VALUES (?, ?, ?, ?, ?)
  `);

  try {
    let effectiveCover = null;
    if (options.autoDownloadCovers === false) {
      effectiveCover = volume.couverture_url || null;
    } else {
      const localCoverPath = await downloadTomeCover(pm, volume.couverture_url, serieTitle, volume.numero, options);
      effectiveCover = localCoverPath || volume.couverture_url || null;
    }
    
    const result = stmtTome.run(
      serieId,
      volume.numero,
      volume.prix || 0.00,
      volume.date_sortie || null,
      effectiveCover
    );

    // Ne pas marquer automatiquement la possession lors de l'import Nautiljon
    // La possession sera gérée manuellement par l'utilisateur ou automatiquement si date_achat est renseignée
    
    return result.lastInsertRowid;
  } catch (error) {
    console.error(`  ⚠️ Erreur création tome ${volume.numero}:`, error.message);
    return null;
  }
}

/**
 * Met à jour un tome existant dans la base de données
 * @param {Database} db - Instance de la base de données
 * @param {Object} pm - PathManager
 * @param {Object} volume - Données du volume
 * @param {number} serieId - ID de la série
 * @param {string} serieTitle - Titre de la série
 * @returns {Promise<boolean>} - true si mis à jour avec succès
 */
async function updateTome(db, pm, volume, serieId, serieTitle, options = {}) {
  const stmtUpdateTome = db.prepare(`
    UPDATE manga_tomes 
    SET prix = ?, date_sortie = ?, couverture_url = ?
    WHERE serie_id = ? AND numero = ?
  `);

  try {
    let effectiveCover = null;

    // Protection: si une couverture locale existe déjà, ne pas l'écraser
    const currentTome = db.prepare('SELECT couverture_url FROM manga_tomes WHERE serie_id = ? AND numero = ?').get(serieId, volume.numero);
    const currentCover = currentTome?.couverture_url || '';
    const hasLocalCover = currentCover && !currentCover.includes('://') && !currentCover.startsWith('data:');

    if (!hasLocalCover) {
      if (options.autoDownloadCovers === false) {
        // Utiliser directement l'URL distante si fournie
        effectiveCover = volume.couverture_url || currentCover || null;
      } else if (volume.couverture_url && pm) {
        const localCoverPath = await downloadTomeCover(pm, volume.couverture_url, serieTitle, volume.numero, options);
        effectiveCover = localCoverPath || volume.couverture_url || currentCover || null;
      } else {
        effectiveCover = currentCover || null;
      }
    } else {
      // Conserver la couverture locale actuelle
      effectiveCover = currentCover;
    }

    stmtUpdateTome.run(
      volume.prix || 0,
      volume.date_sortie,
      effectiveCover,
      serieId,
      volume.numero
    );
    
    return true;
  } catch (error) {
    console.error(`⚠️ Erreur mise à jour tome ${volume.numero}:`, error.message);
    return false;
  }
}

/**
 * Gère la création de manga_tomes depuis les données Nautiljon
 * @param {Database} db - Instance de la base de données
 * @param {Object} pm - PathManager
 * @param {Array} volumes - Liste des volumes depuis Nautiljon
 * @param {number} serieId - ID de la série
 * @param {string} serieTitle - Titre de la série
 * @param {number} userId - ID de l'utilisateur propriétaire
 * @returns {Promise<Object>} - { created: number, ignored: number, skipped: number }
 */
async function createVolumes(db, pm, volumes, serieId, serieTitle, userId, options = {}) {
  const volumesWithDate = filterVolumesWithDate(volumes);
  const volumesIgnored = volumes.length - volumesWithDate.length;
  
  const stmtCheckTome = db.prepare('SELECT id FROM manga_tomes WHERE serie_id = ? AND numero = ?');
  let manga_tomesCreated = 0;
  let manga_tomesSkipped = 0;
  
  for (const volume of volumesWithDate) {
    // Vérifier si le tome existe déjà
    const existingTome = stmtCheckTome.get(serieId, volume.numero);
    
    if (existingTome) {
      manga_tomesSkipped++;
      continue;
    }
    
    const tomeId = await createTome(db, pm, volume, serieId, serieTitle, userId, options);
    if (tomeId) {
      manga_tomesCreated++;
    }
  }

  if (options.exclusiveOwner && userId) {
    setExclusiveSerieOwnership(db, serieId, userId);
    setExclusiveSerieUserStatus(db, serieId, userId);
  }
  
  return { created: manga_tomesCreated, ignored: volumesIgnored, skipped: manga_tomesSkipped };
}

/**
 * Gère la mise à jour/création de manga_tomes depuis les données Nautiljon
 * @param {Database} db - Instance de la base de données
 * @param {Object} pm - PathManager
 * @param {Array} volumes - Liste des volumes depuis Nautiljon
 * @param {number} serieId - ID de la série
 * @param {string} serieTitle - Titre de la série
 * @param {number} userId - ID de l'utilisateur propriétaire
 * @returns {Promise<number>} - Nombre de manga_tomes mis à jour/créés
 */
async function updateOrCreateVolumes(db, pm, volumes, serieId, serieTitle, userId, options = {}) {
  const volumesWithDate = filterVolumesWithDate(volumes);
  
  const stmtCheckTome = db.prepare('SELECT id FROM manga_tomes WHERE serie_id = ? AND numero = ?');
  const stmtInsertTome = db.prepare(`
    INSERT INTO manga_tomes (serie_id, numero, prix, date_sortie, couverture_url)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  let manga_tomesUpdated = 0;
  
  for (const volume of volumesWithDate) {
    try {
      const existingTome = stmtCheckTome.get(serieId, volume.numero);
      
      if (existingTome) {
        // Mise à jour
        const success = await updateTome(db, pm, volume, serieId, serieTitle, options);
        if (success) {
          manga_tomesUpdated++;
        }
      } else {
        // Création
        let effectiveCover = null;
        if (options.autoDownloadCovers === false) {
          effectiveCover = volume.couverture_url || null;
        } else {
          const localCoverPath = await downloadTomeCover(pm, volume.couverture_url, serieTitle, volume.numero, options);
          effectiveCover = localCoverPath || volume.couverture_url || null;
        }
        
        const result = stmtInsertTome.run(
          serieId,
          volume.numero,
          volume.prix || 0,
          volume.date_sortie,
          effectiveCover
        );

        // Ne pas marquer automatiquement la possession lors de l'import Nautiljon
        // La possession sera gérée manuellement par l'utilisateur ou automatiquement si date_achat est renseignée
        
        manga_tomesUpdated++;
      }
    } catch (error) {
      console.error(`⚠️ Erreur mise à jour tome ${volume.numero}:`, error.message);
    }
  }
  return manga_tomesUpdated;
}

module.exports = {
  filterVolumesWithDate,
  downloadTomeCover,
  createTome,
  updateTome,
  createVolumes,
  updateOrCreateVolumes
};
