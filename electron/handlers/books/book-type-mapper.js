/**
 * Mappe les catégories/genres des APIs de livres vers les types de livres de l'application
 */

/**
 * Mappe les catégories d'une API vers un type de livre
 * @param {string[]} categories - Liste des catégories/genres depuis l'API
 * @returns {string|null} - Type de livre ou null si aucun match
 */
function mapCategoriesToBookType(categories) {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return null;
  }

  // Normaliser les catégories (minuscules, sans accents)
  const normalizedCategories = categories.map(cat => 
    cat.toLowerCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
       .trim()
  );

  // Mapping des catégories vers les types de livres
  const categoryMappings = {
    // Biographie / Autobiographie
    'biographie': 'Biographie',
    'biography': 'Biographie',
    'autobiographie': 'Autobiographie',
    'autobiography': 'Autobiographie',
    'memoir': 'Autobiographie',
    'mémoires': 'Autobiographie',
    
    // Essai
    'essai': 'Essai',
    'essay': 'Essai',
    'essays': 'Essai',
    
    // Documentaire
    'documentaire': 'Documentaire',
    'non-fiction': 'Documentaire',
    'nonfiction': 'Documentaire',
    'non fiction': 'Documentaire',
    'history': 'Documentaire',
    'histoire': 'Documentaire',
    'science': 'Documentaire',
    'sciences': 'Documentaire',
    
    // Polar / Thriller
    'polar': 'Polar',
    'mystery': 'Polar',
    'mystère': 'Polar',
    'thriller': 'Thriller',
    'suspense': 'Thriller',
    'crime': 'Polar',
    'detective': 'Polar',
    
    // Science-fiction
    'science-fiction': 'Science-fiction',
    'science fiction': 'Science-fiction',
    'sci-fi': 'Science-fiction',
    'scifi': 'Science-fiction',
    'sf': 'Science-fiction',
    
    // Fantasy
    'fantasy': 'Fantasy',
    'fantastique': 'Fantasy',
    'fantasy fiction': 'Fantasy',
    'paranormal': 'Fantasy', // Paranormal peut être considéré comme Fantasy
    'surnaturel': 'Fantasy',
    'supernatural': 'Fantasy',
    
    // Horreur
    'horreur': 'Horreur',
    'horror': 'Horreur',
    'épouvante': 'Horreur',
    
    // Romance
    'romance': 'Romance',
    'romantique': 'Romance',
    'love story': 'Romance',
    'histoires d\'amour': 'Romance',
    'histoires damour': 'Romance',
    'love stories': 'Romance',
    'paranormal romance': 'Romance',
    'romance paranormale': 'Romance',
    
    // Bande dessinée / Comics / Manga
    'bande dessinée': 'Bande dessinée',
    'bande dessinee': 'Bande dessinée',
    'bd': 'Bande dessinée',
    'comic': 'Comics',
    'comics': 'Comics',
    'graphic novel': 'Comics',
    'roman graphique': 'Bande dessinée',
    'manga': 'Manga',
    'mangas': 'Manga',
    
    // Roman (par défaut si c'est de la fiction mais pas d'autre catégorie)
    'fiction': 'Roman',
    'roman': 'Roman',
    'novel': 'Roman',
    'literature': 'Roman',
    'littérature': 'Roman',
    'litterature': 'Roman'
  };

  // Chercher une correspondance dans les catégories
  for (const normalizedCat of normalizedCategories) {
    // Correspondance exacte
    if (categoryMappings[normalizedCat]) {
      return categoryMappings[normalizedCat];
    }
    
    // Correspondance partielle (si la catégorie contient le mot-clé)
    for (const [keyword, bookType] of Object.entries(categoryMappings)) {
      if (normalizedCat.includes(keyword) || keyword.includes(normalizedCat)) {
        return bookType;
      }
    }
  }

  // Si on trouve "fiction" mais pas d'autre catégorie spécifique, c'est un Roman
  const hasFiction = normalizedCategories.some(cat => 
    cat.includes('fiction') || cat.includes('roman') || cat.includes('novel')
  );
  if (hasFiction) {
    // Vérifier qu'on n'a pas déjà trouvé un type plus spécifique
    const hasSpecificType = normalizedCategories.some(cat =>
      cat.includes('science') || cat.includes('fantasy') || cat.includes('horror') ||
      cat.includes('romance') || cat.includes('thriller') || cat.includes('mystery')
    );
    if (!hasSpecificType) {
      return 'Roman';
    }
  }

  return null;
}

module.exports = {
  mapCategoriesToBookType
};
