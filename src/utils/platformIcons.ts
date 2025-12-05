/**
 * Helper pour obtenir le chemin correct selon l'environnement
 * En production Electron (file://), utilise un chemin relatif
 * En développement, utilise le chemin absolu depuis la racine du serveur
 */
function getAssetPath(path: string): string {
  // En production Electron (file://), utiliser un chemin relatif
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return `./assets/${path.split('/assets/')[1]}`;
  }
  return path;
}

/**
 * Mapping des noms de plateformes vers leurs fichiers SVG
 * Les clés sont en minuscules pour une recherche insensible à la casse
 */
const platformIconMap: Record<string, string> = {
  // Streaming - Netflix
  'netflix': '/assets/netflix.svg',
  
  // Streaming - Disney+
  'disney+': '/assets/disneyplus.svg',
  'disney plus': '/assets/disneyplus.svg',
  'disneyplus': '/assets/disneyplus.svg',
  'disney': '/assets/disneyplus.svg',
  
  // Streaming - Amazon Prime Video
  'amazon prime video': '/assets/amazon-prime-vidéo.svg',
  'amazon prime': '/assets/amazon-prime-vidéo.svg',
  'prime video': '/assets/amazon-prime-vidéo.svg',
  'prime': '/assets/amazon-prime-vidéo.svg',
  
  // Streaming - Crunchyroll
  'crunchyroll': '/assets/crunchyroll.svg',
  
  // Streaming - ADN
  'adn': '/assets/ADN.svg',
  'animation digital network': '/assets/ADN.svg',
  
  // Streaming - HBO
  'hbo max': '/assets/hbo-max.svg',
  'hbomax': '/assets/hbo-max.svg',
  'hbo': '/assets/hbo-max.svg',
  
  // Streaming - Apple TV+
  'appletv+': '/assets/appletv.svg',
  'appletv': '/assets/appletv.svg',
  'apple tv+': '/assets/appletv.svg',
  'apple tv': '/assets/appletv.svg',
  'apple': '/assets/appletv.svg',
  
  // Streaming - Paramount+
  'paramount+': '/assets/paramount-plus.svg',
  'paramount plus': '/assets/paramount-plus.svg',
  'paramount': '/assets/paramount-plus.svg',
  
  // Streaming - YouTube
  'youtube': '/assets/youtube.svg',
  'youtube premium': '/assets/youtube.svg',
  
  // Autres services
  'imdb': '/assets/imdb.svg',
  'tvdb': '/assets/tvdb.svg',
  'thetvdb': '/assets/tvdb.svg',
  'wikipedia': '/assets/wikipedia.svg',
  'facebook': '/assets/facebook.svg',
  'instagram': '/assets/instagram.svg',
  'x': '/assets/x.svg',
  'twitter': '/assets/x.svg',
  
  // Jeux - Stores
  'steam': '/assets/Steam_icon_logo.svg',
  'epic games': '/assets/Epic_Games_logo.svg',
  'epic': '/assets/Epic_Games_logo.svg',
  'gog': '/assets/GOG.com_logo.svg',
  'gog.com': '/assets/GOG.com_logo.svg',
  'nintendo': '/assets/Nintendo.svg',
  'nintendo switch': '/assets/Nintendo.svg',
  'playstation': '/assets/PlayStation.svg',
  'playstation store': '/assets/PlayStation.svg',
  // PC
  'pc': '/assets/PC_logo.svg',
  'windows': '/assets/PC_logo.svg',
  'microsoft windows': '/assets/PC_logo.svg',
  'windows pc': '/assets/PC_logo.svg',
  // Xbox - Variantes spécifiques
  'xbox series x': '/assets/Xbox_Series_X_S_black.svg',
  'xbox series s': '/assets/Xbox_Series_X_S_black.svg',
  'xbox series x/s': '/assets/Xbox_Series_X_S_black.svg',
  'xbox series': '/assets/Xbox_Series_X_S_black.svg',
  'xbox one': '/assets/xbox-one-logo-svgrepo-com.svg',
  'xbox one x': '/assets/xbox-one-logo-svgrepo-com.svg',
  'xbox one s': '/assets/xbox-one-logo-svgrepo-com.svg',
  // Xbox - Générique (fallback)
  'xbox': '/assets/Xbox_one_logo.svg',
  'xbox store': '/assets/Xbox_one_logo.svg',
  'microsoft store': '/assets/Xbox_one_logo.svg',
  'microsoft': '/assets/Xbox_one_logo.svg',
};

