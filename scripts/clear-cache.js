#!/usr/bin/env node

/**
 * Script pour vider le cache Electron
 * Utile en cas d'erreurs de cache ou de comportements étranges
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const appName = 'ma-mangatheque';
const platform = os.platform();

let cachePath;

// Déterminer le chemin du cache selon la plateforme
if (platform === 'win32') {
  cachePath = path.join(process.env.APPDATA || '', appName);
} else if (platform === 'darwin') {
  cachePath = path.join(os.homedir(), 'Library', 'Application Support', appName);
} else {
  cachePath = path.join(os.homedir(), '.config', appName);
}

console.log('🧹 Nettoyage du cache Electron...');
console.log(`📁 Chemin du cache : ${cachePath}`);

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}

try {
  if (fs.existsSync(cachePath)) {
    deleteFolderRecursive(cachePath);
    console.log('✅ Cache Electron supprimé avec succès !');
    console.log('💡 Relancez l\'application avec : npm start');
  } else {
    console.log('ℹ️  Aucun cache à supprimer.');
  }
} catch (error) {
  console.error('❌ Erreur lors de la suppression du cache:', error.message);
  process.exit(1);
}

