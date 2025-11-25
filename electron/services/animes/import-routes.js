/**
 * Handlers d'import pour les animes
 * Routes: /api/import-anime, /api/mark-episode-watched, /api/update-anime, /add-anime
 */

const { parseRequestBody, sendErrorResponse, sendSuccessResponse, validateDbAndUser, notifyImportStart, notifyImportComplete } = require('../import-server-common');
const coverManager = require('../cover/cover-manager');
const { findAnimeByTitleNormalized } = require('./anime-import-search');
const { recordExtractedData } = require('../../utils/sync-error-reporter');

/**
 * Cherche un anime par titre ou MAL ID
 * Utilise maintenant la recherche normalisée avec Levenshtein comme pour les mangas
 */
function findAnimeByTitleOrMalId(db, titre, malId, titreRomaji, titreNatif, titreAnglais, titreAlternatif, type = null) {
  // 1. Recherche par MAL ID (le plus fiable)
  if (malId) {
    const anime = db.prepare('SELECT * FROM anime_series WHERE mal_id = ?').get(malId);
    if (anime) {
      console.log('✅ Anime trouvé par MAL ID:', anime.id);
      return {
        anime: anime,
        isExactMatch: true,
        similarity: 100
      };
    }
  }

  // 2. Recherche normalisée avec matching strict (comme pour les mangas)
  const matchResult = findAnimeByTitleNormalized(
    db,
    titre,
    titreRomaji,
    titreNatif,
    titreAnglais,
    titreAlternatif,
    type
  );

  if (matchResult) {
    const anime = matchResult.anime;

    // Récupérer l'anime complet
    const existing = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(anime.id);

    const existingMalId = existing && existing.mal_id !== null && existing.mal_id !== undefined
      ? Number(existing.mal_id)
      : null;
    const incomingMalId = malId !== null && malId !== undefined && malId !== ''
      ? Number(malId)
      : null;

    if (existing && existingMalId && incomingMalId && existingMalId !== incomingMalId) {
      console.log(`⚠️ MAL ID différent détecté (existant: ${existingMalId}, nouveau: ${incomingMalId}). Création d'une nouvelle entrée requise.`);
      return null;
    }

    // Retourner avec les informations de matching
    return {
      anime: existing,
      isExactMatch: matchResult.isExactMatch,
      similarity: matchResult.similarity,
      matchedTitle: matchResult.matchedTitle
    };
  }

  return null;
}

/**
 * Handler: POST /api/import-anime
 */
