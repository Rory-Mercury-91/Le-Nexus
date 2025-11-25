#!/usr/bin/env node

/**
 * Script pour mettre à jour la version dans package.json
 * Usage: node scripts/update-version.js 1.2.3
 *        node scripts/update-version.js v1.2.3
 */

const fs = require('fs');
const path = require('path');

const versionArg = process.argv[2];

if (!versionArg) {
  console.error('❌ Erreur: Veuillez fournir une version');
  console.log('Usage: node scripts/update-version.js <version>');
  console.log('Exemple: node scripts/update-version.js 1.2.3');
  process.exit(1);
}

// Enlever le préfixe 'v' si présent
const version = versionArg.replace(/^v/, '');

// Valider le format de version (semver)
const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
if (!semverRegex.test(version)) {
  console.error(`❌ Erreur: Format de version invalide: ${version}`);
  console.log('Le format doit être: MAJOR.MINOR.PATCH (ex: 1.2.3)');
  process.exit(1);
}

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
  // Lire package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const oldVersion = packageJson.version;
  packageJson.version = version;
  
  // Écrire package.json
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf8'
  );
  
  console.log(`✅ Version mise à jour: ${oldVersion} → ${version}`);
  console.log(`📝 Fichier modifié: ${packageJsonPath}`);
  
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour de la version:', error.message);
  process.exit(1);
}
