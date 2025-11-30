/**
 * API Google Books
 * Documentation: https://developers.google.com/books/docs/v1/using
 * Pas besoin d'API key pour les requêtes de base
 */

const https = require('https');
const { URL } = require('url');

/**
 * Recherche de livres sur Google Books
 * @param {string} query - Terme de recherche (titre, auteur, ISBN, etc.)
 * @param {Object} options - Options de recherche
 * @param {number} options.maxResults - Nombre maximum de résultats (défaut: 20)
 * @param {string} options.langRestrict - Restriction de langue (ex: 'fr' pour français)
 * @returns {Promise<Array>} - Liste de livres trouvés
 */
async function searchBooks(query, options = {}) {
  const { maxResults = 20, langRestrict = 'fr' } = options;
  
  // Si langRestrict est explicitement null, ne pas l'ajouter à l'URL

  if (!query || !query.trim()) {
    return [];
  }

  try {
    const searchQuery = encodeURIComponent(query.trim());
    // Construire l'URL avec ou sans langRestrict selon la valeur
    let url = `https://www.googleapis.com/books/v1/volumes?q=${searchQuery}&maxResults=${maxResults}`;
    if (langRestrict !== null && langRestrict !== undefined) {
      url += `&langRestrict=${langRestrict}`;
    }

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
              console.error('[Google Books] API Error:', response.error);
              reject(new Error(response.error.message || 'Erreur API Google Books'));
              return;
            }

            const books = (response.items || []).map(item => {
              const volumeInfo = item.volumeInfo || {};
              const saleInfo = item.saleInfo || {};
              
              // Extraire le prix depuis saleInfo
              let price = null;
              let currencyCode = null;
              if (saleInfo.listPrice) {
                price = saleInfo.listPrice.amount || null;
                currencyCode = saleInfo.listPrice.currencyCode || null;
              } else if (saleInfo.retailPrice) {
                price = saleInfo.retailPrice.amount || null;
                currencyCode = saleInfo.retailPrice.currencyCode || null;
              }
              
              // Extraire les identifiants
              const industryIdentifiers = volumeInfo.industryIdentifiers || [];
              const isbn10 = industryIdentifiers.find(id => id.type === 'ISBN_10')?.identifier;
              const isbn13 = industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier;

              // Extraire les auteurs
              const authors = volumeInfo.authors || [];
              const mainAuthor = authors[0] || '';

              // Extraire les catégories/genres
              // Google Books utilise des catégories hiérarchiques séparées par "/"
              // Exemple: "Fiction/Histoires d'amour/Paranormal/Général"
              // On extrait toutes les parties significatives (ignorer les parties trop génériques comme "Fiction" seule)
              const categories = volumeInfo.categories || [];
              const allGenres = new Set();
              categories.forEach(cat => {
                if (cat) {
                  const parts = cat.split('/').map(p => p.trim()).filter(p => p);
                  // Ajouter toutes les parties, mais prioriser les parties plus spécifiques
                  parts.forEach(part => {
                    // Ignorer les parties trop génériques si on a des parties plus spécifiques
                    if (parts.length > 1 && part.toLowerCase() === 'fiction') {
                      // Ne pas ajouter "Fiction" si on a d'autres parties plus spécifiques
                      return;
                    }
                    allGenres.add(part);
                  });
                }
              });
              const genres = Array.from(allGenres);

              // Extraire la date de publication
              let publishedDate = null;
              if (volumeInfo.publishedDate) {
                const dateStr = volumeInfo.publishedDate;
                // Format peut être "2023" ou "2023-01-15"
                if (dateStr.length === 4) {
                  publishedDate = `${dateStr}-01-01`;
                } else {
                  publishedDate = dateStr;
                }
              }

              // Extraire l'image de couverture
              const imageLinks = volumeInfo.imageLinks || {};
              // Priorité : large > medium > thumbnail > smallThumbnail
              // Utiliser large ou medium pour une meilleure qualité
              let coverUrl = imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail || null;
              
              // Si on a une URL, s'assurer qu'elle est correctement formatée
              // Les URLs Google Books peuvent être relatives ou absolues
              if (coverUrl) {
                // Si l'URL est relative, la rendre absolue
                if (coverUrl.startsWith('//')) {
                  coverUrl = 'https:' + coverUrl;
                } else if (coverUrl.startsWith('/')) {
                  coverUrl = 'https://books.google.com' + coverUrl;
                }
                // S'assurer que c'est HTTPS (pas HTTP)
                coverUrl = coverUrl.replace(/^http:\/\//, 'https://');
                // Améliorer la qualité : utiliser zoom=0 pour la taille maximale disponible
                // ou zoom=2 pour une bonne qualité
                coverUrl = coverUrl
                  .replace('&edge=curl', '')
                  .replace(/zoom=[0-9]+/, 'zoom=0') // zoom=0 pour la taille maximale
                  .replace('zoom=0', 'zoom=0'); // Garder zoom=0
              }
              
              // Si pas d'URL dans imageLinks, construire une URL à partir de l'ID
              // Utiliser l'endpoint d'images de Google Books avec zoom=0 pour la meilleure qualité
              if (!coverUrl && item.id) {
                coverUrl = `https://books.google.com/books/content?id=${item.id}&printsec=frontcover&img=1&zoom=0&source=gbs_api`;
              }
              
              const cleanCoverUrl = coverUrl;

              return {
                googleBooksId: item.id,
                title: volumeInfo.title || '',
                originalTitle: volumeInfo.title || '',
                subtitle: volumeInfo.subtitle || null,
                authors: authors,
                mainAuthor: mainAuthor,
                publisher: volumeInfo.publisher || null,
                publishedDate: publishedDate,
                pageCount: volumeInfo.pageCount || null,
                language: volumeInfo.language || null,
                description: volumeInfo.description || null,
                categories: genres,
                isbn10: isbn10 || null,
                isbn13: isbn13 || null,
                coverUrl: cleanCoverUrl,
                previewLink: volumeInfo.previewLink || null,
                infoLink: volumeInfo.infoLink || null,
                averageRating: volumeInfo.averageRating || null,
                ratingsCount: volumeInfo.ratingsCount || 0,
                maturityRating: volumeInfo.maturityRating || null,
                price: price ? parseFloat(price) : null,
                currencyCode: currencyCode || null,
                buyLink: saleInfo.buyLink || null
              };
            });

            resolve(books);
          } catch (error) {
            console.error('[Google Books] Parse error:', error);
            reject(new Error('Erreur lors du parsing de la réponse'));
          }
        });
      }).on('error', (error) => {
        console.error('[Google Books] Request error:', error);
        reject(new Error(`Erreur réseau: ${error.message}`));
      });
    });
  } catch (error) {
    console.error('[Google Books] Search error:', error);
    throw error;
  }
}

