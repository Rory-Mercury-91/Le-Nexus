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
      type_contenu TEXT DEFAULT 'volume',
      couverture_url TEXT,
      description TEXT,
      statut_publication TEXT,
      annee_publication INTEGER,
      genres TEXT,
      nb_chapitres INTEGER,
      chapitres_lus INTEGER DEFAULT 0,
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
      date_lecture DATETIME,
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
      mal_id INTEGER UNIQUE NOT NULL,
      mal_url TEXT,
      titre TEXT NOT NULL,
      titre_romaji TEXT,
      titre_natif TEXT,
      titre_anglais TEXT,
      titres_alternatifs TEXT,
      type TEXT NOT NULL,
      source TEXT,
      nb_episodes INTEGER NOT NULL DEFAULT 0,
      couverture_url TEXT,
      description TEXT,
      statut_diffusion TEXT,
      en_cours_diffusion BOOLEAN DEFAULT 0,
      date_debut TEXT,
      date_fin TEXT,
      duree TEXT,
      annee INTEGER,
      saison_diffusion TEXT,
      genres TEXT,
      themes TEXT,
      demographics TEXT,
      studios TEXT,
      producteurs TEXT,
      diffuseurs TEXT,
      rating TEXT,
      score REAL,
      liens_externes TEXT,
      liens_streaming TEXT,
      franchise_name TEXT,
      franchise_order INTEGER DEFAULT 1,
      prequel_mal_id INTEGER,
      sequel_mal_id INTEGER,
      source_import TEXT DEFAULT 'manual',
      utilisateur_ajout TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS anime_episodes_vus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id INTEGER NOT NULL,
      utilisateur TEXT NOT NULL,
      episode_numero INTEGER NOT NULL,
      vu BOOLEAN NOT NULL DEFAULT 0,
      date_visionnage DATETIME,
      FOREIGN KEY (anime_id) REFERENCES anime_series(id) ON DELETE CASCADE,
      UNIQUE(anime_id, utilisateur, episode_numero)
    );

    CREATE TABLE IF NOT EXISTS anime_statut_utilisateur (
      anime_id INTEGER NOT NULL,
      utilisateur TEXT NOT NULL,
      statut_visionnage TEXT NOT NULL DEFAULT 'En cours',
      date_modification DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (anime_id, utilisateur),
      FOREIGN KEY (anime_id) REFERENCES anime_series(id) ON DELETE CASCADE,
      CHECK (statut_visionnage IN ('En cours', 'Terminé', 'Abandonné', 'En attente'))
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

    CREATE TABLE IF NOT EXISTS serie_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serie_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      tag TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (serie_id) REFERENCES series(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(serie_id, user_id),
      CHECK (tag IS NULL OR tag IN ('a_lire', 'abandonne'))
    );

    CREATE TABLE IF NOT EXISTS anime_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      tag TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (anime_id) REFERENCES anime_series(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(anime_id, user_id),
      CHECK (tag IS NULL OR tag IN ('a_regarder', 'abandonne'))
    );

    CREATE INDEX IF NOT EXISTS idx_tomes_serie ON tomes(serie_id);
    CREATE INDEX IF NOT EXISTS idx_series_statut ON series(statut);
    CREATE INDEX IF NOT EXISTS idx_tomes_proprietaires_tome ON tomes_proprietaires(tome_id);
    CREATE INDEX IF NOT EXISTS idx_tomes_proprietaires_user ON tomes_proprietaires(user_id);
    CREATE INDEX IF NOT EXISTS idx_lecture_tomes_utilisateur ON lecture_tomes(utilisateur);
    CREATE INDEX IF NOT EXISTS idx_lecture_tomes_tome ON lecture_tomes(tome_id);
    CREATE INDEX IF NOT EXISTS idx_anime_series_mal_id ON anime_series(mal_id);
    CREATE INDEX IF NOT EXISTS idx_anime_series_franchise ON anime_series(franchise_name);
    CREATE INDEX IF NOT EXISTS idx_anime_series_type ON anime_series(type);
    CREATE INDEX IF NOT EXISTS idx_anime_series_annee ON anime_series(annee);
    CREATE INDEX IF NOT EXISTS idx_anime_episodes_vus_utilisateur ON anime_episodes_vus(utilisateur);
    CREATE INDEX IF NOT EXISTS idx_anime_episodes_vus_anime ON anime_episodes_vus(anime_id);
    CREATE INDEX IF NOT EXISTS idx_anime_statut_utilisateur ON anime_statut_utilisateur(utilisateur);
    CREATE INDEX IF NOT EXISTS idx_anime_statut_anime ON anime_statut_utilisateur(anime_id);
    CREATE INDEX IF NOT EXISTS idx_serie_tags_serie ON serie_tags(serie_id);
    CREATE INDEX IF NOT EXISTS idx_serie_tags_user ON serie_tags(user_id);
    CREATE INDEX IF NOT EXISTS idx_serie_tags_tag ON serie_tags(tag);
    CREATE INDEX IF NOT EXISTS idx_anime_tags_anime ON anime_tags(anime_id);
    CREATE INDEX IF NOT EXISTS idx_anime_tags_user ON anime_tags(user_id);
    CREATE INDEX IF NOT EXISTS idx_anime_tags_tag ON anime_tags(tag);
  `);

  // ========== MIGRATIONS ==========
  
  console.log('✅ Schéma de base de données créé/vérifié');
  
  return db;
}

module.exports = { initDatabase };
