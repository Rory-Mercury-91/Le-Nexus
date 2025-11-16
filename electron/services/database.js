const Database = require('better-sqlite3');
const migrations = [
  require('../migrations/20251109_add_adulte_game_developer'),
  require('../migrations/20251110_add_user_id_ajout'),
  require('../migrations/20250111_change_default_status'),
  require('../migrations/20250112_add_enrichment_tracking')
];

/**
 * Initialise la base de données avec toutes les tables
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
      user_id_ajout INTEGER,
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
      type_tome TEXT DEFAULT 'Standard',
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
      user_id INTEGER NOT NULL,
      lu BOOLEAN NOT NULL DEFAULT 0,
      date_lecture DATETIME,
      FOREIGN KEY (tome_id) REFERENCES tomes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(tome_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS series_masquees (
      serie_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      date_masquage DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (serie_id, user_id),
      FOREIGN KEY (serie_id) REFERENCES series(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS anime_masquees (
      anime_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      date_masquage DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (anime_id, user_id),
      FOREIGN KEY (anime_id) REFERENCES anime_series(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS adulte_game_masquees (
      adulte_game_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      date_masquage DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (adulte_game_id, user_id),
      FOREIGN KEY (adulte_game_id) REFERENCES adulte_game_games(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

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
      user_id_ajout INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id_ajout) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS anime_episodes_vus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      episode_numero INTEGER NOT NULL,
      vu BOOLEAN NOT NULL DEFAULT 0,
      date_visionnage DATETIME,
      FOREIGN KEY (anime_id) REFERENCES anime_series(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(anime_id, user_id, episode_numero)
    );

    CREATE TABLE IF NOT EXISTS anime_statut_utilisateur (
      anime_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      statut_visionnage TEXT NOT NULL DEFAULT 'À regarder',
      score REAL,
      episodes_vus INTEGER DEFAULT 0,
      date_debut TEXT,
      date_fin TEXT,
      date_modification DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (anime_id, user_id),
      FOREIGN KEY (anime_id) REFERENCES anime_series(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK (statut_visionnage IN ('En cours', 'Terminé', 'Abandonné', 'À regarder', 'En pause'))
    );

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS movie_user_status (
      movie_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      statut_visionnage TEXT NOT NULL DEFAULT 'À regarder',
      score REAL,
      date_visionnage TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      date_modification DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (movie_id, user_id),
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK (statut_visionnage IN ('À regarder', 'En cours', 'Terminé', 'Abandonné', 'En pause'))
    );

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

    CREATE TABLE IF NOT EXISTS tv_episode_progress (
      episode_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      vu BOOLEAN NOT NULL DEFAULT 0,
      date_visionnage DATETIME,
      PRIMARY KEY (episode_id, user_id),
      FOREIGN KEY (episode_id) REFERENCES tv_episodes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tv_show_user_status (
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
      date_modification DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (show_id, user_id),
      FOREIGN KEY (show_id) REFERENCES tv_shows(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK (statut_visionnage IN ('À regarder', 'En cours', 'Terminé', 'Abandonné', 'En pause'))
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

    CREATE TABLE IF NOT EXISTS serie_statut_utilisateur (
      serie_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      statut_lecture TEXT NOT NULL DEFAULT 'À lire',
      score REAL,
      volumes_lus INTEGER DEFAULT 0,
      chapitres_lus INTEGER DEFAULT 0,
      date_debut TEXT,
      date_fin TEXT,
      date_modification DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (serie_id, user_id),
      FOREIGN KEY (serie_id) REFERENCES series(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK (statut_lecture IN ('En cours', 'Terminé', 'Abandonné', 'À lire', 'En pause'))
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
      CHECK (tag IS NULL OR tag IN ('a_lire', 'abandonne', 'en_pause', 'en_cours', 'lu'))
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
    CREATE INDEX IF NOT EXISTS idx_lecture_tomes_user ON lecture_tomes(user_id);
    CREATE INDEX IF NOT EXISTS idx_lecture_tomes_tome ON lecture_tomes(tome_id);
    CREATE INDEX IF NOT EXISTS idx_anime_series_mal_id ON anime_series(mal_id);
    CREATE INDEX IF NOT EXISTS idx_anime_series_franchise ON anime_series(franchise_name);
    CREATE INDEX IF NOT EXISTS idx_anime_series_type ON anime_series(type);
    CREATE INDEX IF NOT EXISTS idx_anime_series_annee ON anime_series(annee);
    CREATE INDEX IF NOT EXISTS idx_anime_episodes_vus_user ON anime_episodes_vus(user_id);
    CREATE INDEX IF NOT EXISTS idx_anime_episodes_vus_anime ON anime_episodes_vus(anime_id);
    CREATE INDEX IF NOT EXISTS idx_anime_statut_utilisateur_user ON anime_statut_utilisateur(user_id);
    CREATE INDEX IF NOT EXISTS idx_anime_statut_anime ON anime_statut_utilisateur(anime_id);
    CREATE INDEX IF NOT EXISTS idx_serie_statut_utilisateur ON serie_statut_utilisateur(user_id);
    CREATE INDEX IF NOT EXISTS idx_serie_statut_serie ON serie_statut_utilisateur(serie_id);
    CREATE INDEX IF NOT EXISTS idx_serie_tags_serie ON serie_tags(serie_id);
    CREATE INDEX IF NOT EXISTS idx_serie_tags_user ON serie_tags(user_id);
    CREATE INDEX IF NOT EXISTS idx_serie_tags_tag ON serie_tags(tag);
    CREATE INDEX IF NOT EXISTS idx_anime_tags_anime ON anime_tags(anime_id);
    CREATE INDEX IF NOT EXISTS idx_anime_tags_user ON anime_tags(user_id);
    CREATE INDEX IF NOT EXISTS idx_anime_tags_tag ON anime_tags(tag);
    CREATE INDEX IF NOT EXISTS idx_series_mal_id ON series(mal_id);
    CREATE INDEX IF NOT EXISTS idx_series_source ON series(source_donnees);
    CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
    CREATE INDEX IF NOT EXISTS idx_movies_statut ON movies(statut);
    CREATE INDEX IF NOT EXISTS idx_movie_user_status_user ON movie_user_status(user_id);
    CREATE INDEX IF NOT EXISTS idx_tv_shows_tmdb_id ON tv_shows(tmdb_id);
    CREATE INDEX IF NOT EXISTS idx_tv_shows_statut ON tv_shows(statut);
    CREATE INDEX IF NOT EXISTS idx_tv_seasons_show ON tv_seasons(show_id);
    CREATE INDEX IF NOT EXISTS idx_tv_episodes_show ON tv_episodes(show_id);
    CREATE INDEX IF NOT EXISTS idx_tv_episodes_airdate ON tv_episodes(date_diffusion);
    CREATE INDEX IF NOT EXISTS idx_tv_episode_progress_user ON tv_episode_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_tv_show_user_status_user ON tv_show_user_status(user_id);

    -- Préférences d'affichage mangas (local par manga)
    CREATE TABLE IF NOT EXISTS manga_display_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manga_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      champ VARCHAR(50) NOT NULL,
      visible BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manga_id) REFERENCES series(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(manga_id, user_id, champ)
    );

    -- Préférences globales par utilisateur
    CREATE TABLE IF NOT EXISTS user_manga_display_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      champ VARCHAR(50) NOT NULL,
      visible BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, champ)
    );

    -- Préférences d'affichage animés (local par anime)
    CREATE TABLE IF NOT EXISTS anime_display_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      champ VARCHAR(50) NOT NULL,
      visible BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (anime_id) REFERENCES anime_series(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(anime_id, user_id, champ)
    );

    -- Préférences globales par utilisateur (animés)
    CREATE TABLE IF NOT EXISTS user_anime_display_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      champ VARCHAR(50) NOT NULL,
      visible BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, champ)
    );

    -- Préférences d'affichage jeux adultes (local par jeu)
    CREATE TABLE IF NOT EXISTS adulte_game_display_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      champ VARCHAR(50) NOT NULL,
      visible BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES adulte_game_games(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(game_id, user_id, champ)
    );

    -- Préférences globales des jeux adultes par utilisateur
    CREATE TABLE IF NOT EXISTS user_adulte_game_display_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      champ VARCHAR(50) NOT NULL,
      visible BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, champ)
    );
  `);

  // ========================================
  // TABLES JEUX ADULTES (ADULT GAMES)
  // ========================================
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS adulte_game_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
      -- Données F95Zone
      f95_thread_id INTEGER,
      titre TEXT NOT NULL,
      version TEXT,
      statut_jeu TEXT, -- TERMINÉ, ABANDONNÉ, EN COURS
      moteur TEXT, -- RenPy, Unity, RPGM, Unreal, HTML, etc.
      developpeur TEXT,
      plateforme TEXT DEFAULT 'F95Zone', -- F95Zone, LewdCorner
      couverture_url TEXT,
      tags TEXT, -- JSON array
      lien_f95 TEXT,
      lien_traduction TEXT,
      lien_jeu TEXT, -- Lien download/MEGA/etc
      
      -- Données utilisateur
      statut_perso TEXT, -- Complété, En cours, À jouer, Abandonné
      notes_privees TEXT,
      chemin_executable TEXT, -- Pour lancer le jeu
      derniere_session DATETIME,
      version_jouee TEXT, -- Version détectée depuis le dossier de l'exécutable
      
      -- Informations de traduction
      version_traduction TEXT,
      statut_traduction TEXT, -- Traduction, Traduction (Mod inclus), Traduction intégré
      type_traduction TEXT, -- Manuelle, Semi-automatique, Automatique, VO française
      
      -- Traduction française (Google Sheets sync)
      traduction_fr_disponible BOOLEAN DEFAULT 0,
      version_traduite TEXT,
      traducteur TEXT,
      f95_trad_id INTEGER,
      statut_trad_fr TEXT, -- TERMINÉ, EN COURS
      type_trad_fr TEXT, -- MOD, PATCH, STANDALONE
      derniere_sync_trad DATETIME,
      traductions_multiples TEXT, -- JSON array des traductions multiples
      
      -- Contrôle de version
      version_disponible TEXT, -- Version détectée via API
      maj_disponible BOOLEAN DEFAULT 0,
      derniere_verif DATETIME,
      
      -- Métadonnées
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- Contrainte unique composite (ID + plateforme)
      UNIQUE(f95_thread_id, plateforme)
    );
    
    CREATE TABLE IF NOT EXISTS adulte_game_labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      color TEXT DEFAULT '#8b5cf6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES adulte_game_games(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(game_id, user_id, label)
    );
    
    CREATE TABLE IF NOT EXISTS adulte_game_proprietaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (game_id) REFERENCES adulte_game_games(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(game_id, user_id)
    );
    
    CREATE TABLE IF NOT EXISTS adulte_game_user_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      chemin_executable TEXT,
      notes_privees TEXT,
      statut_perso TEXT,
      derniere_session DATETIME,
      version_jouee TEXT,
      is_favorite BOOLEAN DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES adulte_game_games(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(game_id, user_id)
    );
    
    CREATE TABLE IF NOT EXISTS adulte_game_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      f95_thread_id INTEGER,
      titre TEXT NOT NULL,
      plateforme TEXT DEFAULT 'F95Zone',
      traducteur TEXT,
      user_id INTEGER NOT NULL,
      date_blacklist DATETIME DEFAULT CURRENT_TIMESTAMP,
      raison TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(f95_thread_id, plateforme, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_adulte_game_f95_id ON adulte_game_games(f95_thread_id);
    CREATE INDEX IF NOT EXISTS idx_adulte_game_statut ON adulte_game_games(statut_perso);
    CREATE INDEX IF NOT EXISTS idx_adulte_game_maj ON adulte_game_games(maj_disponible);
    CREATE INDEX IF NOT EXISTS idx_adulte_game_user_games_user ON adulte_game_user_games(user_id);
    CREATE INDEX IF NOT EXISTS idx_adulte_game_user_games_game ON adulte_game_user_games(game_id);
    CREATE INDEX IF NOT EXISTS idx_adulte_game_blacklist_thread ON adulte_game_blacklist(f95_thread_id, plateforme);
    CREATE INDEX IF NOT EXISTS idx_adulte_game_blacklist_user ON adulte_game_blacklist(user_id);
    
    -- Préférences de tags jeux adultes par utilisateur
    CREATE TABLE IF NOT EXISTS adulte_game_tag_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      preference TEXT NOT NULL DEFAULT 'neutral',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, tag),
      CHECK (preference IN ('liked', 'disliked', 'neutral'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_adulte_game_tag_preferences_user ON adulte_game_tag_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_adulte_game_tag_preferences_tag ON adulte_game_tag_preferences(tag);
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      description TEXT,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    const appliedMigrations = new Set(
      db.prepare('SELECT id FROM migrations').all().map(row => row.id)
    );

    for (const migration of migrations) {
      if (!migration?.id || typeof migration.up !== 'function') {
        continue;
      }
      if (appliedMigrations.has(migration.id)) {
        continue;
      }

      console.log(`🛠️ Migration ${migration.id}...`);
      const runMigration = db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO migrations (id, description) VALUES (?, ?)').run(
          migration.id,
          migration.description || null
        );
      });

      runMigration();
      console.log(`✅ Migration ${migration.id} appliquée`);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'application des migrations:', error);
  }
  
  // Garantir la présence des nouvelles colonnes sur les installations existantes
  const animeSeriesColumns = db.prepare(`PRAGMA table_info(anime_series)`).all();
  const hasRelationsColumn = animeSeriesColumns.some(column => column.name === 'relations');
  const hasMovieRelationsColumn = animeSeriesColumns.some(column => column.name === 'movie_relations');

  if (!hasRelationsColumn) {
    db.prepare(`ALTER TABLE anime_series ADD COLUMN relations TEXT`).run();
  }
  if (!hasMovieRelationsColumn) {
    db.prepare(`ALTER TABLE anime_series ADD COLUMN movie_relations TEXT`).run();
  }

  const movieStatusColumns = db.prepare(`PRAGMA table_info(movie_user_status)`).all();
  if (!movieStatusColumns.some(column => column.name === 'is_favorite')) {
    db.exec(`ALTER TABLE movie_user_status ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`);
  }
  if (!movieStatusColumns.some(column => column.name === 'is_hidden')) {
    db.exec(`ALTER TABLE movie_user_status ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0`);
  }

  const tvShowStatusColumns = db.prepare(`PRAGMA table_info(tv_show_user_status)`).all();
  if (!tvShowStatusColumns.some(column => column.name === 'is_favorite')) {
    db.exec(`ALTER TABLE tv_show_user_status ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`);
  }
  if (!tvShowStatusColumns.some(column => column.name === 'is_hidden')) {
    db.exec(`ALTER TABLE tv_show_user_status ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0`);
  }

  console.log('✅ Schéma de base de données créé (Mangas, Animes, Films, Séries, Jeux adultes)');
  
  return db;
}

module.exports = { initDatabase };
