-- Migration : ajout de la prise en charge des films et séries TV (TMDb / TV Maze)
-- À exécuter manuellement avant de lancer la nouvelle version de l'application.
-- Exemple : sqlite3 path/to/database.sqlite < scripts/migrations/20251109_add_movies_tv.sql

BEGIN TRANSACTION;

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

COMMIT;
