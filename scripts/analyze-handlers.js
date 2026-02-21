/**
 * Script d'analyse des handlers IPC
 * Génère un rapport détaillé sur l'utilisation de chaque handler
 * 
 * ⚠️ CE SCRIPT NE SUPPRIME RIEN - IL ANALYSE SEULEMENT
 * 
 * Usage: node scripts/analyze-handlers.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const HANDLERS_DIR = path.join(__dirname, '..', 'electron', 'handlers');
const PRELOAD_FILE = path.join(__dirname, '..', 'electron', 'preload.js');
const SRC_DIR = path.join(__dirname, '..', 'src');
const REPORT_FILE = path.join(__dirname, '..', 'docs_perso', 'rapport-analyse-handlers.md');

// Résultats
const results = {
  totalHandlers: 0,
  usedHandlers: 0,
  unusedHandlers: 0,
  handlersWithoutPreload: 0,
  handlers: []
};

/**
 * Récupère tous les fichiers .js d'un dossier récursivement
 */
function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Extrait tous les handlers IPC d'un fichier
 */
function extractHandlers(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const handlers = [];
  
  // Regex pour trouver ipcMain.handle('nom-du-handler', ...)
  const regex = /ipcMain\.handle\(['"`]([^'"`]+)['"`]/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    handlers.push({
      name: match[1],
      file: path.relative(process.cwd(), filePath),
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  return handlers;
}

/**
 * Vérifie si un handler est exposé dans preload.js
 */
function isInPreload(handlerName, preloadContent) {
  // Cherche le nom du handler dans le preload
  return preloadContent.includes(`'${handlerName}'`) || 
         preloadContent.includes(`"${handlerName}"`) ||
         preloadContent.includes(`\`${handlerName}\``);
}

/**
 * Trouve le nom de la fonction preload pour un handler
 */
function findPreloadFunction(handlerName, preloadContent) {
  // Regex pour trouver: nomFonction: (...) => ipcRenderer.invoke('nom-handler', ...)
  const regex = new RegExp(`(\\w+):\\s*\\([^)]*\\)\\s*=>\\s*ipcRenderer\\.invoke\\(['"\`]${handlerName}['"\`]`, 'g');
  const match = regex.exec(preloadContent);
  
  return match ? match[1] : null;
}

/**
 * Cherche les usages d'une fonction dans le dossier src/
 */
function findUsages(functionName, srcDir) {
  const usages = [];
  
  function searchInDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        searchInDir(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Cherche window.electronAPI.nomFonction ou electronAPI.nomFonction
        const regex = new RegExp(`(window\\.)?electronAPI\\.${functionName}\\b`, 'g');
        let match;
        
        while ((match = regex.exec(content)) !== null) {
          const line = content.substring(0, match.index).split('\n').length;
          usages.push({
            file: path.relative(process.cwd(), filePath),
            line: line
          });
        }
      }
    });
  }
  
  searchInDir(srcDir);
  return usages;
}

/**
 * Génère le rapport Markdown
 */
function generateReport() {
  let report = `# 📊 Rapport d'Analyse des Handlers IPC\n\n`;
  report += `**Date de génération** : ${new Date().toLocaleString('fr-FR')}\n\n`;
  report += `---\n\n`;
  
  // Résumé global
  report += `## 📈 Résumé Global\n\n`;
  report += `| Métrique | Valeur |\n`;
  report += `|----------|--------|\n`;
  report += `| **Total de handlers** | ${results.totalHandlers} |\n`;
  report += `| **Handlers utilisés** | ${results.usedHandlers} | ✅\n`;
  report += `| **Handlers inutilisés** | ${results.unusedHandlers} | ⚠️\n`;
  report += `| **Handlers sans preload** | ${results.handlersWithoutPreload} | 🔴\n`;
  report += `| **Taux d'utilisation** | ${((results.usedHandlers / results.totalHandlers) * 100).toFixed(1)}% |\n\n`;
  
  report += `---\n\n`;
  
  // Handlers inutilisés (CODE MORT POTENTIEL)
  const unused = results.handlers.filter(h => h.status === 'unused');
  if (unused.length > 0) {
    report += `## 🗑️ Handlers Inutilisés (Code Mort Potentiel)\n\n`;
    report += `**${unused.length} handlers ne sont jamais appelés depuis le frontend**\n\n`;
    
    // Grouper par fichier
    const byFile = {};
    unused.forEach(h => {
      if (!byFile[h.file]) byFile[h.file] = [];
      byFile[h.file].push(h);
    });
    
    Object.entries(byFile).forEach(([file, handlers]) => {
      report += `### 📄 \`${file}\`\n\n`;
      handlers.forEach(h => {
        report += `- ❌ **\`${h.name}\`** (ligne ${h.line})\n`;
        if (h.preloadFunction) {
          report += `  - Fonction preload : \`${h.preloadFunction}\`\n`;
        } else {
          report += `  - ⚠️ Pas de fonction preload trouvée\n`;
        }
      });
      report += `\n`;
    });
    
    report += `---\n\n`;
  }
  
  // Handlers sans preload (ERREUR DE CONFIGURATION)
  const noPreload = results.handlers.filter(h => h.status === 'no-preload');
  if (noPreload.length > 0) {
    report += `## 🔴 Handlers Sans Preload (Erreur de Configuration)\n\n`;
    report += `**${noPreload.length} handlers ne sont pas exposés dans preload.js**\n\n`;
    
    noPreload.forEach(h => {
      report += `- 🔴 **\`${h.name}\`** dans \`${h.file}\` (ligne ${h.line})\n`;
    });
    
    report += `\n---\n\n`;
  }
  
  // Handlers utilisés (OK)
  const used = results.handlers.filter(h => h.status === 'used');
  if (used.length > 0) {
    report += `## ✅ Handlers Utilisés\n\n`;
    report += `**${used.length} handlers sont correctement utilisés**\n\n`;
    
    // Grouper par fichier
    const byFile = {};
    used.forEach(h => {
      if (!byFile[h.file]) byFile[h.file] = [];
      byFile[h.file].push(h);
    });
    
    Object.entries(byFile).forEach(([file, handlers]) => {
      report += `### 📄 \`${file}\` (${handlers.length} handlers)\n\n`;
      report += `<details>\n<summary>Voir les détails</summary>\n\n`;
      handlers.forEach(h => {
        report += `- ✅ **\`${h.name}\`** (ligne ${h.line})\n`;
        report += `  - Fonction preload : \`${h.preloadFunction}\`\n`;
        report += `  - Usages (${h.usages.length}) :\n`;
        h.usages.forEach(u => {
          report += `    - \`${u.file}\` (ligne ${u.line})\n`;
        });
      });
      report += `\n</details>\n\n`;
    });
  }
  
  return report;
}

