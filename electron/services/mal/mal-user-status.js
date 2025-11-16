/**
 * Gestion des statuts utilisateur MAL
 * Met à jour les statuts de lecture/visionnage pour manga et anime
 */

const { convertMALReadingStatus, convertMALUserStatus } = require('./mal-transformers');

/**
 * Met à jour le statut utilisateur pour un manga
 */
function updateMangaUserStatus(db, currentUser, serieId, mangaData) {
  // Récupérer l'ID de l'utilisateur
  const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
  if (!user) {
    console.warn(`⚠️ Utilisateur "${currentUser}" non trouvé, impossible de mettre à jour le statut`);
    return;
  }
  
  const volumesLus = mangaData.volumes_lus || 0;
  const chapitresLus = mangaData.chapitres_lus || 0;
  
  // Convertir le statut utilisateur MAL vers le format de lecture
  // Si volumes_lus et chapitres_lus sont à 0, forcer "À lire" au lieu de "En cours"
  let statutLecture = convertMALReadingStatus(mangaData.statut_perso);
  if (volumesLus === 0 && chapitresLus === 0 && statutLecture === 'En cours') {
    statutLecture = 'À lire';
  }
  
  // Log pour débogage - toujours loguer, même si pas de progression
  console.log(`📚 Mise à jour statut manga ${serieId}: statut MAL="${mangaData.statut_perso}" → "${statutLecture}", ${volumesLus} volumes, ${chapitresLus} chapitres, score: ${mangaData.score_perso || 'N/A'}`);
  
  // Vérifier si un statut existe déjà
  const existingStatus = db.prepare(`
    SELECT * FROM serie_statut_utilisateur 
    WHERE serie_id = ? AND user_id = ?
  `).get(serieId, user.id);
  
  if (existingStatus) {
    // Mettre à jour
    db.prepare(`
      UPDATE serie_statut_utilisateur 
      SET statut_lecture = ?,
          score = ?,
          volumes_lus = ?,
          chapitres_lus = ?,
          date_debut = ?,
          date_fin = ?,
          date_modification = datetime('now')
      WHERE serie_id = ? AND user_id = ?
    `).run(
      statutLecture,
      mangaData.score_perso || null,
      volumesLus,
      chapitresLus,
      mangaData.date_debut || null,
      mangaData.date_fin || null,
      serieId,
      user.id
    );
    console.log(`✅ Statut manga ${serieId} mis à jour: ${statutLecture}`);
  } else {
    // Créer
    db.prepare(`
      INSERT INTO serie_statut_utilisateur (
        serie_id, user_id, statut_lecture, score, volumes_lus, chapitres_lus, date_debut, date_fin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      serieId,
      user.id,
      statutLecture,
      mangaData.score_perso || null,
      volumesLus,
      chapitresLus,
      mangaData.date_debut || null,
      mangaData.date_fin || null
    );
    console.log(`✅ Statut manga ${serieId} créé: ${statutLecture}`);
  }
}

/**
 * Met à jour le statut utilisateur pour un anime
 */
function updateAnimeUserStatus(db, currentUser, animeId, animeData) {
  // Récupérer l'ID de l'utilisateur
  const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
  if (!user) {
    console.warn(`⚠️ Utilisateur "${currentUser}" non trouvé, impossible de mettre à jour le statut`);
    return;
  }
  
  const episodesVus = animeData.episodes_vus || 0;
  
  // Convertir le statut MAL vers le format de l'application
  // Si episodes_vus est à 0, forcer "À regarder" au lieu de "En cours"
  let statutVisionnage = convertMALUserStatus(animeData.statut_perso);
  if (episodesVus === 0 && statutVisionnage === 'En cours') {
    statutVisionnage = 'À regarder';
  }
  
  // Vérifier si un statut existe déjà
  const existingStatus = db.prepare(`
    SELECT * FROM anime_statut_utilisateur 
    WHERE anime_id = ? AND user_id = ?
  `).get(animeId, user.id);
  
  // Log pour débogage
  if (episodesVus > 0) {
    console.log(`📊 Mise à jour progression anime ${animeId}: ${episodesVus} épisodes vus, statut: ${statutVisionnage}, score: ${animeData.score_perso || 'N/A'}`);
  }
  
  if (existingStatus) {
    // Mettre à jour
    db.prepare(`
      UPDATE anime_statut_utilisateur 
      SET statut_visionnage = ?,
          score = ?,
          episodes_vus = ?,
          date_debut = ?,
          date_fin = ?,
          date_modification = CURRENT_TIMESTAMP
      WHERE anime_id = ? AND user_id = ?
    `).run(
      statutVisionnage,
      animeData.score_perso || null,
      episodesVus,
      animeData.date_debut || null,
      animeData.date_fin || null,
      animeId,
      user.id
    );
  } else {
    // Créer
    db.prepare(`
      INSERT INTO anime_statut_utilisateur (
        anime_id, user_id, statut_visionnage, score, episodes_vus, date_debut, date_fin
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      animeId,
      user.id,
      statutVisionnage,
      animeData.score_perso || null,
      episodesVus,
      animeData.date_debut || null,
      animeData.date_fin || null
    );
  }
  
  // Synchroniser les épisodes vus individuellement dans anime_episodes_vus
  if (episodesVus > 0) {
    // Supprimer les anciens épisodes vus pour cet anime et cet utilisateur
    db.prepare('DELETE FROM anime_episodes_vus WHERE anime_id = ? AND user_id = ?').run(animeId, user.id);
    
    // Insérer les épisodes vus (de 1 à episodesVus)
    const insertEpisode = db.prepare(`
      INSERT INTO anime_episodes_vus (anime_id, user_id, episode_numero, vu, date_visionnage)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    `);
    
    for (let i = 1; i <= episodesVus; i++) {
      insertEpisode.run(animeId, user.id, i);
    }
  }
}

module.exports = {
  updateMangaUserStatus,
  updateAnimeUserStatus
};
