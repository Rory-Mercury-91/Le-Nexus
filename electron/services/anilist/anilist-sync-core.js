/**
 * Logique de synchronisation AniList
 * Synchronise les séries manga et anime avec la base de données
 */

const { transformMangaData, transformAnimeData } = require('./anilist-transformers');
const { updateFieldIfNotUserModified, isFieldUserModified } = require('../../utils/enrichment-helpers');
const { isNautiljonSource } = require('../mangas/manga-import-merger');

function upsertMangaUserStatus(db, serieId, userId, mangaData) {
  if (!serieId || !userId) {
    return;
  }

  const { ensureMangaUserDataRow } = require('../../handlers/mangas/manga-helpers');
  ensureMangaUserDataRow(db, serieId, userId);

  db.prepare(`
    UPDATE manga_user_data SET
      statut_lecture = ?,
      score = ?,
      volumes_lus = ?,
      chapitres_lus = ?,
      date_debut = ?,
      date_fin = ?,
      updated_at = datetime('now')
    WHERE serie_id = ? AND user_id = ?
  `).run(
    mangaData.statut_lecture || 'À lire',
    mangaData.score_perso || null,
    mangaData.volumes_lus ?? 0,
    mangaData.chapitres_lus ?? 0,
    mangaData.date_debut || null,
    mangaData.date_fin || null,
    serieId,
    userId
  );
}

function unmaskSerieForUser(db, serieId, userId) {
  if (!serieId || !userId) {
    return;
  }

  const { ensureMangaUserDataRow } = require('../../handlers/mangas/manga-helpers');
  ensureMangaUserDataRow(db, serieId, userId);

  db.prepare(`
    UPDATE manga_user_data SET
      is_hidden = 0,
      updated_at = datetime('now')
    WHERE serie_id = ? AND user_id = ?
  `).run(serieId, userId);
}

/**
 * Synchronise une série manga avec la base de données
 */
