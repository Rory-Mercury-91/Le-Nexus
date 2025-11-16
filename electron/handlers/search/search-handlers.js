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
      const { getUserIdByName } = require('./common-helpers');
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
          FROM series s
          WHERE s.id NOT IN (
            SELECT serie_id FROM series_masquees WHERE user_id = ?
          )
          AND s.mal_id = ?
          LIMIT 10
        `).all(userId, numericId);
      }
      
      // Si pas de résultat par ID ou recherche textuelle, chercher par titre
      if (mangas.length === 0) {
        mangas = db.prepare(`
          SELECT s.id, s.titre, s.auteurs, s.type_volume, s.couverture_url
          FROM series s
          WHERE s.id NOT IN (
            SELECT serie_id FROM series_masquees WHERE user_id = ?
          )
          AND (s.titre LIKE ? OR s.description LIKE ? OR s.auteurs LIKE ?)
          LIMIT 10
        `).all(userId, searchQuery, searchQuery, searchQuery);
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
            COALESCE(
              (SELECT COUNT(DISTINCT episode_numero) 
               FROM anime_episodes_vus 
               WHERE anime_id = a.id AND user_id = ? AND vu = 1),
              0
            ) as episodes_vus
          FROM anime_series a
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
            COALESCE(
              (SELECT COUNT(DISTINCT episode_numero) 
               FROM anime_episodes_vus 
               WHERE anime_id = a.id AND user_id = ? AND vu = 1),
              0
            ) as episodes_vus
          FROM anime_series a
          WHERE a.user_id_ajout = ?
          AND (a.titre LIKE ? OR a.description LIKE ?)
          LIMIT 10
        `).all(userId, userId, searchQuery, searchQuery);
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
          SELECT DISTINCT g.id, g.titre, g.moteur, g.version, g.couverture_url, g.tags
          FROM adulte_game_games g
          INNER JOIN adulte_game_proprietaires p ON g.id = p.game_id
          WHERE p.user_id = ?
          AND (g.f95_thread_id = ? OR g.lewdcorner_id = ?)
          LIMIT 10
        `).all(userId, numericId, numericId);
      }
      
      // Si pas de résultat par ID ou recherche textuelle, chercher par titre/tags
      if (adulteGames.length === 0) {
        adulteGames = db.prepare(`
          SELECT DISTINCT g.id, g.titre, g.moteur, g.version, g.couverture_url, g.tags
          FROM adulte_game_games g
          INNER JOIN adulte_game_proprietaires p ON g.id = p.game_id
          WHERE p.user_id = ?
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
  // Ordre de priorité : MAL → MangaDex → AniList → MangaUpdates → Kitsu
  ipcMain.handle('search-manga', async (event, titre) => {
    try {
      const allResults = [];
      const seenTitles = new Set(); // Pour éviter les doublons

      // 1. MyAnimeList (via Jikan) - PRIORITÉ 1
      let malHasResults = false;
      try {
        const malResponse = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(titre)}&limit=5`);
        if (malResponse.ok) {
          const malData = await malResponse.json();
          if (malData.data && malData.data.length > 0) {
            malHasResults = true;
            for (const manga of malData.data) {
              const malTitle = manga.title || manga.title_english;
              const normalizedTitle = normalizeTitleForDedup(malTitle);

              if (!seenTitles.has(normalizedTitle)) {
                seenTitles.add(normalizedTitle);
                allResults.push({
                  source: 'MyAnimeList',
                  id: manga.mal_id.toString(),
                  titre: malTitle,
                  description: manga.synopsis || '',
                  couverture: manga.images?.jpg?.large_image_url,
                  statut_publication: manga.status,
                  annee_publication: manga.published?.from ? new Date(manga.published.from).getFullYear() : null,
                  genres: manga.genres?.map(g => g.name).join(', '),
                  nb_chapitres: manga.chapters,
                  mal_id: manga.mal_id
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Erreur MyAnimeList (Jikan):', error);
      }

      // 2. MangaDex - si MAL n'a pas de résultats
      if (!malHasResults) {
        try {
          const mdResponse = await fetch(`https://api.mangadex.org/manga?title=${encodeURIComponent(titre)}&limit=5&includes[]=cover_art&includes[]=author&includes[]=artist&order[relevance]=desc`);
          if (mdResponse.ok) {
            const mdData = await mdResponse.json();
            if (mdData.data && mdData.data.length > 0) {
              for (const manga of mdData.data) {
                const coverRelationship = manga.relationships.find(r => r.type === 'cover_art');
                let coverUrl = null;
                if (coverRelationship) {
                  const fileName = coverRelationship.attributes?.fileName;
                  if (fileName) {
                    coverUrl = `https://uploads.mangadex.org/covers/${manga.id}/${fileName}`;
                  }
                }

                const frTitle = manga.attributes.title?.fr || manga.attributes.title?.['ja-ro'] || manga.attributes.title?.en || Object.values(manga.attributes.title)[0];
                const normalizedTitle = normalizeTitleForDedup(frTitle);

                if (!seenTitles.has(normalizedTitle)) {
                  seenTitles.add(normalizedTitle);
                  allResults.push({
                    source: 'MangaDex',
                    id: manga.id,
                    titre: frTitle,
                    description: manga.attributes.description?.fr || manga.attributes.description?.en || '',
                    couverture: coverUrl,
                    statut_publication: manga.attributes.status,
                    annee_publication: manga.attributes.year,
                    genres: manga.attributes.tags?.map(t => t.attributes.name?.en || t.attributes.name?.fr).filter(Boolean).join(', '),
                    nb_chapitres: manga.attributes.lastChapter ? parseInt(manga.attributes.lastChapter) : null,
                    langue_originale: manga.attributes.originalLanguage,
                    demographie: manga.attributes.publicationDemographic,
                    rating: manga.attributes.contentRating
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('Erreur MangaDex:', error);
        }
      }

      // 3. AniList - si les sources précédentes n'ont pas de résultats
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

      // 4. MangaUpdates - si les sources précédentes n'ont pas de résultats
      if (allResults.length === 0) {
        try {
          const muResponse = await fetch(`https://api.mangaupdates.com/v1/series/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ search: titre, perpage: 5 })
          });
          if (muResponse.ok) {
            const muData = await muResponse.json();
            if (muData.results && muData.results.length > 0) {
              for (const manga of muData.results) {
                const muTitle = manga.record.title;
                const normalizedTitle = normalizeTitleForDedup(muTitle);

                if (!seenTitles.has(normalizedTitle)) {
                  seenTitles.add(normalizedTitle);
                  allResults.push({
                    source: 'MangaUpdates',
                    id: manga.record.series_id.toString(),
                    titre: muTitle,
                    description: manga.record.description || '',
                    couverture: manga.record.image?.url?.original,
                    statut_publication: manga.record.status,
                    annee_publication: manga.record.year ? parseInt(manga.record.year) : null,
                    genres: manga.record.genres?.map(g => g.genre).join(', ')
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('Erreur MangaUpdates:', error);
        }
      }

      // 5. Kitsu - dernier recours si aucune source précédente n'a de résultats
      if (allResults.length === 0) {
        try {
          const kitsuResponse = await fetch(`https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(titre)}&page[limit]=5`);
          if (kitsuResponse.ok) {
            const kitsuData = await kitsuResponse.json();
            if (kitsuData.data && kitsuData.data.length > 0) {
              for (const manga of kitsuData.data) {
                const kitsuTitle = manga.attributes.titles?.en || manga.attributes.titles?.en_jp || manga.attributes.canonicalTitle;
                const normalizedTitle = normalizeTitleForDedup(kitsuTitle);

                if (!seenTitles.has(normalizedTitle)) {
                  seenTitles.add(normalizedTitle);
                  allResults.push({
                    source: 'Kitsu',
                    id: manga.id,
                    titre: kitsuTitle,
                    description: manga.attributes.synopsis || '',
                    couverture: manga.attributes.posterImage?.large,
                    statut_publication: manga.attributes.status,
                    annee_publication: manga.attributes.startDate ? new Date(manga.attributes.startDate).getFullYear() : null,
                    nb_chapitres: manga.attributes.chapterCount,
                    rating: manga.attributes.averageRating
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('Erreur Kitsu:', error);
        }
      }


      return allResults;
    } catch (error) {
      console.error('Erreur search-manga:', error);
      return [];
    }
  });

  // Recherche d'animes (AniList, MAL, Kitsu)
  ipcMain.handle('search-anime', async (event, titre) => {
    try {

      
      const allResults = [];

      const seenTitles = new Set(); // Pour éviter les doublons

      // 1. MyAnimeList (via Jikan)
      try {
        const malResponse = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(titre)}&limit=10`);
        if (malResponse.ok) {
          const malData = await malResponse.json();
          if (malData.data && malData.data.length > 0) {
            for (const anime of malData.data) {
              const malTitle = anime.title || anime.title_english;
              const normalizedTitle = normalizeTitleForDedup(malTitle);

              if (!seenTitles.has(normalizedTitle)) {
                seenTitles.add(normalizedTitle);
                allResults.push({
                  source: 'MyAnimeList',
                  id: anime.mal_id.toString(),
                  titre: malTitle,
                  titre_romaji: anime.title_japanese,
                  titre_natif: anime.title_japanese,
                  description: anime.synopsis || '',
                  couverture: anime.images?.jpg?.large_image_url,
                  statut: anime.status,
                  annee_debut: anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null,
                  annee_fin: anime.aired?.to ? new Date(anime.aired.to).getFullYear() : null,
                  genres: anime.genres?.map(g => g.name).join(', '),
                  episodes: anime.episodes,
                  duree_episode: anime.duration ? parseInt(anime.duration) : null,
                  format: anime.type,
                  rating: anime.score ? `${anime.score}/10` : null
                });
              }
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

      // 3. Kitsu - dernier recours si MAL et AniList n'ont pas de résultats
      if (allResults.length === 0) {
        try {
          const kitsuResponse = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(titre)}&page[limit]=10`);
          if (kitsuResponse.ok) {
            const kitsuData = await kitsuResponse.json();
            if (kitsuData.data && kitsuData.data.length > 0) {
              for (const anime of kitsuData.data) {
                const kitsuTitle = anime.attributes.titles?.en || anime.attributes.titles?.en_jp || anime.attributes.canonicalTitle;
                const normalizedTitle = normalizeTitleForDedup(kitsuTitle);

                if (!seenTitles.has(normalizedTitle)) {
                  seenTitles.add(normalizedTitle);
                  allResults.push({
                    source: 'Kitsu',
                    id: anime.id,
                    titre: kitsuTitle,
                    titre_romaji: anime.attributes.titles?.en_jp,
                    titre_natif: anime.attributes.titles?.ja_jp,
                    description: anime.attributes.synopsis || '',
                    couverture: anime.attributes.posterImage?.large,
                    statut: anime.attributes.status,
                    annee_debut: anime.attributes.startDate ? new Date(anime.attributes.startDate).getFullYear() : null,
                    annee_fin: anime.attributes.endDate ? new Date(anime.attributes.endDate).getFullYear() : null,
                    episodes: anime.attributes.episodeCount,
                    duree_episode: anime.attributes.episodeLength,
                    format: anime.attributes.showType,
                    rating: anime.attributes.averageRating
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('Erreur Kitsu:', error);
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