/**
 * Récupère les détails d'un livre par son ID Google Books
 * @param {string} bookId - ID Google Books
 * @returns {Promise<Object>} - Détails du livre
 */
async function getBookById(bookId) {
  if (!bookId) {
    throw new Error('ID Google Books requis');
  }

  try {
    const url = `https://www.googleapis.com/books/v1/volumes/${bookId}`;

    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const item = JSON.parse(data);
            
            if (item.error) {
              reject(new Error(item.error.message || 'Livre non trouvé'));
              return;
            }

            const volumeInfo = item.volumeInfo || {};
            const saleInfo = item.saleInfo || {};
            
            // Extraire le prix depuis saleInfo
            let price = null;
            let currencyCode = null;
            if (saleInfo.listPrice) {
              price = saleInfo.listPrice.amount || null;
              currencyCode = saleInfo.listPrice.currencyCode || null;
            } else if (saleInfo.retailPrice) {
              price = saleInfo.retailPrice.amount || null;
              currencyCode = saleInfo.retailPrice.currencyCode || null;
            }
            
            const industryIdentifiers = volumeInfo.industryIdentifiers || [];
            const isbn10 = industryIdentifiers.find(id => id.type === 'ISBN_10')?.identifier;
            const isbn13 = industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier;
            const authors = volumeInfo.authors || [];
            const categories = volumeInfo.categories || [];
            // Extraire toutes les parties des catégories hiérarchiques
            const allGenres = new Set();
            categories.forEach(cat => {
              if (cat) {
                const parts = cat.split('/').map(p => p.trim()).filter(p => p);
                parts.forEach(part => {
                  if (parts.length > 1 && part.toLowerCase() === 'fiction') {
                    return; // Ignorer "Fiction" si on a des parties plus spécifiques
                  }
                  allGenres.add(part);
                });
              }
            });
            const genres = Array.from(allGenres);

            let publishedDate = null;
            if (volumeInfo.publishedDate) {
              const dateStr = volumeInfo.publishedDate;
              if (dateStr.length === 4) {
                publishedDate = `${dateStr}-01-01`;
              } else {
                publishedDate = dateStr;
              }
            }

            const imageLinks = volumeInfo.imageLinks || {};
            // Priorité : large > medium > thumbnail > smallThumbnail
            let coverUrl = imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail || null;
            
            // Si on a une URL, s'assurer qu'elle est correctement formatée
            if (coverUrl) {
              // Si l'URL est relative, la rendre absolue
              if (coverUrl.startsWith('//')) {
                coverUrl = 'https:' + coverUrl;
              } else if (coverUrl.startsWith('/')) {
                coverUrl = 'https://books.google.com' + coverUrl;
              }
              // S'assurer que c'est HTTPS (pas HTTP)
              coverUrl = coverUrl.replace(/^http:\/\//, 'https://');
              // Améliorer la qualité : utiliser zoom=0 pour la taille maximale disponible
              coverUrl = coverUrl
                .replace('&edge=curl', '')
                .replace(/zoom=[0-9]+/, 'zoom=0'); // zoom=0 pour la taille maximale
            }
            
            // Si pas d'URL dans imageLinks, construire une URL à partir de l'ID
            // Utiliser l'endpoint d'images de Google Books avec zoom=0 pour la meilleure qualité
            if (!coverUrl && item.id) {
              coverUrl = `https://books.google.com/books/content?id=${item.id}&printsec=frontcover&img=1&zoom=0&source=gbs_api`;
            }
            
            const cleanCoverUrl = coverUrl;

            resolve({
              googleBooksId: item.id,
              title: volumeInfo.title || '',
              originalTitle: volumeInfo.title || '',
              subtitle: volumeInfo.subtitle || null,
              authors: authors,
              mainAuthor: authors[0] || '',
              publisher: volumeInfo.publisher || null,
              publishedDate: publishedDate,
              pageCount: volumeInfo.pageCount || null,
              language: volumeInfo.language || null,
              description: volumeInfo.description || null,
              categories: genres,
              isbn10: isbn10 || null,
              isbn13: isbn13 || null,
              coverUrl: cleanCoverUrl,
              previewLink: volumeInfo.previewLink || null,
              infoLink: volumeInfo.infoLink || null,
              averageRating: volumeInfo.averageRating || null,
              ratingsCount: volumeInfo.ratingsCount || 0,
              maturityRating: volumeInfo.maturityRating || null,
              price: price ? parseFloat(price) : null,
              currencyCode: currencyCode || null,
              buyLink: saleInfo.buyLink || null
            });
          } catch (error) {
            console.error('[Google Books] Parse error:', error);
            reject(new Error('Erreur lors du parsing de la réponse'));
          }
        });
      }).on('error', (error) => {
        console.error('[Google Books] Request error:', error);
        reject(new Error(`Erreur réseau: ${error.message}`));
      });
    });
  } catch (error) {
    console.error('[Google Books] Get book error:', error);
    throw error;
  }
}

module.exports = {
  searchBooks,
  getBookById
};
