/**
 * Fonctions utilitaires partagées pour les handlers de mangas
 */

// Import des fonctions communes
const { getUserIdByName, safeJsonParse } = require('../common-helpers');

/**
 * S'assure qu'une ligne manga_user_data existe pour une série et un utilisateur
 */
function ensureMangaUserDataRow(db, serieId, userId) {
  if (!userId) return;
  
  const existing = db.prepare('SELECT id FROM manga_user_data WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
  if (!existing) {
    db.prepare(`
      INSERT INTO manga_user_data (
        serie_id, user_id, statut_lecture, score, volumes_lus, chapitres_lus,
        date_debut, date_fin, tag, is_favorite, is_hidden, notes_privees,
        tome_progress, display_preferences, created_at, updated_at
      )
      VALUES (?, ?, 'À lire', NULL, 0, 0, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, datetime('now'), datetime('now'))
    `).run(serieId, userId);
  }
}
/**
 * Force l'exclusivité d'un propriétaire sur tous les manga_tomes d'une série
 */
function tableExists(db, tableName) {
  return Boolean(db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(tableName));
}

function setExclusiveSerieOwnership(db, serieId, userId) {
  if (!userId) return;
  const tableName = 'manga_manga_tomes_proprietaires';
  if (!tableExists(db, tableName)) {
    console.warn(`⚠️ Table ${tableName} introuvable, impossible d'appliquer la propriété exclusive.`);
    return;
  }

  db.prepare(`
    DELETE FROM ${tableName}
    WHERE tome_id IN (SELECT id FROM manga_tomes WHERE serie_id = ?)
      AND user_id != ?
  `).run(serieId, userId);

  db.prepare(`
    INSERT OR IGNORE INTO ${tableName} (tome_id, user_id)
    SELECT id, ? FROM manga_tomes WHERE serie_id = ?
  `).run(userId, serieId);
}

/**
 * Force le statut utilisateur d'une série pour l'utilisateur courant uniquement
 */
function setExclusiveSerieUserStatus(db, serieId, userId, statutLecture = 'À lire') {
  if (!userId) return;

  // Supprimer les entrées des autres utilisateurs (si nécessaire)
  // Note: Avec manga_user_data, chaque utilisateur a sa propre entrée, donc pas besoin de DELETE

  ensureMangaUserDataRow(db, serieId, userId);
  
  db.prepare(`
    UPDATE manga_user_data SET
      statut_lecture = ?,
      updated_at = datetime('now')
    WHERE serie_id = ? AND user_id = ?
  `).run(statutLecture, serieId, userId);
}

/**
 * Récupérer le titre d'une série
 */
function getSerieTitle(db, serieId) {
  const serie = db.prepare('SELECT titre FROM manga_series WHERE id = ?').get(serieId);
  return serie ? serie.titre : null;
}

/**
 * Récupérer la couverture d'une série
 */
function getSerieCover(db, serieId) {
  const serie = db.prepare('SELECT couverture_url FROM manga_series WHERE id = ?').get(serieId);
  return serie ? serie.couverture_url : null;
}

/**
 * Mettre à jour la couverture d'une série
 */
function updateSerieCover(db, serieId, coverUrl) {
  db.prepare('UPDATE manga_series SET couverture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(coverUrl, serieId);
}

/**
 * Calcule automatiquement le tag de completion pour une série basé sur les progressions
 * Prend en compte les manga_tomes ET les chapitres
 * @param {Database} db - Instance de la base de données
 * @param {number} serieId - ID de la série
 * @param {number} userId - ID de l'utilisateur
 * @returns {string|null} Le tag calculé ('a_lire', 'en_cours', 'lu', ou null si tag manuel)
 */
function calculateAutoCompletionTag(db, serieId, userId) {
  if (!userId) return null;

  // Récupérer les données utilisateur depuis manga_user_data
  const userData = db.prepare(`
    SELECT tag, volumes_lus, chapitres_lus, tome_progress
    FROM manga_user_data
    WHERE serie_id = ? AND user_id = ?
  `).get(serieId, userId);

  // Vérifier s'il y a un tag manuel (a_lire ou abandonne)
  if (userData && userData.tag && (userData.tag === 'a_lire' || userData.tag === 'abandonne')) {
    // Ne pas écraser un tag manuel
    return null;
  }

  // Récupérer aussi depuis la table manga_series (pour compatibilité)
  const serie = db.prepare('SELECT volumes_lus, chapitres_lus, nb_volumes, nb_volumes_vf, nb_chapitres, nb_chapitres_vf, type_contenu FROM manga_series WHERE id = ?').get(serieId);
  
  // Compter les manga_tomes lus depuis tome_progress (JSON)
  let nbTomesLus = 0;
  if (userData && userData.tome_progress) {
    const tomeProgress = safeJsonParse(userData.tome_progress, []);
    if (Array.isArray(tomeProgress)) {
      nbTomesLus = tomeProgress.filter(tp => tp.lu === true || tp.lu === 1).length;
    }
  }
  
  // Compter le total de manga_tomes
  const manga_tomesTotalCount = db.prepare('SELECT COUNT(*) as count FROM manga_tomes WHERE serie_id = ?').get(serieId);
  const nbTomesTotal = manga_tomesTotalCount ? manga_tomesTotalCount.count : 0;

  // Utiliser les valeurs de manga_user_data en priorité, sinon celles de manga_series
  const volumesLus = userData && userData.volumes_lus !== null && userData.volumes_lus !== undefined
    ? userData.volumes_lus
    : (serie ? (serie.volumes_lus || 0) : 0);
  
  const chapitresLus = userData && userData.chapitres_lus !== null && userData.chapitres_lus !== undefined
    ? userData.chapitres_lus
    : (serie ? (serie.chapitres_lus || 0) : 0);

  // Calculer les totaux
  const nbVolumesTotal = serie ? (serie.nb_volumes || serie.nb_volumes_vf || 0) : 0;
  const nbChapitresTotal = serie ? (serie.nb_chapitres || serie.nb_chapitres_vf || 0) : 0;

  // Si volumes_lus = 0 ET chapitres_lus = 0 ET nbTomesLus = 0 → "À lire"
  if (volumesLus === 0 && chapitresLus === 0 && nbTomesLus === 0) {
    return 'a_lire';
  }

  // Si volumes_lus >= 1 OU chapitres_lus >= 1 OU nbTomesLus >= 1 → "En cours" ou "Terminé"
  const hasProgress = volumesLus >= 1 || chapitresLus >= 1 || nbTomesLus >= 1;
  
  if (hasProgress) {
    // Vérifier si tout est terminé
    const allTomesRead = nbTomesTotal > 0 && nbTomesLus === nbTomesTotal;
    const allVolumesRead = nbVolumesTotal > 0 && volumesLus >= nbVolumesTotal;
    const allChapitresRead = nbChapitresTotal > 0 && chapitresLus >= nbChapitresTotal;
    
    if (allTomesRead || (nbVolumesTotal > 0 && allVolumesRead) || (nbChapitresTotal > 0 && allChapitresRead)) {
      return 'lu';
    }
    
    return 'en_cours';
  }

  return 'a_lire';
}

function clearManualTagOverride(db, serieId, userId) {
  if (!userId) return;
  db.prepare(`
    UPDATE manga_user_data
    SET tag_manual_override = 0
    WHERE serie_id = ? AND user_id = ?
  `).run(serieId, userId);
}

/**
 * Met à jour automatiquement le tag de completion pour une série
 * @param {Database} db - Instance de la base de données
 * @param {number} serieId - ID de la série
 * @param {number} userId - ID de l'utilisateur
 */
function updateAutoCompletionTag(db, serieId, userId) {
  if (!userId) return;

  ensureMangaUserDataRow(db, serieId, userId);

  const overrideData = db.prepare(`
    SELECT tag_manual_override FROM manga_user_data
    WHERE serie_id = ? AND user_id = ?
  `).get(serieId, userId);

  if (overrideData?.tag_manual_override) {
    return;
  }

  const autoTag = calculateAutoCompletionTag(db, serieId, userId);
  if (autoTag === null) {
    return;
  }

  db.prepare(`
    UPDATE manga_user_data SET
      tag = ?,
      updated_at = datetime('now')
    WHERE serie_id = ? AND user_id = ?
  `).run(autoTag, serieId, userId);
}

module.exports = {
  getUserIdByName,
  getSerieTitle,
  getSerieCover,
  updateSerieCover,
  setExclusiveSerieOwnership,
  setExclusiveSerieUserStatus,
  calculateAutoCompletionTag,
  updateAutoCompletionTag,
  clearManualTagOverride,
  ensureMangaUserDataRow
};
