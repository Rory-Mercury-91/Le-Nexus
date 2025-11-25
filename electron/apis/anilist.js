const fetch = require('node-fetch');

/**
 * Récupère l'ID AniList depuis un MAL ID
 * @param {number} malId - L'ID MyAnimeList de l'anime
 * @returns {Promise<number|null>} L'ID AniList ou null si non trouvé
 */
async function getAniListIdFromMAL(malId) {
  try {
    const query = `
      query ($malId: Int) {
        Media(idMal: $malId, type: ANIME) {
          id
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { malId } })
    });

    const data = await response.json();
    return data.data?.Media?.id || null;
  } catch (error) {
    console.error('Erreur getAniListIdFromMAL:', error);
    return null;
  }
}

/**
 * Récupère les liens de streaming depuis AniList
 * @param {number} malId - L'ID MyAnimeList de l'anime
 * @returns {Promise<Array>} Liste des liens de streaming
 */
// Fonction utilitaire pour filtrer les liens de streaming (plateformes acceptées et pages spécifiques)
function filterStreamingLinks(links) {
  // Plateformes acceptées (liens externes depuis AniList/MyAnimeList)
  const acceptedPlatforms = [
    'ADN',
    'Anime Digital Network',
    'Disney Plus',
    'Disney+',
    'Amazon',
    'Amazon Prime Video',
    'Prime Video',
    'Crunchyroll',
    'Netflix'
  ];

  // Fonction pour vérifier si l'URL pointe vers une page spécifique (pas juste la page d'accueil)
  const isSpecificPage = (url) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Si le pathname est vide, "/" ou juste "/fr/", "/en/", etc. → c'est une page d'accueil
      const cleanPath = pathname.replace(/^\/+|\/+$/g, ''); // Enlever les slashes au début et à la fin
      
      // Si le chemin est vide ou ne contient qu'un seul segment (comme "fr", "en"), c'est une page d'accueil
      if (cleanPath.length === 0) {
        return false;
      }
      
      const pathSegments = cleanPath.split('/').filter(seg => seg.length > 0);
      
      // Si moins de 2 segments, c'est probablement une page d'accueil (ex: "/fr" ou "/en")
      // On accepte seulement si on a au moins 2 segments (ex: "/solo-leveling" ou "/detail/Solo-Leveling/...")
      return pathSegments.length >= 1 && pathSegments[0] !== 'fr' && pathSegments[0] !== 'en';
    } catch {
      return false;
    }
  };

  // Filtrer uniquement les plateformes souhaitées et les vrais liens (pas les pages d'accueil)
  return links.filter(link => {
    // Obtenir le nom de la plateforme (peut être dans link.platform, link.site, ou link.name)
    const platformName = link.platform || link.site || link.name || '';
    
    // Vérifier que la plateforme est acceptée
    const isAcceptedPlatform = acceptedPlatforms.some(platform => 
      platformName.toLowerCase().includes(platform.toLowerCase()) ||
      platform.toLowerCase().includes(platformName.toLowerCase())
    );
    
    if (!isAcceptedPlatform) {
      return false;
    }
    
    // Vérifier que l'URL pointe vers une page spécifique
    const url = link.url || '';
    return isSpecificPage(url);
  });
}

async function getStreamingLinksFromAniList(malId) {
  try {
    // Récupérer l'ID AniList depuis MAL ID
    const anilistId = await getAniListIdFromMAL(malId);
    if (!anilistId) {
      console.log('Aucun ID AniList trouvé pour MAL ID:', malId);
      return [];
    }

    // Récupérer les liens de streaming
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          externalLinks {
            id
            url
            site
            type
            language
            color
            icon
          }
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: anilistId } })
    });

    const data = await response.json();
    const links = data.data?.Media?.externalLinks || [];

    // Filtrer uniquement les liens de streaming (pas les liens vers d'autres sites comme Twitter, etc.)
    const streamingLinks = links.filter(link => link.type === 'STREAMING');

    // Filtrer uniquement les plateformes souhaitées et les vrais liens (pas les pages d'accueil)
    // Utiliser la fonction utilitaire filterStreamingLinks
    const mappedLinks = streamingLinks.map(link => ({
      platform: link.site,
      url: link.url,
      site: link.site,
      name: link.site
    }));
    const filteredLinks = filterStreamingLinks(mappedLinks);

    console.log(`✅ ${filteredLinks.length}/${streamingLinks.length} liens de streaming retenus pour anime MAL ID ${malId} (ADN, Disney+, Prime Video, Crunchyroll, Netflix)`);
    
    return filteredLinks.map(link => {
      // Si le nom de la plateforme est "Unknown", essayer de le déduire depuis l'URL
      let platformName = link.site;
      if (platformName === 'Unknown' || !platformName || platformName.trim() === '') {
        const url = link.url.toLowerCase();
        if (url.includes('crunchyroll')) {
          platformName = 'Crunchyroll';
        } else if (url.includes('animedigitalnetwork') || url.includes('adn')) {
          platformName = 'ADN';
        } else if (url.includes('disney')) {
          platformName = 'Disney+';
        } else if (url.includes('prime') || url.includes('amazon')) {
          platformName = 'Prime Video';
        } else if (url.includes('netflix')) {
          platformName = 'Netflix';
        } else {
          // Si on ne peut pas le déduire, extraire le nom de domaine
          try {
            const domain = new URL(link.url).hostname.replace('www.', '').split('.')[0];
            platformName = domain.charAt(0).toUpperCase() + domain.slice(1);
          } catch (_error) {
            platformName = 'Plateforme inconnue';
          }
        }
      }
      
      return {
        source: 'anilist',
        platform: platformName,
        url: link.url,
        language: link.language || 'unknown',
        color: link.color,
        icon: link.icon
      };
    });
  } catch (error) {
    console.error('❌ Erreur récupération liens streaming:', error);
    return [];
  }
}

/**
 * Récupère les informations de couverture depuis AniList via leur API GraphQL
 * @param {number} malId - L'ID MyAnimeList de l'anime
 * @param {string} [titre] - Le titre de l'anime (optionnel, pour les logs)
 * @returns {Promise<{ coverImage: { extraLarge: string, large: string } | null }>}
 */
async function fetchAniListCover(malId, titre = null) {
  try {
    const query = `
      query ($malId: Int) {
        Media(idMal: $malId, type: ANIME) {
          coverImage {
            extraLarge
            large
            medium
          }
        }
      }
    `;

    const variables = {
      malId: parseInt(malId)
    };

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: variables
      })
    });

    if (!response.ok) {
      const identifier = titre ? `"${titre}" (MAL ID: ${malId})` : `MAL ID ${malId}`;
      console.warn(`⚠️ AniList API erreur HTTP ${response.status} pour ${identifier}`);
      return { coverImage: null };
    }

    const data = await response.json();

    if (data.errors) {
      const identifier = titre ? `"${titre}" (MAL ID: ${malId})` : `MAL ID ${malId}`;
      console.warn(`⚠️ AniList GraphQL erreur pour ${identifier}:`, data.errors[0]?.message);
      return { coverImage: null };
    }

    if (!data.data?.Media) {
      return { coverImage: null };
    }

    return {
      coverImage: data.data.Media.coverImage
    };
  } catch (error) {
    const identifier = titre ? `"${titre}" (MAL ID: ${malId})` : `MAL ID ${malId}`;
    console.error(`❌ Erreur fetchAniListCover pour ${identifier}:`, error.message);
    return { coverImage: null };
  }
}

module.exports = {
  fetchAniListCover,
  getAniListIdFromMAL,
  getStreamingLinksFromAniList,
  filterStreamingLinks
};