async function syncMangaSeries(db, currentUser, anilistEntry) {
  const mangaData = transformMangaData(anilistEntry);
  let userId = null;
  if (currentUser) {
    const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
    userId = user ? user.id : null;
  }

  // Vérifier si la série existe déjà
  // ÉTAPE 1 : Recherche par anilist_id (le plus fiable)
  let existingSerie = db.prepare('SELECT * FROM manga_series WHERE anilist_id = ?').get(mangaData.anilist_id);

  // ÉTAPE 2 : Si pas trouvé par anilist_id, chercher par mal_id (si présent)
  if (!existingSerie && mangaData.mal_id) {
    existingSerie = db.prepare('SELECT * FROM manga_series WHERE mal_id = ?').get(mangaData.mal_id);
    if (existingSerie) {
      console.log(`✅ [AniList Sync] Série trouvée par mal_id: "${mangaData.titre}" → ID ${existingSerie.id}`);
      // Mettre à jour l'anilist_id de la série existante si elle n'en a pas
      if (!existingSerie.anilist_id && mangaData.anilist_id) {
        db.prepare('UPDATE manga_series SET anilist_id = ? WHERE id = ?').run(mangaData.anilist_id, existingSerie.id);
        existingSerie.anilist_id = mangaData.anilist_id;
        console.log(`✅ [AniList Sync] anilist_id ${mangaData.anilist_id} ajouté à la série existante ID ${existingSerie.id}`);
      }
    }
  }

  // ÉTAPE 3 : Si pas trouvé, chercher par titre (pour les séries importées sans anilist_id ni mal_id)
  if (!existingSerie) {
    const { findExistingSerieUnified } = require('../unified-matching-service');
    const sourceData = {
      titre: mangaData.titre || '',
      mal_id: mangaData.mal_id || null,
      anilist_id: mangaData.anilist_id || null,
      titre_romaji: mangaData.titre_romaji || null,
      titre_natif: mangaData.titre_natif || null,
      titre_anglais: mangaData.titre_anglais || null,
      titres_alternatifs: mangaData.titres_alternatifs || null
    };

    const expectedMediaType = mangaData.media_type ? mangaData.media_type.toLowerCase() : null;

    try {
      const matchResult = findExistingSerieUnified(
        db,
        sourceData,
        'anilist',
        expectedMediaType
      );

      // Fusionner automatiquement si match exact (100%) ou par mal_id/anilist_id
      if (matchResult && (matchResult.isExactMatch || matchResult.matchMethod === 'mal_id' || matchResult.matchMethod === 'anilist_id' || matchResult.similarity >= 90)) {
        existingSerie = matchResult.serie;
        console.log(`✅ [AniList Sync] Série trouvée par titre (${matchResult.matchMethod}, similarité: ${matchResult.similarity}%): "${matchResult.matchedTitle}" → ID ${existingSerie.id}`);

        // Mettre à jour l'anilist_id de la série existante si elle n'en a pas
        if (!existingSerie.anilist_id && mangaData.anilist_id) {
          db.prepare('UPDATE manga_series SET anilist_id = ? WHERE id = ?').run(mangaData.anilist_id, existingSerie.id);
          existingSerie.anilist_id = mangaData.anilist_id;
          console.log(`✅ [AniList Sync] anilist_id ${mangaData.anilist_id} ajouté à la série existante ID ${existingSerie.id}`);
        }

        // Mettre à jour le mal_id si absent mais présent dans AniList
        if (!existingSerie.mal_id && mangaData.mal_id) {
          db.prepare('UPDATE manga_series SET mal_id = ? WHERE id = ?').run(mangaData.mal_id, existingSerie.id);
          existingSerie.mal_id = mangaData.mal_id;
          console.log(`✅ [AniList Sync] mal_id ${mangaData.mal_id} ajouté à la série existante ID ${existingSerie.id}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ [AniList Sync] Erreur recherche par titre pour "${mangaData.titre}":`, error.message);
    }
  }

  if (existingSerie) {
    const ownerId = userId || existingSerie.user_id_ajout || null;

    // Vérifier si la source actuelle est Nautiljon (les données Nautiljon prévalent)
    const isNautiljon = isNautiljonSource(existingSerie.source_donnees);

    // Récupérer les champs modifiés par l'utilisateur
    const userModifiedFields = existingSerie.user_modified_fields || null;

    const fieldChanges = [];
    const trackProtectedChange = (field, newValue) => {
      if (newValue === undefined) {
        return;
      }

      // Ne pas écraser les données si la source est Nautiljon (sauf pour les champs spécifiques AniList)
      const anilistSpecificFields = ['anilist_id'];
      if (isNautiljon && !anilistSpecificFields.includes(field)) {
        console.log(`⏭️ [AniList Sync] Champ ${field} ignoré (source Nautiljon prévaut) pour série ID ${existingSerie.id}`);
        return;
      }

      const currentValue = existingSerie[field];
      if ((currentValue ?? null) === (newValue ?? null)) {
        return;
      }
      if (updateFieldIfNotUserModified(db, 'manga_series', existingSerie.id, field, newValue, userModifiedFields)) {
        fieldChanges.push({
          field,
          before: currentValue ?? null,
          after: newValue ?? null
        });
        existingSerie[field] = newValue;
      }
    };

    // Fusionner les titres alternatifs d'AniList avec ceux existants (si pas modifiés par l'utilisateur)
    let mergedAltTitles = null;
    if (mangaData.titres_alternatifs && !isFieldUserModified(userModifiedFields, 'titres_alternatifs')) {
      const { collectAlternativeTitles } = require('../mangas/manga-import-merger');
      const altTitles = collectAlternativeTitles(existingSerie, { titres_alternatifs: mangaData.titres_alternatifs });
      if (altTitles.length > 0) {
        mergedAltTitles = JSON.stringify(altTitles);
      } else if (existingSerie.titres_alternatifs) {
        mergedAltTitles = existingSerie.titres_alternatifs;
      } else {
        mergedAltTitles = mangaData.titres_alternatifs;
      }
    } else if (existingSerie.titres_alternatifs) {
      mergedAltTitles = existingSerie.titres_alternatifs;
    } else if (mangaData.titres_alternatifs) {
      mergedAltTitles = mangaData.titres_alternatifs;
    }

    // Mettre à jour la série existante en respectant les champs protégés
    trackProtectedChange('titre', mangaData.titre);
    trackProtectedChange('titre_romaji', mangaData.titre_romaji);
    trackProtectedChange('titre_anglais', mangaData.titre_anglais);
    trackProtectedChange('titre_natif', mangaData.titre_natif);
    trackProtectedChange('titres_alternatifs', mergedAltTitles);
    trackProtectedChange('couverture_url', mangaData.couverture_url);
    trackProtectedChange('description', mangaData.description);
    trackProtectedChange('statut', mangaData.statut);
    trackProtectedChange('statut_publication', mangaData.statut_publication);
    trackProtectedChange('annee_publication', mangaData.annee_publication);
    trackProtectedChange('genres', mangaData.genres);
    trackProtectedChange('nb_volumes', mangaData.nb_volumes);
    trackProtectedChange('nb_chapitres', mangaData.nb_chapitres);
    trackProtectedChange('media_type', mangaData.media_type);
    trackProtectedChange('type_volume', mangaData.type_volume);

    // Toujours mettre à jour ces champs (non protégés)
    const unprotectedChanges = [];
    if ((existingSerie.anilist_id ?? null) !== (mangaData.anilist_id ?? null)) {
      unprotectedChanges.push({ field: 'anilist_id', before: existingSerie.anilist_id ?? null, after: mangaData.anilist_id ?? null });
    }
    if (!existingSerie.mal_id && mangaData.mal_id) {
      unprotectedChanges.push({ field: 'mal_id', before: existingSerie.mal_id ?? null, after: mangaData.mal_id ?? null });
    }
    if ((existingSerie.source_donnees ?? null) !== (mangaData.source_donnees ?? null)) {
      unprotectedChanges.push({ field: 'source_donnees', before: existingSerie.source_donnees ?? null, after: mangaData.source_donnees ?? null });
    }
    if ((existingSerie.user_id_ajout ?? null) !== (ownerId ?? null)) {
      unprotectedChanges.push({ field: 'user_id_ajout', before: existingSerie.user_id_ajout ?? null, after: ownerId ?? null });
    }
    db.prepare(`
      UPDATE manga_series 
      SET anilist_id = ?,
          mal_id = COALESCE(mal_id, ?),
          source_donnees = ?,
          user_id_ajout = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      mangaData.anilist_id,
      mangaData.mal_id,
      mangaData.source_donnees,
      ownerId,
      existingSerie.id
    );
    fieldChanges.push(...unprotectedChanges);

    if (userId) {
      upsertMangaUserStatus(db, existingSerie.id, userId, mangaData);
      unmaskSerieForUser(db, existingSerie.id, userId);
    }

    return { id: existingSerie.id, changes: fieldChanges };
  } else {
    // Créer une nouvelle série
    const result = db.prepare(`
      INSERT INTO manga_series (
        anilist_id, mal_id, titre, titre_romaji, titre_anglais, titre_natif,
        couverture_url, description, statut, statut_publication, annee_publication,
        genres, nb_volumes, nb_chapitres, media_type, type_volume, statut_lecture, source_donnees, user_id_ajout
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mangaData.anilist_id,
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
      mangaData.media_type,
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

    return { id: serieId, created: true };
  }
}

/**
 * Synchronise un anime avec la base de données
 */
async function syncAnimeSeries(db, currentUser, anilistEntry) {
  const animeData = transformAnimeData(anilistEntry);

  // Convertir le nom d'utilisateur en ID
  let userId = null;
  if (currentUser) {
    const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
    userId = user ? user.id : null;
  }

  // Vérifier si l'anime existe déjà
  // ÉTAPE 1 : Recherche par anilist_id
  let existingAnime = db.prepare('SELECT * FROM anime_series WHERE anilist_id = ?').get(animeData.anilist_id);

  // ÉTAPE 2 : Si pas trouvé par anilist_id, chercher par mal_id (si présent)
  if (!existingAnime && animeData.mal_id) {
    existingAnime = db.prepare('SELECT * FROM anime_series WHERE mal_id = ?').get(animeData.mal_id);
    if (existingAnime) {
      console.log(`✅ [AniList Sync] Anime trouvé par mal_id: "${animeData.titre}" → ID ${existingAnime.id}`);
      // Mettre à jour l'anilist_id de l'anime existant si il n'en a pas
      if (!existingAnime.anilist_id && animeData.anilist_id) {
        db.prepare('UPDATE anime_series SET anilist_id = ? WHERE id = ?').run(animeData.anilist_id, existingAnime.id);
        existingAnime.anilist_id = animeData.anilist_id;
        console.log(`✅ [AniList Sync] anilist_id ${animeData.anilist_id} ajouté à l'anime existant ID ${existingAnime.id}`);
      }
    }
  }

  if (existingAnime) {
    const ownerId = userId || existingAnime.user_id_ajout || null;

    // Récupérer les champs modifiés par l'utilisateur
    const userModifiedFields = existingAnime.user_modified_fields || null;

    const fieldChanges = [];
    const trackProtectedChange = (field, newValue) => {
      if (newValue === undefined) {
        return;
      }
      const currentValue = existingAnime[field];
      if ((currentValue ?? null) === (newValue ?? null)) {
        return;
      }
      if (updateFieldIfNotUserModified(db, 'anime_series', existingAnime.id, field, newValue, userModifiedFields)) {
        fieldChanges.push({
          field,
          before: currentValue ?? null,
          after: newValue ?? null
        });
        existingAnime[field] = newValue;
      }
    };

    // Mettre à jour l'anime existant en respectant les champs protégés
    trackProtectedChange('titre', animeData.titre);
    trackProtectedChange('titre_natif', animeData.titre_natif);
    trackProtectedChange('titre_romaji', animeData.titre_romaji);
    trackProtectedChange('couverture_url', animeData.couverture_url);
    trackProtectedChange('description', animeData.description);
    trackProtectedChange('statut_diffusion', animeData.statut_diffusion);
    trackProtectedChange('type', animeData.type);
    trackProtectedChange('annee', animeData.annee);
    trackProtectedChange('genres', animeData.genres);
    trackProtectedChange('studios', animeData.studios);
    trackProtectedChange('nb_episodes', animeData.nb_episodes);

    // Toujours mettre à jour ces champs (non protégés)
    const unprotectedChanges = [];
    if ((existingAnime.anilist_id ?? null) !== (animeData.anilist_id ?? null)) {
      unprotectedChanges.push({ field: 'anilist_id', before: existingAnime.anilist_id ?? null, after: animeData.anilist_id ?? null });
    }
    if (!existingAnime.mal_id && animeData.mal_id) {
      unprotectedChanges.push({ field: 'mal_id', before: existingAnime.mal_id ?? null, after: animeData.mal_id ?? null });
    }
    if ((existingAnime.source_import ?? null) !== (animeData.source_import ?? null)) {
      unprotectedChanges.push({ field: 'source_import', before: existingAnime.source_import ?? null, after: animeData.source_import ?? null });
    }
    if ((existingAnime.user_id_ajout ?? null) !== (ownerId ?? null)) {
      unprotectedChanges.push({ field: 'user_id_ajout', before: existingAnime.user_id_ajout ?? null, after: ownerId ?? null });
    }
    db.prepare(`
      UPDATE anime_series 
      SET anilist_id = ?,
          mal_id = COALESCE(mal_id, ?),
          source_import = ?,
          user_id_ajout = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      animeData.anilist_id,
      animeData.mal_id,
      animeData.source_import,
      ownerId,
      existingAnime.id
    );
    fieldChanges.push(...unprotectedChanges);

    return { id: existingAnime.id, changes: fieldChanges };
  } else {
    // Créer un nouvel anime
    const result = db.prepare(`
      INSERT INTO anime_series (
        anilist_id, mal_id, titre, titre_natif, titre_romaji, couverture_url, description,
        statut_diffusion, type, annee, genres, studios, nb_episodes, source_import, user_id_ajout
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      animeData.anilist_id,
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

    return { id: result.lastInsertRowid, created: true };
  }
}

module.exports = {
  syncMangaSeries,
  syncAnimeSeries
};
