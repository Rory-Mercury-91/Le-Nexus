/**
 * Gestion des statuts utilisateur MAL
 * Met à jour les statuts de lecture/visionnage pour manga et anime
 */

const { convertMALReadingStatus, convertMALUserStatus } = require('./mal-transformers');
const { ensureMangaUserDataRow } = require('../../handlers/mangas/manga-helpers');
const {
  ensureAnimeUserDataRow,
  getUserIdByName: getAnimeUserIdByName
} = require('../../handlers/animes/anime-helpers');

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
  
  // S'assurer qu'une entrée manga_user_data existe
  ensureMangaUserDataRow(db, serieId, user.id);
  
  // Mettre à jour
  db.prepare(`
    UPDATE manga_user_data 
    SET statut_lecture = ?,
        score = ?,
        volumes_lus = ?,
        chapitres_lus = ?,
        date_debut = ?,
        date_fin = ?,
        updated_at = datetime('now')
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
  
  // Ancien code (commenté pour référence)
  /*
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
  */
}

/**
 * Met à jour le statut utilisateur pour un anime
 */
function updateAnimeUserStatus(db, currentUser, animeId, animeData) {
  // Récupérer l'ID de l'utilisateur via le helper commun
  const userId = getAnimeUserIdByName(db, currentUser);
  if (!userId) {
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

  // S'assurer qu'une entrée anime_user_data existe
  ensureAnimeUserDataRow(db, animeId, userId);

  // Préparer episode_progress si MAL fournit des épisodes vus
  let episodeProgressJson = null;
  if (episodesVus > 0) {
    const now = new Date().toISOString();
    const episodeProgress = {};
    for (let i = 1; i <= episodesVus; i++) {
      episodeProgress[String(i)] = {
        vu: true,
        date_visionnage: now
      };
    }
    episodeProgressJson = JSON.stringify(episodeProgress);
    console.log(`📊 Mise à jour progression anime ${animeId}: ${episodesVus} épisodes vus, statut: ${statutVisionnage}, score: ${animeData.score_perso || 'N/A'}`);
  } else {
    console.log(`📊 Mise à jour statut anime ${animeId}: ${statutVisionnage} (aucun épisode vu)`);
  }

  db.prepare(`
    UPDATE anime_user_data 
    SET statut_visionnage = ?,
        score = ?,
        episodes_vus = ?,
        date_debut = ?,
        date_fin = ?,
        episode_progress = ?,
        updated_at = datetime('now')
    WHERE anime_id = ? AND user_id = ?
  `).run(
    statutVisionnage,
    animeData.score_perso || null,
    episodesVus,
    animeData.date_debut || null,
    animeData.date_fin || null,
    episodeProgressJson,
    animeId,
    userId
  );

  // Vérifier si l'utilisateur a vu tous les épisodes disponibles et réinitialiser maj_disponible si nécessaire
  const animeInfo = db.prepare('SELECT nb_episodes, statut_diffusion, maj_disponible FROM anime_series WHERE id = ?').get(animeId);
  if (animeInfo) {
    const nbEpisodes = animeInfo.nb_episodes || 0;
    const isEnCours = animeInfo.statut_diffusion === 'En cours';
    const hasSeenAllEpisodes = nbEpisodes > 0 && episodesVus >= nbEpisodes;
    if (isEnCours && hasSeenAllEpisodes && animeInfo.maj_disponible === 1) {
      db.prepare('UPDATE anime_series SET maj_disponible = 0 WHERE id = ?').run(animeId);
      console.log(`✅ Réinitialisation maj_disponible pour anime ${animeId} (synchronisation MAL: tous les épisodes vus)`);
    }
  }
}

module.exports = {
  updateMangaUserStatus,
  updateAnimeUserStatus
};
