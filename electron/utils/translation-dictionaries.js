/**
 * Dictionnaires de traductions pour la déduplication basée sur les traductions
 * Ces dictionnaires permettent de dédupliquer les genres/thèmes qui ont la même traduction
 */

// Genres - Dictionnaire de traductions (version simplifiée pour backend)
const genreTranslations = {
  // Genres principaux
  'Action': 'Action',
  'Adventure': 'Aventure',
  'Comedy': 'Comédie',
  'Comedie': 'Comédie',
  'Drama': 'Drame',
  'Ecchi': 'Ecchi',
  'Fantasy': 'Fantastique',
  'Fantastique': 'Fantastique',
  'Fantaisie': 'Fantastique',
  'Horror': 'Horreur',
  'Mystery': 'Mystère',
  'Psychological': 'Psychologique',
  'Romance': 'Romance',
  'Sci-Fi': 'Science-Fiction',
  'Sci-fi': 'Science-Fiction',
  'Science Fiction': 'Science-Fiction',
  'Science-fiction': 'Science-Fiction',
  'Slice of Life': 'Tranche de vie',
  'Slice-of-Life': 'Tranche de vie',
  'Slice Of Life': 'Tranche de vie',
  'Slice of life': 'Tranche de vie',
  'Tranches de vie': 'Tranche de vie',
  'Sports': 'Sport',
  'Sport': 'Sport',
  'Supernatural': 'Surnaturel',
  'Surnaturel': 'Surnaturel',
  'Supernaturel': 'Surnaturel',
  'Thriller': 'Thriller',
  'Suspense': 'Suspense',
  'Award Winning': 'Primé',
  'Avant Garde': 'Avant-garde',
  'Gourmet': 'Gastronomie',
  'Girls Love': 'Amour entre filles',
  'Boys Love': 'Amour entre garçons',
  'Shounen': 'Shōnen',
  'Shonen': 'Shōnen',
  'Shoujo': 'Shōjo',
  'Shojo': 'Shōjo',
  'Shoujo(G)': 'Shōjo',
  'Shôjo': 'Shōjo',
  'Shônen': 'Shōnen',
  'Seinen': 'Seinen',
  'Josei': 'Josei',
  'Isekai': 'Isekai',
  'Mecha': 'Mecha',
  'Harem': 'Harem',
  'Reverse Harem': 'Harem inversé',
  'Manga': 'Manga',
  'Manhwa': 'Manhwa',
  'Manhua': 'Manhua',
  'Webtoon': 'Webtoon',
  'Webtoons': 'Webtoon',
  'Webcomic': 'Webcomic',
  'Adult Cast': 'Distribution adulte',
  'Anthropomorphic': 'Anthropomorphe',
  'CGDCT': 'Filles mignonnes',
  'Childcare': 'Garde d\'enfants',
  'Crossdressing': 'Travestissement',
  'Delinquents': 'Délinquants',
  'Demons': 'Démons',
  'Gag Humor': 'Humour absurde',
  'Gore': 'Gore',
  'High Stakes Game': 'Jeu à haut risque',
  'Historical': 'Historique',
  'Historique': 'Historique',
  'Idols (Female)': 'Idoles (Femmes)',
  'Idols (Male)': 'Idoles (Hommes)',
  'Iyashikei': 'Iyashikei',
  'Love Polygon': 'Triangle amoureux',
  'Love Status Quo': 'Statu quo amoureux',
  'Magical Sex Shift': 'Changement de sexe magique',
  'Mahou Shoujo': 'Magical Girl',
  'Martial Arts': 'Arts martiaux',
  'Martial arts': 'Arts martiaux',
  'Arts Martiaux': 'Arts martiaux',
  'Art Martiaux': 'Arts martiaux',
  'Arts martiaux': 'Arts martiaux',
  'Medical': 'Médical',
  'Médical': 'Médical',
  'Military': 'Militaire',
  'Militaire': 'Militaire',
  'Music': 'Musique',
  'Musique': 'Musique',
  'Mythology': 'Mythologie',
  'Mythologie': 'Mythologie',
  'Organized Crime': 'Crime organisé',
  'Otaku Culture': 'Culture otaku',
  'Parody': 'Parodie',
  'Performing Arts': 'Arts du spectacle',
  'Pets': 'Animaux de compagnie',
  'Psychological': 'Psychologique',
  'Racing': 'Course',
  'Reincarnation': 'Réincarnation',
  'Reverse Harem': 'Harem inversé',
  'Romantic Subtext': 'Sous-texte romantique',
  'Samurai': 'Samouraï',
  'School': 'Vie Scolaire',
  'Sci-Fi': 'Science-Fiction',
  'Showbiz': 'Show-business',
  'Space': 'Espace',
  'Strategy Game': 'Jeu de stratégie',
  'Super Power': 'Super-pouvoir',
  'Survival': 'Survie',
  'Team Sports': 'Sport d\'équipe',
  'Time Travel': 'Voyage dans le temps',
  'Vampire': 'Vampire',
  'Video Game': 'Jeu vidéo',
  'Villainess': 'Méchante',
  'Visual Arts': 'Arts visuels',
  'Workplace': 'Lieu de travail',
  'Zombie': 'Zombie'
};

