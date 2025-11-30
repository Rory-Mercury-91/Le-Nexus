/**
 * Handlers pour les Comics (via Google Books API)
 */

const { searchBooks: searchGoogleBooks, getBookById: getGoogleBookById } = require('../../apis/google-books');
const { getUserIdByName } = require('../mangas/manga-helpers');
const { handleCreateSerie } = require('../mangas/manga-create-handlers');

/**
 * Fonction de filtrage pour identifier les comics (différent des BD)
 */
function isComic(item) {
  const title = (item.title || '').toLowerCase();
  const description = (item.description || '').toLowerCase();
  const categories = (item.categories || []).join(' ').toLowerCase();
  const publisher = (item.publisher || '').toLowerCase();
  
  // Séries comics américaines connues
  const knownComicSeries = [
    'superman', 'batman', 'spider-man', 'spiderman', 'x-men', 'xmen', 'avengers',
    'iron man', 'hulk', 'thor', 'captain america', 'wolverine', 'deadpool',
    'green lantern', 'flash', 'wonder woman', 'aquaman', 'justice league',
    'watchmen', 'sandman', 'the walking dead', 'saga', 'y: the last man',
    'fables', 'preacher', 'hellboy', 'sin city', '300', 'v for vendetta',
    'daredevil', 'punisher', 'ghost rider', 'doctor strange', 'black panther',
    'guardians of the galaxy', 'fantastic four', 'x-force', 'x-factor'
  ];
  
  // Éditeurs comics américains
  const comicPublishers = [
    'marvel', 'dc comics', 'dc', 'image comics', 'image', 'dark horse',
    'vertigo', 'idw', 'boom', 'dynamite', 'valiant', 'archie comics'
  ];
  
  // Mots-clés typiques des comics
  const comicKeywords = [
    'comic book', 'comicbook', 'graphic novel', 'superhero', 'super hero',
    'super-villain', 'supervillain', 'cape', 'powers', 'mutant', 'mutants'
  ];
  
  // Catégories Google Books typiques des comics
  const comicCategories = [
    'comics', 'comic', 'graphic novels', 'superhero', 'super hero',
    'comics & graphic novels', 'sequential art'
  ];
  
  const text = `${title} ${description} ${categories} ${publisher}`;
  
  // Priorité 1: Si c'est une série comic connue, l'inclure
  if (knownComicSeries.some(series => title.includes(series))) {
    return true;
  }
  
  // Priorité 2: Si c'est un éditeur comic connu, l'inclure
  if (comicPublishers.some(pub => publisher.includes(pub))) {
    return true;
  }
  
  // Priorité 3: Si contient des mots-clés comics explicites
  if (comicKeywords.some(keyword => text.includes(keyword))) {
    return true;
  }
  
  // Priorité 4: Si les catégories Google Books indiquent un comic
  if (comicCategories.some(cat => categories.includes(cat))) {
    return true;
  }
  
  return false;
}

/**
 * Recherche de comics sur Google Books
 */
