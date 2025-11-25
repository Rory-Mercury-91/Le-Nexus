/**
 * Nettoie le texte en supprimant les mentions "[Written by MAL Rewrite]"
 * @param text - Texte à nettoyer
 * @returns Texte nettoyé
 */
export function cleanMalRewriteText(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .replace(/\[Written by MAL Rewrite\]/gi, '')
    .replace(/\[Written by MAL Rewrite\s*\]/gi, '')
    .trim();
}
