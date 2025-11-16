/**
 * Script pour afficher le rapport de coverage IPC en temps réel
 * Affiche les fonctions appelées pendant l'exécution de l'application
 */

const fs = require('fs');
const path = require('path');

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function toRelativePath(filePath) {
  const normalized = normalizePath(filePath);
  const cwd = normalizePath(process.cwd());

  if (normalized.toLowerCase().startsWith(cwd.toLowerCase())) {
    return normalized.slice(cwd.length + 1);
  }

  const markers = ['/electron/', '/src/', '/tampermonkey/'];
  for (const marker of markers) {
    const idx = normalized.toLowerCase().indexOf(marker);
    if (idx !== -1) {
      return normalized.slice(idx + 1); // supprimer le slash précédent
    }
  }

  return normalized;
}

function buildChannelUsageMap(data) {
  const map = new Map();
  const baseNameMap = new Map();

  (data.channels || []).forEach(channel => {
    if (!channel.filePath) {
      return;
    }

    const relative = toRelativePath(channel.filePath);
    const key = normalizePath(relative).toLowerCase();

    if (!map.has(key)) {
      const entry = {
        file: relative,
        totalCalls: 0,
        channels: [],
        baseName: path.basename(relative).toLowerCase()
      };
      map.set(key, entry);

      const baseKey = entry.baseName;
      if (!baseNameMap.has(baseKey)) {
        baseNameMap.set(baseKey, []);
      }
      baseNameMap.get(baseKey).push(entry);
    }

    const entry = map.get(key);
    entry.totalCalls += channel.count || 0;
    entry.channels.push(channel);
  });

  return { byPath: map, byBaseName: baseNameMap };
}

