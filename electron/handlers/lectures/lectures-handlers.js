/**
 * Handlers pour la page Lectures (vue globale et détection des types de contenu)
 */

const { registerComicsHandlers } = require('./comics-handlers');
const { registerBdHandlers } = require('./bd-handlers');

/**
 * Détecte les types de contenu disponibles dans la base de données
 * Retourne un objet avec les types disponibles et leur nombre
 * Exclut les séries masquées pour être cohérent avec l'affichage dans les pages
 */
function handleGetAvailableContentTypes(db, store) {
  const currentUser = store.get('currentUser', '');
  const { getUserIdByName } = require('../mangas/manga-helpers');
  const userId = getUserIdByName(db, currentUser);
  const userBinding = typeof userId === 'number' ? userId : -1;
  
  const result = {
    manga: 0,
    manhwa: 0,
    manhua: 0,
    lightNovel: 0,
    webtoon: 0,
    comics: 0,
    bd: 0,
    books: 0,
    oneShot: 0,
    unclassified: 0  // Entrées sans media_type
  };

  // Construire la condition pour exclure les séries masquées (comme dans handleGetSeries)
  const hiddenFilter = currentUser && userId 
    ? `AND (mud.is_hidden IS NULL OR mud.is_hidden = 0)`
    : '';

  // D'abord compter les comics et BD (priorité) pour éviter les doubles comptages
  // Exclure les séries masquées pour être cohérent avec l'affichage dans les pages
  const comicsQuery = `
    SELECT COUNT(*) as count
    FROM manga_series s
    LEFT JOIN manga_user_data mud ON s.id = mud.serie_id AND mud.user_id = ?
    WHERE (LOWER(s.media_type) = 'comic' OR LOWER(s.type_volume) LIKE '%comic%')
      ${hiddenFilter}
  `;
  const comicsCount = db.prepare(comicsQuery).get(userBinding);
  result.comics = comicsCount?.count || 0;

  const bdQuery = `
    SELECT COUNT(*) as count
    FROM manga_series s
    LEFT JOIN manga_user_data mud ON s.id = mud.serie_id AND mud.user_id = ?
    WHERE (LOWER(s.media_type) = 'bd' OR LOWER(s.type_volume) LIKE '%bd%')
      ${hiddenFilter}
  `;
  const bdCount = db.prepare(bdQuery).get(userBinding);
  result.bd = bdCount?.count || 0;

  // Compter les séries manga par media_type (inclure toutes les séries, même sans media_type)
  // Exclure celles déjà comptées comme comics ou BD et les séries masquées
  const mangaCountsQuery = `
    SELECT 
      s.media_type,
      COUNT(*) as count
    FROM manga_series s
    LEFT JOIN manga_user_data mud ON s.id = mud.serie_id AND mud.user_id = ?
    WHERE NOT (LOWER(COALESCE(s.media_type, '')) = 'comic' OR LOWER(COALESCE(s.type_volume, '')) LIKE '%comic%')
      AND NOT (LOWER(COALESCE(s.media_type, '')) = 'bd' OR LOWER(COALESCE(s.type_volume, '')) LIKE '%bd%')
      ${hiddenFilter}
    GROUP BY s.media_type
  `;
  const mangaCounts = db.prepare(mangaCountsQuery).all(userBinding);

  mangaCounts.forEach(row => {
    const mediaType = (row.media_type || '').toLowerCase();
    // Si media_type est NULL ou vide, compter dans "Non classé"
    if (!row.media_type || row.media_type === '') {
      result.unclassified += row.count;
    } else if (mediaType.includes('one-shot') || mediaType.includes('oneshot')) {
      result.oneShot += row.count;
    } else if (mediaType.includes('manga') && !mediaType.includes('manhwa') && !mediaType.includes('manhua')) {
      result.manga += row.count;
    } else if (mediaType.includes('manhwa')) {
      result.manhwa += row.count;
    } else if (mediaType.includes('manhua')) {
      result.manhua += row.count;
    } else if (mediaType.includes('light novel') || mediaType.includes('novel')) {
      result.lightNovel += row.count;
    } else if (mediaType.includes('webtoon')) {
      result.webtoon += row.count;
    } else {
      // Autres types non reconnus -> Non classé
      result.unclassified += row.count;
    }
  });

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