async function handleImportAnime(req, res, getDb, store, mainWindow, getPathManager) {
  try {
    const body = await parseRequestBody(req);
    const animeData = JSON.parse(body);
    console.log('🎬 Import anime:', animeData.titre);

    recordExtractedData({
      entityType: 'anime',
      entityId: animeData.mal_id || animeData.id || animeData.titre || `payload-${Date.now()}`,
      data: animeData
    });

    notifyImportStart(mainWindow, `Import anime: ${animeData.titre}...`);

    if (!animeData.titre) {
      return sendErrorResponse(res, 400, 'Le titre est obligatoire');
    }

    const { db, currentUser } = validateDbAndUser(getDb, store);

    // Vérifier si l'utilisateur a forcé la création ou confirmé une fusion
    const forceCreate = animeData._forceCreate === true;
    const confirmMerge = animeData._confirmMerge === true;
    const targetAnimeId = typeof animeData._targetAnimeId === 'number' ? animeData._targetAnimeId : null;

    // Vérifier si l'anime existe déjà avec recherche normalisée (sauf si forceCreate)
    let matchResult = null;
    if (!forceCreate) {
      matchResult = findAnimeByTitleOrMalId(
        db,
        animeData.titre,
        animeData.mal_id,
        animeData.titre_romaji,
        animeData.titre_natif,
        animeData.titre_anglais,
        animeData.titre_alternatif,
        animeData.type
      );
    }

    let animeId;

    if (matchResult && !forceCreate) {
      const existingAnime = matchResult.anime;

      // Si c'est un match strict (>=75%) mais pas exact, et pas de confirmation, proposer à l'utilisateur
      if (matchResult.isExactMatch === false && matchResult.similarity >= 75 && !confirmMerge && !targetAnimeId) {
        // Retourner une réponse pour proposer un overlay de sélection
        return sendSuccessResponse(res, {
          requiresSelection: true,
          candidate: {
            id: existingAnime.id,
            titre: existingAnime.titre,
            source_import: existingAnime.source_import,
            similarity: matchResult.similarity,
            matchedTitle: matchResult.matchedTitle
          },
          newAnimeData: {
            titre: animeData.titre,
            titre_romaji: animeData.titre_romaji,
            titre_natif: animeData.titre_natif
          }
        });
      }

      // Si targetAnimeId est fourni, utiliser cet anime
      if (targetAnimeId) {
        const targetAnime = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(targetAnimeId);
        if (!targetAnime) {
          return sendErrorResponse(res, 404, 'Anime cible introuvable');
        }
        animeId = targetAnimeId;
      } else {
        animeId = existingAnime.id;
      }

      // Mettre à jour l'anime existant (ne mettre à jour que les champs fournis, comme pour les mangas)
      console.log(`♻️ Mise à jour de l'anime existant: ${existingAnime.titre}`);

      // Récupérer l'anime complet pour avoir user_modified_fields
      const fullAnime = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(animeId);
      const userModifiedFields = fullAnime?.user_modified_fields || null;

      // Utiliser updateFieldIfNotUserModified pour respecter les champs protégés
      const { updateFieldIfNotUserModified } = require('../../utils/enrichment-helpers');

      // Détecter si les données viennent de Nautiljon
      const isFromNautiljon = animeData._source === 'Nautiljon' || animeData.source_import === 'nautiljon';

      if (isFromNautiljon) {
        console.log(`📥 Import Nautiljon détecté - nautiljon_url: ${animeData.nautiljon_url}, _url: ${animeData._url}`);
      }

      // Détecter les changements critiques pour signaler une mise à jour
      const currentNbEpisodes = fullAnime.nb_episodes || 0;
      const newNbEpisodes = animeData.nb_episodes !== undefined && animeData.nb_episodes !== null ? animeData.nb_episodes : currentNbEpisodes;
      const nbEpisodesChanged = newNbEpisodes > currentNbEpisodes; // Seulement si augmentation
      
      const currentStatutDiffusion = fullAnime.statut_diffusion || '';
      const newStatutDiffusion = animeData.statut_diffusion !== undefined && animeData.statut_diffusion !== null ? animeData.statut_diffusion : currentStatutDiffusion;
      const statutDiffusionChanged = newStatutDiffusion && newStatutDiffusion !== currentStatutDiffusion;
      
      const currentDateDebutStreaming = fullAnime.date_debut_streaming || null;
      const newDateDebutStreaming = animeData.date_debut_streaming !== undefined && animeData.date_debut_streaming !== null ? animeData.date_debut_streaming : currentDateDebutStreaming;
      const dateDebutStreamingChanged = newDateDebutStreaming && newDateDebutStreaming !== currentDateDebutStreaming;
      
      // Seuls ces changements déclenchent une notification de mise à jour
      const shouldSignalUpdate = nbEpisodesChanged || statutDiffusionChanged || dateDebutStreamingChanged;
      
      // Récupérer la valeur actuelle de maj_disponible
      const currentMajDisponible = fullAnime.maj_disponible || 0;
      const majDisponibleValue = shouldSignalUpdate ? 1 : currentMajDisponible;
      
      if (nbEpisodesChanged) {
        console.log(`  ✅ Nombre d'épisodes augmenté: ${currentNbEpisodes} → ${newNbEpisodes} (mise à jour signalée)`);
      }
      if (statutDiffusionChanged) {
        console.log(`  ✅ Statut de diffusion changé: ${currentStatutDiffusion || 'Aucun'} → ${newStatutDiffusion} (mise à jour signalée)`);
      }
      if (dateDebutStreamingChanged) {
        console.log(`  ✅ Date de début streaming changée: ${currentDateDebutStreaming || 'Aucune'} → ${newDateDebutStreaming} (mise à jour signalée)`);
      }

      // Construire la requête UPDATE dynamiquement (seulement les champs fournis)
      // Mais utiliser updateFieldIfNotUserModified pour chaque champ
      const fieldsToUpdate = [];
      const updates = [];
      const values = [];

      // Si l'import vient de Nautiljon, stocker l'URL dans le champ dédié
      const nautiljonUrl = animeData.nautiljon_url || animeData._url || null;
      if (isFromNautiljon && nautiljonUrl) {
        console.log(`🔗 Stockage URL Nautiljon pour anime ${animeId}: ${nautiljonUrl}`);
        updates.push('nautiljon_url = ?');
        values.push(nautiljonUrl);
      } else if (isFromNautiljon) {
        console.warn(`⚠️ Import Nautiljon détecté mais aucune URL trouvée (nautiljon_url: ${animeData.nautiljon_url}, _url: ${animeData._url})`);
      }

      // Construire les SET clauses seulement pour les champs fournis
      if (animeData.titre !== undefined && animeData.titre !== null) {
        updates.push('titre = ?');
        values.push(animeData.titre);
      }

      if (isFromNautiljon && animeData.titre_romaji !== undefined && animeData.titre_romaji !== null) {
        updates.push('titre_romaji = ?');
        values.push(animeData.titre_romaji);
      }

      if (isFromNautiljon && animeData.titre_natif !== undefined && animeData.titre_natif !== null) {
        updates.push('titre_natif = ?');
        values.push(animeData.titre_natif);
      }

      if (animeData.titre_anglais !== undefined && animeData.titre_anglais !== null) {
        updates.push('titre_anglais = ?');
        values.push(animeData.titre_anglais);
      }

      if (isFromNautiljon && animeData.titre_alternatif !== undefined && animeData.titre_alternatif !== null) {
        updates.push('titres_alternatifs = ?');
        values.push(animeData.titre_alternatif);
      }

      if (animeData.couverture_url !== undefined && animeData.couverture_url !== null) {
        updates.push('couverture_url = ?');
        values.push(animeData.couverture_url);
      }

      if (isFromNautiljon && animeData.description !== undefined && animeData.description !== null) {
        updates.push('description = ?');
        values.push(animeData.description);
      }

      if (animeData.statut_diffusion !== undefined && animeData.statut_diffusion !== null) {
        updates.push('statut_diffusion = ?');
        values.push(animeData.statut_diffusion);
      }

      if (animeData.type !== undefined && animeData.type !== null) {
        updates.push('type = ?');
        values.push(animeData.type);
      }

      if (isFromNautiljon && animeData.genres !== undefined && animeData.genres !== null) {
        updates.push('genres = ?');
        values.push(animeData.genres);
      }

      if (isFromNautiljon && animeData.themes !== undefined && animeData.themes !== null) {
        updates.push('themes = ?');
        values.push(animeData.themes);
      }

      if (isFromNautiljon && animeData.studios !== undefined && animeData.studios !== null) {
        updates.push('studios = ?');
        values.push(animeData.studios);
      }

      if (isFromNautiljon && animeData.diffuseurs !== undefined && animeData.diffuseurs !== null) {
        updates.push('diffuseurs = ?');
        values.push(animeData.diffuseurs);
      }

      if (isFromNautiljon && animeData.rating !== undefined && animeData.rating !== null) {
        updates.push('rating = ?');
        values.push(animeData.rating);
      }

      if (isFromNautiljon && animeData.duree !== undefined && animeData.duree !== null) {
        updates.push('duree = ?');
        values.push(animeData.duree);
      }

      if (isFromNautiljon && animeData.source !== undefined && animeData.source !== null) {
        updates.push('source = ?');
        values.push(animeData.source);
      }

      if (isFromNautiljon && animeData.date_debut !== undefined && animeData.date_debut !== null) {
        updates.push('date_debut = ?');
        values.push(animeData.date_debut);
      }

      if (isFromNautiljon && animeData.date_fin !== undefined && animeData.date_fin !== null) {
        updates.push('date_fin = ?');
        values.push(animeData.date_fin);
      }

      if (isFromNautiljon && animeData.date_sortie_vf !== undefined && animeData.date_sortie_vf !== null) {
        updates.push('date_sortie_vf = ?');
        values.push(animeData.date_sortie_vf);
      }

      if (isFromNautiljon && animeData.date_debut_streaming !== undefined && animeData.date_debut_streaming !== null) {
        updates.push('date_debut_streaming = ?');
        values.push(animeData.date_debut_streaming);
      }

      if (isFromNautiljon && animeData.age_conseille !== undefined && animeData.age_conseille !== null) {
        updates.push('age_conseille = ?');
        values.push(animeData.age_conseille);
      }

      if (isFromNautiljon && animeData.editeur !== undefined && animeData.editeur !== null) {
        updates.push('editeur = ?');
        values.push(animeData.editeur);
      }

      if (isFromNautiljon && animeData.site_web !== undefined && animeData.site_web !== null) {
        updates.push('site_web = ?');
        values.push(animeData.site_web);
      }

      // Fusionner liens_externes de Nautiljon avec ceux existants (si présents)
      if (isFromNautiljon && animeData.liens_externes !== undefined && animeData.liens_externes !== null) {
        try {
          const newLinksRaw = typeof animeData.liens_externes === 'string'
            ? JSON.parse(animeData.liens_externes)
            : animeData.liens_externes;

          if (Array.isArray(newLinksRaw) && newLinksRaw.length > 0) {
            // Filtrer les nouveaux liens selon les critères
            const { filterExternalLinks } = require('../../handlers/animes/anime-helpers');
            const newLinks = filterExternalLinks(newLinksRaw);

            // Récupérer les liens existants
            const existingAnime = db.prepare('SELECT liens_externes FROM anime_series WHERE id = ?').get(animeId);
            let mergedLinks = [];

            if (existingAnime && existingAnime.liens_externes) {
              try {
                const existingLinks = JSON.parse(existingAnime.liens_externes);
                if (Array.isArray(existingLinks)) {
                  // Filtrer aussi les liens existants pour s'assurer qu'ils sont conformes
                  mergedLinks = filterExternalLinks(existingLinks);
                }
              } catch (e) {
                // Ignorer les erreurs de parsing
              }
            }

            // Fonction pour extraire le code langue depuis une URL Wikipedia
            const getWikipediaLang = (url) => {
              try {
                const urlObj = new URL(url);
                const match = urlObj.hostname.match(/^([a-z]{2,3})\.(m\.)?wikipedia\.org$/i);
                return match ? match[1].toLowerCase() : null;
              } catch {
                return null;
              }
            };

            // Fonction pour créer une URL Wikipedia française
            const createFrenchWikipediaUrl = (url) => {
              try {
                const urlObj = new URL(url);
                urlObj.hostname = urlObj.hostname.replace(/^[a-z]{2,3}\.wikipedia/, 'fr.wikipedia');
                return urlObj.toString();
              } catch {
                return url;
              }
            };

            // Vérifier si un lien Wikipedia français existe déjà (dans les liens existants ou nouveaux)
            const hasFrenchWikipediaLink = mergedLinks.some(l => {
              const langCode = getWikipediaLang(l.url);
              return langCode === 'fr';
            }) || newLinks.some(newLink => {
              const url = typeof newLink === 'string' ? newLink : newLink.url;
              const langCode = getWikipediaLang(url);
              return langCode === 'fr';
            });

            // Ajouter les nouveaux liens sans doublons
            newLinks.forEach(newLink => {
              const url = typeof newLink === 'string' ? newLink : newLink.url;
              if (!url) return;

              // Ajouter le lien original
              if (!mergedLinks.find(l => l.url === url)) {
                mergedLinks.push({
                  name: typeof newLink === 'string' ? 'Wikipedia' : (newLink.name || 'Wikipedia'),
                  url: url
                });
              }
            });

            // Si aucun lien Wikipedia français n'existe, en créer un à partir du premier lien EN
            if (!hasFrenchWikipediaLink) {
              const { checkWikipediaUrlExists } = require('../../handlers/animes/anime-helpers');

              // Séparer les liens Wikipedia des autres
              const wikipediaLinks = newLinks.filter(l => {
                const url = typeof l === 'string' ? l : l.url;
                return url && url.includes('wikipedia.org');
              });

              const firstEnglishLink = wikipediaLinks.find(link => {
                const url = typeof link === 'string' ? link : link.url;
                const langCode = getWikipediaLang(url);
                return langCode === 'en';
              });

              if (firstEnglishLink) {
                const sourceUrl = typeof firstEnglishLink === 'string'
                  ? firstEnglishLink
                  : firstEnglishLink.url;
                const frenchUrl = createFrenchWikipediaUrl(sourceUrl);

                // Vérifier que la page existe avant de l'ajouter
                const exists = await checkWikipediaUrlExists(frenchUrl);

                if (exists && !mergedLinks.find(l => l.url === frenchUrl)) {
                  mergedLinks.push({
                    name: 'Wikipedia',
                    url: frenchUrl
                  });
                  console.log(`✅ Lien Wikipedia français ajouté: ${frenchUrl}`);
                } else if (!exists) {
                  console.log(`⚠️ Page Wikipedia française n'existe pas: ${frenchUrl}`);
                }
              }
            }

            updates.push('liens_externes = ?');
            values.push(JSON.stringify(mergedLinks));
          }
        } catch (e) {
          console.error('Erreur parsing liens_externes:', e);
        }
      }

      if (animeData.en_cours_diffusion !== undefined) {
        updates.push('en_cours_diffusion = ?');
        values.push(animeData.en_cours_diffusion ? 1 : 0);
      }

      if (isFromNautiljon && animeData.saison_diffusion !== undefined && animeData.saison_diffusion !== null) {
        updates.push('saison_diffusion = ?');
        values.push(animeData.saison_diffusion);
      }

      if (animeData.nb_episodes !== undefined && animeData.nb_episodes !== null) {
        updates.push('nb_episodes = ?');
        values.push(animeData.nb_episodes);
      }

      if (animeData.annee !== undefined && animeData.annee !== null) {
        updates.push('annee = ?');
        values.push(animeData.annee);
      } else if (animeData.date_debut) {
        const year = parseInt(animeData.date_debut.substring(0, 4));
        if (!isNaN(year)) {
          updates.push('annee = ?');
          values.push(year);
        }
      }

      // Toujours mettre à jour updated_at
      // Ajouter updated_at et l'ID à la fin
      updates.push('updated_at = datetime(\'now\')');
      values.push(animeId);

      if (updates.length > 0) {
        // Ajouter maj_disponible et derniere_verif à la requête UPDATE
        updates.push('maj_disponible = ?');
        values.push(majDisponibleValue);
        updates.push('derniere_verif = datetime(\'now\')');
        
        const updateQuery = `UPDATE anime_series SET ${updates.join(', ')} WHERE id = ?`;
        console.log(`🔧 Exécution UPDATE pour anime ${animeId}:`, updateQuery);
        console.log(`🔧 Valeurs (${values.length}):`, values.map((v, i) => `${i}: ${typeof v === 'string' && v.length > 100 ? v.substring(0, 100) + '...' : v}`));
        const result = db.prepare(updateQuery).run(...values, animeId);
        console.log(`✅ ${updates.length - 3} champ(s) mis à jour pour l'anime ID ${animeId} (${result.changes} ligne(s) modifiée(s))${shouldSignalUpdate ? ' - Mise à jour signalée' : ''}`);

        // Vérifier que l'URL a bien été stockée
        if (isFromNautiljon) {
          const verifyAnime = db.prepare('SELECT mal_url, relations FROM anime_series WHERE id = ?').get(animeId);
          console.log(`🔍 Vérification stockage - mal_url: ${verifyAnime?.mal_url}, relations: ${verifyAnime?.relations ? JSON.stringify(JSON.parse(verifyAnime.relations)) : 'null'}`);
        }
      } else {
        console.warn(`⚠️ Aucune mise à jour à effectuer pour l'anime ${animeId}`);
      }

    } else {
      // Créer un nouvel anime
      console.log(`✨ Création d'un nouvel anime: ${animeData.titre}`);

      // Détection automatique de la source
      let sourceImport = animeData.source_import;
      if (!sourceImport) {
        // Si les données viennent de Nautiljon, utiliser 'nautiljon'
        if (animeData._source === 'Nautiljon') {
          sourceImport = 'nautiljon';
        } else if (animeData.mal_id) {
          sourceImport = 'myanimelist';
        } else {
          sourceImport = 'manual';
        }
      }

      // Convertir currentUser (nom) en user_id (ID)
      let userId = null;
      if (currentUser) {
        const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
        if (user) {
          userId = user.id;
        } else {
          console.warn(`⚠️ Utilisateur "${currentUser}" non trouvé dans la base de données, user_id_ajout sera null`);
        }
      }

      // Préparer liens_externes pour l'insertion et ajouter automatiquement la version française
      let liensExternesJson = null;
      if (animeData.liens_externes) {
        try {
          const linksRaw = typeof animeData.liens_externes === 'string'
            ? JSON.parse(animeData.liens_externes)
            : animeData.liens_externes;

          if (Array.isArray(linksRaw) && linksRaw.length > 0) {
            // Filtrer les liens selon les critères
            const { filterExternalLinks, checkWikipediaUrlExists } = require('../../handlers/animes/anime-helpers');
            const links = filterExternalLinks(linksRaw);

            const processedLinks = [];

            // Fonction pour extraire le code langue depuis une URL Wikipedia
            const getWikipediaLang = (url) => {
              try {
                const urlObj = new URL(url);
                const match = urlObj.hostname.match(/^([a-z]{2,3})\.(m\.)?wikipedia\.org$/i);
                return match ? match[1].toLowerCase() : null;
              } catch {
                return null;
              }
            };

            // Fonction pour créer une URL Wikipedia française
            const createFrenchWikipediaUrl = (url) => {
              try {
                const urlObj = new URL(url);
                urlObj.hostname = urlObj.hostname.replace(/^[a-z]{2,3}\.wikipedia/, 'fr.wikipedia');
                return urlObj.toString();
              } catch {
                return url;
              }
            };

            // Séparer les liens Wikipedia des autres
            const wikipediaLinks = links.filter(l => l.name === 'Wikipedia');
            const otherLinks = links.filter(l => l.name !== 'Wikipedia');

            // Vérifier si un lien Wikipedia français existe déjà
            const hasFrenchWikipediaLink = wikipediaLinks.some(link => {
              const langCode = getWikipediaLang(link.url);
              return langCode === 'fr';
            });

            // Ajouter les liens Wikipedia
            wikipediaLinks.forEach(link => {
              processedLinks.push({
                name: 'Wikipedia',
                url: link.url
              });
            });

            // Si aucun lien Wikipedia français n'existe, en créer un à partir du premier lien EN
            if (!hasFrenchWikipediaLink && wikipediaLinks.length > 0) {
              const firstEnglishLink = wikipediaLinks.find(link => {
                const langCode = getWikipediaLang(link.url);
                return langCode === 'en';
              });

              if (firstEnglishLink) {
                const frenchUrl = createFrenchWikipediaUrl(firstEnglishLink.url);

                // Vérifier que la page existe avant de l'ajouter
                const exists = await checkWikipediaUrlExists(frenchUrl);

                if (exists && !processedLinks.find(l => l.url === frenchUrl)) {
                  processedLinks.push({
                    name: 'Wikipedia',
                    url: frenchUrl
                  });
                  console.log(`✅ Lien Wikipedia français ajouté: ${frenchUrl}`);
                } else if (!exists) {
                  console.log(`⚠️ Page Wikipedia française n'existe pas: ${frenchUrl}`);
                }
              }
            }

            // Ajouter les autres liens (déjà filtrés)
            otherLinks.forEach(link => {
              processedLinks.push({
                name: link.name || 'Lien externe',
                url: link.url
              });
            });

            liensExternesJson = JSON.stringify(processedLinks);
          }
        } catch (e) {
          console.error('Erreur parsing liens_externes lors de l\'insertion:', e);
        }
      }

      // Si l'import vient de Nautiljon, stocker l'URL dans le champ dédié
      const nautiljonUrlForInsert = (isFromNautiljon && (animeData.nautiljon_url || animeData._url))
        ? (animeData.nautiljon_url || animeData._url)
        : null;

      if (isFromNautiljon && nautiljonUrlForInsert) {
        console.log(`🔗 Création anime avec URL Nautiljon: ${nautiljonUrlForInsert}`);
      } else if (isFromNautiljon) {
        console.warn(`⚠️ Import Nautiljon détecté mais aucune URL trouvée lors de la création (nautiljon_url: ${animeData.nautiljon_url}, _url: ${animeData._url})`);
      }

      const insertResult = db.prepare(`
        INSERT INTO anime_series (
          titre, titre_romaji, titre_natif, titre_anglais, titres_alternatifs,
          couverture_url, description, statut_diffusion, type, 
          nb_episodes, genres, themes, studios, diffuseurs, rating,
          duree, source, date_debut, date_fin, date_sortie_vf, date_debut_streaming,
          en_cours_diffusion, saison_diffusion, annee, mal_id, mal_url, source_import, user_id_ajout,
          age_conseille, editeur, site_web, liens_externes, relations, nautiljon_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        animeData.titre,
        animeData.titre_romaji || null,
        animeData.titre_natif || null,
        animeData.titre_anglais || null,
        animeData.titre_alternatif || null,
        animeData.couverture_url || null,
        animeData.description || null,
        animeData.statut_diffusion || 'En cours',
        animeData.type || 'TV',
        animeData.nb_episodes || 0,
        animeData.genres || null,
        animeData.themes || null,
        animeData.studios || null,
        animeData.diffuseurs || null,
        animeData.rating || null,
        animeData.duree || null,
        animeData.source || null,
        animeData.date_debut || null,
        animeData.date_fin || null,
        animeData.date_sortie_vf || null,
        animeData.date_debut_streaming || null,
        animeData.en_cours_diffusion ? 1 : 0,
        animeData.saison_diffusion || null,
        animeData.annee || (animeData.date_debut ? parseInt(animeData.date_debut.substring(0, 4)) : null),
        animeData.mal_id || null,
        null, // mal_url reste null si c'est un import Nautiljon
        sourceImport,
        userId,
        animeData.age_conseille || null,
        animeData.editeur || null,
        animeData.site_web || null,
        liensExternesJson,
        null, // relations reste null, on n'y stocke plus l'URL Nautiljon
        nautiljonUrlForInsert // URL Nautiljon dans le champ dédié
      );

      animeId = insertResult.lastInsertRowid;
    }

    // Télécharger la couverture
    const pm = getPathManager();
    const autoDownload = store.get('autoDownloadCovers', false) === true;
    if (autoDownload && animeData.couverture_url && pm) {
      try {
        console.log(`📥 Tentative de téléchargement de la couverture depuis: ${animeData.couverture_url}`);
        // Protection: ne pas écraser une image locale ou un champ protégé par l'utilisateur
        const row = db.prepare('SELECT couverture_url, user_modified_fields FROM anime_series WHERE id = ?').get(animeId);
        const currentCover = row?.couverture_url || '';
        const userModified = row?.user_modified_fields || null;
        const { isFieldUserModified } = require('../../utils/enrichment-helpers');
        const isLocalCover = currentCover && !currentCover.includes('://') && !currentCover.startsWith('data:');
        const isUserProtected = isFieldUserModified(userModified, 'couverture_url');

        if (!isLocalCover && !isUserProtected) {
          const coverResult = await coverManager.downloadCover(
            pm,
            animeData.couverture_url,
            animeData.titre,
            'anime',
            animeId
          );

          if (coverResult.success && coverResult.localPath) {
            db.prepare('UPDATE anime_series SET couverture_url = ? WHERE id = ?')
              .run(coverResult.localPath, animeId);
            console.log(`✅ Couverture d'anime téléchargée et mise à jour en BDD: ${coverResult.localPath}`);
          }
        } else {
          // Skip: conserver la couverture actuelle (locale ou protégée)
        }
      } catch (error) {
        console.error(`❌ Erreur téléchargement couverture:`, error);
      }
    }

    // Créer les saisons si fournies
    let saisonsCreated = 0;
    if (animeData.saisons && Array.isArray(animeData.saisons) && animeData.saisons.length > 0) {
      console.log(`📊 Données saisons reçues:`, JSON.stringify(animeData.saisons));

      const maxSeasonNumber = Math.max(...animeData.saisons.map(s => s.numero_saison));
      console.log(`🔢 Numéro de saison max détecté: ${maxSeasonNumber}`);

      let totalEpisodes = 0;
      for (let seasonNum = 1; seasonNum <= maxSeasonNumber; seasonNum++) {
        const saisonData = animeData.saisons.find(s => s.numero_saison === seasonNum);
        const nbEpisodes = saisonData?.nb_episodes || 12;
        totalEpisodes += nbEpisodes;
        console.log(`📊 Saison ${seasonNum}: ${nbEpisodes} épisodes`);
      }

      // Détecter si le nombre d'épisodes a augmenté
      const currentAnime = db.prepare('SELECT nb_episodes, maj_disponible FROM anime_series WHERE id = ?').get(animeId);
      const currentNbEpisodes = currentAnime?.nb_episodes || 0;
      const nbEpisodesChanged = totalEpisodes > currentNbEpisodes;
      const currentMajDisponible = currentAnime?.maj_disponible || 0;
      const majDisponibleValue = nbEpisodesChanged ? 1 : currentMajDisponible;
      
      if (nbEpisodesChanged) {
        console.log(`✅ Nombre total d'épisodes: ${totalEpisodes} (augmenté de ${currentNbEpisodes}, mise à jour signalée)`);
      } else {
        console.log(`✅ Nombre total d'épisodes: ${totalEpisodes}`);
      }
      
      db.prepare('UPDATE anime_series SET nb_episodes = ?, maj_disponible = ?, derniere_verif = datetime(\'now\') WHERE id = ?')
        .run(totalEpisodes, majDisponibleValue, animeId);
    }

    notifyImportComplete(mainWindow);

    // Notifier la page de collection pour rafraîchir la liste
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('refresh-anime-list');
    }

    const wasUpdate = matchResult && !forceCreate;
    const message = wasUpdate
      ? `Anime "${animeData.titre}" mis à jour avec ${saisonsCreated} saison(s)`
      : `Anime "${animeData.titre}" ajouté avec ${saisonsCreated} saison(s)`;

    sendSuccessResponse(res, {
      animeId: animeId,
      saisonsCreated: saisonsCreated,
      message: message
    });

  } catch (error) {
    console.error('❌ Erreur import-anime:', error);
    notifyImportComplete(mainWindow);

    // Notifier la page de collection pour rafraîchir la liste
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('refresh-anime-list');
    }
    sendErrorResponse(res, 500, error.message);
  }
}

