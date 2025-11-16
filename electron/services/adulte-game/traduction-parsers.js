/**
 * Parsers pour les traductions jeux adultes
 * Utilitaires pour parser CSV, extraire IDs, etc.
 */

/**
 * Extrait l'ID depuis une URL F95Zone ou LewdCorner
 * @param {string} url - URL du thread (F95Zone ou LewdCorner)
 * @returns {number|null} ID extrait ou null
 */
function extractF95Id(url) {
  if (!url) return null;
  const match = url.match(/\.(\d+)\/?$/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Parse une ligne CSV en respectant les guillemets
 * @param {string} line - Ligne CSV
 * @returns {Array<string>} Colonnes parsées
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && nextChar === '"') {
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Extraire l'URL d'une formule LIEN_HYPERTEXTE ou HYPERLINK
 * Ex: =LIEN_HYPERTEXTE("https://...", "Traduction") → https://...
 * @param {string} cell - Contenu de la cellule
 * @returns {string} URL extraite ou texte original
 */
function extractHyperlink(cell) {
  if (!cell) return '';
  
  // Détecter formule LIEN_HYPERTEXTE ou HYPERLINK
  const hyperlinkMatch = cell.match(/=(?:LIEN_HYPERTEXTE|HYPERLINK)\s*\(\s*"([^"]+)"\s*[;,]\s*"[^"]*"\s*\)/i);
  if (hyperlinkMatch) {
    console.log(`🔗 Lien extrait: ${hyperlinkMatch[1]} depuis formule`);
    return hyperlinkMatch[1];
  }
  
  // Si c'est une URL directe
  if (cell.startsWith('http://') || cell.startsWith('https://')) {
    return cell;
  }
  
  // Sinon, retourner tel quel (peut-être que le CSV a déjà résolu le lien)
  return cell;
}

module.exports = {
  extractF95Id,
  parseCSVLine,
  extractHyperlink
};
