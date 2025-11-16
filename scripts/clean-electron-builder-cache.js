const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Nettoie le cache d'electron-builder pour forcer la régénération des icônes
 */
function cleanElectronBuilderCache() {
  try {
    const platform = os.platform();
    let cachePath;

    if (platform === 'win32') {
      // Windows: %LOCALAPPDATA%\electron-builder\Cache
      cachePath = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache');
    } else if (platform === 'darwin') {
      // macOS: ~/Library/Caches/electron-builder
      cachePath = path.join(os.homedir(), 'Library', 'Caches', 'electron-builder');
    } else {
      // Linux: ~/.cache/electron-builder
      cachePath = path.join(os.homedir(), '.cache', 'electron-builder');
    }

    if (fs.existsSync(cachePath)) {
      console.log(`🧹 Nettoyage du cache electron-builder: ${cachePath}`);
      
      // Nettoyer aussi le cache des icônes NSIS si il existe (avant de supprimer le cache principal)
      const nsisIconCache = path.join(cachePath, 'iconCache');
      if (fs.existsSync(nsisIconCache)) {
        console.log(`🧹 Nettoyage du cache des icônes NSIS: ${nsisIconCache}`);
        fs.rmSync(nsisIconCache, { recursive: true, force: true });
        console.log('✅ Cache des icônes NSIS nettoyé avec succès');
      }
      
      // Nettoyer le cache winCodeSign qui peut causer des problèmes avec les liens symboliques
      const winCodeSignCache = path.join(cachePath, 'winCodeSign');
      if (fs.existsSync(winCodeSignCache)) {
        console.log(`🧹 Nettoyage du cache winCodeSign: ${winCodeSignCache}`);
        try {
          fs.rmSync(winCodeSignCache, { recursive: true, force: true });
          console.log('✅ Cache winCodeSign nettoyé avec succès');
        } catch (error) {
          console.warn(`  ⚠️  Erreur lors du nettoyage de winCodeSign (peut nécessiter des droits admin): ${error.message}`);
          console.warn(`  💡 Essayez d'exécuter en tant qu'administrateur ou supprimez manuellement: ${winCodeSignCache}`);
        }
      }
      
      // Supprimer le dossier de cache principal
      try {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log('✅ Cache electron-builder nettoyé avec succès');
      } catch (error) {
        console.warn(`  ⚠️  Erreur lors du nettoyage du cache principal: ${error.message}`);
        console.warn(`  💡 Essayez d'exécuter en tant qu'administrateur ou supprimez manuellement: ${cachePath}`);
      }
    } else {
      console.log(`ℹ️  Aucun cache electron-builder trouvé à: ${cachePath}`);
    }

    // Nettoyer aussi le cache dans le dossier build local si il existe
    const localBuildPath = path.join(process.cwd(), 'build');
    if (fs.existsSync(localBuildPath)) {
      console.log(`🧹 Nettoyage du dossier build local: ${localBuildPath}`);
      // Ne pas supprimer le dossier build entier car il contient installer.nsh
      // Supprimer seulement les fichiers temporaires
      try {
        const files = fs.readdirSync(localBuildPath);
        files.forEach(file => {
          const filePath = path.join(localBuildPath, file);
          if (file !== 'installer.nsh' && !file.endsWith('.nsh')) {
            if (fs.lstatSync(filePath).isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
            console.log(`  🗑️  Supprimé: ${file}`);
          }
        });
      } catch (error) {
        console.warn(`  ⚠️  Erreur lors du nettoyage de build: ${error.message}`);
      }
    }

    // Nettoyer aussi le dossier dist qui peut contenir d'anciens builds
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      console.log(`🧹 Nettoyage du dossier dist: ${distPath}`);
      // Ne supprimer que les fichiers d'installation, pas tout le dossier
      try {
        const files = fs.readdirSync(distPath);
        files.forEach(file => {
          if (file.endsWith('.exe') || file.endsWith('.nsis.7z') || file.includes('installer')) {
            const filePath = path.join(distPath, file);
            fs.unlinkSync(filePath);
            console.log(`  🗑️  Supprimé: ${file}`);
          }
        });
      } catch (error) {
        console.warn(`  ⚠️  Erreur lors du nettoyage de dist: ${error.message}`);
      }
    }

    console.log('✅ Nettoyage terminé. La prochaine compilation utilisera la nouvelle icône.');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage du cache:', error.message);
    process.exit(1);
  }
}

cleanElectronBuilderCache();
