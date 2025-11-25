const Database = require('better-sqlite3');
const { propagateAllRelations } = require('./relations/relation-propagator');

function columnExists(db, tableName, columnName) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return columns.some(col => col.name === columnName);
  } catch (error) {
    console.warn(`⚠️ Impossible de vérifier la colonne ${columnName} sur ${tableName}: ${error.message}`);
    return false;
  }
}

function ensureColumn(db, tableName, columnName, definition) {
  if (columnExists(db, tableName, columnName)) {
    return;
  }

  try {
    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run();
    console.log(`✅ Colonne ${columnName} ajoutée à ${tableName}`);
  } catch (error) {
    console.warn(`⚠️ Impossible d'ajouter la colonne ${columnName} à ${tableName}: ${error.message}`);
  }
}

/**
 * Initialise la base de données avec toutes les tables
 * Schéma consolidé complet - toutes les tables, colonnes, index et contraintes
 * @param {string} dbPath - Chemin vers le fichier de base de données
 * @returns {Database} Instance de la base de données
 */
function initDatabase(dbPath) {
  const db = new Database(dbPath);

  // Création des tables (schéma complet consolidé)
  try {
    db.exec(`
    -- ========================================
    -- TABLES SYSTÈME
    -- ========================================
    
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      emoji TEXT,
      avatar_path TEXT,
      color TEXT NOT NULL DEFAULT '#8b5cf6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- TABLES MANGAS
    -- ========================================
    
    CREATE TABLE IF NOT EXISTS manga_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titre TEXT NOT NULL,
      titre_alternatif TEXT,
      statut TEXT NOT NULL,
      type_volume TEXT NOT NULL,
      type_contenu TEXT DEFAULT 'volume',
      couverture_url TEXT,
      description TEXT,
      statut_publication TEXT,
      statut_publication_vf TEXT,
      annee_publication INTEGER,
      annee_vf INTEGER,
      genres TEXT,
      nb_chapitres INTEGER,
      nb_chapitres_vf INTEGER,
      chapitres_lus INTEGER DEFAULT 0,
      langue_originale TEXT,
      demographie TEXT,
      editeur TEXT,
      editeur_vo TEXT,
      rating TEXT,
      
      -- Nouveaux champs MAL
      mal_id INTEGER UNIQUE,
      titre_romaji TEXT,
      titre_natif TEXT,
      titre_anglais TEXT,
      titres_alternatifs TEXT,
      nb_volumes INTEGER,
      nb_volumes_vf INTEGER,
      date_debut TEXT,
      date_fin TEXT,
      media_type TEXT,
      themes TEXT,
      auteurs TEXT,
      volumes_lus INTEGER DEFAULT 0,
      statut_lecture TEXT,
      score_utilisateur REAL,
      date_debut_lecture TEXT,
      date_fin_lecture TEXT,
      tags TEXT,
      relations TEXT,
      source_donnees TEXT DEFAULT 'nautiljon',
      source_url TEXT,
      source_id TEXT,
      
      -- Champs d'enrichissement manga (Jikan API)
      score_mal REAL,
      rank_mal INTEGER,
      popularity_mal INTEGER,
      serialization TEXT,
      background TEXT,
      prequel_mal_id INTEGER,
      sequel_mal_id INTEGER,
      anime_adaptation_mal_id INTEGER,
      light_novel_mal_id INTEGER,
      manga_adaptation_mal_id INTEGER,
      chapitres_mihon INTEGER DEFAULT 0,
      nautiljon_url TEXT,
      enriched_at DATETIME,
      user_modified_fields TEXT,
      maj_disponible BOOLEAN DEFAULT 0,
      derniere_verif DATETIME,
      user_id_ajout INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS manga_tomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serie_id INTEGER NOT NULL,
      numero INTEGER NOT NULL,
      prix REAL NOT NULL DEFAULT 0,
      date_sortie DATE,
      date_achat DATE,
      couverture_url TEXT,
      type_tome TEXT DEFAULT 'Standard',
      mihon INTEGER DEFAULT 0,
      mihon_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (serie_id) REFERENCES manga_series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS manga_manga_tomes_proprietaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serie_id INTEGER NOT NULL,
      tome_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (serie_id) REFERENCES manga_series(id) ON DELETE CASCADE,
      FOREIGN KEY (tome_id) REFERENCES manga_tomes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(tome_id, user_id)
    );

    CREATE TRIGGER IF NOT EXISTS trg_manga_manga_tomes_proprietaires_updated_at
    AFTER UPDATE ON manga_manga_tomes_proprietaires
    FOR EACH ROW
    BEGIN
      UPDATE manga_manga_tomes_proprietaires
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.id;
    END;

    CREATE TABLE IF NOT EXISTS manga_user_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serie_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      statut_lecture TEXT NOT NULL DEFAULT 'À lire',
      score REAL,
      volumes_lus INTEGER DEFAULT 0,
      chapitres_lus INTEGER DEFAULT 0,
      date_debut TEXT,
      date_fin TEXT,
      tag TEXT,
      tag_manual_override INTEGER NOT NULL DEFAULT 0,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      notes_privees TEXT,
      tome_progress TEXT,
      display_preferences TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (serie_id) REFERENCES manga_series(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(serie_id, user_id),
      CHECK (statut_lecture IN ('À lire', 'En cours', 'Terminé', 'Abandonné', 'En pause'))
    );

    -- ========================================
    -- TABLES ANIMES
    -- ========================================

    CREATE TABLE IF NOT EXISTS anime_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mal_id INTEGER UNIQUE,
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
      date_sortie_vf TEXT,
      date_debut_streaming TEXT,
      duree TEXT,
      annee INTEGER,
      saison_diffusion TEXT,
      genres TEXT,
      themes TEXT,
      demographics TEXT,
      studios TEXT,
      producteurs TEXT,
      diffuseurs TEXT,
      editeur TEXT,
      site_web TEXT,
      rating TEXT,
      age_conseille TEXT,
      score REAL,
      rank_mal INTEGER,
      popularity_mal INTEGER,
      scored_by INTEGER,
      favorites INTEGER,
      background TEXT,
      liens_externes TEXT,
      liens_streaming TEXT,
      franchise_name TEXT,
      franchise_order INTEGER DEFAULT 1,
      prequel_mal_id INTEGER,
      sequel_mal_id INTEGER,
      manga_source_mal_id INTEGER,
      light_novel_source_mal_id INTEGER,
      relations TEXT,
      movie_relations TEXT,
      source_import TEXT DEFAULT 'manual',
      maj_disponible BOOLEAN DEFAULT 0,
      derniere_verif DATETIME,
      enriched_at DATETIME,
      user_modified_fields TEXT,
      nautiljon_url TEXT,
      user_id_ajout INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id_ajout) REFERENCES users(id) ON DELETE SET NULL
    );

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

    CREATE TABLE IF NOT EXISTS anime_user_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      statut_visionnage TEXT NOT NULL DEFAULT 'À regarder',
      score REAL,
      episodes_vus INTEGER DEFAULT 0,
      date_debut TEXT,
      date_fin TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      tag TEXT,
      labels TEXT,
      notes_privees TEXT,
      episode_progress TEXT,
      display_preferences TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (anime_id) REFERENCES anime_series(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(anime_id, user_id),
      CHECK (statut_visionnage IN ('À regarder', 'En cours', 'Terminé', 'Abandonné', 'En pause'))
    );

    -- ========================================
    -- TABLES FILMS
    -- ========================================
    
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id INTEGER NOT NULL UNIQUE,
      imdb_id TEXT,
      titre TEXT NOT NULL,
      titre_original TEXT,
      tagline TEXT,
      synopsis TEXT,
      statut TEXT,
      date_sortie TEXT,
      duree INTEGER,
      budget INTEGER,
      revenus INTEGER,
      note_moyenne REAL,
      nb_votes INTEGER,
      popularite REAL,
      adulte BOOLEAN DEFAULT 0,
      genres TEXT,
      mots_cles TEXT,
      langues_parlees TEXT,
      compagnies TEXT,
      pays_production TEXT,
      site_officiel TEXT,
      poster_path TEXT,
      backdrop_path TEXT,
      videos TEXT,
      images TEXT,
      fournisseurs TEXT,
      ids_externes TEXT,
      traductions TEXT,
      donnees_brutes TEXT,
      derniere_sync DATETIME,
      enriched_at DATETIME,
      user_modified_fields TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS movie_user_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movie_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      statut_visionnage TEXT NOT NULL DEFAULT 'À regarder',
      score REAL,
      date_visionnage TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      notes_privees TEXT,
      user_images TEXT,
      user_videos TEXT,
      display_preferences TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(movie_id, user_id),
      CHECK (statut_visionnage IN ('À regarder', 'En cours', 'Terminé', 'Abandonné', 'En pause'))
    );

    -- ========================================
    -- TABLES SÉRIES TV
    -- ========================================
    
    CREATE TABLE IF NOT EXISTS tv_shows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id INTEGER NOT NULL UNIQUE,
      tvmaze_id INTEGER,
      imdb_id TEXT,
      titre TEXT NOT NULL,
      titre_original TEXT,
      tagline TEXT,
      synopsis TEXT,
      statut TEXT,
      type TEXT,
      nb_saisons INTEGER,
      nb_episodes INTEGER,
      duree_episode INTEGER,
      date_premiere TEXT,
      date_derniere TEXT,
      prochain_episode TEXT,
      dernier_episode TEXT,
      genres TEXT,
      mots_cles TEXT,
      langues_parlees TEXT,
      compagnies TEXT,
      pays_production TEXT,
      reseaux TEXT,
      plateformes TEXT,
      poster_path TEXT,
      backdrop_path TEXT,
      images TEXT,
      videos TEXT,
      fournisseurs TEXT,
      ids_externes TEXT,
      traductions TEXT,
      donnees_brutes TEXT,
      derniere_sync DATETIME,
      enriched_at DATETIME,
      user_modified_fields TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tv_seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_id INTEGER NOT NULL,
      tmdb_id INTEGER,
      numero INTEGER NOT NULL,
      titre TEXT,
      synopsis TEXT,
      date_premiere TEXT,
      nb_episodes INTEGER,
      poster_path TEXT,
      donnees_brutes TEXT,
      derniere_sync DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (show_id) REFERENCES tv_shows(id) ON DELETE CASCADE,
      UNIQUE(show_id, numero)
    );

    CREATE TABLE IF NOT EXISTS tv_episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_id INTEGER NOT NULL,
      season_id INTEGER,
      tmdb_id INTEGER,
      tvmaze_id INTEGER,
      saison_numero INTEGER NOT NULL,
      episode_numero INTEGER NOT NULL,
      titre TEXT,
      synopsis TEXT,
      date_diffusion TEXT,
      duree INTEGER,
      note_moyenne REAL,
      nb_votes INTEGER,
      still_path TEXT,
      donnees_brutes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (show_id) REFERENCES tv_shows(id) ON DELETE CASCADE,
      FOREIGN KEY (season_id) REFERENCES tv_seasons(id) ON DELETE SET NULL,
      UNIQUE(show_id, saison_numero, episode_numero)
    );

    CREATE TABLE IF NOT EXISTS tv_show_user_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      statut_visionnage TEXT NOT NULL DEFAULT 'À regarder',
      score REAL,
      saisons_vues INTEGER DEFAULT 0,
      episodes_vus INTEGER DEFAULT 0,
      date_debut TEXT,
      date_fin TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      notes_privees TEXT,
      user_images TEXT,
      user_videos TEXT,
      episode_videos TEXT,
      episode_progress TEXT,
      display_preferences TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (show_id) REFERENCES tv_shows(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(show_id, user_id),
      CHECK (statut_visionnage IN ('À regarder', 'En cours', 'Terminé', 'Abandonné', 'En pause'))
    );

    -- ========================================
    -- TABLES JEUX ADULTES
    -- ========================================

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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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

    -- ========================================
    -- TABLE PRÉFÉRENCES GLOBALES
    -- ========================================

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

    -- ========================================
    -- INDEX
    -- ========================================

    -- Index mangas
    CREATE INDEX IF NOT EXISTS idx_manga_tomes_serie ON manga_tomes(serie_id);
    CREATE INDEX IF NOT EXISTS idx_manga_series_statut ON manga_series(statut);
    CREATE INDEX IF NOT EXISTS idx_manga_manga_tomes_prop_tome ON manga_manga_tomes_proprietaires(tome_id);
    CREATE INDEX IF NOT EXISTS idx_manga_manga_tomes_prop_user ON manga_manga_tomes_proprietaires(user_id);
    CREATE INDEX IF NOT EXISTS idx_manga_manga_tomes_prop_serie ON manga_manga_tomes_proprietaires(serie_id);
    CREATE INDEX IF NOT EXISTS idx_manga_series_mal_id ON manga_series(mal_id);
    CREATE INDEX IF NOT EXISTS idx_manga_series_source ON manga_series(source_donnees);
    CREATE INDEX IF NOT EXISTS idx_manga_user_data_serie ON manga_user_data(serie_id);
    CREATE INDEX IF NOT EXISTS idx_manga_user_data_user ON manga_user_data(user_id);
    
    -- Index animes
    CREATE INDEX IF NOT EXISTS idx_anime_series_mal_id ON anime_series(mal_id);
    CREATE INDEX IF NOT EXISTS idx_anime_series_franchise ON anime_series(franchise_name);
    CREATE INDEX IF NOT EXISTS idx_anime_series_type ON anime_series(type);
    CREATE INDEX IF NOT EXISTS idx_anime_series_annee ON anime_series(annee);
    CREATE INDEX IF NOT EXISTS idx_anime_user_data_anime ON anime_user_data(anime_id);
    CREATE INDEX IF NOT EXISTS idx_anime_user_data_user ON anime_user_data(user_id);
    CREATE INDEX IF NOT EXISTS idx_anime_episodes_anime ON anime_episodes(anime_id);
    
    -- Index films
    CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
    CREATE INDEX IF NOT EXISTS idx_movies_statut ON movies(statut);
    CREATE INDEX IF NOT EXISTS idx_movie_user_data_movie ON movie_user_data(movie_id);
    CREATE INDEX IF NOT EXISTS idx_movie_user_data_user ON movie_user_data(user_id);
    
    -- Index séries TV
    CREATE INDEX IF NOT EXISTS idx_tv_shows_tmdb_id ON tv_shows(tmdb_id);
    CREATE INDEX IF NOT EXISTS idx_tv_shows_statut ON tv_shows(statut);
    CREATE INDEX IF NOT EXISTS idx_tv_seasons_show ON tv_seasons(show_id);
    CREATE INDEX IF NOT EXISTS idx_tv_episodes_show ON tv_episodes(show_id);
    CREATE INDEX IF NOT EXISTS idx_tv_episodes_airdate ON tv_episodes(date_diffusion);
    CREATE INDEX IF NOT EXISTS idx_tv_show_user_data_show ON tv_show_user_data(show_id);
    CREATE INDEX IF NOT EXISTS idx_tv_show_user_data_user ON tv_show_user_data(user_id);
    
    -- Index jeux adultes
    CREATE INDEX IF NOT EXISTS idx_adulte_game_f95_id ON adulte_game_games(f95_thread_id);
    CREATE INDEX IF NOT EXISTS idx_adulte_game_maj ON adulte_game_games(maj_disponible);
    CREATE INDEX IF NOT EXISTS idx_adulte_game_user_data_game ON adulte_game_user_data(game_id);
    CREATE INDEX IF NOT EXISTS idx_adulte_game_user_data_user ON adulte_game_user_data(user_id);
    
    -- Index préférences globales
    CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_preferences_type ON user_preferences(type);
    CREATE INDEX IF NOT EXISTS idx_user_preferences_content_type ON user_preferences(content_type);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_preferences_unique 
    ON user_preferences(user_id, COALESCE(content_type, ''), type, key, COALESCE(platform, ''));
  `);
  } catch (schemaError) {
    console.error('❌ Erreur lors de la création du schéma consolidé:', schemaError.message);
    throw schemaError;
  }

  // Compatibilité pour les bases existantes: s'assurer que les nouvelles colonnes critiques existent
  try {
    ensureColumn(db, 'anime_series', 'maj_disponible', 'BOOLEAN DEFAULT 0');
    ensureColumn(db, 'anime_series', 'derniere_verif', 'DATETIME');
    ensureColumn(db, 'manga_series', 'maj_disponible', 'BOOLEAN DEFAULT 0');
    ensureColumn(db, 'manga_series', 'derniere_verif', 'DATETIME');
  } catch (compatibilityError) {
    console.warn('⚠️ Erreur lors de la vérification des colonnes obligatoires:', compatibilityError.message);
  }

  // Créer les contraintes UNIQUE via des index UNIQUE
  try {
    // Contraintes UNIQUE pour adulte_game_games
    try {
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_adulte_game_unique_f95 
        ON adulte_game_games(f95_thread_id, game_site) 
        WHERE f95_thread_id IS NOT NULL
      `);
    } catch (e) {
      // Index peut déjà exister, ignorer l'erreur
    }
    
    try {
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_adulte_game_unique_lewdcorner 
        ON adulte_game_games(Lewdcorner_thread_id, game_site) 
        WHERE Lewdcorner_thread_id IS NOT NULL
      `);
    } catch (e) {
      // Index peut déjà exister, ignorer l'erreur
    }
    
    // Index sur Lewdcorner_thread_id
    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_adulte_game_lewdcorner_id 
        ON adulte_game_games(Lewdcorner_thread_id)
      `);
    } catch (e) {
      // Index peut déjà exister, ignorer l'erreur
    }
    
    // Index sur game_site
    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_adulte_game_site 
        ON adulte_game_games(game_site)
      `);
    } catch (e) {
      // Index peut déjà exister, ignorer l'erreur
    }
  } catch (constraintError) {
    console.warn('⚠️ Erreur lors de la création des contraintes UNIQUE:', constraintError.message);
  }

  console.log('✅ Schéma de base de données créé (Mangas, Animes, Films, Séries, Jeux adultes)');

  return db;
}

