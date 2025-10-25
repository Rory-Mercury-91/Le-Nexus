/**
 * Service de synchronisation avec MyAnimeList
 * Récupère et synchronise les listes manga et anime de l'utilisateur
 */

const fetch = require('node-fetch');
const { refreshAccessToken } = require('../apis/myanimelist-oauth');
const Store = require('electron-store');

/**
 * Récupère la liste complète des mangas de l'utilisateur depuis MAL
 * @param {string} accessToken - Access token MAL
 * @param {number} limit - Nombre d'entrées par page (max 1000)
 * @returns {Promise<Array>} Liste des mangas
 */
async function getUserMangaList(accessToken, limit = 1000) {
  const allMangas = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const url = new URL('https://api.myanimelist.net/v2/users/@me/mangalist');
    // Récupérer tous les détails nécessaires pour créer des entrées complètes
    url.searchParams.set('fields', 'list_status,num_chapters,num_volumes,synopsis,main_picture,genres,themes,demographics,authors{first_name,last_name},status,start_date,end_date,media_type,alternative_titles,serialization,related_manga,related_anime,mean,rank,popularity');
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());
    
    console.log(`📡 Récupération mangas MAL (offset: ${offset})...`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch manga list: ${response.status}`);
    }
    
    const data = await response.json();
    allMangas.push(...data.data);
    
    // Vérifier s'il y a plus de résultats
    if (data.paging && data.paging.next) {
      offset += limit;
    } else {
      hasMore = false;
    }
    
    // Rate limiting: pause de 500ms entre les requêtes
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ ${allMangas.length} mangas récupérés depuis MAL`);
  return allMangas;
}

/**
 * Récupère la liste complète des animes de l'utilisateur depuis MAL
 * @param {string} accessToken - Access token MAL
 * @param {number} limit - Nombre d'entrées par page (max 1000)
 * @returns {Promise<Array>} Liste des animes
 */
async function getUserAnimeList(accessToken, limit = 1000) {
  const allAnimes = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const url = new URL('https://api.myanimelist.net/v2/users/@me/animelist');
    // Récupérer plus de détails pour pouvoir créer des entrées complètes
    url.searchParams.set('fields', 'list_status,num_episodes,synopsis,main_picture,genres,status,start_date,end_date,media_type,studios');
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());
    
    console.log(`📡 Récupération animes MAL (offset: ${offset})...`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch anime list: ${response.status}`);
    }
    
    const data = await response.json();
    allAnimes.push(...data.data);
    
    // Vérifier s'il y a plus de résultats
    if (data.paging && data.paging.next) {
      offset += limit;
    } else {
      hasMore = false;
    }
    
    // Rate limiting: pause de 500ms entre les requêtes
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ ${allAnimes.length} animes récupérés depuis MAL`);
  return allAnimes;
}

/**
 * Synchronise les chapitres lus pour les mangas (crée les entrées manquantes)
 * @param {Object} db - Instance de la base de données
 * @param {Array} malMangas - Liste des mangas depuis MAL
 * @param {string} currentUser - Nom de l'utilisateur actuel
 * @param {Function} onProgress - Callback pour notifier la progression
 * @returns {Promise<Object>} Statistiques de synchronisation
 */
