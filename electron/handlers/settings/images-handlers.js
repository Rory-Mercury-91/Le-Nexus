const { cleanEmptyFolders, deleteImageWithCleanup } = require('../../utils/file-utils');
const { downloadCover, uploadCustomCover, saveCoverFromPath, saveCoverFromBuffer } = require('../../services/cover/cover-manager');

// Import des fonctions communes
const { getPaths } = require('../common-helpers');

/**
 * Enregistre les handlers IPC pour la gestion des images et couvertures
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 */

function registerImagesHandlers(ipcMain, dialog, getMainWindow, getPathManager) {
  const getPathsLocal = () => getPaths(getPathManager);

  // Télécharger une couverture
  ipcMain.handle('download-cover', async (event, imageUrl, fileName, serieTitre, type = 'serie', options = {}) => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return await downloadCover(pm, imageUrl, serieTitre, type, null, options);
  });

  // Upload d'une couverture personnalisée
  ipcMain.handle('upload-custom-cover', async (event, serieTitre, type = 'serie', options = {}) => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return await uploadCustomCover(dialog, getMainWindow(), pm, serieTitre, type, options);
  });

  // Sauvegarder une image depuis un chemin (drag & drop)
  ipcMain.handle('save-cover-from-path', async (event, sourcePath, serieTitre, type = 'serie', options = {}) => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return saveCoverFromPath(pm, sourcePath, serieTitre, type, options);
  });

  ipcMain.handle('save-cover-from-buffer', async (event, buffer, fileName, serieTitre, type = 'serie', options = {}) => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return saveCoverFromBuffer(pm, buffer, fileName, serieTitre, type, options);
  });

  // Récupération du chemin complet d'une image
  ipcMain.handle('get-cover-full-path', (event, relativePath) => {
    const pm = getPathManager();
    if (!pm) return null;
    return require('../../services/cover/cover-manager').getCoverFullPath(pm, relativePath);
  });

  // Supprimer une image de couverture
  ipcMain.handle('delete-cover-image', async (event, relativePath) => {
    try {
      if (!relativePath) {
        return { success: false, error: 'Paramètres invalides' };
      }

      // Ne pas supprimer les URLs externes
      if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return { success: true };
      }

      return deleteImageWithCleanup(getPathsLocal().covers, relativePath);
    } catch (error) {
      console.error('Erreur delete-cover-image:', error);
      return { success: false, error: error.message };
    }
  });

  // Nettoyer les dossiers vides
  ipcMain.handle('clean-empty-folders', () => {
    try {
      const count = cleanEmptyFolders(getPathsLocal().manga_series, getPathsLocal().manga_series);
      return { success: true, count };
    } catch (error) {
      console.error('Erreur clean-empty-folders:', error);
      return { success: false, error: error.message };
    }
  });

  // Diagnostiquer les couvertures cassées
  ipcMain.handle('diagnose-broken-covers', async (event) => {
    try {
      const { getDb } = require('../common-helpers');
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non disponible' };
      }

      const pm = getPathManager();
      if (!pm) {
        return { success: false, error: 'PathManager non initialisé' };
      }

      const { getCoverFullPath } = require('../../services/cover/cover-manager');
      const brokenCovers = [];

      // Vérifier les couvertures des mangas
      const mangas = db.prepare('SELECT id, titre, couverture_url FROM manga_series WHERE couverture_url IS NOT NULL AND couverture_url != ""').all();
      for (const manga of mangas) {
        const fullPath = getCoverFullPath(pm, manga.couverture_url);
        if (!fullPath) {
          brokenCovers.push({
            type: 'manga',
            id: manga.id,
            titre: manga.titre,
            couverture_url: manga.couverture_url
          });
        }
      }

      // Vérifier les couvertures des animes
      const animes = db.prepare('SELECT id, titre, couverture_url FROM anime_series WHERE couverture_url IS NOT NULL AND couverture_url != ""').all();
      for (const anime of animes) {
        const fullPath = getCoverFullPath(pm, anime.couverture_url);
        if (!fullPath) {
          brokenCovers.push({
            type: 'anime',
            id: anime.id,
            titre: anime.titre,
            couverture_url: anime.couverture_url
          });
        }
      }

      return {
        success: true,
        brokenCount: brokenCovers.length,
        brokenCovers: brokenCovers.slice(0, 50), // Limiter à 50 pour éviter de surcharger
        totalMangas: mangas.length,
        totalAnimes: animes.length
      };
    } catch (error) {
      console.error('Erreur diagnose-broken-covers:', error);
      return { success: false, error: error.message };
    }
  });

  // Réparer les couvertures cassées en cherchant les fichiers
  ipcMain.handle('repair-broken-covers', async (event) => {
    try {
      const { getDb } = require('../common-helpers');
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non disponible' };
      }

      const pm = getPathManager();
      if (!pm) {
        return { success: false, error: 'PathManager non initialisé' };
      }

      const fs = require('fs');
      const path = require('path');
      const { getCoverFullPath } = require('../../services/cover/cover-manager');
      
      let repaired = 0;
      let notFound = 0;
      const paths = pm.getPaths();

      // Fonction pour chercher un fichier par son nom dans le dossier covers
      const findCoverFile = (fileName, category = null) => {
        const categories = category ? [category] : ['Manga', 'Anime', 'Adult_Game'];
        
        for (const cat of categories) {
          const categoryPath = path.join(paths.covers, pm.resolveMediaCategory(cat));
          if (!fs.existsSync(categoryPath)) continue;
          
          // Chercher récursivement
          const searchInDir = (dir) => {
            try {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                  const found = searchInDir(fullPath);
                  if (found) return found;
                } else if (entry.isFile()) {
                  // Comparer par nom de base (sans extension ou avec différentes extensions)
                  const baseName = path.basename(fileName, path.extname(fileName));
                  const entryBaseName = path.basename(entry.name, path.extname(entry.name));
                  if (entryBaseName === baseName || entry.name === fileName) {
                    return fullPath;
                  }
                }
              }
            } catch (e) {
              // Ignorer les erreurs de lecture
            }
            return null;
          };
          
          const found = searchInDir(categoryPath);
          if (found) return found;
        }
        return null;
      };

      // Réparer les mangas
      const mangas = db.prepare('SELECT id, titre, couverture_url FROM manga_series WHERE couverture_url IS NOT NULL AND couverture_url != ""').all();
      for (const manga of mangas) {
        const fullPath = getCoverFullPath(pm, manga.couverture_url);
        if (!fullPath) {
          // Essayer de trouver le fichier
          const fileName = path.basename(manga.couverture_url);
          const foundPath = findCoverFile(fileName, 'Manga');
          
          if (foundPath) {
            // Calculer le chemin relatif depuis covers
            const relativePath = path.relative(paths.covers, foundPath).replace(/\\/g, '/');
            db.prepare('UPDATE manga_series SET couverture_url = ? WHERE id = ?').run(relativePath, manga.id);
            repaired++;
            console.log(`✅ Couverture réparée pour manga ${manga.id} (${manga.titre}): ${relativePath}`);
          } else {
            notFound++;
            console.warn(`⚠️ Couverture introuvable pour manga ${manga.id} (${manga.titre}): ${manga.couverture_url}`);
          }
        }
      }

      // Réparer les animes
      const animes = db.prepare('SELECT id, titre, couverture_url FROM anime_series WHERE couverture_url IS NOT NULL AND couverture_url != ""').all();
      for (const anime of animes) {
        const fullPath = getCoverFullPath(pm, anime.couverture_url);
        if (!fullPath) {
          // Essayer de trouver le fichier
          const fileName = path.basename(anime.couverture_url);
          const foundPath = findCoverFile(fileName, 'Anime');
          
          if (foundPath) {
            // Calculer le chemin relatif depuis covers
            const relativePath = path.relative(paths.covers, foundPath).replace(/\\/g, '/');
            db.prepare('UPDATE anime_series SET couverture_url = ? WHERE id = ?').run(relativePath, anime.id);
            repaired++;
            console.log(`✅ Couverture réparée pour anime ${anime.id} (${anime.titre}): ${relativePath}`);
          } else {
            notFound++;
            console.warn(`⚠️ Couverture introuvable pour anime ${anime.id} (${anime.titre}): ${anime.couverture_url}`);
          }
        }
      }

      return {
        success: true,
        repaired,
        notFound,
        message: `${repaired} couverture(s) réparée(s), ${notFound} introuvable(s)`
      };
    } catch (error) {
      console.error('Erreur repair-broken-covers:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerImagesHandlers };
