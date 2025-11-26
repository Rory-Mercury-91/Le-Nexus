const { renameSerieFolder, renameSerieCover } = require('../../services/cover/cover-manager');
const { getSerieTitle, ensureMangaUserDataRow, clearManualTagOverride } = require('./manga-helpers');
const { getUserIdByName } = require('../common-helpers');
const { buildDynamicUpdateQuery, executeUpdateWithMarking } = require('../common/crud-helpers');

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
  
  // Vérifier mal_id unique avant la mise à jour
  if (serie.mal_id !== undefined && serie.mal_id !== null) {
    const existingSerie = db.prepare('SELECT id FROM manga_series WHERE mal_id = ? AND id != ?').get(serie.mal_id, id);
    if (existingSerie) {
      // Retirer le mal_id de l'autre série pour éviter le conflit UNIQUE
      console.log(`⚠️ Le mal_id ${serie.mal_id} existe déjà sur la série ${existingSerie.id}, retrait de l'autre série`);
      db.prepare('UPDATE manga_series SET mal_id = NULL WHERE id = ?').run(existingSerie.id);
    }
  }
  
  // Liste des champs qui doivent être marqués comme modifiés par l'utilisateur
  const fieldsToMarkAsUserModified = new Set([
    'titre', 'statut', 'type_volume', 'couverture_url', 'description',
    'statut_publication', 'statut_publication_vf', 'annee_publication', 'annee_vf',
    'genres', 'nb_volumes', 'nb_volumes_vf', 'nb_chapitres', 'nb_chapitres_vf',
    'langue_originale', 'demographie', 'editeur', 'editeur_vo', 'rating',
    'themes', 'serialization', 'auteurs', 'titre_romaji', 'titre_natif',
    'titre_anglais', 'titres_alternatifs', 'media_type', 'date_debut', 'date_fin',
    'score_mal', 'rank_mal', 'popularity_mal', 'background', 'prequel_mal_id',
    'sequel_mal_id', 'mal_id', 'source_donnees', 'source_url'
  ]);
  
  // Champs de progression qui ne doivent PAS être marqués comme modifiés
  const progressionFields = new Set(['chapitres_lus', 'volumes_lus']);
  
  // Construire la requête dynamique
  const { fields, values, fieldsToMark } = buildDynamicUpdateQuery({
    tableName: 'manga_series',
    data: serie,
    itemId: id,
    fieldsToMarkAsUserModified,
    progressionFields,
    transformValue: (fieldName, value) => {
      // Gérer les valeurs null/undefined
      if (value === undefined) return undefined;
      
      // Le champ titre ne peut pas être null (contrainte NOT NULL)
      if (fieldName === 'titre' && (value === null || value === '')) {
        console.warn('⚠️ Impossible de mettre à jour le titre avec une valeur null/vide, champ ignoré');
        return undefined; // Retourner undefined pour ignorer ce champ
      }
      
      // Pour titres_alternatifs, s'assurer que c'est un JSON array valide
      if (fieldName === 'titres_alternatifs') {
        if (value === null || value === '') return null;
        // Si c'est déjà une chaîne JSON valide, la retourner telle quelle
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return value; // Déjà au bon format
            }
          } catch {
            // Ce n'est pas du JSON, on le convertit en array
          }
          // Si ce n'est pas du JSON, c'est probablement une chaîne séparée par " // "
          const titles = value.split(' // ').map(t => t.trim()).filter(Boolean);
          return titles.length > 0 ? JSON.stringify(titles) : null;
        }
        // Si c'est un array, le convertir en JSON
        if (Array.isArray(value)) {
          return value.length > 0 ? JSON.stringify(value) : null;
        }
        return null;
      }
      
      if (value === null || value === '') return null;
      // Gérer chapitres_mihon (par défaut 0)
      if (fieldName === 'chapitres_mihon' && value === undefined) return 0;
      return value;
    }
  });
  
  if (fields.length === 0) {
    // Aucune modification, mais on peut quand même synchroniser la progression
    // (pour les cas où seul chapitres_lus/volumes_lus change)
  } else {
    // Exécuter la mise à jour avec marquage
    executeUpdateWithMarking(db, 'manga_series', 'id', id, fields, values, fieldsToMark);
  }

  // Synchroniser la progression utilisateur (volumes/chapitres) si nécessaire
  if (store && (serie.chapitres_lus !== undefined || serie.volumes_lus !== undefined)) {
    try {
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          // S'assurer qu'une entrée manga_user_data existe
          ensureMangaUserDataRow(db, id, userId);
          clearManualTagOverride(db, id, userId);

          const statusStmt = db.prepare(`
            SELECT volumes_lus, chapitres_lus
            FROM manga_user_data
            WHERE serie_id = ? AND user_id = ?
          `);
          const existingStatus = statusStmt.get(id, userId);

          const updatedVolumes = serie.volumes_lus !== undefined
            ? (serie.volumes_lus || 0)
            : (existingStatus ? existingStatus.volumes_lus || 0 : 0);
          const updatedChapitres = serie.chapitres_lus !== undefined
            ? (serie.chapitres_lus || 0)
            : (existingStatus ? existingStatus.chapitres_lus || 0 : 0);

          db.prepare(`
            UPDATE manga_user_data
            SET volumes_lus = ?,
                chapitres_lus = ?,
                updated_at = datetime('now')
            WHERE serie_id = ? AND user_id = ?
          `).run(updatedVolumes, updatedChapitres, id, userId);

          // Mettre à jour automatiquement le tag de completion
          const { updateAutoCompletionTag } = require('./manga-helpers');
          updateAutoCompletionTag(db, id, userId);
        }
      }
    } catch (syncError) {
      console.warn('⚠️ Impossible de synchroniser la progression utilisateur pour la série', id, syncError);
    }
  }
  
  return { success: true };
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
      
      // Améliorer le message d'erreur pour les contraintes UNIQUE
      if (error.message && error.message.includes('UNIQUE constraint failed') && error.message.includes('mal_id')) {
        const friendlyError = new Error('Entrée déjà présente dans la collection');
        friendlyError.name = error.name;
        friendlyError.stack = error.stack;
        throw friendlyError;
      }
      
      throw error;
    }
  });
}

module.exports = { registerMangaSeriesUpdateHandlers };
