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

      const allResults = [];
      const searchQuery = `%${query}%`;

      // Rechercher dans les séries (mangas)
      // Note: Les séries sont globales, on filtre juste les masquées
      const mangas = db.prepare(`
        SELECT s.id, s.titre, s.auteurs, s.type_volume, s.couverture_url
        FROM series s
        WHERE s.id NOT IN (
          SELECT serie_id FROM series_masquees WHERE utilisateur = ?
        )
        AND (s.titre LIKE ? OR s.description LIKE ? OR s.auteurs LIKE ?)
        LIMIT 10
      `).all(currentUser, searchQuery, searchQuery, searchQuery);

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
      const animes = db.prepare(`
        SELECT 
          a.id, 
          a.titre, 
          a.type, 
          a.nb_episodes, 
          a.couverture_url,
          COALESCE(
            (SELECT COUNT(DISTINCT episode_numero) 
             FROM anime_episodes_vus 
             WHERE anime_id = a.id AND utilisateur = ? AND vu = 1),
            0
          ) as episodes_vus
        FROM anime_series a
        WHERE a.utilisateur_ajout = ?
        AND (a.titre LIKE ? OR a.description LIKE ?)
        LIMIT 10
      `).all(currentUser, currentUser, searchQuery, searchQuery);

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

      // Rechercher dans les AVN
      const avnGames = db.prepare(`
        SELECT DISTINCT g.id, g.titre, g.moteur, g.version, g.couverture_url, g.tags
        FROM avn_games g
        INNER JOIN avn_proprietaires p ON g.id = p.game_id
        WHERE p.utilisateur = ?
        AND (g.titre LIKE ? OR g.tags LIKE ?)
        LIMIT 10
      `).all(currentUser, searchQuery, searchQuery);

      avnGames.forEach(game => {
        allResults.push({
          id: game.id,
          type: 'avn',
          title: game.titre,
          subtitle: game.moteur || 'AVN',
          progress: game.version || '',
          coverUrl: game.couverture_url
        });
      });

      console.log(`🔍 Recherche globale: "${query}" => ${allResults.length} résultats (${mangas.length} mangas, ${animes.length} animes, ${avnGames.length} AVN)`);
      return allResults;
    } catch (error) {
      console.error('❌ Erreur global-search:', error);
      return [];
    }
  });
  
  // Recherche de mangas (multi-sources: MangaDex, AniList, Kitsu, MAL, MangaUpdates)
  ipcMain.handle('search-manga', async (event, titre) => {
    try {

      
      const allResults = [];

      // MangaDex
      try {
        const mdResponse = await fetch(`https://api.mangadex.org/manga?title=${encodeURIComponent(titre)}&limit=5&includes[]=cover_art&includes[]=author&includes[]=artist&order[relevance]=desc`);
        if (mdResponse.ok) {
          const mdData = await mdResponse.json();
          if (mdData.data && mdData.data.length > 0) {
            for (const manga of mdData.data) {
              const coverRelationship = manga.relationships.find(r => r.type === 'cover_art');
              let coverUrl = null;
              if (coverRelationship) {
                const coverId = coverRelationship.id;
                const fileName = coverRelationship.attributes?.fileName;
                if (fileName) {
                  coverUrl = `https://uploads.mangadex.org/covers/${manga.id}/${fileName}`;
                }
              }

              const frTitle = manga.attributes.title?.fr || manga.attributes.title?.['ja-ro'] || manga.attributes.title?.en || Object.values(manga.attributes.title)[0];

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
      } catch (error) {
        console.error('Erreur MangaDex:', error);
      }

      // AniList
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
          if (anilistData.data?.Page?.media) {
            for (const manga of anilistData.data.Page.media) {
              allResults.push({
                source: 'AniList',
                id: manga.id.toString(),
                titre: manga.title.romaji || manga.title.english || manga.title.native,
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
      } catch (error) {
        console.error('Erreur AniList:', error);
      }

      // Kitsu
      try {
        const kitsuResponse = await fetch(`https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(titre)}&page[limit]=5`);
        if (kitsuResponse.ok) {
          const kitsuData = await kitsuResponse.json();
          if (kitsuData.data) {
            for (const manga of kitsuData.data) {
              allResults.push({
                source: 'Kitsu',
                id: manga.id,
                titre: manga.attributes.titles?.en || manga.attributes.titles?.en_jp || manga.attributes.canonicalTitle,
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
      } catch (error) {
        console.error('Erreur Kitsu:', error);
      }

      // MyAnimeList (via Jikan)
      try {
        const malResponse = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(titre)}&limit=5`);
        if (malResponse.ok) {
          const malData = await malResponse.json();
          if (malData.data) {
            for (const manga of malData.data) {
              allResults.push({
                source: 'MyAnimeList',
                id: manga.mal_id.toString(),
                titre: manga.title || manga.title_english,
                description: manga.synopsis || '',
                couverture: manga.images?.jpg?.large_image_url,
                statut_publication: manga.status,
                annee_publication: manga.published?.from ? new Date(manga.published.from).getFullYear() : null,
                genres: manga.genres?.map(g => g.name).join(', '),
                nb_chapitres: manga.chapters
              });
            }
          }
        }
      } catch (error) {
        console.error('Erreur MyAnimeList (Jikan):', error);
      }

      // MangaUpdates
      try {
        const muResponse = await fetch(`https://api.mangaupdates.com/v1/series/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ search: titre, perpage: 5 })
        });
        if (muResponse.ok) {
          const muData = await muResponse.json();
          if (muData.results) {
            for (const manga of muData.results) {
              allResults.push({
                source: 'MangaUpdates',
                id: manga.record.series_id.toString(),
                titre: manga.record.title,
                description: manga.record.description || '',
                couverture: manga.record.image?.url?.original,
                statut_publication: manga.record.status,
                annee_publication: manga.record.year ? parseInt(manga.record.year) : null,
                genres: manga.record.genres?.map(g => g.genre).join(', ')
              });
            }
          }
        }
      } catch (error) {
        console.error('Erreur MangaUpdates:', error);
      }


      return allResults;
    } catch (error) {
      console.error('Erreur search-manga:', error);
      return [];
    }
  });

  // Recherche d'animes (AniList, Kitsu)
  ipcMain.handle('search-anime', async (event, titre) => {
    try {

      
      const allResults = [];

      // AniList
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
          if (anilistData.data?.Page?.media) {
            for (const anime of anilistData.data.Page.media) {
              allResults.push({
                source: 'AniList',
                id: anime.id.toString(),
                titre: anime.title.romaji || anime.title.english || anime.title.native,
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
      } catch (error) {
        console.error('Erreur AniList:', error);
      }

      // Kitsu
      try {
        const kitsuResponse = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(titre)}&page[limit]=10`);
        if (kitsuResponse.ok) {
          const kitsuData = await kitsuResponse.json();
          if (kitsuData.data) {
            for (const anime of kitsuData.data) {
              allResults.push({
                source: 'Kitsu',
                id: anime.id,
                titre: anime.attributes.titles?.en || anime.attributes.titles?.en_jp || anime.attributes.canonicalTitle,
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
      } catch (error) {
        console.error('Erreur Kitsu:', error);
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
