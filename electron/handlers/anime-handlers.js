const { fetchAniListCover } = require('../apis/anilist');
const { translateText: groqTranslate } = require('../apis/groq');

/**
 * Enregistre tous les handlers IPC pour les animes (version MyAnimeList pure)
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerAnimeHandlers(ipcMain, getDb, store) {
  
  /**
   * Helper : Traduire les saisons en français
   */
  const translateSeason = (season) => {
    const seasons = {
      'winter': 'Hiver',
      'spring': 'Printemps',
      'summer': 'Été',
      'fall': 'Automne'
    };
    return seasons[season?.toLowerCase()] || season;
  };

  /**
   * Helper : Récupérer les données depuis Jikan API
   */
  const fetchJikanData = async (malId) => {
    const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  };

  /**
   * Helper : Extraire le nom de franchise depuis les relations MAL
   */
  const extractFranchiseName = (anime, relations) => {
    // Chercher le titre de base en remontant les prequels
    let franchiseName = anime.title_english || anime.title;
    
    // Simplifier le titre pour la franchise
    franchiseName = franchiseName
      .replace(/:\s*(Season|Part|Movie|OVA)\s*\d+/gi, '')
      .replace(/\s+(Season|Part)\s+\d+/gi, '')
      .replace(/\s+(II|III|IV|V|2nd|3rd|4th|5th)/gi, '')
      .trim();
    
    return franchiseName;
  };

  /**
   * Helper : Déterminer l'ordre dans la franchise
   */
  const determineFranchiseOrder = (anime, relations) => {
    // Compter le nombre de prequels pour déterminer l'ordre
    const prequels = relations?.filter(r => r.relation === 'Prequel') || [];
    return prequels.length + 1;
  };

  /**
   * Helper : Traduire avec Groq AI
   */
  const translateWithGroq = async (text) => {
    const groqApiKey = store.get('groqApiKey', '');
    if (!groqApiKey || !text || text.length < 10) {
      return null;
    }
    const result = await groqTranslate(text, groqApiKey, 'fr', 'anime');
    return result.success ? result.text : null;
  };

  /**
   * NOUVEAU : Ajouter un anime par MAL ID ou URL
   */
  ipcMain.handle('add-anime-by-mal-id', async (event, malIdOrUrl) => {
    try {
      const db = getDb();
      if (!db) throw new Error('Base de données non initialisée');

      const currentUser = store.get('currentUser', '');
      if (!currentUser) throw new Error('Aucun utilisateur connecté');

      // Extraire le MAL ID depuis l'URL si nécessaire
      let malId = malIdOrUrl;
      if (typeof malIdOrUrl === 'string' && malIdOrUrl.includes('myanimelist.net')) {
        const match = malIdOrUrl.match(/anime\/(\d+)/);
        if (!match) throw new Error('URL MyAnimeList invalide');
        malId = parseInt(match[1]);
      } else {
        malId = parseInt(malId);
      }

      if (isNaN(malId)) throw new Error('MAL ID invalide');

      // Vérifier si l'anime existe déjà
      const existing = db.prepare('SELECT id, titre FROM anime_series WHERE mal_id = ?').get(malId);
      if (existing) {
        return {
          success: false,
          error: `Cet anime existe déjà : ${existing.titre}`,
          animeId: existing.id
        };
      }

      // Récupérer les données depuis Jikan
      console.log(`🔍 Récupération des données pour MAL ID ${malId}...`);
      const anime = await fetchJikanData(malId);
      await new Promise(resolve => setTimeout(resolve, 333)); // Rate limit Jikan

      // Récupérer la couverture HD depuis AniList
      console.log(`🖼️ Récupération de la couverture HD depuis AniList...`);
      const anilistCover = await fetchAniListCover(malId, anime.title);
      const coverUrl = anilistCover?.coverImage?.extraLarge || 
                      anilistCover?.coverImage?.large || 
                      anime.images?.jpg?.large_image_url || 
                      anime.images?.jpg?.image_url || '';
      await new Promise(resolve => setTimeout(resolve, 800)); // Rate limit AniList

      // Traduire le synopsis
      let description = anime.synopsis || '';
      if (description) {
        console.log(`🌐 Traduction du synopsis...`);
        const translated = await translateWithGroq(description);
        if (translated) description = translated;
      }

      // Extraire les informations de franchise
      const relations = anime.relations || [];
      const franchiseName = extractFranchiseName(anime, relations);
      const franchiseOrder = determineFranchiseOrder(anime, relations);
      
      // Trouver les IDs des prequels et sequels
      const prequel = relations.find(r => r.relation === 'Prequel');
      const sequel = relations.find(r => r.relation === 'Sequel');
      const prequelMalId = prequel?.entry[0]?.mal_id || null;
      const sequelMalId = sequel?.entry[0]?.mal_id || null;

      // Préparer les données (avec tous les champs enrichis)
      const animeData = {
        mal_id: malId,
        mal_url: anime.url || `https://myanimelist.net/anime/${malId}`,
        titre: anime.title,
        titre_romaji: anime.title_japanese || null,
        titre_natif: anime.title_japanese || null,
        titre_anglais: anime.title_english || null,
        titres_alternatifs: anime.title_synonyms?.join(', ') || null,
        type: anime.type || 'TV',
        source: anime.source || null,
        nb_episodes: anime.type === 'Movie' ? 1 : (anime.episodes || 0),
        couverture_url: coverUrl,
        description: description,
        statut_diffusion: anime.status || 'Finished Airing',
        en_cours_diffusion: anime.airing ? 1 : 0,
        date_debut: anime.aired?.from || null,
        date_fin: anime.aired?.to || null,
        duree: anime.duration || null,
        annee: anime.year || anime.aired?.prop?.from?.year || null,
        saison_diffusion: translateSeason(anime.season),
        genres: anime.genres?.map(g => g.name).join(', ') || '',
        themes: anime.themes?.map(t => t.name).join(', ') || null,
        demographics: anime.demographics?.map(d => d.name).join(', ') || null,
        studios: anime.studios?.map(s => s.name).join(', ') || '',
        producteurs: anime.producers?.map(p => p.name).join(', ') || null,
        diffuseurs: anime.licensors?.map(l => l.name).join(', ') || null,
        rating: anime.rating || null,
        score: anime.score || null,
        liens_externes: JSON.stringify(anime.external?.filter(e => e.name === 'Wikipedia') || []),
        liens_streaming: JSON.stringify(anime.streaming || []),
        franchise_name: franchiseName,
        franchise_order: franchiseOrder,
        prequel_mal_id: prequelMalId,
        sequel_mal_id: sequelMalId,
        source_import: 'manual',
        utilisateur_ajout: currentUser
      };

      // Insérer dans la base de données
      const stmt = db.prepare(`
        INSERT INTO anime_series (
          mal_id, mal_url, titre, titre_romaji, titre_natif, titre_anglais, titres_alternatifs,
          type, source, nb_episodes, couverture_url, description, statut_diffusion, en_cours_diffusion,
          date_debut, date_fin, duree, annee, saison_diffusion, genres, themes, demographics,
          studios, producteurs, diffuseurs, rating, score, liens_externes, liens_streaming,
          franchise_name, franchise_order, prequel_mal_id, sequel_mal_id, source_import, utilisateur_ajout
        ) VALUES (
          @mal_id, @mal_url, @titre, @titre_romaji, @titre_natif, @titre_anglais, @titres_alternatifs,
          @type, @source, @nb_episodes, @couverture_url, @description, @statut_diffusion, @en_cours_diffusion,
          @date_debut, @date_fin, @duree, @annee, @saison_diffusion, @genres, @themes, @demographics,
          @studios, @producteurs, @diffuseurs, @rating, @score, @liens_externes, @liens_streaming,
          @franchise_name, @franchise_order, @prequel_mal_id, @sequel_mal_id, @source_import, @utilisateur_ajout
        )
      `);
      
      const result = stmt.run(animeData);
      const animeId = result.lastInsertRowid;

      console.log(`✅ Anime ajouté : ${anime.title} (MAL ${malId})`);

      // Proposer d'ajouter les relations manquantes
      const relatedAnimes = [];
      for (const rel of relations) {
        if (!rel.entry || rel.entry.length === 0) continue;
        
        const relMalId = rel.entry[0].mal_id;
        const relTitle = rel.entry[0].name;
        const relType = rel.relation; // Prequel, Sequel, Side story, etc.
        
        // Vérifier si cette relation existe déjà
        const exists = db.prepare('SELECT id FROM anime_series WHERE mal_id = ?').get(relMalId);
        if (!exists) {
          relatedAnimes.push({
            mal_id: relMalId,
            title: relTitle,
            relation: relType
          });
        }
      }

      return {
        success: true,
        animeId: animeId,
        anime: animeData,
        relatedAnimes: relatedAnimes
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout de l\'anime:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * SIMPLIFIÉ : Import depuis XML MyAnimeList
   * Chaque entrée XML = 1 anime distinct dans la DB
   */
  ipcMain.handle('import-anime-xml', async (event, xmlContent) => {
    const sendProgress = (progress) => {
      event.sender.send('anime-import-progress', progress);
    };

    try {
      const db = getDb();
      if (!db) throw new Error('Base de données non initialisée');

      const currentUser = store.get('currentUser', '');
      if (!currentUser) throw new Error('Aucun utilisateur connecté');

      // Parser le XML
      const animeMatches = [...xmlContent.matchAll(/<anime>([\s\S]*?)<\/anime>/g)];
      const totalAnimes = animeMatches.length;

      console.log(`\n🎬 Début de l'import : ${totalAnimes} animes à importer`);
      sendProgress({ current: 0, total: totalAnimes, currentAnime: 'Initialisation...' });

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < animeMatches.length; i++) {
        const animeXml = animeMatches[i][1];
        
        // Extraire les données XML
          const malId = parseInt(animeXml.match(/<series_animedb_id>(\d+)<\/series_animedb_id>/)?.[1]);
          const titre = animeXml.match(/<series_title><!\[CDATA\[(.*?)\]\]><\/series_title>/)?.[1];
        const watchedEpisodes = parseInt(animeXml.match(/<my_watched_episodes>(\d+)<\/my_watched_episodes>/)?.[1] || 0);
        const myStatus = animeXml.match(/<my_status>(.*?)<\/my_status>/)?.[1];

          if (!malId || !titre) {
          skipped++;
            continue;
          }

          sendProgress({
          current: i + 1, 
          total: totalAnimes, 
          currentAnime: titre 
        });

        try {
          // Vérifier si l'anime existe déjà
          const existing = db.prepare('SELECT id FROM anime_series WHERE mal_id = ?').get(malId);
          
          if (existing) {
            console.log(`⏭️ ${titre} (MAL ${malId}) déjà présent, ignoré`);
            skipped++;
            continue;
          }

          // Récupérer les données depuis Jikan
          console.log(`📡 Fetch Jikan pour: ${titre} (MAL ${malId})`);
          const anime = await fetchJikanData(malId);
          await new Promise(resolve => setTimeout(resolve, 333));

          // Récupérer la couverture HD depuis AniList
          const anilistCover = await fetchAniListCover(malId, titre);
          const coverUrl = anilistCover?.coverImage?.extraLarge || 
                          anilistCover?.coverImage?.large || 
                          anime.images?.jpg?.large_image_url || '';
          await new Promise(resolve => setTimeout(resolve, 800));

          // Traduire le synopsis
          let description = anime.synopsis || '';
          if (description) {
            const translated = await translateWithGroq(description);
            if (translated) description = translated;
          }

          // Extraire les informations de franchise
          const relations = anime.relations || [];
          const franchiseName = extractFranchiseName(anime, relations);
          const franchiseOrder = determineFranchiseOrder(anime, relations);
          
          const prequel = relations.find(r => r.relation === 'Prequel');
          const sequel = relations.find(r => r.relation === 'Sequel');
          const prequelMalId = prequel?.entry[0]?.mal_id || null;
          const sequelMalId = sequel?.entry[0]?.mal_id || null;

          // Préparer les données (avec tous les champs enrichis)
          const animeData = {
            mal_id: malId,
            mal_url: anime.url || `https://myanimelist.net/anime/${malId}`,
            titre: anime.title,
            titre_romaji: anime.title_japanese || null,
            titre_natif: anime.title_japanese || null,
            titre_anglais: anime.title_english || null,
            titres_alternatifs: anime.title_synonyms?.join(', ') || null,
            type: anime.type || 'TV',
            source: anime.source || null,
            nb_episodes: anime.type === 'Movie' ? 1 : (anime.episodes || 0),
            couverture_url: coverUrl,
            description: description,
            statut_diffusion: anime.status || 'Finished Airing',
            en_cours_diffusion: anime.airing ? 1 : 0,
            date_debut: anime.aired?.from || null,
            date_fin: anime.aired?.to || null,
            duree: anime.duration || null,
            annee: anime.year || anime.aired?.prop?.from?.year || null,
            saison_diffusion: translateSeason(anime.season),
            genres: anime.genres?.map(g => g.name).join(', ') || '',
            themes: anime.themes?.map(t => t.name).join(', ') || null,
            demographics: anime.demographics?.map(d => d.name).join(', ') || null,
            studios: anime.studios?.map(s => s.name).join(', ') || '',
            producteurs: anime.producers?.map(p => p.name).join(', ') || null,
            diffuseurs: anime.licensors?.map(l => l.name).join(', ') || null,
            rating: anime.rating || null,
            score: anime.score || null,
            liens_externes: JSON.stringify(anime.external?.filter(e => e.name === 'Wikipedia') || []),
            liens_streaming: JSON.stringify(anime.streaming || []),
            franchise_name: franchiseName,
            franchise_order: franchiseOrder,
            prequel_mal_id: prequelMalId,
            sequel_mal_id: sequelMalId,
            source_import: 'myanimelist',
            utilisateur_ajout: currentUser
          };

          // Insérer dans la DB
          const stmt = db.prepare(`
            INSERT INTO anime_series (
              mal_id, mal_url, titre, titre_romaji, titre_natif, titre_anglais, titres_alternatifs,
              type, source, nb_episodes, couverture_url, description, statut_diffusion, en_cours_diffusion,
              date_debut, date_fin, duree, annee, saison_diffusion, genres, themes, demographics,
              studios, producteurs, diffuseurs, rating, score, liens_externes, liens_streaming,
              franchise_name, franchise_order, prequel_mal_id, sequel_mal_id, source_import, utilisateur_ajout
            ) VALUES (
              @mal_id, @mal_url, @titre, @titre_romaji, @titre_natif, @titre_anglais, @titres_alternatifs,
              @type, @source, @nb_episodes, @couverture_url, @description, @statut_diffusion, @en_cours_diffusion,
              @date_debut, @date_fin, @duree, @annee, @saison_diffusion, @genres, @themes, @demographics,
              @studios, @producteurs, @diffuseurs, @rating, @score, @liens_externes, @liens_streaming,
              @franchise_name, @franchise_order, @prequel_mal_id, @sequel_mal_id, @source_import, @utilisateur_ajout
            )
          `);
          
          const result = stmt.run(animeData);
          const animeId = result.lastInsertRowid;

          // Créer les épisodes vus depuis le XML
          if (watchedEpisodes > 0) {
            const insertEpisodeVu = db.prepare(`
              INSERT INTO anime_episodes_vus (anime_id, utilisateur, episode_numero, vu, date_visionnage)
              VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
            `);
            
            for (let ep = 1; ep <= watchedEpisodes; ep++) {
              insertEpisodeVu.run(animeId, currentUser, ep);
            }
          }

          // Définir le statut de visionnage
          if (myStatus) {
            const statutMap = {
              'Watching': 'En cours',
              'Completed': 'Terminé',
              'On-Hold': 'En attente',
              'Dropped': 'Abandonné',
              'Plan to Watch': 'En attente'
            };
            
            const statut = statutMap[myStatus] || 'En cours';
            db.prepare(`
              INSERT INTO anime_statut_utilisateur (anime_id, utilisateur, statut_visionnage)
              VALUES (?, ?, ?)
            `).run(animeId, currentUser, statut);
          }

          imported++;
          console.log(`✅ ${titre} importé avec succès`);

        } catch (error) {
          console.error(`❌ Erreur pour ${titre}:`, error.message);
          errors++;
        }
      }

      console.log(`\n✅ Import terminé !`);
      console.log(`   📥 Importés : ${imported}`);
      console.log(`   ⏭️ Ignorés : ${skipped}`);
      console.log(`   ❌ Erreurs : ${errors}`);

      sendProgress({ current: totalAnimes, total: totalAnimes, currentAnime: 'Terminé !' });

      return {
        success: true,
        imported,
        updated,
        skipped,
        errors
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'import XML:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * SIMPLIFIÉ : Récupérer la liste des animes (maintenant flat, plus de saisons)
   */
  ipcMain.handle('get-anime-series', (event, filters = {}) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      let query = `
        SELECT 
          a.*,
          asu.statut_visionnage,
          COALESCE(
            (SELECT COUNT(DISTINCT episode_numero) 
             FROM anime_episodes_vus 
             WHERE anime_id = a.id AND utilisateur = ? AND vu = 1),
            0
          ) as episodes_vus,
          at.tag,
          at.is_favorite
        FROM anime_series a
        LEFT JOIN anime_statut_utilisateur asu ON a.id = asu.anime_id AND asu.utilisateur = ?
        LEFT JOIN anime_tags at ON a.id = at.anime_id AND at.user_id = (SELECT id FROM users WHERE name = ?)
        WHERE a.utilisateur_ajout = ?
      `;

      const params = [currentUser, currentUser, currentUser, currentUser];

      // Filtres
      if (filters.statut) {
        query += ` AND asu.statut_visionnage = ?`;
        params.push(filters.statut);
      }

      if (filters.type) {
        query += ` AND a.type = ?`;
        params.push(filters.type);
      }

      if (filters.franchise) {
        query += ` AND a.franchise_name = ?`;
        params.push(filters.franchise);
      }

      if (filters.search) {
        query += ` AND (a.titre LIKE ? OR a.titre_anglais LIKE ? OR a.titre_romaji LIKE ?)`;
        const searchPattern = `%${filters.search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (filters.tag) {
        query += ` AND at.tag = ?`;
        params.push(filters.tag);
      }

      if (filters.favoris) {
        query += ` AND at.is_favorite = 1`;
      }

      // Tri
      if (filters.sortBy === 'titre') {
      query += ` ORDER BY a.titre ASC`;
      } else if (filters.sortBy === 'annee') {
        query += ` ORDER BY a.annee DESC, a.franchise_order ASC`;
      } else {
        query += ` ORDER BY a.created_at DESC`;
      }

      const animes = db.prepare(query).all(...params);

      return { success: true, animes };
    } catch (error) {
      console.error('❌ Erreur get-anime-series:', error);
      return { success: false, error: error.message, animes: [] };
    }
  });

  /**
   * SIMPLIFIÉ : Récupérer les détails d'un anime (plus de saisons, direct)
   */
  ipcMain.handle('get-anime-detail', (event, animeId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      const anime = db.prepare(`
        SELECT 
          a.*,
          asu.statut_visionnage,
          COALESCE(
            (SELECT COUNT(DISTINCT episode_numero) 
             FROM anime_episodes_vus 
             WHERE anime_id = a.id AND utilisateur = ? AND vu = 1),
            0
          ) as episodes_vus,
          at.tag,
          at.is_favorite
        FROM anime_series a
        LEFT JOIN anime_statut_utilisateur asu ON a.id = asu.anime_id AND asu.utilisateur = ?
        LEFT JOIN anime_tags at ON a.id = at.anime_id AND at.user_id = (SELECT id FROM users WHERE name = ?)
        WHERE a.id = ?
      `).get(currentUser, currentUser, currentUser, animeId);

      if (!anime) {
        return { success: false, error: 'Anime non trouvé' };
      }

      // Récupérer les épisodes vus
      const episodes = [];
      for (let i = 1; i <= anime.nb_episodes; i++) {
        const vu = db.prepare(`
          SELECT vu, date_visionnage 
          FROM anime_episodes_vus
          WHERE anime_id = ? AND utilisateur = ? AND episode_numero = ?
        `).get(animeId, currentUser, i);

        episodes.push({
          numero: i,
          vu: vu?.vu || 0,
          date_visionnage: vu?.date_visionnage || null
        });
      }

      // Récupérer les animes de la même franchise
      const franchiseAnimes = anime.franchise_name ? db.prepare(`
        SELECT id, titre, type, nb_episodes, annee, franchise_order, couverture_url
        FROM anime_series
        WHERE franchise_name = ? AND id != ?
        ORDER BY franchise_order ASC, annee ASC
      `).all(anime.franchise_name, animeId) : [];

      return {
        success: true,
        anime,
        episodes,
        franchiseAnimes
      };
    } catch (error) {
      console.error('❌ Erreur get-anime-detail:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * SIMPLIFIÉ : Toggle un épisode vu
   */
  ipcMain.handle('toggle-episode-vu', (event, animeId, episodeNumero, vu) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');

      if (vu) {
      db.prepare(`
          INSERT OR REPLACE INTO anime_episodes_vus (anime_id, utilisateur, episode_numero, vu, date_visionnage)
          VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        `).run(animeId, currentUser, episodeNumero);
      } else {
          db.prepare(`
          DELETE FROM anime_episodes_vus
          WHERE anime_id = ? AND utilisateur = ? AND episode_numero = ?
        `).run(animeId, currentUser, episodeNumero);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur toggle-episode-vu:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * SIMPLIFIÉ : Marquer tous les épisodes comme vus
   */
  ipcMain.handle('marquer-anime-complet', (event, animeId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');

      const anime = db.prepare('SELECT nb_episodes FROM anime_series WHERE id = ?').get(animeId);
      if (!anime) {
        return { success: false, error: 'Anime non trouvé' };
      }

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO anime_episodes_vus (anime_id, utilisateur, episode_numero, vu, date_visionnage)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
      `);

      for (let ep = 1; ep <= anime.nb_episodes; ep++) {
        stmt.run(animeId, currentUser, ep);
      }

      // Mettre à jour le statut
        db.prepare(`
        INSERT OR REPLACE INTO anime_statut_utilisateur (anime_id, utilisateur, statut_visionnage)
        VALUES (?, ?, 'Terminé')
      `).run(animeId, currentUser);

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur marquer-anime-complet:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * SIMPLIFIÉ : Définir le statut de visionnage
   */
  ipcMain.handle('set-anime-statut-visionnage', (event, animeId, statutVisionnage) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');

      db.prepare(`
        INSERT OR REPLACE INTO anime_statut_utilisateur (anime_id, utilisateur, statut_visionnage, date_modification)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(animeId, currentUser, statutVisionnage);

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur set-anime-statut-visionnage:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Supprimer un anime
   */
  ipcMain.handle('delete-anime', (event, animeId) => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM anime_series WHERE id = ?').run(animeId);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur delete-anime:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Mettre à jour un anime
   */
  ipcMain.handle('update-anime', async (event, id, animeData) => {
    try {
      const db = getDb();
      
      const stmt = db.prepare(`
        UPDATE anime_series 
        SET titre = ?, description = ?, genres = ?, studios = ?, annee = ?,
            rating = ?, type = ?, nb_episodes = ?, couverture_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(
        animeData.titre,
        animeData.description,
        animeData.genres,
        animeData.studios,
        animeData.annee,
        animeData.rating,
        animeData.type,
        animeData.nb_episodes,
        animeData.couverture_url || null,
        id
      );

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur update-anime:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Gérer les tags et favoris
   */
  ipcMain.handle('set-anime-tag', async (event, animeId, userId, tag) => {
    try {
      const db = getDb();
            db.prepare(`
        INSERT OR REPLACE INTO anime_tags (anime_id, user_id, tag, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(animeId, userId, tag);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('toggle-anime-favorite', async (event, animeId, userId) => {
    try {
      const db = getDb();
      const current = db.prepare('SELECT is_favorite FROM anime_tags WHERE anime_id = ? AND user_id = ?').get(animeId, userId);
      const newValue = current?.is_favorite ? 0 : 1;
      
            db.prepare(`
        INSERT OR REPLACE INTO anime_tags (anime_id, user_id, is_favorite, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(animeId, userId, newValue);
      
      return { success: true, is_favorite: newValue };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-anime-tag', async (event, animeId, userId) => {
    try {
      const db = getDb();
      const result = db.prepare('SELECT tag, is_favorite FROM anime_tags WHERE anime_id = ? AND user_id = ?').get(animeId, userId);
      return { success: true, tag: result?.tag || null, is_favorite: result?.is_favorite || 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('remove-anime-tag', async (event, animeId, userId) => {
    try {
      const db = getDb();
      db.prepare('UPDATE anime_tags SET tag = NULL WHERE anime_id = ? AND user_id = ?').run(animeId, userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAnimeHandlers };

