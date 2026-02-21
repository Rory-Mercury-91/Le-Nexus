/**
 * API Open Library
 * Documentation: https://openlibrary.org/developers/api
 * API gratuite et sans clé API requise
 */

const https = require('https');
const { URL } = require('url');

/**
 * Recherche de livres sur Open Library
 * @param {string} query - Terme de recherche (titre, auteur, ISBN, etc.)
 * @param {Object} options - Options de recherche
 * @param {number} options.limit - Nombre maximum de résultats (défaut: 20)
 * @returns {Promise<Array>} - Liste de livres trouvés
 */
async function searchBooks(query, options = {}) {
  const { limit = 20 } = options;

  if (!query || !query.trim()) {
    return [];
  }

  try {
    const searchQuery = encodeURIComponent(query.trim());
    const url = `https://openlibrary.org/search.json?q=${searchQuery}&limit=${limit}`;

    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);

            if (response.error) {
              console.error('[Open Library] API Error:', response.error);
              reject(new Error(response.error || 'Erreur API Open Library'));
              return;
            }

            const books = (response.docs || []).map(doc => {
              // Extraire les auteurs
              const authors = (doc.author_name || []).map(name => name);
              const mainAuthor = authors[0] || '';

              // Extraire les sujets/genres
              const subjects = doc.subject || [];
              const genres = subjects.slice(0, 5); // Limiter à 5 genres

              // Extraire les dates de publication
              const publishDates = doc.publish_date || [];
              const firstPublishDate = publishDates[0] || null;
              let publishedDate = null;
              if (firstPublishDate) {
                // Essayer d'extraire une année
                const yearMatch = firstPublishDate.match(/\d{4}/);
                if (yearMatch) {
                  publishedDate = `${yearMatch[0]}-01-01`;
                }
              }

              // Extraire les ISBN
              const isbn10 = (doc.isbn || []).find(isbn => isbn.length === 10) || null;
              const isbn13 = (doc.isbn || []).find(isbn => isbn.length === 13) || null;

              // Construire l'URL de la couverture
              let coverUrl = null;
              if (doc.cover_i) {
                coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
              } else if (doc.isbn && doc.isbn.length > 0) {
                coverUrl = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
              }

              return {
                openLibraryId: doc.key?.replace('/works/', '') || null,
                title: doc.title || '',
                originalTitle: doc.title || '',
                subtitle: doc.subtitle || null,
                authors: authors,
                mainAuthor: mainAuthor,
                publisher: (doc.publisher || [])[0] || null,
                publishedDate: publishedDate,
                pageCount: doc.number_of_pages_median || doc.number_of_pages || null,
                language: (doc.language || [])[0] || null,
                description: doc.first_sentence ? (Array.isArray(doc.first_sentence) ? doc.first_sentence.join(' ') : doc.first_sentence) : null,
                categories: genres,
                isbn10: isbn10 || null,
                isbn13: isbn13 || null,
                coverUrl: coverUrl,
                previewLink: doc.ia ? `https://archive.org/details/${doc.ia[0]}` : null,
                infoLink: doc.key ? `https://openlibrary.org${doc.key}` : null,
                averageRating: null, // Open Library n'a pas de système de notation
                ratingsCount: 0
              };
            });

            resolve(books);
          } catch (error) {
            console.error('[Open Library] Parse error:', error);
            reject(new Error('Erreur lors du parsing de la réponse'));
          }
        });
      }).on('error', (error) => {
        console.error('[Open Library] Request error:', error);
        reject(new Error(`Erreur réseau: ${error.message}`));
      });
    });
  } catch (error) {
    console.error('[Open Library] Search error:', error);
    throw error;
  }
}

module.exports = {
  searchBooks
};
