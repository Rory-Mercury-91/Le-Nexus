const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const tmpDir = path.join(__dirname, 'tmp_test_dbs');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const dbPath = path.join(tmpDir, 'test_old_schema.db');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

// Créer une DB avec un schema legacy (manga_series sans titre_original)
const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS manga_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    titre_alternatif TEXT
  );
`);
console.log('DB test créée:', dbPath);
db.close();

// Lancer les migrations sur tmpDir
const { migrateAllDatabases } = require('../services/database-migrations');
const result = migrateAllDatabases(tmpDir);
console.log('Résultat migration:', result);

// Vérifier la colonne
const db2 = new Database(dbPath);
const cols = db2.prepare("PRAGMA table_info(manga_series)").all().map(c => c.name);
console.log('Colonnes après migration:', cols);
if (cols.includes('titre_original')) {
  console.log('✅ Migration OK: colonne titre_original présente');
} else {
  console.error('❌ Migration FAILED: colonne titre_original manquante');
}
db2.close();
