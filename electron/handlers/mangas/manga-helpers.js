/**
 * Fonctions utilitaires partagées pour les handlers de mangas
 */

// Import des fonctions communes
const { getUserIdByName } = require('../common-helpers');
/**
 * Force l'exclusivité d'un propriétaire sur tous les tomes d'une série
 */
function setExclusiveSerieOwnership(db, serieId, userId) {
  if (!userId) return;

  db.prepare(`
    DELETE FROM tomes_proprietaires
    WHERE tome_id IN (SELECT id FROM tomes WHERE serie_id = ?)
      AND user_id != ?
  `).run(serieId, userId);

  db.prepare(`
    INSERT OR IGNORE INTO tomes_proprietaires (tome_id, user_id)
    SELECT id, ? FROM tomes WHERE serie_id = ?
  `).run(userId, serieId);
}

/**
 * Force le statut utilisateur d'une série pour l'utilisateur courant uniquement
 */
function setExclusiveSerieUserStatus(db, serieId, userId, statutLecture = 'À lire') {
  if (!userId) return;

  db.prepare(`
    DELETE FROM serie_statut_utilisateur
    WHERE serie_id = ?
      AND user_id != ?
  `).run(serieId, userId);

  db.prepare(`
    INSERT INTO serie_statut_utilisateur (
      serie_id, user_id, statut_lecture, volumes_lus, chapitres_lus, date_modification
    ) VALUES (?, ?, ?, 0, 0, datetime('now'))
    ON CONFLICT(serie_id, user_id) DO UPDATE SET
      statut_lecture = excluded.statut_lecture,
      date_modification = datetime('now')
  `).run(serieId, userId, statutLecture);
}

/**
 * Récupérer le titre d'une série
 */
function getSerieTitle(db, serieId) {
  const serie = db.prepare('SELECT titre FROM series WHERE id = ?').get(serieId);
  return serie ? serie.titre : null;
}

/**
 * Récupérer la couverture d'une série
 */
function getSerieCover(db, serieId) {
  const serie = db.prepare('SELECT couverture_url FROM series WHERE id = ?').get(serieId);
  return serie ? serie.couverture_url : null;
}

/**
 * Mettre à jour la couverture d'une série
 */
function updateSerieCover(db, serieId, coverUrl) {
  db.prepare('UPDATE series SET couverture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(coverUrl, serieId);
}

/**
 * Calcule automatiquement le tag de completion pour une série basé sur les progressions
 * Prend en compte les tomes ET les chapitres
 * @param {Database} db - Instance de la base de données
 * @param {number} serieId - ID de la série
 * @param {number} userId - ID de l'utilisateur
 * @returns {string|null} Le tag calculé ('a_lire', 'en_cours', 'lu', ou null si tag manuel)
 */
function calculateAutoCompletionTag(db, serieId, userId) {
  if (!userId) return null;

  // Vérifier s'il y a un tag manuel (a_lire ou abandonne)
  const manualTag = db.prepare('SELECT tag FROM serie_tags WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
  if (manualTag && (manualTag.tag === 'a_lire' || manualTag.tag === 'abandonne')) {
    // Ne pas écraser un tag manuel
    return null;
  }

  // Récupérer les progressions depuis serie_statut_utilisateur
  const statutUtilisateur = db.prepare(`
    SELECT volumes_lus, chapitres_lus
    FROM serie_statut_utilisateur
    WHERE serie_id = ? AND user_id = ?
  `).get(serieId, userId);

  // Récupérer aussi depuis la table series (pour compatibilité)
  const serie = db.prepare('SELECT volumes_lus, chapitres_lus, nb_volumes, nb_volumes_vf, nb_chapitres, nb_chapitres_vf, type_contenu FROM series WHERE id = ?').get(serieId);
  
  // Compter les tomes lus
  const tomesLusCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM lecture_tomes lt
    JOIN tomes t ON lt.tome_id = t.id
    WHERE t.serie_id = ? AND lt.user_id = ? AND lt.lu = 1
  `).get(serieId, userId);
  const nbTomesLus = tomesLusCount ? tomesLusCount.count : 0;
  
  // Compter le total de tomes
  const tomesTotalCount = db.prepare('SELECT COUNT(*) as count FROM tomes WHERE serie_id = ?').get(serieId);
  const nbTomesTotal = tomesTotalCount ? tomesTotalCount.count : 0;

  // Utiliser les valeurs de serie_statut_utilisateur en priorité, sinon celles de series
  const volumesLus = statutUtilisateur && statutUtilisateur.volumes_lus !== null && statutUtilisateur.volumes_lus !== undefined
    ? statutUtilisateur.volumes_lus
    : (serie ? (serie.volumes_lus || 0) : 0);
  
  const chapitresLus = statutUtilisateur && statutUtilisateur.chapitres_lus !== null && statutUtilisateur.chapitres_lus !== undefined
    ? statutUtilisateur.chapitres_lus
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

/**
 * Met à jour automatiquement le tag de completion pour une série
 * @param {Database} db - Instance de la base de données
 * @param {number} serieId - ID de la série
 * @param {number} userId - ID de l'utilisateur
 */
function updateAutoCompletionTag(db, serieId, userId) {
  if (!userId) return;

  const autoTag = calculateAutoCompletionTag(db, serieId, userId);
  if (autoTag === null) {
    // Tag manuel, ne pas le modifier
    return;
  }

  // Mettre à jour ou créer le tag
  db.prepare(`
    INSERT INTO serie_tags (serie_id, user_id, tag, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(serie_id, user_id) DO UPDATE SET
      tag = excluded.tag,
      updated_at = datetime('now')
  `).run(serieId, userId, autoTag);
}

module.exports = {
  getUserIdByName,
  getSerieTitle,
  getSerieCover,
  updateSerieCover,
  setExclusiveSerieOwnership,
  setExclusiveSerieUserStatus,
  calculateAutoCompletionTag,
  updateAutoCompletionTag
};
