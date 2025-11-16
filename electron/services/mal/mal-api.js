/**
 * Appels API MyAnimeList
 * Récupère les listes manga et anime de l'utilisateur depuis MAL
 */

const fetch = require('node-fetch');

/**
 * Récupère la liste complète des mangas de l'utilisateur depuis MAL
 * @param {string} accessToken - Access token MAL
 * @param {number} limit - Nombre d'entrées par page (max 1000)
 * @returns {Promise<Array>} Liste des mangas
 */
async function getUserMangaList(accessToken, limit = 1000) {
  const statuses = ['reading', 'completed', 'on_hold', 'dropped', 'plan_to_read'];
  const allMangasMap = new Map();

  for (const status of statuses) {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const url = new URL('https://api.myanimelist.net/v2/users/@me/mangalist');
      url.searchParams.set('fields', 'list_status{status,num_volumes_read,num_chapters_read,score,start_date,finish_date,updated_at},num_chapters,num_volumes,synopsis,main_picture,genres,themes,demographics,authors{first_name,last_name},status,start_date,end_date,media_type,alternative_titles,serialization,related_manga,related_anime,mean,rank,popularity');
      url.searchParams.set('limit', limit.toString());
      url.searchParams.set('offset', offset.toString());
      url.searchParams.set('status', status);
      url.searchParams.set('nsfw', 'true');

      console.log(`📡 Récupération mangas MAL (status: ${status}, offset: ${offset})...`);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch manga list: ${response.status}`);
      }

      const data = await response.json();
      for (const entry of data?.data || []) {
        const node = entry.node || entry;
        if (node?.id) {
          allMangasMap.set(node.id, entry);
        }
      }

      if (data.paging && data.paging.next) {
        offset += limit;
      } else {
        hasMore = false;
      }

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  const allMangas = Array.from(allMangasMap.values());
  console.log(`✅ ${allMangas.length} mangas récupérés depuis MAL (tous statuts confondus)`);
  return allMangas;
}

/**
 * Récupère la liste complète des animes de l'utilisateur depuis MAL
 * @param {string} accessToken - Access token MAL
 * @param {number} limit - Nombre d'entrées par page (max 1000)
 * @returns {Promise<Array>} Liste des animes
 */
async function getUserAnimeList(accessToken, limit = 1000) {
  const statuses = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'];
  const allAnimesMap = new Map();

  for (const status of statuses) {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const url = new URL('https://api.myanimelist.net/v2/users/@me/animelist');
      url.searchParams.set('fields', 'list_status,num_episodes,synopsis,main_picture,genres,status,start_date,end_date,media_type,studios');
      url.searchParams.set('limit', limit.toString());
      url.searchParams.set('offset', offset.toString());
      url.searchParams.set('status', status);
      url.searchParams.set('nsfw', 'true');

      console.log(`📡 Récupération animes MAL (status: ${status}, offset: ${offset})...`);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch anime list: ${response.status}`);
      }

      const data = await response.json();
      for (const entry of data?.data || []) {
        const node = entry.node || entry;
        if (node?.id) {
          allAnimesMap.set(node.id, entry);
        }
      }

      if (data.paging && data.paging.next) {
        offset += limit;
      } else {
        hasMore = false;
      }

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  const allAnimes = Array.from(allAnimesMap.values());
  console.log(`✅ ${allAnimes.length} animes récupérés depuis MAL (tous statuts confondus)`);
  return allAnimes;
}

module.exports = {
  getUserMangaList,
  getUserAnimeList
};
