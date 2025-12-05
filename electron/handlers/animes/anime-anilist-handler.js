/**
 * Handler pour ajouter un anime depuis AniList ID
 * Similaire à add-manga-by-anilist-id mais adapté aux animes
 */

const { getValidAccessToken } = require('../../services/anilist/anilist-token');
const { getAnimeById } = require('../../services/anilist/anilist-api');
const { transformAnimeData, cleanHtmlText, convertAniListFormatToAnimeType } = require('../../services/anilist/anilist-transformers');
const { findExistingAnimeUnified } = require('../../services/unified-matching-service');
const { prepareAnimeDataFromJikan, insertAnimeIntoDatabase } = require('./anime-helpers');
const { getUserIdByName } = require('./anime-helpers');
const Store = require('electron-store');

/**
 * Ajouter un anime par AniList ID ou URL
 */
async function handleAddAnimeByAnilistId(db, store, anilistIdOrUrl, options = {}, getDb, getPathManager) {
  const currentUser = store.get('currentUser', '');
  if (!currentUser) throw new Error('Aucun utilisateur connecté');

  const targetAnimeId = typeof options.targetSerieId === 'number' ? options.targetSerieId : null;
  const forceCreate = options.forceCreate === true;

  // Extraire l'AniList ID depuis l'URL si nécessaire
  let anilistId = anilistIdOrUrl;
  if (typeof anilistIdOrUrl === 'string' && anilistIdOrUrl.includes('anilist.co')) {
    const match = anilistIdOrUrl.match(/anime\/(\d+)/);
    if (!match) throw new Error('URL AniList invalide');
    anilistId = parseInt(match[1]);
  } else {
    anilistId = parseInt(anilistId);
  }

  if (isNaN(anilistId)) throw new Error('AniList ID invalide');

  // Vérifier si l'anime existe déjà
  let existingAnime = db.prepare('SELECT * FROM anime_series WHERE anilist_id = ?').get(anilistId);
  if (existingAnime) {
    if (targetAnimeId && existingAnime.id === targetAnimeId) {
      // OK, on met à jour cet anime
    } else if (!targetAnimeId) {
      return {
        success: false,
        error: `Cet anime existe déjà : ${existingAnime.titre}`,
        animeId: existingAnime.id
      };
    } else {
      return {
        success: false,
        error: `Cet anime existe déjà : ${existingAnime.titre}`,
        animeId: existingAnime.id
      };
    }
  }

  // Récupérer le token AniList
  const anilistStore = new Store();
  const accessToken = await getValidAccessToken(anilistStore);

  if (!accessToken) {
    throw new Error('Non connecté à AniList. Connectez-vous dans les paramètres.');
  }

  // Récupérer les données depuis AniList
  const anilistData = await getAnimeById(accessToken, anilistId);

  if (!anilistData) {
    throw new Error('Anime non trouvé sur AniList');
  }

  // Transformer les données AniList en format interne
  // transformAnimeData attend un format avec media, on crée un objet temporaire
  const tempEntry = { media: anilistData };
  const transformedData = transformAnimeData(tempEntry);

  // Préparer les données pour le matching unifié
  const sourceData = {
    titre: transformedData.titre,
    anilist_id: anilistId,
    mal_id: transformedData.mal_id,
    titre_romaji: transformedData.titre_romaji,
    titre_natif: transformedData.titre_natif,
    titre_anglais: transformedData.titre_anglais,
    titres_alternatifs: null // transformAnimeData ne retourne pas titres_alternatifs directement
  };

  // Utiliser le service de matching unifié
  const matchResult = findExistingAnimeUnified(
    db,
    sourceData,
    'anilist',
    transformedData.type
  );

  // Si un match a été trouvé (exact ou avec similarité >= 75%)
  if (matchResult && !forceCreate && !targetAnimeId) {
    if (matchResult.isExactMatch || matchResult.similarity >= 75) {
      return {
        success: false,
        requiresSelection: true,
        anilistId,
        candidates: [{
          id: matchResult.anime.id,
          titre: matchResult.anime.titre,
          type: matchResult.anime.type,
          source_donnees: matchResult.anime.source_import,
          statut: matchResult.anime.statut_diffusion,
          anilist_id: matchResult.anime.anilist_id,
          mal_id: matchResult.anime.mal_id,
          similarity: matchResult.similarity,
          isExactMatch: matchResult.isExactMatch,
          matchMethod: matchResult.matchMethod
        }]
      };
    }
  }

  let animeToUpdate = null;
  let matchResultFinal = null;
  
  if (targetAnimeId) {
    animeToUpdate = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(targetAnimeId);
    if (!animeToUpdate) {
      return {
        success: false,
        error: 'Anime sélectionné introuvable'
      };
    }

    if (animeToUpdate.anilist_id && animeToUpdate.anilist_id !== anilistId) {
      return {
        success: false,
        error: `Cet anime est déjà lié à l'AniList ID ${animeToUpdate.anilist_id}`,
        animeId: animeToUpdate.id
      };
    }
    
    matchResultFinal = {
      anime: animeToUpdate,
      isExactMatch: true,
      similarity: 100,
      matchMethod: 'user_selection'
    };
  } else if (matchResult) {
    matchResultFinal = matchResult;
  }

  if (animeToUpdate || matchResultFinal) {
    existingAnime = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(
      (animeToUpdate || matchResultFinal.anime).id
    );
  }

  // Récupérer l'utilisateur
  const userId = getUserIdByName(db, currentUser);
  if (!userId) {
    throw new Error('Utilisateur non trouvé');
  }

  // Préparer les données de l'anime
  const animeData = {
    anilist_id: anilistId,
    mal_id: transformedData.mal_id || null,
    titre: transformedData.titre,
    titre_natif: transformedData.titre_natif,
    titre_romaji: transformedData.titre_romaji,
    titre_anglais: null, // transformAnimeData ne retourne pas titre_anglais directement
    couverture_url: transformedData.couverture_url,
    description: transformedData.description,
    statut_diffusion: transformedData.statut_diffusion,
    type: transformedData.type,
    annee: transformedData.annee,
    genres: transformedData.genres,
    studios: transformedData.studios,
    nb_episodes: transformedData.nb_episodes || 0,
    source_import: 'anilist',
    user_id_ajout: userId
  };

  // Télécharger la couverture si disponible
  if (animeData.couverture_url && getPathManager) {
    try {
      const coverManager = require('../../services/cover/cover-manager');
      const pm = getPathManager();
      if (pm) {
        const coverResult = await coverManager.downloadCover(
          pm,
          animeData.couverture_url,
          animeData.titre,
          'anime',
          null,
          {
            mediaType: animeData.type
          }
        );
        if (coverResult && coverResult.success && coverResult.localPath) {
          animeData.couverture_url = coverResult.localPath;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Erreur téléchargement couverture AniList: ${error.message}`);
    }
  }

  let finalAnime;
  let animeId;

  if (existingAnime) {
    // Mettre à jour l'anime existant
    const updateFields = [];
    const updateValues = [];

    if (animeData.mal_id && !existingAnime.mal_id) {
      updateFields.push('mal_id = ?');
      updateValues.push(animeData.mal_id);
    }
    if (animeData.anilist_id && !existingAnime.anilist_id) {
      updateFields.push('anilist_id = ?');
      updateValues.push(animeData.anilist_id);
    }
    if (animeData.couverture_url && !existingAnime.couverture_url) {
      updateFields.push('couverture_url = ?');
      updateValues.push(animeData.couverture_url);
    }
    if (animeData.description && !existingAnime.description) {
      updateFields.push('description = ?');
      updateValues.push(animeData.description);
    }
    if (animeData.genres && !existingAnime.genres) {
      updateFields.push('genres = ?');
      updateValues.push(animeData.genres);
    }
    if (animeData.studios && !existingAnime.studios) {
      updateFields.push('studios = ?');
      updateValues.push(animeData.studios);
    }
    if (animeData.nb_episodes !== null && existingAnime.nb_episodes === null) {
      updateFields.push('nb_episodes = ?');
      updateValues.push(animeData.nb_episodes);
    }
    if (animeData.type && !existingAnime.type) {
      updateFields.push('type = ?');
      updateValues.push(animeData.type);
    }

    if (updateFields.length > 0) {
      updateValues.push(existingAnime.id);
      const updateQuery = `UPDATE anime_series SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      db.prepare(updateQuery).run(...updateValues);
    }

    finalAnime = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(existingAnime.id);
    animeId = existingAnime.id;

    // Si un mal_id a été ajouté et qu'il n'existait pas avant, lancer l'enrichissement automatique avec Jikan
    if (animeData.mal_id && !existingAnime.mal_id) {
      try {
        const { enrichAnime } = require('../../services/animes/anime-enrichment-queue');
        const enrichmentConfig = store.get('animeEnrichmentConfig', {
          enabled: true,
          autoTranslate: false,
          imageSource: 'anilist',
          fields: {}
        });
        
        if (enrichmentConfig.enabled) {
          console.log(`🔄 [AniList Import] Lancement enrichissement automatique pour MAL ID ${animeData.mal_id}...`);
          // Lancer l'enrichissement en arrière-plan (ne pas bloquer la réponse)
          enrichAnime(
            getDb,
            finalAnime.id,
            animeData.mal_id,
            currentUser,
            enrichmentConfig,
            null,
            false
          ).catch(error => {
            console.error(`❌ [AniList Import] Erreur enrichissement automatique: ${error.message}`);
          });
        }
      } catch (error) {
        console.error(`❌ [AniList Import] Erreur lancement enrichissement: ${error.message}`);
        // Ne pas bloquer le retour si l'enrichissement échoue
      }
    }
  } else {
    // Créer un nouvel anime
    animeId = insertAnimeIntoDatabase(db, animeData);
    finalAnime = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(animeId);
    
    // Si un mal_id est disponible, lancer l'enrichissement automatique
    if (animeData.mal_id) {
      try {
        const { enrichAnime } = require('../../services/animes/anime-enrichment-queue');
        const enrichmentConfig = store.get('animeEnrichmentConfig', {
          enabled: true,
          autoTranslate: false,
          imageSource: 'anilist',
          fields: {}
        });
        
        if (enrichmentConfig.enabled) {
          console.log(`🔄 [AniList Import] Lancement enrichissement automatique pour MAL ID ${animeData.mal_id}...`);
          enrichAnime(
            getDb,
            animeId,
            animeData.mal_id,
            currentUser,
            enrichmentConfig,
            null,
            false
          ).catch(error => {
            console.error(`❌ [AniList Import] Erreur enrichissement automatique: ${error.message}`);
          });
        }
      } catch (error) {
        console.error(`❌ [AniList Import] Erreur lancement enrichissement: ${error.message}`);
      }
    }
  }

  return {
    success: true,
    animeId: animeId,
    anime: finalAnime
  };
}

module.exports = { handleAddAnimeByAnilistId };
