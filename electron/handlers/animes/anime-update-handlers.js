/**
 * Handlers pour les opérations de mise à jour (UPDATE) sur les séries d'animes
 */

const { markFieldAsUserModified } = require('../../utils/enrichment-helpers');

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
  
  // Marquer tous les champs fournis comme modifiés par l'utilisateur
  // (sauf les champs de progression comme episodes_vus qui peuvent être mis à jour automatiquement)
  Object.keys(animeData).forEach(fieldName => {
    if (fieldsToMarkAsUserModified.has(fieldName)) {
      markFieldAsUserModified(db, 'anime_series', id, fieldName);
    }
  });
  
  const stmt = db.prepare(`
    UPDATE anime_series 
    SET titre = ?, 
        titre_romaji = ?,
        titre_natif = ?,
        titre_anglais = ?,
        titres_alternatifs = ?,
        description = ?, 
        genres = ?, 
        themes = ?,
        demographics = ?,
        studios = ?, 
        producteurs = ?,
        diffuseurs = ?,
        annee = ?,
        saison_diffusion = ?,
        date_debut = ?,
        date_fin = ?,
        date_sortie_vf = ?,
        date_debut_streaming = ?,
        duree = ?,
        rating = ?, 
        age_conseille = ?,
        type = ?, 
        source = ?,
        nb_episodes = ?, 
        couverture_url = ?,
        score = ?,
        statut_diffusion = ?,
        en_cours_diffusion = ?,
        editeur = ?,
        site_web = ?,
        liens_externes = ?,
        liens_streaming = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(
    animeData.titre,
    animeData.titre_romaji || null,
    animeData.titre_natif || null,
    animeData.titre_anglais || null,
    animeData.titres_alternatifs || null,
    animeData.description,
    animeData.genres,
    animeData.themes || null,
    animeData.demographics || null,
    animeData.studios,
    animeData.producteurs || null,
    animeData.diffuseurs || null,
    animeData.annee,
    animeData.saison_diffusion || null,
    animeData.date_debut || null,
    animeData.date_fin || null,
    animeData.date_sortie_vf || null,
    animeData.date_debut_streaming || null,
    animeData.duree || null,
    animeData.rating,
    animeData.age_conseille || null,
    animeData.type,
    animeData.source || null,
    animeData.nb_episodes,
    animeData.couverture_url || null,
    animeData.score || null,
    animeData.statut_diffusion || null,
    animeData.en_cours_diffusion ? 1 : 0,
    animeData.editeur || null,
    animeData.site_web || null,
    animeData.liens_externes || null,
    animeData.liens_streaming || null,
    id
  );

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

    let existingLinks = [];
    if (anime.liens_externes) {
      try {
        existingLinks = JSON.parse(anime.liens_externes);
        if (!Array.isArray(existingLinks)) {
          existingLinks = [];
        }
      } catch (e) {
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