/**
 * Obtient le chemin du SVG pour une plateforme donnée
 * @param platformName - Nom de la plateforme (insensible à la casse)
 * @returns Chemin du SVG ou null si non trouvé
 */
export function getPlatformIcon(platformName: string | null | undefined): string | null {
  if (!platformName) return null;
  
  const normalized = platformName.trim();
  const lower = normalized.toLowerCase()
    .replace(/[+]/g, '') // Enlever les +
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .replace(/[\/]/g, '/') // Normaliser les slashes
    .trim();
  
  // Recherche exacte d'abord
  if (platformIconMap[lower]) {
    return getAssetPath(platformIconMap[lower]);
  }
  
  // Recherche par correspondance partielle avec priorité aux correspondances les plus longues
  const matches: Array<{ key: string; value: string; score: number }> = [];
  for (const [key, value] of Object.entries(platformIconMap)) {
    const keyLower = key.toLowerCase();
    // Correspondance si le nom contient la clé ou la clé contient le nom
    if (lower.includes(keyLower) || keyLower.includes(lower)) {
      // Score basé sur la longueur de la correspondance (priorité aux correspondances plus longues)
      const score = Math.min(keyLower.length, lower.length);
      matches.push({ key, value, score });
    }
  }
  
  // Trier par score décroissant et prendre la meilleure correspondance
  if (matches.length > 0) {
    matches.sort((a, b) => b.score - a.score);
    return getAssetPath(matches[0].value);
  }
  
  // Recherche par mots-clés spécifiques (avec priorité aux correspondances les plus spécifiques)
  // Xbox - Détection spécifique (doit être avant le générique)
  if (lower.includes('xbox series x') || lower.includes('xbox series s') || lower.includes('xbox series x/s')) {
    return getAssetPath('/assets/Xbox_Series_X_S_black.svg');
  }
  if (lower.includes('xbox series')) {
    return getAssetPath('/assets/Xbox_Series_X_S_black.svg');
  }
  if (lower.includes('xbox one x') || lower.includes('xbox one s')) {
    return getAssetPath('/assets/xbox-one-logo-svgrepo-com.svg');
  }
  if (lower.includes('xbox one')) {
    return getAssetPath('/assets/xbox-one-logo-svgrepo-com.svg');
  }
  
  // Streaming
  if (lower.includes('netflix')) return getAssetPath('/assets/netflix.svg');
  if (lower.includes('disney')) return getAssetPath('/assets/disneyplus.svg');
  if (lower.includes('prime') || lower.includes('amazon')) return getAssetPath('/assets/amazon-prime-vidéo.svg');
  if (lower.includes('crunchyroll')) return getAssetPath('/assets/crunchyroll.svg');
  if (lower.includes('hbo')) return getAssetPath('/assets/hbo-max.svg');
  if (lower.includes('apple') && lower.includes('tv')) return getAssetPath('/assets/appletv.svg');
  if (lower.includes('paramount')) return getAssetPath('/assets/paramount-plus.svg');
  if (lower.includes('adn') || lower.includes('animation digital')) return getAssetPath('/assets/ADN.svg');
  if (lower.includes('youtube')) return getAssetPath('/assets/youtube.svg');
  
  // Jeux - Stores
  if (lower.includes('steam')) return getAssetPath('/assets/Steam_icon_logo.svg');
  if (lower.includes('epic')) return getAssetPath('/assets/Epic_Games_logo.svg');
  if (lower.includes('gog')) return getAssetPath('/assets/GOG.com_logo.svg');
  if (lower.includes('nintendo')) return getAssetPath('/assets/Nintendo.svg');
  if (lower.includes('playstation') || lower.includes('play station')) return getAssetPath('/assets/PlayStation.svg');
  // PC
  if (lower === 'pc' || lower.includes('windows') || (lower.includes('pc') && !lower.includes('playstation'))) return getAssetPath('/assets/PC_logo.svg');
  // Xbox - Générique (fallback, doit être en dernier)
  if (lower.includes('xbox') || lower.includes('microsoft')) return getAssetPath('/assets/Xbox_one_logo.svg');
  
  return null;
}

/**
 * Liste des plateformes supportées
 */
export const SUPPORTED_PLATFORMS = Object.keys(platformIconMap);
