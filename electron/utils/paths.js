const path = require('path');
const fs = require('fs');

/**
 * Gestionnaire centralisé des chemins de l'application
 */
class PathManager {
  constructor(baseDirectory) {
    this.baseDirectory = baseDirectory;
  }

  /**
   * Retourne tous les chemins de l'application
   */
  getPaths() {
    const coversBase = path.join(this.baseDirectory, 'covers');
    return {
      base: this.baseDirectory,
      configs: path.join(this.baseDirectory, 'configs'),
      databases: path.join(this.baseDirectory, 'databases'),
      profiles: path.join(this.baseDirectory, 'profiles'),
      covers: coversBase,
      // Alias historique (anciennes versions utilisaient covers/series)
      series: path.join(coversBase, this.resolveMediaCategory('Manga'))
    };
  }

  /**
   * Crée toute l'arborescence nécessaire
   */
  initializeStructure() {
    const paths = this.getPaths();
    
    console.log('📁 Création de l\'arborescence...');
    
    // Créer les dossiers principaux
    // Note: configs n'est plus utilisé (les bases sont dans databases/ à la racine)
    const directories = [
      paths.databases,
      paths.profiles,
      paths.covers
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  ✅ ${path.relative(this.baseDirectory, dir)}/`);
      }
    });

    // Créer les dossiers de catégories média courantes
    const defaultCategories = [
      'Manga',
      'Light_Novel',
      'Webtoon',
      'Anime',
      'Adult_Game'
    ];

    defaultCategories.forEach(category => {
      const categoryPath = this.getMediaCategoryPath(category);
      if (!fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath, { recursive: true });
        console.log(`  ✅ ${path.relative(this.baseDirectory, categoryPath)}/`);
      }
    });

    console.log('✅ Arborescence créée avec succès !');
  }

  /**
   * Vérifie si la structure existe et est valide
   */
  isValidStructure() {
    const paths = this.getPaths();
    if (!fs.existsSync(this.baseDirectory)) {
      return false;
    }

    const essentials = [
      paths.databases,
      paths.profiles,
      paths.covers
    ];

    return essentials.every(dir => fs.existsSync(dir));
  }

  /**
   * Retourne le chemin d'un profil utilisateur
   */
  getProfilePath(userName) {
    return path.join(this.getPaths().profiles, `${userName.toLowerCase()}.webp`);
  }

  /**
   * Retourne le chemin d'une série
   */
  resolveMediaCategory(category) {
    const value = (category || 'Manga').toString().trim();
    if (!value) return 'Manga';

    const lower = value.toLowerCase();
    if (lower.includes('light') && lower.includes('novel')) return 'Light_Novel';
    if (lower.includes('novel')) return 'Light_Novel';
    if (lower.includes('anime')) return 'Anime';
    if (lower.includes('adult') && lower.includes('game')) return 'Adult_Game';
    if (lower.includes('adulte')) return 'Adult_Game';
    if (lower.includes('manhwa') || lower.includes('manhua') || lower.includes('webtoon')) return 'Webtoon';
    if (lower.includes('doujin')) return 'Doujinshi';

    // Remplacer espaces et caractères spéciaux par underscore
    return value
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .split('_')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('_') || 'Manga';
  }

  getMediaCategoryPath(category) {
    const resolved = this.resolveMediaCategory(category);
    const coversBase = this.getPaths().covers;
    return path.join(coversBase, resolved);
  }

  getSeriesPath(serieSlug, category = 'Manga') {
    return path.join(this.getMediaCategoryPath(category), serieSlug);
  }

  /**
   * Retourne le chemin des tomes d'une série
   */
  getTomesPath(serieSlug, category = 'Manga') {
    return path.join(this.getSeriesPath(serieSlug, category), 'tomes');
  }
}

module.exports = { PathManager };
