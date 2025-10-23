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
    return {
      base: this.baseDirectory,
      configs: path.join(this.baseDirectory, 'configs'),
      database: path.join(this.baseDirectory, 'configs', 'manga.db'),
      databases: path.join(this.baseDirectory, 'configs', 'databases'),
      profiles: path.join(this.baseDirectory, 'profiles'),
      covers: path.join(this.baseDirectory, 'covers'),
      series: path.join(this.baseDirectory, 'covers', 'series')
    };
  }

  /**
   * Crée toute l'arborescence nécessaire
   */
  initializeStructure() {
    const paths = this.getPaths();
    
    console.log('📁 Création de l\'arborescence...');
    
    // Créer les dossiers principaux
    const directories = [
      paths.configs,
      paths.databases,
      paths.profiles,
      paths.covers,
      paths.series
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  ✅ ${path.relative(this.baseDirectory, dir)}/`);
      }
    });

    console.log('✅ Arborescence créée avec succès !');
  }

  /**
   * Vérifie si la structure existe et est valide
   */
  isValidStructure() {
    const paths = this.getPaths();
    return fs.existsSync(paths.configs) && 
           fs.existsSync(paths.profiles) && 
           fs.existsSync(paths.series);
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
  getSeriesPath(serieSlug) {
    return path.join(this.getPaths().series, serieSlug);
  }

  /**
   * Retourne le chemin des tomes d'une série
   */
  getTomesPath(serieSlug) {
    return path.join(this.getSeriesPath(serieSlug), 'tomes');
  }
}

module.exports = { PathManager };
