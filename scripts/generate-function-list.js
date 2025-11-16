/**
 * Script pour générer la liste de toutes les fonctions exportées
 * Utile pour identifier les fonctions à tester
 */

const fs = require('fs');
const path = require('path');

function findExportedFunctions(dir, extensions = ['.js', '.ts', '.tsx'], output = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Ignorer certains dossiers
      if (!['node_modules', 'dist', '.git', 'coverage'].includes(file)) {
        findExportedFunctions(filePath, extensions, output);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Chercher les exports
          const exportPatterns = [
            /export\s+(?:function|const|class|default)\s+(\w+)/g,
            /exports\.(\w+)\s*=/g,
            /module\.exports\s*=\s*\{[\s\S]*?(\w+)\s*:/g,
            /module\.exports\.(\w+)\s*=/g,
            /module\.exports\s*=\s*(\w+)/g
          ];

          const functions = new Set();
          
          exportPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
              functions.add(match[1]);
            }
          });

          // Gestion spéciale pour les exports shorthand: module.exports = { foo, bar: baz }
          const moduleObjectPattern = /module\.exports\s*=\s*\{([\s\S]*?)\}/g;
          let objectMatch;
          while ((objectMatch = moduleObjectPattern.exec(content)) !== null) {
            const body = objectMatch[1];
            const entries = body.split(',');
            entries.forEach(entry => {
              const cleaned = entry.trim();
              if (!cleaned) return;

              // Retirer les commentaires fin de ligne
              const commentIndex = cleaned.indexOf('//');
              const statement = commentIndex >= 0 ? cleaned.slice(0, commentIndex).trim() : cleaned;
              if (!statement) return;

              let exportedName;
              if (statement.includes(':')) {
                const parts = statement.split(':');
                exportedName = parts[parts.length - 1].trim();
              } else {
                exportedName = statement.trim();
              }

              // Retirer tout trailing caractère non identifiant (ex: parenthèses, accolades)
              exportedName = exportedName.replace(/[\s\r\n]+/g, ' ').split(' ')[0];
              exportedName = exportedName.replace(/\(.*$/, ''); // retirer appels éventuels

              if (/^[A-Za-z_$][\w$]*$/.test(exportedName)) {
                functions.add(exportedName);
              }
            });
          }

          if (functions.size > 0) {
            output.push({
              file: path.relative(process.cwd(), filePath),
              functions: Array.from(functions)
            });
          }
        } catch (error) {
          // Ignorer les erreurs de lecture
        }
      }
    }
  }

  return output;
}

function generateReport(outputDir) {
  console.log('🔍 Recherche des fonctions exportées...\n');

  const electronDir = path.join(process.cwd(), 'electron');
  const srcDir = path.join(process.cwd(), 'src');

  const electronFunctions = findExportedFunctions(electronDir);
  const srcFunctions = findExportedFunctions(srcDir);

  const report = {
    electron: electronFunctions,
    src: srcFunctions,
    total: {
      files: electronFunctions.length + srcFunctions.length,
      functions: electronFunctions.reduce((sum, f) => sum + f.functions.length, 0) +
                 srcFunctions.reduce((sum, f) => sum + f.functions.length, 0)
    },
    generatedAt: new Date().toISOString()
  };

  // Sauvegarder le rapport
  const reportPath = path.join(outputDir || process.cwd(), 'docs_perso', 'function-list.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('✅ Rapport généré :', reportPath);
  console.log(`\n📊 Statistiques:`);
  console.log(`   - Fichiers Electron: ${electronFunctions.length}`);
  console.log(`   - Fichiers Source: ${srcFunctions.length}`);
  console.log(`   - Total fonctions: ${report.total.functions}\n`);

  // Générer aussi un rapport markdown
  generateMarkdownReport(report, path.dirname(reportPath));
}

function generateMarkdownReport(report, outputDir) {
  let markdown = '# 📋 Liste des Fonctions Exportées\n\n';
  markdown += `**Généré le** : ${new Date(report.generatedAt).toLocaleString('fr-FR')}\n\n`;
  markdown += `**Total** : ${report.total.files} fichiers, ${report.total.functions} fonctions\n\n`;
  markdown += '---\n\n';

  // Electron functions
  markdown += '## 🗄️ Electron (Backend)\n\n';
  const byCategory = {};
  
  report.electron.forEach(item => {
    const category = item.file.split(path.sep)[0];
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(item);
  });

  Object.keys(byCategory).sort().forEach(category => {
    markdown += `### ${category}\n\n`;
    byCategory[category].forEach(item => {
      markdown += `**${item.file}**\n`;
      item.functions.forEach(func => {
        markdown += `- \`${func}\`\n`;
      });
      markdown += '\n';
    });
  });

  // Source functions
  markdown += '## ⚛️ Source (Frontend)\n\n';
  const srcByCategory = {};
  
  report.src.forEach(item => {
    const category = item.file.split(path.sep)[0];
    if (!srcByCategory[category]) {
      srcByCategory[category] = [];
    }
    srcByCategory[category].push(item);
  });

  Object.keys(srcByCategory).sort().forEach(category => {
    markdown += `### ${category}\n\n`;
    srcByCategory[category].forEach(item => {
      markdown += `**${item.file}**\n`;
      item.functions.forEach(func => {
        markdown += `- \`${func}\`\n`;
      });
      markdown += '\n';
    });
  });

  const markdownPath = path.join(outputDir, 'function-list.md');
  fs.writeFileSync(markdownPath, markdown);
  console.log('✅ Rapport Markdown généré :', markdownPath);
}

if (require.main === module) {
  generateReport();
}

module.exports = { generateReport, findExportedFunctions };
