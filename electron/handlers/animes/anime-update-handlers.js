/**
 * Handlers pour les opérations de mise à jour (UPDATE) sur les séries d'animes
 */

const { markFieldAsUserModified } = require('../../utils/enrichment-helpers');
const { buildDynamicUpdateQuery, executeUpdateWithMarking } = require('../common/crud-helpers');

/**
 * Met à jour un anime
 */
function handleUpdateAnime(db, id, animeData) {
  // Liste des champs qui doivent être marqués comme modifiés par l'utilisateur
  // (exclure les champs de progression qui peuvent être mis à jour automatiquement)
  const fieldsToMarkAsUserModified = new Set([
    'titre', 'titre_romaji', 'titre_natif', 'titre_anglais', 'titres_alternatifs',
    'description', 'genres', 'themes', 'demographics', 'studios', 'producteurs',
    'diffuseurs', 'annee', 'saison_diffusion', 'date_debut', 'date_fin',
    'date_sortie_vf', 'date_debut_streaming', 'duree', 'rating', 'age_conseille',
    'type', 'source', 'nb_episodes', 'couverture_url', 'score', 'statut_diffusion',
    'en_cours_diffusion', 'editeur', 'site_web', 'liens_externes', 'liens_streaming',
    'mal_id'
  ]);
  
  // Construire la requête dynamique
  const { fields, values, fieldsToMark } = buildDynamicUpdateQuery({
    tableName: 'anime_series',
    data: animeData,
    itemId: id,
    fieldsToMarkAsUserModified,
    progressionFields: new Set(), // Pas de champs de progression pour les animes dans cette table
    transformValue: (fieldName, value) => {
      // Gérer les valeurs null/undefined
      if (value === undefined) return undefined;
      
      // Le champ titre ne peut pas être null (contrainte NOT NULL)
      if (fieldName === 'titre' && (value === null || value === '')) {
        console.warn('⚠️ Impossible de mettre à jour le titre avec une valeur null/vide, champ ignoré');
        return undefined; // Retourner undefined pour ignorer ce champ
      }
      
      // Le champ type ne peut pas être null (contrainte NOT NULL)
      if (fieldName === 'type' && (value === null || value === '')) {
        console.warn('⚠️ Impossible de mettre à jour le type avec une valeur null/vide, champ ignoré');
        return undefined;
      }
      
      // Le champ nb_episodes ne peut pas être null (contrainte NOT NULL DEFAULT 0)
      if (fieldName === 'nb_episodes' && (value === null || value === undefined)) {
        return 0; // Valeur par défaut
      }
      
      if (value === null || value === '') return null;
      return value;
    }
  });
  
  if (fields.length === 0) {
    console.log('⚠️ Aucun champ à mettre à jour pour l\'anime', id);
    return { success: true };
  }
  
  // Exécuter la mise à jour avec marquage des champs
  executeUpdateWithMarking(db, 'anime_series', 'id', id, fields, values, fieldsToMark);

  return { success: true };
}

/**
 * Ajoute un lien externe à un anime
 */
function handleAddExternalLink(db, animeId, linkData) {
  try {
    // Récupérer les liens externes existants
    const anime = db.prepare('SELECT liens_externes FROM anime_series WHERE id = ?').get(animeId);
    if (!anime) {
      return { success: false, error: 'Anime non trouvé' };
    }

    const { safeJsonParse } = require('../common-helpers');
    let existingLinks = [];
    if (anime.liens_externes) {
      existingLinks = safeJsonParse(anime.liens_externes, []);
      if (!Array.isArray(existingLinks)) {
        existingLinks = [];
      }
    }

    // Vérifier si le lien existe déjà (par URL)
    if (existingLinks.some(l => l.url === linkData.url)) {
      return { success: false, error: 'Ce lien existe déjà' };
    }

    // Ajouter le nouveau lien
    existingLinks.push({
      name: linkData.name || 'Lien externe',
      url: linkData.url
    });

    // Mettre à jour la base de données
    db.prepare('UPDATE anime_series SET liens_externes = ? WHERE id = ?').run(
      JSON.stringify(existingLinks),
      animeId
    );

    return { success: true };
  } catch (error) {
    console.error('❌ Erreur add-external-link:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enregistre les handlers IPC pour les opérations de mise à jour
 */
function registerAnimeSeriesUpdateHandlers(ipcMain, getDb) {
  // Mettre à jour un anime
  ipcMain.handle('update-anime', async (event, id, animeData) => {
    try {
      const db = getDb();
      return handleUpdateAnime(db, id, animeData);
    } catch (error) {
      console.error('❌ Erreur update-anime:', error);
      return { success: false, error: error.message };
    }
  });

  // Ajouter un lien externe
  ipcMain.handle('add-external-link', async (event, animeId, linkData) => {
    try {
      const db = getDb();
      return handleAddExternalLink(db, animeId, linkData);
    } catch (error) {
      console.error('❌ Erreur add-external-link:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAnimeSeriesUpdateHandlers };
