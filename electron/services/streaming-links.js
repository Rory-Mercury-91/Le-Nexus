const fetch = require('electron-fetch').default;

/**
 * Service pour gérer les liens de streaming des animes
 */

/**
 * Récupère les liens de streaming depuis AniList
 * @param {number} malId - L'ID MyAnimeList de l'anime
 * @returns {Promise<Array>} Liste des liens de streaming
 */
async function getStreamingLinksFromAniList(malId) {
  try {
    // Récupérer l'ID AniList depuis MAL ID
    const anilistId = await getAniListIdFromMAL(malId);
    if (!anilistId) {
      console.log('Aucun ID AniList trouvé pour MAL ID:', malId);
      return [];
    }

    // Récupérer les liens de streaming
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          externalLinks {
            id
            url
            site
            type
            language
            color
            icon
          }
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: anilistId } })
    });

    const data = await response.json();
    const links = data.data?.Media?.externalLinks || [];

    // Filtrer uniquement les liens de streaming (pas les liens vers d'autres sites comme Twitter, etc.)
    const streamingLinks = links.filter(link => link.type === 'STREAMING');

    console.log(`✅ ${streamingLinks.length} liens de streaming trouvés pour anime MAL ID ${malId}`);
    
    return streamingLinks.map(link => ({
      source: 'anilist',
      platform: link.site,
      url: link.url,
      language: link.language || 'unknown',
      color: link.color,
      icon: link.icon
    }));
  } catch (error) {
    console.error('❌ Erreur récupération liens streaming:', error);
    return [];
  }
}

/**
 * Récupère l'ID AniList depuis un MAL ID
 */
async function getAniListIdFromMAL(malId) {
  try {
    const query = `
      query ($malId: Int) {
        Media(idMal: $malId, type: ANIME) {
          id
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { malId } })
    });

    const data = await response.json();
    return data.data?.Media?.id || null;
  } catch (error) {
    console.error('Erreur getAniListIdFromMAL:', error);
    return null;
  }
}

/**
 * Récupère les liens manuels depuis la base de données
 * @param {object} db - Instance de la base de données
 * @param {number} animeId - ID de l'anime
 * @returns {Array} Liste des liens manuels
 */
function getManualLinks(db, animeId) {
  try {
    // Créer la table si elle n'existe pas
    db.exec(`
      CREATE TABLE IF NOT EXISTS anime_streaming_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anime_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        url TEXT NOT NULL,
        language TEXT DEFAULT 'fr',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (anime_id) REFERENCES anime_series(id) ON DELETE CASCADE
      )
    `);

    const links = db.prepare(`
      SELECT id, platform, url, language, created_at
      FROM anime_streaming_links
      WHERE anime_id = ?
      ORDER BY created_at DESC
    `).all(animeId);

    return links.map(link => ({
      source: 'manual',
      id: link.id,
      platform: link.platform,
      url: link.url,
      language: link.language,
      createdAt: link.created_at
    }));
  } catch (error) {
    console.error('❌ Erreur récupération liens manuels:', error);
    return [];
  }
}

/**
 * Ajoute un lien manuel
 * @param {object} db - Instance de la base de données
 * @param {number} animeId - ID de l'anime
 * @param {object} linkData - Données du lien { platform, url, language }
 * @returns {object} Résultat de l'opération
 */
function addManualLink(db, animeId, linkData) {
  try {
    // Créer la table si elle n'existe pas
    db.exec(`
      CREATE TABLE IF NOT EXISTS anime_streaming_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anime_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        url TEXT NOT NULL,
        language TEXT DEFAULT 'fr',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (anime_id) REFERENCES anime_series(id) ON DELETE CASCADE
      )
    `);

    const stmt = db.prepare(`
      INSERT INTO anime_streaming_links (anime_id, platform, url, language)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      animeId,
      linkData.platform,
      linkData.url,
      linkData.language || 'fr'
    );

    console.log(`✅ Lien ajouté: ${linkData.platform} pour anime ${animeId}`);
    
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('❌ Erreur ajout lien manuel:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Supprime un lien manuel
 * @param {object} db - Instance de la base de données
 * @param {number} linkId - ID du lien à supprimer
 * @returns {object} Résultat de l'opération
 */
function deleteManualLink(db, linkId) {
  try {
    const stmt = db.prepare(`
      DELETE FROM anime_streaming_links
      WHERE id = ?
    `);

    stmt.run(linkId);

    console.log(`✅ Lien supprimé: ${linkId}`);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur suppression lien:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getStreamingLinksFromAniList,
  getManualLinks,
  addManualLink,
  deleteManualLink
};