function loadCoverageReport() {
  // Utiliser le chemin standard d'Electron ou un chemin par défaut
  let userDataPath;
  try {
    const app = require('electron').app;
    userDataPath = app.getPath('userData');
  } catch (e) {
    // Si Electron n'est pas disponible (script Node.js pur)
    // Essayer les deux chemins possibles : le-nexus (nom package) et Le Nexus (productName)
    const appDataPath = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
    const path1 = path.join(appDataPath, 'le-nexus');
    const path2 = path.join(appDataPath, 'Le Nexus');
    
    // Vérifier quel chemin existe
    if (fs.existsSync(path.join(path1, 'ipc-coverage.json'))) {
      userDataPath = path1;
    } else if (fs.existsSync(path.join(path2, 'ipc-coverage.json'))) {
      userDataPath = path2;
    } else {
      // Par défaut, utiliser le-nexus (nom du package)
      userDataPath = path1;
    }
  }
  
  const coveragePath = path.join(userDataPath, 'ipc-coverage.json');

  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Aucun rapport IPC trouvé.');
    console.log('');
    console.log('📁 Chemins vérifiés :');
    
    // Afficher tous les chemins possibles
    const appDataPath = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
    const path1 = path.join(appDataPath, 'le-nexus', 'ipc-coverage.json');
    const path2 = path.join(appDataPath, 'Le Nexus', 'ipc-coverage.json');
    
    console.log(`   1. ${path1}`);
    console.log(`      ${fs.existsSync(path1) ? '✅ Existe' : '❌ N\'existe pas'}`);
    console.log(`   2. ${path2}`);
    console.log(`      ${fs.existsSync(path2) ? '✅ Existe' : '❌ N\'existe pas'}`);
    console.log('');
    console.log('💡 Instructions :');
    console.log('   1. Lancez l\'application : npm start');
    console.log('   2. Utilisez l\'application (naviguez, cliquez, etc.)');
    console.log('   3. Le rapport sera généré automatiquement après quelques actions');
    console.log('   4. Relancez ce script pour voir le rapport');
    console.log('');
    console.log('💡 Le suivi est activé par défaut.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  return data;
}

function loadFunctionList() {
  const functionListPath = path.join(process.cwd(), 'docs_perso', 'function-list.json');

  if (!fs.existsSync(functionListPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(functionListPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('⚠️ Impossible de lire docs_perso/function-list.json :', error.message);
    return null;
  }
}

function analyzeFunctionUsage(functionList, channelUsage) {
  if (!functionList) {
    return null;
  }

  const categories = {};
  const groups = [
    { key: 'electron', label: 'Electron (handlers / services)' },
    { key: 'src', label: 'Frontend (React)' }
  ];

  groups.forEach(group => {
    const entries = Array.isArray(functionList[group.key]) ? functionList[group.key] : [];
    const stats = {
      label: group.label,
      totalFiles: entries.length,
      totalFunctions: entries.reduce((sum, item) => sum + (item.functions?.length || 0), 0),
      usedFiles: [],
      unusedFiles: []
    };

    entries.forEach(item => {
      const key = normalizePath(item.file || '').toLowerCase();
      const baseName = path.basename(item.file || '').toLowerCase();
      let usage = null;

      if (channelUsage.byPath.has(key)) {
        usage = channelUsage.byPath.get(key);
      } else {
        const baseMatches = channelUsage.byBaseName.get(baseName) || [];
        if (baseMatches.length === 1) {
          usage = baseMatches[0];
        }
      }

      if (usage) {
        stats.usedFiles.push({
          ...item,
          calls: usage.totalCalls,
          channels: usage.channels
        });
      } else {
        stats.unusedFiles.push(item);
      }
    });

    categories[group.key] = stats;
  });

  return categories;
}

function printFunctionUsage(usageByCategory) {
  if (!usageByCategory) {
    return;
  }

  console.log('═'.repeat(60));
  console.log('\n📁 Synthèse des exports surveillés\n');

  Object.entries(usageByCategory).forEach(([key, stats]) => {
    if (!stats || stats.totalFiles === 0) {
      return;
    }

    console.log(`🔹 ${stats.label}`);
    console.log(`   Fichiers analysés : ${stats.totalFiles}`);
    console.log(`   Fonctions exportées : ${stats.totalFunctions}`);
    console.log(`   Fichiers utilisés : ${stats.usedFiles.length}`);
    console.log(`   Fichiers non utilisés : ${stats.unusedFiles.length}`);

    if (stats.usedFiles.length > 0) {
      const topUsed = stats.usedFiles
        .slice()
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 5);
      console.log('   Top fichiers utilisés :');
      topUsed.forEach(item => {
        console.log(`      - ${item.file} (${item.calls} appel${item.calls > 1 ? 's' : ''})`);
      });
    }

    if (stats.unusedFiles.length > 0) {
      const toDisplay = stats.unusedFiles.slice(0, 5);
      console.log('   Exports non utilisés :');
      toDisplay.forEach(item => {
        const suffix = item.functions && item.functions.length
          ? ` (${item.functions.length} fonction${item.functions.length > 1 ? 's' : ''})`
          : '';
        console.log(`      - ${item.file}${suffix}`);
      });
      if (stats.unusedFiles.length > toDisplay.length) {
        console.log(`      ... ${stats.unusedFiles.length - toDisplay.length} supplémentaire(s)`);
      }
    }

    if (key === 'src') {
      console.log('   ⚠️ Rappel : le tracker IPC ne couvre que le backend Electron.');
      console.log('      Les composants React apparaîtront comme non utilisés tant qu’ils ne sont pas testés.');
    }

    console.log('');
  });
}

function displayReport(data, functionUsage) {
  console.log('\n📊 RAPPORT DE COVERAGE IPC (CUMULATIF)\n');
  console.log('═'.repeat(60));
  
  // Afficher la durée totale si disponible
  if (data.totalDuration) {
    const hours = Math.floor(data.totalDuration / 3600000);
    const minutes = Math.floor((data.totalDuration % 3600000) / 60000);
    const seconds = Math.floor((data.totalDuration % 60000) / 1000);
    console.log(`⏱️  Durée totale d'exécution : ${hours}h ${minutes}m ${seconds}s`);
  } else if (data.duration) {
    console.log(`⏱️  Durée d'exécution : ${Math.round(data.duration / 1000)}s`);
  }
  
  if (data.initialStartTime) {
    const startDate = new Date(data.initialStartTime);
    console.log(`📅 Début du suivi : ${startDate.toLocaleString()}`);
  }
  if (data.lastUpdateTime) {
    const lastUpdate = new Date(data.lastUpdateTime);
    console.log(`🕐 Dernière mise à jour : ${lastUpdate.toLocaleString()}`);
  }
  
  console.log(`📡 Canaux IPC utilisés : ${data.totalChannels}`);
  console.log(`🔄 Total appels : ${data.totalCalls}`);
  
  if (data._metadata && data._metadata.sessionCount === 'multi') {
    console.log(`📊 Mode : Accumulation multi-sessions`);
  }
  
  console.log('═'.repeat(60));
  console.log('\n📈 Top 20 des handlers les plus appelés :\n');

  data.channels.slice(0, 20).forEach((channel, index) => {
    const percentage = ((channel.count / data.totalCalls) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round((channel.count / data.totalCalls) * 30));
    
    console.log(`${(index + 1).toString().padStart(2)}. ${channel.channel.padEnd(40)}`);
    console.log(`    ${bar} ${channel.count} appels (${percentage}%)`);
    if (channel.filePath) {
      console.log(`    📄 ${channel.filePath}`);
    }
    console.log('');
  });

  console.log('═'.repeat(60));
  printFunctionUsage(functionUsage);
  console.log('\n📄 Rapport complet sauvegardé dans :');
  try {
    console.log(`   ${require('electron').app.getPath('userData')}/ipc-coverage.json\n`);
  } catch (e) {
    // Si Electron n'est pas disponible, utiliser le chemin par défaut
    const userDataPath = process.env.APPDATA 
      ? path.join(process.env.APPDATA, 'Le Nexus')
      : path.join(require('os').homedir(), 'AppData', 'Roaming', 'Le Nexus');
    console.log(`   ${path.join(userDataPath, 'ipc-coverage.json')}\n`);
  }
}

function main() {
  try {
    const data = loadCoverageReport();
    const channelUsageMap = buildChannelUsageMap(data);
    const functionList = loadFunctionList();
    const functionUsage = analyzeFunctionUsage(functionList, channelUsageMap);
    displayReport(data, functionUsage);
  } catch (error) {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { loadCoverageReport, displayReport };
