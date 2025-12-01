const { getUserIdByName, safeJsonParse } = require('../common-helpers');
const { createToggleFavoriteHandler, createToggleHiddenHandler, createSetStatusHandler } = require('../common/item-action-helpers');
const { registerBookLabelsHandlers } = require('./labels-handlers');
const { ensureBookUserDataRow } = require('./book-helpers');
const { mapCategoriesToBookType } = require('./book-type-mapper');
const googleBooks = require('../../apis/google-books');
const openLibrary = require('../../apis/open-library');
const bnf = require('../../apis/bnf');

// Helper pour s'assurer que les colonnes existent
function ensureBookColumns(db) {
  const Database = require('../../services/database');
  // Utiliser la fonction ensureColumn via une référence directe
  const columns = db.prepare('PRAGMA table_info(books)').all();
  const columnNames = columns.map(col => col.name);
  
  if (!columnNames.includes('prix_suggere')) {
    try {
      db.prepare('ALTER TABLE books ADD COLUMN prix_suggere REAL').run();
      console.log('✅ Colonne prix_suggere ajoutée à books');
    } catch (error) {
      console.warn('⚠️ Impossible d\'ajouter la colonne prix_suggere:', error.message);
    }
  }
  
  if (!columnNames.includes('devise')) {
    try {
      db.prepare('ALTER TABLE books ADD COLUMN devise TEXT').run();
      console.log('✅ Colonne devise ajoutée à books');
    } catch (error) {
      console.warn('⚠️ Impossible d\'ajouter la colonne devise:', error.message);
    }
  }
}

