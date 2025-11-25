/**
 * Script de diagnostic pour vérifier l'état des migrations et des données
 * Usage: node electron/scripts/diagnose-migration.js <chemin_vers_db>
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.argv[2];
if (!dbPath) {
  console.error('Usage: node diagnose-migration.js <chemin_vers_db>');
  process.exit(1);
}

const db = new Database(dbPath);

console.log('🔍 Diagnostic de la base de données:', dbPath);
console.log('');

// Vérifier les migrations appliquées
const migrations = db.prepare('SELECT id, description, applied_at FROM migrations ORDER BY applied_at').all();
console.log(`📋 Migrations appliquées (${migrations.length}):`);
migrations.forEach(m => {
  console.log(`   - ${m.id}: ${m.description || 'N/A'} (${m.applied_at})`);
});
console.log('');

// Vérifier les anciennes tables
const oldTables = [
  'adulte_game_labels',
  'adulte_game_blacklist',
  'adulte_game_user_games',
  'adulte_game_masquees',
  'serie_statut_utilisateur',
  'serie_tags',
  'series_masquees',
  'anime_statut_utilisateur',
  'anime_tags',
  'anime_masquees',
  'movie_user_status',
  'tv_show_user_status'
];

console.log('🔍 Vérification des anciennes tables:');
let hasOldTables = false;
oldTables.forEach(tableName => {
  try {
    const exists = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
    if (exists.count > 0) {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
      console.log(`   ✅ ${tableName} existe (${count} entrées)`);
      hasOldTables = true;
    } else {
      console.log(`   ❌ ${tableName} n'existe pas`);
    }
  } catch (e) {
    console.log(`   ⚠️ Erreur lors de la vérification de ${tableName}:`, e.message);
  }
});
console.log('');

// Vérifier les nouvelles tables et données
console.log('🔍 Vérification des nouvelles tables et données:');

// adulte_game_user_data
try {
  const userDataExists = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='adulte_game_user_data'").get();
  if (userDataExists.count > 0) {
    const total = db.prepare('SELECT COUNT(*) as count FROM adulte_game_user_data').get().count;
    const withLabels = db.prepare("SELECT COUNT(*) as count FROM adulte_game_user_data WHERE labels IS NOT NULL AND labels != ''").get().count;
    console.log(`   ✅ adulte_game_user_data existe (${total} entrées, ${withLabels} avec labels)`);
  } else {
    console.log(`   ❌ adulte_game_user_data n'existe pas`);
  }
} catch (e) {
  console.log(`   ⚠️ Erreur:`, e.message);
}

// user_preferences (blacklists)
try {
  const prefsExists = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='user_preferences'").get();
  if (prefsExists.count > 0) {
    const blacklists = db.prepare("SELECT COUNT(*) as count FROM user_preferences WHERE content_type = 'adulte_game' AND type = 'blacklist'").get().count;
    const tagPrefs = db.prepare("SELECT COUNT(*) as count FROM user_preferences WHERE content_type = 'adulte_game' AND type = 'tag_preferences'").get().count;
    console.log(`   ✅ user_preferences existe (${blacklists} blacklists, ${tagPrefs} préférences de tags)`);
  } else {
    console.log(`   ❌ user_preferences n'existe pas`);
  }
} catch (e) {
  console.log(`   ⚠️ Erreur:`, e.message);
}

console.log('');
console.log('📊 Résumé:');
if (hasOldTables) {
  console.log('   ⚠️ Anciennes tables détectées - les migrations doivent être réappliquées');
} else {
  console.log('   ℹ️ Aucune ancienne table détectée - les données ont peut-être été migrées ou perdues');
}

db.close();
