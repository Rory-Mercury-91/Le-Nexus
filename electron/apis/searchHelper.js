// Helper pour améliorer les recherches en français

// Dictionnaire de traduction français → anglais pour les titres de mangas
const frenchToEnglishKeywords = {
  // Nombres
  'premier': ['first', '1st', '1'],
  'première': ['first', '1st', '1'],
  'deuxième': ['second', '2nd', '2'],
  'troisième': ['third', '3rd', '3'],
  'quatrième': ['fourth', '4th', '4'],
  'cinquième': ['fifth', '5th', '5'],
  'sixième': ['sixth', '6th', '6'],
  'septième': ['seventh', '7th', '7'],
  'huitième': ['eighth', '8th', '8'],
  'neuvième': ['ninth', '9th', '9'],
  'dixième': ['tenth', '10th', '10'],
  
  // Mots communs dans les titres
  'fils': ['son'],
  'fille': ['daughter'],
  'prince': ['prince'],
  'princesse': ['princess'],
  'roi': ['king'],
  'reine': ['queen'],
  'héros': ['hero'],
  'héroïne': ['heroine'],
  'chevalier': ['knight'],
  'guerrier': ['warrior'],
  'mage': ['mage', 'magician'],
  'sorcier': ['wizard', 'sorcerer'],
  'sorcière': ['witch'],
  'monde': ['world'],
  'vie': ['life'],
  'mort': ['death'],
  'aventure': ['adventure'],
  'histoire': ['story', 'tale'],
  'légende': ['legend'],
  'destin': ['destiny', 'fate'],
  'retour': ['return'],
  'voyage': ['journey'],
  'quête': ['quest']
};

// Générer des variantes de recherche pour un titre français
function generateSearchVariants(query) {
  const variants = [query]; // Toujours inclure la recherche originale
  
  let normalized = query.toLowerCase().trim();
  
  // Enlever les articles français
  const withoutArticles = normalized
    .replace(/^(le|la|les|l'|l')\s+/i, '')
    .trim();
  
  if (withoutArticles !== normalized) {
    variants.push(withoutArticles);
  }
  
  // Générer des variantes avec traductions
  const words = normalized.split(/\s+/);
  const translatedVariants = [];
  
  for (const word of words) {
    const cleanWord = word.replace(/['']/g, '');
    if (frenchToEnglishKeywords[cleanWord]) {
      // Pour chaque mot français trouvé, générer des variantes
      const translations = frenchToEnglishKeywords[cleanWord];
      for (const translation of translations) {
        const variant = normalized.replace(new RegExp(`\\b${word}\\b`, 'i'), translation);
        translatedVariants.push(variant);
        
        // Aussi sans article
        const variantNoArticle = variant.replace(/^(le|la|les|l'|l')\s+/i, '').trim();
        if (variantNoArticle !== variant) {
          translatedVariants.push(variantNoArticle);
        }
      }
    }
  }
  
  variants.push(...translatedVariants);
  
  // Enlever les doublons et retourner
  return [...new Set(variants)].slice(0, 5); // Max 5 variantes pour ne pas surcharger
}

// Détecter si une recherche est probablement en français
function isFrenchQuery(query) {
  const frenchIndicators = [
    /^(le|la|les|l')\s+/i,
    /ième\b/i,
    /ère\b/i,
    /ème\b/i
  ];
  
  return frenchIndicators.some(pattern => pattern.test(query));
}

export { frenchToEnglishKeywords, generateSearchVariants, isFrenchQuery };
