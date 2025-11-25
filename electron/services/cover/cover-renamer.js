/**
 * Renommage des couvertures et dossiers
 * Gère le renommage des dossiers de séries et des fichiers de couvertures
 */

const fs = require('fs');
const path = require('path');
const { createSlug } = require('../../utils/slug');
const { determineMediaCategory } = require('./cover-downloader');

function extractCategoryFromPath(pathOrUrl) {
  if (!pathOrUrl) return null;
  const normalized = pathOrUrl.replace(/\\/g, '/').replace(/^covers\//, '');
  const firstPart = normalized.split('/')[0];
  if (!firstPart) return null;
  if (firstPart === 'manga_series') return 'Manga';
  if (firstPart === 'animes') return 'Anime';
  if (firstPart === 'adulte-game') return 'Adult_Game';
  return firstPart;
}

/**
 * Renomme le dossier d'une série et met à jour les chemins en base de données
 * @param {Database} db - Instance de la base de données
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} oldTitre - Ancien titre
 * @param {string} newTitre - Nouveau titre
 * @param {number} serieId - ID de la série
 */
function renameSerieFolder(db, pathManager, oldTitre, newTitre, serieId) {
  // Vérifier que les titres sont valides avant de créer les slugs
  if (!oldTitre || !newTitre || typeof oldTitre !== 'string' || typeof newTitre !== 'string') {
    console.warn('⚠️ Impossible de renommer le dossier : titres invalides', { oldTitre, newTitre });
    return;
  }

  const oldSlug = createSlug(oldTitre);
  const newSlug = createSlug(newTitre);

  if (oldSlug === newSlug) return; // Pas besoin de renommer

  let serieRow = null;
  try {
    serieRow = db.prepare('SELECT couverture_url, media_type, type_volume FROM manga_series WHERE id = ?').get(serieId);
  } catch (error) {
    console.warn('⚠️ Impossible de récupérer la série pour déterminer la catégorie:', error.message);
  }

  const inferredCategory = determineMediaCategory(pathManager, 'serie', {
    mediaType: serieRow?.media_type,
    typeVolume: serieRow?.type_volume,
    mediaCategory: extractCategoryFromPath(serieRow?.couverture_url)
  });

  const oldFolderPath = pathManager.getSeriesPath(oldSlug, inferredCategory);
  const newFolderPath = pathManager.getSeriesPath(newSlug, inferredCategory);

  // Si l'ancien dossier existe, le renommer
  if (fs.existsSync(oldFolderPath)) {
    // Vérifier que le nouveau dossier n'existe pas déjà
    if (!fs.existsSync(newFolderPath)) {
      fs.renameSync(oldFolderPath, newFolderPath);


      // Mettre à jour les chemins dans la base de données
      const prefixesToReplace = new Set([
        `manga_series/${oldSlug}/`,
        `${inferredCategory}/${oldSlug}/`
      ]);

      prefixesToReplace.forEach(oldPrefix => {
        db.prepare(`
          UPDATE manga_series 
          SET couverture_url = REPLACE(couverture_url, ?, ?)
          WHERE id = ? AND couverture_url IS NOT NULL
        `).run(oldPrefix, `${inferredCategory}/${newSlug}/`, serieId);

        db.prepare(`
          UPDATE manga_tomes 
          SET couverture_url = REPLACE(couverture_url, ?, ?)
          WHERE serie_id = ? AND couverture_url IS NOT NULL
        `).run(oldPrefix, `${inferredCategory}/${newSlug}/`, serieId);
      });
    }
  }
}

/**
 * Renomme l'image d'un tome en tome-X.ext
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} couvertureUrl - URL de la couverture
 * @param {number} numero - Numéro du tome
 * @param {string} serieTitre - Titre de la série
 * @returns {string} Nouvelle URL de la couverture
 */
function renameTomeCover(pathManager, couvertureUrl, numero, serieTitre) {
  if (!couvertureUrl) return couvertureUrl;

  // Vérifier que c'est un fichier dans la nouvelle structure
  const normalized = couvertureUrl.replace(/\\/g, '/').replace(/^covers\//, '');
  const legacyMatch = normalized.match(/^manga_series\/([^/]+)\/manga_tomes\/(custom-\d+|tome-\d+)(\.\w+)$/);
  const categoryMatch = normalized.match(/^([^/]+)\/([^/]+)\/manga_tomes\/(custom-\d+|tome-\d+)(\.\w+)$/);

  let category = 'Manga';
  let slug = '';
  let oldFileName = '';
  let ext = '';

  if (categoryMatch) {
    category = categoryMatch[1];
    slug = categoryMatch[2];
    oldFileName = categoryMatch[3] + categoryMatch[4];
    ext = categoryMatch[4];
  } else if (legacyMatch) {
    slug = legacyMatch[1];
    oldFileName = legacyMatch[2] + legacyMatch[3];
    ext = legacyMatch[3];
  } else {
    return couvertureUrl;
  }

  category = pathManager.resolveMediaCategory(category);

  const newFileName = `tome-${numero}${ext}`;

  if (oldFileName === newFileName) return couvertureUrl;

  const manga_tomesPath = pathManager.getTomesPath(slug, category);
  const oldFilePath = path.join(manga_tomesPath, oldFileName);
  const newFilePath = path.join(manga_tomesPath, newFileName);

  if (fs.existsSync(oldFilePath)) {
    if (fs.existsSync(newFilePath)) {
      fs.unlinkSync(newFilePath);
    }
    fs.renameSync(oldFilePath, newFilePath);

    return `${category}/${slug}/manga_tomes/${newFileName}`;
  }

  return couvertureUrl;
}

/**
 * Renomme l'image d'une série en cover.ext
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} couvertureUrl - URL de la couverture
 * @param {string} serieTitre - Titre de la série
 * @returns {string} Nouvelle URL de la couverture
 */
function renameSerieCover(pathManager, couvertureUrl, serieTitre) {
  if (!couvertureUrl) return couvertureUrl;

  const normalized = couvertureUrl.replace(/\\/g, '/').replace(/^covers\//, '');
  const legacyMatch = normalized.match(/^manga_series\/([^/]+)\/(custom-\d+|cover|[a-f0-9-]+)(\.\w+)$/);
  const categoryMatch = normalized.match(/^([^/]+)\/([^/]+)\/(custom-\d+|cover|[a-f0-9-]+)(\.\w+)$/);

  let category = 'Manga';
  let slug = '';
  let oldFileName = '';
  let ext = '';

  if (categoryMatch) {
    category = categoryMatch[1];
    slug = categoryMatch[2];
    oldFileName = categoryMatch[3] + categoryMatch[4];
    ext = categoryMatch[4];
  } else if (legacyMatch) {
    slug = legacyMatch[1];
    oldFileName = legacyMatch[2] + legacyMatch[3];
    ext = legacyMatch[3];
  } else {
    return couvertureUrl;
  }

  category = pathManager.resolveMediaCategory(category);

  const newFileName = `cover${ext}`;

  if (oldFileName === newFileName) return couvertureUrl;

  const manga_seriesPath = pathManager.getSeriesPath(slug, category);
  const oldFilePath = path.join(manga_seriesPath, oldFileName);
  const newFilePath = path.join(manga_seriesPath, newFileName);

  if (fs.existsSync(oldFilePath)) {
    if (fs.existsSync(newFilePath)) {
      fs.unlinkSync(newFilePath);
    }
    fs.renameSync(oldFilePath, newFilePath);

    return `${category}/${slug}/${newFileName}`;
  }

  return couvertureUrl;
}

module.exports = {
  renameSerieFolder,
  renameTomeCover,
  renameSerieCover
};