/**
 * Script principal
 */
async function main() {
  console.log('🔍 Analyse des handlers IPC...\n');
  
  // 1. Charger le contenu du preload
  console.log('📖 Lecture du preload.js...');
  const preloadContent = fs.readFileSync(PRELOAD_FILE, 'utf-8');
  
  // 2. Récupérer tous les fichiers handlers
  console.log('📂 Scan des fichiers handlers...');
  const handlerFiles = getAllJsFiles(HANDLERS_DIR);
  console.log(`   ✓ ${handlerFiles.length} fichiers trouvés\n`);
  
  // 3. Extraire tous les handlers
  console.log('🔍 Extraction des handlers IPC...');
  handlerFiles.forEach(file => {
    const handlers = extractHandlers(file);
    results.totalHandlers += handlers.length;
    results.handlers.push(...handlers);
  });
  console.log(`   ✓ ${results.totalHandlers} handlers trouvés\n`);
  
  // 4. Analyser chaque handler
  console.log('🔬 Analyse de l\'utilisation de chaque handler...');
  let progress = 0;
  for (const handler of results.handlers) {
    progress++;
    process.stdout.write(`\r   Progression: ${progress}/${results.totalHandlers} (${((progress/results.totalHandlers)*100).toFixed(0)}%)`);
    
    // Vérifier si exposé dans preload
    const inPreload = isInPreload(handler.name, preloadContent);
    
    if (!inPreload) {
      handler.status = 'no-preload';
      handler.preloadFunction = null;
      handler.usages = [];
      results.handlersWithoutPreload++;
      continue;
    }
    
    // Trouver le nom de la fonction preload
    const preloadFunc = findPreloadFunction(handler.name, preloadContent);
    handler.preloadFunction = preloadFunc;
    
    if (!preloadFunc) {
      handler.status = 'no-preload';
      handler.usages = [];
      results.handlersWithoutPreload++;
      continue;
    }
    
    // Chercher les usages dans src/
    const usages = findUsages(preloadFunc, SRC_DIR);
    handler.usages = usages;
    
    if (usages.length > 0) {
      handler.status = 'used';
      results.usedHandlers++;
    } else {
      handler.status = 'unused';
      results.unusedHandlers++;
    }
  }
  
  console.log('\n\n✅ Analyse terminée!\n');
  
  // 5. Générer le rapport
  console.log('📝 Génération du rapport...');
  const report = generateReport();
  fs.writeFileSync(REPORT_FILE, report, 'utf-8');
  console.log(`   ✓ Rapport sauvegardé dans: ${REPORT_FILE}\n`);
  
  // 6. Afficher le résumé
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  RÉSUMÉ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Total de handlers     : ${results.totalHandlers}`);
  console.log(`  ✅ Handlers utilisés   : ${results.usedHandlers} (${((results.usedHandlers/results.totalHandlers)*100).toFixed(1)}%)`);
  console.log(`  ⚠️  Handlers inutilisés : ${results.unusedHandlers} (${((results.unusedHandlers/results.totalHandlers)*100).toFixed(1)}%)`);
  console.log(`  🔴 Sans preload        : ${results.handlersWithoutPreload}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (results.unusedHandlers > 0) {
    console.log(`⚠️  ${results.unusedHandlers} handlers semblent inutilisés (code mort potentiel)`);
    console.log(`📄 Consultez le rapport pour les détails: ${REPORT_FILE}\n`);
  } else {
    console.log('✅ Tous les handlers sont utilisés!\n');
  }
}

// Exécution
main().catch(error => {
  console.error('❌ Erreur lors de l\'analyse:', error);
  process.exit(1);
});