/**
 * Handler: POST /api/mark-episode-watched
 */
async function handleMarkEpisodeWatched(req, res, getDb, store) {
  try {
    const body = await parseRequestBody(req);
    const episodeInfo = JSON.parse(body);
    console.log('✅ Marquer épisode comme vu:', episodeInfo);

    if (!episodeInfo.titre || !episodeInfo.saison_numero || !episodeInfo.episode_numero) {
      return sendErrorResponse(res, 400, 'Données manquantes (titre, saison_numero, episode_numero)');
    }

    const { db, currentUser } = validateDbAndUser(getDb, store);

    // Récupérer l'ID de l'utilisateur
    const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
    if (!user) {
      console.error(`❌ Utilisateur "${currentUser}" non trouvé`);
      return sendErrorResponse(res, 404, `Utilisateur non trouvé`);
    }
    const userId = user.id;

    // Chercher l'anime (avec recherche normalisée si les titres sont disponibles)
    const anime = findAnimeByTitleOrMalId(
      db,
      episodeInfo.titre,
      episodeInfo.mal_id,
      episodeInfo.titre_romaji || null,
      episodeInfo.titre_natif || null,
      episodeInfo.titre_anglais || null,
      episodeInfo.titre_alternatif || null,
      episodeInfo.type || null
    );

    if (!anime) {
      console.error('❌ Anime non trouvé. Recherche:', episodeInfo.titre);
      return sendErrorResponse(res, 404, `Anime "${episodeInfo.titre}" non trouvé dans votre collection`);
    }

      // Étendre automatiquement le nombre d'épisodes si nécessaire
      if (episodeInfo.episode_numero > anime.nb_episodes) {
        console.log(`📈 Extension du nombre d'épisodes: ${anime.nb_episodes} → ${episodeInfo.episode_numero} épisodes (mise à jour signalée)`);
        const currentMajDisponible = anime.maj_disponible || 0;
        db.prepare(`
          UPDATE anime_series 
          SET nb_episodes = ?,
              maj_disponible = 1,
              derniere_verif = datetime('now')
          WHERE id = ?
        `).run(episodeInfo.episode_numero, anime.id);

        anime.nb_episodes = episodeInfo.episode_numero;
      }

    // Auto-incrémentation : marquer tous les épisodes précédents comme vus
    const baseDate = new Date();

    if (episodeInfo.episode_numero > 1) {
      console.log(`🔄 Auto-incrémentation: marquage des épisodes 1 à ${episodeInfo.episode_numero - 1} comme vus`);

      for (let ep = 1; ep < episodeInfo.episode_numero; ep++) {
        const dateVisionnage = new Date(baseDate.getTime() + ((ep - 1) * 1000));
        const dateVisionnageStr = dateVisionnage.toISOString().replace('T', ' ').replace('Z', '');
        db.prepare(`
          INSERT OR REPLACE INTO anime_episodes_vus (anime_id, user_id, episode_numero, vu, date_visionnage)
          VALUES (?, ?, ?, 1, ?)
        `).run(anime.id, userId, ep, dateVisionnageStr);
      }

      console.log(`✅ Épisodes 1-${episodeInfo.episode_numero - 1} auto-marqués comme vus`);
    }

    // Marquer l'épisode actuel comme vu
    const dateVisionnageActuel = new Date(baseDate.getTime() + ((episodeInfo.episode_numero - 1) * 1000));
    const dateVisionnageActuelStr = dateVisionnageActuel.toISOString().replace('T', ' ').replace('Z', '');
    db.prepare(`
      INSERT OR REPLACE INTO anime_episodes_vus (anime_id, user_id, episode_numero, vu, date_visionnage)
      VALUES (?, ?, ?, 1, ?)
    `).run(anime.id, userId, episodeInfo.episode_numero, dateVisionnageActuelStr);

    console.log(`✅ Épisode ${episodeInfo.episode_numero} de "${anime.titre}" marqué comme vu`);

    // Vérifier si tous les épisodes sont vus
    const stats = db.prepare(`
      SELECT 
        a.nb_episodes as nb_episodes_total,
        (
          SELECT COUNT(*) 
          FROM anime_episodes_vus 
          WHERE anime_id = ? AND user_id = ? AND vu = 1
        ) as nb_episodes_vus
      FROM anime_series a
      WHERE a.id = ?
    `).get(anime.id, userId, anime.id);

    const isComplete = stats.nb_episodes_total > 0 && stats.nb_episodes_vus === stats.nb_episodes_total;

    if (isComplete) {
      db.prepare(`
        INSERT OR REPLACE INTO anime_statut_utilisateur (anime_id, user_id, statut_visionnage, date_modification)
        VALUES (?, ?, 'Terminé', CURRENT_TIMESTAMP)
      `).run(anime.id, userId);
      console.log(`🎉 Anime "${anime.titre}" marqué comme "Terminé" automatiquement`);
    }

    const totalMarked = episodeInfo.episode_numero > 1 ? episodeInfo.episode_numero : 1;
    const message = episodeInfo.episode_numero > 1 ?
      `${totalMarked} épisodes marqués comme vus (auto-incrémentation 1-${episodeInfo.episode_numero})` :
      `Épisode ${episodeInfo.episode_numero} marqué comme vu`;

    sendSuccessResponse(res, {
      message: message,
      totalMarked: totalMarked,
      isComplete: isComplete
    });

  } catch (error) {
    console.error('❌ Erreur mark-episode-watched:', error);
    sendErrorResponse(res, 500, error.message);
  }
}

