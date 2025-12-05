// Import des fonctions communes
const { getPaths } = require('../common-helpers');
const { createSlug } = require('../../utils/slug');
const { fetchJikanMangaData } = require('../../services/mangas/manga-api-helpers');

// Convertir le rating MAL (classification d'âge)
function convertMALRating(rating) {
  if (!rating) return null;
  // Rx = contenu pornographique explicite (le plus explicite)
  if (rating.includes('Rx') || rating.includes('Hentai')) return 'erotica';
  // R+ = contenu adulte explicite
  if (rating.includes('R+') || rating.includes('R-')) return 'erotica';
  // R - 17+ = contenu mature (violence, langage) → suggestive
  if (rating.includes('R - 17') || rating.includes('17+')) return 'suggestive';
  // PG-13 = contenu pour adolescents (13+) → safe
  if (rating.includes('PG-13')) return 'safe';
  // Par défaut = safe
  return 'safe';
}

// Déduire le rating depuis les genres/thèmes et le type si le rating n'est pas disponible
function inferRatingFromGenresAndType(genres, themes, type) {
  // Vérifier le type d'abord (Doujinshi = généralement hentai)
  if (type && type.toLowerCase().includes('doujinshi')) {
    return 'erotica';
  }
  
  // Ensuite vérifier les genres/thèmes
  if (!genres && !themes) return null;
  
  const allGenres = `${genres || ''}, ${themes || ''}`.toLowerCase();
  
  // Genres explicites → erotica
  if (allGenres.includes('hentai') || allGenres.includes('erotica')) {
    return 'erotica';
  }
  
  // Genre suggestif → suggestive
  if (allGenres.includes('ecchi')) {
    return 'suggestive';
  }
  
  return null;
}

function normalizeTitle(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\u2000-\u200B\u2028\u2029]+/g, ' ')
    .trim();
}

function normalizeMediaTypeValue(mediaType) {
  const lower = (mediaType || '').toLowerCase();
  if (lower.includes('light novel') || lower.includes('novel')) return 'light novel';
  if (lower.includes('manhwa') || lower.includes('webtoon')) return 'manhwa';
  if (lower.includes('manhua')) return 'manhua';
  if (lower.includes('manga')) return 'manga';
  return lower;
}

function determineMediaTypeFromJikan(typeStr) {
  const lower = (typeStr || '').toLowerCase();
  if (lower.includes('light novel') || lower.includes('novel')) return 'light novel';
  if (lower.includes('manhwa')) return 'manhwa';
  if (lower.includes('manhua')) return 'manhua';
  return 'manga';
}

function findSerieCandidates(db, titles) {
  const normalizedCandidates = new Set();
  titles
    .filter(Boolean)
    .forEach(title => {
      const normalized = normalizeTitle(title);
      if (normalized) {
        normalizedCandidates.add(normalized);
      }
    });

  if (normalizedCandidates.size === 0) {
    return [];
  }

  const rows = db.prepare(`
    SELECT id, titre, titres_alternatifs, media_type, type_volume, mal_id, statut, source_donnees
    FROM manga_series
  `).all();

  const matches = [];
  const seenIds = new Set();

  for (const row of rows) {
    const baseNormalized = normalizeTitle(row.titre);
    let isMatch = normalizedCandidates.has(baseNormalized);

    if (!isMatch && row.titres_alternatifs) {
      const { safeJsonParse } = require('../common-helpers');
      const alts = safeJsonParse(row.titres_alternatifs, []);
      if (Array.isArray(alts)) {
        for (const alt of alts) {
          if (normalizedCandidates.has(normalizeTitle(alt))) {
            isMatch = true;
            break;
          }
        }
      }
    }

    if (isMatch && !seenIds.has(row.id)) {
      matches.push(row);
      seenIds.add(row.id);
    }
  }

  return matches;
}

/**
 * Enregistre les handlers IPC pour l'enrichissement des séries (ajout via MAL ID, traduction)
 */