function registerBookHandlers(ipcMain, getDb, store) {
  // GET - Récupérer tous les livres
  ipcMain.handle('books-get', (event, filters = {}) => {
    const db = getDb();
    // S'assurer que les colonnes existent
    ensureBookColumns(db);
    const currentUser = store.get('currentUser', '');
    const userId = currentUser ? getUserIdByName(db, currentUser) : null;

    const {
      search,
      statut_lecture,
      type_livre,
      genres,
      show_favorite_only,
      show_hidden,
      orderBy = 'titre',
      sort = 'ASC',
      limit = filters.limit ?? 500,
      offset = filters.offset ?? 0
    } = filters;

    const clauses = [];
    const params = [userId || -1];

    if (search) {
      clauses.push('(LOWER(b.titre) LIKE ? OR LOWER(b.titre_original) LIKE ? OR LOWER(b.auteur) LIKE ? OR LOWER(b.auteurs) LIKE ?)');
      const like = `%${search.toLowerCase()}%`;
      params.push(like, like, like, like);
    }

    if (statut_lecture) {
      clauses.push('bud.statut_lecture = ?');
      params.push(statut_lecture);
    }

    if (type_livre) {
      clauses.push('b.type_livre = ?');
      params.push(type_livre);
    }

    if (genres && Array.isArray(genres) && genres.length > 0) {
      const genreConditions = genres.map(() => 'b.genres LIKE ?').join(' AND ');
      clauses.push(`(${genreConditions})`);
      genres.forEach(genre => params.push(`%${genre}%`));
    }

    if (show_favorite_only) {
      clauses.push('bud.is_favorite = 1');
    }

    if (!show_hidden) {
      clauses.push('(bud.is_hidden = 0 OR bud.is_hidden IS NULL)');
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    
    // Mapping sécurisé des colonnes ORDER BY
    const orderColumnMap = {
      'titre': 'b.titre',
      'date_publication': 'b.date_publication',
      'auteur': 'b.auteur',
      'created_at': 'b.created_at'
    };
    const sortDirectionMap = {
      'ASC': 'ASC',
      'DESC': 'DESC'
    };
    
    const safeOrderColumn = orderColumnMap[orderBy] || orderColumnMap['titre'];
    const safeSortDirection = sortDirectionMap[sort] || 'ASC';

    const stmt = db.prepare(`
      SELECT
        b.id, b.titre, b.titre_original, b.auteur, b.auteurs, b.isbn, b.isbn13, b.editeur,
        b.date_publication, b.date_publication_originale, b.nombre_pages, b.langue, b.langue_originale,
        b.type_livre, b.genres, b.description, b.couverture_url, b.google_books_id, b.open_library_id,
        b.bnf_id, b.source_donnees, b.source_url, b.score AS score_moyen, b.nb_votes, b.rating,
        b.prix_suggere, b.devise, b.user_modified_fields, b.created_at, b.updated_at,
        bud.statut_lecture,
        bud.score,
        bud.date_debut,
        bud.date_fin,
        COALESCE(bud.is_favorite, 0) AS is_favorite,
        COALESCE(bud.is_hidden, 0) AS is_hidden,
        bud.notes_privees,
        bud.labels,
        bud.display_preferences,
        -- Propriétaires avec prix
        (SELECT GROUP_CONCAT(
          json_object(
            'id', u.id,
            'name', u.name,
            'color', u.color,
            'prix', bp.prix,
            'date_achat', bp.date_achat
          )
        )
        FROM book_proprietaires bp
        JOIN users u ON bp.user_id = u.id
        WHERE bp.book_id = b.id) as proprietaires_json
      FROM books b
      LEFT JOIN book_user_data bud ON b.id = bud.book_id AND bud.user_id = ?
      ${where}
      ORDER BY ${safeOrderColumn} ${safeSortDirection}
      LIMIT ?
      OFFSET ?
    `);

    const results = stmt.all(...params, limit, offset).map((book) => {
      // Parser les données JSON
      const auteurs = safeJsonParse(book.auteurs, null);
      const genres = book.genres ? (book.genres.includes('[') ? safeJsonParse(book.genres, []) : book.genres.split(',').map(g => g.trim())) : [];
      const labels = safeJsonParse(book.labels, []);
      const display_preferences = safeJsonParse(book.display_preferences, {});
      
      // Parser les propriétaires
      let proprietaires = [];
      if (book.proprietaires_json) {
        try {
          const props = book.proprietaires_json.split(',').map(p => {
            try {
              return JSON.parse(p);
            } catch {
              return null;
            }
          }).filter(Boolean);
          proprietaires = props;
        } catch {
          proprietaires = [];
        }
      }

      // Calculer le prix total
      const prix_total = proprietaires.reduce((sum, p) => sum + (p.prix || 0), 0);

      return {
        ...book,
        auteurs: auteurs || (book.auteur ? [book.auteur] : []),
        genres,
        labels,
        display_preferences,
        proprietaires,
        prix_total,
        is_favorite: Boolean(book.is_favorite),
        is_hidden: Boolean(book.is_hidden)
      };
    });

    return results;
  });

  // GET - Récupérer un livre par ID
  ipcMain.handle('books-get-detail', (event, bookId) => {
    const db = getDb();
    // S'assurer que les colonnes existent
    ensureBookColumns(db);
    const currentUser = store.get('currentUser', '');
    const userId = currentUser ? getUserIdByName(db, currentUser) : null;

    const row = db.prepare(`
      SELECT
        b.id, b.titre, b.titre_original, b.auteur, b.auteurs, b.isbn, b.isbn13, b.editeur,
        b.date_publication, b.date_publication_originale, b.nombre_pages, b.langue, b.langue_originale,
        b.type_livre, b.genres, b.description, b.couverture_url, b.google_books_id, b.open_library_id,
        b.bnf_id, b.source_donnees, b.source_url, b.score AS score_moyen, b.nb_votes, b.rating,
        b.prix_suggere, b.devise, b.user_modified_fields, b.created_at, b.updated_at,
        bud.statut_lecture,
        bud.score,
        bud.date_debut,
        bud.date_fin,
        COALESCE(bud.is_favorite, 0) AS is_favorite,
        COALESCE(bud.is_hidden, 0) AS is_hidden,
        bud.notes_privees,
        bud.labels,
        bud.display_preferences
      FROM books b
      LEFT JOIN book_user_data bud ON b.id = bud.book_id AND bud.user_id = ?
      WHERE b.id = ?
    `).get(userId || -1, bookId);

    if (!row) {
      return null;
    }

    // Récupérer les propriétaires avec prix
    const proprietaires = db.prepare(`
      SELECT
        u.id,
        u.name,
        u.color,
        bp.prix,
        bp.date_achat
      FROM book_proprietaires bp
      JOIN users u ON bp.user_id = u.id
      WHERE bp.book_id = ?
    `).all(bookId);

    // Parser les données JSON
    const auteurs = safeJsonParse(row.auteurs, null);
    const genres = row.genres ? (row.genres.includes('[') ? safeJsonParse(row.genres, []) : row.genres.split(',').map(g => g.trim())) : [];
    const labels = safeJsonParse(row.labels, []);
    const display_preferences = safeJsonParse(row.display_preferences, {});

    return {
      ...row,
      auteurs: auteurs || (row.auteur ? [row.auteur] : []),
      genres,
      labels,
      display_preferences,
      proprietaires,
      prix_total: proprietaires.reduce((sum, p) => sum + (p.prix || 0), 0),
      is_favorite: Boolean(row.is_favorite),
      is_hidden: Boolean(row.is_hidden)
    };
  });

  // CREATE - Créer un livre
  ipcMain.handle('books-create', (event, bookData) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const toJson = (value) => {
        if (value === undefined || value === null) return null;
        if (Array.isArray(value)) return JSON.stringify(value);
        try {
          return JSON.stringify(value);
        } catch {
          return null;
        }
      };

      const insertStmt = db.prepare(`
        INSERT INTO books (
          titre, titre_original, auteur, auteurs, isbn, isbn13, editeur,
          date_publication, date_publication_originale, nombre_pages,
          langue, langue_originale, type_livre, genres, description,
          couverture_url, google_books_id, open_library_id, bnf_id,
          source_donnees, source_url, score, nb_votes, rating,
          prix_suggere, devise, user_modified_fields
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertStmt.run(
        bookData.titre || '',
        bookData.titre_original || null,
        bookData.auteur || null,
        toJson(bookData.auteurs || (bookData.auteur ? [bookData.auteur] : null)),
        bookData.isbn || null,
        bookData.isbn13 || null,
        bookData.editeur || null,
        bookData.date_publication || null,
        bookData.date_publication_originale || null,
        bookData.nombre_pages || null,
        bookData.langue || null,
        bookData.langue_originale || null,
        bookData.type_livre || null,
        toJson(bookData.genres || []),
        bookData.description || null,
        bookData.couverture_url || null,
        bookData.google_books_id || null,
        bookData.open_library_id || null,
        bookData.bnf_id || null,
        bookData.source_donnees || 'manual',
        bookData.source_url || null,
        bookData.score || null,
        bookData.nb_votes || null,
        bookData.rating || null,
        bookData.prix_suggere || null,
        bookData.devise || null,
        toJson(bookData.user_modified_fields || [])
      );

      const bookId = result.lastInsertRowid;

      // Créer la ligne user_data
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          ensureBookUserDataRow(db, bookId, userId);
        }
      }

      // Ajouter les propriétaires si fournis
      if (bookData.proprietaires && Array.isArray(bookData.proprietaires) && bookData.proprietaires.length > 0) {
        const insertPropStmt = db.prepare(`
          INSERT INTO book_proprietaires (book_id, user_id, prix, date_achat, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        
        bookData.proprietaires.forEach(prop => {
          insertPropStmt.run(bookId, prop.user_id, prop.prix || 0, prop.date_achat || null);
        });
      }

      return { success: true, bookId };
    } catch (error) {
      console.error('[Books] Erreur lors de la création:', error);
      return { success: false, error: error.message };
    }
  });

  // UPDATE - Mettre à jour un livre
  ipcMain.handle('books-update', (event, { bookId, bookData }) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const toJson = (value) => {
        if (value === undefined || value === null) return null;
        if (Array.isArray(value)) return JSON.stringify(value);
        try {
          return JSON.stringify(value);
        } catch {
          return null;
        }
      };

      const updateStmt = db.prepare(`
        UPDATE books SET
          titre = COALESCE(?, titre),
          titre_original = COALESCE(?, titre_original),
          auteur = COALESCE(?, auteur),
          auteurs = COALESCE(?, auteurs),
          isbn = COALESCE(?, isbn),
          isbn13 = COALESCE(?, isbn13),
          editeur = COALESCE(?, editeur),
          date_publication = COALESCE(?, date_publication),
          date_publication_originale = COALESCE(?, date_publication_originale),
          nombre_pages = COALESCE(?, nombre_pages),
          langue = COALESCE(?, langue),
          langue_originale = COALESCE(?, langue_originale),
          type_livre = COALESCE(?, type_livre),
          genres = COALESCE(?, genres),
          description = COALESCE(?, description),
          couverture_url = COALESCE(?, couverture_url),
          updated_at = datetime('now')
        WHERE id = ?
      `);

      updateStmt.run(
        bookData.titre || null,
        bookData.titre_original || null,
        bookData.auteur || null,
        toJson(bookData.auteurs || (bookData.auteur ? [bookData.auteur] : null)),
        bookData.isbn || null,
        bookData.isbn13 || null,
        bookData.editeur || null,
        bookData.date_publication || null,
        bookData.date_publication_originale || null,
        bookData.nombre_pages || null,
        bookData.langue || null,
        bookData.langue_originale || null,
        bookData.type_livre || null,
        toJson(bookData.genres || []),
        bookData.description || null,
        bookData.couverture_url || null,
        bookId
      );

      return { success: true };
    } catch (error) {
      console.error('[Books] Erreur lors de la mise à jour:', error);
      return { success: false, error: error.message };
    }
  });

  // DELETE - Supprimer un livre
  ipcMain.handle('books-delete', (event, bookId) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      // Vérifier que le livre existe
      const book = db.prepare('SELECT id, titre FROM books WHERE id = ?').get(bookId);
      if (!book) {
        return { success: false, error: 'Livre introuvable' };
      }

      // La suppression en cascade s'occupe des relations
      db.prepare('DELETE FROM books WHERE id = ?').run(bookId);

      console.log(`✅ Livre supprimé (ID: ${bookId}, Titre: ${book.titre})`);
      return { success: true };
    } catch (error) {
      console.error('[Books] Erreur lors de la suppression:', error);
      return { success: false, error: error.message };
    }
  });

  // Handlers pour les propriétaires
  ipcMain.handle('books-add-proprietaire', (event, { bookId, userId, prix, dateAchat }) => {
    try {
      const db = getDb();
      const existing = db.prepare('SELECT id FROM book_proprietaires WHERE book_id = ? AND user_id = ?').get(bookId, userId);
      
      if (existing) {
        // Mettre à jour
        db.prepare(`
          UPDATE book_proprietaires
          SET prix = ?, date_achat = ?, updated_at = datetime('now')
          WHERE book_id = ? AND user_id = ?
        `).run(prix || 0, dateAchat || null, bookId, userId);
      } else {
        // Créer
        db.prepare(`
          INSERT INTO book_proprietaires (book_id, user_id, prix, date_achat, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(bookId, userId, prix || 0, dateAchat || null);
      }

      return { success: true };
    } catch (error) {
      console.error('[Books] Erreur lors de l\'ajout du propriétaire:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('books-remove-proprietaire', (event, { bookId, userId }) => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM book_proprietaires WHERE book_id = ? AND user_id = ?').run(bookId, userId);
      return { success: true };
    } catch (error) {
      console.error('[Books] Erreur lors de la suppression du propriétaire:', error);
      return { success: false, error: error.message };
    }
  });

  // Marquer un livre comme "Lu" (change le statut à "Terminé")
  ipcMain.handle('books-mark-as-read', async (event, bookId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const userId = currentUser ? getUserIdByName(db, currentUser) : null;

      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      ensureBookUserDataRow(db, bookId, userId);
      
      db.prepare(`
        UPDATE book_user_data
        SET statut_lecture = 'Terminé', updated_at = CURRENT_TIMESTAMP
        WHERE book_id = ? AND user_id = ?
      `).run(bookId, userId);

      // Émettre un événement pour mettre à jour l'UI (via le système d'événements IPC)
      // L'événement sera géré par le frontend via useDetailPage
      return { success: true, statut: 'Terminé' };
    } catch (error) {
      console.error('[Books] Erreur lors du marquage comme lu:', error);
      return { success: false, error: error.message };
    }
  });

  // Marquer un livre comme "Possédé" (ajoute l'utilisateur dans book_proprietaires)
  ipcMain.handle('books-mark-as-owned', async (event, { bookId, prix, dateAchat, partageAvec }) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const userId = currentUser ? getUserIdByName(db, currentUser) : null;

      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // Récupérer le prix suggéré si pas de prix fourni
      let prixFinal = prix;
      if (!prixFinal) {
        const book = db.prepare('SELECT prix_suggere FROM books WHERE id = ?').get(bookId);
        prixFinal = book?.prix_suggere || 0;
      }

      // Liste des utilisateurs qui possèdent le livre (utilisateur actuel + partage)
      const userIds = [userId];
      if (partageAvec && Array.isArray(partageAvec) && partageAvec.length > 0) {
        userIds.push(...partageAvec);
      }

      // Calculer le prix par utilisateur (diviser le prix total)
      const prixParUtilisateur = prixFinal / userIds.length;

      // Ajouter/mettre à jour chaque propriétaire
      for (const propUserId of userIds) {
        const existing = db.prepare('SELECT id FROM book_proprietaires WHERE book_id = ? AND user_id = ?').get(bookId, propUserId);
        
        if (existing) {
          // Mettre à jour
          db.prepare(`
            UPDATE book_proprietaires
            SET prix = ?, date_achat = ?, updated_at = datetime('now')
            WHERE book_id = ? AND user_id = ?
          `).run(prixParUtilisateur, dateAchat || null, bookId, propUserId);
        } else {
          // Créer
          db.prepare(`
            INSERT INTO book_proprietaires (book_id, user_id, prix, date_achat, created_at, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
          `).run(bookId, propUserId, prixParUtilisateur, dateAchat || null);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('[Books] Erreur lors du marquage comme possédé:', error);
      return { success: false, error: error.message };
    }
  });

  // Handlers génériques pour les actions communes
  ipcMain.handle('books-set-status', createSetStatusHandler({
    getDb,
    store,
    itemIdParamName: 'bookId',
    statusTableName: 'book_user_data',
    itemIdColumnName: 'book_id',
    ensureStatusRowFn: ensureBookUserDataRow,
    buildUpdateQuery: (tableName, itemIdColumnName) => `
      UPDATE ${tableName}
      SET
        statut_lecture = ?,
        score = ?,
        date_debut = ?,
        date_fin = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE ${itemIdColumnName} = ? AND user_id = ?
    `,
    buildUpdateParams: (params, itemId, userId) => [
      params.statut || 'À lire',
      params.score ?? null,
      params.dateDebut || null,
      params.dateFin || null,
      itemId,
      userId
    ]
  }));

  ipcMain.handle('books-toggle-favorite', createToggleFavoriteHandler({
    getDb,
    store,
    itemIdParamName: 'bookId',
    statusTableName: 'book_user_data',
    itemIdColumnName: 'book_id',
    ensureStatusRowFn: ensureBookUserDataRow
  }));

  ipcMain.handle('books-toggle-hidden', createToggleHiddenHandler({
    getDb,
    store,
    itemIdParamName: 'bookId',
    statusTableName: 'book_user_data',
    itemIdColumnName: 'book_id',
    ensureStatusRowFn: ensureBookUserDataRow
  }));

  // Enregistrer les handlers de labels
  registerBookLabelsHandlers(ipcMain, getDb, store);

  // Recherche de livres sur Google Books et Open Library
  ipcMain.handle('books-search', async (event, { query, source = 'google_books', page = 1 } = {}) => {
    const searchTerm = (query || '').trim();
    if (!searchTerm) {
      return { results: [], totalResults: 0, totalPages: 0, page: 1 };
    }

    try {
      const db = getDb();
      const maxResults = 20;

      let results = [];
      let totalResults = 0;

      if (source === 'google_books' || source === 'all') {
        try {
          const googleResults = await googleBooks.searchBooks(searchTerm, { maxResults, langRestrict: 'fr' });
          
          // Vérifier si les livres existent déjà dans la base
          const findExistingStmt = db.prepare(`
            SELECT id FROM books 
            WHERE google_books_id = ? OR isbn = ? OR isbn13 = ?
            LIMIT 1
          `);

          results = googleResults.map((item) => {
            const existing = findExistingStmt.get(item.googleBooksId, item.isbn10, item.isbn13);
            return {
              source: 'google_books',
              googleBooksId: item.googleBooksId,
              title: item.title,
              originalTitle: item.originalTitle,
              subtitle: item.subtitle,
              authors: item.authors,
              mainAuthor: item.mainAuthor,
              publisher: item.publisher,
              publishedDate: item.publishedDate,
              pageCount: item.pageCount,
              language: item.language,
              description: item.description,
              categories: item.categories,
              isbn10: item.isbn10,
              isbn13: item.isbn13,
              coverUrl: item.coverUrl,
              previewLink: item.previewLink,
              infoLink: item.infoLink,
              averageRating: item.averageRating,
              ratingsCount: item.ratingsCount,
              inLibrary: Boolean(existing)
            };
          });
          totalResults = googleResults.length;
        } catch (error) {
          console.error('[Google Books] Search error:', error);
          // Continue avec Open Library si Google Books échoue
        }
      }

      if (source === 'open_library' || (source === 'all' && results.length < maxResults)) {
        try {
          const openLibResults = await openLibrary.searchBooks(searchTerm, { limit: maxResults });
          
          const findExistingStmt = db.prepare(`
            SELECT id FROM books 
            WHERE open_library_id = ? OR isbn = ? OR isbn13 = ?
            LIMIT 1
          `);

          const openLibMapped = openLibResults.map((item) => {
            const existing = findExistingStmt.get(item.openLibraryId, item.isbn10, item.isbn13);
            return {
              source: 'open_library',
              openLibraryId: item.openLibraryId,
              title: item.title,
              originalTitle: item.originalTitle,
              subtitle: item.subtitle,
              authors: item.authors,
              mainAuthor: item.mainAuthor,
              publisher: item.publisher,
              publishedDate: item.publishedDate,
              pageCount: item.pageCount,
              language: item.language,
              description: item.description,
              categories: item.categories,
              isbn10: item.isbn10,
              isbn13: item.isbn13,
              coverUrl: item.coverUrl,
              previewLink: item.previewLink,
              infoLink: item.infoLink,
              averageRating: item.averageRating,
              ratingsCount: item.ratingsCount,
              inLibrary: Boolean(existing)
            };
          });

          if (source === 'all') {
            // Fusionner les résultats en évitant les doublons (par ISBN)
            const existingIsbns = new Set(results.map(r => r.isbn13 || r.isbn10).filter(Boolean));
            openLibMapped.forEach(item => {
              const itemIsbn = item.isbn13 || item.isbn10;
              if (!itemIsbn || !existingIsbns.has(itemIsbn)) {
                results.push(item);
                if (itemIsbn) existingIsbns.add(itemIsbn);
              }
            });
          } else {
            results = openLibMapped;
          }
          totalResults = Math.max(totalResults, openLibResults.length);
        } catch (error) {
          console.error('[Open Library] Search error:', error);
        }
      }

      if (source === 'bnf' || (source === 'all' && results.length < maxResults)) {
        try {
          const bnfResults = await bnf.searchBooks(searchTerm, { maxResults });
          
          const findExistingStmt = db.prepare(`
            SELECT id FROM books 
            WHERE bnf_id = ? OR isbn = ? OR isbn13 = ?
            LIMIT 1
          `);

          const bnfMapped = bnfResults.map((item) => {
            const existing = findExistingStmt.get(item.bnfId, item.isbn10, item.isbn13);
            return {
              source: 'bnf',
              bnfId: item.bnfId,
              title: item.title,
              originalTitle: item.originalTitle,
              subtitle: item.subtitle,
              authors: item.authors,
              mainAuthor: item.mainAuthor,
              publisher: item.publisher,
              publishedDate: item.publishedDate,
              pageCount: item.pageCount,
              language: item.language,
              description: item.description,
              categories: item.categories,
              isbn10: item.isbn10,
              isbn13: item.isbn13,
              coverUrl: item.coverUrl,
              previewLink: item.previewLink,
              infoLink: item.infoLink,
              averageRating: item.averageRating,
              ratingsCount: item.ratingsCount,
              inLibrary: Boolean(existing)
            };
          });

          if (source === 'all') {
            // Fusionner les résultats en évitant les doublons (par ISBN)
            const existingIsbns = new Set(results.map(r => r.isbn13 || r.isbn10).filter(Boolean));
            bnfMapped.forEach(item => {
              const itemIsbn = item.isbn13 || item.isbn10;
              if (!itemIsbn || !existingIsbns.has(itemIsbn)) {
                results.push(item);
                if (itemIsbn) existingIsbns.add(itemIsbn);
              }
            });
          } else {
            results = bnfMapped;
          }
          totalResults = Math.max(totalResults, bnfResults.length);
        } catch (error) {
          console.error('[BNF] Search error:', error);
        }
      }

      return {
        results,
        totalResults,
        totalPages: Math.ceil(totalResults / maxResults),
        page: 1
      };
    } catch (error) {
      console.error('[Books] Search error:', error);
      throw new Error(error?.message || 'Impossible de rechercher des livres.');
    }
  });

  // Import direct d'un livre depuis Google Books
  ipcMain.handle('books-import-from-google', async (event, googleBooksId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const userId = currentUser ? getUserIdByName(db, currentUser) : null;

      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // Vérifier si le livre existe déjà
      const existing = db.prepare('SELECT id FROM books WHERE google_books_id = ?').get(googleBooksId);
      if (existing) {
        ensureBookUserDataRow(db, existing.id, userId);
        return { success: true, bookId: existing.id, alreadyExists: true };
      }

      // Récupérer les détails du livre
      const bookData = await googleBooks.getBookById(googleBooksId);

      // Construire l'URL source : utiliser infoLink si disponible, sinon construire depuis l'ID
      let sourceUrl = bookData.infoLink || null;
      if (!sourceUrl && bookData.googleBooksId) {
        // Construire l'URL Google Books à partir de l'ID
        sourceUrl = `https://books.google.com/books?id=${bookData.googleBooksId}`;
      }

      // Mapper les catégories vers le type de livre
      const typeLivre = mapCategoriesToBookType(bookData.categories || []);

      // Créer le livre
      const insertStmt = db.prepare(`
        INSERT INTO books (
          titre, titre_original, auteur, auteurs, isbn, isbn13, editeur, date_publication,
          nombre_pages, langue, type_livre, genres, description, couverture_url, google_books_id,
          source_donnees, source_url, score, nb_votes, prix_suggere, devise
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertStmt.run(
        bookData.title || '',
        bookData.originalTitle || null,
        bookData.mainAuthor || null,
        JSON.stringify(bookData.authors || []),
        bookData.isbn10 || null,
        bookData.isbn13 || null,
        bookData.publisher || null,
        bookData.publishedDate || null,
        bookData.pageCount || null,
        bookData.language || null,
        typeLivre,
        JSON.stringify(bookData.categories || []),
        bookData.description || null,
        bookData.coverUrl || null,
        bookData.googleBooksId || null,
        'google_books',
        sourceUrl,
        bookData.averageRating || null,
        bookData.ratingsCount || 0,
        bookData.price || null,
        bookData.currencyCode || null
      );

      const newBookId = result.lastInsertRowid;
      ensureBookUserDataRow(db, newBookId, userId);

      return { success: true, bookId: newBookId };
    } catch (error) {
      console.error('[Books] Import from Google Books error:', error);
      return { success: false, error: error.message || 'Impossible d\'importer le livre' };
    }
  });

  // Import direct d'un livre depuis Open Library
  ipcMain.handle('books-import-from-open-library', async (event, openLibraryId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const userId = currentUser ? getUserIdByName(db, currentUser) : null;

      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // Vérifier si le livre existe déjà
      const existing = db.prepare('SELECT id FROM books WHERE open_library_id = ?').get(openLibraryId);
      if (existing) {
        ensureBookUserDataRow(db, existing.id, userId);
        return { success: true, bookId: existing.id, alreadyExists: true };
      }

      // Récupérer les détails du livre (on utilise la recherche car getBookById nécessite un work ID complet)
      const searchResults = await openLibrary.searchBooks(openLibraryId, { limit: 1 });
      if (searchResults.length === 0) {
        return { success: false, error: 'Livre non trouvé sur Open Library' };
      }

      const bookData = searchResults[0];

      // Mapper les catégories vers le type de livre
      const typeLivre = mapCategoriesToBookType(bookData.categories || []);

      // Créer le livre
      const insertStmt = db.prepare(`
        INSERT INTO books (
          titre, titre_original, auteur, auteurs, isbn, isbn13, editeur, date_publication,
          nombre_pages, langue, type_livre, genres, description, couverture_url, open_library_id,
          source_donnees, source_url, prix_suggere, devise
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertStmt.run(
        bookData.title || '',
        bookData.originalTitle || null,
        bookData.mainAuthor || null,
        JSON.stringify(bookData.authors || []),
        bookData.isbn10 || null,
        bookData.isbn13 || null,
        bookData.publisher || null,
        bookData.publishedDate || null,
        bookData.pageCount || null,
        bookData.language || null,
        typeLivre,
        JSON.stringify(bookData.categories || []),
        bookData.description || null,
        bookData.coverUrl || null,
        bookData.openLibraryId || null,
        'open_library',
        bookData.infoLink || null,
        bookData.price || null,
        bookData.currencyCode || null
      );

      const newBookId = result.lastInsertRowid;
      ensureBookUserDataRow(db, newBookId, userId);

      return { success: true, bookId: newBookId };
    } catch (error) {
      console.error('[Books] Import from Open Library error:', error);
      return { success: false, error: error.message || 'Impossible d\'importer le livre' };
    }
  });

  // Import direct d'un livre depuis BNF
  ipcMain.handle('books-import-from-bnf', async (event, bnfId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const userId = currentUser ? getUserIdByName(db, currentUser) : null;

      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // Vérifier si le livre existe déjà
      const existing = db.prepare('SELECT id FROM books WHERE bnf_id = ?').get(bnfId);
      if (existing) {
        ensureBookUserDataRow(db, existing.id, userId);
        return { success: true, bookId: existing.id, alreadyExists: true };
      }

      // Récupérer les détails du livre
      const bookData = await bnf.getBookById(bnfId);

      // Mapper les catégories vers le type de livre
      const typeLivre = mapCategoriesToBookType(bookData.categories || []);

      // Créer le livre
      const insertStmt = db.prepare(`
        INSERT INTO books (
          titre, titre_original, auteur, auteurs, isbn, isbn13, editeur, date_publication,
          nombre_pages, langue, type_livre, genres, description, couverture_url, bnf_id,
          source_donnees, source_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertStmt.run(
        bookData.title || '',
        bookData.originalTitle || null,
        bookData.mainAuthor || null,
        JSON.stringify(bookData.authors || []),
        bookData.isbn10 || null,
        bookData.isbn13 || null,
        bookData.publisher || null,
        bookData.publishedDate || null,
        bookData.pageCount || null,
        bookData.language || null,
        typeLivre,
        JSON.stringify(bookData.categories || []),
        bookData.description || null,
        bookData.coverUrl || null,
        bookData.bnfId || null,
        'bnf',
        bookData.infoLink || null
      );

      const newBookId = result.lastInsertRowid;
      ensureBookUserDataRow(db, newBookId, userId);

      return { success: true, bookId: newBookId };
    } catch (error) {
      console.error('[Books] Import from BNF error:', error);
      return { success: false, error: error.message || 'Impossible d\'importer le livre' };
    }
  });
}

module.exports = { registerBookHandlers, ensureBookUserDataRow };
