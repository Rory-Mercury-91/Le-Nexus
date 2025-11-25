/**
 * Script standalone pour mettre à jour une base de données existante
 * avec toutes les colonnes et tables manquantes du schéma consolidé
 * 
 * Usage: node electron/scripts/update-database.js <chemin-vers-la-base.db>
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.argv[2];

if (!dbPath) {
  console.error('❌ Usage: node electron/scripts/update-database.js <chemin-vers-la-base.db>');
  process.exit(1);
}

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Le fichier de base de données n'existe pas: ${dbPath}`);
  process.exit(1);
}

console.log(`🔄 Mise à jour de la base de données: ${dbPath}`);

const db = new Database(dbPath);

// Fonction helper pour vérifier si une colonne existe
function columnExists(tableName, columnName) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return columns.some(col => col.name === columnName);
  } catch (error) {
    return false;
  }
}

// Fonction helper pour vérifier si une table existe
function tableExists(tableName) {
  try {
    const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
    return !!result;
  } catch (error) {
    return false;
  }
}

// Fonction helper pour vérifier si un index existe
function indexExists(indexName) {
  try {
    const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`).get(indexName);
    return !!result;
  } catch (error) {
    return false;
  }
}

let changesCount = 0;

// ========================================
// MISE À JOUR manga_series
// ========================================
if (tableExists('manga_series')) {
  const columnsToAdd = [
    { name: 'source_url', type: 'TEXT' },
    { name: 'source_id', type: 'TEXT' },
    { name: 'chapitres_mihon', type: 'INTEGER DEFAULT 0' },
    { name: 'nautiljon_url', type: 'TEXT' },
    { name: 'enriched_at', type: 'DATETIME' },
    { name: 'user_modified_fields', type: 'TEXT' },
    { name: 'maj_disponible', type: 'BOOLEAN DEFAULT 0' },
    { name: 'derniere_verif', type: 'DATETIME' }
  ];

  for (const col of columnsToAdd) {
    if (!columnExists('manga_series', col.name)) {
      try {
        db.prepare(`ALTER TABLE manga_series ADD COLUMN ${col.name} ${col.type}`).run();
        console.log(`✅ Colonne ${col.name} ajoutée à manga_series`);
        changesCount++;
      } catch (error) {
        console.warn(`⚠️ Impossible d'ajouter ${col.name} à manga_series:`, error.message);
      }
    }
  }

  // Index maj_disponible
  if (!indexExists('idx_manga_series_maj')) {
    try {
      db.prepare('CREATE INDEX IF NOT EXISTS idx_manga_series_maj ON manga_series(maj_disponible)').run();
      console.log('✅ Index idx_manga_series_maj créé');
      changesCount++;
    } catch (error) {
      console.warn('⚠️ Impossible de créer idx_manga_series_maj:', error.message);
    }
  }
}

// ========================================
// MISE À JOUR manga_tomes
// ========================================
if (tableExists('manga_tomes')) {
  const columnsToAdd = [
    { name: 'mihon', type: 'INTEGER DEFAULT 0' },
    { name: 'mihon_id', type: 'TEXT' }
  ];

  for (const col of columnsToAdd) {
    if (!columnExists('manga_tomes', col.name)) {
      try {
        db.prepare(`ALTER TABLE manga_tomes ADD COLUMN ${col.name} ${col.type}`).run();
        console.log(`✅ Colonne ${col.name} ajoutée à manga_tomes`);
        changesCount++;
      } catch (error) {
        console.warn(`⚠️ Impossible d'ajouter ${col.name} à manga_tomes:`, error.message);
      }
    }
  }
}

// ========================================
// MISE À JOUR anime_series
// ========================================
if (tableExists('anime_series')) {
  const columnsToAdd = [
    { name: 'maj_disponible', type: 'BOOLEAN DEFAULT 0' },
    { name: 'enriched_at', type: 'DATETIME' },
    { name: 'user_modified_fields', type: 'TEXT' },
    { name: 'nautiljon_url', type: 'TEXT' },
    { name: 'derniere_verif', type: 'DATETIME' }
  ];

  for (const col of columnsToAdd) {
    if (!columnExists('anime_series', col.name)) {
      try {
        db.prepare(`ALTER TABLE anime_series ADD COLUMN ${col.name} ${col.type}`).run();
        console.log(`✅ Colonne ${col.name} ajoutée à anime_series`);
        changesCount++;
      } catch (error) {
        console.warn(`⚠️ Impossible d'ajouter ${col.name} à anime_series:`, error.message);
      }
    }
  }

  // Index maj_disponible
  if (!indexExists('idx_anime_series_maj')) {
    try {
      db.prepare('CREATE INDEX IF NOT EXISTS idx_anime_series_maj ON anime_series(maj_disponible)').run();
      console.log('✅ Index idx_anime_series_maj créé');
      changesCount++;
    } catch (error) {
      console.warn('⚠️ Impossible de créer idx_anime_series_maj:', error.message);
    }
  }
}

// ========================================
// MISE À JOUR movies
// ========================================
if (tableExists('movies')) {
  const columnsToAdd = [
    { name: 'enriched_at', type: 'DATETIME' },
    { name: 'user_modified_fields', type: 'TEXT' }
  ];

  for (const col of columnsToAdd) {
    if (!columnExists('movies', col.name)) {
      try {
        db.prepare(`ALTER TABLE movies ADD COLUMN ${col.name} ${col.type}`).run();
        console.log(`✅ Colonne ${col.name} ajoutée à movies`);
        changesCount++;
      } catch (error) {
        console.warn(`⚠️ Impossible d'ajouter ${col.name} à movies:`, error.message);
      }
    }
  }
}

// ========================================
// MISE À JOUR tv_shows
// ========================================
if (tableExists('tv_shows')) {
  const columnsToAdd = [
    { name: 'enriched_at', type: 'DATETIME' },
    { name: 'user_modified_fields', type: 'TEXT' }
  ];

  for (const col of columnsToAdd) {
    if (!columnExists('tv_shows', col.name)) {
      try {
        db.prepare(`ALTER TABLE tv_shows ADD COLUMN ${col.name} ${col.type}`).run();
        console.log(`✅ Colonne ${col.name} ajoutée à tv_shows`);
        changesCount++;
      } catch (error) {
        console.warn(`⚠️ Impossible d'ajouter ${col.name} à tv_shows:`, error.message);
      }
    }
  }
}

// ========================================
// MISE À JOUR manga_user_data
// ========================================
if (tableExists('manga_user_data')) {
  if (!columnExists('manga_user_data', 'tag_manual_override')) {
    try {
      db.prepare('ALTER TABLE manga_user_data ADD COLUMN tag_manual_override INTEGER NOT NULL DEFAULT 0').run();
      db.prepare(`
        UPDATE manga_user_data
        SET tag_manual_override = CASE WHEN tag IS NOT NULL AND tag != '' THEN 1 ELSE 0 END
      `).run();
      console.log('✅ Colonne tag_manual_override ajoutée à manga_user_data');
      changesCount++;
    } catch (error) {
      console.warn('⚠️ Impossible d\'ajouter tag_manual_override à manga_user_data:', error.message);
    }
  }
}

// ========================================
// CRÉATION anime_episodes
// ========================================
if (!tableExists('anime_episodes')) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS anime_episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anime_id INTEGER NOT NULL,
        numero INTEGER NOT NULL,
        titre TEXT,
        synopsis TEXT,
        date_diffusion TEXT,
        duree INTEGER,
        filler BOOLEAN DEFAULT 0,
        recap BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (anime_id) REFERENCES anime_series(id) ON DELETE CASCADE,
        UNIQUE(anime_id, numero)
      );
      
      CREATE INDEX IF NOT EXISTS idx_anime_episodes_anime ON anime_episodes(anime_id);
    `);
    console.log('✅ Table anime_episodes créée');
    changesCount++;
  } catch (error) {
    console.warn('⚠️ Impossible de créer anime_episodes:', error.message);
  }
}

// ========================================
// CRÉATION adulte_game_games
// ========================================
if (!tableExists('adulte_game_games')) {
  try {
    if (!tableExists('users')) {
      console.warn('⚠️ Table users manquante, impossible de créer adulte_game_games');
    } else {
      db.exec(`
        CREATE TABLE IF NOT EXISTS adulte_game_games (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          f95_thread_id INTEGER,
          Lewdcorner_thread_id INTEGER,
          titre TEXT NOT NULL,
          game_version TEXT,
          game_statut TEXT,
          game_engine TEXT,
          game_developer TEXT,
          game_site TEXT DEFAULT 'F95Zone',
          couverture_url TEXT,
          tags TEXT,
          lien_f95 TEXT,
          lien_lewdcorner TEXT,
          statut_traduction TEXT,
          type_traduction TEXT,
          traduction_fr_disponible BOOLEAN DEFAULT 0,
          version_traduite TEXT,
          lien_traduction TEXT,
          traducteur TEXT,
          derniere_sync_trad DATETIME,
          traductions_multiples TEXT,
          maj_disponible BOOLEAN DEFAULT 0,
          derniere_verif DATETIME,
          user_modified_fields TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(f95_thread_id, game_site),
          UNIQUE(Lewdcorner_thread_id, game_site)
        );
        
        CREATE INDEX IF NOT EXISTS idx_adulte_game_f95_id ON adulte_game_games(f95_thread_id);
        CREATE INDEX IF NOT EXISTS idx_adulte_game_lewdcorner_id ON adulte_game_games(Lewdcorner_thread_id);
        CREATE INDEX IF NOT EXISTS idx_adulte_game_site ON adulte_game_games(game_site);
        CREATE INDEX IF NOT EXISTS idx_adulte_game_maj ON adulte_game_games(maj_disponible);
      `);
      console.log('✅ Table adulte_game_games créée');
      changesCount++;
    }
  } catch (error) {
    console.warn('⚠️ Impossible de créer adulte_game_games:', error.message);
  }
} else {
  // Vérifier les colonnes manquantes dans adulte_game_games
  const columnsToAdd = [
    { name: 'Lewdcorner_thread_id', type: 'INTEGER' },
    { name: 'game_site', type: 'TEXT', defaultValue: "'F95Zone'" },
    { name: 'lien_traduction', type: 'TEXT' },
    { name: 'user_modified_fields', type: 'TEXT' }
  ];

  for (const col of columnsToAdd) {
    if (!columnExists('adulte_game_games', col.name)) {
      try {
        const defaultValue = col.defaultValue ? ` DEFAULT ${col.defaultValue}` : '';
        db.prepare(`ALTER TABLE adulte_game_games ADD COLUMN ${col.name} ${col.type}${defaultValue}`).run();
        console.log(`✅ Colonne ${col.name} ajoutée à adulte_game_games`);
        changesCount++;
        
        // Si la colonne a une valeur par défaut et que la table a des données, mettre à jour les valeurs NULL
        if (col.defaultValue) {
          try {
            db.prepare(`UPDATE adulte_game_games SET ${col.name} = ${col.defaultValue} WHERE ${col.name} IS NULL`).run();
          } catch (updateError) {
            // Ignorer les erreurs de mise à jour
          }
        }
      } catch (error) {
        console.warn(`⚠️ Impossible d'ajouter ${col.name} à adulte_game_games:`, error.message);
      }
    }
  }
  
  // Créer les index sur les colonnes si elles existent
  if (columnExists('adulte_game_games', 'Lewdcorner_thread_id')) {
    try {
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_adulte_game_lewdcorner_id ON adulte_game_games(Lewdcorner_thread_id)`).run();
    } catch (error) {
      // Ignorer si l'index existe déjà
    }
  }
  if (columnExists('adulte_game_games', 'game_site')) {
    try {
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_adulte_game_site ON adulte_game_games(game_site)`).run();
    } catch (error) {
      // Ignorer si l'index existe déjà
    }
  }
}

// ========================================
// CRÉATION adulte_game_user_data
// ========================================
if (!tableExists('adulte_game_user_data')) {
  try {
    if (!tableExists('adulte_game_games') || !tableExists('users')) {
      console.warn('⚠️ Tables référencées manquantes, impossible de créer adulte_game_user_data');
    } else {
      db.exec(`
        CREATE TABLE IF NOT EXISTS adulte_game_user_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          derniere_session DATETIME,
          version_jouee TEXT,
          completion_perso TEXT,
          is_favorite BOOLEAN DEFAULT 0,
          is_hidden BOOLEAN DEFAULT 0,
          date_masquage DATETIME,
          notes_privees TEXT,
          chemin_executable TEXT,
          labels TEXT,
          display_preferences TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (game_id) REFERENCES adulte_game_games(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(game_id, user_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_adulte_game_user_data_game ON adulte_game_user_data(game_id);
        CREATE INDEX IF NOT EXISTS idx_adulte_game_user_data_user ON adulte_game_user_data(user_id);
      `);
      console.log('✅ Table adulte_game_user_data créée');
      changesCount++;
    }
  } catch (error) {
    console.warn('⚠️ Impossible de créer adulte_game_user_data:', error.message);
  }
}

// ========================================
// CRÉATION user_preferences
// ========================================
if (!tableExists('user_preferences')) {
  try {
    if (!tableExists('users')) {
      console.warn('⚠️ Table users manquante, impossible de créer user_preferences');
    } else {
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          content_type TEXT CHECK(content_type IN ('adulte_game', 'movies', 'mangas', 'animes', 'tv_shows') OR content_type IS NULL),
          type TEXT NOT NULL CHECK(type IN ('display_settings', 'tag_preferences', 'blacklist')),
          key TEXT NOT NULL,
          value TEXT,
          platform TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_preferences_type ON user_preferences(type);
        CREATE INDEX IF NOT EXISTS idx_user_preferences_content_type ON user_preferences(content_type);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_preferences_unique 
        ON user_preferences(user_id, COALESCE(content_type, ''), type, key, COALESCE(platform, ''));
      `);
      console.log('✅ Table user_preferences créée');
      changesCount++;
    }
  } catch (error) {
    console.warn('⚠️ Impossible de créer user_preferences:', error.message);
  }
}

db.close();

if (changesCount === 0) {
  console.log('✅ Base de données déjà à jour, aucune modification nécessaire.');
} else {
  console.log(`\n✅ Mise à jour terminée: ${changesCount} modification(s) appliquée(s).`);
}
