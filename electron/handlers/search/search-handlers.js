/**
 * Enregistre tous les handlers IPC pour la recherche (manga et anime)
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Shell} shell - Module shell d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerSearchHandlers(ipcMain, shell, getDb, store) {
  
  // Recherche globale dans la base de données locale
  ipcMain.handle('global-search', async (event, query, currentUser) => {
    try {
      const db = getDb();
      if (!db) {
        console.error('❌ Base de données non initialisée');
        return [];
      }

      if (!currentUser) {
        console.log('⚠️ Aucun utilisateur connecté');
        return [];
      }

      // Convertir le nom d'utilisateur en ID
      const { getUserIdByName } = require('../common-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        console.log('⚠️ Utilisateur non trouvé:', currentUser);
        return [];
      }

      const allResults = [];
      const searchQuery = `%${query}%`;
      
      // Détecter si la recherche est un ID numérique
      const isNumericId = /^\d+$/.test(query.trim());
      const numericId = isNumericId ? parseInt(query.trim()) : null;

      // Rechercher dans les séries (mangas)
      // Note: Les séries sont globales, on filtre juste les masquées
      let mangas = [];
      
      if (numericId) {
        // Recherche par MAL ID pour les mangas
        mangas = db.prepare(`
          SELECT s.id, s.titre, s.auteurs, s.type_volume, s.couverture_url
          FROM manga_series s
          LEFT JOIN manga_user_data mud ON s.id = mud.serie_id AND mud.user_id = ?
          WHERE (mud.is_hidden IS NULL OR mud.is_hidden = 0)
          AND s.mal_id = ?
          LIMIT 10
        `).all(userId, numericId);
      }
      
      // Si pas de résultat par ID ou recherche textuelle, chercher par titre
      if (mangas.length === 0) {
        mangas = db.prepare(`
          SELECT s.id, s.titre, s.auteurs, s.type_volume, s.couverture_url
          FROM manga_series s
          LEFT JOIN manga_user_data mud ON s.id = mud.serie_id AND mud.user_id = ?
          WHERE (mud.is_hidden IS NULL OR mud.is_hidden = 0)
          AND (
            s.titre LIKE ? 
            OR s.titre_romaji LIKE ?
            OR s.titre_natif LIKE ?
            OR s.titre_anglais LIKE ?
            OR s.titres_alternatifs LIKE ?
            OR s.titre_alternatif LIKE ?
            OR s.description LIKE ? 
            OR s.auteurs LIKE ?
          )
          LIMIT 10
        `).all(userId, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery);
      }

      mangas.forEach(manga => {
        allResults.push({
          id: manga.id,
          type: 'manga',
          title: manga.titre,
          subtitle: manga.auteurs || manga.type_volume,
          progress: '',
          coverUrl: manga.couverture_url
        });
      });

      // Rechercher dans les animes
      let animes = [];
      
      if (numericId) {
        // Recherche par MAL ID pour les animes
        animes = db.prepare(`
          SELECT 
            a.id, 
            a.titre, 
            a.type, 
            a.nb_episodes, 
            a.couverture_url,
              COALESCE(aud.episodes_vus, 0) as episodes_vus
          FROM anime_series a
          LEFT JOIN anime_user_data aud ON a.id = aud.anime_id AND aud.user_id = ?
          WHERE a.user_id_ajout = ?
          AND a.mal_id = ?
          LIMIT 10
        `).all(userId, userId, numericId);
      }
      
      // Si pas de résultat par ID ou recherche textuelle, chercher par titre
      if (animes.length === 0) {
        animes = db.prepare(`
          SELECT 
            a.id, 
            a.titre, 
            a.type, 
            a.nb_episodes, 
            a.couverture_url,
              COALESCE(aud.episodes_vus, 0) as episodes_vus
          FROM anime_series a
          LEFT JOIN anime_user_data aud ON a.id = aud.anime_id AND aud.user_id = ?
          WHERE a.user_id_ajout = ?
          AND (
            a.titre LIKE ? 
            OR a.titre_romaji LIKE ?
            OR a.titre_natif LIKE ?
            OR a.titre_anglais LIKE ?
            OR a.titres_alternatifs LIKE ?
            OR a.description LIKE ?
          )
          LIMIT 10
        `).all(userId, userId, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery);
      }

      animes.forEach(anime => {
        allResults.push({
          id: anime.id,
          type: 'anime',
          title: anime.titre,
          subtitle: anime.type || 'TV',
          progress: anime.episodes_vus && anime.nb_episodes 
            ? `${anime.episodes_vus}/${anime.nb_episodes} épisodes`
            : '',
          coverUrl: anime.couverture_url
        });
      });

      // Rechercher dans les JEUX ADULTES
      let adulteGames = [];
      
      if (numericId) {
        // Recherche par F95 thread ID ou LewdCorner ID pour les JEUX ADULTES
        adulteGames = db.prepare(`
          SELECT DISTINCT g.id, g.titre, g.game_engine as moteur, g.game_version as version, g.couverture_url, g.tags
          FROM adulte_game_games g
          INNER JOIN adulte_game_user_data ud ON g.id = ud.game_id
          WHERE ud.user_id = ?
          AND (g.f95_thread_id = ? OR g.Lewdcorner_thread_id = ?)
          LIMIT 10
        `).all(userId, numericId, numericId);
      }
      
      // Si pas de résultat par ID ou recherche textuelle, chercher par titre/tags
      if (adulteGames.length === 0) {
        adulteGames = db.prepare(`
          SELECT DISTINCT g.id, g.titre, g.game_engine as moteur, g.game_version as version, g.couverture_url, g.tags
          FROM adulte_game_games g
          INNER JOIN adulte_game_user_data ud ON g.id = ud.game_id
          WHERE ud.user_id = ?
          AND (g.titre LIKE ? OR g.tags LIKE ?)
          LIMIT 10
        `).all(userId, searchQuery, searchQuery);
      }

      adulteGames.forEach(game => {
        allResults.push({
          id: game.id,
          type: 'adulte-game',
          title: game.titre,
          subtitle: game.moteur || 'Jeu adulte',
          progress: game.version || '',
          coverUrl: game.couverture_url
        });
      });

      console.log(`🔍 Recherche globale: "${query}" => ${allResults.length} résultats (${mangas.length} mangas, ${animes.length} animes, ${adulteGames.length} jeux adultes)`);
      return allResults;
    } catch (error) {
      console.error('❌ Erreur global-search:', error);
      return [];
    }
  });
  
  // Fonction pour normaliser un titre pour la déduplication
  function normalizeTitleForDedup(title) {
    if (!title) return '';
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Enlever ponctuation
      .replace(/\s+/g, ' ') // Normaliser espaces
      .replace(/^(le|la|les|l'|the|a|an)\s+/i, ''); // Enlever articles
  }

  // Recherche de mangas (multi-sources avec déduplication)
  // Ordre de priorité : MAL → AniList
  ipcMain.handle('search-manga', async (event, titre) => {
    try {
      const allResults = [];
      const seenTitles = new Set(); // Pour éviter les doublons

      // 1. MyAnimeList (via Jikan) - PRIORITÉ 1
      // Utiliser la fonction MyAnimeList.searchManga qui supporte maintenant la recherche par mal_id
      const MyAnimeList = require('../../apis/myanimelist');
      try {
        const malResults = await MyAnimeList.searchManga(titre);
        if (malResults && malResults.length > 0) {
          for (const manga of malResults) {
            const malTitle = manga.title || manga.titleEnglish;
            const normalizedTitle = normalizeTitleForDedup(malTitle);

            if (!seenTitles.has(normalizedTitle)) {
              seenTitles.add(normalizedTitle);
              allResults.push({
                source: 'MyAnimeList',
                id: manga.id,
                titre: malTitle,
                description: manga.description || '',
                couverture: manga.coverUrl,
                statut_publication: manga.status,
                annee_publication: manga.year,
                genres: manga.genres || '',
                nb_chapitres: manga.chapters,
                mal_id: parseInt(manga.id, 10)
              });
            }
          }
        }
      } catch (error) {
        console.error('Erreur MyAnimeList (Jikan):', error);
      }

      // 2. AniList - si MAL n'a pas de résultats
      if (allResults.length === 0) {
        try {
          const anilistQuery = `
            query ($search: String) {
              Page(page: 1, perPage: 5) {
                media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
                  id title { romaji english native } description coverImage { large } status startDate { year } genres chapters averageScore
                }
              }
            }
          `;
          const anilistResponse = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: anilistQuery, variables: { search: titre } })
          });

          if (anilistResponse.ok) {
            const anilistData = await anilistResponse.json();
            if (anilistData.data?.Page?.media && anilistData.data.Page.media.length > 0) {
              for (const manga of anilistData.data.Page.media) {
                const anilistTitle = manga.title.romaji || manga.title.english || manga.title.native;
                const normalizedTitle = normalizeTitleForDedup(anilistTitle);

                if (!seenTitles.has(normalizedTitle)) {
                  seenTitles.add(normalizedTitle);
                  allResults.push({
                    source: 'AniList',
                    id: manga.id.toString(),
                    titre: anilistTitle,
                    description: manga.description || '',
                    couverture: manga.coverImage?.large,
                    statut_publication: manga.status,
                    annee_publication: manga.startDate?.year,
                    genres: manga.genres?.join(', '),
                    nb_chapitres: manga.chapters,
                    rating: manga.averageScore ? `${manga.averageScore}/100` : null
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('Erreur AniList:', error);
        }
      }



      return allResults;
    } catch (error) {
      console.error('Erreur search-manga:', error);
      return [];
    }
  });

  // Recherche d'animes (MAL, AniList)
  ipcMain.handle('search-anime', async (event, titre) => {
    try {

      
      const allResults = [];

      const seenTitles = new Set(); // Pour éviter les doublons

      // 1. MyAnimeList (via Jikan)
      // Utiliser la fonction MyAnimeList.searchAnime qui supporte maintenant la recherche par mal_id
      const MyAnimeList = require('../../apis/myanimelist');
      try {
        const malResults = await MyAnimeList.searchAnime(titre);
        if (malResults && malResults.length > 0) {
          for (const anime of malResults) {
            const malTitle = anime.title || anime.titleEnglish;
            const normalizedTitle = normalizeTitleForDedup(malTitle);

            if (!seenTitles.has(normalizedTitle)) {
              seenTitles.add(normalizedTitle);
              allResults.push({
                source: 'MyAnimeList',
                id: anime.id,
                titre: malTitle,
                titre_romaji: anime.titleJapanese,
                titre_natif: anime.titleJapanese,
                description: anime.description || '',
                couverture: anime.coverUrl,
                statut: anime.status,
                annee_debut: anime.startYear,
                annee_fin: anime.endYear,
                genres: anime.genres || '',
                episodes: anime.episodes,
                duree_episode: anime.duration,
                format: anime.format,
                rating: anime.score ? `${anime.score}/10` : null
              });
            }
          }
        }
      } catch (error) {
        console.error('Erreur MyAnimeList (Jikan):', error);
      }

      // 2. AniList - si MAL n'a pas de résultats
      if (allResults.length === 0) {
        try {
          const anilistQuery = `
            query ($search: String) {
              Page(page: 1, perPage: 10) {
                media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                  id title { romaji english native } description coverImage { large } status startDate { year } endDate { year } genres episodes duration format season seasonYear studios { nodes { name } } averageScore
                }
              }
            }
          `;
          const anilistResponse = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: anilistQuery, variables: { search: titre } })
          });

          if (anilistResponse.ok) {
            const anilistData = await anilistResponse.json();
            if (anilistData.data?.Page?.media && anilistData.data.Page.media.length > 0) {
              for (const anime of anilistData.data.Page.media) {
                const anilistTitle = anime.title.romaji || anime.title.english || anime.title.native;
                const normalizedTitle = normalizeTitleForDedup(anilistTitle);

                if (!seenTitles.has(normalizedTitle)) {
                  seenTitles.add(normalizedTitle);
                  allResults.push({
                    source: 'AniList',
                    id: anime.id.toString(),
                    titre: anilistTitle,
                    titre_romaji: anime.title.romaji,
                    titre_natif: anime.title.native,
                    description: anime.description || '',
                    couverture: anime.coverImage?.large,
                    statut: anime.status,
                    annee_debut: anime.startDate?.year,
                    annee_fin: anime.endDate?.year,
                    genres: anime.genres?.join(', '),
                    episodes: anime.episodes,
                    duree_episode: anime.duration,
                    format: anime.format,
                    saison: anime.season,
                    annee_saison: anime.seasonYear,
                    studios: anime.studios?.nodes?.map(s => s.name).join(', '),
                    rating: anime.averageScore ? `${anime.averageScore}/100` : null
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('Erreur AniList:', error);
        }
      }



      return allResults;
    } catch (error) {
      console.error('Erreur search-anime:', error);
      return [];
    }
  });

  // Ouvrir une URL dans le navigateur externe
  ipcMain.handle('open-external', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Erreur open-external:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerSearchHandlers };
