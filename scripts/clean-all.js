#!/usr/bin/env node

/**
 * Nettoyage complet pour repartir d'une base saine:
 * - Données locales/appdata + cookies + registre (via clear-cache)
 * - Caches et artefacts de build (vite, electron-builder, dist, build)
 * - Résidus d'installation (Windows: %LOCALAPPDATA%/Programs)
 * - Raccourcis Start Menu / Bureau (Windows)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawnSync } = require('child_process');

function rm(targetPath) {
  try {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`  🗑️  Supprimé: ${targetPath}`);
    }
  } catch (e) {
    console.warn(`  ⚠️  Impossible de supprimer ${targetPath}: ${e.message}`);
  }
}

function removeWindowsShortcut(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`  🗑️  Raccourci supprimé: ${filePath}`);
    }
  } catch (e) {
    console.warn(`  ⚠️  Impossible de supprimer le raccourci ${filePath}: ${e.message}`);
  }
}

console.log('🧹 Nettoyage complet (base build propre) ...');

// 1) Nettoyage des données locales + registre via le script existant
try {
  console.log('➡️  Etape 1: Données locales + registre');
  const res = spawnSync(process.execPath, [path.join('scripts', 'clear-cache.js')], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.warn('  ⚠️  clear-cache a retourné un code non nul, on continue quand même.');
  }
} catch (e) {
  console.warn(`  ⚠️  clear-cache a échoué: ${e.message}`);
}

// 2) Nettoyage caches et artefacts de build locaux
console.log('➡️  Etape 2: Caches/artefacts du projet');
const cwd = process.cwd();
[
  path.join(cwd, 'dist'),
  path.join(cwd, '.vite'),
  path.join(cwd, '.cache'),
  path.join(cwd, 'node_modules', '.vite'),
  path.join(cwd, 'node_modules', '.cache')
].forEach(rm);

// Dossier build: supprimer tout sauf les .nsh si on veut conserver l'include NSIS
const buildDir = path.join(cwd, 'build');
if (fs.existsSync(buildDir)) {
  try {
    console.log(`  🧹 Nettoyage sélectif: ${buildDir}`);
    const files = fs.readdirSync(buildDir);
    files.forEach(file => {
      const fp = path.join(buildDir, file);
      // Conserver les scripts .nsh
      if (!file.endsWith('.nsh')) {
        rm(fp);
      }
    });
  } catch (e) {
    console.warn(`  ⚠️  Erreur nettoyage build/: ${e.message}`);
  }
}

// 3) Cache electron-builder via le script dédié
try {
  console.log('➡️  Etape 3: Cache electron-builder');
  const res2 = spawnSync(process.execPath, [path.join('scripts', 'clean-electron-builder-cache.js')], { stdio: 'inherit' });
  if (res2.status !== 0) {
    console.warn('  ⚠️  clean-electron-builder-cache a retourné un code non nul, on continue.');
  }
} catch (e) {
  console.warn(`  ⚠️  clean-electron-builder-cache a échoué: ${e.message}`);
}

// 4) Résidus d'installation (Windows uniquement)
if (os.platform() === 'win32') {
  console.log('➡️  Etape 4: Résidus d’installation Windows');
  const localApp = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  // electron-builder (productName: "Nexus") installe sous %LOCALAPPDATA%/Programs
  const programsDir = path.join(localApp, 'Programs');
  [
    path.join(programsDir, 'Nexus'),
    path.join(programsDir, 'Le Nexus'),
    path.join(programsDir, 'le-nexus')
  ].forEach(rm);

  // Raccourcis Start Menu
  const startMenu = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
  [
    path.join(startMenu, 'Nexus.lnk'),
    path.join(startMenu, 'Le Nexus.lnk')
  ].forEach(removeWindowsShortcut);

  // Raccourcis Bureau
  const desktop = path.join(os.homedir(), 'Desktop');
  [
    path.join(desktop, 'Nexus.lnk'),
    path.join(desktop, 'Le Nexus.lnk')
  ].forEach(removeWindowsShortcut);
}

console.log('✅ Nettoyage complet terminé.');
console.log('💡 Relance dev: npm run dev');
console.log('💡 Build propre: npm run build:win:fresh');
