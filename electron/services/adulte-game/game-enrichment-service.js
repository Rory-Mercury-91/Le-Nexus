const { getGameDetails } = require('../../apis/rawg');
const { translateText } = require('../../apis/groq');

function toJson(value) {
  if (value === undefined || value === null) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/**
 * Traduit le texte si nécessaire via Groq
 * @param {string} text - Texte à traduire
 * @param {Store} store - Store Electron
 * @returns {Promise<{ translated: string, usedGroq: boolean }>}
 */
async function maybeTranslate(text, store) {
  if (!text || text.trim().length < 10) {
    return { translated: text, usedGroq: false };
  }

  const groqKey = store.get('groqApiKey', '');
  if (!groqKey) {
    return { translated: text, usedGroq: false };
  }

  const result = await translateText(text, groqKey, 'fr', 'jeux vidéo');
  if (result.success) {
    return { translated: result.text, usedGroq: true };
  }

  return { translated: text, usedGroq: false };
}

/**
 * Nettoie le HTML d'une description
 * @param {string} html - Texte HTML
 * @returns {string} Texte nettoyé
 */
function cleanHtmlText(html) {
  if (!html) return null;
  
  // Supprimer les balises HTML basiques
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Mappe les données RAWG vers le format de la base de données
 * @param {Object} game - Données du jeu depuis RAWG
 * @param {Object} options - Options de mapping
 * @param {string} options.translatedDescription - Description traduite
 * @returns {Object} Données formatées pour la DB
 */
function mapGameForDb(game, {
  translatedDescription
} = {}) {
  // Extraire les plateformes
  const platforms = game.platforms?.map(p => p.platform?.name || p.name).filter(Boolean) || [];
  
  // Extraire les genres
  const genres = game.genres?.map(g => g.name).filter(Boolean) || [];
  
  // Extraire les tags
  const tags = game.tags?.map(t => t.name).filter(Boolean) || [];
  
  // Date de sortie (prendre la première date disponible)
  const released = game.released || game.release_date || null;
  
  // Note (Metacritic ou rating)
  const rating = game.metacritic || game.rating || null;
  
  // Extraire l'ESRB rating (peut être un objet avec id, name, slug)
  const esrbRating = game.esrb_rating ? (typeof game.esrb_rating === 'object' ? game.esrb_rating.name || game.esrb_rating.slug : game.esrb_rating) : null;

  return {
    rawg_id: game.id,
    rawg_rating: rating ? parseFloat(rating) : null,
    rawg_released: released,
    rawg_platforms: platforms.length > 0 ? toJson(platforms) : null,
    rawg_description: translatedDescription || cleanHtmlText(game.description) || null,
    rawg_website: game.website || null,
    esrb_rating: esrbRating
  };
}

/**
 * Met à jour un jeu dans la base de données avec les données RAWG
 * @param {Database} db - Instance de la base de données
 * @param {number} gameId - ID du jeu dans la base locale
 * @param {Object} rawgData - Données RAWG formatées
 * @returns {number} ID du jeu mis à jour
 */
function upsertGameRawgData(db, gameId, rawgData) {
  const columns = Object.keys(rawgData);
  const placeholders = columns.map(col => `@${col}`).join(', ');
  const updates = columns
    .map(col => `${col} = excluded.${col}`)
    .join(', ');

  // Mettre à jour uniquement les colonnes RAWG
  const stmt = db.prepare(`
    UPDATE adulte_game_games
    SET ${columns.map(col => `${col} = @${col}`).join(', ')},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run({ ...rawgData, id: gameId });

  return gameId;
}

/**
 * Synchronise un jeu depuis RAWG dans la base locale
 * @param {Object} options
 * @param {number} options.rawgId - ID RAWG du jeu
 * @param {number} options.gameId - ID du jeu dans la base locale (optionnel, pour mise à jour)
 * @param {Database} options.db
 * @param {Store} options.store
 * @param {boolean} [options.enableTranslation=true]
 * @returns {Promise<{ id: number | null, rawgId: number, usedTranslation: boolean }>}
 */
async function syncGameFromRawg({
  rawgId,
  gameId,
  db,
  store,
  enableTranslation = true
}) {
  const apiKey = store.get('rawg.apiKey', process.env.RAWG_API_KEY || '');

  if (!apiKey) {
    throw new Error('Aucune clé API RAWG définie');
  }

  const game = await getGameDetails(rawgId, {
    apiKey
  });

  if (!game) {
    throw new Error(`Jeu RAWG ${rawgId} introuvable`);
  }

  let description = cleanHtmlText(game.description);
  let usedGroq = false;

  // Traduire la description si nécessaire
  if (enableTranslation && description && description.trim().length > 20) {
    const translation = await maybeTranslate(description, store);
    description = translation.translated;
    usedGroq = translation.usedGroq;
  }

  const gameData = mapGameForDb(game, {
    translatedDescription: description
  });

  if (gameId) {
    // Mise à jour d'un jeu existant
    upsertGameRawgData(db, gameId, gameData);
    return {
      id: gameId,
      rawgId,
      usedTranslation: usedGroq
    };
  } else {
    // Retourner les données pour création (sera géré par le handler)
    return {
      id: null,
      rawgId,
      usedTranslation: usedGroq,
      gameData
    };
  }
}

/**
 * Enrichit un jeu existant avec les données RAWG
 * @param {Object} options
 * @param {number} options.gameId - ID du jeu dans la base locale
 * @param {number} [options.rawgId] - ID RAWG (optionnel, sera recherché si non fourni)
 * @param {Database} options.db
 * @param {Store} options.store
 * @param {boolean} [options.enableTranslation=true]
 * @returns {Promise<{ success: boolean, usedTranslation: boolean, error?: string }>}
 */
async function enrichGameFromRawg({
  gameId,
  rawgId,
  db,
  store,
  enableTranslation = true
}) {
  try {
    // Si rawgId n'est pas fourni, essayer de le trouver dans la base
    if (!rawgId) {
      const game = db.prepare('SELECT rawg_id, titre FROM adulte_game_games WHERE id = ?').get(gameId);
      if (!game) {
        throw new Error(`Jeu ${gameId} introuvable`);
      }
      rawgId = game.rawg_id;
    }

    if (!rawgId) {
      throw new Error('Aucun ID RAWG associé à ce jeu. Recherchez d\'abord le jeu sur RAWG.');
    }

    const result = await syncGameFromRawg({
      rawgId,
      gameId,
      db,
      store,
      enableTranslation
    });

    return {
      success: true,
      usedTranslation: result.usedTranslation
    };
  } catch (error) {
    console.error('Erreur enrichissement RAWG:', error);
    return {
      success: false,
      usedTranslation: false,
      error: error.message
    };
  }
}

module.exports = {
  syncGameFromRawg,
  enrichGameFromRawg,
  mapGameForDb
};
