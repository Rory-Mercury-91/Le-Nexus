/**
 * Handlers pour la page Lectures (vue globale et détection des types de contenu)
 */

const { registerComicsHandlers } = require('./comics-handlers');
const { registerBdHandlers } = require('./bd-handlers');

/**
 * Détecte les types de contenu disponibles dans la base de données
 * Retourne un objet avec les types disponibles et leur nombre
 */
function handleGetAvailableContentTypes(db, store) {
  const currentUser = store.get('currentUser', '');
  
  const result = {
    manga: 0,
    manhwa: 0,
    manhua: 0,
    lightNovel: 0,
    webtoon: 0,
    comics: 0,
    bd: 0,
    books: 0
  };

  // Compter les séries manga par media_type
  const mangaCounts = db.prepare(`
    SELECT 
      media_type,
      COUNT(*) as count
    FROM manga_series
    WHERE media_type IS NOT NULL AND media_type != ''
    GROUP BY media_type
  `).all();

  mangaCounts.forEach(row => {
    const mediaType = (row.media_type || '').toLowerCase();
    if (mediaType.includes('manga') && !mediaType.includes('manhwa') && !mediaType.includes('manhua')) {
      result.manga += row.count;
    } else if (mediaType.includes('manhwa')) {
      result.manhwa += row.count;
    } else if (mediaType.includes('manhua')) {
      result.manhua += row.count;
    } else if (mediaType.includes('light novel') || mediaType.includes('novel')) {
      result.lightNovel += row.count;
    } else if (mediaType.includes('webtoon')) {
      result.webtoon += row.count;
    }
  });

  // Compter les comics (manga_series avec media_type = "Comic" ou type_volume contenant "Comic")
  // TODO: À implémenter quand la table comics sera créée
  // Pour l'instant, on peut utiliser manga_series avec media_type = "Comic"
  const comicsCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM manga_series
    WHERE LOWER(media_type) = 'comic' OR LOWER(type_volume) LIKE '%comic%'
  `).get();
  result.comics = comicsCount?.count || 0;

  // Compter les BD (manga_series avec media_type = "BD" ou type_volume contenant "BD")
  // TODO: À implémenter quand la table bd sera créée
  const bdCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM manga_series
    WHERE LOWER(media_type) = 'bd' OR LOWER(type_volume) LIKE '%bd%'
  `).get();
  result.bd = bdCount?.count || 0;

  // Compter les livres
  const booksCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM books
  `).get();
  result.books = booksCount?.count || 0;

  return result;
}

/**
 * Enregistre les handlers IPC pour la page Lectures
 */
function registerLecturesHandlers(ipcMain, getDb, store) {
  ipcMain.handle('get-available-content-types', (event) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }
      return handleGetAvailableContentTypes(db, store);
    } catch (error) {
      console.error('Erreur get-available-content-types:', error);
      throw error;
    }
  });

  // Enregistrer les handlers pour Comics et BD
  registerComicsHandlers(ipcMain, getDb, store);
  registerBdHandlers(ipcMain, getDb, store);
}

module.exports = { registerLecturesHandlers };