function registerMangaEnrichmentHandlers(ipcMain, getDb, getPathManager, store) {
  // Ajouter un manga via MAL ID (Tampermonkey Quick Add)
  ipcMain.handle('add-manga-by-mal-id', async (event, malIdOrUrl, options = {}) => {
    try {
      const db = getDb();
      if (!db) throw new Error('Base de données non initialisée');

      const currentUser = store.get('currentUser', '');
      if (!currentUser) throw new Error('Aucun utilisateur connecté');

      const targetSerieId = typeof options.targetSerieId === 'number' ? options.targetSerieId : null;
      const forceCreate = options.forceCreate === true;

      // Extraire le MAL ID depuis l'URL si nécessaire
      let malId = malIdOrUrl;
      if (typeof malIdOrUrl === 'string' && malIdOrUrl.includes('myanimelist.net')) {
        const match = malIdOrUrl.match(/manga\/(\d+)/);
        if (!match) throw new Error('URL MyAnimeList invalide');
        malId = parseInt(match[1]);
      } else {
        malId = parseInt(malId);
      }

      if (isNaN(malId)) throw new Error('MAL ID invalide');

      let existingSerie = db.prepare('SELECT * FROM manga_series WHERE mal_id = ?').get(malId);
      if (existingSerie) {
        return {
          success: false,
          error: `Ce manga existe déjà : ${existingSerie.titre}`,
          mangaId: existingSerie.id
        };
      }

      const jikanData = await fetchJikanMangaData(malId);
      const jikanMediaType = determineMediaTypeFromJikan(jikanData.type);

      // Préparer les données pour le matching unifié
      const sourceData = {
        titre: jikanData.title || jikanData.title_english || `Manga #${malId}`,
        mal_id: malId,
        titre_romaji: jikanData.title || null,
        titre_natif: jikanData.title_japanese || null,
        titre_anglais: jikanData.title_english || null,
        titres_alternatifs: jikanData.title_synonyms ? JSON.stringify(jikanData.title_synonyms) : null
      };

      // Utiliser le service de matching unifié
      const { findExistingSerieUnified } = require('../../services/unified-matching-service');
      const matchResult = findExistingSerieUnified(
        db,
        sourceData,
        'mal',
        jikanMediaType
      );

      // Si un match a été trouvé (exact ou avec similarité >= 75%)
      if (matchResult && !forceCreate && !targetSerieId) {
        // Si c'est un match exact, proposer directement la fusion
        // Si c'est un match avec similarité, proposer un overlay de sélection
        if (matchResult.isExactMatch || matchResult.similarity >= 75) {
          return {
            success: false,
            requiresSelection: true,
            malId,
            candidates: [{
              id: matchResult.serie.id,
              titre: matchResult.serie.titre,
              media_type: matchResult.serie.media_type,
              type_volume: matchResult.serie.type_volume,
              source_donnees: matchResult.serie.source_donnees,
              statut: matchResult.serie.statut,
              mal_id: matchResult.serie.mal_id,
              similarity: matchResult.similarity,
              isExactMatch: matchResult.isExactMatch,
              matchMethod: matchResult.matchMethod
            }]
          };
        }
      }

      let serieToUpdate = null;
      let matchResultFinal = null;
      
      if (targetSerieId) {
        serieToUpdate = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(targetSerieId);
        if (!serieToUpdate) {
          return {
            success: false,
            error: 'Série sélectionnée introuvable'
          };
        }

        if (serieToUpdate.mal_id && serieToUpdate.mal_id !== malId) {
          return {
            success: false,
            error: `Cette série est déjà liée au MAL ID ${serieToUpdate.mal_id}`,
            mangaId: serieToUpdate.id
          };
        }

        const existingMediaType = normalizeMediaTypeValue(serieToUpdate.media_type) ||
          normalizeMediaTypeValue(serieToUpdate.type_volume);
        if (existingMediaType && existingMediaType !== jikanMediaType) {
          return {
            success: false,
            error: 'Le type de média détecté ne correspond pas à la série sélectionnée.'
          };
        }
        
        // Utiliser la série sélectionnée pour la fusion
        matchResultFinal = {
          serie: serieToUpdate,
          isExactMatch: true,
          similarity: 100,
          matchMethod: 'user_selection'
        };
      } else if (matchResult) {
        // Utiliser le résultat du matching unifié
        matchResultFinal = matchResult;
      }

      if (serieToUpdate || matchResultFinal) {
        existingSerie = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(
          (serieToUpdate || matchResultFinal.serie).id
        );
      }

      // Extraire les données
      const titre = jikanData.title || jikanData.title_english || `Manga #${malId}`;
      
      const synopsis = jikanData.synopsis || '';
      const nbChapitres = jikanData.chapters || null;
      const nbVolumes = jikanData.volumes || null;
      const anneePublication = jikanData.published?.from ? new Date(jikanData.published.from).getFullYear() : null;
      const statut = jikanData.status === 'Finished' ? 'Terminée' : 
                     jikanData.status === 'Publishing' ? 'En cours' : 
                     'En cours';
      
      // Genres
      const { deduplicateCommaSeparatedItems } = require('../../utils/data-normalization');
      const { genreTranslations, themeTranslations } = require('../../utils/translation-dictionaries');
      const genresRaw = jikanData.genres?.map(g => g.name).join(', ') || null;
      const themesRaw = jikanData.themes?.map(t => t.name).join(', ') || null;
      // Dédupliquer en utilisant les traductions pour éviter les doublons après traduction
      const genres = deduplicateCommaSeparatedItems(genresRaw, genreTranslations);
      const themes = deduplicateCommaSeparatedItems(themesRaw, themeTranslations);
      
      // Démographie
      const demographie = jikanData.demographics?.[0]?.name || null;
      
      // Titres alternatifs
      const titreRomaji = jikanData.title || null;
      const titreNatif = jikanData.title_japanese || null;
      const titreAnglais = jikanData.title_english || null;
      const titresAlternatifs = jikanData.title_synonyms ? JSON.stringify(jikanData.title_synonyms) : null;
      
      // Serialization (magazine)
      const serialization = jikanData.serializations?.map(s => s.name).join(', ') || null;
      
      // Type (Manga, Manhwa, Manhua, Doujinshi, etc.)
      const type = jikanData.type || 'Manga';
      
      // Rating MAL (classification d'âge) - utiliser rating si disponible, sinon déduire depuis les genres/thèmes et le type
      let rating = jikanData.rating ? convertMALRating(jikanData.rating) : null;
      if (!rating) {
        rating = inferRatingFromGenresAndType(genres, themes, type);
      }
      
      // Si "Erotica" est présent dans les genres ou thèmes, forcer le rating à "R+"
      const allGenresAndThemes = `${genres || ''}, ${themes || ''}`.toLowerCase();
      if (allGenresAndThemes.includes('erotica') || allGenresAndThemes.includes('hentai')) {
        rating = 'R+';
      }
      
      // Normaliser le type de média (Jikan renvoie parfois 'manga', 'manhwa', 'manhua', etc. en minuscules)
      const typeLower = (type || '').toLowerCase();
      const normalizedMediaType = typeLower === 'manga' ? 'Manga' : 
                                  typeLower === 'manhwa' ? 'Manhwa' : 
                                  typeLower === 'manhua' ? 'Manhua' : 
                                  (typeLower === 'novel' || typeLower === 'light novel') ? 'Light Novel' : 
                                  type ? (type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()) : 'Manga';
      
      // Déduire la langue originale depuis le type de média
      let langueOriginale = 'ja'; // Par défaut japonais
      if (normalizedMediaType === 'Manhwa') {
        langueOriginale = 'ko'; // Coréen
      } else if (normalizedMediaType === 'Manhua') {
        langueOriginale = 'zh'; // Chinois
      } else if (normalizedMediaType === 'Manga') {
        langueOriginale = 'ja'; // Japonais
      }
      
      // Couverture
      const coverUrl = jikanData.images?.jpg?.large_image_url || jikanData.images?.jpg?.image_url || '';


      // Télécharger la couverture si disponible
      let localCoverPath = null;
      if (coverUrl) {
        try {
          const coverManager = require('../../services/cover/cover-manager');
          const pm = getPathManager();
          
          if (pm) {
            console.log(`📥 Téléchargement de la couverture depuis: ${coverUrl}`);
            const coverResult = await coverManager.downloadCover(
              pm,
              coverUrl,
              titre,
              'serie',
              null,
              {
                mediaType: normalizedMediaType,
                typeVolume: jikanData.type
              }
            );
            
            if (coverResult && coverResult.success && coverResult.localPath) {
              localCoverPath = coverResult.localPath;
              console.log(`✅ Couverture téléchargée: ${localCoverPath}`);
            } else {
              console.warn(`⚠️ Échec du téléchargement de la couverture: ${coverResult?.error || 'Erreur inconnue'}`);
            }
          } else {
            console.warn('⚠️ PathManager non disponible, impossible de télécharger la couverture');
          }
        } catch (error) {
          console.error('❌ Erreur téléchargement couverture:', error.message);
        }
      } else {
        console.log('⚠️ Aucune URL de couverture disponible');
      }

      // Extraire les données supplémentaires disponibles depuis l'endpoint /full
      const dateDebut = jikanData.published?.from || null;
      const dateFin = jikanData.published?.to || null;
      const scoreMal = jikanData.score || null;
      const rankMal = jikanData.rank || null;
      const popularityMal = jikanData.popularity || null;
      const auteursList = jikanData.authors ? jikanData.authors.map(a => {
        const name = a.name || `${a.node?.first_name || ''} ${a.node?.last_name || ''}`.trim();
        return name;
      }).filter(Boolean).join(', ') : null;
      const background = jikanData.background || null;
      
      // Relations (Prequel, Sequel, Adaptation, etc.)
      const relations = jikanData.relations || [];
      
      const prequel = relations.find(r => r.relation === 'Prequel');
      const sequel = relations.find(r => r.relation === 'Sequel');
      const prequelMalId = prequel?.entry[0]?.mal_id || null;
      const sequelMalId = sequel?.entry[0]?.mal_id || null;
      
      // Extraire les adaptations (anime, light novel, etc.)
      let animeAdaptationMalId = null;
      let lightNovelMalId = null;
      let mangaAdaptationMalId = null;
      
      // Parcourir toutes les relations pour trouver les adaptations
      for (const rel of relations) {
        const relationType = rel.relation?.toLowerCase() || '';
        
        // Relations de type "Adaptation" : ce manga a été adapté EN anime/light novel/etc.
        if (rel.relation === 'Adaptation' && rel.entry && rel.entry.length > 0) {
          for (const entry of rel.entry) {
            const entryType = entry.type?.toLowerCase() || '';
            if (entryType === 'anime' && !animeAdaptationMalId) {
              animeAdaptationMalId = entry.mal_id || null;
            }
            // Vérifier si un entry de type "manga" dans "Adaptation" est en fait un light novel source
            // (Jikan peut retourner les light novels comme "manga" dans les relations)
            // On vérifie en faisant une requête rapide pour obtenir le vrai type et la date de publication
            if (entryType === 'manga' && entry.mal_id && !lightNovelMalId) {
              try {
                const { fetchJikanMangaData } = require('../../services/mangas/manga-api-helpers');
                const relatedData = await fetchJikanMangaData(entry.mal_id);
                const relatedType = relatedData.type?.toLowerCase() || '';
                // Si c'est un light novel ou novel, vérifier que c'est bien la source (date antérieure)
                if (relatedType === 'light novel' || relatedType === 'novel') {
                  const relatedDate = relatedData.published?.from ? new Date(relatedData.published.from) : null;
                  const currentDate = jikanData.published?.from ? new Date(jikanData.published.from) : null;
                  // Si le light novel a été publié avant ce manga, c'est la source
                  if (!currentDate || !relatedDate || relatedDate <= currentDate) {
                    lightNovelMalId = entry.mal_id;
                  }
                }
              } catch (error) {
                // Ignorer les erreurs de vérification pour ne pas bloquer l'import
                console.warn(`⚠️ Impossible de vérifier le type de MAL ${entry.mal_id}: ${error.message}`);
              }
            }
          }
        }
        
        // Relations de type "Source" ou "Parent story" : ce manga est adapté D'UN light novel/manga/etc.
        if ((relationType === 'source' || relationType === 'parent story') && rel.entry && rel.entry.length > 0) {
          for (const entry of rel.entry) {
            const entryType = entry.type?.toLowerCase() || '';
            if ((entryType === 'light novel' || entryType === 'novel') && !lightNovelMalId) {
              lightNovelMalId = entry.mal_id || null;
            }
          }
        }
      }
      
      // Si c'est un light novel, chercher aussi les adaptations (manga, anime)
      if (normalizedMediaType === 'Light Novel') {
        for (const rel of relations) {
          if (rel.relation === 'Adaptation' && rel.entry && rel.entry.length > 0) {
            for (const entry of rel.entry) {
              const entryType = entry.type?.toLowerCase() || '';
              if (entryType === 'manga' && entry.mal_id && !mangaAdaptationMalId) {
                // Vérifier que ce n'est pas un light novel
                try {
                  const { fetchJikanMangaData } = require('../../services/mangas/manga-api-helpers');
                  const relatedData = await fetchJikanMangaData(entry.mal_id);
                  const relatedType = relatedData.type?.toLowerCase() || '';
                  if (relatedType !== 'light novel' && relatedType !== 'novel') {
                    mangaAdaptationMalId = entry.mal_id;
                  }
                } catch (error) {
                  // Si erreur, assumer que c'est un manga
                  mangaAdaptationMalId = entry.mal_id;
                }
              } else if (entryType === 'anime' && entry.mal_id && !animeAdaptationMalId) {
                animeAdaptationMalId = entry.mal_id;
              }
            }
          }
        }
      }
      
      // Stocker toutes les relations en JSON pour référence future
      const allRelationsJson = relations.length > 0 ? JSON.stringify(relations.map(rel => ({
        relation: rel.relation,
        entries: rel.entry?.map(e => ({
          mal_id: e.mal_id,
          name: e.name,
          type: e.type
        })) || []
      }))) : null;
      
      // Logs de TOUTES les données qui seront insérées/mises à jour dans la base de données
      const { logSavedData } = require('../../utils/log-saved-data');
      
      if (existingSerie) {
        // MISE À JOUR : Fusionner avec la série existante
        console.log(`🔄 Mise à jour de la série existante ID ${existingSerie.id} avec données MAL`);
        
        // Récupérer les données existantes pour la fusion
        const currentData = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(existingSerie.id);
        
        // Fusionner les titres alternatifs
        let mergedAltTitles = titresAlternatifs;
        if (currentData.titres_alternatifs) {
          const { safeJsonParse } = require('../common-helpers');
          const existingTitles = safeJsonParse(currentData.titres_alternatifs, []);
          const newTitles = titresAlternatifs ? safeJsonParse(titresAlternatifs, []) : [];
          const allTitles = [...(Array.isArray(existingTitles) ? existingTitles : []), ...(Array.isArray(newTitles) ? newTitles : [])];
          // Dédupliquer et nettoyer (supprimer les chaînes vides et les guillemets doubles)
          const uniqueTitles = Array.from(new Set(allTitles.map(t => {
            const cleaned = String(t).trim();
            // Supprimer les guillemets doubles au début et à la fin
            return cleaned.replace(/^["']+|["']+$/g, '');
          }).filter(Boolean)));
          mergedAltTitles = uniqueTitles.length > 0 ? JSON.stringify(uniqueTitles) : null;
        }
        
        // Déterminer la source de données
        const currentSource = currentData.source_donnees || 'nautiljon';
        const newSource = currentSource.includes('mal') ? currentSource : `${currentSource}+mal`;
        
        // Mettre à jour la série avec les données MAL
        const updateFields = [];
        const updateValues = [];
        
        // Toujours mettre à jour le mal_id si absent
        if (!currentData.mal_id) {
          updateFields.push('mal_id = ?');
          updateValues.push(malId);
        }
        
        // Mettre à jour les champs MAL uniquement s'ils sont absents ou vides
        if (!currentData.titre_romaji && titreRomaji) {
          updateFields.push('titre_romaji = ?');
          updateValues.push(titreRomaji);
        }
        if (!currentData.titre_natif && titreNatif) {
          updateFields.push('titre_natif = ?');
          updateValues.push(titreNatif);
        }
        if (!currentData.titre_anglais && titreAnglais) {
          updateFields.push('titre_anglais = ?');
          updateValues.push(titreAnglais);
        }
        if (mergedAltTitles) {
          updateFields.push('titres_alternatifs = ?');
          updateValues.push(mergedAltTitles);
        }
        // Description : préserver celle de Nautiljon si elle existe (souvent traduite)
        if (!currentData.description && synopsis) {
          updateFields.push('description = ?');
          updateValues.push(synopsis);
        }
        // Genres : préserver ceux de Nautiljon s'ils existent (souvent plus détaillés)
        if (!currentData.genres && genres) {
          updateFields.push('genres = ?');
          updateValues.push(genres);
        }
        // Themes : ajouter seulement si absent (Nautiljon n'a pas toujours les thèmes)
        if (!currentData.themes && themes) {
          updateFields.push('themes = ?');
          updateValues.push(themes);
        }
        // Démographie : ajouter seulement si absent
        if (!currentData.demographie && demographie) {
          updateFields.push('demographie = ?');
          updateValues.push(demographie);
        }
        // Serialization : préserver celle de Nautiljon si elle existe
        if (!currentData.serialization && serialization) {
          updateFields.push('serialization = ?');
          updateValues.push(serialization);
        }
        // Auteurs : préserver ceux de Nautiljon s'ils existent (souvent avec traducteur)
        if (!currentData.auteurs && auteursList) {
          updateFields.push('auteurs = ?');
          updateValues.push(auteursList);
        }
        if (!currentData.rating && rating) {
          updateFields.push('rating = ?');
          updateValues.push(rating);
        }
        if (normalizedMediaType) {
          updateFields.push('media_type = ?');
          updateValues.push(normalizedMediaType);
        }
        if (!currentData.langue_originale || currentData.langue_originale === 'ja') {
          updateFields.push('langue_originale = ?');
          updateValues.push(langueOriginale);
        }
        // Mettre à jour les champs MAL même s'ils existent déjà (ce sont des données MAL)
        if (scoreMal !== null) {
          updateFields.push('score_mal = ?');
          updateValues.push(scoreMal);
        }
        if (rankMal !== null) {
          updateFields.push('rank_mal = ?');
          updateValues.push(rankMal);
        }
        if (popularityMal !== null) {
          updateFields.push('popularity_mal = ?');
          updateValues.push(popularityMal);
        }
        if (dateDebut) {
          updateFields.push('date_debut = ?');
          updateValues.push(dateDebut);
        }
        if (dateFin) {
          updateFields.push('date_fin = ?');
          updateValues.push(dateFin);
        }
        if (background) {
          updateFields.push('background = ?');
          updateValues.push(background);
        }
        // Mettre à jour les nombres uniquement s'ils sont absents ou si les nouveaux sont plus grands
        if ((!currentData.nb_volumes && nbVolumes) || (nbVolumes && currentData.nb_volumes && nbVolumes > currentData.nb_volumes)) {
          updateFields.push('nb_volumes = ?');
          updateValues.push(nbVolumes);
        }
        if ((!currentData.nb_chapitres && nbChapitres) || (nbChapitres && currentData.nb_chapitres && nbChapitres > currentData.nb_chapitres)) {
          updateFields.push('nb_chapitres = ?');
          updateValues.push(nbChapitres);
        }
        if ((!currentData.annee_publication && anneePublication) || (anneePublication && currentData.annee_publication && anneePublication < currentData.annee_publication)) {
          updateFields.push('annee_publication = ?');
          updateValues.push(anneePublication);
        }
        if (!currentData.statut_publication && statut) {
          updateFields.push('statut_publication = ?');
          updateValues.push(statut);
        }
        // Mettre à jour la couverture uniquement si absente
        if (!currentData.couverture_url && localCoverPath) {
          updateFields.push('couverture_url = ?');
          updateValues.push(localCoverPath);
        }
        // Relations MAL
        if (prequelMalId !== null) {
          updateFields.push('prequel_mal_id = ?');
          updateValues.push(prequelMalId);
        }
        if (sequelMalId !== null) {
          updateFields.push('sequel_mal_id = ?');
          updateValues.push(sequelMalId);
        }
        if (animeAdaptationMalId !== null) {
          updateFields.push('anime_adaptation_mal_id = ?');
          updateValues.push(animeAdaptationMalId);
        }
        if (lightNovelMalId !== null) {
          updateFields.push('light_novel_mal_id = ?');
          updateValues.push(lightNovelMalId);
        }
        if (mangaAdaptationMalId !== null) {
          updateFields.push('manga_adaptation_mal_id = ?');
          updateValues.push(mangaAdaptationMalId);
        }
        if (allRelationsJson) {
          updateFields.push('relations = ?');
          updateValues.push(allRelationsJson);
        }
        
        // Mettre à jour la source de données
        updateFields.push('source_donnees = ?');
        updateValues.push(newSource);
        
        // Toujours mettre à jour le timestamp
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        
        if (updateFields.length > 0) {
          updateValues.push(existingSerie.id);
          const updateQuery = `UPDATE manga_series SET ${updateFields.join(', ')} WHERE id = ?`;
          db.prepare(updateQuery).run(...updateValues);
          
          // Récupérer les données mises à jour pour les logs
          const updatedData = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(existingSerie.id);
          const dataToLog = {
            titre: updatedData.titre,
            statut: updatedData.statut,
            type_volume: updatedData.type_volume,
            type_contenu: updatedData.type_contenu,
            mal_id: updatedData.mal_id,
            couverture_url: updatedData.couverture_url,
            description: updatedData.description,
            statut_publication: updatedData.statut_publication,
            statut_publication_vf: updatedData.statut_publication_vf,
            annee_publication: updatedData.annee_publication,
            annee_vf: updatedData.annee_vf,
            genres: updatedData.genres,
            nb_volumes: updatedData.nb_volumes,
            nb_volumes_vf: updatedData.nb_volumes_vf,
            nb_chapitres: updatedData.nb_chapitres,
            nb_chapitres_vf: updatedData.nb_chapitres_vf,
            langue_originale: updatedData.langue_originale,
            demographie: updatedData.demographie,
            editeur: updatedData.editeur,
            editeur_vo: updatedData.editeur_vo,
            rating: updatedData.rating,
            titre_romaji: updatedData.titre_romaji,
            titre_natif: updatedData.titre_natif,
            titre_anglais: updatedData.titre_anglais,
            titres_alternatifs: updatedData.titres_alternatifs,
            date_debut: updatedData.date_debut,
            date_fin: updatedData.date_fin,
            themes: updatedData.themes,
            score_mal: updatedData.score_mal,
            rank_mal: updatedData.rank_mal,
            popularity_mal: updatedData.popularity_mal,
            auteurs: updatedData.auteurs,
            serialization: updatedData.serialization,
            background: updatedData.background,
            media_type: updatedData.media_type,
            prequel_mal_id: updatedData.prequel_mal_id,
            sequel_mal_id: updatedData.sequel_mal_id,
            anime_adaptation_mal_id: updatedData.anime_adaptation_mal_id,
            light_novel_mal_id: updatedData.light_novel_mal_id,
            manga_adaptation_mal_id: updatedData.manga_adaptation_mal_id,
            relations: updatedData.relations ? 'présentes (JSON)' : null
          };
          logSavedData(dataToLog, 'manga');
          
          return {
            success: true,
            manga: {
              id: existingSerie.id,
              titre: updatedData.titre,
              mal_id: updatedData.mal_id,
              nb_chapitres: updatedData.nb_chapitres,
              nb_volumes: updatedData.nb_volumes
            }
          };
        } else {
          // Aucune mise à jour nécessaire
          return {
            success: true,
            manga: {
              id: existingSerie.id,
              titre: currentData.titre,
              mal_id: currentData.mal_id || malId,
              nb_chapitres: currentData.nb_chapitres,
              nb_volumes: currentData.nb_volumes
            }
          };
        }
      }
      
      // CRÉATION : Nouvelle série
      const dataToLog = {
        titre,
        statut: 'En cours',
        type_volume: 'Broché',
        type_contenu: 'volume',
        mal_id: malId,
        couverture_url: localCoverPath,
        description: synopsis,
        statut_publication: statut,
        statut_publication_vf: null,
        annee_publication: anneePublication,
        annee_vf: null,
        genres,
        nb_volumes: nbVolumes,
        nb_volumes_vf: null,
        nb_chapitres: nbChapitres,
        nb_chapitres_vf: null,
        langue_originale: langueOriginale,
        demographie,
        editeur: null,
        editeur_vo: null,
        rating,
        titre_romaji: titreRomaji,
        titre_natif: titreNatif,
        titre_anglais: titreAnglais,
        titres_alternatifs: titresAlternatifs,
        date_debut: dateDebut,
        date_fin: dateFin,
        themes,
        score_mal: scoreMal,
        rank_mal: rankMal,
        popularity_mal: popularityMal,
        auteurs: auteursList,
        serialization,
        background,
        media_type: normalizedMediaType,
        prequel_mal_id: prequelMalId,
        sequel_mal_id: sequelMalId,
        anime_adaptation_mal_id: animeAdaptationMalId,
        light_novel_mal_id: lightNovelMalId,
        manga_adaptation_mal_id: mangaAdaptationMalId,
        relations: allRelationsJson
      };
      logSavedData(dataToLog, 'manga');
      
      // Debug : vérifier le nombre de valeurs
      const valuesArray = [
        titre,
        'En cours',
        'Broché',
        malId,
        localCoverPath,
        synopsis,
        statut,
        anneePublication,
        genres,
        nbVolumes,
        nbChapitres,
        langueOriginale,
        demographie,
        rating,
        normalizedMediaType,
        'mal',
        titreRomaji,
        titreNatif,
        titreAnglais,
        titresAlternatifs,
        dateDebut,
        dateFin,
        themes,
        scoreMal,
        rankMal,
        popularityMal,
        auteursList,
        serialization,
        background,
        prequelMalId,
        sequelMalId,
        animeAdaptationMalId,
        lightNovelMalId,
        mangaAdaptationMalId,
        allRelationsJson
      ];
      
      // Insérer dans la base de données avec TOUTES les données disponibles (évite le deuxième appel)
      // 35 colonnes : titre(1), statut(2), type_volume(3), mal_id(4), couverture_url(5), description(6),
      // statut_publication(7), annee_publication(8), genres(9), nb_volumes(10), nb_chapitres(11),
      // langue_originale(12), demographie(13), rating(14), media_type(15), source_donnees(16),
      // titre_romaji(17), titre_natif(18), titre_anglais(19), titres_alternatifs(20),
      // date_debut(21), date_fin(22), themes(23), score_mal(24), rank_mal(25), popularity_mal(26),
      // auteurs(27), serialization(28), background(29), prequel_mal_id(30), sequel_mal_id(31),
      // anime_adaptation_mal_id(32), light_novel_mal_id(33), manga_adaptation_mal_id(34), relations(35)
      // created_at et updated_at utilisent les valeurs par défaut (CURRENT_TIMESTAMP)
      // Total placeholders: 35 (toutes les colonnes sauf created_at et updated_at)
      const stmt = db.prepare(`
        INSERT INTO manga_series (
          titre, statut, type_volume, mal_id, couverture_url, description,
          statut_publication, annee_publication, genres, nb_volumes, nb_chapitres,
          langue_originale, demographie, rating, media_type, source_donnees,
          titre_romaji, titre_natif, titre_anglais, titres_alternatifs,
          date_debut, date_fin, themes, score_mal, rank_mal, popularity_mal,
          auteurs, serialization, background, prequel_mal_id, sequel_mal_id,
          anime_adaptation_mal_id, light_novel_mal_id, manga_adaptation_mal_id, relations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(...valuesArray);

      const mangaId = result.lastInsertRowid;
      const manga = {
        id: mangaId,
        titre,
        mal_id: malId,
        nb_chapitres: nbChapitres,
        nb_volumes: nbVolumes
      };


      return {
        success: true,
        manga
      };

    } catch (error) {
      console.error('❌ Erreur add-manga-by-mal-id:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Traduire la description d'une série avec Groq AI
  ipcMain.handle('translate-serie-description', async (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // Récupérer la clé API Groq
      const groqApiKey = store.get('groqApiKey');
      if (!groqApiKey) {
        throw new Error('Clé API Groq non configurée. Veuillez la définir dans les paramètres.');
      }

      // Récupérer la série
      const serie = db.prepare('SELECT id, titre, description FROM manga_series WHERE id = ?').get(serieId);
      if (!serie) {
        throw new Error('Série non trouvée');
      }

      if (!serie.description || serie.description.trim() === '') {
        throw new Error('Aucune description à traduire');
      }

      // Vérifier si déjà traduit
      if (serie.description.includes('traduit automatiquement') || serie.description.includes('Synopsis français')) {
        throw new Error('Cette description semble déjà traduite');
      }

      console.log(`🤖 Traduction de la description pour: ${serie.titre}`);

      // Appel à l'API Groq
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'Tu es un traducteur professionnel spécialisé dans les mangas. Traduis le synopsis suivant en français de manière naturelle et fluide. Ne traduis PAS les noms de personnages, de lieux, ou de techniques. Retourne UNIQUEMENT la traduction, sans introduction ni conclusion.'
            },
            {
              role: 'user',
              content: serie.description
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erreur API Groq: ${response.status} - ${errorData.error?.message || 'Erreur inconnue'}`);
      }

      const data = await response.json();
      const translatedText = data.choices[0]?.message?.content?.trim();

      if (!translatedText) {
        throw new Error('Aucune traduction reçue de l\'API');
      }

      // Ajouter une note de traduction automatique
      const finalDescription = `${translatedText}\n\n(Synopsis traduit automatiquement par IA)`;

      // Mettre à jour la série
      db.prepare('UPDATE manga_series SET description = ? WHERE id = ?').run(finalDescription, serieId);

      console.log(`✅ Description traduite pour: ${serie.titre}`);

      return { 
        success: true, 
        translatedDescription: finalDescription 
      };

    } catch (error) {
      console.error('❌ Erreur translate-serie-description:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

  // Traduire le background d'une série avec Groq AI
  ipcMain.handle('translate-serie-background', async (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // Récupérer la clé API Groq
      const groqApiKey = store.get('groqApiKey');
      if (!groqApiKey) {
        throw new Error('Clé API Groq non configurée. Veuillez la définir dans les paramètres.');
      }

      // Récupérer la série
      const serie = db.prepare('SELECT id, titre, background FROM manga_series WHERE id = ?').get(serieId);
      if (!serie) {
        throw new Error('Série non trouvée');
      }

      if (!serie.background || serie.background.trim() === '') {
        throw new Error('Aucun background à traduire');
      }

      // Vérifier si déjà traduit
      if (serie.background.includes('traduit automatiquement') || serie.background.includes('Background traduit')) {
        throw new Error('Ce background semble déjà traduit');
      }

      console.log(`🤖 Traduction du background pour: ${serie.titre}`);

      // Appel à l'API Groq
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'Tu es un traducteur professionnel spécialisé dans les mangas. Traduis le background suivant en français de manière naturelle et fluide. Ne traduis PAS les noms de personnages, de lieux, ou de techniques. Retourne UNIQUEMENT la traduction, sans introduction ni conclusion.'
            },
            {
              role: 'user',
              content: serie.background
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erreur API Groq: ${response.status} - ${errorData.error?.message || 'Erreur inconnue'}`);
      }

      const data = await response.json();
      const translatedText = data.choices[0]?.message?.content?.trim();

      if (!translatedText) {
        throw new Error('Aucune traduction reçue de l\'API');
      }

      // Ajouter une note de traduction automatique
      const finalBackground = `${translatedText}\n\n(Background traduit automatiquement par IA)`;

      // Mettre à jour la série
      db.prepare('UPDATE manga_series SET background = ? WHERE id = ?').run(finalBackground, serieId);

      console.log(`✅ Background traduit pour: ${serie.titre}`);

      return { 
        success: true, 
        translatedBackground: finalBackground 
      };

    } catch (error) {
      console.error('❌ Erreur translate-serie-background:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

  // Handler: Import rapide depuis AniList ID
  ipcMain.handle('add-manga-by-anilist-id', async (event, anilistIdOrUrl, options = {}) => {
    try {
      const db = getDb();
      if (!db) throw new Error('Base de données non initialisée');

      const currentUser = store.get('currentUser', '');
      if (!currentUser) throw new Error('Aucun utilisateur connecté');

      const targetSerieId = typeof options.targetSerieId === 'number' ? options.targetSerieId : null;
      const forceCreate = options.forceCreate === true;

      // Extraire l'AniList ID depuis l'URL si nécessaire
      let anilistId = anilistIdOrUrl;
      if (typeof anilistIdOrUrl === 'string' && anilistIdOrUrl.includes('anilist.co')) {
        const match = anilistIdOrUrl.match(/manga\/(\d+)/);
        if (!match) throw new Error('URL AniList invalide');
        anilistId = parseInt(match[1]);
      } else {
        anilistId = parseInt(anilistId);
      }

      if (isNaN(anilistId)) throw new Error('AniList ID invalide');

      // Vérifier si le manga existe déjà
      let existingSerie = db.prepare('SELECT * FROM manga_series WHERE anilist_id = ?').get(anilistId);
      if (existingSerie) {
        if (targetSerieId && existingSerie.id === targetSerieId) {
          // OK, on met à jour cette série
        } else if (!targetSerieId) {
          return {
            success: false,
            error: `Ce manga existe déjà : ${existingSerie.titre}`,
            mangaId: existingSerie.id
          };
        } else {
          return {
            success: false,
            error: `Ce manga existe déjà : ${existingSerie.titre}`,
            mangaId: existingSerie.id
          };
        }
      }

      // Récupérer le token AniList
      const { getValidAccessToken } = require('../../services/anilist/anilist-token');
      const Store = require('electron-store');
      const anilistStore = new Store();
      const accessToken = await getValidAccessToken(anilistStore);

      if (!accessToken) {
        throw new Error('Non connecté à AniList. Connectez-vous dans les paramètres.');
      }

      // Récupérer les données depuis AniList
      const { getMangaById } = require('../../services/anilist/anilist-api');
      const anilistData = await getMangaById(accessToken, anilistId);

      if (!anilistData) {
        throw new Error('Manga non trouvé sur AniList');
      }

      // Transformer les données AniList en format interne
      // Note: transformMangaData attend un format avec listStatus, mais pour l'import direct on n'a que media
      // On va créer un objet temporaire avec juste media
      const tempEntry = { media: anilistData };
      const transformedData = {
        anilist_id: anilistData.id,
        mal_id: anilistData.idMal || null,
        titre: anilistData.title?.english || anilistData.title?.romaji || anilistData.title?.native || `Manga #${anilistId}`,
        titre_romaji: anilistData.title?.romaji || null,
        titre_anglais: anilistData.title?.english || null,
        titre_natif: anilistData.title?.native || null,
        titres_alternatifs: (() => {
          const altTitles = [];
          if (anilistData.title?.romaji && anilistData.title.romaji !== anilistData.title?.english) {
            altTitles.push(anilistData.title.romaji);
          }
          if (anilistData.title?.native && anilistData.title.native !== anilistData.title?.english) {
            altTitles.push(anilistData.title.native);
          }
          return altTitles.length > 0 ? JSON.stringify(altTitles) : null;
        })(),
        description: cleanHtmlText(anilistData.description),
        nb_chapitres: anilistData.chapters || null,
        nb_volumes: anilistData.volumes || null,
        annee_publication: anilistData.startDate?.year || null,
        date_debut: (() => {
          if (anilistData.startDate?.year && anilistData.startDate?.month && anilistData.startDate?.day) {
            return `${anilistData.startDate.year}-${String(anilistData.startDate.month).padStart(2, '0')}-${String(anilistData.startDate.day).padStart(2, '0')}`;
          }
          return anilistData.startDate?.year ? `${anilistData.startDate.year}-01-01` : null;
        })(),
        date_fin: (() => {
          if (anilistData.endDate?.year && anilistData.endDate?.month && anilistData.endDate?.day) {
            return `${anilistData.endDate.year}-${String(anilistData.endDate.month).padStart(2, '0')}-${String(anilistData.endDate.day).padStart(2, '0')}`;
          }
          return anilistData.endDate?.year ? `${anilistData.endDate.year}-12-31` : null;
        })(),
        genres: Array.isArray(anilistData.genres) ? anilistData.genres.join(', ') : null,
        statut_publication: (() => {
          const statusMap = {
            'FINISHED': 'Terminée',
            'RELEASING': 'En cours',
            'NOT_YET_RELEASED': 'À venir',
            'CANCELLED': 'Annulée',
            'HIATUS': 'En pause'
          };
          return statusMap[anilistData.status] || 'En cours';
        })()
      };

      // Déterminer le media_type
      // Utiliser aussi le titre natif pour détecter manhua/manhwa quand le format est juste "MANGA"
      const { convertAniListFormatToMediaType, cleanHtmlText } = require('../../services/anilist/anilist-transformers');
      const normalizedMediaType = convertAniListFormatToMediaType(anilistData.format, anilistData.title?.native);

      // Préparer les données pour le matching unifié
      const sourceData = {
        titre: transformedData.titre,
        anilist_id: anilistId,
        mal_id: transformedData.mal_id,
        titre_romaji: transformedData.titre_romaji,
        titre_natif: transformedData.titre_natif,
        titre_anglais: transformedData.titre_anglais,
        titres_alternatifs: transformedData.titres_alternatifs
      };

      // Utiliser le service de matching unifié
      const { findExistingSerieUnified } = require('../../services/unified-matching-service');
      const matchResult = findExistingSerieUnified(
        db,
        sourceData,
        'anilist',
        normalizedMediaType
      );

      // Si un match a été trouvé (exact ou avec similarité >= 75%)
      if (matchResult && !forceCreate && !targetSerieId) {
        if (matchResult.isExactMatch || matchResult.similarity >= 75) {
          return {
            success: false,
            requiresSelection: true,
            anilistId,
            candidates: [{
              id: matchResult.serie.id,
              titre: matchResult.serie.titre,
              media_type: matchResult.serie.media_type,
              type_volume: matchResult.serie.type_volume,
              source_donnees: matchResult.serie.source_donnees,
              statut: matchResult.serie.statut,
              anilist_id: matchResult.serie.anilist_id,
              mal_id: matchResult.serie.mal_id,
              similarity: matchResult.similarity,
              isExactMatch: matchResult.isExactMatch,
              matchMethod: matchResult.matchMethod
            }]
          };
        }
      }

      let serieToUpdate = null;
      let matchResultFinal = null;
      
      if (targetSerieId) {
        serieToUpdate = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(targetSerieId);
        if (!serieToUpdate) {
          return {
            success: false,
            error: 'Série sélectionnée introuvable'
          };
        }

        if (serieToUpdate.anilist_id && serieToUpdate.anilist_id !== anilistId) {
          return {
            success: false,
            error: `Cette série est déjà liée à l'AniList ID ${serieToUpdate.anilist_id}`,
            mangaId: serieToUpdate.id
          };
        }

        const existingMediaType = normalizeMediaTypeValue(serieToUpdate.media_type) ||
          normalizeMediaTypeValue(serieToUpdate.type_volume);
        if (existingMediaType && existingMediaType !== normalizedMediaType) {
          return {
            success: false,
            error: 'Le type de média détecté ne correspond pas à la série sélectionnée.'
          };
        }
        
        matchResultFinal = {
          serie: serieToUpdate,
          isExactMatch: true,
          similarity: 100,
          matchMethod: 'user_selection'
        };
      } else if (matchResult) {
        matchResultFinal = matchResult;
      }

      if (serieToUpdate || matchResultFinal) {
        existingSerie = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(
          (serieToUpdate || matchResultFinal.serie).id
        );
      }

      // Extraire les données AniList
      const titre = transformedData.titre;
      const synopsis = transformedData.description || '';
      const nbChapitres = transformedData.nb_chapitres || null;
      const nbVolumes = transformedData.nb_volumes || null;
      const anneePublication = transformedData.annee_publication || null;
      const statut = transformedData.statut_publication || 'En cours';
      
      // Genres et tags
      const { deduplicateCommaSeparatedItems } = require('../../utils/data-normalization');
      const { genreTranslations, themeTranslations } = require('../../utils/translation-dictionaries');
      const genresRaw = transformedData.genres || null;
      const tags = Array.isArray(anilistData.tags) ? anilistData.tags.map(t => t.name).join(', ') : null;
      const themes = deduplicateCommaSeparatedItems(tags, themeTranslations);
      const genres = deduplicateCommaSeparatedItems(genresRaw, genreTranslations);
      
      // Démographie depuis les tags
      const demographie = tags ? (tags.toLowerCase().includes('shounen') ? 'Shounen' :
                                  tags.toLowerCase().includes('shoujo') ? 'Shoujo' :
                                  tags.toLowerCase().includes('seinen') ? 'Seinen' :
                                  tags.toLowerCase().includes('josei') ? 'Josei' : null) : null;
      
      // Titres alternatifs
      const titreRomaji = transformedData.titre_romaji;
      const titreNatif = transformedData.titre_natif;
      const titreAnglais = transformedData.titre_anglais;
      const titresAlternatifs = transformedData.titres_alternatifs;
      
      // Type de volume
      const { convertAniListFormatToTypeVolume } = require('../../services/anilist/anilist-transformers');
      const typeVolume = convertAniListFormatToTypeVolume(anilistData.format);
      
      // Rating (déduire depuis les tags)
      let rating = null;
      const allTags = tags ? tags.toLowerCase() : '';
      if (allTags.includes('hentai') || allTags.includes('erotica')) {
        rating = 'erotica';
      } else if (allTags.includes('ecchi')) {
        rating = 'suggestive';
      } else {
        rating = 'safe';
      }
      
      // Déduire la langue originale depuis le type de média
      let langueOriginale = 'ja';
      if (normalizedMediaType === 'Manhwa') {
        langueOriginale = 'ko';
      } else if (normalizedMediaType === 'Manhua') {
        langueOriginale = 'zh';
      } else if (normalizedMediaType === 'Manga') {
        langueOriginale = 'ja';
      }
      
      // Couverture
      const coverUrl = anilistData.coverImage?.extraLarge || anilistData.coverImage?.large || anilistData.coverImage?.medium || '';

      // Télécharger la couverture si disponible
      let localCoverPath = null;
      if (coverUrl) {
        try {
          const coverManager = require('../../services/cover/cover-manager');
          const pm = getPathManager();
          if (pm) {
            const coverResult = await coverManager.downloadCover(
              pm,
              coverUrl,
              titre,
              'serie',
              null,
              {
                mediaType: normalizedMediaType,
                type_volume: typeVolume
              }
            );
            if (coverResult && coverResult.success && coverResult.localPath) {
              localCoverPath = coverResult.localPath;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Erreur téléchargement couverture AniList: ${error.message}`);
        }
      }

      // Extraire les auteurs depuis staff
      let auteurs = null;
      if (anilistData.staff?.edges && anilistData.staff.edges.length > 0) {
        const authorRoles = ['Story', 'Story & Art', 'Art'];
        const authors = anilistData.staff.edges
          .filter(edge => authorRoles.includes(edge.role))
          .map(edge => edge.node.name.full || edge.node.name.native)
          .filter(Boolean);
        if (authors.length > 0) {
          auteurs = authors.join(', ');
        }
      }

      // Relations (simplifié pour l'instant)
      let relations = null;
      if (anilistData.relations?.edges && anilistData.relations.edges.length > 0) {
        const relationsData = anilistData.relations.edges.map(edge => ({
          relation: edge.relationType,
          entry: [{
            mal_id: edge.node.idMal,
            anilist_id: edge.node.id,
            name: edge.node.title.romaji || edge.node.title.english,
            type: edge.node.type?.toLowerCase() || null
          }]
        }));
        relations = JSON.stringify(relationsData);
      }

      // Préparer les données de la série
      const serieData = {
        titre,
        statut: 'À lire',
        type_volume: typeVolume,
        type_contenu: 'volume',
        couverture_url: localCoverPath,
        description: synopsis, // Déjà nettoyé avec cleanHtmlText
        statut_publication: statut,
        annee_publication: anneePublication,
        genres,
        themes,
        nb_volumes: nbVolumes,
        nb_chapitres: nbChapitres,
        langue_originale: langueOriginale,
        demographie,
        rating,
        mal_id: transformedData.mal_id,
        anilist_id: anilistId,
        titre_romaji: titreRomaji,
        titre_natif: titreNatif,
        titre_anglais: titreAnglais,
        titres_alternatifs: titresAlternatifs,
        date_debut: transformedData.date_debut || null,
        date_fin: transformedData.date_fin || null,
        score_mal: anilistData.meanScore || anilistData.averageScore || null,
        popularity_mal: anilistData.popularity || null,
        auteurs,
        relations,
        media_type: normalizedMediaType,
        source_donnees: 'anilist',
        source_url: `https://anilist.co/manga/${anilistId}`,
        source_id: String(anilistId)
      };

      // Créer ou mettre à jour la série
      const { handleCreateSerie } = require('./manga-create-handlers');
      let finalSerie;

      if (existingSerie) {
        // Mettre à jour la série existante
        const updateFields = [];
        const updateValues = [];

        if (serieData.mal_id && !existingSerie.mal_id) {
          updateFields.push('mal_id = ?');
          updateValues.push(serieData.mal_id);
        }
        if (serieData.anilist_id && !existingSerie.anilist_id) {
          updateFields.push('anilist_id = ?');
          updateValues.push(serieData.anilist_id);
        }
        if (serieData.couverture_url && !existingSerie.couverture_url) {
          updateFields.push('couverture_url = ?');
          updateValues.push(serieData.couverture_url);
        }
        if (serieData.description && !existingSerie.description) {
          updateFields.push('description = ?');
          updateValues.push(serieData.description);
        }
        if (serieData.genres && !existingSerie.genres) {
          updateFields.push('genres = ?');
          updateValues.push(serieData.genres);
        }
        if (serieData.themes && !existingSerie.themes) {
          updateFields.push('themes = ?');
          updateValues.push(serieData.themes);
        }
        if (serieData.nb_volumes !== null && existingSerie.nb_volumes === null) {
          updateFields.push('nb_volumes = ?');
          updateValues.push(serieData.nb_volumes);
        }
        if (serieData.nb_chapitres !== null && existingSerie.nb_chapitres === null) {
          updateFields.push('nb_chapitres = ?');
          updateValues.push(serieData.nb_chapitres);
        }
        if (serieData.media_type && !existingSerie.media_type) {
          updateFields.push('media_type = ?');
          updateValues.push(serieData.media_type);
        }

        if (updateFields.length > 0) {
          updateValues.push(existingSerie.id);
          const updateQuery = `UPDATE manga_series SET ${updateFields.join(', ')} WHERE id = ?`;
          db.prepare(updateQuery).run(...updateValues);
        }

        finalSerie = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(existingSerie.id);

        // Si un mal_id a été ajouté et qu'il n'existait pas avant, lancer l'enrichissement automatique
        if (serieData.mal_id && !existingSerie.mal_id) {
          try {
            const { enrichManga, getMangaEnrichmentConfig } = require('../../services/mangas/manga-enrichment-queue');
            const enrichmentConfig = getMangaEnrichmentConfig(store);
            
            if (enrichmentConfig.enabled) {
              console.log(`🔄 [AniList Import] Lancement enrichissement automatique pour MAL ID ${serieData.mal_id}...`);
              // Lancer l'enrichissement en arrière-plan (ne pas bloquer la réponse)
              enrichManga(
                getDb,
                finalSerie.id,
                serieData.mal_id,
                serieData.anilist_id,
                currentUser,
                enrichmentConfig,
                getPathManager,
                null,
                false
              ).catch(error => {
                console.error(`❌ [AniList Import] Erreur enrichissement automatique: ${error.message}`);
              });
            }
          } catch (error) {
            console.error(`❌ [AniList Import] Erreur lancement enrichissement: ${error.message}`);
            // Ne pas bloquer le retour si l'enrichissement échoue
          }
        }
      } else {
        // Créer une nouvelle série
        // handleCreateSerie lance déjà l'enrichissement automatique si mal_id est présent
        finalSerie = await handleCreateSerie(db, getPathManager, store, serieData, getDb);
      }

      return {
        success: true,
        serie: finalSerie,
        mangaId: finalSerie.id
      };

    } catch (error) {
      console.error('❌ Erreur add-manga-by-anilist-id:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'import depuis AniList'
      };
    }
  });
}

module.exports = { registerMangaEnrichmentHandlers };
