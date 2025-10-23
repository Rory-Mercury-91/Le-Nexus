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
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      console.log('🎬 Début de l\'import anime XML...');
      
      // Parser XML simple (sans dépendance externe)
      const animeMatches = [...xmlContent.matchAll(/<anime>([\s\S]*?)<\/anime>/g)];
      
      const results = {
        total: animeMatches.length,
        imported: 0,
        updated: 0,
        errors: []
      };

      // Segmenter en lots de 50 pour respecter les limites de l'API
      const BATCH_SIZE = 50;
      const batches = [];
      for (let i = 0; i < animeMatches.length; i += BATCH_SIZE) {
        batches.push(animeMatches.slice(i, i + BATCH_SIZE));
      }

      console.log(`📦 Import divisé en ${batches.length} lots de max ${BATCH_SIZE} animes`);

      // Traiter chaque lot avec une pause entre les lots
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📦 Traitement du lot ${batchIndex + 1}/${batches.length} (${batch.length} animes)...`);
        
        // Envoyer la progression du lot
        sendProgress({
          phase: 'batch',
          currentBatch: batchIndex + 1,
          totalBatches: batches.length,
          total: animeMatches.length,
          imported: results.imported,
          updated: results.updated,
          errors: results.errors.length
        });

        for (const match of batch) {
        const animeXml = match[1];
        
        try {
          // Extraire les données de base
          const malId = parseInt(animeXml.match(/<series_animedb_id>(\d+)<\/series_animedb_id>/)?.[1]);
          const titre = animeXml.match(/<series_title><!\[CDATA\[(.*?)\]\]><\/series_title>/)?.[1];
          const type = animeXml.match(/<series_type>(.*?)<\/series_type>/)?.[1] || 'TV';
          const nbEpisodes = parseInt(animeXml.match(/<series_episodes>(\d+)<\/series_episodes>/)?.[1]) || 0;
          const episodesVus = parseInt(animeXml.match(/<my_watched_episodes>(\d+)<\/my_watched_episodes>/)?.[1]) || 0;
          const statut = animeXml.match(/<my_status>(.*?)<\/my_status>/)?.[1] || 'Watching';

          if (!malId || !titre) {
            console.warn('⚠️ Anime ignoré : données invalides');
            continue;
          }

          console.log(`📺 Traitement: ${titre} (MAL ID: ${malId})`);
          
          // Envoyer la progression de l'anime en cours
          const currentIndex = batchIndex * BATCH_SIZE + batch.indexOf(match) + 1;
          sendProgress({
            phase: 'anime',
            currentBatch: batchIndex + 1,
            totalBatches: batches.length,
            currentAnime: titre,
            currentIndex: currentIndex,
            total: animeMatches.length,
            imported: results.imported,
            updated: results.updated,
            errors: results.errors.length
          });

          // Récupérer les infos complètes depuis Jikan (API MAL) avec retry
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
              anime.title || titre,
              anime.title_english || titre,
              anime.title_japanese || '',
              anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '',
              anime.synopsis || '',
              statutFr,
              anime.type || type,
              anime.genres?.map(g => g.name).join(', ') || '',
              anime.studios?.map(s => s.name).join(', ') || '',
              anime.year || anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null,
              anime.rating || '',
              serieId
            );

            results.updated++;
            console.log(`   ↻ Mis à jour`);
          } else {
            // Créer la série anime
            const insertSerie = db.prepare(`
              INSERT INTO anime_series (
                titre, titre_romaji, titre_natif, couverture_url, description,
                statut, type, genres, studios, annee, rating, mal_id, utilisateur_ajout
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = insertSerie.run(
              anime.title || titre,
              anime.title_english || titre,
              anime.title_japanese || '',
              anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '',
              anime.synopsis || '',
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
            console.log(`   ✓ Importé`);
          }

          // Créer ou mettre à jour la saison 1 (par défaut)
          const existingSaison = db.prepare('SELECT id FROM anime_saisons WHERE serie_id = ? AND numero_saison = 1').get(serieId);
          
          let saisonId;
          
          if (existingSaison) {
            saisonId = existingSaison.id;
            
            // Mettre à jour le nombre d'épisodes si nécessaire
            // Priorité au XML, puis Jikan, et on prend le max pour éviter les incohérences
            const nbEpisodesReel = Math.max(nbEpisodes || 0, anime.episodes || 0);
            db.prepare('UPDATE anime_saisons SET nb_episodes = ? WHERE id = ?').run(
              nbEpisodesReel,
              saisonId
            );
          } else {
            const insertSaison = db.prepare(`
              INSERT INTO anime_saisons (serie_id, numero_saison, titre, nb_episodes, annee, couverture_url)
              VALUES (?, 1, ?, ?, ?, ?)
            `);

            // Priorité au XML, puis Jikan, et on prend le max pour éviter les incohérences
            const nbEpisodesReel = Math.max(nbEpisodes || 0, anime.episodes || 0);
            const saisonResult = insertSaison.run(
              serieId,
              'Saison 1',
              nbEpisodesReel,
              anime.year || anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null,
              anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || ''
            );

            saisonId = saisonResult.lastInsertRowid;
          }

          // Marquer les épisodes vus
          if (episodesVus > 0) {
            for (let i = 1; i <= episodesVus; i++) {
              db.prepare(`
                INSERT OR REPLACE INTO anime_episodes_vus (saison_id, utilisateur, episode_numero, vu, date_visionnage)
                VALUES (?, ?, ?, 1, date('now'))
              `).run(saisonId, currentUser, i);
            }
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
        console.log(`⏸️ Pause de 30 secondes avant le prochain lot...`);
        
        // Compte à rebours de la pause
        for (let remainingSec = 30; remainingSec > 0; remainingSec--) {
          sendProgress({
            phase: 'pause',
            currentBatch: batchIndex + 1,
            totalBatches: batches.length,
            total: animeMatches.length,
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

      console.log(`✅ Import terminé: ${results.imported} importés, ${results.updated} mis à jour, ${results.errors.length} erreurs`);
      
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

      console.log('🎬 Création d\'un anime:', animeData.titre);
      console.log('📊 Données reçues:', JSON.stringify(animeData, null, 2));

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

      console.log(`✅ Anime créé avec l'ID ${animeId}`);
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
          COALESCE(asu.statut_visionnage, 'En cours') as statut_visionnage
        FROM anime_series a
        LEFT JOIN anime_statut_utilisateur asu ON asu.serie_id = a.id AND asu.utilisateur = ?
        WHERE 1=1
      `;
      const params = [currentUser, currentUser];

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

      query += ` ORDER BY a.titre ASC`;

      const stmt = db.prepare(query);
      return stmt.all(...params);
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

      const dateVisionnage = vu ? new Date().toISOString().split('T')[0] : null;

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
          console.log(`✅ Anime ${saison.serie_id} automatiquement marqué comme "Terminé"`);
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

      const dateVisionnage = new Date().toISOString().split('T')[0];

      // Récupérer la série ID et le nombre d'épisodes
      const saisonInfo = db.prepare('SELECT serie_id, nb_episodes FROM anime_saisons WHERE id = ?').get(saisonId);
      
      if (!saisonInfo) {
        throw new Error('Saison non trouvée');
      }

      // Marquer tous les épisodes comme vus
      for (let i = 1; i <= saisonInfo.nb_episodes; i++) {
        db.prepare(`
          INSERT OR REPLACE INTO anime_episodes_vus (saison_id, utilisateur, episode_numero, vu, date_visionnage)
          VALUES (?, ?, ?, 1, ?)
        `).run(saisonId, currentUser, i, dateVisionnage);
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
        console.log(`✅ Anime ${saisonInfo.serie_id} automatiquement marqué comme "Terminé"`);
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
      console.log(`Anime ${serieId} supprimé`);
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

      console.log(`📺 Anime ${serieId} marqué comme "${statutVisionnage}" pour ${currentUser}`);
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

        console.log(`✅ Anime ${serieId} automatiquement marqué comme "Terminé" (${stats.nb_episodes_vus}/${stats.nb_episodes_total} épisodes vus)`);
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

      console.log(`📝 Mise à jour de l'anime ${id}:`, animeData.titre);

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

      console.log(`✅ Anime "${animeData.titre}" mis à jour`);

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
            console.log(`✅ Saison ${saison.numero_saison} mise à jour`);
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
            console.log(`✅ Saison ${saison.numero_saison} créée`);
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
}

module.exports = { registerAnimeHandlers };
