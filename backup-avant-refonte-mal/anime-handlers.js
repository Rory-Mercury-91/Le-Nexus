const { fetchAniListCover } = require('../apis/anilist');
const { translateText: groqTranslate } = require('../apis/groq');

/**
 * Enregistre tous les handlers IPC pour les animes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerAnimeHandlers(ipcMain, getDb, store) {
  
  // Importer une liste d'animes depuis un fichier XML MyAnimeList/ADKami
  ipcMain.handle('import-anime-xml', async (event, xmlContent) => {
    // Fonction helper pour envoyer les mises à jour de progression
    const sendProgress = (progress) => {
      event.sender.send('anime-import-progress', progress);
    };
    
    // Fonction helper pour traduire un texte avec Groq AI
    const translateWithGroq = async (text) => {
      const groqApiKey = store.get('groqApiKey', '');
      if (!groqApiKey || !text || text.length < 10) {
        return null; // Pas de clé ou texte trop court
      }
      
      const result = await groqTranslate(text, groqApiKey, 'fr', 'anime');
      return result.success ? result.text : null;
    };
    
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }


      
      // Parser XML simple (sans dépendance externe)
      const animeMatches = [...xmlContent.matchAll(/<anime>([\s\S]*?)<\/anime>/g)];
      
      // Fonction helper pour extraire le titre de base (avant : ou patterns de saison)
      const extractBaseTitre = (fullTitre) => {
        // Retirer les patterns courants de saisons/parties
        let baseTitre = fullTitre
          .replace(/:\s*(Season|Saison|Part|Partie|Cour)\s*\d+/gi, '')
          .replace(/:\s*(2nd|3rd|4th|5th)\s*(Season|Saison)?/gi, '')
          .replace(/\s*-\s*(Season|Saison|Part|Partie)\s*\d+/gi, '')
          .replace(/\s+(II|III|IV|V|2|3|4|5)$/gi, '')
          .trim();
        
        // Si le titre contient ":", prendre seulement la partie avant (pour Dr. Stone: New World, etc.)
        // SAUF si c'est un titre court (moins de 15 caractères) pour éviter de couper des titres normaux
        const colonIndex = baseTitre.indexOf(':');
        if (colonIndex > 15) {
          baseTitre = baseTitre.substring(0, colonIndex).trim();
        }
        
        return baseTitre || fullTitre;
      };
      
      // Étape 1 : Grouper les entrées par série (series_adk_id, ou titre de base)
      const groupedAnimes = new Map();
      
      for (const match of animeMatches) {
        const animeXml = match[1];
        const malId = parseInt(animeXml.match(/<series_animedb_id>(\d+)<\/series_animedb_id>/)?.[1]);
        const adkId = animeXml.match(/<series_adk_id>(\d+)<\/series_adk_id>/)?.[1];
        const titre = animeXml.match(/<series_title><!\[CDATA\[(.*?)\]\]><\/series_title>/)?.[1];
        
        if (!malId || !titre) continue;
        
        // Utiliser series_adk_id comme clé de groupe si disponible
        // Sinon, extraire le titre de base pour grouper les saisons ensemble
        const groupKey = adkId || extractBaseTitre(titre);
        const titreBase = extractBaseTitre(titre); // Toujours extraire le titre pour l'affichage
        
        if (!groupedAnimes.has(groupKey)) {
          groupedAnimes.set(groupKey, {
            titre: titreBase, // Utiliser le titre de base extrait (jamais l'ID)
            adkId: adkId,
            entries: []
          });
        }
        
        groupedAnimes.get(groupKey).entries.push({
          malId: malId,
          titre: titre, // Garder le titre complet pour chaque entrée
          xml: animeXml
        });
      }
      
      // Compter le nombre total d'entrées uniques (après groupement)
      const totalSeries = groupedAnimes.size;
      const totalEntries = animeMatches.length;
      
      const results = {
        total: totalEntries,
        imported: 0,
        updated: 0,
        errors: [],
        grouped: totalEntries - totalSeries // Nombre d'entrées groupées
      };

      // Convertir en tableau pour traitement par lots
      const groupedArray = Array.from(groupedAnimes.values());
      
      // Segmenter en lots de 50 pour respecter les limites de l'API
      const BATCH_SIZE = 50;
      const batches = [];
      for (let i = 0; i < groupedArray.length; i += BATCH_SIZE) {
        batches.push(groupedArray.slice(i, i + BATCH_SIZE));
      }



      // Traiter chaque lot avec une pause entre les lots
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        
        // Envoyer la progression du lot
        sendProgress({
          phase: 'batch',
          currentBatch: batchIndex + 1,
          totalBatches: batches.length,
          total: totalSeries,
          imported: results.imported,
          updated: results.updated,
          errors: results.errors.length
        });

        // Traiter chaque groupe (série avec ses saisons)
        for (const group of batch) {
        const titreBase = group.titre;
        const entries = group.entries;
        
        try {
          // Utiliser la première entrée pour les infos de base
          const firstEntry = entries[0];
          const animeXml = firstEntry.xml;
          const malId = firstEntry.malId;
          const titre = firstEntry.titre; // Titre complet de la première entrée
          
          const type = animeXml.match(/<series_type>(.*?)<\/series_type>/)?.[1] || 'TV';
          const statut = animeXml.match(/<my_status>(.*?)<\/my_status>/)?.[1] || 'Watching';

          if (!malId || !titre) {
            console.error('⚠️ Groupe ignoré : données invalides');
            continue;
          }

          
          // Envoyer la progression de l'anime en cours
          const currentIndex = batchIndex * BATCH_SIZE + batch.indexOf(group) + 1;
          sendProgress({
            phase: 'anime',
            currentBatch: batchIndex + 1,
            totalBatches: batches.length,
            currentAnime: `${titreBase} (${entries.length} saison${entries.length > 1 ? 's' : ''})`,
            currentIndex: currentIndex,
            total: totalSeries,
            imported: results.imported,
            updated: results.updated,
            errors: results.errors.length
          });

          // Récupérer les infos complètes depuis Jikan (API MAL) et AniList en parallèle
          let response;
          let retries = 3;
          
          while (retries > 0) {
            try {
              response = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
              
              if (response.status === 429) {
                // Rate limit dépassé, attendre plus longtemps
                console.warn(`⚠️ Rate limit atteint, attente de 2 secondes...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                retries--;
                continue;
              }
              
              if (!response.ok) {
                console.warn(`⚠️ Erreur HTTP ${response.status} pour ${titre} (MAL ID: ${malId})`);
                results.errors.push({ titre, malId, error: `HTTP ${response.status}` });
                break;
              }
              
              break; // Succès, sortir de la boucle
            } catch (fetchError) {
              console.warn(`⚠️ Erreur réseau pour ${titre}, tentatives restantes: ${retries - 1}`);
              retries--;
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
          
          if (!response || !response.ok || retries === 0) {
            results.errors.push({ titre, malId, error: 'Échec après plusieurs tentatives' });
            continue;
          }

          const jikanData = await response.json();
          const anime = jikanData.data;
          
          // Récupérer la cover HD depuis AniList
          const anilistCover = await fetchAniListCover(malId, titreBase);
          const coverUrl = anilistCover?.coverImage?.extraLarge || 
                          anilistCover?.coverImage?.large || 
                          anime.images?.jpg?.large_image_url || 
                          anime.images?.jpg?.image_url || 
                          '';
          
          // Délai pour respecter le rate limit d'AniList (~90 req/min)
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Traduire le synopsis avec Groq AI si disponible
          let description = anime.synopsis || '';
          if (description) {
            const translated = await translateWithGroq(description);
            if (translated) {
              description = translated;
            }
          }

          // Vérifier si l'anime existe déjà
          const existingAnime = db.prepare('SELECT id FROM anime_series WHERE mal_id = ?').get(malId);

          let serieId;
          const statutFr = statut === 'Watching' ? 'En cours' : statut === 'Completed' ? 'Terminé' : statut === 'On-Hold' ? 'En pause' : statut === 'Dropped' ? 'Abandonné' : 'À voir';

          if (existingAnime) {
            // Mise à jour de l'anime existant (actualise les infos depuis l'API)
            serieId = existingAnime.id;
            
            const updateSerie = db.prepare(`
              UPDATE anime_series SET
                titre = ?,
                titre_romaji = ?,
                titre_natif = ?,
                couverture_url = COALESCE(NULLIF(?, ''), couverture_url),
                description = COALESCE(NULLIF(?, ''), description),
                statut = ?,
                type = ?,
                genres = COALESCE(NULLIF(?, ''), genres),
                studios = COALESCE(NULLIF(?, ''), studios),
                annee = COALESCE(?, annee),
                rating = COALESCE(NULLIF(?, ''), rating),
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `);

            updateSerie.run(
              titreBase, // Utiliser le titre de base du groupe (ex: "Dr. Stone")
              anime.title_english || titreBase,
              anime.title_japanese || '',
              coverUrl, // Cover AniList HD ou Jikan
              description, // Synopsis traduit ou original
              statutFr,
              anime.type || type,
              anime.genres?.map(g => g.name).join(', ') || '',
              anime.studios?.map(s => s.name).join(', ') || '',
              anime.year || anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null,
              anime.rating || '',
              serieId
            );

            results.updated++;

          } else {
            // Créer la série anime
            const insertSerie = db.prepare(`
              INSERT INTO anime_series (
                titre, titre_romaji, titre_natif, couverture_url, description,
                statut, type, genres, studios, annee, rating, mal_id, utilisateur_ajout
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = insertSerie.run(
              titreBase, // Utiliser le titre de base du groupe (ex: "Dr. Stone")
              anime.title_english || titreBase,
              anime.title_japanese || '',
              coverUrl, // Cover AniList HD ou Jikan
              description, // Synopsis traduit ou original
              statutFr,
              anime.type || type,
              anime.genres?.map(g => g.name).join(', ') || '',
              anime.studios?.map(s => s.name).join(', ') || '',
              anime.year || anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null,
              anime.rating || '',
              malId,
              currentUser
            );

            serieId = result.lastInsertRowid;
            results.imported++;

          }

          // Traiter toutes les saisons du groupe
          for (let saisonIndex = 0; saisonIndex < entries.length; saisonIndex++) {
            const entry = entries[saisonIndex];
            const entryXml = entry.xml;
            const entryMalId = entry.malId;
            const entryTitre = entry.titre; // Titre complet de cette entrée (ex: "Dr. Stone: New World")
            
            const nbEpisodes = parseInt(entryXml.match(/<series_episodes>(\d+)<\/series_episodes>/)?.[1]) || 0;
            const episodesVus = parseInt(entryXml.match(/<my_watched_episodes>(\d+)<\/my_watched_episodes>/)?.[1]) || 0;
            
            // Récupérer les infos de cette saison depuis Jikan
            let saisonAnime = null;
            let saisonRetries = 3;
            
            while (saisonRetries > 0) {
              try {
                const saisonResponse = await fetch(`https://api.jikan.moe/v4/anime/${entryMalId}`);
                
                if (saisonResponse.status === 429) {
                  console.warn(`⚠️ Rate limit atteint pour saison ${entryMalId}, attente...`);
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  saisonRetries--;
                  continue;
                }
                
                if (saisonResponse.ok) {
                  const saisonData = await saisonResponse.json();
                  saisonAnime = saisonData.data;
                }
                break;
              } catch (error) {
                console.error(`Erreur fetch Jikan pour saison ${entryMalId}:`, error.message);
                saisonRetries--;
                if (saisonRetries > 0) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            }
            
            // Récupérer la cover HD depuis AniList pour cette saison
            const saisonAnilistCover = await fetchAniListCover(entryMalId, entryTitre);
            const saisonCoverUrl = saisonAnilistCover?.coverImage?.extraLarge || 
                                   saisonAnilistCover?.coverImage?.large || 
                                   saisonAnime?.images?.jpg?.large_image_url || 
                                   saisonAnime?.images?.jpg?.image_url || 
                                   '';
            
            // Délai pour respecter le rate limit d'AniList (~90 req/min)
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const numeroSaison = saisonIndex + 1;
            const existingSaison = db.prepare('SELECT id FROM anime_saisons WHERE serie_id = ? AND numero_saison = ?').get(serieId, numeroSaison);
            
            let saisonId;
            
            if (existingSaison) {
              saisonId = existingSaison.id;
              
              // Mettre à jour les infos de la saison
              const nbEpisodesReel = Math.max(nbEpisodes || 0, saisonAnime?.episodes || 0);
              db.prepare(`
                UPDATE anime_saisons 
                SET titre = ?, nb_episodes = ?, annee = ?, couverture_url = COALESCE(NULLIF(?, ''), couverture_url)
                WHERE id = ?
              `).run(
                saisonAnime?.title || entryTitre,
                nbEpisodesReel,
                saisonAnime?.year || saisonAnime?.aired?.from ? new Date(saisonAnime.aired.from).getFullYear() : null,
                saisonCoverUrl, // Cover AniList HD ou Jikan pour la saison
                saisonId
              );
            } else {
              // Créer la saison
              const nbEpisodesReel = Math.max(nbEpisodes || 0, saisonAnime?.episodes || 0);
              const saisonResult = db.prepare(`
                INSERT INTO anime_saisons (serie_id, numero_saison, titre, nb_episodes, annee, couverture_url)
                VALUES (?, ?, ?, ?, ?, ?)
              `).run(
                serieId,
                numeroSaison,
                saisonAnime?.title || entryTitre,
                nbEpisodesReel,
                saisonAnime?.year || saisonAnime?.aired?.from ? new Date(saisonAnime.aired.from).getFullYear() : null,
                saisonCoverUrl // Cover AniList HD ou Jikan pour la saison
              );
              
              saisonId = saisonResult.lastInsertRowid;
            }
            
            // Marquer les épisodes vus pour cette saison
            if (episodesVus > 0) {
              for (let i = 1; i <= episodesVus; i++) {
                db.prepare(`
                  INSERT OR REPLACE INTO anime_episodes_vus (saison_id, utilisateur, episode_numero, vu, date_visionnage)
                  VALUES (?, ?, ?, 1, datetime('now'))
                `).run(saisonId, currentUser, i);
              }
            }
            
            // Petit délai pour respecter les rate limits de Jikan
            await new Promise(resolve => setTimeout(resolve, 333)); // 3 requêtes/seconde max
          }

          // Attendre un peu pour ne pas surcharger l'API Jikan (rate limit: 3 req/s max, on joue safe avec 500ms)
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ Erreur pour un anime:`, error);
          results.errors.push({ titre: 'inconnu', error: error.message });
        }
      }

      // Pause de 30 secondes entre chaque lot (sauf pour le dernier)
      if (batchIndex < batches.length - 1) {

        
        // Compte à rebours de la pause
        for (let remainingSec = 30; remainingSec > 0; remainingSec--) {
          sendProgress({
            phase: 'pause',
            currentBatch: batchIndex + 1,
            totalBatches: batches.length,
            total: totalSeries,
            imported: results.imported,
            updated: results.updated,
            errors: results.errors.length,
            isPausing: true,
            remainingPauseSeconds: remainingSec
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }


      
      // Envoyer la progression finale
      sendProgress({
        phase: 'complete',
        total: animeMatches.length,
        imported: results.imported,
        updated: results.updated,
        errors: results.errors.length
      });
      
      return results;

    } catch (error) {
      console.error('Erreur import-anime-xml:', error);
      throw error;
    }
  });

  // Créer un anime manuellement
  ipcMain.handle('create-anime', async (event, animeData) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }




      // Insérer l'anime dans la base de données
      const stmt = db.prepare(`
        INSERT INTO anime_series (
          titre, titre_romaji, titre_natif, couverture_url, description, 
          statut, type, genres, annee, rating, utilisateur_ajout
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        animeData.titre || '',
        animeData.titre_en || null,
        null, // titre_natif
        animeData.image_url || null,
        animeData.synopsis || null,
        animeData.statut || 'plan_to_watch',
        animeData.type || 'TV',
        animeData.genres || null,
        animeData.annee || null,
        animeData.score ? `${animeData.score}/10` : null,
        currentUser
      );

      const animeId = result.lastInsertRowid;

      // Créer une saison par défaut si des épisodes sont spécifiés
      if (animeData.nb_episodes && animeData.nb_episodes > 0) {
        const stmtSaison = db.prepare(`
          INSERT INTO anime_saisons (serie_id, numero_saison, titre, nb_episodes, annee)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmtSaison.run(animeId, 1, 'Saison 1', animeData.nb_episodes, animeData.annee || null);
      }


      return { success: true, id: animeId };

    } catch (error) {
      console.error('Erreur create-anime:', error);
      throw error;
    }
  });

  // Récupérer la liste des animes
  ipcMain.handle('get-anime-series', (event, filters = {}) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      
      // Récupérer l'ID de l'utilisateur actuel
      const user = currentUser ? db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser) : null;
      const userId = user ? user.id : null;
      
      let query = `
        SELECT 
          a.*,
          (SELECT COUNT(*) FROM anime_saisons WHERE serie_id = a.id) as nb_saisons,
          (SELECT SUM(nb_episodes) FROM anime_saisons WHERE serie_id = a.id) as nb_episodes_total,
          (
            SELECT COUNT(*) 
            FROM anime_episodes_vus ev 
            JOIN anime_saisons s ON ev.saison_id = s.id 
            WHERE s.serie_id = a.id AND ev.utilisateur = ? AND ev.vu = 1
          ) as nb_episodes_vus,
          COALESCE(asu.statut_visionnage, 'En cours') as statut_visionnage,
          at.tag as manual_tag,
          at.is_favorite as is_favorite
        FROM anime_series a
        LEFT JOIN anime_statut_utilisateur asu ON asu.serie_id = a.id AND asu.utilisateur = ?
        LEFT JOIN anime_tags at ON a.id = at.anime_id AND at.user_id = ?
        WHERE 1=1
      `;
      const params = [currentUser, currentUser, userId];

      // Filtre par utilisateur (optionnel)
      if (filters.mesAnimes && currentUser) {
        query += ` AND a.utilisateur_ajout = ?`;
        params.push(currentUser);
      }

      // Filtre par statut
      if (filters.statut) {
        query += ` AND a.statut = ?`;
        params.push(filters.statut);
      }

      // Filtre par type
      if (filters.type) {
        query += ` AND a.type = ?`;
        params.push(filters.type);
      }

      // Filtre par tag
      if (filters.tag) {
        if (filters.tag === 'favori') {
          query += ' AND at.is_favorite = 1';
        } else if (filters.tag === 'en_cours' || filters.tag === 'termine') {
          // Pour les tags automatiques, on filtre après la requête
        } else {
          query += ' AND at.tag = ?';
          params.push(filters.tag);
        }
      }

      query += ` ORDER BY a.titre ASC`;

      const stmt = db.prepare(query);
      const animes = stmt.all(...params);
      
      // Calculer le tag effectif pour chaque anime en fonction de la progression
      let animesWithTags = animes.map(anime => {
        let effectiveTag = anime.manual_tag || null;
        
        // Si pas de tag manuel (a_regarder ou abandonne), calculer automatiquement
        if (!anime.manual_tag || anime.manual_tag === null) {
          if (currentUser && anime.nb_episodes_total > 0) {
            const episodesVus = anime.nb_episodes_vus || 0;
            const episodesTotal = anime.nb_episodes_total;
            
            if (episodesVus === episodesTotal && episodesVus > 0) {
              effectiveTag = 'termine';
            } else if (episodesVus > 0) {
              effectiveTag = 'en_cours';
            }
          }
        }
        
        return {
          ...anime,
          tag: effectiveTag,
          is_favorite: anime.is_favorite ? true : false
        };
      });
      
      // Filtrer par tag automatique si nécessaire
      if (filters.tag === 'en_cours') {
        animesWithTags = animesWithTags.filter(a => a.tag === 'en_cours');
      } else if (filters.tag === 'termine') {
        animesWithTags = animesWithTags.filter(a => a.tag === 'termine');
      }
      
      return animesWithTags;
    } catch (error) {
      console.error('Erreur get-anime-series:', error);
      throw error;
    }
  });

  // Récupérer le détail d'un anime avec ses saisons
  ipcMain.handle('get-anime-detail', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      
      // Récupérer la série avec le statut de visionnage
      const serie = db.prepare(`
        SELECT 
          a.*,
          COALESCE(asu.statut_visionnage, 'En cours') as statut_visionnage
        FROM anime_series a
        LEFT JOIN anime_statut_utilisateur asu ON asu.serie_id = a.id AND asu.utilisateur = ?
        WHERE a.id = ?
      `).get(currentUser, serieId);
      
      if (!serie) {
        throw new Error('Anime non trouvé');
      }

      // Récupérer les saisons
      const saisons = db.prepare(`
        SELECT 
          s.*,
          (
            SELECT COUNT(*) 
            FROM anime_episodes_vus ev 
            WHERE ev.saison_id = s.id AND ev.utilisateur = ? AND ev.vu = 1
          ) as episodes_vus
        FROM anime_saisons s
        WHERE s.serie_id = ?
        ORDER BY s.numero_saison ASC
      `).all(currentUser, serieId);

      // Pour chaque saison, récupérer les détails des épisodes vus
      saisons.forEach(saison => {
        const episodesVusRaw = db.prepare(`
          SELECT episode_numero, vu, date_visionnage
          FROM anime_episodes_vus
          WHERE saison_id = ? AND utilisateur = ?
        `).all(saison.id, currentUser);
        
        // Convertir vu de 0/1 à boolean
        saison.episodes_vus_details = episodesVusRaw.map(ep => ({
          ...ep,
          vu: Boolean(ep.vu)
        }));
      });

      // Calculer le nombre total d'épisodes
      const nb_episodes_total = saisons.reduce((acc, s) => acc + (s.nb_episodes || 0), 0);

      return {
        ...serie,
        nb_episodes_total,
        saisons
      };
    } catch (error) {
      console.error('Erreur get-anime-detail:', error);
      throw error;
    }
  });

  // Marquer un épisode comme vu/non vu
  ipcMain.handle('toggle-episode-vu', (event, saisonId, episodeNumero, vu) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      const dateVisionnage = vu ? new Date().toISOString().replace('T', ' ').replace('Z', '') : null;

      db.prepare(`
        INSERT OR REPLACE INTO anime_episodes_vus (saison_id, utilisateur, episode_numero, vu, date_visionnage)
        VALUES (?, ?, ?, ?, ?)
      `).run(saisonId, currentUser, episodeNumero, vu ? 1 : 0, dateVisionnage);

      // Récupérer la série ID pour vérifier la complétion
      const saison = db.prepare('SELECT serie_id FROM anime_saisons WHERE id = ?').get(saisonId);
      if (saison) {
        // Vérifier si tous les épisodes sont vus
        const stats = db.prepare(`
          SELECT 
            (SELECT SUM(nb_episodes) FROM anime_saisons WHERE serie_id = ?) as nb_episodes_total,
            (
              SELECT COUNT(*) 
              FROM anime_episodes_vus ev 
              JOIN anime_saisons s ON ev.saison_id = s.id 
              WHERE s.serie_id = ? AND ev.utilisateur = ? AND ev.vu = 1
            ) as nb_episodes_vus
        `).get(saison.serie_id, saison.serie_id, currentUser);

        const isComplete = stats.nb_episodes_total > 0 && stats.nb_episodes_vus === stats.nb_episodes_total;

        if (isComplete) {
          // Marquer automatiquement comme "Terminé"
          db.prepare(`
            INSERT OR REPLACE INTO anime_statut_utilisateur (serie_id, utilisateur, statut_visionnage, date_modification)
            VALUES (?, ?, 'Terminé', CURRENT_TIMESTAMP)
          `).run(saison.serie_id, currentUser);

        }
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur toggle-episode-vu:', error);
      throw error;
    }
  });

  // Marquer toute une saison comme vue
  ipcMain.handle('marquer-saison-vue', (event, saisonId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      // Récupérer la série ID et le nombre d'épisodes
      const saisonInfo = db.prepare('SELECT serie_id, nb_episodes FROM anime_saisons WHERE id = ?').get(saisonId);
      
      if (!saisonInfo) {
        throw new Error('Saison non trouvée');
      }

      // Marquer tous les épisodes comme vus avec des timestamps espacés
      // pour conserver l'ordre chronologique (1 seconde entre chaque épisode)
      const baseDate = new Date();
      for (let i = 1; i <= saisonInfo.nb_episodes; i++) {
        const dateVisionnage = new Date(baseDate.getTime() + ((i - 1) * 1000)); // +1 seconde par épisode
        const dateVisionnageStr = dateVisionnage.toISOString().replace('T', ' ').replace('Z', '');
        db.prepare(`
          INSERT OR REPLACE INTO anime_episodes_vus (saison_id, utilisateur, episode_numero, vu, date_visionnage)
          VALUES (?, ?, ?, 1, ?)
        `).run(saisonId, currentUser, i, dateVisionnageStr);
      }

      // Vérifier si tous les épisodes de la série sont vus
      const stats = db.prepare(`
        SELECT 
          (SELECT SUM(nb_episodes) FROM anime_saisons WHERE serie_id = ?) as nb_episodes_total,
          (
            SELECT COUNT(*) 
            FROM anime_episodes_vus ev 
            JOIN anime_saisons s ON ev.saison_id = s.id 
            WHERE s.serie_id = ? AND ev.utilisateur = ? AND ev.vu = 1
          ) as nb_episodes_vus
      `).get(saisonInfo.serie_id, saisonInfo.serie_id, currentUser);

      const isComplete = stats.nb_episodes_total > 0 && stats.nb_episodes_vus === stats.nb_episodes_total;

      if (isComplete) {
        // Marquer automatiquement comme "Terminé"
        db.prepare(`
          INSERT OR REPLACE INTO anime_statut_utilisateur (serie_id, utilisateur, statut_visionnage, date_modification)
          VALUES (?, ?, 'Terminé', CURRENT_TIMESTAMP)
        `).run(saisonInfo.serie_id, currentUser);

      }

      return { success: true };
    } catch (error) {
      console.error('Erreur marquer-saison-vue:', error);
      throw error;
    }
  });

  // Supprimer un anime
  ipcMain.handle('delete-anime', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      db.prepare('DELETE FROM anime_series WHERE id = ?').run(serieId);

      return { success: true };
    } catch (error) {
      console.error('Erreur delete-anime:', error);
      throw error;
    }
  });

  // Changer le statut de visionnage d'un anime (En cours / Terminé / Abandonné)
  ipcMain.handle('set-anime-statut-visionnage', (event, serieId, statutVisionnage) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      // Valider le statut
      const statutsValides = ['En cours', 'Terminé', 'Abandonné'];
      if (!statutsValides.includes(statutVisionnage)) {
        throw new Error(`Statut invalide: ${statutVisionnage}`);
      }

      // Insérer ou mettre à jour le statut
      db.prepare(`
        INSERT OR REPLACE INTO anime_statut_utilisateur (serie_id, utilisateur, statut_visionnage, date_modification)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(serieId, currentUser, statutVisionnage);


      return { success: true };
    } catch (error) {
      console.error('Erreur set-anime-statut-visionnage:', error);
      throw error;
    }
  });

  // Vérifier automatiquement si un anime doit être marqué comme "Terminé"
  ipcMain.handle('check-anime-completion', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      // Récupérer le nombre total d'épisodes et le nombre d'épisodes vus
      const stats = db.prepare(`
        SELECT 
          (SELECT SUM(nb_episodes) FROM anime_saisons WHERE serie_id = ?) as nb_episodes_total,
          (
            SELECT COUNT(*) 
            FROM anime_episodes_vus ev 
            JOIN anime_saisons s ON ev.saison_id = s.id 
            WHERE s.serie_id = ? AND ev.utilisateur = ? AND ev.vu = 1
          ) as nb_episodes_vus
      `).get(serieId, serieId, currentUser);

      const isComplete = stats.nb_episodes_total > 0 && stats.nb_episodes_vus === stats.nb_episodes_total;

      if (isComplete) {
        // Marquer automatiquement comme "Terminé"
        db.prepare(`
          INSERT OR REPLACE INTO anime_statut_utilisateur (serie_id, utilisateur, statut_visionnage, date_modification)
          VALUES (?, ?, 'Terminé', CURRENT_TIMESTAMP)
        `).run(serieId, currentUser);


      }

      return { success: true, isComplete };
    } catch (error) {
      console.error('Erreur check-anime-completion:', error);
      throw error;
    }
  });

  // Mettre à jour un anime existant
  ipcMain.handle('update-anime', async (event, id, animeData) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }



      // Vérifier que l'anime existe
      const anime = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(id);
      if (!anime) {
        throw new Error(`Anime avec l'ID ${id} non trouvé`);
      }

      // Mettre à jour les données de l'anime
      db.prepare(`
        UPDATE anime_series 
        SET titre = ?, titre_natif = ?, couverture_url = ?, description = ?, 
            statut = ?, type = ?, genres = ?, studios = ?, annee = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        animeData.titre,
        animeData.titre_natif || null,
        animeData.couverture_url || null,
        animeData.description || null,
        animeData.statut || 'En cours',
        animeData.type || 'TV',
        animeData.genres || null,
        animeData.studios || null,
        animeData.annee || null,
        id
      );



      // Mettre à jour les saisons si fournies
      if (animeData.saisons && Array.isArray(animeData.saisons)) {
        for (const saison of animeData.saisons) {
          if (saison.id) {
            // Mise à jour d'une saison existante
            db.prepare(`
              UPDATE anime_saisons 
              SET numero_saison = ?, titre = ?, nb_episodes = ?, annee = ?
              WHERE id = ?
            `).run(
              saison.numero_saison,
              saison.titre || `Saison ${saison.numero_saison}`,
              saison.nb_episodes,
              saison.annee || animeData.annee,
              saison.id
            );

          } else {
            // Création d'une nouvelle saison
            db.prepare(`
              INSERT INTO anime_saisons (serie_id, numero_saison, titre, nb_episodes, annee)
              VALUES (?, ?, ?, ?, ?)
            `).run(
              id,
              saison.numero_saison,
              saison.titre || `Saison ${saison.numero_saison}`,
              saison.nb_episodes,
              saison.annee || animeData.annee
            );

          }
        }
      }

      return { success: true, message: `Anime "${animeData.titre}" mis à jour avec succès` };
    } catch (error) {
      console.error('Erreur update-anime:', error);
      throw error;
    }
  });

  // Récupérer les saisons d'un anime
  ipcMain.handle('get-anime-saisons', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const saisons = db.prepare(`
        SELECT * 
        FROM anime_saisons
        WHERE serie_id = ?
        ORDER BY numero_saison ASC
      `).all(serieId);

      return saisons;
    } catch (error) {
      console.error('Erreur get-anime-saisons:', error);
      throw error;
    }
  });

  // ========== TAGS D'ANIMES ==========

  // Définir ou modifier le tag d'un anime pour un utilisateur
  ipcMain.handle('set-anime-tag', async (event, animeId, userId, tag) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      if (tag && !['a_regarder', 'abandonne'].includes(tag)) {
        throw new Error(`Tag invalide: ${tag}`);
      }

      const existing = db.prepare('SELECT id FROM anime_tags WHERE anime_id = ? AND user_id = ?').get(animeId, userId);
      
      if (existing) {
        db.prepare('UPDATE anime_tags SET tag = ?, updated_at = CURRENT_TIMESTAMP WHERE anime_id = ? AND user_id = ?')
          .run(tag, animeId, userId);
      } else {
        db.prepare('INSERT INTO anime_tags (anime_id, user_id, tag, is_favorite) VALUES (?, ?, ?, 0)')
          .run(animeId, userId, tag);
      }
      
      return { success: true, tag };
    } catch (error) {
      console.error('❌ Erreur set-anime-tag:', error);
      throw error;
    }
  });

  // Basculer le statut favori d'un anime pour un utilisateur
  ipcMain.handle('toggle-anime-favorite', async (event, animeId, userId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const existing = db.prepare('SELECT id, is_favorite FROM anime_tags WHERE anime_id = ? AND user_id = ?').get(animeId, userId);
      
      if (existing) {
        const newFavorite = existing.is_favorite ? 0 : 1;
        db.prepare('UPDATE anime_tags SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE anime_id = ? AND user_id = ?')
          .run(newFavorite, animeId, userId);
        return { success: true, is_favorite: newFavorite === 1 };
      } else {
        db.prepare('INSERT INTO anime_tags (anime_id, user_id, tag, is_favorite) VALUES (?, ?, NULL, 1)')
          .run(animeId, userId);
        return { success: true, is_favorite: true };
      }
    } catch (error) {
      console.error('❌ Erreur toggle-anime-favorite:', error);
      throw error;
    }
  });

  // Récupérer le tag d'un anime pour un utilisateur
  ipcMain.handle('get-anime-tag', async (event, animeId, userId) => {
    try {
      const db = getDb();
      if (!db) return null;

      const result = db.prepare('SELECT tag, is_favorite FROM anime_tags WHERE anime_id = ? AND user_id = ?').get(animeId, userId);
      return result ? { tag: result.tag, is_favorite: result.is_favorite === 1 } : null;
    } catch (error) {
      console.error('❌ Erreur get-anime-tag:', error);
      return null;
    }
  });

  // Supprimer le tag d'un anime pour un utilisateur (mais garder favori si présent)
  ipcMain.handle('remove-anime-tag', async (event, animeId, userId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const existing = db.prepare('SELECT is_favorite FROM anime_tags WHERE anime_id = ? AND user_id = ?').get(animeId, userId);
      
      if (existing && existing.is_favorite) {
        db.prepare('UPDATE anime_tags SET tag = NULL, updated_at = CURRENT_TIMESTAMP WHERE anime_id = ? AND user_id = ?')
          .run(animeId, userId);
      } else {
        db.prepare('DELETE FROM anime_tags WHERE anime_id = ? AND user_id = ?').run(animeId, userId);
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur remove-anime-tag:', error);
      throw error;
    }
  });
}

module.exports = { registerAnimeHandlers };