/**
 * Handler: POST /api/update-anime
 */
async function handleUpdateAnime(req, res, getDb) {
  try {
    const body = await parseRequestBody(req);
    const animeData = JSON.parse(body);
    console.log('📝 Mise à jour anime:', animeData.id);

    const db = getDb();
    if (!db) {
      throw new Error('Base de données non initialisée');
    }

    // Vérifier que l'anime existe
    const anime = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(animeData.id);
    if (!anime) {
      throw new Error(`Anime avec l'ID ${animeData.id} non trouvé`);
    }

    // Mettre à jour les données de l'anime
    db.prepare(`
      UPDATE anime_series 
      SET titre = ?, titre_natif = ?, description = ?, statut = ?, 
          type = ?, genres = ?, studios = ?, annee = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      animeData.titre,
      animeData.titre_natif || null,
      animeData.description || null,
      animeData.statut || 'En cours',
      animeData.type || 'TV',
      animeData.genres || null,
      animeData.studios || null,
      animeData.annee || null,
      animeData.id
    );

    console.log(`✅ Anime "${animeData.titre}" mis à jour`);

    // Mettre à jour les saisons si fournies
    if (animeData.saisons && Array.isArray(animeData.saisons)) {
      let totalEpisodes = 0;
      for (const saison of animeData.saisons) {
        totalEpisodes += saison.nb_episodes || 0;
      }
      if (totalEpisodes > 0) {
        // Détecter si le nombre d'épisodes a augmenté
        const currentAnime = db.prepare('SELECT nb_episodes, maj_disponible FROM anime_series WHERE id = ?').get(animeData.id);
        const currentNbEpisodes = currentAnime?.nb_episodes || 0;
        const nbEpisodesChanged = totalEpisodes > currentNbEpisodes;
        const currentMajDisponible = currentAnime?.maj_disponible || 0;
        const majDisponibleValue = nbEpisodesChanged ? 1 : currentMajDisponible;
        
        if (nbEpisodesChanged) {
          console.log(`✅ Nombre total d'épisodes mis à jour: ${totalEpisodes} (augmenté de ${currentNbEpisodes}, mise à jour signalée)`);
        } else {
          console.log(`✅ Nombre total d'épisodes mis à jour: ${totalEpisodes}`);
        }
        
        db.prepare('UPDATE anime_series SET nb_episodes = ?, maj_disponible = ?, derniere_verif = datetime(\'now\') WHERE id = ?')
          .run(totalEpisodes, majDisponibleValue, animeData.id);
      }
    }

    sendSuccessResponse(res, {
      message: `Anime "${animeData.titre}" mis à jour avec succès`
    });

  } catch (error) {
    console.error('❌ Erreur update-anime:', error);
    sendErrorResponse(res, 500, error.message);
  }
}

