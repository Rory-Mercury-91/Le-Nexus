/**
 * Gestionnaire de couvertures
 * Orchestration principale pour la gestion des couvertures (manga, anime, jeux adultes)
 */

const fs = require('fs');
const path = require('path');
const { downloadCover } = require('./cover-downloader');
const { renameSerieFolder, renameTomeCover, renameSerieCover } = require('./cover-renamer');
const { uploadCustomCover, saveCoverFromPath, saveCoverFromBuffer } = require('./cover-saver');

/**
 * Récupère le chemin complet d'une couverture
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} relativePath - Chemin relatif
 * @returns {string|null}
 */
function getCoverFullPath(pathManager, relativePath) {
  if (!relativePath) return null;

  // URL externe
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // Déjà un manga:// URL
  if (relativePath.startsWith('manga://')) {
    return relativePath;
  }

  // Chemin absolu Windows (C:\...) ou Unix (/...)
  if (path.isAbsolute(relativePath)) {
    if (fs.existsSync(relativePath)) {
      console.log(`📁 Chemin absolu détecté: ${relativePath}`);
      return `manga://${relativePath.replace(/\\/g, '/')}`;
    } else {
      console.warn(`⚠️ Chemin absolu introuvable: ${relativePath}`);
      return null;
    }
  }

  // Construire le chemin complet depuis la base (chemin relatif)
  const paths = pathManager.getPaths();
  const normalizedRelative = relativePath.replace(/\\/g, '/').replace(/^covers\//, '');
  let fullPath = path.join(paths.covers, normalizedRelative);

  if (fs.existsSync(fullPath)) {
    return `manga://${fullPath.replace(/\\/g, '/')}`;
  }

  const parts = normalizedRelative.split('/');
  const firstPart = parts[0] || '';
  const remainderParts = parts.slice(1);

  const categoryCandidates = new Set();
  const addCategory = (cat) => {
    if (!cat) return;
    const resolved = pathManager.resolveMediaCategory(cat);
    categoryCandidates.add(resolved);
  };

  if (firstPart === 'series') {
    addCategory('Manga');
  } else if (firstPart === 'animes') {
    addCategory('Anime');
  } else if (firstPart === 'adulte-game') {
    addCategory('Adult_Game');
  } else if (firstPart) {
    addCategory(firstPart);
  }

  // Toujours tenter Manga comme fallback pour compatibilité
  addCategory('Manga');

  for (const category of categoryCandidates) {
    const candidateRelative = [category, ...remainderParts].filter(Boolean).join('/');
    const candidateFullPath = path.join(paths.covers, candidateRelative);
    if (fs.existsSync(candidateFullPath)) {
      return `manga://${candidateFullPath.replace(/\\/g, '/')}`;
    }
  }

  // Si le chemin avec le baseDirectory actuel n'existe pas, essayer de corriger une typo commune
  // (aa.fergani91 -> a.fergani91 dans Proton Drive)
  const correctedPath = fullPath.replace(/aa\.fergani91/g, 'a.fergani91');
  if (correctedPath !== fullPath && fs.existsSync(correctedPath)) {
    console.log(`✅ Chemin corrigé (typo): ${correctedPath}`);
    return `manga://${correctedPath.replace(/\\/g, '/')}`;
  }

  // Essayer aussi avec le chemin par défaut (AppData\Roaming)
  const userDataPath = require('electron').app?.getPath('userData') || 
                       process.env.APPDATA || 
                       path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
  const defaultCoversPath = path.join(userDataPath, 'le-nexus', 'Le Nexus', 'covers');
  const defaultFullPath = path.join(defaultCoversPath, normalizedRelative);
  
  if (fs.existsSync(defaultFullPath)) {
    console.log(`✅ Fichier trouvé dans le chemin par défaut: ${defaultFullPath}`);
    return `manga://${defaultFullPath.replace(/\\/g, '/')}`;
  }

  // Dernier recours : chercher le fichier par son nom dans le dossier covers actuel
  // (au cas où seul le nom du fichier change, mais pas le dossier parent, ou timestamp différent)
  try {
    const fileName = path.basename(normalizedRelative);
    const relativeDir = path.dirname(normalizedRelative);
    const dirParts = relativeDir.split('/');
    let slugDir = '';
    if (dirParts.length >= 2) {
      slugDir = dirParts.slice(1).join('/');
    } else if (dirParts.length === 1) {
      slugDir = dirParts[0];
    }

    const searchPaths = [
      path.join(paths.covers, relativeDir),
      path.join(paths.covers, 'Manga', slugDir),
      path.join(defaultCoversPath, relativeDir),
      path.join(defaultCoversPath, 'Manga', slugDir),
      correctedPath.replace(/\\[^\\]+$/, ''),
      path.dirname(fullPath)
    ];
    
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        const foundFiles = fs.readdirSync(searchPath);
        // Chercher par nom exact d'abord
        let matchingFile = foundFiles.find(f => f === fileName);
        
        // Si pas trouvé, chercher par préfixe (pour custom-*.webp, cover.*, etc.)
        if (!matchingFile) {
          const baseName = fileName.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '').replace(/^custom-\d+$/, 'custom-');
          matchingFile = foundFiles.find(f => {
            const fBase = f.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '').replace(/^custom-\d+$/, 'custom-');
            return fBase === baseName || fBase.startsWith('custom-') || f === 'cover' + path.extname(fileName);
          });
        }
        
        if (matchingFile) {
          const foundPath = path.join(searchPath, matchingFile);
          if (fs.existsSync(foundPath)) {
            console.log(`✅ Fichier trouvé par recherche: ${foundPath} (cherché: ${fileName})`);
            return `manga://${foundPath.replace(/\\/g, '/')}`;
          }
        }
      }
    }
  } catch (searchError) {
    // Ignorer les erreurs de recherche
  }

  console.warn(`⚠️ Fichier non trouvé: ${fullPath}`);
  return null;
}

// Ré-exporter toutes les fonctions pour compatibilité
module.exports = {
  renameSerieFolder,
  renameTomeCover,
  renameSerieCover,
  downloadCover,
  uploadCustomCover,
  saveCoverFromPath,
  saveCoverFromBuffer,
  getCoverFullPath
};