/**
 * Applique les migrations à toutes les bases de données utilisateur
 * Assure que toutes les colonnes critiques existent dans toutes les bases
 * @param {string} databasesPath - Chemin vers le dossier databases
 * @returns {Object} Résultat avec le nombre de bases migrées
 */
function migrateAllDatabases(databasesPath) {
  const fs = require('fs');
  const path = require('path');
  
  let migrated = 0;
  const errors = [];
  
  if (!fs.existsSync(databasesPath)) {
    return { success: true, migrated: 0, errors: [] };
  }
  
  try {
    const dbFiles = fs.readdirSync(databasesPath).filter(f =>
      f.endsWith('.db') && !f.startsWith('temp_')
    );
    
    for (const dbFile of dbFiles) {
      try {
        const dbPath = path.join(databasesPath, dbFile);
        const db = new Database(dbPath);
        
        // Appliquer les migrations pour toutes les colonnes critiques
        ensureColumn(db, 'anime_series', 'maj_disponible', 'BOOLEAN DEFAULT 0');
        ensureColumn(db, 'anime_series', 'derniere_verif', 'DATETIME');
        ensureColumn(db, 'manga_series', 'maj_disponible', 'BOOLEAN DEFAULT 0');
        ensureColumn(db, 'manga_series', 'derniere_verif', 'DATETIME');

        // Synchroniser les relations existantes pour assurer une navigation cohérente
        propagateAllRelations(db);
        
        db.close();
        migrated++;
        console.log(`✅ Migration appliquée à ${dbFile}`);
      } catch (error) {
        errors.push({ file: dbFile, error: error.message });
        console.warn(`⚠️ Erreur lors de la migration de ${dbFile}:`, error.message);
      }
    }
  } catch (error) {
    errors.push({ file: 'unknown', error: error.message });
    console.warn('⚠️ Erreur lors de la migration des bases:', error.message);
  }
  
  return { success: errors.length === 0, migrated, errors };
}

module.exports = { initDatabase, migrateAllDatabases };
