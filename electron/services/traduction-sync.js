const fetch = require('electron-fetch').default;

/**
 * Service de synchronisation des traductions depuis Google Sheets
 */

// URL du Google Sheet (format CSV export)
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1ELRF0kpF8SoUlslX5ZXZoG4WXeWST6lN9bLws32EPfs/export?format=csv&gid=1224125898';

/**
 * Extrait l'ID F95Zone depuis une URL
 * @param {string} url - URL F95Zone
 * @returns {number|null} ID extrait ou null
 */
function extractF95Id(url) {
  if (!url) return null;
  const match = url.match(/\.(\d+)\/?$/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Parse une ligne CSV en respectant les guillemets
 * @param {string} line - Ligne CSV
 * @returns {Array<string>} Colonnes parsées
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && nextChar === '"') {
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Récupère et parse les données du Google Sheet
 * @param {string} sheetUrl - URL du sheet (optionnel)
 * @returns {Promise<Array>} Données parsées
 */
async function fetchGoogleSheet(sheetUrl = DEFAULT_SHEET_URL) {
  try {
    console.log('📥 Téléchargement Google Sheet...');
    const response = await fetch(sheetUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    // Ignorer la première ligne (en-têtes)
    const dataLines = lines.slice(1).filter(line => line.trim());
    
    const data = dataLines.map(line => {
      const cols = parseCSVLine(line);
      return {
        id: parseInt(cols[0]) || null,
        site: cols[1] || '',
        nom: cols[2] || '',
        version: cols[3] || '',
        versionTraduite: cols[4] || '',
        lienTraduction: cols[5] || '',
        statut: cols[6] || '',
        tags: cols[7] || '',
        moteur: cols[8] || '',
        traducteur: cols[9] || '',
        // cols[10] = Relecteur (ignoré)
        typeTraduction: cols[11] || ''
      };
    });
    
    console.log(`✅ ${data.length} jeux récupérés depuis Google Sheet`);
    return data;
  } catch (error) {
    console.error('❌ Erreur fetch Google Sheet:', error);
    throw error;
  }
}

/**
 * Filtre les traductions par traducteurs
 * @param {Array} data - Données du sheet
 * @param {Array<string>} traducteurs - Liste des traducteurs à filtrer
 * @returns {Array} Données filtrées
 */
function filterByTraducteurs(data, traducteurs) {
  if (!traducteurs || traducteurs.length === 0) {
    return [];
  }
  
  const filtered = data.filter(item => 
    traducteurs.some(trad => 
      item.traducteur.toLowerCase().includes(trad.toLowerCase())
    )
  );
  
  console.log(`🔍 ${filtered.length} traductions pour: ${traducteurs.join(', ')}`);
  return filtered;
}

/**
 * Synchronise les traductions avec la base de données
 * @param {object} db - Instance de la base de données
 * @param {Array<string>} traducteurs - Liste des traducteurs à suivre
 * @param {string} sheetUrl - URL du sheet (optionnel)
 * @returns {Promise<object>} Résultat de la synchronisation
 */
async function syncTraductions(db, traducteurs, sheetUrl) {
  try {
    console.log('🔄 Début synchronisation traductions...');
    
    // Créer les colonnes si elles n'existent pas
    const alterQueries = [
      `ALTER TABLE avn_games ADD COLUMN IF NOT EXISTS traduction_fr_disponible INTEGER DEFAULT 0`,
      `ALTER TABLE avn_games ADD COLUMN IF NOT EXISTS version_traduite TEXT`,
      `ALTER TABLE avn_games ADD COLUMN IF NOT EXISTS lien_traduction TEXT`,
      `ALTER TABLE avn_games ADD COLUMN IF NOT EXISTS statut_traduction TEXT`,
      `ALTER TABLE avn_games ADD COLUMN IF NOT EXISTS type_traduction TEXT`,
      `ALTER TABLE avn_games ADD COLUMN IF NOT EXISTS traducteur TEXT`,
      `ALTER TABLE avn_games ADD COLUMN IF NOT EXISTS f95_trad_id INTEGER`,
      `ALTER TABLE avn_games ADD COLUMN IF NOT EXISTS derniere_sync_trad TEXT`
    ];
    
    alterQueries.forEach(query => {
      try {
        db.exec(query);
      } catch (error) {
        // Colonne existe déjà, ignorer
      }
    });
    
    // Récupérer les données du sheet
    const sheetData = await fetchGoogleSheet(sheetUrl);
    
    // Filtrer par traducteurs
    const filteredData = filterByTraducteurs(sheetData, traducteurs);
    
    if (filteredData.length === 0) {
      return {
        success: true,
        matched: 0,
        updated: 0,
        notFound: 0,
        message: 'Aucune traduction trouvée pour les traducteurs sélectionnés'
      };
    }
    
    // Récupérer tous les jeux AVN
    const avnGames = db.prepare(`
      SELECT id, f95zone_url, titre
      FROM avn_games
    `).all();
    
    let matched = 0;
    let updated = 0;
    let notFound = 0;
    
    const updateStmt = db.prepare(`
      UPDATE avn_games
      SET 
        traduction_fr_disponible = 1,
        version_traduite = ?,
        lien_traduction = ?,
        statut_traduction = ?,
        type_traduction = ?,
        traducteur = ?,
        f95_trad_id = ?,
        derniere_sync_trad = datetime('now')
      WHERE id = ?
    `);
    
    // Matcher et mettre à jour
    for (const trad of filteredData) {
      if (!trad.id) {
        notFound++;
        continue;
      }
      
      // Chercher le jeu correspondant par ID F95Zone
      const game = avnGames.find(g => {
        const gameId = extractF95Id(g.f95zone_url);
        return gameId === trad.id;
      });
      
      if (game) {
        matched++;
        
        // Mettre à jour
        updateStmt.run(
          trad.versionTraduite,
          trad.lienTraduction,
          trad.statut,
          trad.typeTraduction,
          trad.traducteur,
          trad.id,
          game.id
        );
        
        updated++;
        console.log(`✅ Traduction ajoutée: ${game.titre} (v${trad.versionTraduite})`);
      } else {
        notFound++;
        console.log(`⚠️ Jeu non trouvé en BDD: ${trad.nom} (F95 ID: ${trad.id})`);
      }
    }
    
    console.log(`✅ Synchronisation terminée: ${matched} matchés, ${updated} mis à jour, ${notFound} non trouvés`);
    
    return {
      success: true,
      matched,
      updated,
      notFound,
      total: filteredData.length
    };
  } catch (error) {
    console.error('❌ Erreur sync traductions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Réinitialise les traductions d'un jeu
 * @param {object} db - Instance de la base de données
 * @param {number} gameId - ID du jeu
 */
function clearTraduction(db, gameId) {
  try {
    db.prepare(`
      UPDATE avn_games
      SET 
        traduction_fr_disponible = 0,
        version_traduite = NULL,
        lien_traduction = NULL,
        statut_traduction = NULL,
        type_traduction = NULL,
        traducteur = NULL,
        f95_trad_id = NULL,
        derniere_sync_trad = NULL
      WHERE id = ?
    `).run(gameId);
    
    console.log(`✅ Traduction réinitialisée pour jeu ${gameId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur clear traduction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Met à jour manuellement les informations de traduction
 * @param {object} db - Instance de la base de données
 * @param {number} gameId - ID du jeu
 * @param {object} tradData - Données de traduction
 */
function updateTraductionManually(db, gameId, tradData) {
  try {
    db.prepare(`
      UPDATE avn_games
      SET 
        traduction_fr_disponible = ?,
        version_traduite = ?,
        lien_traduction = ?,
        statut_traduction = ?,
        type_traduction = ?,
        traducteur = ?,
        derniere_sync_trad = datetime('now')
      WHERE id = ?
    `).run(
      tradData.disponible ? 1 : 0,
      tradData.versionTraduite || null,
      tradData.lienTraduction || null,
      tradData.statut || null,
      tradData.typeTraduction || null,
      tradData.traducteur || null,
      gameId
    );
    
    console.log(`✅ Traduction mise à jour manuellement pour jeu ${gameId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur update traduction manuelle:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  syncTraductions,
  clearTraduction,
  updateTraductionManually,
  extractF95Id
};