async function syncMangaProgress(db, malMangas, currentUser, onProgress = null) {
  const stats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };
  
  const total = malMangas.length;
  let processed = 0;
  
  for (const malEntry of malMangas) {
    processed++;
    
    // Notifier la progression
    if (onProgress) {
      onProgress({
        type: 'manga',
        current: processed,
        total: total,
        item: malEntry.node.title
      });
    }
    try {
      const malId = malEntry.node.id;
      const manga = malEntry.node;
      const listStatus = malEntry.list_status;
      
      const chaptersRead = listStatus?.num_chapters_read || 0;
      const volumesRead = listStatus?.num_volumes_read || 0;
      const malStatus = listStatus?.status; // reading, completed, on_hold, dropped, plan_to_read
      const score = listStatus?.score || 0;
      const startDate = listStatus?.start_date || null;
      const finishDate = listStatus?.finish_date || null;
      const userTags = listStatus?.tags || [];
      
      // Chercher la série dans la DB par MAL ID
      const serie = db.prepare(`
        SELECT id, titre, chapitres_lus, volumes_lus, mal_id, source_donnees
        FROM series
        WHERE mal_id = ?
        LIMIT 1
      `).get(malId);
      
      if (!serie) {
        // Créer automatiquement la série depuis les données MAL
        const titre = manga.title;
        const titre_romaji = manga.title_synonyms?.find(t => /[\u3040-\u309F\u30A0-\u30FF]/.test(t)) || null;
        const titre_anglais = manga.alternative_titles?.en || null;
        const titres_alternatifs = JSON.stringify(manga.alternative_titles?.synonyms || []);
        const synopsis = manga.synopsis || '';
        const couverture_url = manga.main_picture?.large || manga.main_picture?.medium || null;
        
        const genres = manga.genres ? manga.genres.map(g => g.name).join(', ') : null;
        const themes = manga.themes ? manga.themes.map(t => t.name).join(', ') : null;
        const demographics = manga.demographics ? manga.demographics.map(d => d.name).join(', ') : null;
        const auteurs = manga.authors ? manga.authors.map(a => `${a.node.first_name} ${a.node.last_name}`.trim()).join(', ') : null;
        
        const nb_chapitres = manga.num_chapters || null;
        const nb_volumes = manga.num_volumes || null;
        const statut_publication = manga.status === 'finished' ? 'Terminée' : 
                                   manga.status === 'currently_publishing' ? 'En cours' : 
                                   manga.status === 'on_hiatus' ? 'En pause' : null;
        const date_debut = manga.start_date || null;
        const date_fin = manga.end_date || null;
        const annee_publication = date_debut ? new Date(date_debut).getFullYear() : null;
        const media_type = manga.media_type || 'manga'; // manga, novel, one_shot, doujinshi, manhwa, manhua
        
        // Relations (prequels, sequels, etc.)
        const relations = manga.related_manga || manga.related_anime ? 
          JSON.stringify({
            manga: manga.related_manga || [],
            anime: manga.related_anime || []
          }) : null;
        
        // Convertir le statut MAL en statut local (pour la série, pas l'utilisateur)
        let statut = 'En cours';
        if (malStatus === 'completed') statut = 'Terminée';
        if (malStatus === 'dropped') statut = 'Abandonnée';
        
        // Statut de lecture utilisateur
        const statut_lecture_map = {
          'reading': 'En cours',
          'completed': 'Terminée',
          'on_hold': 'En pause',
          'dropped': 'Abandonnée',
          'plan_to_read': 'À lire'
        };
        const statut_lecture = statut_lecture_map[malStatus] || 'En cours';
        
        const insertResult = db.prepare(`
          INSERT INTO series (
            mal_id, titre, titre_romaji, titre_anglais, titres_alternatifs,
            statut, type_volume, type_contenu, couverture_url, description,
            statut_publication, annee_publication, date_debut, date_fin,
            genres, themes, demographie, media_type, auteurs,
            nb_chapitres, nb_volumes, chapitres_lus, volumes_lus,
            statut_lecture, score_utilisateur, date_debut_lecture, date_fin_lecture,
            tags, relations, source_donnees,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          malId,
          titre,
          titre_romaji,
          titre_anglais,
          titres_alternatifs,
          statut,
          'Numérique', // Type par défaut pour les mangas MAL
          'chapitre',  // Import MAL = suivi par chapitres
          couverture_url,
          synopsis,
          statut_publication,
          annee_publication,
          date_debut,
          date_fin,
          genres,
          themes,
          demographics,
          media_type,
          auteurs,
          nb_chapitres,
          nb_volumes,
          chaptersRead,
          volumesRead,
          statut_lecture,
          score > 0 ? score : null,
          startDate,
          finishDate,
          userTags.length > 0 ? JSON.stringify(userTags) : null,
          relations,
          'mal'
        );
        
        stats.created++;
        console.log(`➕ Manga créé: "${titre}" (${chaptersRead}/${nb_chapitres} ch., ${volumesRead}/${nb_volumes} vol.)`);
        continue;
      }
      
      // Série existe : mettre à jour la progression et les infos utilisateur si nécessaire
      const currentChapters = serie.chapitres_lus || 0;
      const currentVolumes = serie.volumes_lus || 0;
      
      if (chaptersRead > currentChapters || volumesRead > currentVolumes) {
        // Convertir le statut MAL en statut de lecture
        const statut_lecture_map = {
          'reading': 'En cours',
          'completed': 'Terminée',
          'on_hold': 'En pause',
          'dropped': 'Abandonnée',
          'plan_to_read': 'À lire'
        };
        const statut_lecture = statut_lecture_map[malStatus] || null;
        
        db.prepare(`
          UPDATE series
          SET chapitres_lus = ?,
              volumes_lus = ?,
              statut_lecture = ?,
              score_utilisateur = ?,
              date_debut_lecture = ?,
              date_fin_lecture = ?,
              tags = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(
          chaptersRead,
          volumesRead,
          statut_lecture,
          score > 0 ? score : null,
          startDate,
          finishDate,
          userTags.length > 0 ? JSON.stringify(userTags) : null,
          serie.id
        );
        
        stats.updated++;
        console.log(`✅ Manga "${serie.titre}": ${currentChapters}→${chaptersRead} ch., ${currentVolumes}→${volumesRead} vol.`);
      } else {
        stats.skipped++;
      }
      
    } catch (error) {
      stats.errors.push({
        malId: malEntry.node.id,
        titre: malEntry.node.title,
        error: error.message
      });
      console.error(`❌ Erreur sync manga ${malEntry.node.title}:`, error.message);
    }
  }
  
  return stats;
}

