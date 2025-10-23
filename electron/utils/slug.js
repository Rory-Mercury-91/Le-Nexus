/**
 * Génère un slug URL-friendly à partir d'un titre
 * @param {string} titre - Le titre à convertir
 * @returns {string} Le slug généré
 */
function createSlug(titre) {
  return titre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplacer les caractères spéciaux par des tirets
    .replace(/^-+|-+$/g, ''); // Supprimer les tirets en début et fin
}

module.exports = { createSlug };
