const { renameSerieFolder, renameSerieCover } = require('../../services/cover/cover-manager');
const { getSerieTitle } = require('./manga-helpers');
const { getUserIdByName } = require('../common-helpers');
const { markFieldAsUserModified } = require('../../utils/enrichment-helpers');

/**
 * Met à jour une série
 */
function handleUpdateSerie(db, getPathManager, store, id, serie) {
  // Si le titre change, renommer le dossier
  if (serie.titre !== undefined) {
    const currentTitle = getSerieTitle(db, id);
    if (currentTitle && currentTitle !== serie.titre) {
      const pm = getPathManager();
      if (pm) renameSerieFolder(db, pm, currentTitle, serie.titre, id);
    }
  }
  
  // Si la couverture change, la renommer en cover.ext
  if (serie.couverture_url !== undefined && serie.couverture_url) {
    const currentTitle = getSerieTitle(db, id);
    if (currentTitle) {
      const pm = getPathManager();
      if (pm) serie.couverture_url = renameSerieCover(pm, serie.couverture_url, currentTitle);
    }
  }
  
  // Construction dynamique de la requête pour mise à jour partielle
  const fields = [];
  const values = [];
  
  // Liste des champs qui doivent être marqués comme modifiés par l'utilisateur
  // (exclure les champs de progression qui peuvent être mis à jour automatiquement)
  const fieldsToMarkAsUserModified = new Set([
    'titre', 'statut', 'type_volume', 'couverture_url', 'description',
    'statut_publication', 'statut_publication_vf', 'annee_publication', 'annee_vf',
    'genres', 'nb_volumes', 'nb_volumes_vf', 'nb_chapitres', 'nb_chapitres_vf',
    'langue_originale', 'demographie', 'editeur', 'editeur_vo', 'rating',
    'themes', 'serialization', 'auteurs', 'titre_romaji', 'titre_natif',
    'titre_anglais', 'titres_alternatifs', 'media_type', 'date_debut', 'date_fin',
    'score_mal', 'rank_mal', 'popularity_mal', 'background', 'prequel_mal_id',
    'sequel_mal_id', 'mal_id'
  ]);
  
  // Champs de progression qui ne doivent PAS être marqués comme modifiés par l'utilisateur
  // (ils peuvent être mis à jour automatiquement par les synchronisations)
  const progressionFields = new Set(['chapitres_lus', 'volumes_lus']);
  
  // Helper pour ajouter un champ et le marquer comme modifié si nécessaire
  const addField = (fieldName, value, shouldMarkAsModified = true) => {
    fields.push(`${fieldName} = ?`);
    values.push(value);
    // Marquer comme modifié par l'utilisateur si c'est un champ qui doit être protégé
    // et que ce n'est pas un champ de progression
    if (shouldMarkAsModified && fieldsToMarkAsUserModified.has(fieldName) && !progressionFields.has(fieldName)) {
      markFieldAsUserModified(db, 'series', id, fieldName);
    }
  };
  
  if (serie.titre !== undefined) {
    addField('titre', serie.titre);
  }
  if (serie.statut !== undefined) {
    addField('statut', serie.statut);
  }
  if (serie.type_volume !== undefined) {
    addField('type_volume', serie.type_volume);
  }
  if (serie.couverture_url !== undefined) {
    addField('couverture_url', serie.couverture_url || null);
  }
  if (serie.description !== undefined) {
    addField('description', serie.description || null);
  }
  if (serie.statut_publication !== undefined) {
    addField('statut_publication', serie.statut_publication || null);
  }
  if (serie.statut_publication_vf !== undefined) {
    addField('statut_publication_vf', serie.statut_publication_vf || null);
  }
  if (serie.annee_publication !== undefined) {
    addField('annee_publication', serie.annee_publication || null);
  }
  if (serie.annee_vf !== undefined) {
    addField('annee_vf', serie.annee_vf || null);
  }
  if (serie.genres !== undefined) {
    addField('genres', serie.genres || null);
  }
  if (serie.nb_volumes !== undefined) {
    addField('nb_volumes', serie.nb_volumes || null);
  }
  if (serie.nb_volumes_vf !== undefined) {
    addField('nb_volumes_vf', serie.nb_volumes_vf || null);
  }
  if (serie.nb_chapitres !== undefined) {
    addField('nb_chapitres', serie.nb_chapitres || null);
  }
  if (serie.nb_chapitres_vf !== undefined) {
    addField('nb_chapitres_vf', serie.nb_chapitres_vf || null);
  }
  if (serie.chapitres_lus !== undefined) {
    // chapitres_lus est un champ de progression, ne pas marquer comme modifié par l'utilisateur
    addField('chapitres_lus', serie.chapitres_lus || null, false);
  }
  if (serie.langue_originale !== undefined) {
    addField('langue_originale', serie.langue_originale || null);
  }
  if (serie.demographie !== undefined) {
    addField('demographie', serie.demographie || null);
  }
  if (serie.editeur !== undefined) {
    addField('editeur', serie.editeur || null);
  }
  if (serie.editeur_vo !== undefined) {
    addField('editeur_vo', serie.editeur_vo || null);
  }
  if (serie.rating !== undefined) {
    addField('rating', serie.rating || null);
  }
  if (serie.themes !== undefined) {
    addField('themes', serie.themes || null);
  }
  if (serie.serialization !== undefined) {
    addField('serialization', serie.serialization || null);
  }
  if (serie.auteurs !== undefined) {
    addField('auteurs', serie.auteurs || null);
  }
  if (serie.titre_romaji !== undefined) {
    addField('titre_romaji', serie.titre_romaji || null);
  }
  if (serie.titre_natif !== undefined) {
    addField('titre_natif', serie.titre_natif || null);
  }
  if (serie.titre_anglais !== undefined) {
    addField('titre_anglais', serie.titre_anglais || null);
  }
  if (serie.titres_alternatifs !== undefined) {
    addField('titres_alternatifs', serie.titres_alternatifs || null);
  }
  if (serie.media_type !== undefined) {
    addField('media_type', serie.media_type || null);
  }
  if (serie.date_debut !== undefined) {
    addField('date_debut', serie.date_debut || null);
  }
  if (serie.date_fin !== undefined) {
    addField('date_fin', serie.date_fin || null);
  }
  if (serie.score_mal !== undefined) {
    addField('score_mal', serie.score_mal || null);
  }
  if (serie.rank_mal !== undefined) {
    addField('rank_mal', serie.rank_mal || null);
  }
  if (serie.popularity_mal !== undefined) {
    addField('popularity_mal', serie.popularity_mal || null);
  }
  if (serie.background !== undefined) {
    addField('background', serie.background || null);
  }
  if (serie.prequel_mal_id !== undefined) {
    addField('prequel_mal_id', serie.prequel_mal_id || null);
  }
  if (serie.sequel_mal_id !== undefined) {
    addField('sequel_mal_id', serie.sequel_mal_id || null);
  }
  if (serie.mal_id !== undefined) {
    // Si un mal_id est fourni et n'est pas null, vérifier s'il existe déjà sur une autre série
    if (serie.mal_id !== null && serie.mal_id !== undefined) {
      const existingSerie = db.prepare('SELECT id FROM series WHERE mal_id = ? AND id != ?').get(serie.mal_id, id);
      if (existingSerie) {
        // Retirer le mal_id de l'autre série pour éviter le conflit UNIQUE
        console.log(`⚠️ Le mal_id ${serie.mal_id} existe déjà sur la série ${existingSerie.id}, retrait de l'autre série`);
        db.prepare('UPDATE series SET mal_id = NULL WHERE id = ?').run(existingSerie.id);
      }
    }
    addField('mal_id', serie.mal_id || null);
  }
  
  // Toujours mettre à jour le timestamp
  fields.push('updated_at = CURRENT_TIMESTAMP');
  
  // Ajouter l'ID à la fin pour le WHERE
  values.push(id);
  
  const query = `UPDATE series SET ${fields.join(', ')} WHERE id = ?`;
  const stmt = db.prepare(query);
  stmt.run(...values);

  // Synchroniser la progression utilisateur (volumes/chapitres) si nécessaire
  if (store && (serie.chapitres_lus !== undefined || serie.volumes_lus !== undefined)) {
    try {
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          const statusStmt = db.prepare(`
            SELECT statut_lecture, score, volumes_lus, chapitres_lus, date_debut, date_fin
            FROM serie_statut_utilisateur
            WHERE serie_id = ? AND user_id = ?
          `);
          const existingStatus = statusStmt.get(id, userId);

          const updatedVolumes = serie.volumes_lus !== undefined
            ? (serie.volumes_lus || 0)
            : (existingStatus ? existingStatus.volumes_lus || 0 : 0);
          const updatedChapitres = serie.chapitres_lus !== undefined
            ? (serie.chapitres_lus || 0)
            : (existingStatus ? existingStatus.chapitres_lus || 0 : 0);

          if (existingStatus) {
            db.prepare(`
              UPDATE serie_statut_utilisateur
              SET volumes_lus = ?,
                  chapitres_lus = ?,
                  date_modification = datetime('now')
              WHERE serie_id = ? AND user_id = ?
            `).run(updatedVolumes, updatedChapitres, id, userId);
          } else {
            db.prepare(`
              INSERT INTO serie_statut_utilisateur (
                serie_id, user_id, statut_lecture, score, volumes_lus, chapitres_lus, date_debut, date_fin
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              id,
              userId,
              null,
              null,
              updatedVolumes,
              updatedChapitres,
              null,
              null
            );
          }

          // Mettre à jour automatiquement le tag de completion
          const { updateAutoCompletionTag } = require('./manga-helpers');
          updateAutoCompletionTag(db, id, userId);
        }
      }
    } catch (syncError) {
      console.warn('⚠️ Impossible de synchroniser la progression utilisateur pour la série', id, syncError);
    }
  }
  
  return true;
}

/**
 * Enregistre les handlers IPC pour les opérations de mise à jour
 */
function registerMangaSeriesUpdateHandlers(ipcMain, getDb, getPathManager, store) {
  // Mettre à jour une série
  ipcMain.handle('update-serie', (event, id, serie) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }
      return handleUpdateSerie(db, getPathManager, store, id, serie);
    } catch (error) {
      console.error('Erreur update-serie:', error);
      throw error;
    }
  });
}

module.exports = { registerMangaSeriesUpdateHandlers };