/**
 * Synchronise les épisodes vus pour les animes (crée les entrées manquantes)
 * @param {Object} db - Instance de la base de données
 * @param {Array} malAnimes - Liste des animes depuis MAL
 * @param {string} currentUser - Nom de l'utilisateur actuel
 * @param {Function} onProgress - Callback pour notifier la progression
 * @returns {Promise<Object>} Statistiques de synchronisation
 */
async function syncAnimeProgress(db, malAnimes, currentUser, onProgress = null) {
  const stats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };
  
  const total = malAnimes.length;
  let processed = 0;
  
  for (const malEntry of malAnimes) {
    processed++;
    
    // Notifier la progression
    if (onProgress) {
      onProgress({
        type: 'anime',
        current: processed,
        total: total,
        item: malEntry.node.title
      });
    }
    try {
      const malId = malEntry.node.id;
      const episodesWatched = malEntry.list_status?.num_episodes_watched || 0;
      const malStatus = malEntry.list_status?.status; // watching, completed, on_hold, dropped, plan_to_watch
      const score = malEntry.list_status?.score || 0;
      
      // Chercher l'anime dans la DB par MAL ID
      let anime = db.prepare(`
        SELECT id, titre
        FROM anime_series
        WHERE mal_id = ?
      `).get(malId);
      
      if (!anime) {
        // Créer automatiquement l'anime depuis les données MAL
        const animeData = malEntry.node;
        const titre = animeData.title;
        const description = animeData.synopsis || null;
        const couverture_url = animeData.main_picture?.large || animeData.main_picture?.medium || null;
        const genres = animeData.genres ? animeData.genres.map(g => g.name).join(', ') : null;
        const nb_episodes = animeData.num_episodes || null;
        const type = animeData.media_type || 'TV'; // TV, Movie, OVA, ONA, Special, Music
        const mal_url = `https://myanimelist.net/anime/${malId}`;
        const studios = animeData.studios ? animeData.studios.map(s => s.name).join(', ') : null;
        const statut_diffusion = animeData.status === 'finished_airing' ? 'Terminé' :
                                 animeData.status === 'currently_airing' ? 'En cours' :
                                 animeData.status === 'not_yet_aired' ? 'Pas encore diffusé' : null;
        const annee_diffusion = animeData.start_date ? new Date(animeData.start_date).getFullYear() : null;
        
        const insertResult = db.prepare(`
          INSERT INTO anime_series (
            mal_id, titre, type, nb_episodes, description, couverture_url,
            genres, mal_url, studios, statut_diffusion, annee, utilisateur_ajout
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          malId,
          titre,
          type,
          nb_episodes,
          description,
          couverture_url,
          genres,
          mal_url,
          studios,
          statut_diffusion,
          annee_diffusion,
          currentUser
        );
        
        anime = { id: insertResult.lastInsertRowid, titre };
        stats.created++;
        console.log(`➕ Anime créé: "${titre}" (${episodesWatched} épisodes vus)`);
      }
      
      // Compter les épisodes actuellement marqués comme vus
      const currentEpisodes = db.prepare(`
        SELECT COUNT(*) as count
        FROM anime_episodes_vus
        WHERE anime_id = ? AND utilisateur = ? AND vu = 1
      `).get(anime.id, currentUser)?.count || 0;
      
      if (episodesWatched > currentEpisodes) {
        // Marquer les épisodes comme vus (de 1 à episodesWatched)
        const stmt = db.prepare(`
          INSERT INTO anime_episodes_vus (anime_id, utilisateur, episode_numero, vu, date_visionnage)
          VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
          ON CONFLICT(anime_id, utilisateur, episode_numero)
          DO UPDATE SET vu = 1, date_visionnage = CURRENT_TIMESTAMP
        `);
        
        for (let ep = 1; ep <= episodesWatched; ep++) {
          stmt.run(anime.id, currentUser, ep);
        }
        
        stats.updated++;
        console.log(`✅ Anime "${anime.titre}": ${currentEpisodes} → ${episodesWatched} épisodes`);
      } else {
        stats.skipped++;
      }
      
    } catch (error) {
      stats.errors.push({
        malId: malEntry.node.id,
        titre: malEntry.node.title,
        error: error.message
      });
      console.error(`❌ Erreur sync anime ${malEntry.node.title}:`, error.message);
    }
  }
  
  return stats;
}

/**
 * Synchronisation complète MAL → App
 * @param {Object} db - Instance de la base de données
 * @param {Object} store - Electron store (pour les tokens)
 * @param {string} currentUser - Nom de l'utilisateur actuel
 * @param {Function} onProgress - Callback pour notifier la progression
 * @returns {Promise<Object>} Résultat de la synchronisation
 */
async function performFullSync(db, store, currentUser, onProgress = null) {
  console.log('🔄 Début de la synchronisation MAL...');
  const startTime = Date.now();
  
  try {
    // Récupérer les tokens
    let accessToken = store.get('mal_access_token');
    const refreshToken = store.get('mal_refresh_token');
    const expiresAt = store.get('mal_token_expires_at');
    
    if (!refreshToken) {
      throw new Error('Aucun refresh token MAL trouvé. Veuillez vous reconnecter.');
    }
    
    // Rafraîchir l'access token si expiré
    if (!accessToken || Date.now() >= expiresAt - 60000) {
      console.log('🔄 Rafraîchissement du token MAL...');
      const tokens = await refreshAccessToken(refreshToken);
      
      store.set('mal_access_token', tokens.access_token);
      store.set('mal_refresh_token', tokens.refresh_token);
      store.set('mal_token_expires_at', tokens.expires_at);
      
      accessToken = tokens.access_token;
    }
    
    // Récupérer les listes
    const [malMangas, malAnimes] = await Promise.all([
      getUserMangaList(accessToken),
      getUserAnimeList(accessToken)
    ]);
    
    // Synchroniser (séquentiellement pour avoir des stats de progression propres)
    const mangaStats = await syncMangaProgress(db, malMangas, currentUser, onProgress);
    const animeStats = await syncAnimeProgress(db, malAnimes, currentUser, onProgress);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const result = {
      success: true,
      duration,
      timestamp: new Date().toISOString(),
      manga: mangaStats,
      anime: animeStats,
      total: {
        created: (mangaStats.created || 0) + (animeStats.created || 0),
        updated: mangaStats.updated + animeStats.updated,
        skipped: mangaStats.skipped + animeStats.skipped,
        errors: [...mangaStats.errors, ...animeStats.errors]
      }
    };
    
    // Sauvegarder la dernière synchronisation
    store.set('mal_last_sync', result);
    
    console.log(`✅ Synchronisation terminée en ${duration}s`);
    console.log(`   - Mangas créés: ${mangaStats.created || 0} | mis à jour: ${mangaStats.updated}`);
    console.log(`   - Animes créés: ${animeStats.created || 0} | mis à jour: ${animeStats.updated}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur synchronisation MAL:', error);
    
    const result = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    store.set('mal_last_sync', result);
    
    throw error;
  }
}

/**
 * Traduit les synopsis des animes via Groq AI en arrière-plan
 * @param {Object} db - Instance de la base de données
 * @param {Object} store - Instance du store Electron
 * @param {Function} onProgress - Callback pour notifier la progression (optionnel)
 */
async function translateSynopsisInBackground(db, store, onProgress = null) {
  try {
    // Récupérer la clé API Groq depuis les settings
    const settingsStore = new Store({ name: 'settings' });
    const groqApiKey = settingsStore.get('groqApiKey');
    
    if (!groqApiKey) {
      console.log('⚠️ Clé API Groq non configurée, traduction des synopsis ignorée');
      return { translated: 0, skipped: 0, total: 0 };
    }
    
    console.log('🤖 Démarrage de la traduction des synopsis en arrière-plan...');
    
    // Récupérer TOUS les animes avec synopsis en anglais non traduit (pas de LIMIT)
    const animesToTranslate = db.prepare(`
      SELECT id, titre, description
      FROM anime_series
      WHERE description IS NOT NULL 
        AND description != ''
        AND description NOT LIKE '%Synopsis français%'
        AND description NOT LIKE '%traduit automatiquement%'
        AND description NOT LIKE 'https://myanimelist.net/anime/%'
      ORDER BY id DESC
    `).all();
    
    const total = animesToTranslate.length;
    
    if (total === 0) {
      console.log('✅ Aucun synopsis à traduire');
      return { translated: 0, skipped: 0, total: 0 };
    }
    
    console.log(`📝 ${total} synopsis à traduire (durée estimée: ~${Math.ceil(total * 2.1 / 60)} minutes)`);
    
    let translated = 0;
    let skipped = 0;
    const updateStmt = db.prepare('UPDATE anime_series SET description = ? WHERE id = ?');
    
    for (let i = 0; i < animesToTranslate.length; i++) {
      const anime = animesToTranslate[i];
      
      try {
        // Notifier la progression
        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            translated,
            skipped,
            currentAnime: anime.titre
          });
        }
        
        // Respecter le rate limit Groq (30 RPM = 1 toutes les 2 secondes)
        await new Promise(resolve => setTimeout(resolve, 2100));
        
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
                content: 'Tu es un traducteur professionnel spécialisé dans les animes. Traduis le synopsis suivant en français de manière naturelle et fluide. Ne traduis PAS les noms de personnages, de lieux, ou de techniques. Retourne UNIQUEMENT la traduction, sans introduction ni conclusion.'
              },
              {
                role: 'user',
                content: anime.description
              }
            ],
            temperature: 0.3,
            max_tokens: 1000
          })
        });
        
        if (!response.ok) {
          console.warn(`⚠️ Erreur traduction "${anime.titre}": ${response.status}`);
          skipped++;
          continue;
        }
        
        const data = await response.json();
        const translatedSynopsis = data.choices[0]?.message?.content?.trim();
        
        if (translatedSynopsis) {
          // Ajouter une mention de traduction
          const finalSynopsis = `${translatedSynopsis}\n\n(Synopsis français traduit automatiquement)`;
          updateStmt.run(finalSynopsis, anime.id);
          translated++;
          console.log(`✅ Traduit (${translated}/${total}): "${anime.titre}"`);
        } else {
          skipped++;
        }
      } catch (error) {
        console.warn(`⚠️ Erreur traduction "${anime.titre}":`, error.message);
        skipped++;
      }
    }
    
    console.log(`🎉 Traduction terminée: ${translated}/${total} synopsis traduits (${skipped} ignorés)`);
    
    return { translated, skipped, total };
    
  } catch (error) {
    console.error('❌ Erreur traduction synopsis:', error);
    return { translated: 0, skipped: 0, total: 0, error: error.message };
  }
}

module.exports = {
  getUserMangaList,
  getUserAnimeList,
  syncMangaProgress,
  syncAnimeProgress,
  performFullSync,
  translateSynopsisInBackground
};
