/**
 * Utilitaires pour gérer les animes sensibles (Rx/R+)
 */

/**
 * Vérifie si un anime a un rating sensible (Rx ou R+)
 */
export function isSensitiveAnime(rating: string | null | undefined): boolean {
  if (!rating) return false;
  
  const ratingLower = rating.toLowerCase();
  return ratingLower.includes('rx') || 
         ratingLower.includes('hentai') || 
         ratingLower.includes('r+') || 
         ratingLower.includes('mild nudity');
}
