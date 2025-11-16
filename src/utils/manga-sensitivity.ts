/**
 * Utilitaires pour gérer les mangas sensibles (erotica)
 */

/**
 * Vérifie si un manga a un rating sensible (erotica)
 * Supporte les formats standardisés ('erotica') et les formats MAL ('R+', 'Rx', etc.)
 */
export function isSensitiveManga(rating: string | null | undefined): boolean {
  if (!rating) return false;
  
  const ratingLower = rating.toLowerCase();
  
  // Format standardisé
  if (ratingLower === 'erotica') return true;
  
  // Formats MAL depuis Nautiljon ou Jikan
  return ratingLower.includes('hentai') || 
         ratingLower.includes('rx') ||
         ratingLower.includes('r+') ||
         ratingLower.includes('mild nudity');
}
