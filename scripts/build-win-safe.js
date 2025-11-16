#!/usr/bin/env node

/**
 * Script de build Windows sécurisé qui évite les problèmes avec winCodeSign
 * Ce script configure les variables d'environnement nécessaires pour désactiver
 * complètement le code signing et éviter le téléchargement de winCodeSign
 */

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

console.log('🔨 Build Windows sécurisé...\n');

// Définir les variables d'environnement pour désactiver le code signing
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
// Ne pas définir WIN_CSC_LINK et WIN_CSC_KEY_PASSWORD (les laisser undefined)
// car electron-builder essaie de les résoudre même si vides
delete process.env.CSC_LINK;
delete process.env.CSC_KEY_PASSWORD;
delete process.env.WIN_CSC_LINK;
delete process.env.WIN_CSC_KEY_PASSWORD;

// Nettoyer le cache winCodeSign avant le build
const platform = os.platform();
let cachePath;

if (platform === 'win32') {
  cachePath = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign');
} else {
  console.log('⚠️  Ce script est conçu pour Windows uniquement');
  process.exit(1);
}

const fs = require('fs');
if (fs.existsSync(cachePath)) {
  console.log('🧹 Nettoyage du cache winCodeSign...');
  try {
    fs.rmSync(cachePath, { recursive: true, force: true });
    console.log('✅ Cache winCodeSign nettoyé\n');
  } catch (error) {
    console.warn(`⚠️  Impossible de nettoyer le cache (peut nécessiter des droits admin): ${error.message}\n`);
    console.warn('💡 Essayez d\'exécuter PowerShell en tant qu\'administrateur\n');
  }
}

// Exécuter le build
console.log('📦 Lancement du build...\n');

try {
  // D'abord, builder le frontend
  console.log('1️⃣  Build du frontend...');
  execSync('node scripts/build-vite-quiet.js', { stdio: 'inherit' });
  
  // Ensuite, builder l'application Electron
  console.log('\n2️⃣  Build de l\'application Electron...');
  // Créer un environnement propre sans les variables de code signing
  const cleanEnv = { ...process.env };
  cleanEnv.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
  delete cleanEnv.CSC_LINK;
  delete cleanEnv.CSC_KEY_PASSWORD;
  delete cleanEnv.WIN_CSC_LINK;
  delete cleanEnv.WIN_CSC_KEY_PASSWORD;
  
  // Utiliser 7-Zip avec l'option -y pour accepter automatiquement et ignorer les erreurs
  // Cela permet d'ignorer les erreurs de liens symboliques macOS qui ne sont pas nécessaires pour Windows
  const originalPath = process.env.PATH;
  const sevenZipPath = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64');
  
  // Modifier temporairement PATH pour utiliser notre 7-Zip
  cleanEnv.PATH = `${sevenZipPath}${path.delimiter}${originalPath}`;
  
  // Ajouter une variable pour forcer 7-Zip à ignorer les erreurs de liens symboliques
  cleanEnv.SEVEN_ZIP_IGNORE_SYMLINK_ERRORS = '1';
  
  execSync('electron-builder --win --x64 --config.win.sign=null', {
    stdio: 'inherit',
    env: cleanEnv
  });
  
  console.log('\n✅ Build terminé avec succès !');
} catch (error) {
  console.error('\n❌ Erreur lors du build:', error.message);
  process.exit(1);
}
