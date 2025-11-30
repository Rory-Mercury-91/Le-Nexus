/**
 * API BNF (Bibliothèque Nationale de France)
 * Documentation: https://api.bnf.fr/fr/BnF-Catalogue-general
 * Utilise le protocole SRU pour interroger le catalogue général
 * Pas besoin d'API key pour les requêtes de base
 */

const https = require('https');
const { URL } = require('url');

/**
 * Recherche de livres sur BNF via SRU
 * @param {string} query - Terme de recherche (titre, auteur, ISBN, etc.)
 * @param {Object} options - Options de recherche
 * @param {number} options.maxResults - Nombre maximum de résultats (défaut: 20)
 * @returns {Promise<Array>} - Liste de livres trouvés
 */
async function searchBooks(query, options = {}) {
  const { maxResults = 20 } = options;

  if (!query || !query.trim()) {
    return [];
  }

  try {
    // Construire la requête SRU
    // On cherche dans tous les champs (titre, auteur, ISBN, etc.)
    const searchTerm = query.trim();
    // Utiliser l'index "all" pour chercher partout
    // Améliorer la recherche en cherchant aussi dans les titres et auteurs
    const sruQuery = `all "${searchTerm}"`;
    const encodedQuery = encodeURIComponent(sruQuery);
    
    const url = `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=${encodedQuery}&maximumRecords=${maxResults * 2}&recordSchema=dc`;

    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Parser le XML SRU de manière simple
            // La BNF retourne du XML, on va utiliser une approche simple avec regex
            // pour extraire les données essentielles
            
            const books = [];
            
            // Extraire tous les enregistrements
            const recordMatches = data.match(/<srw:record[^>]*>([\s\S]*?)<\/srw:record>/g) || [];
            
            for (const recordXml of recordMatches) {
                
              try {
                // Extraire les métadonnées Dublin Core avec regex
                const getFields = (fieldName) => {
                  const regex = new RegExp(`<dc:${fieldName}[^>]*>([^<]+)<\/dc:${fieldName}>`, 'g');
                  const matches = [];
                  let match;
                  while ((match = regex.exec(recordXml)) !== null) {
                    matches.push(match[1].trim());
                  }
                  return matches;
                };

                // Extraire l'identifiant BNF
                const identifiers = getFields('identifier');
                let bnfId = null;
                for (const identifier of identifiers) {
                  // Format: "ark:/12148/cb123456789" ou "FRBNF123456789"
                  const arkMatch = identifier.match(/ark:\/12148\/cb(\d+)/);
                  const frbnfMatch = identifier.match(/FRBNF(\d+)/);
                  if (arkMatch) {
                    bnfId = `ark:/12148/cb${arkMatch[1]}`;
                    break;
                  } else if (frbnfMatch) {
                    bnfId = `FRBNF${frbnfMatch[1]}`;
                    break;
                  } else if (identifier.includes('ark:/12148/')) {
                    bnfId = identifier;
                    break;
                  }
                }

                // Extraire les titres
                const titles = getFields('title');
                const title = titles[0] || '';
                const subtitle = titles.length > 1 ? titles[1] : null;

                // Extraire les auteurs
                const creators = getFields('creator');
                const authors = creators;
                const mainAuthor = creators[0] || '';

                // Extraire les sujets/genres
                const subjects = getFields('subject');
                const categories = subjects.slice(0, 5); // Limiter à 5

                // Extraire la date de publication
                const dates = getFields('date');
                let publishedDate = null;
                if (dates.length > 0) {
                  const firstDate = dates[0];
                  // Essayer d'extraire une année
                  const yearMatch = firstDate.match(/\d{4}/);
                  if (yearMatch) {
                    publishedDate = `${yearMatch[0]}-01-01`;
                  }
                }

                // Extraire l'éditeur
                const publishers = getFields('publisher');
                const publisher = publishers[0] || null;

                // Extraire la langue
                const languages = getFields('language');
                const language = languages[0] || null;

                // Extraire la description
                const descriptions = getFields('description');
                const description = descriptions[0] || null;

                // Extraire les identifiants ISBN
                let isbn10 = null;
                let isbn13 = null;
                for (const id of identifiers) {
                  // Format ISBN: "ISBN 978-2-07-061275-8" ou "9782070612758"
                  const isbnMatch = id.match(/ISBN\s*([0-9X-]+)/i) || id.match(/^([0-9X-]{10,17})$/);
                  if (isbnMatch) {
                    const isbn = isbnMatch[1].replace(/-/g, '');
                    if (isbn.length === 10) {
                      isbn10 = isbn;
                    } else if (isbn.length === 13) {
                      isbn13 = isbn;
                    }
                  }
                }

                // Construire l'URL de la couverture (si disponible via Gallica)
                let coverUrl = null;
                // On laisse null pour l'instant, car nécessite l'identifiant Gallica

                // Construire l'URL source
                let sourceUrl = null;
                if (bnfId) {
                  if (bnfId.startsWith('ark:/12148/')) {
                    sourceUrl = `https://catalogue.bnf.fr/${bnfId}`;
                  } else if (bnfId.startsWith('FRBNF')) {
                    const cbId = bnfId.replace('FRBNF', 'cb');
                    sourceUrl = `https://catalogue.bnf.fr/ark:/12148/${cbId}`;
                  }
                }

                books.push({
                  bnfId: bnfId,
                  title: title,
                  originalTitle: title,
                  subtitle: subtitle,
                  authors: authors,
                  mainAuthor: mainAuthor,
                  publisher: publisher,
                  publishedDate: publishedDate,
                  pageCount: null, // BNF ne fournit pas toujours le nombre de pages
                  language: language,
                  description: description,
                  categories: categories,
                  isbn10: isbn10,
                  isbn13: isbn13,
                  coverUrl: coverUrl,
                  previewLink: null,
                  infoLink: sourceUrl,
                  averageRating: null, // BNF n'a pas de système de notation
                  ratingsCount: 0
                });
              } catch (error) {
                console.error('[BNF] Processing record error:', error);
                // Continuer avec le prochain enregistrement
              }
            }

            resolve(books);
          } catch (error) {
            console.error('[BNF] Parse error:', error);
            reject(new Error('Erreur lors du parsing de la réponse'));
          }
        });
      }).on('error', (error) => {
        console.error('[BNF] Request error:', error);
        reject(new Error(`Erreur réseau: ${error.message}`));
      });
    });
  } catch (error) {
    console.error('[BNF] Search error:', error);
    throw error;
  }
}