/**
 * Handler: POST /add-anime (import rapide via MAL ID)
 */
async function handleAddAnime(req, res, mainWindow) {
  try {
    const body = await parseRequestBody(req);
    const data = JSON.parse(body);
    const malId = data.mal_id;

    if (!malId || isNaN(parseInt(malId))) {
      return sendErrorResponse(res, 400, 'MAL ID invalide');
    }

    console.log(`🎬 Import rapide MAL ID: ${malId} depuis Tampermonkey`);

    notifyImportStart(mainWindow, `Import anime MAL ID: ${malId}...`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      // Préparer les options depuis le payload
      // Note: le handler IPC utilise targetSerieId pour les animes (historique)
      const options = {};
      if (data.targetAnimeId || data._targetAnimeId || data.targetSerieId || data._targetSerieId) {
        options.targetSerieId = data.targetAnimeId || data._targetAnimeId || data.targetSerieId || data._targetSerieId;
      }
      if (data.forceCreate === true || data._forceCreate === true) {
        options.forceCreate = true;
      }
      if (data.confirmMerge === true || data._confirmMerge === true) {
        options.confirmMerge = true;
      }
      
      // Ne pas forcer forceCreate: true par défaut, laisser le matching unifié fonctionner
      const result = await mainWindow.webContents.executeJavaScript(`
        window.electronAPI.addAnimeByMalId(${malId}, ${JSON.stringify(options)})
      `);

      // Ne pas envoyer manga-import-complete immédiatement si requiresSelection
      if (!result.requiresSelection) {
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('manga-import-complete');
            mainWindow.webContents.send('refresh-anime-list');
          }
        }, 1500); // Délai pour s'assurer que la DB est bien mise à jour
      }

      if (result.success) {
        sendSuccessResponse(res, {
          anime: result.anime,
          message: `${result.anime.titre} ajouté avec succès !`
        });
      } else if (result.requiresSelection && Array.isArray(result.candidates)) {
        // Proposer un overlay de sélection côté navigateur (Tampermonkey)
        sendSuccessResponse(res, {
          requiresSelection: true,
          candidates: result.candidates,
          malId: malId,
          message: result.error || 'Anime similaire trouvé'
        });
      } else {
        sendErrorResponse(res, 400, result.error || 'Erreur lors de l\'import');
      }
    } else {
      sendErrorResponse(res, 500, 'Fenêtre principale non disponible');
    }

  } catch (error) {
    console.error('❌ Erreur add-anime:', error);
    notifyImportComplete(mainWindow);

    // Notifier la page de collection pour rafraîchir la liste
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('refresh-anime-list');
    }
    sendErrorResponse(res, 500, error.message);
  }
}

/**
 * Enregistre les routes anime
 */
function registerAnimeRoutes(req, res, getDb, store, mainWindow, getPathManager) {
  if (req.method === 'POST' && req.url === '/api/import-anime') {
    handleImportAnime(req, res, getDb, store, mainWindow, getPathManager);
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/mark-episode-watched') {
    handleMarkEpisodeWatched(req, res, getDb, store);
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/update-anime') {
    handleUpdateAnime(req, res, getDb);
    return true;
  }

  if (req.method === 'POST' && req.url === '/add-anime') {
    handleAddAnime(req, res, mainWindow);
    return true;
  }

  return false;
}

module.exports = {
  registerAnimeRoutes,
  handleImportAnime,
  handleMarkEpisodeWatched,
  handleUpdateAnime,
  handleAddAnime
};
