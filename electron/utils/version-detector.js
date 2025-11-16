const path = require('path');

/**
 * Détecte la version d'un jeu adulte depuis le chemin de l'exécutable
 * Exemples de chemins supportés :
 * - "D:\Jeux\NudistOlivia-0.2-pc\NudistOlivia.exe" → "0.2"
 * - "D:\Jeux\MyGame-v1.5.3-win\game.exe" → "1.5.3"
 * - "D:\Jeux\GameName_0.4b-pc\game.exe" → "0.4b"
 * 
 * @param {string} exePath - Chemin complet vers l'exécutable
 * @returns {string|null} Version détectée ou null si non trouvée
 */
function detectVersionFromPath(exePath) {
  if (!exePath) return null;

  try {
    // Récupérer le nom du dossier parent
    const folderName = path.basename(path.dirname(exePath));
    console.log(`[Version Detector] 🔍 Analyse du dossier: "${folderName}"`);

    // Patterns de détection de version (par ordre de priorité)
    const patterns = [
      // Format: -v1.2.3- ou -v1.2.3a-
      /-v?(\d+\.[\d.]+[a-z]*)-/i,
      
      // Format: _v1.2.3- ou _v1.2.3a-
      /_v?(\d+\.[\d.]+[a-z]*)-/i,
      
      // Format: -v1.2.3 ou -v1.2.3a (fin de chaîne)
      /-v?(\d+\.[\d.]+[a-z]*)$/i,
      
      // Format: _v1.2.3 ou _v1.2.3a (fin de chaîne)
      /_v?(\d+\.[\d.]+[a-z]*)$/i,
      
      // Format: v1.2.3- ou v1.2.3a- (début)
      /^v?(\d+\.[\d.]+[a-z]*)-/i,
      
      // Format: -1.2.3- (sans 'v')
      /-(\d+\.[\d.]+[a-z]*)-/i,
      
      // Format: -1.2.3 (fin de chaîne, sans 'v')
      /-(\d+\.[\d.]+[a-z]*)$/i
    ];

    for (const pattern of patterns) {
      const match = folderName.match(pattern);
      if (match && match[1]) {
        const version = match[1];
        const formattedVersion = `v${version}`;
        console.log(`[Version Detector] ✅ Version détectée: "${formattedVersion}"`);
        return formattedVersion;
      }
    }

    console.log(`[Version Detector] ❌ Aucune version détectée dans: ${folderName}`);
    return null;

  } catch (error) {
    console.error('[Version Detector] Erreur détection version:', error);
    return null;
  }
}

module.exports = {
  detectVersionFromPath
};
