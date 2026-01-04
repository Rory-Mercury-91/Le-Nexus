/**
 * Handlers IPC pour l'import de backups Mihon (.tachibk)
 */

const { decodeMihonBackup } = require('../../services/mihon-backup-decoder');
const { getUserIdByName } = require('../common-helpers');
const { handleCreateSerie } = require('./manga-create-handlers');
const { normalizeTitle } = require('../../services/mangas/import-utils');
const { findSerieByTitleNormalized } = require('../../services/mangas/import-search');
const { findExistingSerieUnified } = require('../../services/unified-matching-service');
const { generateReport } = require('../../utils/report-generator');
const { buildSourceUrl, getSourceIndex, ensureSourceIndex } = require('../../services/mihon-source-index-manager');

/**
 * Extrait l'URL complète de la source depuis les données Mihon
 * Utilise la nouvelle logique robuste avec index.json
 * 
 * Priorités :
 * 1. index.json via source ID → baseUrl (le plus fiable)
 * 2. thumbnailUrl (fallback si index indisponible)
 */
async function extractSourceUrl(manga, getPathManager, indexCache = null) {
  const sourceId = manga.source;
  const mangaUrl = manga.url;

  if (!sourceId || !mangaUrl) {
    return null;
  }

  // Si mangaUrl est déjà une URL complète, la retourner
  if (mangaUrl.startsWith('http://') || mangaUrl.startsWith('https://')) {
    return mangaUrl;
  }

  // Priorité 1: Utiliser l'index.json via source ID → baseUrl
  try {
    const sourceUrl = await buildSourceUrl(sourceId, mangaUrl, getPathManager, indexCache);
    if (sourceUrl) {
      return sourceUrl;
    }
  } catch (error) {
    console.warn(`⚠️ Erreur construction URL depuis index pour source ${sourceId}:`, error.message);
  }

  // Priorité 2 (fallback): Utiliser thumbnailUrl si disponible
  if (manga.thumbnailUrl) {
    try {
      const url = new URL(manga.thumbnailUrl);
      const baseUrl = `${url.protocol}//${url.hostname}`;
      
      // Construire l'URL complète
      if (mangaUrl.startsWith('/')) {
        return `${baseUrl}${mangaUrl}`;
      } else {
        return `${baseUrl}/${mangaUrl}`;
      }
    } catch (e) {
      console.warn(`⚠️ Erreur extraction URL depuis thumbnailUrl:`, e.message);
    }
  }

  // Aucune URL construite
  return null;
}

/**
 * Convertit le statut de publication Mihon vers le format de l'application
 */
function convertMihonStatus(mihonStatus) {
  // Status: 0 = Unknown, 1 = Ongoing, 2 = Completed, 3 = Licensed, 4 = Publishing finished, 6 = Cancelled, 7 = On Hiatus
  const statusMap = {
    0: 'En cours', // Unknown -> En cours par défaut
    1: 'En cours',
    2: 'Terminée',
    3: 'En cours', // Licensed -> En cours
    4: 'Terminée', // Publishing finished -> Terminée
    6: 'Abandonnée', // Cancelled -> Abandonnée
    7: 'En cours' // On Hiatus -> En cours
  };
  return statusMap[mihonStatus] || 'En cours';
}

/**
 * Convertit le statut de lecture MAL vers le format de l'application
 */
function convertMalReadingStatus(malStatus) {
  // Status: 1 = Reading, 2 = Completed, 3 = On Hold, 4 = Dropped, 6 = Plan to Read
  const statusMap = {
    1: 'En cours',
    2: 'Terminé',
    3: 'En pause',
    4: 'Abandonné',
    6: 'À lire'
  };
  return statusMap[malStatus] || 'À lire';
}

/**
 * Détermine le type de volume/contenu depuis les données Mihon
 */
function determineTypeVolume(manga) {
  // Si c'est un scan (chapitres), utiliser 'Scan Manga' ou 'Scan Webtoon'
  if (manga.chapters && manga.chapters.length > 0) {
    // Vérifier si c'est un webtoon (généralement manhwa/manhua)
    const isWebtoon = manga.genre?.some(g => 
      g.toLowerCase().includes('webtoon') || 
      g.toLowerCase().includes('manhwa') ||
      g.toLowerCase().includes('manhua')
    );
    return isWebtoon ? 'Scan Webtoon' : 'Scan Manga';
  }
  // Par défaut, considérer comme volume physique
  return 'Broché';
}

