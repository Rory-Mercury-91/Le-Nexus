const fs = require('fs');
const path = require('path');
const { createSlug } = require('../../utils/slug');
const { renameSerieCover } = require('../../services/cover/cover-manager');
const { enrichManga, getMangaEnrichmentConfig } = require('../../services/mangas/manga-enrichment-queue');
const { fetchJikanMangaData } = require('../../services/mangas/manga-api-helpers');
const { getUserIdByName, setExclusiveSerieOwnership, setExclusiveSerieUserStatus } = require('./manga-helpers');

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

/**
 * Crée une nouvelle série
 */
async function handleCreateSerie(db, getPathManager, store, serie, getDb = null) {
  const currentUser = store.get('currentUser', '');
  const currentUserId = currentUser ? getUserIdByName(db, currentUser) : null;

  // Si un MAL ID est fourni et que des données sont manquantes, récupérer depuis Jikan AVANT l'insertion
  let enrichedSerieData = { ...serie };
  
  if (serie.mal_id) {
    // Vérifier si des données sont manquantes
    const hasAllData = serie.themes && serie.auteurs && serie.score_mal !== null && 
                       serie.titre_romaji && serie.date_debut && serie.background;
    
    if (!hasAllData) {
      try {
        const jikanData = await fetchJikanMangaData(serie.mal_id);
        
        // Normaliser le type de média
        const type = jikanData.type || 'Manga';
        const normalizedMediaType = type === 'manga' ? 'Manga' : 
                                   type === 'manhwa' ? 'Manhwa' : 
                                   type === 'manhua' ? 'Manhua' : 
                                   type === 'novel' || type === 'light novel' ? 'Light Novel' : 
                                   type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        
        // Déduire la langue originale depuis le type de média
        let langueOriginaleDeduite = 'ja';
        if (normalizedMediaType === 'Manhwa') {
          langueOriginaleDeduite = 'ko';
        } else if (normalizedMediaType === 'Manhua') {
          langueOriginaleDeduite = 'zh';
        } else if (normalizedMediaType === 'Manga') {
          langueOriginaleDeduite = 'ja';
        }
        
        // Extraire manga_adaptation_mal_id pour les light novels (nécessite await)
        let mangaAdaptationMalId = enrichedSerieData.manga_adaptation_mal_id || null;
        if (!mangaAdaptationMalId && normalizedMediaType === 'Light Novel' && jikanData.relations) {
          const adaptation = jikanData.relations.find(r => r.relation === 'Adaptation');
          if (adaptation && adaptation.entry) {
            const mangaEntry = adaptation.entry.find(e => {
              const entryType = e.type?.toLowerCase() || '';
              return entryType === 'manga';
            });
            // Vérifier que ce n'est pas un light novel
            if (mangaEntry?.mal_id) {
              try {
                const { fetchJikanMangaData } = require('../../services/mangas/manga-api-helpers');
                const relatedData = await fetchJikanMangaData(mangaEntry.mal_id);
                const relatedType = relatedData.type?.toLowerCase() || '';
                if (relatedType !== 'light novel' && relatedType !== 'novel') {
                  mangaAdaptationMalId = mangaEntry.mal_id;
                }
              } catch (error) {
                // Si erreur, assumer que c'est un manga
                mangaAdaptationMalId = mangaEntry.mal_id;
              }
            }
          }
        }
        
        // Fusionner les données Jikan avec les données fournies (les données fournies ont priorité)
        enrichedSerieData = {
          ...enrichedSerieData,
          // Champs de base (priorité aux données fournies)
          titre: enrichedSerieData.titre || jikanData.title || jikanData.title_english || `Manga #${serie.mal_id}`,
          description: enrichedSerieData.description || jikanData.synopsis || null,
          statut_publication: enrichedSerieData.statut_publication || 
            (jikanData.status === 'Finished' ? 'Terminée' : 
             jikanData.status === 'Publishing' ? 'En cours' : null),
          annee_publication: enrichedSerieData.annee_publication || 
            (jikanData.published?.from ? new Date(jikanData.published.from).getFullYear() : null),
          genres: enrichedSerieData.genres || (jikanData.genres?.map(g => g.name).join(', ') || null),
          nb_volumes: enrichedSerieData.nb_volumes || jikanData.volumes || null,
          nb_chapitres: enrichedSerieData.nb_chapitres || jikanData.chapters || null,
          langue_originale: enrichedSerieData.langue_originale || langueOriginaleDeduite,
          demographie: enrichedSerieData.demographie || (jikanData.demographics?.[0]?.name || null),
          // Champs supplémentaires (uniquement si pas déjà fournis)
          titre_romaji: enrichedSerieData.titre_romaji || jikanData.title || null,
          titre_natif: enrichedSerieData.titre_natif || jikanData.title_japanese || null,
          titre_anglais: enrichedSerieData.titre_anglais || jikanData.title_english || null,
          titres_alternatifs: enrichedSerieData.titres_alternatifs || 
            (jikanData.title_synonyms ? JSON.stringify(jikanData.title_synonyms) : null),
          date_debut: enrichedSerieData.date_debut || jikanData.published?.from || null,
          date_fin: enrichedSerieData.date_fin || jikanData.published?.to || null,
          themes: enrichedSerieData.themes || (jikanData.themes?.map(t => t.name).join(', ') || null),
          score_mal: enrichedSerieData.score_mal !== null && enrichedSerieData.score_mal !== undefined 
            ? enrichedSerieData.score_mal : (jikanData.score || null),
          rank_mal: enrichedSerieData.rank_mal !== null && enrichedSerieData.rank_mal !== undefined 
            ? enrichedSerieData.rank_mal : (jikanData.rank || null),
          popularity_mal: enrichedSerieData.popularity_mal !== null && enrichedSerieData.popularity_mal !== undefined 
            ? enrichedSerieData.popularity_mal : (jikanData.popularity || null),
          auteurs: enrichedSerieData.auteurs || 
            (jikanData.authors?.map(a => {
              const name = a.name || `${a.node?.first_name || ''} ${a.node?.last_name || ''}`.trim();
              return name;
            }).filter(Boolean).join(', ') || null),
          serialization: enrichedSerieData.serialization || 
            (jikanData.serializations?.map(s => s.name).join(', ') || null),
          background: enrichedSerieData.background || jikanData.background || null,
          media_type: enrichedSerieData.media_type || normalizedMediaType || null,
          rating: enrichedSerieData.rating || 
            (jikanData.rating ? convertMALRating(jikanData.rating) : 
             inferRatingFromGenresAndType(
               enrichedSerieData.genres || (jikanData.genres?.map(g => g.name).join(', ') || null),
               enrichedSerieData.themes || (jikanData.themes?.map(t => t.name).join(', ') || null),
               normalizedMediaType || jikanData.type || null
             )),
          prequel_mal_id: enrichedSerieData.prequel_mal_id || 
            (jikanData.relations ? (() => {
              const prequel = jikanData.relations.find(r => r.relation === 'Prequel');
              return prequel?.entry[0]?.mal_id || null;
            })() : null),
          sequel_mal_id: enrichedSerieData.sequel_mal_id || 
            (jikanData.relations ? (() => {
              const sequel = jikanData.relations.find(r => r.relation === 'Sequel');
              return sequel?.entry[0]?.mal_id || null;
            })() : null),
          anime_adaptation_mal_id: enrichedSerieData.anime_adaptation_mal_id || 
            (jikanData.relations ? (() => {
              const adaptation = jikanData.relations.find(r => r.relation === 'Adaptation');
              if (adaptation && adaptation.entry) {
                const animeEntry = adaptation.entry.find(e => e.type?.toLowerCase() === 'anime');
                return animeEntry?.mal_id || null;
              }
              return null;
            })() : null),
          light_novel_mal_id: enrichedSerieData.light_novel_mal_id || 
            (jikanData.relations ? (() => {
              // Chercher dans les relations "Source" ou "Parent story" pour le light novel source
              const source = jikanData.relations.find(r => {
                const relType = r.relation?.toLowerCase() || '';
                return relType === 'source' || relType === 'parent story';
              });
              if (source && source.entry) {
                const lnEntry = source.entry.find(e => {
                  const entryType = e.type?.toLowerCase() || '';
                  return entryType === 'light novel' || entryType === 'novel';
                });
                return lnEntry?.mal_id || null;
              }
              return null;
            })() : null),
          manga_adaptation_mal_id: mangaAdaptationMalId,
          relations: enrichedSerieData.relations || 
            (jikanData.relations && jikanData.relations.length > 0 ? JSON.stringify(jikanData.relations.map(rel => ({
              relation: rel.relation,
              entries: rel.entry?.map(e => ({
                mal_id: e.mal_id,
                name: e.name,
                type: e.type
              })) || []
            }))) : null)
        };
        
        // Logs de TOUTES les données qui seront sauvegardées (y compris null/undefined)
        const { logSavedData } = require('../../utils/log-saved-data');
        logSavedData(enrichedSerieData, 'manga');
        
        // Télécharger la couverture si pas déjà fournie ET si autorisé
        const autoDownload = store.get('autoDownloadCovers', false) === true;
        if (autoDownload && !enrichedSerieData.couverture_url && jikanData.images?.jpg) {
          const coverUrl = jikanData.images.jpg.large_image_url || jikanData.images.jpg.image_url;
          if (coverUrl) {
            try {
              const coverManager = require('../../services/cover/cover-manager');
              const pm = getPathManager();
              if (pm) {
                const coverResult = await coverManager.downloadCover(
                  pm,
                  coverUrl,
                  enrichedSerieData.titre,
                  'serie',
                  null,
                  {
                    mediaType: enrichedSerieData.media_type || jikanData.type,
                    type_volume: enrichedSerieData.type_volume
                  }
                );
                if (coverResult && coverResult.success && coverResult.localPath) {
                  enrichedSerieData.couverture_url = coverResult.localPath;
                }
              }
            } catch (error) {
              console.warn(`⚠️ Erreur téléchargement couverture Jikan: ${error.message}`);
            }
          }
        }
        
      } catch (error) {
        console.warn(`⚠️ [CREATE-SERIE] Erreur récupération Jikan: ${error.message}, utilisation des données fournies uniquement`);
        // Continuer avec les données fournies si Jikan échoue
      }
    }
  }

  // Détecter si un dossier temporaire existe (créé avec un titre différent)
  let finalCouvertureUrl = enrichedSerieData.couverture_url || null;
  
  if (finalCouvertureUrl) {
    // Extraire l'ancien slug du chemin (ex: "covers/old_slug/cover.webp")
    const match = finalCouvertureUrl.match(/^covers\/([^/]+)\//);
    if (match) {
      const oldSlug = match[1];
      const newSlug = createSlug(enrichedSerieData.titre);
      
      // Si le slug a changé, renommer le dossier
      if (oldSlug !== newSlug) {
        const coversDir = store.get('coversDirectory', '');
        if (coversDir) {
          const oldFolderPath = path.join(coversDir, oldSlug);
          const newFolderPath = path.join(coversDir, newSlug);
          
          if (fs.existsSync(oldFolderPath) && !fs.existsSync(newFolderPath)) {
            fs.renameSync(oldFolderPath, newFolderPath);
            
            // Mettre à jour le chemin de la couverture
            finalCouvertureUrl = finalCouvertureUrl.replace(`covers/${oldSlug}/`, `covers/${newSlug}/`);
          }
        }
      }
    }
    
    // Renommer l'image de la série en cover.ext
    const pm = getPathManager();
    if (pm) finalCouvertureUrl = renameSerieCover(pm, finalCouvertureUrl, enrichedSerieData.titre);
  }
  
  const stmt = db.prepare(`
    INSERT INTO manga_series (
      titre, statut, type_volume, type_contenu, couverture_url, description,
      statut_publication, statut_publication_vf, annee_publication, annee_vf,
      genres, nb_volumes, nb_volumes_vf, nb_chapitres, nb_chapitres_vf,
      langue_originale, demographie, editeur, editeur_vo, rating,
      mal_id, titre_romaji, titre_natif, titre_anglais, titres_alternatifs,
      date_debut, date_fin, themes, score_mal, rank_mal, popularity_mal,
      auteurs, serialization, background, media_type, prequel_mal_id, sequel_mal_id,
      anime_adaptation_mal_id, light_novel_mal_id, manga_adaptation_mal_id, relations,
      source_donnees, source_url, source_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    enrichedSerieData.titre,
    enrichedSerieData.statut,
    enrichedSerieData.type_volume,
    enrichedSerieData.type_contenu || 'volume',
    finalCouvertureUrl,
    enrichedSerieData.description || null,
    enrichedSerieData.statut_publication || null,
    enrichedSerieData.statut_publication_vf || null,
    enrichedSerieData.annee_publication || null,
    enrichedSerieData.annee_vf || null,
    enrichedSerieData.genres || null,
    enrichedSerieData.nb_volumes || null,
    enrichedSerieData.nb_volumes_vf || null,
    enrichedSerieData.nb_chapitres || null,
    enrichedSerieData.nb_chapitres_vf || null,
    enrichedSerieData.langue_originale || null,
    enrichedSerieData.demographie || null,
    enrichedSerieData.editeur || null,
    enrichedSerieData.editeur_vo || null,
    enrichedSerieData.rating || null,
    enrichedSerieData.mal_id || null,
    enrichedSerieData.titre_romaji || null,
    enrichedSerieData.titre_natif || null,
    enrichedSerieData.titre_anglais || null,
    enrichedSerieData.titres_alternatifs || null,
    enrichedSerieData.date_debut || null,
    enrichedSerieData.date_fin || null,
    enrichedSerieData.themes || null,
    enrichedSerieData.score_mal || null,
    enrichedSerieData.rank_mal || null,
    enrichedSerieData.popularity_mal || null,
    enrichedSerieData.auteurs || null,
    enrichedSerieData.serialization || null,
    enrichedSerieData.background || null,
    enrichedSerieData.media_type || null,
    enrichedSerieData.prequel_mal_id || null,
    enrichedSerieData.sequel_mal_id || null,
    enrichedSerieData.anime_adaptation_mal_id || null,
    enrichedSerieData.light_novel_mal_id || null,
    enrichedSerieData.manga_adaptation_mal_id || null,
    enrichedSerieData.relations || null,
    enrichedSerieData.source_donnees || null,
    enrichedSerieData.source_url || null,
    enrichedSerieData.source_id || null
  );
  
  const serieId = result.lastInsertRowid;

  // Enregistrer le propriétaire (statut utilisateur) pour l'utilisateur connecté uniquement
  try {
    if (currentUserId) {
      const statutLecture = 'À lire';
      const volumesLus = typeof enrichedSerieData.volumes_lus === 'number' && enrichedSerieData.volumes_lus > 0
        ? enrichedSerieData.volumes_lus
        : 0;
      const chapitresLus = typeof enrichedSerieData.chapitres_lus === 'number' && enrichedSerieData.chapitres_lus > 0
        ? enrichedSerieData.chapitres_lus
        : 0;

      const { ensureMangaUserDataRow } = require('./manga-helpers');
      ensureMangaUserDataRow(db, serieId, currentUserId);
      
      db.prepare(`
        UPDATE manga_user_data
        SET statut_lecture = ?,
            volumes_lus = ?,
            chapitres_lus = ?,
            updated_at = datetime('now')
        WHERE serie_id = ? AND user_id = ?
      `).run(statutLecture, volumesLus, chapitresLus, serieId, currentUserId);
    }
  } catch (ownershipError) {
    console.warn('⚠️ Impossible d’enregistrer le propriétaire de la série', ownershipError);
  }

  // Enrichissement automatique uniquement pour la traduction du synopsis si activée
  // (les autres données sont déjà récupérées depuis Jikan avant l'insertion)
  if (enrichedSerieData.mal_id) {
    const currentUser = store.get('currentUser', '');
    if (currentUser) {
      const enrichmentConfig = getMangaEnrichmentConfig(store);
      
      // Si la traduction automatique est activée et qu'un synopsis existe, lancer l'enrichissement uniquement pour ça
      if (enrichmentConfig.enabled && enrichmentConfig.autoTranslate && enrichedSerieData.description) {
        try {
          // L'enrichissement va seulement traduire le synopsis, les autres données sont déjà présentes
          await enrichManga(getDb || (() => db), serieId, enrichedSerieData.mal_id, currentUser, enrichmentConfig, getPathManager);
        } catch (error) {
          console.error(`❌ [CREATE-SERIE] Erreur traduction: ${error.message}`);
          // Ne pas bloquer le retour si la traduction échoue
        }
      }
    }
  }

  // Nettoyer d'éventuels propriétaires hérités (ex: import dans ancienne version)
  if (currentUserId) {
    setExclusiveSerieOwnership(db, serieId, currentUserId);
    setExclusiveSerieUserStatus(db, serieId, currentUserId);
  }

  return serieId;
}

/**
 * Enregistre les handlers IPC pour les opérations de création
 */
function registerMangaSeriesCreateHandlers(ipcMain, getDb, getPathManager, store) {
  // Créer une série
  ipcMain.handle('create-serie', async (event, serie) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }
      const serieId = await handleCreateSerie(db, getPathManager, store, serie, getDb);
      return { success: true, id: serieId };
    } catch (error) {
      console.error('Erreur create-serie:', error);
      
      // Améliorer le message d'erreur pour les contraintes UNIQUE
      let errorMessage = error.message || 'Erreur lors de la création de la série';
      if (error.message && error.message.includes('UNIQUE constraint failed') && error.message.includes('mal_id')) {
        errorMessage = 'Entrée déjà présente dans la collection';
      }
      
      return { success: false, error: errorMessage };
    }
  });
}

module.exports = { registerMangaSeriesCreateHandlers, handleCreateSerie };
