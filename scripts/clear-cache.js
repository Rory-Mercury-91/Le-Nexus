#!/usr/bin/env node

/**
 * Script pour vider le cache Electron
 * Utile en cas d'erreurs de cache ou de comportements étranges
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const appName = 'le-nexus';
const appNameAlt = 'Le Nexus';
const platform = os.platform();

console.log('🧹 Nettoyage des données locales de l’application...');

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    try {
      fs.rmSync(folderPath, { recursive: true, force: true });
      console.log(`  🗑️  Supprimé: ${folderPath}`);
    } catch (e) {
      try {
        // Fallback manuel si rmSync échoue
        fs.readdirSync(folderPath).forEach((file) => {
          const curPath = path.join(folderPath, file);
          if (fs.lstatSync(curPath).isDirectory()) {
            deleteFolderRecursive(curPath);
          } else {
            try { fs.unlinkSync(curPath); } catch {}
          }
        });
        try { fs.rmdirSync(folderPath); } catch {}
        console.log(`  🗑️  Supprimé (fallback): ${folderPath}`);
      } catch (err) {
        console.warn(`  ⚠️  Impossible de supprimer ${folderPath}: ${err.message}`);
      }
    }
  }
}

try {
  const targets = [];

  if (platform === 'win32') {
    const appDataRoaming = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const appDataLocal = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

    // Dossiers userData possibles (selon nom affiché)
    targets.push(path.join(appDataRoaming, appName));
    targets.push(path.join(appDataRoaming, appNameAlt));

    // Caches locaux éventuels
    targets.push(path.join(appDataLocal, appName));
    targets.push(path.join(appDataLocal, appNameAlt));

    // Cookies/Partitions (persist_lenexus) sous userData (nom affiché)
    targets.push(path.join(appDataRoaming, appNameAlt, 'Partitions'));
    targets.push(path.join(appDataRoaming, appNameAlt, 'Cookies'));

    // Nettoyage du registre Windows (si possible)
    try {
      const { execSync } = require('child_process');
      console.log('🧹 Nettoyage du registre Windows (HKCU) ...');
      const keys = [
        'HKCU\\Software\\Le Nexus',
        'HKCU\\Software\\le-nexus',
        'HKCU\\Software\\Electron\\Le Nexus',
        'HKCU\\Software\\Electron\\le-nexus'
      ];
      keys.forEach(k => {
        try {
          execSync(`reg query "${k}" >NUL 2>&1`);
          execSync(`reg delete "${k}" /f`);
          console.log(`  🗑️  Clé registre supprimée: ${k}`);
        } catch {
          // clé absente ou droits insuffisants
        }
      });
    } catch (e) {
      console.warn('  ⚠️  Impossible de nettoyer le registre (droits admin requis ?)');
    }
  } else if (platform === 'darwin') {
    targets.push(path.join(os.homedir(), 'Library', 'Application Support', appName));
    targets.push(path.join(os.homedir(), 'Library', 'Application Support', appNameAlt));
  } else {
    targets.push(path.join(os.homedir(), '.config', appName));
    targets.push(path.join(os.homedir(), '.config', appNameAlt));
  }

  if (targets.length === 0) {
    console.log('ℹ️  Aucun chemin cible déterminé.');
  }

  targets.forEach(deleteFolderRecursive);

  console.log('✅ Nettoyage des données locales terminé.');
  console.log('💡 Relancez l\'application avec : npm run dev');
} catch (error) {
  console.error('❌ Erreur lors de la suppression du cache:', error.message);
  process.exit(1);
}
