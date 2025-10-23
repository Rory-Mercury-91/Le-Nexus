const fs = require('fs');
const path = require('path');

/**
 * Nettoie récursivement les dossiers vides à partir d'un chemin donné
 * @param {string} dirPath - Chemin du dossier à nettoyer
 * @param {string} stopAt - Chemin où arrêter la récursion
 * @returns {number} Nombre de dossiers supprimés
 */
function cleanEmptyFolders(dirPath, stopAt) {
  let count = 0;
  
  function cleanRecursive(currentPath) {
    // Ne pas aller au-delà du dossier stopAt
    if (currentPath === stopAt || !currentPath.startsWith(stopAt)) {
      return;
    }

    // Si le dossier n'existe pas, arrêter
    if (!fs.existsSync(currentPath)) {
      return;
    }

    // Lire le contenu du dossier
    const files = fs.readdirSync(currentPath);

    // Si le dossier est vide, le supprimer
    if (files.length === 0) {
      fs.rmdirSync(currentPath);
      count++;
      console.log(`🗑️ Dossier vide supprimé: ${currentPath}`);
      
      // Vérifier et nettoyer le dossier parent
      const parentPath = path.dirname(currentPath);
      cleanRecursive(parentPath);
    }
  }

  cleanRecursive(dirPath);
  return count;
}

/**
 * Supprime un fichier image et nettoie les dossiers vides parents
 * @param {string} coversDir - Répertoire racine des couvertures
 * @param {string} relativePath - Chemin relatif de l'image
 * @returns {{ success: boolean, count?: number, error?: string }}
 */
function deleteImageWithCleanup(coversDir, relativePath) {
  try {
    const fullPath = path.join(coversDir, relativePath);
    
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'Fichier introuvable' };
    }

    // Supprimer le fichier
    fs.unlinkSync(fullPath);
    console.log(`🗑️ Image supprimée: ${relativePath}`);

    // Nettoyer les dossiers vides
    const parentDir = path.dirname(fullPath);
    const count = cleanEmptyFolders(parentDir, coversDir);

    return { success: true, count };
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  cleanEmptyFolders,
  deleteImageWithCleanup
};
