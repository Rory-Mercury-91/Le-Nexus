#!/usr/bin/env node

/**
 * Nettoyage complet pour repartir d'une base saine:
 * - Données locales/appdata + cookies + registre
 * - Caches et artefacts de build (vite, electron-builder, dist, build)
 * - Résidus d'installation (Windows: %LOCALAPPDATA%/Programs)
 * - Raccourcis Start Menu / Bureau (Windows)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

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

function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`  🗑️  Supprimé: ${filePath}`);
    }
  } catch (e) {
    console.warn(`  ⚠️  Impossible de supprimer ${filePath}: ${e.message}`);
  }
}

function deleteFolderRecursive(folderPath) {
  if (!fs.existsSync(folderPath)) return;

  try {
    fs.rmSync(folderPath, { recursive: true, force: true });
    console.log(`  🗑️  Supprimé: ${folderPath}`);
  } catch (e) {
    try {
      fs.readdirSync(folderPath).forEach((file) => {
        const curPath = path.join(folderPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          deleteFolderRecursive(curPath);
        } else {
          safeUnlink(curPath);
        }
      });
      fs.rmdirSync(folderPath);
      console.log(`  🗑️  Supprimé (fallback): ${folderPath}`);
    } catch (err) {
      console.warn(`  ⚠️  Impossible de supprimer ${folderPath}: ${err.message}`);
    }
  }
}

function cleanLocalData() {
  console.log('➡️  Étape 1: Données locales + registre');

  const appName = 'le-nexus';
  const appNameAlt = 'Le Nexus';
  const platform = os.platform();
  const targets = [];

  if (platform === 'win32') {
    const appDataRoaming = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const appDataLocal = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

    targets.push(path.join(appDataRoaming, appName));
    targets.push(path.join(appDataRoaming, appNameAlt));
    targets.push(path.join(appDataLocal, appName));
    targets.push(path.join(appDataLocal, appNameAlt));
    targets.push(path.join(appDataRoaming, appNameAlt, 'Partitions'));
    targets.push(path.join(appDataRoaming, appNameAlt, 'Cookies'));

    try {
      console.log('  🧹 Nettoyage du registre Windows (HKCU)...');
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
          console.log(`    🗑️  Clé registre supprimée: ${k}`);
        } catch {
          // clé absente ou droits insuffisants
        }
      });
    } catch (error) {
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
  console.log('✅ Données locales nettoyées.');
}

function cleanProjectCaches() {
  console.log('➡️  Étape 2: Caches/artefacts du projet');
  const cwd = process.cwd();
  [
    path.join(cwd, 'dist'),
    path.join(cwd, '.vite'),
    path.join(cwd, '.cache'),
    path.join(cwd, 'node_modules', '.vite'),
    path.join(cwd, 'node_modules', '.cache')
  ].forEach(rm);

  const buildDir = path.join(cwd, 'build');
  if (fs.existsSync(buildDir)) {
    try {
      console.log(`  🧹 Nettoyage sélectif: ${buildDir}`);
      const files = fs.readdirSync(buildDir);
      files.forEach(file => {
        const fp = path.join(buildDir, file);
        if (!file.endsWith('.nsh')) {
          rm(fp);
        }
      });
    } catch (e) {
      console.warn(`  ⚠️  Erreur nettoyage build/: ${e.message}`);
    }
  }
}

function cleanElectronBuilderCache() {
  console.log('➡️  Étape 3: Cache electron-builder');

  const platform = os.platform();
  let cachePath;

  if (platform === 'win32') {
    cachePath = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache');
  } else if (platform === 'darwin') {
    cachePath = path.join(os.homedir(), 'Library', 'Caches', 'electron-builder');
  } else {
    cachePath = path.join(os.homedir(), '.cache', 'electron-builder');
  }

  if (cachePath && fs.existsSync(cachePath)) {
    console.log(`  🧹 Cache principal: ${cachePath}`);

    const nsisIconCache = path.join(cachePath, 'iconCache');
    if (fs.existsSync(nsisIconCache)) {
      console.log(`    🧹 Cache icônes NSIS: ${nsisIconCache}`);
      rm(nsisIconCache);
    }

    const winCodeSignCache = path.join(cachePath, 'winCodeSign');
    if (fs.existsSync(winCodeSignCache)) {
      console.log(`    🧹 Cache winCodeSign: ${winCodeSignCache}`);
      rm(winCodeSignCache);
    }

    rm(cachePath);
  } else {
    console.log(`ℹ️  Aucun cache electron-builder trouvé à: ${cachePath}`);
  }

  const localBuildPath = path.join(process.cwd(), 'build');
  if (fs.existsSync(localBuildPath)) {
    console.log(`  🧹 Dossier build local: ${localBuildPath}`);
    try {
      const files = fs.readdirSync(localBuildPath);
      files.forEach(file => {
        const filePath = path.join(localBuildPath, file);
        if (file.endsWith('.nsh')) return;
        if (fs.lstatSync(filePath).isDirectory()) {
          rm(filePath);
        } else {
          safeUnlink(filePath);
        }
      });
    } catch (error) {
      console.warn(`  ⚠️  Erreur lors du nettoyage de build: ${error.message}`);
    }
  }

  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    console.log(`  🧹 Dossier dist: ${distPath}`);
    try {
      const files = fs.readdirSync(distPath);
      files.forEach(file => {
        if (file.endsWith('.exe') || file.endsWith('.nsis.7z') || file.includes('installer')) {
          safeUnlink(path.join(distPath, file));
        }
      });
    } catch (error) {
      console.warn(`  ⚠️  Erreur lors du nettoyage de dist: ${error.message}`);
    }
  }

  console.log('✅ Cache electron-builder nettoyé.');
}

function cleanWindowsResidues() {
  if (os.platform() !== 'win32') return;

  console.log('➡️  Étape 4: Résidus d’installation Windows');
  const localApp = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const programsDir = path.join(localApp, 'Programs');
  [
    path.join(programsDir, 'Nexus'),
    path.join(programsDir, 'Le Nexus'),
    path.join(programsDir, 'le-nexus')
  ].forEach(rm);

  const startMenu = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
  [
    path.join(startMenu, 'Nexus.lnk'),
    path.join(startMenu, 'Le Nexus.lnk')
  ].forEach(safeUnlink);

  const desktop = path.join(os.homedir(), 'Desktop');
  [
    path.join(desktop, 'Nexus.lnk'),
    path.join(desktop, 'Le Nexus.lnk')
  ].forEach(safeUnlink);
}

console.log('🧹 Nettoyage complet (base build propre) ...');
cleanLocalData();
cleanProjectCaches();
cleanElectronBuilderCache();
cleanWindowsResidues();

console.log('✅ Nettoyage complet terminé.');
console.log('💡 Relance dev: npm run dev');
console.log('💡 Build propre: npm run build:win:fresh');