/**
 * Détermine le type de contenu
 */
function determineTypeContenu(manga) {
  if (manga.chapters && manga.chapters.length > 0) {
    return 'chapitre';
  }
  return 'volume';
}

/**
 * Importe un backup Mihon dans la base de données
 */
async function importMihonBackup(db, getPathManager, store, filePath, progressCallback = null) {
  const currentUser = store.get('currentUser', '');
  if (!currentUser) {
    throw new Error('Aucun utilisateur connecté');
  }

  const currentUserId = getUserIdByName(db, currentUser);
  if (!currentUserId) {
    throw new Error('Utilisateur introuvable dans la base de données');
  }

  // Vérifier et ajouter la colonne source_url si elle n'existe pas (fallback)
  try {
    const manga_seriesColumns = db.prepare('PRAGMA table_info(manga_series)').all();
    const hasSourceUrl = manga_seriesColumns.some(column => column.name === 'source_url');
    if (!hasSourceUrl) {
      db.exec('ALTER TABLE manga_series ADD COLUMN source_url TEXT');
      console.log('✅ Colonne source_url ajoutée à la table manga_series (fallback dans import Mihon)');
    }
  } catch (error) {
    // Ignorer l'erreur si la colonne existe déjà ou si on ne peut pas l'ajouter
    console.warn('⚠️ Vérification colonne source_url:', error.message);
  }

  // Vérifier et télécharger l'index des sources AVANT de commencer l'import
  // Cela garantit que l'index est disponible pour construire les URLs
  if (progressCallback) {
    progressCallback({ step: 'index-download', message: 'Vérification de l\'index des sources...', progress: 0 });
  }

  let indexCache = null;
  try {
    console.log('🔍 Vérification de l\'index des sources...');
    const indexResult = await ensureSourceIndex(getPathManager, progressCallback, store);
    if (indexResult.success && indexResult.index) {
      indexCache = { index: indexResult.index, source: indexResult.source };
      console.log(`✅ Index des sources prêt (source: ${indexResult.source})`);
    } else {
      console.warn('⚠️ Index des sources non disponible, utilisation des fallbacks');
    }
  } catch (error) {
    console.warn(`⚠️ Erreur vérification index des sources:`, error.message);
    // Continuer quand même, extractSourceUrl utilisera les fallbacks
  }

  // Décoder le backup
  if (progressCallback) {
    progressCallback({ step: 'decoding', message: 'Décodage du backup...', progress: 0 });
  }

  const decodeResult = await decodeMihonBackup(filePath);
  if (!decodeResult.success) {
    throw new Error(`Erreur lors du décodage: ${decodeResult.error}`);
  }

  const backupData = decodeResult.data;
  const mangas = backupData.backupManga || [];
  const totalMangas = mangas.length;
  const startTime = Date.now();
  let lastProgressUpdate = startTime;

  // L'index a déjà été chargé avant le décodage du backup
  // indexCache est déjà disponible depuis ensureSourceIndex()

  if (progressCallback) {
    progressCallback({ 
      step: 'importing', 
      message: `Import de ${totalMangas} mangas...`, 
      progress: 0,
      total: totalMangas,
      current: 0,
      imported: 0,
      updated: 0,
      errors: 0
    });
  }

  const stats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    withMalId: 0,
    chaptersImported: 0
  };

  // Collections pour le rapport détaillé
  const reportData = {
    created: [], // { titre, serieId, source_url, mal_id }
    updated: [], // { titre, serieId, source_url, mal_id }
    failed: [],   // { titre, error, source_url }
    potentialMatches: [], // { newTitre, newSerieId, existingSerieId, existingSerieTitre, similarity, matchMethod, mal_id, source_url }
    _potentialMatchesByTitle: {} // Stockage temporaire pendant l'import
  };

  // Préparer les requêtes
  const findSerieByMalId = db.prepare('SELECT id FROM manga_series WHERE mal_id = ?');
  const updateSerieChapitres = db.prepare(`
    UPDATE manga_series 
    SET nb_chapitres = ?, chapitres_lus = ?, chapitres_mihon = 1
    WHERE id = ?
  `);
  const { ensureMangaUserDataRow } = require('./manga-helpers');
  
  // Fonction pour mettre à jour le statut utilisateur
  const upsertSerieStatut = (serieId, userId, statutLecture, chapitresLus) => {
    ensureMangaUserDataRow(db, serieId, userId);
    db.prepare(`
      UPDATE manga_user_data SET
        statut_lecture = ?,
        chapitres_lus = ?,
        updated_at = datetime('now')
      WHERE serie_id = ? AND user_id = ?
    `).run(statutLecture, chapitresLus, serieId, userId);
  };

  // Traiter chaque manga
  for (let i = 0; i < mangas.length; i++) {
    const manga = mangas[i];
    
    try {
      if (progressCallback) {
        const now = Date.now();
        const elapsedMs = now - startTime;
        
        // Calculer la vitesse basée sur les dernières secondes pour plus de précision
        const timeSinceLastUpdate = now - lastProgressUpdate;
        let speed = 0;
        if (timeSinceLastUpdate > 0 && i > 0) {
          // Vitesse basée sur le dernier intervalle (plus réactif)
          const itemsInInterval = 1;
          speed = (itemsInInterval / timeSinceLastUpdate) * 60000; // par minute
        } else if (elapsedMs > 0) {
          // Vitesse moyenne globale
          speed = ((i + 1) / elapsedMs) * 60000;
        }
        
        const remaining = totalMangas - (i + 1);
        const etaMs = speed > 0 ? (remaining / speed) * 60000 : null;
        
        lastProgressUpdate = now;

        progressCallback({ 
          step: 'importing', 
          message: `Import de "${manga.title || 'Sans titre'}"...`, 
          progress: ((i + 1) / totalMangas) * 100,
          total: totalMangas,
          current: i + 1,
          imported: stats.created,
          updated: stats.updated,
          errors: stats.errors,
          item: manga.title || 'Sans titre',
          elapsedMs: elapsedMs,
          etaMs: etaMs,
          speed: speed
        });
      }

      // Délai entre chaque import pour éviter de surcharger l'API Jikan
      // (le rate-limiting dans fetchJikanMangaData gère déjà les appels Jikan)
      // Mais on ajoute un petit délai pour laisser respirer le système
      if (i > 0 && i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Récupérer le mal_id depuis le tracking
      let malId = null;
      if (manga.tracking && manga.tracking.length > 0) {
        const malTracking = manga.tracking.find(t => t.syncId === 1); // 1 = MyAnimeList
        if (malTracking && malTracking.mediaId) {
          malId = parseInt(malTracking.mediaId);
          stats.withMalId++;
        }
      }

      // Extraire l'URL de la source (utiliser l'index en cache) - avant de préparer les données
      const sourceUrl = await extractSourceUrl(manga, getPathManager, indexCache);
      
      // Si on a un match potentiel stocké, mettre à jour son source_url
      if (reportData._potentialMatchesByTitle && reportData._potentialMatchesByTitle[manga.title || 'Sans titre']) {
        reportData._potentialMatchesByTitle[manga.title || 'Sans titre'].source_url = sourceUrl || null;
      }

      // Préparer les données de la série pour le matching
      const serieDataForMatching = {
        titre: manga.title || 'Sans titre',
        mal_id: malId,
        titre_romaji: null, // Sera ajouté depuis tracking si disponible
        titre_natif: null,
        titre_anglais: null,
        titres_alternatifs: null
      };

      // Ajouter les données du tracking MAL si disponibles
      if (manga.tracking && manga.tracking.length > 0) {
        const malTracking = manga.tracking.find(t => t.syncId === 1);
        if (malTracking && malTracking.title) {
          serieDataForMatching.titre_romaji = malTracking.title;
        }
      }

      // Déterminer le type de média attendu
      const expectedMediaType = determineTypeVolume(manga);
      
      // Utiliser le service de matching unifié
      let matchResult = null;
      let serieId = null;
      let matchMethod = null;
      let existingSerieId = null;
      
      try {
        matchResult = findExistingSerieUnified(
          db,
          serieDataForMatching,
          'mihon',
          expectedMediaType
        );
        
        if (matchResult) {
          // Pour l'import batch Mihon, on fusionne automatiquement SEULEMENT si :
          // 1. Match exact (100%) - titre identique
          // 2. Match par MAL ID - c'est la même œuvre (mal_id est unique, donc c'est toujours fiable)
          // Si le manga importé a un mal_id et qu'une série existante a le même mal_id, on fusionne même si ce n'est pas un match exact
          // Pour les matches avec similarité (75-99%) sans mal_id, on crée une nouvelle entrée pour éviter les fusions incorrectes
          const hasMalIdMatch = malId && matchResult.serie.mal_id && malId === matchResult.serie.mal_id;
          
          // VÉRIFICATION CRITIQUE : Si les deux entrées ont des MAL_ID différents, 
          // ce sont forcément deux œuvres différentes - NE PAS FUSIONNER
          const existingMalId = matchResult.serie.mal_id ? Number(matchResult.serie.mal_id) : null;
          const incomingMalId = malId ? Number(malId) : null;
          const hasDifferentMalIds = existingMalId !== null && incomingMalId !== null && existingMalId !== incomingMalId;
          
          if (hasDifferentMalIds) {
            // Les MAL_ID sont différents → ce sont deux œuvres différentes, ne pas fusionner
            console.log(`⚠️ MAL ID différent détecté (existant: ${existingMalId}, importé: ${incomingMalId}) pour "${manga.title}" → création d'une nouvelle entrée`);
            
            // Stocker le match potentiel pour le rapport
            const potentialMatch = {
              newTitre: manga.title || 'Sans titre',
              existingSerieId: matchResult.serie.id,
              existingSerieTitre: matchResult.serie.titre,
              similarity: matchResult.similarity,
              matchMethod: matchResult.matchMethod,
              matchedTitle: matchResult.matchedTitle,
              mal_id: malId || null,
              source_url: null
            };
            
            if (!reportData._potentialMatchesByTitle) {
              reportData._potentialMatchesByTitle = {};
            }
            reportData._potentialMatchesByTitle[manga.title || 'Sans titre'] = potentialMatch;
            
            matchResult = null; // Ne pas utiliser ce match pour fusionner
            serieId = null;
            matchMethod = null;
          } else if (matchResult.isExactMatch || matchResult.matchMethod === 'mal_id' || hasMalIdMatch) {
            serieId = matchResult.serie.id;
            existingSerieId = matchResult.serie.id;
            matchMethod = hasMalIdMatch ? 'mal_id' : matchResult.matchMethod;
          } else {
            // Match avec similarité mais pas exact → créer une nouvelle entrée
            // On garde le matchResult pour le rapport (signalement des matches potentiels)
            console.log(`⚠️ Match avec similarité détecté (${matchResult.similarity}%) mais non-exact pour "${manga.title}" → création d'une nouvelle entrée`);
            
            // Stocker le match potentiel pour le rapport (sera ajouté plus tard quand la série sera créée)
            // On le stocke temporairement avec les données nécessaires
            const potentialMatch = {
              newTitre: manga.title || 'Sans titre',
              existingSerieId: matchResult.serie.id,
              existingSerieTitre: matchResult.serie.titre,
              similarity: matchResult.similarity,
              matchMethod: matchResult.matchMethod,
              matchedTitle: matchResult.matchedTitle,
              mal_id: malId || null,
              source_url: null // Sera rempli plus tard
            };
            
            // On va le stocker temporairement, on l'ajoutera au rapport après création de la série
            // Utiliser un identifiant temporaire basé sur le titre
            if (!reportData._potentialMatchesByTitle) {
              reportData._potentialMatchesByTitle = {};
            }
            reportData._potentialMatchesByTitle[manga.title || 'Sans titre'] = potentialMatch;
            
            matchResult = null; // Ne pas utiliser ce match pour fusionner
            serieId = null;
            matchMethod = null;
          }
        }
      } catch (error) {
        // En cas d'erreur, continuer sans bloquer l'import
        console.warn(`⚠️ Erreur recherche unifiée pour "${manga.title}":`, error.message);
      }

      // Préparer les données de la série
      const serieData = {
        titre: manga.title || 'Sans titre',
        statut: convertMihonStatus(manga.status || 0),
        type_volume: determineTypeVolume(manga),
        type_contenu: determineTypeContenu(manga),
        couverture_url: manga.thumbnailUrl || null,
        description: manga.description || null,
        genres: manga.genre && manga.genre.length > 0 ? manga.genre.join(', ') : null,
        mal_id: malId,
        nb_chapitres: manga.chapters ? manga.chapters.length : null,
        chapitres_lus: manga.chapters ? manga.chapters.filter(c => c.read).length : 0,
        chapitres_mihon: 1, // Marquer comme importé depuis Mihon
        source_donnees: 'mihon_import',
        source_url: sourceUrl, // URL de la source (site de scan)
        source_id: manga.source ? String(manga.source) : null // ID de la source Mihon/Tachiyomi
      };

      // Ajouter les données du tracking MAL si disponibles
      if (manga.tracking && manga.tracking.length > 0) {
        const malTracking = manga.tracking.find(t => t.syncId === 1);
        if (malTracking) {
          if (malTracking.title) {
            serieData.titre_romaji = malTracking.title;
          }
          if (malTracking.score && malTracking.score > 0) {
            serieData.score_utilisateur = malTracking.score;
          }
        }
      }

      // Télécharger automatiquement la couverture si option activée et si c'est une URL Cloudflare
      const autoDownload = store.get('autoDownloadCovers', false) === true;
      let finalCouvertureUrl = serieData.couverture_url;
      
      if (autoDownload && serieData.couverture_url && serieData.couverture_url.startsWith('http')) {
        const isCloudflareProtected = serieData.couverture_url.includes('sushiscan.fr') || 
                                      serieData.couverture_url.includes('scan-manga.com') ||
                                      serieData.couverture_url.includes('lelscan.com') ||
                                      serieData.couverture_url.includes('japscan.fr') ||
                                      serieData.couverture_url.includes('mangascantrad.com');
        
        if (isCloudflareProtected) {
          try {
            const coverManager = require('../../services/cover/cover-manager');
            const pm = getPathManager();
            if (pm) {
              const coverResult = await coverManager.downloadCover(
                pm,
                serieData.couverture_url,
                serieData.titre,
                'serie',
                serieId || null,
                {
                  mediaType: serieData.media_type || null,
                  type_volume: serieData.type_volume,
                  referer: sourceUrl || serieData.couverture_url.split('/').slice(0, 3).join('/')
                }
              );
              if (coverResult && coverResult.success && coverResult.localPath) {
                finalCouvertureUrl = coverResult.localPath;
                console.log(`✅ Couverture Cloudflare téléchargée: ${coverResult.localPath}`);
              }
            }
          } catch (error) {
            console.warn(`⚠️ Erreur téléchargement couverture Cloudflare pour "${serieData.titre}":`, error.message);
            // Continuer avec l'URL originale en cas d'erreur
          }
        }
      }
      
      // Mettre à jour l'URL de couverture avec le chemin local si téléchargé
      serieData.couverture_url = finalCouvertureUrl;

      // Créer ou mettre à jour la série
      if (serieId) {
        // Récupérer la série existante pour vérifier la source
        const existingSerie = db.prepare('SELECT source_donnees FROM manga_series WHERE id = ?').get(serieId);
        const { isNautiljonSource } = require('../../services/mangas/manga-import-merger');
        const isNautiljon = existingSerie && isNautiljonSource(existingSerie.source_donnees);
        
        // Mettre à jour la série existante
        const updateFields = [];
        const updateValues = [];

        if (serieData.mal_id && !findSerieByMalId.get(serieData.mal_id)) {
          updateFields.push('mal_id = ?');
          updateValues.push(serieData.mal_id);
        }
        
        // Ne pas écraser les données si la source est Nautiljon (sauf pour les champs spécifiques Mihon)
        if (!isNautiljon) {
          if (serieData.couverture_url) {
            updateFields.push('couverture_url = ?');
            updateValues.push(serieData.couverture_url);
          }
          if (serieData.description) {
            updateFields.push('description = ?');
            updateValues.push(serieData.description);
          }
          if (serieData.genres) {
            updateFields.push('genres = ?');
            updateValues.push(serieData.genres);
          }
        } else {
          console.log(`⏭️ [Mihon Import] Champs ignorés (source Nautiljon prévaut) pour série ID ${serieId}`);
        }
        
        // Ces champs peuvent toujours être mis à jour car spécifiques à Mihon
        if (serieData.source_url) {
          updateFields.push('source_url = ?');
          updateValues.push(serieData.source_url);
        }
        if (serieData.source_id) {
          updateFields.push('source_id = ?');
          updateValues.push(serieData.source_id);
        }
        // Toujours mettre à jour source_donnees pour les imports Mihon (mais préserver Nautiljon si présent)
        if (!isNautiljon) {
          updateFields.push('source_donnees = ?');
          updateValues.push(serieData.source_donnees || 'mihon_import');
        }
        updateFields.push('chapitres_mihon = 1');
        updateFields.push('nb_chapitres = ?');
        updateValues.push(serieData.nb_chapitres || 0);
        updateFields.push('chapitres_lus = ?');
        updateValues.push(serieData.chapitres_lus || 0);
        updateValues.push(serieId);

        if (updateFields.length > 0) {
          db.prepare(`UPDATE manga_series SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
        }
        stats.updated++;
        // Récupérer le titre de la série existante pour le rapport
        // Utiliser le titre depuis matchResult si disponible, sinon le récupérer depuis la DB
        let existingSerieTitre = null;
        if (matchResult && matchResult.serie && matchResult.serie.titre) {
          existingSerieTitre = matchResult.serie.titre;
        } else if (serieId) {
          const existingSerie = db.prepare('SELECT titre FROM manga_series WHERE id = ?').get(serieId);
          if (existingSerie && existingSerie.titre) {
            existingSerieTitre = existingSerie.titre;
          }
        }
        // Ajouter au rapport avec informations de fusion
        reportData.updated.push({
          titre: serieData.titre, // Titre de la série importée/fusionnée
          serieId: serieId,
          existingSerieId: existingSerieId || serieId, // ID de la série existante avec laquelle fusionner
          existingSerieTitre: existingSerieTitre, // Titre de la série existante
          action: 'merged',
          matchMethod: matchMethod || 'unknown',
          similarity: matchResult ? matchResult.similarity : null,
          isExactMatch: matchResult ? matchResult.isExactMatch : false,
          source_url: sourceUrl || null,
          mal_id: malId || null
        });
      } else {
        // Créer une nouvelle série
        try {
          serieId = await handleCreateSerie(db, getPathManager, store, serieData);
          stats.created++;
          // Ajouter au rapport
          reportData.created.push({
            titre: serieData.titre,
            serieId: serieId,
            action: 'created',
            source_url: sourceUrl || null,
            mal_id: malId || null
          });
          
          // Si on a un match potentiel pour cette série, l'ajouter au rapport
          if (reportData._potentialMatchesByTitle && reportData._potentialMatchesByTitle[serieData.titre]) {
            const potentialMatch = reportData._potentialMatchesByTitle[serieData.titre];
            potentialMatch.newSerieId = serieId;
            reportData.potentialMatches.push(potentialMatch);
            // Nettoyer l'entrée temporaire
            delete reportData._potentialMatchesByTitle[serieData.titre];
          }
        } catch (createError) {
          console.error(`Erreur création série "${manga.title}":`, createError);
          stats.errors++;
          // Ajouter au rapport d'erreur
          reportData.failed.push({
            titre: manga.title || 'Sans titre',
            error: createError.message || String(createError),
            source_url: sourceUrl || null
          });
          continue;
        }
      }

      // Mettre à jour les chapitres
      if (manga.chapters && manga.chapters.length > 0) {
        const chapitresLus = manga.chapters.filter(c => c.read).length;
        updateSerieChapitres.run(
          manga.chapters.length,
          chapitresLus,
          serieId
        );
        stats.chaptersImported += manga.chapters.length;
      }

      // Mettre à jour le statut utilisateur
      let statutLecture = 'À lire';
      if (manga.tracking && manga.tracking.length > 0) {
        const malTracking = manga.tracking.find(t => t.syncId === 1);
        if (malTracking && malTracking.status) {
          statutLecture = convertMalReadingStatus(malTracking.status);
        }
      } else if (manga.chapters && manga.chapters.some(c => c.read)) {
        statutLecture = 'En cours';
      }

      const chapitresLus = manga.chapters ? manga.chapters.filter(c => c.read).length : 0;
      upsertSerieStatut(serieId, currentUserId, statutLecture, chapitresLus);

    } catch (error) {
      console.error(`Erreur import manga "${manga.title || 'Sans titre'}":`, error);
      stats.errors++;
      // Extraire l'URL de la source pour le rapport d'erreur
      let errorSourceUrl = null;
      try {
        errorSourceUrl = await extractSourceUrl(manga, getPathManager, indexCache);
      } catch (e) {
        // Ignorer les erreurs d'extraction d'URL
      }
      // Ajouter au rapport d'erreur
      reportData.failed.push({
        titre: manga.title || 'Sans titre',
        error: error.message || String(error),
        source_url: errorSourceUrl || null
      });
    }
  }

  // Envoyer un événement de fin d'import
  if (progressCallback) {
    const elapsedMs = Date.now() - startTime;
    progressCallback({ 
      step: 'complete', 
      message: 'Import terminé', 
      progress: 100,
      total: totalMangas,
      current: totalMangas,
      imported: stats.created,
      updated: stats.updated,
      errors: stats.errors,
      elapsedMs: elapsedMs
    });
  }

  // Générer le rapport d'état complet avec rotation (10 rapports max)
  const reportPath = generateReport(getPathManager, {
    type: 'mihon-import',
    sourceFile: filePath,
    stats: {
      total: totalMangas,
      created: stats.created,
      updated: stats.updated,
      errors: stats.errors,
      skipped: stats.skipped,
      withMalId: stats.withMalId,
      chaptersImported: stats.chaptersImported
    },
    created: reportData.created,
    updated: reportData.updated,
    failed: reportData.failed,
    potentialMatches: reportData.potentialMatches || [],
    metadata: {
      user: currentUser,
      duration: Date.now() - startTime
    },
    maxReports: 10
  });

  return {
    success: true,
    stats: {
      total: totalMangas,
      created: stats.created,
      updated: stats.updated,
      skipped: stats.skipped,
      errors: stats.errors,
      withMalId: stats.withMalId,
      chaptersImported: stats.chaptersImported
    },
    reportPath: reportPath
  };
}

/**
 * Enregistre les handlers IPC pour l'import Mihon
 */
function registerMihonImportHandlers(ipcMain, getDb, getPathManager, store, dialog, getMainWindow) {
  // Sélectionner un fichier backup Mihon
  ipcMain.handle('select-mihon-backup-file', async () => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Sélectionner un backup Mihon',
        filters: [
          { name: 'Backup Mihon', extensions: ['tachibk'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      return { success: true, filePath: result.filePaths[0] };
    } catch (error) {
      console.error('Erreur sélection fichier backup Mihon:', error);
      return { success: false, error: error.message };
    }
  });

  // Importer le backup
  ipcMain.handle('import-mihon-backup', async (event, filePath) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // Créer un callback de progression qui envoie aussi au format global
      const progressCallback = (progress) => {
        // Envoyer au format spécifique Mihon (pour le modal)
        event.sender.send('mihon-import-progress', progress);
        
        // Envoyer aussi au format global (pour le footer)
        if (progress.step === 'index-download' || progress.step === 'downloading') {
          // Progression du téléchargement de l'index
          event.sender.send('manga-import-progress', {
            type: 'mihon-import',
            total: 1,
            current: progress.progress ? Math.round(progress.progress / 100) : 0,
            imported: 0,
            updated: 0,
            errors: 0,
            item: progress.message || 'Téléchargement de l\'index des sources...',
            elapsedMs: progress.elapsedMs,
            etaMs: progress.etaMs,
            speed: progress.speed
          });
        } else if (progress.step === 'importing' && progress.total) {
          // Progression de l'import
          event.sender.send('manga-import-progress', {
            type: 'mihon-import',
            total: progress.total,
            current: progress.current || 0,
            imported: progress.imported || 0,
            updated: progress.updated || 0,
            errors: progress.errors || 0,
            item: progress.message || '',
            elapsedMs: progress.elapsedMs,
            etaMs: progress.etaMs,
            speed: progress.speed
          });
        }
      };

      const result = await importMihonBackup(db, getPathManager, store, filePath, progressCallback);
      return result;
    } catch (error) {
      console.error('Erreur import-mihon-backup:', error);
      throw error;
    }
  });
}

module.exports = { registerMihonImportHandlers, importMihonBackup };
