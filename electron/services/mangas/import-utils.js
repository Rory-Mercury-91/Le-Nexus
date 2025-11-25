/**
 * Utilitaires pour l'import de mangas
 * Fonctions de normalisation et comparaison de titres
 */

/**
 * Fonction de normalisation pour la comparaison de titres
 */
function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .normalize('NFKC') // Unifie les variantes (chiffres, katakana, etc.)
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques (accents)
    .replace(/[-\s'']/g, '') // Supprime tirets, espaces, apostrophes
    .replace(/[!?.,;:[\](){}]/g, '') // Supprime ponctuation et crochets/parenthèses
    .replace(/[ō]/g, 'o') // Normalise caractères japonais romanisés
    .replace(/[ū]/g, 'u')
    .replace(/[ā]/g, 'a')
    .replace(/[ē]/g, 'e')
    .replace(/[ī]/g, 'i')
    .trim();
}

/**
 * Distance de Levenshtein pour calculer la similarité entre deux chaînes
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i] + 1,     // suppression
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[len2][len1];
}

/**
 * Vérifie si deux titres sont similaires (tolérance : 1-2 caractères de différence)
 */
function areSimilar(str1, str2) {
  if (!str1 || !str2) return false;
  if (str1 === str2) return true;
  
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  // Tolérance adaptative : 1-2 caractères pour titres courts, 2-3 pour longs titres
  const threshold = maxLength < 15 ? 1 : (maxLength < 30 ? 2 : 3);
  
  return distance <= threshold;
}

/**
 * Vérifie si au moins N caractères consécutifs depuis le début sont identiques
 * IMPORTANT : On compare depuis le caractère 0 et on compte les caractères identiques consécutifs
 * Si on trouve une différence, on s'arrête (pas de réinitialisation, on veut une correspondance continue depuis le début)
 * @param {string} str1 - Première chaîne normalisée
 * @param {string} str2 - Deuxième chaîne normalisée
 * @param {number} minChars - Nombre minimum de caractères consécutifs depuis le début (défaut: 5)
 * @returns {boolean}
 */
function hasConsecutiveMatchFromStart(str1, str2, minChars = 5) {
  if (!str1 || !str2) return false;
  if (str1.length < minChars || str2.length < minChars) return false;
  
  // Comparer caractère par caractère depuis le début (caractère 0)
  // On compte les caractères identiques consécutifs depuis le début
  // Dès qu'on trouve une différence, on s'arrête
  const minLength = Math.min(str1.length, str2.length);
  let consecutiveCount = 0;
  
  for (let i = 0; i < minLength; i++) {
    if (str1[i] === str2[i]) {
      consecutiveCount++;
    } else {
      // Dès qu'on trouve une différence, on s'arrête
      // On a déjà compté les caractères identiques depuis le début
      break;
    }
  }
  
  // Si on a au moins minChars caractères identiques depuis le début, c'est une correspondance
  return consecutiveCount >= minChars;
}

/**
 * Compte le nombre de caractères consécutifs identiques depuis le début (caractère 0)
 * @param {string} str1 - Première chaîne normalisée
 * @param {string} str2 - Deuxième chaîne normalisée
 * @returns {number} - Nombre de caractères consécutifs identiques depuis le début
 */
function countConsecutiveMatchFromStart(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const minLength = Math.min(str1.length, str2.length);
  let consecutiveCount = 0;
  
  for (let i = 0; i < minLength; i++) {
    if (str1[i] === str2[i]) {
      consecutiveCount++;
    } else {
      break;
    }
  }
  
  return consecutiveCount;
}

/**
 * Calcule le pourcentage de similarité entre deux chaînes
 * @param {string} str1 - Première chaîne normalisée
 * @param {string} str2 - Deuxième chaîne normalisée
 * @returns {number} - Pourcentage de similarité (0-100)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;
  
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  if (maxLength === 0) return 100;
  
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity * 100) / 100; // Arrondir à 2 décimales
}

/**
 * Vérifie si deux titres correspondent avec les critères stricts
 * Logique principale : Si au moins 5 caractères consécutifs depuis le début (caractère 0) sont identiques,
 * alors c'est une correspondance potentielle et on propose la fusion à l'utilisateur.
 * 
 * Critères :
 * - Au moins 5 caractères consécutifs identiques depuis le début (caractère 0)
 * - La similarité globale est calculée pour information mais n'est pas un critère bloquant
 * 
 * @param {string} str1 - Première chaîne normalisée
 * @param {string} str2 - Deuxième chaîne normalisée
 * @returns {Object} - { match: boolean, similarity: number, hasConsecutive: boolean, consecutiveCount: number }
 */
function checkStrictMatch(str1, str2) {
  if (!str1 || !str2) {
    return { match: false, similarity: 0, hasConsecutive: false, consecutiveCount: 0 };
  }
  
  const similarity = calculateSimilarity(str1, str2);
  
  // Compter le nombre de caractères consécutifs identiques depuis le début
  const consecutiveCount = countConsecutiveMatchFromStart(str1, str2);
  
  // Vérifier si au moins 5 caractères consécutifs depuis le début sont identiques
  // C'est le critère principal : si les 5 premiers caractères (ou plus) sont identiques depuis le début,
  // c'est une correspondance potentielle
  const hasConsecutive = consecutiveCount >= 5;
  
  // Si on a au moins 5 caractères consécutifs depuis le début, c'est une correspondance
  // La similarité globale est calculée pour information mais n'est pas un critère bloquant
  const match = hasConsecutive;
  
  return { match, similarity, hasConsecutive, consecutiveCount };
}

module.exports = {
  normalizeTitle,
  levenshteinDistance,
  areSimilar,
  hasConsecutiveMatchFromStart,
  countConsecutiveMatchFromStart,
  calculateSimilarity,
  checkStrictMatch
};
