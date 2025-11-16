/**
 * Logique de synchronisation MAL
 * Synchronise les séries manga et anime avec la base de données
 */

const { transformMangaData, transformAnimeData } = require('./mal-transformers');
const { updateFieldIfNotUserModified } = require('../../utils/enrichment-helpers');

function upsertMangaUserStatus(db, serieId, userId, mangaData) {
  if (!serieId || !userId) {
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO serie_statut_utilisateur (
      serie_id,
      user_id,
      statut_lecture,
      score,
      volumes_lus,
      chapitres_lus,
      date_debut,
      date_fin,
      date_modification
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(serie_id, user_id) DO UPDATE SET
      statut_lecture = excluded.statut_lecture,
      score = excluded.score,
      volumes_lus = excluded.volumes_lus,
      chapitres_lus = excluded.chapitres_lus,
      date_debut = excluded.date_debut,
      date_fin = excluded.date_fin,
      date_modification = datetime('now')
  `);

  stmt.run(
    serieId,
    userId,
    mangaData.statut_lecture || 'À lire',
    mangaData.score_perso || null,
    mangaData.volumes_lus ?? 0,
    mangaData.chapitres_lus ?? 0,
    mangaData.date_debut || null,
    mangaData.date_fin || null
  );
}

function unmaskSerieForUser(db, serieId, userId) {
  if (!serieId || !userId) {
    return;
  }

  db.prepare(`
    DELETE FROM series_masquees
    WHERE serie_id = ? AND user_id = ?
  `).run(serieId, userId);
}

/**
 * Synchronise une série manga avec la base de données
 */
async function syncMangaSeries(db, currentUser, malEntry) {
  // malEntry peut être soit { node: ..., list_status: ... } soit directement le node
  const entry = malEntry.node ? malEntry : { node: malEntry };
  const mangaData = transformMangaData(entry);
  let userId = null;
  if (currentUser) {
    const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
    userId = user ? user.id : null;
  }
  
  // Vérifier si la série existe déjà
  let existingSerie = db.prepare('SELECT * FROM series WHERE mal_id = ?').get(mangaData.mal_id);
  
  if (existingSerie) {
    const ownerId = userId || existingSerie.user_id_ajout || null;
    
    // Récupérer les champs modifiés par l'utilisateur
    const userModifiedFields = existingSerie.user_modified_fields || null;
    
    // Mettre à jour la série existante en respectant les champs protégés
    // Toujours mettre à jour mal_id, source_donnees, user_id_ajout et updated_at
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'titre', mangaData.titre, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'titre_romaji', mangaData.titre_romaji, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'titre_anglais', mangaData.titre_anglais, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'titre_natif', mangaData.titre_natif, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'couverture_url', mangaData.couverture_url, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'description', mangaData.description, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'statut', mangaData.statut, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'statut_publication', mangaData.statut_publication, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'annee_publication', mangaData.annee_publication, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'genres', mangaData.genres, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'nb_volumes', mangaData.nb_volumes, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'nb_chapitres', mangaData.nb_chapitres, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'rating', mangaData.rating, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'rank_mal', mangaData.rank, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'popularity_mal', mangaData.popularite, userModifiedFields);
    updateFieldIfNotUserModified(db, 'series', existingSerie.id, 'statut_lecture', mangaData.statut_lecture, userModifiedFields);
    
    // Toujours mettre à jour ces champs (non protégés)
    db.prepare(`
      UPDATE series 
      SET mal_id = ?,
          source_donnees = ?,
          user_id_ajout = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      mangaData.mal_id,
      mangaData.source_donnees,
      ownerId,
      existingSerie.id
    );
    
    if (userId) {
      upsertMangaUserStatus(db, existingSerie.id, userId, mangaData);
      unmaskSerieForUser(db, existingSerie.id, userId);
    }

    return existingSerie.id;
  } else {
    // Créer une nouvelle série
    const result = db.prepare(`
      INSERT INTO series (
        mal_id, titre, titre_romaji, titre_anglais, titre_natif,
        couverture_url, description, statut, statut_publication, annee_publication,
        genres, nb_volumes, nb_chapitres, rating, rank_mal, popularity_mal,
        type_volume, statut_lecture, source_donnees, user_id_ajout
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mangaData.mal_id,
      mangaData.titre,
      mangaData.titre_romaji,
      mangaData.titre_anglais,
      mangaData.titre_natif,
      mangaData.couverture_url,
      mangaData.description,
      mangaData.statut,
      mangaData.statut_publication,
      mangaData.annee_publication,
      mangaData.genres,
      mangaData.nb_volumes,
      mangaData.nb_chapitres,
      mangaData.rating,
      mangaData.rank,
      mangaData.popularite,
      mangaData.type_volume,
      mangaData.statut_lecture,
      mangaData.source_donnees,
      userId || null
    );
    
    const serieId = result.lastInsertRowid;

    if (userId && serieId) {
      upsertMangaUserStatus(db, serieId, userId, mangaData);
      unmaskSerieForUser(db, serieId, userId);
    }

    return serieId;
  }
}

/**
 * Synchronise un anime avec la base de données
 */
async function syncAnimeSeries(db, currentUser, malEntry) {
  // malEntry peut être soit { node: ..., list_status: ... } soit directement le node
  const entry = malEntry.node ? malEntry : { node: malEntry };
  const animeData = transformAnimeData(entry);
  
  // Convertir le nom d'utilisateur en ID
  let userId = null;
  if (currentUser) {
    const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
    userId = user ? user.id : null;
  }
  
  // Vérifier si l'anime existe déjà
  let existingAnime = db.prepare('SELECT * FROM anime_series WHERE mal_id = ?').get(animeData.mal_id);
  
  if (existingAnime) {
    const ownerId = userId || existingAnime.user_id_ajout || null;
    
    // Récupérer les champs modifiés par l'utilisateur
    const userModifiedFields = existingAnime.user_modified_fields || null;
    
    // Mettre à jour l'anime existant en respectant les champs protégés
    updateFieldIfNotUserModified(db, 'anime_series', existingAnime.id, 'titre', animeData.titre, userModifiedFields);
    updateFieldIfNotUserModified(db, 'anime_series', existingAnime.id, 'titre_natif', animeData.titre_natif, userModifiedFields);
    updateFieldIfNotUserModified(db, 'anime_series', existingAnime.id, 'titre_romaji', animeData.titre_romaji, userModifiedFields);
    updateFieldIfNotUserModified(db, 'anime_series', existingAnime.id, 'couverture_url', animeData.couverture_url, userModifiedFields);
    updateFieldIfNotUserModified(db, 'anime_series', existingAnime.id, 'description', animeData.description, userModifiedFields);
    updateFieldIfNotUserModified(db, 'anime_series', existingAnime.id, 'statut_diffusion', animeData.statut_diffusion, userModifiedFields);
    updateFieldIfNotUserModified(db, 'anime_series', existingAnime.id, 'type', animeData.type, userModifiedFields);
    updateFieldIfNotUserModified(db, 'anime_series', existingAnime.id, 'annee', animeData.annee, userModifiedFields);
    updateFieldIfNotUserModified(db, 'anime_series', existingAnime.id, 'genres', animeData.genres, userModifiedFields);
    updateFieldIfNotUserModified(db, 'anime_series', existingAnime.id, 'studios', animeData.studios, userModifiedFields);
    updateFieldIfNotUserModified(db, 'anime_series', existingAnime.id, 'nb_episodes', animeData.nb_episodes, userModifiedFields);
    
    // Toujours mettre à jour ces champs (non protégés)
    db.prepare(`
      UPDATE anime_series 
      SET source_import = ?,
          user_id_ajout = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      animeData.source_import,
      ownerId,
      existingAnime.id
    );
    
    return existingAnime.id;
  } else {
    // Créer un nouvel anime
    const result = db.prepare(`
      INSERT INTO anime_series (
        mal_id, titre, titre_natif, titre_romaji, couverture_url, description,
        statut_diffusion, type, annee, genres, studios, nb_episodes, source_import, user_id_ajout
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      animeData.mal_id,
      animeData.titre,
      animeData.titre_natif,
      animeData.titre_romaji,
      animeData.couverture_url,
      animeData.description,
      animeData.statut_diffusion,
      animeData.type,
      animeData.annee,
      animeData.genres,
      animeData.studios,
      animeData.nb_episodes,
      animeData.source_import,
      userId || null
    );
    
    return result.lastInsertRowid;
  }
}

module.exports = {
  syncMangaSeries,
  syncAnimeSeries
};
