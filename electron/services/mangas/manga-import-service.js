/**
 * Service d'import de manga depuis Nautiljon
 * Orchestration principale de l'import (création/mise à jour de séries et tomes)
 * Utilisé par les routes HTTP (import-routes.js) et les handlers IPC
 */

const { parseRequestBody, sendErrorResponse, sendSuccessResponse, validateDbAndUser, notifyImportComplete } = require('../import-server-common');
const coverManager = require('../cover/cover-manager');
const { parseNautiljonData } = require('./manga-import-parser');
const { findExistingSerie } = require('./manga-import-matcher');
const { findExistingSerieUnified } = require('../unified-matching-service');
const { mergeSerieData, prepareNewSerieData } = require('./manga-import-merger');
const { createVolumes, updateOrCreateVolumes } = require('./manga-import-volumes');
const { setExclusiveSerieOwnership, setExclusiveSerieUserStatus } = require('../../handlers/mangas/manga-helpers');
const { recordExtractedData } = require('../../utils/sync-error-reporter');

/**
 * Fonction principale d'import de manga depuis Nautiljon
 * Peut être appelée depuis une route HTTP ou directement depuis un handler IPC
 */
async function handleImportManga(req, res, getDb, store, mainWindow, getPathManager) {
  try {
    const body = await parseRequestBody(req);
    const rawMangaData = JSON.parse(body);

    recordExtractedData({
      entityType: 'manga',
      entityId: rawMangaData.id || rawMangaData.titre || `payload-${Date.now()}`,
      data: rawMangaData
    });

    // Parser et valider les données
    const mangaData = parseNautiljonData(rawMangaData);
    console.log(`📦 [IMPORT] Volumes reçus: ${mangaData.volumes ? mangaData.volumes.length : 0} volume(s)`);
    if (mangaData.volumes && mangaData.volumes.length > 0) {
      console.log(`📦 [IMPORT] Exemple de volume:`, JSON.stringify(mangaData.volumes[0], null, 2));
    }
    const { db, currentUser } = validateDbAndUser(getDb, store);

    // Vérifier si l'utilisateur a forcé la création ou confirmé une fusion
    const forceCreate = rawMangaData._forceCreate === true;
    const confirmMerge = rawMangaData._confirmMerge === true;
    const targetSerieId = typeof rawMangaData._targetSerieId === 'number' ? rawMangaData._targetSerieId : null;

    // Préparer les données pour le matching unifié
    const sourceDataForMatching = {
      titre: mangaData.titre,
      mal_id: mangaData.mal_id || null,
      titre_romaji: mangaData.titre_vo || null,
      titre_natif: mangaData.titre_natif || null,
      titre_anglais: null,
      titres_alternatifs: mangaData.titres_alternatifs || null
    };
    
    // Déterminer le type de média attendu
    const normalizeMediaType = (type) => {
      if (!type) return null;
      const lower = String(type).toLowerCase();
      if (lower.includes('light novel') || lower.includes('novel')) return 'light novel';
      if (lower.includes('manhwa')) return 'manhwa';
      if (lower.includes('manhua')) return 'manhua';
      if (lower.includes('manga')) return 'manga';
      return lower;
    };
    
    const expectedMediaType = normalizeMediaType(mangaData.media_type || mangaData.type_volume);
    
    // Chercher série existante avec le service de matching unifié (sauf si forceCreate)
    let matchResult = null;
    let existingSerieId = null;
    let matchMethod = null;
    
    if (!forceCreate) {
      try {
        matchResult = findExistingSerieUnified(
          db,
          sourceDataForMatching,
          'nautiljon',
          expectedMediaType
        );
        
        if (matchResult) {
          existingSerieId = matchResult.serie.id;
          matchMethod = matchResult.matchMethod;
        }
      } catch (error) {
        console.warn(`⚠️ Erreur recherche unifiée pour "${mangaData.titre}":`, error.message);
        // Fallback sur l'ancienne méthode si erreur
        matchResult = findExistingSerie(db, mangaData);
        if (matchResult) {
          existingSerieId = matchResult.serie.id;
          matchMethod = 'title_normalized_legacy';
        }
      }
    }
    
    let serieId;
    let mergedData = null;
    let newSerieData = null;
    let isUpdate = false;

    if (matchResult && !forceCreate) {
      isUpdate = true;
      const existingSerie = matchResult.serie;
      
      // Si c'est un match strict (>=75%) mais pas exact, et pas de confirmation, proposer à l'utilisateur
      if (!matchResult.isExactMatch && matchResult.similarity >= 75 && !confirmMerge && !targetSerieId) {
        // Retourner une réponse pour proposer un overlay de sélection
        // Format compatible avec MAL (array candidates) et Tampermonkey (candidate singulier)
        return sendSuccessResponse(res, {
          requiresSelection: true,
          candidates: [{
            id: existingSerie.id,
            titre: existingSerie.titre,
            source_donnees: existingSerie.source_donnees,
            media_type: existingSerie.media_type,
            type_volume: existingSerie.type_volume,
            statut: existingSerie.statut,
            mal_id: existingSerie.mal_id,
            similarity: matchResult.similarity,
            matchedTitle: matchResult.matchedTitle || existingSerie.titre,
            matchMethod: matchResult.matchMethod
          }],
          // Format legacy pour Tampermonkey (backward compatibility)
          candidate: {
            id: existingSerie.id,
            titre: existingSerie.titre,
            source_donnees: existingSerie.source_donnees,
            similarity: matchResult.similarity,
            matchedTitle: matchResult.matchedTitle || existingSerie.titre,
            matchMethod: matchResult.matchMethod
          },
          newMangaData: {
            titre: mangaData.titre,
            titre_vo: mangaData.titre_vo,
            titre_natif: mangaData.titre_natif
          }
        });
      }
      
      // Si targetSerieId est fourni, utiliser cette série
      if (targetSerieId) {
        const targetSerie = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(targetSerieId);
        if (!targetSerie) {
          return sendErrorResponse(res, 404, 'Série cible introuvable');
        }
        serieId = targetSerieId;
        existingSerieId = targetSerieId;
        matchMethod = 'user_selection';
      } else {
        serieId = existingSerie.id;
        existingSerieId = existingSerie.id;
      }
 
      const fullSerie = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(serieId);
      const newSource = fullSerie.source_donnees && fullSerie.source_donnees.includes('mal')
                      ? 'mal+nautiljon'
                      : 'nautiljon';

      const currentData = fullSerie;
      mergedData = mergeSerieData(currentData, mangaData);
      
      // Récupérer les champs modifiés par l'utilisateur
      const userModifiedFields = fullSerie.user_modified_fields || null;
      
      // Utiliser updateFieldIfNotUserModified pour respecter les champs protégés
      const { updateFieldIfNotUserModified } = require('../../utils/enrichment-helpers');
      
      // Détecter les changements critiques pour signaler une mise à jour
      const currentNbVolumes = currentData.nb_volumes || 0;
      const newNbVolumes = mergedData.nb_volumes || currentNbVolumes;
      const nbVolumesChanged = newNbVolumes > currentNbVolumes;
      
      const currentNbChapitres = currentData.nb_chapitres || 0;
      const newNbChapitres = mergedData.nb_chapitres || currentNbChapitres;
      const nbChapitresChanged = newNbChapitres > currentNbChapitres;
      
      const currentStatutPublication = currentData.statut_publication || '';
      const newStatutPublication = mergedData.statut_publication || currentStatutPublication;
      const statutPublicationChanged = newStatutPublication && newStatutPublication !== currentStatutPublication;
      
      const currentStatutPublicationVf = currentData.statut_publication_vf || '';
      const newStatutPublicationVf = mergedData.statut_publication_vf || currentStatutPublicationVf;
      const statutPublicationVfChanged = newStatutPublicationVf && newStatutPublicationVf !== currentStatutPublicationVf;
      
      const currentNbVolumesVf = currentData.nb_volumes_vf || 0;
      const newNbVolumesVf = mergedData.nb_volumes_vf || currentNbVolumesVf;
      const nbVolumesVfChanged = newNbVolumesVf > currentNbVolumesVf;
      
      const currentNbChapitresVf = currentData.nb_chapitres_vf || 0;
      const newNbChapitresVf = mergedData.nb_chapitres_vf || currentNbChapitresVf;
      const nbChapitresVfChanged = newNbChapitresVf > currentNbChapitresVf;
      
      // Seuls ces changements déclenchent une notification de mise à jour
      const shouldSignalUpdate = nbVolumesChanged || nbChapitresChanged || statutPublicationChanged || 
                                  statutPublicationVfChanged || nbVolumesVfChanged || nbChapitresVfChanged;
      
      // Récupérer la valeur actuelle de maj_disponible
      const currentMajDisponible = currentData.maj_disponible || 0;
      const majDisponibleValue = shouldSignalUpdate ? 1 : currentMajDisponible;
      
      if (nbVolumesChanged) {
        console.log(`  ✅ Nombre de volumes augmenté: ${currentNbVolumes} → ${newNbVolumes} (mise à jour signalée)`);
      }
      if (nbChapitresChanged) {
        console.log(`  ✅ Nombre de chapitres augmenté: ${currentNbChapitres} → ${newNbChapitres} (mise à jour signalée)`);
      }
      if (statutPublicationChanged) {
        console.log(`  ✅ Statut de publication changé: ${currentStatutPublication || 'Aucun'} → ${newStatutPublication} (mise à jour signalée)`);
      }
      if (statutPublicationVfChanged) {
        console.log(`  ✅ Statut de publication VF changé: ${currentStatutPublicationVf || 'Aucun'} → ${newStatutPublicationVf} (mise à jour signalée)`);
      }
      if (nbVolumesVfChanged) {
        console.log(`  ✅ Nombre de volumes VF augmenté: ${currentNbVolumesVf} → ${newNbVolumesVf} (mise à jour signalée)`);
      }
      if (nbChapitresVfChanged) {
        console.log(`  ✅ Nombre de chapitres VF augmenté: ${currentNbChapitresVf} → ${newNbChapitresVf} (mise à jour signalée)`);
      }
      
      // Mettre à jour chaque champ en respectant la protection
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'titre', mergedData.titre, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'titre_romaji', mergedData.titre_vo || currentData.titre_romaji, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'titre_natif', mergedData.titre_natif || currentData.titre_natif, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'titres_alternatifs', mergedData.titres_alternatifs || currentData.titres_alternatifs, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'type_volume', mergedData.type_volume, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'type_contenu', mergedData.type_contenu, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'couverture_url', mergedData.couverture_url, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'description', mergedData.description, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'statut_publication', mergedData.statut_publication, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'statut_publication_vf', mergedData.statut_publication_vf, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'annee_publication', mergedData.annee_publication || currentData.annee_publication, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'annee_vf', mergedData.annee_vf, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'genres', mergedData.genres, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'nb_volumes', mergedData.nb_volumes || currentData.nb_volumes, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'nb_volumes_vf', mergedData.nb_volumes_vf, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'nb_chapitres', mergedData.nb_chapitres, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'nb_chapitres_vf', mergedData.nb_chapitres_vf, userModifiedFields);
      
      // Mettre à jour maj_disponible et derniere_verif
      db.prepare(`
        UPDATE manga_series
        SET maj_disponible = ?,
            derniere_verif = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(majDisponibleValue, serieId);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'editeur', mergedData.editeur, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'editeur_vo', mergedData.editeur_vo, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'rating', mergedData.rating, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'langue_originale', mergedData.langue_originale, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'demographie', mergedData.demographie, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'themes', mergedData.themes, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'auteurs', mergedData.auteurs, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'serialization', mergedData.serialization, userModifiedFields);
      updateFieldIfNotUserModified(db, 'manga_series', serieId, 'media_type', mergedData.media_type, userModifiedFields);
      
      // Toujours mettre à jour titre_alternatif (NULL), source_donnees et updated_at
      db.prepare(`
        UPDATE manga_series 
        SET titre_alternatif = NULL,
            source_donnees = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(newSource, serieId);

      // Enregistrer l'URL source Nautiljon directement dans le champ dédié
      const nautiljonUrl = mangaData.nautiljon_url || mangaData._url || null;
      if (nautiljonUrl) {
        console.log(`🔗 Stockage URL Nautiljon pour série ${serieId}: ${nautiljonUrl}`);
        db.prepare('UPDATE manga_series SET nautiljon_url = ? WHERE id = ?').run(nautiljonUrl, serieId);
      }
    } else {
      // CRÉATION
      newSerieData = prepareNewSerieData(mangaData);

      // Préparer l'URL Nautiljon
      const nautiljonUrlForInsert = mangaData.nautiljon_url || mangaData._url || null;
      if (nautiljonUrlForInsert) {
        console.log(`🔗 Création série avec URL Nautiljon: ${nautiljonUrlForInsert}`);
      }

      const stmt = db.prepare(`
        INSERT INTO manga_series (
          titre, titre_alternatif, titre_romaji, titre_natif, titres_alternatifs, statut, type_volume, type_contenu, couverture_url, description,
          statut_publication, statut_publication_vf, annee_publication, annee_vf,
          genres, nb_volumes, nb_volumes_vf, nb_chapitres, nb_chapitres_vf,
          langue_originale, demographie, editeur, rating, source_donnees, themes, auteurs, editeur_vo, serialization, media_type, nautiljon_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        newSerieData.titre,
        null, // titre_alternatif toujours null maintenant
        newSerieData.titre_vo,
        newSerieData.titre_natif,
        newSerieData.titres_alternatifs,
        newSerieData.statut,
        newSerieData.type_volume,
        newSerieData.type_contenu,
        newSerieData.couverture_url,
        newSerieData.description,
        newSerieData.statut_publication,
        newSerieData.statut_publication_vf,
        newSerieData.annee_publication,
        newSerieData.annee_vf,
        newSerieData.genres,
        newSerieData.nb_volumes,
        newSerieData.nb_volumes_vf,
        newSerieData.nb_chapitres,
        newSerieData.nb_chapitres_vf,
        newSerieData.langue_originale,
        newSerieData.demographie,
        newSerieData.editeur,
        newSerieData.rating,
        'nautiljon',
        newSerieData.themes,
        newSerieData.auteurs,
        newSerieData.editeur_vo,
        newSerieData.serialization,
        newSerieData.media_type,
        nautiljonUrlForInsert
      );

      serieId = result.lastInsertRowid;
    }

    // Créer les tomes automatiquement
    const pm = getPathManager();
    const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
    if (!user) {
      throw new Error(`Utilisateur "${currentUser}" introuvable dans la BDD`);
    }
    
    let tomesCreated = 0;
    let volumesIgnored = 0;
    
    const mediaCategoryForVolumes =
      (typeof mergedData !== 'undefined' && mergedData?.media_type) ||
      (typeof newSerieData !== 'undefined' && newSerieData?.media_type) ||
      mangaData.media_type ||
      mangaData.type_volume ||
      null;

    if (mangaData.volumes && mangaData.volumes.length > 0) {
      console.log(`📚 [IMPORT] ${isUpdate ? 'Mise à jour/création' : 'Création'} de ${mangaData.volumes.length} tome(s) pour série ID ${serieId}`);
      
      let result;
      if (isUpdate) {
        // Lors d'une mise à jour, utiliser updateOrCreateVolumes pour créer les nouveaux ET mettre à jour les existants
        const tomesUpdated = await updateOrCreateVolumes(
          db,
          pm,
          mangaData.volumes,
          serieId,
          mangaData.titre,
          user.id,
          {
            mediaType: mediaCategoryForVolumes,
            typeVolume: mangaData.type_volume,
            autoDownloadCovers: store.get('autoDownloadCovers', false) === true
          }
        );
        tomesCreated = tomesUpdated;
        volumesIgnored = 0; // updateOrCreateVolumes filtre déjà les volumes sans date
        console.log(`✅ [IMPORT] Résultat mise à jour tomes: ${tomesCreated} tome(s) mis à jour/créé(s)`);
      } else {
        // Lors d'une création, utiliser createVolumes
        result = await createVolumes(
          db,
          pm,
          mangaData.volumes,
          serieId,
          mangaData.titre,
          user.id,
          {
            mediaType: mediaCategoryForVolumes,
            typeVolume: mangaData.type_volume,
            autoDownloadCovers: store.get('autoDownloadCovers', false) === true,
            exclusiveOwner: false // Ne pas marquer automatiquement la possession lors de l'import Nautiljon
          }
        );
        tomesCreated = result.created;
        volumesIgnored = result.ignored;
        console.log(`✅ [IMPORT] Résultat création tomes: ${tomesCreated} créé(s), ${volumesIgnored} ignoré(s), ${result.skipped || 0} skip(s)`);
      }
    } else {
      console.log(`⚠️ [IMPORT] Aucun volume à créer (volumes: ${mangaData.volumes ? 'array vide' : 'undefined/null'})`);
    }

    // Ne pas marquer automatiquement la possession des tomes lors de l'import Nautiljon
    // La possession sera gérée manuellement par l'utilisateur ou automatiquement si date_achat est renseignée
    // setExclusiveSerieOwnership(db, serieId, user.id);
    
    // Mettre à jour uniquement le statut utilisateur (sans forcer la possession des tomes)
    setExclusiveSerieUserStatus(db, serieId, user.id);

    // Notifier l'UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('manga-imported', {
        id: serieId,
        titre: mangaData.titre,
        tomesCreated: tomesCreated
      });
    }

    notifyImportComplete(mainWindow);
    
    const successMessage = volumesIgnored > 0 
      ? `Série "${mangaData.titre}" ajoutée avec ${tomesCreated} tome(s) (${volumesIgnored} ignoré(s) sans date VF)`
      : `Série "${mangaData.titre}" ajoutée avec ${tomesCreated} tome(s) !`;
    
    sendSuccessResponse(res, {
      id: serieId,
      tomesCreated: tomesCreated,
      volumesIgnored: volumesIgnored,
      message: successMessage
    });

  } catch (error) {
    console.error('❌ Erreur import-manga:', error);
    notifyImportComplete(mainWindow);
    sendErrorResponse(res, 500, error.message);
  }
}

/**
 * Importe une série depuis des données Nautiljon (appel direct, sans requête HTTP)
 * @param {Database} db - Instance de la base de données
 * @param {Object} rawMangaData - Données extraites de Nautiljon
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Store} store - Instance d'electron-store
 * @param {boolean} includeTomes - Si true, met à jour/crée les tomes
 * @returns {Promise<Object>} - Résultat de l'import
 */
async function handleNautiljonImport(db, rawMangaData, getPathManager, store, includeTomes = true) {
  const currentUser = store.get('currentUser', '');
  if (!currentUser) {
    throw new Error('Aucun utilisateur connecté');
  }

  // Parser et valider les données
  const mangaData = parseNautiljonData(rawMangaData);

  // Chercher série existante avec normalisation
  const matchResult = findExistingSerie(db, mangaData);
  
  if (!matchResult) {
    throw new Error('Import depuis URL Nautiljon: fonctionnalité de création non implémentée. Utilisez le script Tampermonkey pour créer une nouvelle série.');
  }

  const existingSerie = matchResult.serie;
  
  // Si c'est un match strict (99%) mais pas exact, on fusionne quand même (synchronisation automatique)
  // L'utilisateur peut toujours annuler si ce n'est pas la bonne série
  
  // MISE À JOUR
  const serieId = existingSerie.id;
  const fullSerie = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(serieId);
  const newSource = fullSerie.source_donnees && fullSerie.source_donnees.includes('mal')
                  ? 'mal+nautiljon'
                  : 'nautiljon';
  
  const currentData = fullSerie;
  const mergedData = mergeSerieData(currentData, mangaData);
  
  // Détecter les changements critiques pour signaler une mise à jour
  const currentNbVolumes = fullSerie.nb_volumes || 0;
  const newNbVolumes = mergedData.nb_volumes || currentNbVolumes;
  const nbVolumesChanged = newNbVolumes > currentNbVolumes;
  
  const currentNbChapitres = fullSerie.nb_chapitres || 0;
  const newNbChapitres = mergedData.nb_chapitres || currentNbChapitres;
  const nbChapitresChanged = newNbChapitres > currentNbChapitres;
  
  const currentStatutPublication = fullSerie.statut_publication || '';
  const newStatutPublication = mergedData.statut_publication || currentStatutPublication;
  const statutPublicationChanged = newStatutPublication && newStatutPublication !== currentStatutPublication;
  
  const currentStatutPublicationVf = fullSerie.statut_publication_vf || '';
  const newStatutPublicationVf = mergedData.statut_publication_vf || currentStatutPublicationVf;
  const statutPublicationVfChanged = newStatutPublicationVf && newStatutPublicationVf !== currentStatutPublicationVf;
  
  const currentNbVolumesVf = fullSerie.nb_volumes_vf || 0;
  const newNbVolumesVf = mergedData.nb_volumes_vf || currentNbVolumesVf;
  const nbVolumesVfChanged = newNbVolumesVf > currentNbVolumesVf;
  
  const currentNbChapitresVf = fullSerie.nb_chapitres_vf || 0;
  const newNbChapitresVf = mergedData.nb_chapitres_vf || currentNbChapitresVf;
  const nbChapitresVfChanged = newNbChapitresVf > currentNbChapitresVf;
  
  // Seuls ces changements déclenchent une notification de mise à jour
  const shouldSignalUpdate = nbVolumesChanged || nbChapitresChanged || statutPublicationChanged || 
                              statutPublicationVfChanged || nbVolumesVfChanged || nbChapitresVfChanged;
  
  // Récupérer la valeur actuelle de maj_disponible
  const currentMajDisponible = fullSerie.maj_disponible || 0;
  const majDisponibleValue = shouldSignalUpdate ? 1 : currentMajDisponible;
  
  if (nbVolumesChanged) {
    console.log(`  ✅ Nombre de volumes augmenté: ${currentNbVolumes} → ${newNbVolumes} (mise à jour signalée)`);
  }
  if (nbChapitresChanged) {
    console.log(`  ✅ Nombre de chapitres augmenté: ${currentNbChapitres} → ${newNbChapitres} (mise à jour signalée)`);
  }
  if (statutPublicationChanged) {
    console.log(`  ✅ Statut de publication changé: ${currentStatutPublication || 'Aucun'} → ${newStatutPublication} (mise à jour signalée)`);
  }
  if (statutPublicationVfChanged) {
    console.log(`  ✅ Statut de publication VF changé: ${currentStatutPublicationVf || 'Aucun'} → ${newStatutPublicationVf} (mise à jour signalée)`);
  }
  if (nbVolumesVfChanged) {
    console.log(`  ✅ Nombre de volumes VF augmenté: ${currentNbVolumesVf} → ${newNbVolumesVf} (mise à jour signalée)`);
  }
  if (nbChapitresVfChanged) {
    console.log(`  ✅ Nombre de chapitres VF augmenté: ${currentNbChapitresVf} → ${newNbChapitresVf} (mise à jour signalée)`);
  }
  
  // Récupérer les champs modifiés par l'utilisateur
  const userModifiedFields = fullSerie.user_modified_fields || null;
  
  // Utiliser updateFieldIfNotUserModified pour respecter les champs protégés
  const { updateFieldIfNotUserModified } = require('../../utils/enrichment-helpers');
  
  // Mettre à jour chaque champ en respectant la protection
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'titre', mergedData.titre, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'titre_romaji', mergedData.titre_vo || currentData.titre_romaji, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'titre_natif', mergedData.titre_natif || currentData.titre_natif, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'titres_alternatifs', mergedData.titres_alternatifs || currentData.titres_alternatifs, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'type_volume', mergedData.type_volume, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'type_contenu', mergedData.type_contenu, userModifiedFields);
  
  // Ne pas remplacer une couverture locale par une URL Nautiljon
  // La couverture sera téléchargée plus tard si autoDownload est activé
  const currentCover = currentData.couverture_url || '';
  const isLocalCover = currentCover && !currentCover.includes('://') && !currentCover.startsWith('data:');
  const newCoverUrl = mergedData.couverture_url || '';
  const isNewCoverUrl = newCoverUrl && (newCoverUrl.includes('://') || newCoverUrl.startsWith('data:'));
  
  // Ne mettre à jour la couverture que si :
  // - Ce n'est pas une URL qui remplace une couverture locale
  // - Ou si la couverture actuelle est déjà une URL/vide
  if (!(isLocalCover && isNewCoverUrl)) {
    updateFieldIfNotUserModified(db, 'manga_series', serieId, 'couverture_url', mergedData.couverture_url, userModifiedFields);
  }
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'description', mergedData.description, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'statut_publication', mergedData.statut_publication, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'statut_publication_vf', mergedData.statut_publication_vf, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'annee_publication', mergedData.annee_publication || currentData.annee_publication, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'annee_vf', mergedData.annee_vf, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'genres', mergedData.genres, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'nb_volumes', mergedData.nb_volumes || currentData.nb_volumes, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'nb_volumes_vf', mergedData.nb_volumes_vf, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'nb_chapitres', mergedData.nb_chapitres, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'nb_chapitres_vf', mergedData.nb_chapitres_vf, userModifiedFields);
  
  // Mettre à jour maj_disponible et derniere_verif
  db.prepare(`
    UPDATE manga_series
    SET maj_disponible = ?,
        derniere_verif = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(majDisponibleValue, serieId);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'editeur', mergedData.editeur, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'editeur_vo', mergedData.editeur_vo, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'rating', mergedData.rating, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'langue_originale', mergedData.langue_originale, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'demographie', mergedData.demographie, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'themes', mergedData.themes, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'auteurs', mergedData.auteurs, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'serialization', mergedData.serialization, userModifiedFields);
  updateFieldIfNotUserModified(db, 'manga_series', serieId, 'media_type', mergedData.media_type, userModifiedFields);
  
  // Toujours mettre à jour titre_alternatif (NULL), source_donnees et updated_at
  db.prepare(`
    UPDATE manga_series 
    SET titre_alternatif = NULL,
        source_donnees = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(newSource, serieId);

  // Enregistrer l'URL source Nautiljon directement dans le champ dédié
  const nautiljonUrl = mangaData.nautiljon_url || mangaData._url || null;
  if (nautiljonUrl) {
    console.log(`🔗 Stockage URL Nautiljon pour série ${serieId} (import tomes): ${nautiljonUrl}`);
    db.prepare('UPDATE manga_series SET nautiljon_url = ? WHERE id = ?').run(nautiljonUrl, serieId);
  }

  // Télécharger/mettre à jour la couverture VF
  const pm = getPathManager();
  const autoDownload = store.get('autoDownloadCovers', false) === true;
  if (autoDownload && mangaData.couverture_url && pm) {
    try {
      // Protection: ne pas écraser une image locale existante ni un champ protégé par l'utilisateur
      const serieRow = db.prepare('SELECT couverture_url, user_modified_fields FROM manga_series WHERE id = ?').get(serieId);
      const currentCover = serieRow?.couverture_url || '';
      const userModified = serieRow?.user_modified_fields || null;
      const { isFieldUserModified } = require('../../utils/enrichment-helpers');

      const isLocalCover = currentCover && !currentCover.includes('://') && !currentCover.startsWith('data:');
      const isUserProtected = isFieldUserModified(userModified, 'couverture_url');

      if (!isLocalCover && !isUserProtected) {
        const coverResult = await coverManager.downloadCover(
          pm,
          mangaData.couverture_url,
          mergedData.titre || currentData.titre,
          'serie',
          serieId,
          {
            mediaType: mergedData.media_type || currentData.media_type,
            typeVolume: mergedData.type_volume || currentData.type_volume
          }
        );
        if (coverResult.success && coverResult.localPath) {
          db.prepare(`UPDATE manga_series SET couverture_url = ?, source_donnees = ?, updated_at = datetime('now') WHERE id = ?`)
            .run(coverResult.localPath, newSource, serieId);
        }
      } else {
        // Skip remplacement de la couverture: image locale existante ou champ protégé
      }
    } catch (error) {
      console.error('❌ Erreur téléchargement couverture:', error);
    }
  }

  // Mettre à jour les tomes si disponibles et si demandé
  let tomesUpdated = 0;
  if (includeTomes && mangaData.volumes && mangaData.volumes.length > 0) {
    const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
    if (!user) {
      throw new Error(`Utilisateur "${currentUser}" introuvable dans la BDD`);
    }
    
    tomesUpdated = await updateOrCreateVolumes(
      db,
      pm,
      mangaData.volumes,
      serieId,
      mergedData.titre || currentData.titre,
      user.id,
      {
        mediaType: mergedData.media_type || currentData.media_type,
        typeVolume: mergedData.type_volume || currentData.type_volume,
        autoDownloadCovers: store.get('autoDownloadCovers', false) === true,
        exclusiveOwner: true
      }
    );
  }

  const updatedSerie = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(serieId);
  return {
    serie: updatedSerie,
    isUpdate: true,
    tomesUpdated
  };
}

module.exports = {
  handleImportManga,
  handleNautiljonImport
};