function registerComicsHandlers(ipcMain, getDb, store) {
  ipcMain.handle('comics-search', async (event, { query, page = 1 } = {}) => {
    const searchTerm = (query || '').trim();
    if (!searchTerm) {
      return { results: [], totalResults: 0, totalPages: 0, page: 1 };
    }

    try {
      const db = getDb();
      const maxResults = 20;

      // Rechercher sur Google Books (uniquement en français)
      const googleBooksResults = await searchGoogleBooks(searchTerm, { 
        maxResults: maxResults * 2, 
        langRestrict: 'fr' // Uniquement les comics en français
      }).catch(err => {
        console.error('[Comics] Erreur recherche Google Books:', err);
        return [];
      });

      // Filtrer pour identifier les comics et vérifier la langue (français uniquement)
      const comicResults = googleBooksResults
        .filter(item => {
          // Vérifier que c'est un comic
          if (!isComic(item)) return false;
          // Vérifier que la langue est française
          const language = (item.language || '').toLowerCase();
          return language === 'fr' || language.startsWith('fr');
        })
        .slice(0, maxResults);

      // Vérifier si les comics existent déjà dans la base
      const findExistingStmt = db.prepare(`
        SELECT id FROM manga_series 
        WHERE source_id = ? AND source_donnees = 'google_books' AND media_type = 'Comic'
        LIMIT 1
      `);

      const results = comicResults.map((item) => {
        const existing = findExistingStmt.get(item.googleBooksId);
        
        return {
          source: 'google_books',
          googleBooksId: item.googleBooksId,
          title: item.title,
          subtitle: item.subtitle,
          authors: item.authors || [],
          description: item.description,
          coverUrl: item.coverUrl,
          publisher: item.publisher,
          publishedDate: item.publishedDate,
          pageCount: item.pageCount,
          categories: item.categories || [],
          isbn10: item.isbn10,
          isbn13: item.isbn13,
          sourceUrl: item.infoLink,
          inLibrary: Boolean(existing)
        };
      });

      return {
        results,
        totalResults: results.length,
        totalPages: Math.ceil(results.length / maxResults),
        page: 1
      };
    } catch (error) {
      console.error('[Comics] Erreur recherche:', error);
      throw error;
    }
  });

  /**
   * Importe un comic depuis Google Books
   */
  ipcMain.handle('comics-import-from-google-books', async (event, googleBooksId) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      // Vérifier si le comic existe déjà
      const existing = db.prepare(`
        SELECT id FROM manga_series 
        WHERE source_id = ? AND source_donnees = 'google_books' AND media_type = 'Comic'
      `).get(googleBooksId);

      if (existing) {
        return { success: false, error: 'Ce comic est déjà dans votre collection', alreadyExists: true, serieId: existing.id };
      }

      // Récupérer les détails du comic
      const comicData = await getGoogleBookById(googleBooksId);

      // Extraire l'année de publication
      let year = null;
      if (comicData.publishedDate) {
        const yearMatch = comicData.publishedDate.match(/\d{4}/);
        if (yearMatch) {
          year = parseInt(yearMatch[0], 10);
        }
      }

      // Créer la série avec media_type = 'Comic'
      const serieData = {
        titre: comicData.title || 'Sans titre',
        statut: 'En cours',
        type_volume: 'Broché',
        type_contenu: 'volume',
        couverture_url: comicData.coverUrl || null,
        description: comicData.description || null,
        statut_publication: null,
        statut_publication_vf: null,
        annee_publication: year || null,
        annee_vf: null,
        genres: comicData.categories ? (Array.isArray(comicData.categories) ? comicData.categories.join(', ') : comicData.categories) : null,
        nb_volumes: null,
        nb_volumes_vf: null,
        nb_chapitres: null,
        nb_chapitres_vf: null,
        langue_originale: comicData.language || 'en',
        demographie: null,
        editeur: comicData.publisher || null,
        editeur_vo: null,
        themes: null,
        serialization: null,
        auteurs: comicData.authors ? (Array.isArray(comicData.authors) ? comicData.authors.join(', ') : comicData.authors) : null,
        media_type: 'Comic',
        date_debut: year ? `${year}-01-01` : null,
        date_fin: null,
        source_id: comicData.googleBooksId || null,
        source_url: comicData.infoLink || null,
        source_donnees: 'google_books'
      };

      try {
        const serieId = await handleCreateSerie(db, () => null, store, serieData);
        
        if (serieId && typeof serieId === 'number') {
          return { success: true, serieId };
        } else {
          return { success: false, error: 'Erreur lors de la création : ID invalide' };
        }
      } catch (createError) {
        console.error('[Comics] Erreur création série:', createError);
        return { success: false, error: createError.message || 'Erreur lors de la création de la série' };
      }
    } catch (error) {
      console.error('[Comics] Erreur import:', error);
      return { success: false, error: error.message || 'Erreur lors de l\'import' };
    }
  });
}

module.exports = { registerComicsHandlers };
