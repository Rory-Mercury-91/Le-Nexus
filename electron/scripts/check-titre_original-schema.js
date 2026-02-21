#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbDir = process.argv[2] || path.join(__dirname, '..', '..', 'databases');

if (!fs.existsSync(dbDir)) {
  console.error(`Répertoire des bases introuvable: ${dbDir}`);
  process.exit(2);
}

const dbFiles = fs.readdirSync(dbDir).filter(f => f.endsWith('.db'));

if (dbFiles.length === 0) {
  console.log('Aucune base .db trouvée dans', dbDir);
  process.exit(0);
}

console.log(`Vérification de la présence de la colonne 'titre_original' dans ${dbFiles.length} base(s) (répertoire: ${dbDir})\n`);

for (const f of dbFiles) {
  const p = path.join(dbDir, f);
  let db;
  try {
    db = new Database(p, { readonly: true });
    const cols = db.prepare("PRAGMA table_info(manga_series)").all().map(c => c.name);
    const has = cols.includes('titre_original');
    console.log(`${f}: ${has ? '✅ présent' : '❌ absent'} (${cols.join(', ')})`);
  } catch (e) {
    console.error(`${f}: ❌ erreur ouverture/lecture: ${e.message}`);
  } finally {
    if (db) db.close();
  }
}