// Thèmes - Dictionnaire de traductions (version simplifiée pour backend)
const themeTranslations = {
  'Achronological Order': 'Ordre achrone',
  'Adult Cast': 'Distribution adulte',
  'Anthropomorphic': 'Anthropomorphe',
  'CGDCT': 'Filles mignonnes',
  'Childcare': 'Garde d\'enfants',
  'Combat Sports': 'Sports de combat',
  'Crossdressing': 'Travestissement',
  'Delinquents': 'Délinquants',
  'Detective': 'Détective',
  'Educational': 'Éducatif',
  'Gag Humor': 'Humour absurde',
  'Gore': 'Gore',
  'Harem': 'Harem',
  'High Stakes Game': 'Jeu à haut risque',
  'Historical': 'Historique',
  'Idols': 'Idoles',
  'Isekai': 'Isekai',
  'Iyashikei': 'Iyashikei',
  'Love Polygon': 'Triangle amoureux',
  'Magical Sex Shift': 'Changement de sexe magique',
  'Mahou Shoujo': 'Magical Girl',
  'Martial Arts': 'Arts martiaux',
  'Medical': 'Médical',
  'Military': 'Militaire',
  'Music': 'Musique',
  'Mythology': 'Mythologie',
  'Organized Crime': 'Crime organisé',
  'Parody': 'Parodie',
  'Performing Arts': 'Arts du spectacle',
  'Pets': 'Animaux de compagnie',
  'Psychological': 'Psychologique',
  'Racing': 'Course',
  'Reincarnation': 'Réincarnation',
  'Reverse Harem': 'Harem inversé',
  'Romantic Subtext': 'Sous-texte romantique',
  'Samurai': 'Samouraï',
  'School': 'Vie Scolaire',
  'Sci-Fi': 'Science-Fiction',
  'Showbiz': 'Show-business',
  'Space': 'Espace',
  'Strategy Game': 'Jeu de stratégie',
  'Super Power': 'Super-pouvoir',
  'Survival': 'Survie',
  'Team Sports': 'Sport d\'équipe',
  'Time Travel': 'Voyage dans le temps',
  'Vampire': 'Vampire',
  'Video Game': 'Jeu vidéo',
  'Villainess': 'Méchante',
  'Visual Arts': 'Arts visuels',
  'Workplace': 'Lieu de travail',
  'Zombie': 'Zombie'
};

/**
 * Traduit un genre/thème unique
 * @param {string} item - Genre ou thème à traduire
 * @param {Object} dictionary - Dictionnaire de traductions (genreTranslations ou themeTranslations)
 * @returns {string} - Traduction ou valeur originale si non trouvée
 */
function translateItem(item, dictionary) {
  if (!item || typeof item !== 'string') {
    return item || '';
  }
  const trimmed = item.trim();
  return dictionary[trimmed] || trimmed;
}

/**
 * Déduplique une liste de genres/thèmes en utilisant les traductions
 * Si deux valeurs VO différentes ont la même traduction VF, seule la première est conservée
 * @param {string|null|undefined} itemsString - Chaîne de genres/thèmes séparés par des virgules
 * @param {Object} dictionary - Dictionnaire de traductions (genreTranslations ou themeTranslations)
 * @returns {string|null} - Chaîne dédupliquée ou null si vide
 */