/**
 * Récupère les détails d'un livre par son ID BNF
 * @param {string} bnfId - ID BNF (ark ou FRBNF)
 * @returns {Promise<Object>} - Détails du livre
 */
async function getBookById(bnfId) {
  if (!bnfId) {
    throw new Error('ID BNF requis');
  }

  try {
    // Nettoyer l'ID
    let cleanId = bnfId;
    if (cleanId.startsWith('ark:/12148/')) {
      cleanId = cleanId.replace('ark:/12148/', '');
    } else if (cleanId.startsWith('FRBNF')) {
      cleanId = cleanId.replace('FRBNF', 'cb');
    }

    // Utiliser SRU pour récupérer le document spécifique
    const query = `bib.arkId="${cleanId}"`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=${encodedQuery}&maximumRecords=1&recordSchema=dc`;

    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Parser le XML SRU de manière simple avec regex
            const recordMatches = data.match(/<srw:record[^>]*>([\s\S]*?)<\/srw:record>/g) || [];
            
            if (recordMatches.length === 0) {
              reject(new Error('Livre non trouvé'));
              return;
            }

            const recordXml = recordMatches[0];
            
            // Extraire les métadonnées Dublin Core avec regex
            const getFields = (fieldName) => {
              const regex = new RegExp(`<dc:${fieldName}[^>]*>([^<]+)<\/dc:${fieldName}>`, 'g');
              const matches = [];
              let match;
              while ((match = regex.exec(recordXml)) !== null) {
                matches.push(match[1].trim());
              }
              return matches;
            };

            const titles = getFields('title');
            const creators = getFields('creator');
            const subjects = getFields('subject');
            const dates = getFields('date');
            const publishers = getFields('publisher');
            const languages = getFields('language');
            const descriptions = getFields('description');
            const identifiers = getFields('identifier');

            // Extraire l'identifiant BNF
            let bnfId = null;
            for (const identifier of identifiers) {
              const arkMatch = identifier.match(/ark:\/12148\/cb(\d+)/);
              const frbnfMatch = identifier.match(/FRBNF(\d+)/);
              if (arkMatch) {
                bnfId = `ark:/12148/cb${arkMatch[1]}`;
                break;
              } else if (frbnfMatch) {
                bnfId = `FRBNF${frbnfMatch[1]}`;
                break;
              } else if (identifier.includes('ark:/12148/')) {
                bnfId = identifier;
                break;
              }
            }

            let isbn10 = null;
            let isbn13 = null;
            for (const id of identifiers) {
              const isbnMatch = id.match(/ISBN\s*([0-9X-]+)/i) || id.match(/^([0-9X-]{10,17})$/);
              if (isbnMatch) {
                const isbn = isbnMatch[1].replace(/-/g, '');
                if (isbn.length === 10) {
                  isbn10 = isbn;
                } else if (isbn.length === 13) {
                  isbn13 = isbn;
                }
              }
            }

            let publishedDate = null;
            if (dates.length > 0) {
              const yearMatch = dates[0].match(/\d{4}/);
              if (yearMatch) {
                publishedDate = `${yearMatch[0]}-01-01`;
              }
            }

            let sourceUrl = null;
            if (bnfId) {
              if (bnfId.startsWith('ark:/12148/')) {
                sourceUrl = `https://catalogue.bnf.fr/${bnfId}`;
              } else if (bnfId.startsWith('FRBNF')) {
                const cbId = bnfId.replace('FRBNF', 'cb');
                sourceUrl = `https://catalogue.bnf.fr/ark:/12148/${cbId}`;
              }
            }

            resolve({
              bnfId: bnfId,
              title: titles[0] || '',
              originalTitle: titles[0] || '',
              subtitle: titles.length > 1 ? titles[1] : null,
              authors: creators,
              mainAuthor: creators[0] || '',
              publisher: publishers[0] || null,
              publishedDate: publishedDate,
              pageCount: null,
              language: languages[0] || null,
              description: descriptions[0] || null,
              categories: subjects.slice(0, 5),
              isbn10: isbn10,
              isbn13: isbn13,
              coverUrl: null,
              previewLink: null,
              infoLink: sourceUrl,
              averageRating: null,
              ratingsCount: 0
            });
          } catch (error) {
            console.error('[BNF] Parse error:', error);
            reject(new Error('Erreur lors du parsing de la réponse'));
          }
        });
      }).on('error', (error) => {
        console.error('[BNF] Request error:', error);
        reject(new Error(`Erreur réseau: ${error.message}`));
      });
    });
  } catch (error) {
    console.error('[BNF] Get book error:', error);
    throw error;
  }
}

module.exports = {
  searchBooks,
  getBookById
};
