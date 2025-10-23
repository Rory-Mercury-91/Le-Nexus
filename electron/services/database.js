const Database = require('better-sqlite3');

/**
 * Initialise la base de données avec toutes les tables et migrations
 * @param {string} dbPath - Chemin vers le fichier de base de données
 * @returns {Database} Instance de la base de données
 */
function initDatabase(dbPath) {
  const db = new Database(dbPath);
  
  // Création des tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titre TEXT NOT NULL,
      statut TEXT NOT NULL,
      type_volume TEXT NOT NULL,
      couverture_url TEXT,
      description TEXT,
      statut_publication TEXT,
      annee_publication INTEGER,
      genres TEXT,
      nb_chapitres INTEGER,
      langue_originale TEXT,
      demographie TEXT,
      editeur TEXT,
      rating TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serie_id INTEGER NOT NULL,
      numero INTEGER NOT NULL,
      prix REAL NOT NULL DEFAULT 0,
      proprietaire TEXT,
      date_sortie DATE,
      date_achat DATE,
      couverture_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (serie_id) REFERENCES series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tomes_proprietaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tome_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tome_id) REFERENCES tomes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(tome_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS lecture_tomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tome_id INTEGER NOT NULL,
      utilisateur TEXT NOT NULL,
      lu BOOLEAN NOT NULL DEFAULT 0,
      date_lecture DATE,
      FOREIGN KEY (tome_id) REFERENCES tomes(id) ON DELETE CASCADE,
      UNIQUE(tome_id, utilisateur)
    );

    CREATE TABLE IF NOT EXISTS series_masquees (
      serie_id INTEGER NOT NULL,
      utilisateur TEXT NOT NULL,
      date_masquage DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (serie_id, utilisateur),
      FOREIGN KEY (serie_id) REFERENCES series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS anime_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titre TEXT NOT NULL,
      titre_romaji TEXT,
      titre_natif TEXT,
      couverture_url TEXT,
      description TEXT,
      statut TEXT NOT NULL,
      type TEXT,
      genres TEXT,
      studios TEXT,
      annee INTEGER,
      rating TEXT,
      mal_id INTEGER UNIQUE,
      anilist_id INTEGER,
      source_import TEXT,
      utilisateur_ajout TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS anime_saisons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serie_id INTEGER NOT NULL,
      numero_saison INTEGER NOT NULL,
      titre TEXT,
      nb_episodes INTEGER NOT NULL DEFAULT 0,
      annee INTEGER,
      couverture_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (serie_id) REFERENCES anime_series(id) ON DELETE CASCADE,
      UNIQUE(serie_id, numero_saison)
    );

    CREATE TABLE IF NOT EXISTS anime_episodes_vus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saison_id INTEGER NOT NULL,
      utilisateur TEXT NOT NULL,
      episode_numero INTEGER NOT NULL,
      vu BOOLEAN NOT NULL DEFAULT 0,
      date_visionnage DATE,
      FOREIGN KEY (saison_id) REFERENCES anime_saisons(id) ON DELETE CASCADE,
      UNIQUE(saison_id, utilisateur, episode_numero)
    );

    CREATE TABLE IF NOT EXISTS anime_statut_utilisateur (
      serie_id INTEGER NOT NULL,
      utilisateur TEXT NOT NULL,
      statut_visionnage TEXT NOT NULL DEFAULT 'En cours',
      date_modification DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (serie_id, utilisateur),
      FOREIGN KEY (serie_id) REFERENCES anime_series(id) ON DELETE CASCADE,
      CHECK (statut_visionnage IN ('En cours', 'Terminé', 'Abandonné'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      emoji TEXT,
      avatar_path TEXT,
      color TEXT NOT NULL DEFAULT '#8b5cf6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tomes_serie ON tomes(serie_id);
    CREATE INDEX IF NOT EXISTS idx_series_statut ON series(statut);
    CREATE INDEX IF NOT EXISTS idx_tomes_proprietaire ON tomes(proprietaire);
    CREATE INDEX IF NOT EXISTS idx_tomes_proprietaires_tome ON tomes_proprietaires(tome_id);
    CREATE INDEX IF NOT EXISTS idx_tomes_proprietaires_user ON tomes_proprietaires(user_id);
    CREATE INDEX IF NOT EXISTS idx_lecture_tomes_utilisateur ON lecture_tomes(utilisateur);
    CREATE INDEX IF NOT EXISTS idx_lecture_tomes_tome ON lecture_tomes(tome_id);
    CREATE INDEX IF NOT EXISTS idx_anime_series_statut ON anime_series(statut);
    CREATE INDEX IF NOT EXISTS idx_anime_series_mal_id ON anime_series(mal_id);
    CREATE INDEX IF NOT EXISTS idx_anime_saisons_serie ON anime_saisons(serie_id);
    CREATE INDEX IF NOT EXISTS idx_anime_episodes_vus_utilisateur ON anime_episodes_vus(utilisateur);
    CREATE INDEX IF NOT EXISTS idx_anime_episodes_vus_saison ON anime_episodes_vus(saison_id);
    CREATE INDEX IF NOT EXISTS idx_anime_statut_utilisateur ON anime_statut_utilisateur(utilisateur);
  `);

  // Migration : Ajouter les colonnes manquantes si elles n'existent pas
  try {
    // Migration pour la table series
    const seriesColumns = db.prepare("PRAGMA table_info(series)").all();
    const seriesColumnNames = seriesColumns.map(col => col.name);
    
    const newSeriesColumns = [
      { name: 'description', type: 'TEXT' },
      { name: 'statut_publication', type: 'TEXT' },
      { name: 'annee_publication', type: 'INTEGER' },
      { name: 'genres', type: 'TEXT' },
      { name: 'nb_chapitres', type: 'INTEGER' },
      { name: 'langue_originale', type: 'TEXT' },
      { name: 'demographie', type: 'TEXT' },
      { name: 'rating', type: 'TEXT' }
    ];

    newSeriesColumns.forEach(col => {
      if (!seriesColumnNames.includes(col.name)) {
        console.log(`Migration series : Ajout de la colonne ${col.name}`);
        db.exec(`ALTER TABLE series ADD COLUMN ${col.name} ${col.type}`);
      }
    });

    // Migration pour la table tomes
    const tomesColumns = db.prepare("PRAGMA table_info(tomes)").all();
    const tomesColumnNames = tomesColumns.map(col => col.name);
    
    if (!tomesColumnNames.includes('couverture_url')) {
      console.log('Migration tomes : Ajout de la colonne couverture_url');
      db.exec('ALTER TABLE tomes ADD COLUMN couverture_url TEXT');
    }
    
    // Migration : Rendre la colonne proprietaire nullable
    const proprietaireColumn = tomesColumns.find(col => col.name === 'proprietaire');
    if (proprietaireColumn && proprietaireColumn.notnull === 1) {
      console.log('🔄 Migration tomes : Suppression de la contrainte NOT NULL sur proprietaire...');
      
      db.exec(`
        BEGIN TRANSACTION;
        
        CREATE TABLE tomes_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          serie_id INTEGER NOT NULL,
          numero INTEGER NOT NULL,
          prix REAL NOT NULL DEFAULT 0,
          proprietaire TEXT,
          date_sortie DATE,
          date_achat DATE,
          couverture_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (serie_id) REFERENCES series(id) ON DELETE CASCADE
        );
        
        INSERT INTO tomes_new SELECT * FROM tomes;
        DROP TABLE tomes;
        ALTER TABLE tomes_new RENAME TO tomes;
        
        CREATE INDEX IF NOT EXISTS idx_tomes_serie ON tomes(serie_id);
        CREATE INDEX IF NOT EXISTS idx_tomes_proprietaire ON tomes(proprietaire);
        
        COMMIT;
      `);
      
      console.log('✅ Migration terminée : tomes.proprietaire est maintenant nullable');
    }
    
    // Migration pour la table anime_series (source_import & api_source)
    const animeColumns = db.prepare("PRAGMA table_info(anime_series)").all();
    const animeColumnNames = animeColumns.map(col => col.name);
    
    if (!animeColumnNames.includes('source_import')) {
      console.log('Migration anime_series : Ajout de la colonne source_import');
      db.exec('ALTER TABLE anime_series ADD COLUMN source_import TEXT');
    }
    
    if (!animeColumnNames.includes('api_source')) {
      console.log('Migration anime_series : Ajout de la colonne api_source');
      db.exec('ALTER TABLE anime_series ADD COLUMN api_source TEXT');
    }
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  }

  return db;
}

module.exports = { initDatabase };