function deduplicateUsingTranslations(itemsString, dictionary) {
  if (!itemsString || typeof itemsString !== 'string') {
    return null;
  }
  
  const trimmed = itemsString.trim();
  if (trimmed === '') {
    return null;
  }
  
  // Séparer par virgules et nettoyer chaque élément
  const items = trimmed
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  if (items.length === 0) {
    return null;
  }
  
  // Dédupliquer en utilisant les traductions
  const seenTranslations = new Set();
  const result = [];
  
  for (const item of items) {
    // Traduire l'élément
    const translated = translateItem(item, dictionary);
    // Normaliser la traduction pour la comparaison (minuscules, espaces multiples)
    const normalizedTranslation = translated.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Si cette traduction n'a pas encore été vue, ajouter l'élément original
    if (!seenTranslations.has(normalizedTranslation)) {
      seenTranslations.add(normalizedTranslation);
      result.push(item);
    }
  }
  
  return result.length > 0 ? result.join(', ') : null;
}

/**
 * Normalise un nom pour la comparaison (insensible à la casse, accents, espaces)
 * @param {string} name - Nom à normaliser
 * @returns {string} - Nom normalisé
 */
function normalizeName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Supprimer les accents
}

/**
 * Charge la liste des équipes de scanlation à exclure des genres/thèmes
 * @returns {Set<string>} - Set des noms d'équipes normalisés à exclure
 */
function getExcludedScanTeams() {
  const fs = require('fs');
  const path = require('path');
  
  const excludedTeams = new Set();
  
  try {
    // Lire le fichier des équipes filtrées
    const teamsFile = path.join(__dirname, '../../docs_perso/Teams_filtrees.txt');
    if (fs.existsSync(teamsFile)) {
      const content = fs.readFileSync(teamsFile, 'utf-8');
      const lines = content.split('\n');
      
      // Extraire toutes les équipes (celles déjà présentes + celles à ajouter)
      let inExcludedSection = false;
      let inFilteredSection = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.includes('ÉQUIPES DÉJÀ PRÉSENTES')) {
          inExcludedSection = true;
          inFilteredSection = false;
          continue;
        }
        
        if (trimmed.includes('ÉQUIPES À AJOUTER')) {
          inExcludedSection = false;
          inFilteredSection = true;
          continue;
        }
        
        if (trimmed.startsWith('===') || trimmed === '' || trimmed.startsWith('Ce fichier') || trimmed.startsWith('Total') || trimmed.startsWith('Équipes')) {
          continue;
        }
        
        // Extraire les noms d'équipes (lignes qui commencent par "- " ou qui sont des noms simples)
        if (inExcludedSection || inFilteredSection) {
          let teamName = trimmed;
          if (teamName.startsWith('- ')) {
            teamName = teamName.substring(2).trim();
          }
          
          if (teamName && teamName.length > 0 && teamName.length < 100) { // Filtrer les lignes trop longues (descriptions)
            // Ajouter le nom original et sa version normalisée
            excludedTeams.add(teamName);
            excludedTeams.add(normalizeName(teamName));
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Impossible de charger la liste des équipes à exclure:', error.message);
  }
  
  // Ajouter aussi les équipes déjà dans les genres (section "Noms de scans")
  const scanTeamNames = [
    'Anteiku Scan', 'Astral Scan', 'Flamescans', 'Flamesscans', 'GoFast',
    'Little Garden', 'Moon Scans', 'Manga Corporation', 'OriTrad',
    'Osiris Scans', 'Pearlscan', 'Phénix scans', 'Raijin Scans',
    'Reaper Scans', 'Rimu Scans', 'Ryozanpaku Scantrad', 'Scantrad Union',
    'Secret du roi', 'Starbound Scans', 'Tappytoon', 'Team Clachoufoufou',
    'BAKA-Ecchi', 'Manga hentai', 'Manga romance', 'Little Breasts',
    'Slave', 'Perf', 'Japonais'
  ];
  
  for (const team of scanTeamNames) {
    excludedTeams.add(team);
    excludedTeams.add(normalizeName(team));
  }
  
  return excludedTeams;
}

/**
 * Vérifie si un nom est une équipe de scanlation à exclure
 * @param {string} name - Nom à vérifier
 * @param {Set<string>} excludedTeams - Set des équipes à exclure (optionnel, sera chargé si non fourni)
 * @returns {boolean} - True si le nom doit être exclu
 */
function isScanTeam(name, excludedTeams = null) {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  if (!excludedTeams) {
    excludedTeams = getExcludedScanTeams();
  }
  
  const normalized = normalizeName(name);
  return excludedTeams.has(name) || excludedTeams.has(normalized);
}

module.exports = {
  genreTranslations,
  themeTranslations,
  translateItem,
  deduplicateUsingTranslations,
  getExcludedScanTeams,
  isScanTeam,
  normalizeName
};
