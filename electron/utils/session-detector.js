const fs = require('fs');
const path = require('path');

/**
 * Détecte la date de dernière session d'un jeu adulte
 * Lit la date de modification du fichier log.txt dans le dossier du jeu
 * 
 * @param {string} exePath - Chemin complet vers l'exécutable
 * @returns {Date|null} Date de dernière session ou null si non trouvée
 */
function getLastSession(exePath) {
  if (!exePath) {
    console.log('[Session Detector] ⚠️ Aucun chemin fourni');
    return null;
  }

  try {
    // Récupérer le dossier du jeu
    const gameDir = path.dirname(exePath);
    
    // Chercher le fichier log.txt
    const logPath = path.join(gameDir, 'log.txt');
    
    console.log(`[Session Detector] 🔍 Recherche log.txt dans: ${gameDir}`);

    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      console.log(`[Session Detector] ✅ log.txt trouvé! Dernière modif: ${stats.mtime.toISOString()}`);
      return stats.mtime; // Date de dernière modification
    }

    console.log(`[Session Detector] ❌ Fichier log.txt introuvable: ${logPath}`);
    return null;

  } catch (error) {
    console.error('[Session Detector] ❌ Erreur détection session:', error);
    return null;
  }
}

/**
 * Détecte et met à jour la version jouée + dernière session
 * 
 * @param {string} exePath - Chemin complet vers l'exécutable
 * @returns {Object} { version_jouee, derniere_session }
 */
function detectGameMetadata(exePath) {
  const { detectVersionFromPath } = require('./version-detector');
  
  return {
    version_jouee: detectVersionFromPath(exePath),
    derniere_session: getLastSession(exePath)
  };
}

module.exports = {
  getLastSession,
  detectGameMetadata
};
