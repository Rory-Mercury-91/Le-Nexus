/**
 * Détermine si un jeu doit être flouté basé sur sa classification ESRB
 * Les jeux avec classification M (Mature 17+) ou AO (Adults Only 18+) doivent être floutés
 * @param esrbRating - La classification ESRB (peut être une string comme "M" ou "Mature" ou un objet)
 * @returns true si le jeu doit être flouté
 */
export function shouldBlurByEsrbRating(esrbRating: string | null | undefined): boolean {
  if (!esrbRating) {
    return false;
  }

  const rating = typeof esrbRating === 'string' ? esrbRating.toUpperCase() : '';
  
  // M (Mature 17+) ou AO (Adults Only 18+)
  return rating === 'M' || 
         rating === 'MATURE' || 
         rating === 'AO' || 
         rating === 'ADULTS ONLY' ||
         rating.includes('MATURE') ||
         rating.includes('ADULTS ONLY');
}
