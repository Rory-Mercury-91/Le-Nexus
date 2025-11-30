/**
 * Handlers pour les BD (via BNF API et Google Books)
 */

const { searchBooks: searchBnfBooks, getBookById: getBnfBookById } = require('../../apis/bnf');
const { searchBooks: searchGoogleBooks, getBookById: getGoogleBookById } = require('../../apis/google-books');
const { getUserIdByName } = require('../mangas/manga-helpers');
const { handleCreateSerie } = require('../mangas/manga-create-handlers');

/**
 * Recherche de BD sur BNF
 */
function registerBdHandlers(ipcMain, getDb, store) {
  ipcMain.handle('bd-search', async (event, { query, page = 1 } = {}) => {
    const searchTerm = (query || '').trim();
    if (!searchTerm) {
      return { results: [], totalResults: 0, totalPages: 0, page: 1 };
    }

    try {
      const db = getDb();
      const maxResults = 20;

      // Rechercher sur BNF et Google Books en parallèle
      const [bnfResults, googleBooksResults] = await Promise.all([
        searchBnfBooks(searchTerm, { maxResults: maxResults * 2 }).catch(err => {
          console.error('[BD] Erreur recherche BNF:', err);
          return [];
        }),
        searchGoogleBooks(searchTerm, { maxResults: maxResults * 2, langRestrict: 'fr' }).catch(err => {
          console.error('[BD] Erreur recherche Google Books:', err);
          return [];
        })
      ]);

      // Fonction de filtrage pour détecter les BD
      const isBd = (item) => {
        const title = (item.title || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const categories = (item.categories || []).join(' ').toLowerCase();
        const publisher = (item.publisher || '').toLowerCase();
        
        // Séries BD connues (à inclure même sans mot-clé explicite)
        const knownBdSeries = [
          'tintin', 'asterix', 'lucky luke', 'gaston', 'spirou', 'schtroumpf',
          'blake et mortimer', 'alix', 'thorgal', 'lanfeust', 'donjon',
          'blueberry', 'corto maltese', 'valérian', 'persepolis', 'maus',
          'watchmen', 'sandman', 'batman', 'superman', 'spider-man',
          'x-men', 'avengers', 'one piece', 'naruto', 'dragon ball'
        ];
        
        // Éditeurs BD français
        const bdPublishers = [
          'casterman', 'dargaud', 'dupuis', 'glénat', 'delcourt', 'soleil',
          'bamboo', 'vents d\'ouest', 'humanoïdes associés', 'futuropolis'
        ];
        
        // Mots-clés typiques des BD
        const bdKeywords = [
          'bande dessinée', 'bd', 'comic', 'graphic novel', 'manga', 
          'album', 'album illustré', 'comics', 'bande dessinée jeunesse'
        ];
        
        // Mots-clés à exclure (livres non-BD) - seulement si très explicite
        const excludeKeywords = [
          'roman historique', 'nouvelle littéraire', 'poésie', 'théâtre classique',
          'essai philosophique', 'biographie complète', 'autobiographie littéraire'
        ];
        
        const text = `${title} ${description} ${categories} ${publisher}`;
        
        // Priorité 1: Si c'est une série BD connue, l'inclure
        if (knownBdSeries.some(series => title.includes(series))) {
          return true;
        }
        
        // Priorité 2: Si c'est un éditeur BD connu, l'inclure
        if (bdPublishers.some(pub => publisher.includes(pub))) {
          return true;
        }
        
        // Priorité 3: Si contient des mots-clés BD explicites
        if (bdKeywords.some(keyword => text.includes(keyword))) {
          return true;
        }
        
        // Exclure seulement si c'est très clairement pas une BD
        if (excludeKeywords.some(keyword => text.includes(keyword))) {
          return false;
        }
        
        // Par défaut, inclure si le titre est court (typique des BD) ou si c'est un album
        // Les BD ont souvent des titres courts et sont souvent classées comme "albums"
        if (title.length < 50 && (categories.includes('album') || title.match(/^(tome|vol\.?|n°|numéro)\s*\d+/i))) {
          return true;
        }
        
        return false;
      };

      // Filtrer les résultats BNF
      const bdResultsBnf = bnfResults.filter(isBd).slice(0, maxResults);
      
      // Filtrer les résultats Google Books
      const bdResultsGoogle = googleBooksResults.filter(item => {
        const title = (item.title || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const categories = (item.categories || []).join(' ').toLowerCase();
        const publisher = (item.publisher || '').toLowerCase();
        
        return isBd({
          title: item.title,
          description: item.description,
          categories: item.categories,
          publisher: item.publisher
        });
      }).slice(0, maxResults);

      // Vérifier si les BD existent déjà dans la base
      const findExistingStmt = db.prepare(`
        SELECT id FROM manga_series 
        WHERE (source_id = ? AND source_donnees = ?) OR (media_type = 'BD' AND LOWER(titre) = LOWER(?))
        LIMIT 1
      `);

      // Mapper les résultats BNF
      const resultsBnf = bdResultsBnf.map((item) => {
        const existing = findExistingStmt.get(item.bnfId, 'bnf', item.title);
        return {
          source: 'bnf',
          bnfId: item.bnfId,
          title: item.title,
          authors: item.authors,
          description: item.description,
          coverUrl: item.coverUrl,
          publisher: item.publisher,
          publishedDate: item.publishedDate,
          isbn: item.isbn10 || item.isbn13,
          sourceUrl: item.infoLink || item.sourceUrl,
          inLibrary: Boolean(existing)
        };
      });

      // Mapper les résultats Google Books
      const resultsGoogle = bdResultsGoogle.map((item) => {
        const googleBooksId = item.googleBooksId;
        const existing = findExistingStmt.get(googleBooksId, 'google_books', item.title);
        return {
          source: 'google_books',
          googleBooksId: googleBooksId,
          title: item.title,
          authors: item.authors || [],
          description: item.description,
          coverUrl: item.coverUrl,
          publisher: item.publisher,
          publishedDate: item.publishedDate,
          isbn: item.isbn10 || item.isbn13,
          sourceUrl: item.infoLink,
          inLibrary: Boolean(existing)
        };
      });

      // Fusionner les résultats en évitant les doublons (par ISBN ou titre similaire)
      const results = [];
      const addedIsbns = new Set();
      const addedTitles = new Set();

      // Ajouter d'abord les résultats BNF
      resultsBnf.forEach(item => {
        const isbn = item.isbn;
        const titleKey = item.title.toLowerCase().trim();
        if ((!isbn || !addedIsbns.has(isbn)) && !addedTitles.has(titleKey)) {
          results.push(item);
          if (isbn) addedIsbns.add(isbn);
          addedTitles.add(titleKey);
        }
      });

      // Ajouter les résultats Google Books (éviter les doublons)
      resultsGoogle.forEach(item => {
        const isbn = item.isbn;
        const titleKey = item.title.toLowerCase().trim();
        if ((!isbn || !addedIsbns.has(isbn)) && !addedTitles.has(titleKey)) {
          results.push(item);
          if (isbn) addedIsbns.add(isbn);
          addedTitles.add(titleKey);
        }
      });

      // Limiter au nombre de résultats demandés
      const finalResults = results.slice(0, maxResults);

      return {
        results: finalResults,
        totalResults: finalResults.length,
        totalPages: Math.ceil(finalResults.length / maxResults),
        page: 1
      };
    } catch (error) {
      console.error('[BD] Erreur recherche:', error);
      throw error;
    }
  });

  /**
   * Importe une BD depuis BNF
   */
  ipcMain.handle('bd-import-from-bnf', async (event, bnfId) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      // Vérifier si la BD existe déjà (utiliser source_id et source_donnees)
      const existing = db.prepare(`
        SELECT id FROM manga_series 
        WHERE source_id = ? AND source_donnees = 'bnf'
      `).get(bnfId);

      if (existing) {
        return { success: false, error: 'Cette BD est déjà dans votre collection', alreadyExists: true, serieId: existing.id };
      }

      // Récupérer les détails de la BD
      const bdData = await getBnfBookById(bnfId);

      // Extraire l'année de publication
      let year = null;
      if (bdData.publishedDate) {
        const yearMatch = bdData.publishedDate.match(/\d{4}/);
        if (yearMatch) {
          year = parseInt(yearMatch[0], 10);
        }
      }

      // Créer la série avec media_type = 'BD'
      const serieData = {
        titre: bdData.title || 'Sans titre',
        statut: 'En cours',
        type_volume: 'Broché',
        type_contenu: 'volume',
        couverture_url: bdData.coverUrl || null,
        description: bdData.description || null,
        statut_publication: null,
        statut_publication_vf: null,
        annee_publication: year || null,
        annee_vf: null,
        genres: bdData.categories ? (Array.isArray(bdData.categories) ? bdData.categories.join(', ') : bdData.categories) : null,
        nb_volumes: null,
        nb_volumes_vf: null,
        nb_chapitres: null,
        nb_chapitres_vf: null,
        langue_originale: 'fr',
        demographie: null,
        editeur: bdData.publisher || null,
        editeur_vo: null,
        themes: null,
        serialization: null,
        auteurs: bdData.authors ? (Array.isArray(bdData.authors) ? bdData.authors.join(', ') : bdData.authors) : null,
        media_type: 'BD',
        date_debut: year ? `${year}-01-01` : null,
        date_fin: null,
        source_id: bdData.bnfId || null,
        source_url: bdData.sourceUrl || bdData.infoLink || null,
        source_donnees: 'bnf'
      };

      try {
        const serieId = await handleCreateSerie(db, () => null, store, serieData);
        
        if (serieId && typeof serieId === 'number') {
          return { success: true, serieId };
        } else {
          return { success: false, error: 'Erreur lors de la création : ID invalide' };
        }
      } catch (createError) {
        console.error('[BD] Erreur création série BNF:', createError);
        return { success: false, error: createError.message || 'Erreur lors de la création de la série' };
      }
    } catch (error) {
      console.error('[BD] Erreur import:', error);
      return { success: false, error: error.message || 'Erreur lors de l\'import' };
    }
  });

  /**
   * Importe une BD depuis Google Books
   */
  ipcMain.handle('bd-import-from-google-books', async (event, googleBooksId) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      // Vérifier si la BD existe déjà
      const existing = db.prepare(`
        SELECT id FROM manga_series 
        WHERE source_id = ? AND source_donnees = 'google_books'
      `).get(googleBooksId);

      if (existing) {
        return { success: false, error: 'Cette BD est déjà dans votre collection', alreadyExists: true, serieId: existing.id };
      }

      // Récupérer les détails de la BD
      const bdData = await getGoogleBookById(googleBooksId);

      // Extraire l'année de publication
      let year = null;
      if (bdData.publishedDate) {
        const yearMatch = bdData.publishedDate.match(/\d{4}/);
        if (yearMatch) {
          year = parseInt(yearMatch[0], 10);
        }
      }

      // Créer la série avec media_type = 'BD'
      const serieData = {
        titre: bdData.title || 'Sans titre',
        statut: 'En cours',
        type_volume: 'Broché',
        type_contenu: 'volume',
        couverture_url: bdData.coverUrl || null,
        description: bdData.description || null,
        statut_publication: null,
        statut_publication_vf: null,
        annee_publication: year || null,
        annee_vf: null,
        genres: bdData.categories ? (Array.isArray(bdData.categories) ? bdData.categories.join(', ') : bdData.categories) : null,
        nb_volumes: null,
        nb_volumes_vf: null,
        nb_chapitres: null,
        nb_chapitres_vf: null,
        langue_originale: bdData.language || 'fr',
        demographie: null,
        editeur: bdData.publisher || null,
        editeur_vo: null,
        themes: null,
        serialization: null,
        auteurs: bdData.authors ? (Array.isArray(bdData.authors) ? bdData.authors.join(', ') : bdData.authors) : null,
        media_type: 'BD',
        date_debut: year ? `${year}-01-01` : null,
        date_fin: null,
        source_id: bdData.googleBooksId || null,
        source_url: bdData.infoLink || null,
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
        console.error('[BD] Erreur création série Google Books:', createError);
        return { success: false, error: createError.message || 'Erreur lors de la création de la série' };
      }
    } catch (error) {
      console.error('[BD] Erreur import Google Books:', error);
      return { success: false, error: error.message || 'Erreur lors de l\'import' };
    }
  });
}

module.exports = { registerBdHandlers };
