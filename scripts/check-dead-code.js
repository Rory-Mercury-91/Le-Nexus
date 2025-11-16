/**
 * Script pour analyser le rapport de coverage et identifier le code mort
 * Compare la liste des fonctions avec le rapport de coverage
 */

const fs = require('fs');
const path = require('path');

function loadCoverageReport() {
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json');
  
  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Rapport de coverage introuvable.');
    console.log('💡 Lancez d\'abord : npm run test:coverage');
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
}

function loadFunctionList() {
  const functionListPath = path.join(process.cwd(), 'docs_perso', 'function-list.json');
  
  if (!fs.existsSync(functionListPath)) {
    console.error('❌ Liste des fonctions introuvable.');
    console.log('💡 Lancez d\'abord : npm run test:functions');
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(functionListPath, 'utf8'));
}

function analyzeCoverage(coverageReport, functionList) {
  const deadCode = [];
  const partiallyUsed = [];
  const fullyUsed = [];

  // Analyser chaque fichier
  functionList.electron.forEach(fileInfo => {
    const filePath = Object.keys(coverageReport).find(key => 
      key.includes(fileInfo.file.replace(/\\/g, '/'))
    );

    if (!filePath) {
      deadCode.push({
        file: fileInfo.file,
        functions: fileInfo.functions,
        reason: 'Fichier jamais exécuté'
      });
      return;
    }

    const fileCoverage = coverageReport[filePath];
    const unusedFunctions = [];

    fileInfo.functions.forEach(func => {
      // Chercher si la fonction est couverte
      const functionUsed = Object.keys(fileCoverage.statementMap || {}).some(key => {
        const statement = fileCoverage.statementMap[key];
        return fileCoverage.s[key] > 0; // Au moins une ligne exécutée
      });

      if (fileCoverage.s && Object.values(fileCoverage.s).some(v => v === 0)) {
        unusedFunctions.push(func);
      }
    });

    if (unusedFunctions.length === fileInfo.functions.length) {
      deadCode.push({
        file: fileInfo.file,
        functions: unusedFunctions,
        reason: 'Aucune fonction utilisée'
      });
    } else if (unusedFunctions.length > 0) {
      partiallyUsed.push({
        file: fileInfo.file,
        used: fileInfo.functions.filter(f => !unusedFunctions.includes(f)),
        unused: unusedFunctions
      });
    } else {
      fullyUsed.push({
        file: fileInfo.file,
        functions: fileInfo.functions
      });
    }
  });

  return { deadCode, partiallyUsed, fullyUsed };
}

function generateReport(analysis) {
  let report = '# 🔍 Analyse du Code Mort\n\n';
  report += `**Généré le** : ${new Date().toLocaleString('fr-FR')}\n\n`;
  
  report += `## 📊 Statistiques\n\n`;
  report += `- **Fichiers complètement inutilisés** : ${analysis.deadCode.length}\n`;
  report += `- **Fichiers partiellement utilisés** : ${analysis.partiallyUsed.length}\n`;
  report += `- **Fichiers complètement utilisés** : ${analysis.fullyUsed.length}\n\n`;
  
  report += '---\n\n';

  // Code mort
  if (analysis.deadCode.length > 0) {
    report += '## ⚠️ Code Mort (Jamais Exécuté)\n\n';
    analysis.deadCode.forEach(item => {
      report += `### ${item.file}\n\n`;
      report += `**Raison** : ${item.reason}\n\n`;
      report += `**Fonctions non utilisées** :\n`;
      item.functions.forEach(func => {
        report += `- \`${func}\`\n`;
      });
      report += '\n';
    });
  }

  // Partiellement utilisé
  if (analysis.partiallyUsed.length > 0) {
    report += '## ⚠️ Code Partiellement Utilisé\n\n';
    analysis.partiallyUsed.forEach(item => {
      report += `### ${item.file}\n\n`;
      report += `**Fonctions utilisées** : ${item.used.length}\n`;
      item.used.forEach(func => {
        report += `- ✅ \`${func}\`\n`;
      });
      report += `\n**Fonctions non utilisées** : ${item.unused.length}\n`;
      item.unused.forEach(func => {
        report += `- ❌ \`${func}\`\n`;
      });
      report += '\n';
    });
  }

  // Complètement utilisé
  if (analysis.fullyUsed.length > 0) {
    report += '## ✅ Code Complètement Utilisé\n\n';
    report += `**Fichiers** : ${analysis.fullyUsed.length}\n\n`;
  }

  report += '---\n\n';
  report += '## 💡 Recommandations\n\n';
  report += '1. Vérifier manuellement les fonctions marquées comme "non utilisées"\n';
  report += '2. Supprimer ou documenter le code mort confirmé\n';
  report += '3. Ajouter des tests pour le code partiellement utilisé\n\n';

  const reportPath = path.join(process.cwd(), 'docs_perso', 'dead-code-analysis.md');
  fs.writeFileSync(reportPath, report);
  console.log('✅ Rapport généré :', reportPath);
}

function main() {
  console.log('🔍 Analyse du code mort...\n');

  try {
    const coverageReport = loadCoverageReport();
    const functionList = loadFunctionList();

    const analysis = analyzeCoverage(coverageReport, functionList);

    generateReport(analysis);

    console.log('\n📊 Résultats :');
    console.log(`   - Code mort : ${analysis.deadCode.length} fichier(s)`);
    console.log(`   - Partiellement utilisé : ${analysis.partiallyUsed.length} fichier(s)`);
    console.log(`   - Complètement utilisé : ${analysis.fullyUsed.length} fichier(s)`);
  } catch (error) {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeCoverage, generateReport };
