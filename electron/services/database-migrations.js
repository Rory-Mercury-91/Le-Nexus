const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

/**
 * Vérifie si une colonne existe dans une table
 */
function columnExists(db, tableName, columnName) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return columns.some(col => col.name === columnName);
  } catch (error) {
    console.warn(`⚠️ Impossible de vérifier la colonne ${columnName} sur ${tableName}: ${error.message}`);
    return false;
  }
}

/**
 * Vérifie si une table existe
 */
function tableExists(db, tableName) {
  try {
    const result = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `).get(tableName);
    return !!result;
  } catch (error) {
    console.warn(`⚠️ Impossible de vérifier la table ${tableName}: ${error.message}`);
    return false;
  }
}

/**
 * Ajoute une colonne à une table si elle n'existe pas
 */
function ensureColumn(db, tableName, columnName, definition) {
  if (columnExists(db, tableName, columnName)) {
    return;
  }

  try {
    // SQLite ne permet pas d'ajouter une colonne avec DEFAULT CURRENT_TIMESTAMP
    // On doit d'abord ajouter la colonne sans valeur par défaut, puis mettre à jour les valeurs
    let definitionToUse = definition;
    const needsDefaultUpdate = definition.includes('DEFAULT CURRENT_TIMESTAMP');

    if (needsDefaultUpdate) {
      // Remplacer DEFAULT CURRENT_TIMESTAMP par une valeur par défaut constante ou rien
      // Pour les colonnes DATETIME, on peut utiliser NULL comme valeur par défaut
      definitionToUse = definition.replace(/DEFAULT CURRENT_TIMESTAMP/i, '');
    }

    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionToUse}`).run();

    // Si on a besoin de mettre à jour les valeurs par défaut, le faire maintenant
    if (needsDefaultUpdate) {
      try {
        // Mettre à jour toutes les lignes existantes avec la valeur actuelle
        db.prepare(`UPDATE ${tableName} SET ${columnName} = datetime('now') WHERE ${columnName} IS NULL`).run();
      } catch (updateError) {
        // Ignorer les erreurs de mise à jour (peut être que la colonne n'a pas de valeurs NULL)
        console.warn(`⚠️ Impossible de mettre à jour les valeurs par défaut pour ${columnName} dans ${tableName}: ${updateError.message}`);
      }
    }

    console.log(`✅ Colonne ${columnName} ajoutée à ${tableName}`);
  } catch (error) {
    console.warn(`⚠️ Impossible d'ajouter la colonne ${columnName} à ${tableName}: ${error.message}`);
  }
}

/**
 * Migration complète de toutes les tables et colonnes
 * S'assure que toutes les structures nécessaires existent
 */
function migrateDatabaseSchema(db) {
  console.log('🔄 Application des migrations de schéma...');

  // Vérifier que la table users existe et a toutes ses colonnes
  ensureColumn(db, 'users', 'id', 'INTEGER PRIMARY KEY AUTOINCREMENT');
  ensureColumn(db, 'users', 'name', 'TEXT NOT NULL UNIQUE');
  ensureColumn(db, 'users', 'emoji', 'TEXT');
  ensureColumn(db, 'users', 'avatar_path', 'TEXT');
  ensureColumn(db, 'users', 'color', 'TEXT NOT NULL DEFAULT \'#8b5cf6\'');
  ensureColumn(db, 'users', 'sync_uuid', 'TEXT');
  ensureColumn(db, 'users', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'users', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Ajouter un index UNIQUE sur sync_uuid s'il n'existe pas
  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sync_uuid 
      ON users(sync_uuid) 
      WHERE sync_uuid IS NOT NULL
    `);
  } catch (e) {
    // Index peut déjà exister, ignorer
  }

  // Manga series - Assurer toutes les colonnes générales (pas les colonnes utilisateur)
  // Colonnes de base
  ensureColumn(db, 'manga_series', 'titre', 'TEXT NOT NULL');
  ensureColumn(db, 'manga_series', 'titre_alternatif', 'TEXT');
  ensureColumn(db, 'manga_series', 'statut', 'TEXT NOT NULL');
  ensureColumn(db, 'manga_series', 'type_volume', 'TEXT NOT NULL');
  ensureColumn(db, 'manga_series', 'type_contenu', 'TEXT DEFAULT \'volume\'');
  ensureColumn(db, 'manga_series', 'couverture_url', 'TEXT');
  ensureColumn(db, 'manga_series', 'description', 'TEXT');
  ensureColumn(db, 'manga_series', 'statut_publication', 'TEXT');
  ensureColumn(db, 'manga_series', 'statut_publication_vf', 'TEXT');
  ensureColumn(db, 'manga_series', 'annee_publication', 'INTEGER');
  ensureColumn(db, 'manga_series', 'annee_vf', 'INTEGER');
  ensureColumn(db, 'manga_series', 'genres', 'TEXT');
  ensureColumn(db, 'manga_series', 'nb_chapitres', 'INTEGER');
  ensureColumn(db, 'manga_series', 'nb_chapitres_vf', 'INTEGER');
  ensureColumn(db, 'manga_series', 'langue_originale', 'TEXT');
  ensureColumn(db, 'manga_series', 'demographie', 'TEXT');
  ensureColumn(db, 'manga_series', 'editeur', 'TEXT');
  ensureColumn(db, 'manga_series', 'editeur_vo', 'TEXT');
  ensureColumn(db, 'manga_series', 'rating', 'TEXT');

  // Colonnes MAL/AniList
  ensureColumn(db, 'manga_series', 'mal_id', 'INTEGER UNIQUE');
  ensureColumn(db, 'manga_series', 'anilist_id', 'INTEGER UNIQUE');
  ensureColumn(db, 'manga_series', 'titre_romaji', 'TEXT');
  ensureColumn(db, 'manga_series', 'titre_natif', 'TEXT');
  // Ajout migration automatique pour compatibilité avec anciennes bases
  ensureColumn(db, 'manga_series', 'titre_original', 'TEXT');
  ensureColumn(db, 'manga_series', 'titre_anglais', 'TEXT');
  ensureColumn(db, 'manga_series', 'titres_alternatifs', 'TEXT');
  ensureColumn(db, 'manga_series', 'nb_volumes', 'INTEGER');
  ensureColumn(db, 'manga_series', 'nb_volumes_vf', 'INTEGER');
  ensureColumn(db, 'manga_series', 'date_debut', 'TEXT');
  ensureColumn(db, 'manga_series', 'date_fin', 'TEXT');
  ensureColumn(db, 'manga_series', 'media_type', 'TEXT');
  ensureColumn(db, 'manga_series', 'themes', 'TEXT');
  ensureColumn(db, 'manga_series', 'auteurs', 'TEXT');
  ensureColumn(db, 'manga_series', 'tags', 'TEXT');
  ensureColumn(db, 'manga_series', 'relations', 'TEXT');

  // Colonnes sources
  ensureColumn(db, 'manga_series', 'source_donnees', 'TEXT DEFAULT \'nautiljon\'');
  ensureColumn(db, 'manga_series', 'source_url', 'TEXT');
  ensureColumn(db, 'manga_series', 'source_id', 'TEXT');

  // Colonnes enrichissement MAL
  ensureColumn(db, 'manga_series', 'score_mal', 'REAL');
  ensureColumn(db, 'manga_series', 'rank_mal', 'INTEGER');
  ensureColumn(db, 'manga_series', 'popularity_mal', 'INTEGER');
  ensureColumn(db, 'manga_series', 'serialization', 'TEXT');
  ensureColumn(db, 'manga_series', 'background', 'TEXT');
  ensureColumn(db, 'manga_series', 'prequel_mal_id', 'INTEGER');
  ensureColumn(db, 'manga_series', 'sequel_mal_id', 'INTEGER');
  ensureColumn(db, 'manga_series', 'anime_adaptation_mal_id', 'INTEGER');
  ensureColumn(db, 'manga_series', 'light_novel_mal_id', 'INTEGER');
  ensureColumn(db, 'manga_series', 'manga_adaptation_mal_id', 'INTEGER');
  ensureColumn(db, 'manga_series', 'chapitres_mihon', 'INTEGER DEFAULT 0');
  ensureColumn(db, 'manga_series', 'nautiljon_url', 'TEXT');
  ensureColumn(db, 'manga_series', 'enriched_at', 'DATETIME');
  ensureColumn(db, 'manga_series', 'user_modified_fields', 'TEXT');
  ensureColumn(db, 'manga_series', 'maj_disponible', 'BOOLEAN DEFAULT 0');
  ensureColumn(db, 'manga_series', 'derniere_verif', 'DATETIME');
  ensureColumn(db, 'manga_series', 'user_id_ajout', 'INTEGER');
  ensureColumn(db, 'manga_series', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'manga_series', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Note: Les colonnes utilisateur suivantes sont volontairement EXCLUES de la migration car elles doivent rester spécifiques à chaque utilisateur :
  // - chapitres_lus
  // - volumes_lus
  // - statut_lecture
  // - score_utilisateur
  // - date_debut_lecture
  // - date_fin_lecture

  ensureColumn(db, 'manga_user_data', 'labels', 'TEXT');

  // Manga tomes - Assurer toutes les colonnes
  ensureColumn(db, 'manga_tomes', 'serie_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'manga_tomes', 'numero', 'INTEGER NOT NULL');
  ensureColumn(db, 'manga_tomes', 'prix', 'REAL NOT NULL DEFAULT 0');
  ensureColumn(db, 'manga_tomes', 'date_sortie', 'DATE');
  ensureColumn(db, 'manga_tomes', 'date_achat', 'DATE'); // Partagé pour suivre les coûts partagés
  ensureColumn(db, 'manga_tomes', 'couverture_url', 'TEXT');
  ensureColumn(db, 'manga_tomes', 'type_tome', 'TEXT DEFAULT \'Standard\'');
  ensureColumn(db, 'manga_tomes', 'mihon', 'INTEGER DEFAULT 0');
  ensureColumn(db, 'manga_tomes', 'mihon_id', 'TEXT');
  ensureColumn(db, 'manga_tomes', 'mihon_user_id', 'INTEGER');
  ensureColumn(db, 'manga_tomes', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'manga_tomes', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Manga tomes proprietaires - Assurer toutes les colonnes (fusionnée pour partage des coûts)
  ensureColumn(db, 'manga_manga_tomes_proprietaires', 'serie_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'manga_manga_tomes_proprietaires', 'tome_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'manga_manga_tomes_proprietaires', 'user_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'manga_manga_tomes_proprietaires', 'user_uuid', 'TEXT');
  ensureColumn(db, 'manga_manga_tomes_proprietaires', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'manga_manga_tomes_proprietaires', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Migrer les UUIDs pour les propriétaires existants
  try {
    const proprietairesWithoutUuid = db.prepare(`
      SELECT DISTINCT tp.user_id, u.sync_uuid
      FROM manga_manga_tomes_proprietaires tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.user_uuid IS NULL AND u.sync_uuid IS NOT NULL
    `).all();

    if (proprietairesWithoutUuid.length > 0) {
      const crypto = require('crypto');
      const updateStmt = db.prepare('UPDATE manga_manga_tomes_proprietaires SET user_uuid = ? WHERE user_id = ? AND user_uuid IS NULL');

      for (const prop of proprietairesWithoutUuid) {
        // Si l'utilisateur n'a pas d'UUID, en générer un
        let uuid = prop.sync_uuid;
        if (!uuid) {
          uuid = crypto.randomUUID();
          db.prepare('UPDATE users SET sync_uuid = ? WHERE id = ?').run(uuid, prop.user_id);
        }
        updateStmt.run(uuid, prop.user_id);
      }

      if (proprietairesWithoutUuid.length > 0) {
        console.log(`✅ Migration: ${proprietairesWithoutUuid.length} propriétaires ont reçu un UUID`);
      }
    }
  } catch (e) {
    console.warn('⚠️ Erreur migration UUID propriétaires:', e.message);
  }

  // Anime series - Toutes les colonnes générales (toutes doivent être fusionnées)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'anime_series', 'mal_id', 'INTEGER UNIQUE');
  ensureColumn(db, 'anime_series', 'anilist_id', 'INTEGER UNIQUE');
  ensureColumn(db, 'anime_series', 'mal_url', 'TEXT');
  ensureColumn(db, 'anime_series', 'titre', 'TEXT NOT NULL');
  ensureColumn(db, 'anime_series', 'titre_romaji', 'TEXT');
  ensureColumn(db, 'anime_series', 'titre_natif', 'TEXT');
  ensureColumn(db, 'anime_series', 'titre_anglais', 'TEXT');
  ensureColumn(db, 'anime_series', 'titres_alternatifs', 'TEXT');
  ensureColumn(db, 'anime_series', 'type', 'TEXT NOT NULL');
  ensureColumn(db, 'anime_series', 'source', 'TEXT');
  ensureColumn(db, 'anime_series', 'nb_episodes', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'anime_series', 'couverture_url', 'TEXT');
  ensureColumn(db, 'anime_series', 'description', 'TEXT');
  ensureColumn(db, 'anime_series', 'statut_diffusion', 'TEXT');
  ensureColumn(db, 'anime_series', 'en_cours_diffusion', 'BOOLEAN DEFAULT 0');
  ensureColumn(db, 'anime_series', 'date_debut', 'TEXT');
  ensureColumn(db, 'anime_series', 'date_fin', 'TEXT');
  ensureColumn(db, 'anime_series', 'date_sortie_vf', 'TEXT');
  ensureColumn(db, 'anime_series', 'date_debut_streaming', 'TEXT');
  ensureColumn(db, 'anime_series', 'duree', 'TEXT');
  ensureColumn(db, 'anime_series', 'annee', 'INTEGER');
  ensureColumn(db, 'anime_series', 'saison_diffusion', 'TEXT');
  ensureColumn(db, 'anime_series', 'genres', 'TEXT');
  ensureColumn(db, 'anime_series', 'themes', 'TEXT');
  ensureColumn(db, 'anime_series', 'demographics', 'TEXT');
  ensureColumn(db, 'anime_series', 'studios', 'TEXT');
  ensureColumn(db, 'anime_series', 'producteurs', 'TEXT');
  ensureColumn(db, 'anime_series', 'diffuseurs', 'TEXT');
  ensureColumn(db, 'anime_series', 'editeur', 'TEXT');
  ensureColumn(db, 'anime_series', 'site_web', 'TEXT');
  ensureColumn(db, 'anime_series', 'rating', 'TEXT');
  ensureColumn(db, 'anime_series', 'age_conseille', 'TEXT');
  ensureColumn(db, 'anime_series', 'score', 'REAL');
  ensureColumn(db, 'anime_series', 'rank_mal', 'INTEGER');
  ensureColumn(db, 'anime_series', 'popularity_mal', 'INTEGER');
  ensureColumn(db, 'anime_series', 'scored_by', 'INTEGER');
  ensureColumn(db, 'anime_series', 'favorites', 'INTEGER');
  ensureColumn(db, 'anime_series', 'background', 'TEXT');
  ensureColumn(db, 'anime_series', 'liens_externes', 'TEXT');
  ensureColumn(db, 'anime_series', 'liens_streaming', 'TEXT');
  ensureColumn(db, 'anime_series', 'franchise_name', 'TEXT');
  ensureColumn(db, 'anime_series', 'franchise_order', 'INTEGER DEFAULT 1');
  ensureColumn(db, 'anime_series', 'prequel_mal_id', 'INTEGER');
  ensureColumn(db, 'anime_series', 'sequel_mal_id', 'INTEGER');
  ensureColumn(db, 'anime_series', 'manga_source_mal_id', 'INTEGER');
  ensureColumn(db, 'anime_series', 'light_novel_source_mal_id', 'INTEGER');
  ensureColumn(db, 'anime_series', 'relations', 'TEXT');
  ensureColumn(db, 'anime_series', 'movie_relations', 'TEXT');
  ensureColumn(db, 'anime_series', 'source_import', 'TEXT DEFAULT \'manual\'');
  ensureColumn(db, 'anime_series', 'maj_disponible', 'BOOLEAN DEFAULT 0');
  ensureColumn(db, 'anime_series', 'derniere_verif', 'DATETIME');
  ensureColumn(db, 'anime_series', 'enriched_at', 'DATETIME');
  ensureColumn(db, 'anime_series', 'user_modified_fields', 'TEXT');
  ensureColumn(db, 'anime_series', 'nautiljon_url', 'TEXT');
  ensureColumn(db, 'anime_series', 'user_id_ajout', 'INTEGER');
  ensureColumn(db, 'anime_series', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'anime_series', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Anime user data - Toutes les colonnes (données utilisateur, NE PAS fusionner)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'anime_user_data', 'anime_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'anime_user_data', 'user_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'anime_user_data', 'statut_visionnage', 'TEXT NOT NULL DEFAULT \'À regarder\'');
  ensureColumn(db, 'anime_user_data', 'score', 'REAL');
  ensureColumn(db, 'anime_user_data', 'episodes_vus', 'INTEGER DEFAULT 0');
  ensureColumn(db, 'anime_user_data', 'date_debut', 'TEXT');
  ensureColumn(db, 'anime_user_data', 'date_fin', 'TEXT');
  ensureColumn(db, 'anime_user_data', 'is_favorite', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'anime_user_data', 'is_hidden', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'anime_user_data', 'tag', 'TEXT');
  ensureColumn(db, 'anime_user_data', 'labels', 'TEXT');
  ensureColumn(db, 'anime_user_data', 'notes_privees', 'TEXT');
  ensureColumn(db, 'anime_user_data', 'episode_progress', 'TEXT');
  ensureColumn(db, 'anime_user_data', 'display_preferences', 'TEXT');
  ensureColumn(db, 'anime_user_data', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'anime_user_data', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Movies - Toutes les colonnes générales (toutes doivent être fusionnées)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'movies', 'tmdb_id', 'INTEGER NOT NULL UNIQUE');
  ensureColumn(db, 'movies', 'imdb_id', 'TEXT');
  ensureColumn(db, 'movies', 'titre', 'TEXT NOT NULL');
  ensureColumn(db, 'movies', 'titre_original', 'TEXT');
  ensureColumn(db, 'movies', 'tagline', 'TEXT');
  ensureColumn(db, 'movies', 'synopsis', 'TEXT');
  ensureColumn(db, 'movies', 'statut', 'TEXT');
  ensureColumn(db, 'movies', 'date_sortie', 'TEXT');
  ensureColumn(db, 'movies', 'duree', 'INTEGER');
  ensureColumn(db, 'movies', 'budget', 'INTEGER');
  ensureColumn(db, 'movies', 'revenus', 'INTEGER');
  ensureColumn(db, 'movies', 'note_moyenne', 'REAL');
  ensureColumn(db, 'movies', 'nb_votes', 'INTEGER');
  ensureColumn(db, 'movies', 'popularite', 'REAL');
  ensureColumn(db, 'movies', 'adulte', 'BOOLEAN DEFAULT 0');
  ensureColumn(db, 'movies', 'genres', 'TEXT');
  ensureColumn(db, 'movies', 'mots_cles', 'TEXT');
  ensureColumn(db, 'movies', 'langues_parlees', 'TEXT');
  ensureColumn(db, 'movies', 'compagnies', 'TEXT');
  ensureColumn(db, 'movies', 'pays_production', 'TEXT');
  ensureColumn(db, 'movies', 'site_officiel', 'TEXT');
  ensureColumn(db, 'movies', 'poster_path', 'TEXT');
  ensureColumn(db, 'movies', 'backdrop_path', 'TEXT');
  ensureColumn(db, 'movies', 'videos', 'TEXT');
  ensureColumn(db, 'movies', 'images', 'TEXT');
  ensureColumn(db, 'movies', 'fournisseurs', 'TEXT');
  ensureColumn(db, 'movies', 'ids_externes', 'TEXT');
  ensureColumn(db, 'movies', 'traductions', 'TEXT');
  ensureColumn(db, 'movies', 'donnees_brutes', 'TEXT');
  ensureColumn(db, 'movies', 'derniere_sync', 'DATETIME');
  ensureColumn(db, 'movies', 'enriched_at', 'DATETIME');
  ensureColumn(db, 'movies', 'user_modified_fields', 'TEXT');
  ensureColumn(db, 'movies', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'movies', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Movie user data - Toutes les colonnes (données utilisateur, NE PAS fusionner)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'movie_user_data', 'movie_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'movie_user_data', 'user_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'movie_user_data', 'statut_visionnage', 'TEXT NOT NULL DEFAULT \'À regarder\'');
  ensureColumn(db, 'movie_user_data', 'score', 'REAL');
  ensureColumn(db, 'movie_user_data', 'date_visionnage', 'TEXT');
  ensureColumn(db, 'movie_user_data', 'is_favorite', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'movie_user_data', 'is_hidden', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'movie_user_data', 'notes_privees', 'TEXT');
  ensureColumn(db, 'movie_user_data', 'user_images', 'TEXT');
  ensureColumn(db, 'movie_user_data', 'user_videos', 'TEXT');
  ensureColumn(db, 'movie_user_data', 'display_preferences', 'TEXT');
  ensureColumn(db, 'movie_user_data', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'movie_user_data', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // TV Shows - Toutes les colonnes générales (toutes doivent être fusionnées)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'tv_shows', 'tmdb_id', 'INTEGER NOT NULL UNIQUE');
  ensureColumn(db, 'tv_shows', 'tvmaze_id', 'INTEGER');
  ensureColumn(db, 'tv_shows', 'imdb_id', 'TEXT');
  ensureColumn(db, 'tv_shows', 'titre', 'TEXT NOT NULL');
  ensureColumn(db, 'tv_shows', 'titre_original', 'TEXT');
  ensureColumn(db, 'tv_shows', 'tagline', 'TEXT');
  ensureColumn(db, 'tv_shows', 'synopsis', 'TEXT');
  ensureColumn(db, 'tv_shows', 'statut', 'TEXT');
  ensureColumn(db, 'tv_shows', 'type', 'TEXT');
  ensureColumn(db, 'tv_shows', 'nb_saisons', 'INTEGER');
  ensureColumn(db, 'tv_shows', 'nb_episodes', 'INTEGER');
  ensureColumn(db, 'tv_shows', 'duree_episode', 'INTEGER');
  ensureColumn(db, 'tv_shows', 'date_premiere', 'TEXT');
  ensureColumn(db, 'tv_shows', 'date_derniere', 'TEXT');
  ensureColumn(db, 'tv_shows', 'prochain_episode', 'TEXT');
  ensureColumn(db, 'tv_shows', 'dernier_episode', 'TEXT');
  ensureColumn(db, 'tv_shows', 'genres', 'TEXT');
  ensureColumn(db, 'tv_shows', 'mots_cles', 'TEXT');
  ensureColumn(db, 'tv_shows', 'langues_parlees', 'TEXT');
  ensureColumn(db, 'tv_shows', 'compagnies', 'TEXT');
  ensureColumn(db, 'tv_shows', 'pays_production', 'TEXT');
  ensureColumn(db, 'tv_shows', 'reseaux', 'TEXT');
  ensureColumn(db, 'tv_shows', 'plateformes', 'TEXT');
  ensureColumn(db, 'tv_shows', 'poster_path', 'TEXT');
  ensureColumn(db, 'tv_shows', 'backdrop_path', 'TEXT');
  ensureColumn(db, 'tv_shows', 'images', 'TEXT');
  ensureColumn(db, 'tv_shows', 'videos', 'TEXT');
  ensureColumn(db, 'tv_shows', 'fournisseurs', 'TEXT');
  ensureColumn(db, 'tv_shows', 'ids_externes', 'TEXT');
  ensureColumn(db, 'tv_shows', 'traductions', 'TEXT');
  ensureColumn(db, 'tv_shows', 'donnees_brutes', 'TEXT');
  ensureColumn(db, 'tv_shows', 'derniere_sync', 'DATETIME');
  ensureColumn(db, 'tv_shows', 'enriched_at', 'DATETIME');
  ensureColumn(db, 'tv_shows', 'user_modified_fields', 'TEXT');
  ensureColumn(db, 'tv_shows', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'tv_shows', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // TV Seasons - Toutes les colonnes générales (toutes doivent être fusionnées)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'tv_seasons', 'show_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'tv_seasons', 'tmdb_id', 'INTEGER');
  ensureColumn(db, 'tv_seasons', 'numero', 'INTEGER NOT NULL');
  ensureColumn(db, 'tv_seasons', 'titre', 'TEXT');
  ensureColumn(db, 'tv_seasons', 'synopsis', 'TEXT');
  ensureColumn(db, 'tv_seasons', 'date_premiere', 'TEXT');
  ensureColumn(db, 'tv_seasons', 'nb_episodes', 'INTEGER');
  ensureColumn(db, 'tv_seasons', 'poster_path', 'TEXT');
  ensureColumn(db, 'tv_seasons', 'donnees_brutes', 'TEXT');
  ensureColumn(db, 'tv_seasons', 'derniere_sync', 'DATETIME');
  ensureColumn(db, 'tv_seasons', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'tv_seasons', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // TV Episodes - Toutes les colonnes générales (toutes doivent être fusionnées)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'tv_episodes', 'show_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'tv_episodes', 'season_id', 'INTEGER');
  ensureColumn(db, 'tv_episodes', 'tmdb_id', 'INTEGER');
  ensureColumn(db, 'tv_episodes', 'tvmaze_id', 'INTEGER');
  ensureColumn(db, 'tv_episodes', 'saison_numero', 'INTEGER NOT NULL');
  ensureColumn(db, 'tv_episodes', 'episode_numero', 'INTEGER NOT NULL');
  ensureColumn(db, 'tv_episodes', 'titre', 'TEXT');
  ensureColumn(db, 'tv_episodes', 'synopsis', 'TEXT');
  ensureColumn(db, 'tv_episodes', 'date_diffusion', 'TEXT');
  ensureColumn(db, 'tv_episodes', 'duree', 'INTEGER');
  ensureColumn(db, 'tv_episodes', 'note_moyenne', 'REAL');
  ensureColumn(db, 'tv_episodes', 'nb_votes', 'INTEGER');
  ensureColumn(db, 'tv_episodes', 'still_path', 'TEXT');
  ensureColumn(db, 'tv_episodes', 'donnees_brutes', 'TEXT');
  ensureColumn(db, 'tv_episodes', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'tv_episodes', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // TV Show user data - Toutes les colonnes (données utilisateur, NE PAS fusionner)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'tv_show_user_data', 'show_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'tv_show_user_data', 'user_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'tv_show_user_data', 'statut_visionnage', 'TEXT NOT NULL DEFAULT \'À regarder\'');
  ensureColumn(db, 'tv_show_user_data', 'score', 'REAL');
  ensureColumn(db, 'tv_show_user_data', 'saisons_vues', 'INTEGER DEFAULT 0');
  ensureColumn(db, 'tv_show_user_data', 'episodes_vus', 'INTEGER DEFAULT 0');
  ensureColumn(db, 'tv_show_user_data', 'date_debut', 'TEXT');
  ensureColumn(db, 'tv_show_user_data', 'date_fin', 'TEXT');
  ensureColumn(db, 'tv_show_user_data', 'is_favorite', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'tv_show_user_data', 'is_hidden', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'tv_show_user_data', 'notes_privees', 'TEXT');
  ensureColumn(db, 'tv_show_user_data', 'user_images', 'TEXT');
  ensureColumn(db, 'tv_show_user_data', 'user_videos', 'TEXT');
  ensureColumn(db, 'tv_show_user_data', 'episode_videos', 'TEXT');
  ensureColumn(db, 'tv_show_user_data', 'episode_progress', 'TEXT');
  ensureColumn(db, 'tv_show_user_data', 'display_preferences', 'TEXT');
  ensureColumn(db, 'tv_show_user_data', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'tv_show_user_data', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Books - Toutes les colonnes générales (toutes doivent être fusionnées)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'books', 'titre', 'TEXT NOT NULL');
  ensureColumn(db, 'books', 'titre_original', 'TEXT');
  ensureColumn(db, 'books', 'auteur', 'TEXT');
  ensureColumn(db, 'books', 'auteurs', 'TEXT');
  ensureColumn(db, 'books', 'isbn', 'TEXT');
  ensureColumn(db, 'books', 'isbn13', 'TEXT');
  ensureColumn(db, 'books', 'editeur', 'TEXT');
  ensureColumn(db, 'books', 'date_publication', 'TEXT');
  ensureColumn(db, 'books', 'date_publication_originale', 'TEXT');
  ensureColumn(db, 'books', 'nombre_pages', 'INTEGER');
  ensureColumn(db, 'books', 'langue', 'TEXT');
  ensureColumn(db, 'books', 'langue_originale', 'TEXT');
  ensureColumn(db, 'books', 'type_livre', 'TEXT');
  ensureColumn(db, 'books', 'genres', 'TEXT');
  ensureColumn(db, 'books', 'description', 'TEXT');
  ensureColumn(db, 'books', 'couverture_url', 'TEXT');
  ensureColumn(db, 'books', 'google_books_id', 'TEXT');
  ensureColumn(db, 'books', 'open_library_id', 'TEXT');
  ensureColumn(db, 'books', 'bnf_id', 'TEXT');
  ensureColumn(db, 'books', 'source_donnees', 'TEXT DEFAULT \'manual\'');
  ensureColumn(db, 'books', 'source_url', 'TEXT');
  ensureColumn(db, 'books', 'score', 'REAL');
  ensureColumn(db, 'books', 'nb_votes', 'INTEGER');
  ensureColumn(db, 'books', 'rating', 'TEXT');
  ensureColumn(db, 'books', 'prix_suggere', 'REAL');
  ensureColumn(db, 'books', 'devise', 'TEXT');
  ensureColumn(db, 'books', 'user_modified_fields', 'TEXT');
  ensureColumn(db, 'books', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'books', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Book Proprietaires - Toutes les colonnes (fusionnées pour partage des coûts)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'book_proprietaires', 'book_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'book_proprietaires', 'user_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'book_proprietaires', 'user_uuid', 'TEXT');
  ensureColumn(db, 'book_proprietaires', 'prix', 'REAL NOT NULL DEFAULT 0');
  ensureColumn(db, 'book_proprietaires', 'date_achat', 'DATE');
  ensureColumn(db, 'book_proprietaires', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'book_proprietaires', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  
  // Migrer les UUIDs pour les propriétaires de livres existants
  try {
    const proprietairesWithoutUuid = db.prepare(`
      SELECT DISTINCT bp.user_id, u.sync_uuid
      FROM book_proprietaires bp
      JOIN users u ON bp.user_id = u.id
      WHERE bp.user_uuid IS NULL AND u.sync_uuid IS NOT NULL
    `).all();
    
    if (proprietairesWithoutUuid.length > 0) {
      const crypto = require('crypto');
      const updateStmt = db.prepare('UPDATE book_proprietaires SET user_uuid = ? WHERE user_id = ? AND user_uuid IS NULL');
      
      for (const prop of proprietairesWithoutUuid) {
        let uuid = prop.sync_uuid;
        if (!uuid) {
          uuid = crypto.randomUUID();
          db.prepare('UPDATE users SET sync_uuid = ? WHERE id = ?').run(uuid, prop.user_id);
        }
        updateStmt.run(uuid, prop.user_id);
      }
      
      if (proprietairesWithoutUuid.length > 0) {
        console.log(`✅ Migration: ${proprietairesWithoutUuid.length} propriétaires de livres ont reçu un UUID`);
      }
    }
  } catch (e) {
    console.warn('⚠️ Erreur migration UUID propriétaires livres:', e.message);
  }

  // Book User Data - Toutes les colonnes (données utilisateur, NE PAS fusionner)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'book_user_data', 'book_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'book_user_data', 'user_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'book_user_data', 'statut_lecture', 'TEXT NOT NULL DEFAULT \'À lire\'');
  ensureColumn(db, 'book_user_data', 'score', 'REAL');
  ensureColumn(db, 'book_user_data', 'date_debut', 'TEXT');
  ensureColumn(db, 'book_user_data', 'date_fin', 'TEXT');
  ensureColumn(db, 'book_user_data', 'is_favorite', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'book_user_data', 'is_hidden', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'book_user_data', 'notes_privees', 'TEXT');
  ensureColumn(db, 'book_user_data', 'labels', 'TEXT');
  ensureColumn(db, 'book_user_data', 'display_preferences', 'TEXT');
  ensureColumn(db, 'book_user_data', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'book_user_data', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Subscriptions - Toutes les colonnes générales (toutes doivent être fusionnées)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'subscriptions', 'name', 'TEXT NOT NULL');
  ensureColumn(db, 'subscriptions', 'type', 'TEXT NOT NULL');
  ensureColumn(db, 'subscriptions', 'price', 'REAL NOT NULL');
  ensureColumn(db, 'subscriptions', 'devise', 'TEXT DEFAULT \'EUR\'');
  ensureColumn(db, 'subscriptions', 'frequency', 'TEXT NOT NULL');
  ensureColumn(db, 'subscriptions', 'start_date', 'DATE NOT NULL');
  ensureColumn(db, 'subscriptions', 'next_payment_date', 'DATE');
  ensureColumn(db, 'subscriptions', 'status', 'TEXT NOT NULL DEFAULT \'active\'');
  ensureColumn(db, 'subscriptions', 'notes', 'TEXT');
  ensureColumn(db, 'subscriptions', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'subscriptions', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Subscription Proprietaires - Toutes les colonnes (fusionnées pour partage des coûts)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'subscription_proprietaires', 'subscription_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'subscription_proprietaires', 'user_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'subscription_proprietaires', 'user_uuid', 'TEXT');
  ensureColumn(db, 'subscription_proprietaires', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'subscription_proprietaires', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  
  // Migrer les UUIDs pour les propriétaires d'abonnements existants
  try {
    const proprietairesWithoutUuid = db.prepare(`
      SELECT DISTINCT sp.user_id, u.sync_uuid
      FROM subscription_proprietaires sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.user_uuid IS NULL AND u.sync_uuid IS NOT NULL
    `).all();
    
    if (proprietairesWithoutUuid.length > 0) {
      const crypto = require('crypto');
      const updateStmt = db.prepare('UPDATE subscription_proprietaires SET user_uuid = ? WHERE user_id = ? AND user_uuid IS NULL');
      
      for (const prop of proprietairesWithoutUuid) {
        let uuid = prop.sync_uuid;
        if (!uuid) {
          uuid = crypto.randomUUID();
          db.prepare('UPDATE users SET sync_uuid = ? WHERE id = ?').run(uuid, prop.user_id);
        }
        updateStmt.run(uuid, prop.user_id);
      }
      
      if (proprietairesWithoutUuid.length > 0) {
        console.log(`✅ Migration: ${proprietairesWithoutUuid.length} propriétaires d'abonnements ont reçu un UUID`);
      }
    }
  } catch (e) {
    console.warn('⚠️ Erreur migration UUID propriétaires abonnements:', e.message);
  }

  // Purchase Sites - Toutes les colonnes générales (toutes doivent être fusionnées)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'purchase_sites', 'name', 'TEXT NOT NULL UNIQUE');
  ensureColumn(db, 'purchase_sites', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // One Time Purchases - Toutes les colonnes générales (toutes doivent être fusionnées)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'one_time_purchases', 'site_id', 'INTEGER');
  ensureColumn(db, 'one_time_purchases', 'site_name', 'TEXT');
  ensureColumn(db, 'one_time_purchases', 'purchase_date', 'DATE NOT NULL');
  ensureColumn(db, 'one_time_purchases', 'amount', 'REAL NOT NULL');
  ensureColumn(db, 'one_time_purchases', 'devise', 'TEXT DEFAULT \'EUR\'');
  ensureColumn(db, 'one_time_purchases', 'credits_count', 'INTEGER');
  ensureColumn(db, 'one_time_purchases', 'notes', 'TEXT');
  ensureColumn(db, 'one_time_purchases', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'one_time_purchases', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // One Time Purchase Proprietaires - Toutes les colonnes (fusionnées pour partage des coûts)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'one_time_purchase_proprietaires', 'purchase_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'one_time_purchase_proprietaires', 'user_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'one_time_purchase_proprietaires', 'user_uuid', 'TEXT');
  ensureColumn(db, 'one_time_purchase_proprietaires', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'one_time_purchase_proprietaires', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  
  // Migrer les UUIDs pour les propriétaires d'achats ponctuels existants
  try {
    const proprietairesWithoutUuid = db.prepare(`
      SELECT DISTINCT op.user_id, u.sync_uuid
      FROM one_time_purchase_proprietaires op
      JOIN users u ON op.user_id = u.id
      WHERE op.user_uuid IS NULL AND u.sync_uuid IS NOT NULL
    `).all();
    
    if (proprietairesWithoutUuid.length > 0) {
      const crypto = require('crypto');
      const updateStmt = db.prepare('UPDATE one_time_purchase_proprietaires SET user_uuid = ? WHERE user_id = ? AND user_uuid IS NULL');
      
      for (const prop of proprietairesWithoutUuid) {
        let uuid = prop.sync_uuid;
        if (!uuid) {
          uuid = crypto.randomUUID();
          db.prepare('UPDATE users SET sync_uuid = ? WHERE id = ?').run(uuid, prop.user_id);
        }
        updateStmt.run(uuid, prop.user_id);
      }
      
      if (proprietairesWithoutUuid.length > 0) {
        console.log(`✅ Migration: ${proprietairesWithoutUuid.length} propriétaires d'achats ponctuels ont reçu un UUID`);
      }
    }
  } catch (e) {
    console.warn('⚠️ Erreur migration UUID propriétaires achats ponctuels:', e.message);
  }

  // Adulte Game Games - Toutes les colonnes générales (toutes doivent être fusionnées)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'adulte_game_games', 'f95_thread_id', 'INTEGER');
  ensureColumn(db, 'adulte_game_games', 'Lewdcorner_thread_id', 'INTEGER');
  ensureColumn(db, 'adulte_game_games', 'titre', 'TEXT NOT NULL');
  ensureColumn(db, 'adulte_game_games', 'game_version', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'game_statut', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'game_engine', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'game_developer', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'game_site', 'TEXT DEFAULT \'F95Zone\'');
  ensureColumn(db, 'adulte_game_games', 'couverture_url', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'tags', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'lien_f95', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'lien_lewdcorner', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'statut_traduction', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'type_traduction', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'traduction_fr_disponible', 'BOOLEAN DEFAULT 0');
  ensureColumn(db, 'adulte_game_games', 'version_traduite', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'lien_traduction', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'traducteur', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'derniere_sync_trad', 'DATETIME');
  ensureColumn(db, 'adulte_game_games', 'traductions_multiples', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'maj_disponible', 'BOOLEAN DEFAULT 0');
  ensureColumn(db, 'adulte_game_games', 'derniere_verif', 'DATETIME');
  ensureColumn(db, 'adulte_game_games', 'user_modified_fields', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'rawg_id', 'INTEGER');
  ensureColumn(db, 'adulte_game_games', 'rawg_rating', 'REAL');
  ensureColumn(db, 'adulte_game_games', 'rawg_released', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'rawg_platforms', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'rawg_description', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'rawg_website', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'esrb_rating', 'TEXT');
  ensureColumn(db, 'adulte_game_games', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'adulte_game_games', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Adulte Game User Data - Toutes les colonnes (données utilisateur, NE PAS fusionner)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'adulte_game_user_data', 'game_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'adulte_game_user_data', 'user_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'adulte_game_user_data', 'derniere_session', 'DATETIME');
  ensureColumn(db, 'adulte_game_user_data', 'version_jouee', 'TEXT');
  ensureColumn(db, 'adulte_game_user_data', 'completion_perso', 'TEXT');
  ensureColumn(db, 'adulte_game_user_data', 'is_favorite', 'BOOLEAN DEFAULT 0');
  ensureColumn(db, 'adulte_game_user_data', 'is_hidden', 'BOOLEAN DEFAULT 0');
  ensureColumn(db, 'adulte_game_user_data', 'date_masquage', 'DATETIME');
  ensureColumn(db, 'adulte_game_user_data', 'notes_privees', 'TEXT');
  ensureColumn(db, 'adulte_game_user_data', 'chemin_executable', 'TEXT');
  ensureColumn(db, 'adulte_game_user_data', 'labels', 'TEXT');
  ensureColumn(db, 'adulte_game_user_data', 'display_preferences', 'TEXT');
  ensureColumn(db, 'adulte_game_user_data', 'user_images', 'TEXT');
  ensureColumn(db, 'adulte_game_user_data', 'user_videos', 'TEXT');
  ensureColumn(db, 'adulte_game_user_data', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'adulte_game_user_data', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Adulte Game Proprietaires - Toutes les colonnes (fusionnées pour partage des coûts)
  // Note: 'id' PRIMARY KEY n'est pas migré car créé avec la table
  ensureColumn(db, 'adulte_game_proprietaires', 'game_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'adulte_game_proprietaires', 'user_id', 'INTEGER NOT NULL');
  ensureColumn(db, 'adulte_game_proprietaires', 'user_uuid', 'TEXT');
  ensureColumn(db, 'adulte_game_proprietaires', 'prix', 'REAL NOT NULL DEFAULT 0');
  ensureColumn(db, 'adulte_game_proprietaires', 'date_achat', 'TEXT');
  ensureColumn(db, 'adulte_game_proprietaires', 'platforms', 'TEXT');
  ensureColumn(db, 'adulte_game_proprietaires', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  ensureColumn(db, 'adulte_game_proprietaires', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  
  // Migrer les UUIDs pour les propriétaires de jeux adultes existants
  try {
    const proprietairesWithoutUuid = db.prepare(`
      SELECT DISTINCT ap.user_id, u.sync_uuid
      FROM adulte_game_proprietaires ap
      JOIN users u ON ap.user_id = u.id
      WHERE ap.user_uuid IS NULL AND u.sync_uuid IS NOT NULL
    `).all();
    
    if (proprietairesWithoutUuid.length > 0) {
      const crypto = require('crypto');
      const updateStmt = db.prepare('UPDATE adulte_game_proprietaires SET user_uuid = ? WHERE user_id = ? AND user_uuid IS NULL');
      
      for (const prop of proprietairesWithoutUuid) {
        let uuid = prop.sync_uuid;
        if (!uuid) {
          uuid = crypto.randomUUID();
          db.prepare('UPDATE users SET sync_uuid = ? WHERE id = ?').run(uuid, prop.user_id);
        }
        updateStmt.run(uuid, prop.user_id);
      }
      
      if (proprietairesWithoutUuid.length > 0) {
        console.log(`✅ Migration: ${proprietairesWithoutUuid.length} propriétaires de jeux adultes ont reçu un UUID`);
      }
    }
  } catch (e) {
    console.warn('⚠️ Erreur migration UUID propriétaires jeux adultes:', e.message);
  }

  // Migration des anciennes colonnes vers les nouvelles (jeux adultes)
  // Si l'ancienne colonne existe mais pas la nouvelle, créer la nouvelle et copier les données
  if (columnExists(db, 'adulte_game_games', 'version') && !columnExists(db, 'adulte_game_games', 'game_version')) {
    ensureColumn(db, 'adulte_game_games', 'game_version', 'TEXT');
    try {
      db.exec(`UPDATE adulte_game_games SET game_version = version WHERE version IS NOT NULL`);
      console.log('✅ Migration: version -> game_version');
    } catch (e) {
      console.warn('⚠️ Erreur migration version -> game_version:', e.message);
    }
  }

  if (columnExists(db, 'adulte_game_games', 'statut_jeu') && !columnExists(db, 'adulte_game_games', 'game_statut')) {
    ensureColumn(db, 'adulte_game_games', 'game_statut', 'TEXT');
    try {
      db.exec(`UPDATE adulte_game_games SET game_statut = statut_jeu WHERE statut_jeu IS NOT NULL`);
      console.log('✅ Migration: statut_jeu -> game_statut');
    } catch (e) {
      console.warn('⚠️ Erreur migration statut_jeu -> game_statut:', e.message);
    }
  }

  if (columnExists(db, 'adulte_game_games', 'moteur') && !columnExists(db, 'adulte_game_games', 'game_engine')) {
    ensureColumn(db, 'adulte_game_games', 'game_engine', 'TEXT');
    try {
      db.exec(`UPDATE adulte_game_games SET game_engine = moteur WHERE moteur IS NOT NULL`);
      console.log('✅ Migration: moteur -> game_engine');
    } catch (e) {
      console.warn('⚠️ Erreur migration moteur -> game_engine:', e.message);
    }
  }

  if (columnExists(db, 'adulte_game_games', 'developer') && !columnExists(db, 'adulte_game_games', 'game_developer')) {
    ensureColumn(db, 'adulte_game_games', 'game_developer', 'TEXT');
    try {
      db.exec(`UPDATE adulte_game_games SET game_developer = developer WHERE developer IS NOT NULL`);
      console.log('✅ Migration: developer -> game_developer');
    } catch (e) {
      console.warn('⚠️ Erreur migration developer -> game_developer:', e.message);
    }
  }

  if (columnExists(db, 'adulte_game_games', 'plateforme') && !columnExists(db, 'adulte_game_games', 'game_site')) {
    ensureColumn(db, 'adulte_game_games', 'game_site', 'TEXT DEFAULT \'F95Zone\'');
    try {
      db.exec(`UPDATE adulte_game_games SET game_site = plateforme WHERE plateforme IS NOT NULL`);
      console.log('✅ Migration: plateforme -> game_site');
    } catch (e) {
      console.warn('⚠️ Erreur migration plateforme -> game_site:', e.message);
    }
  }

  console.log('✅ Migrations de schéma terminées');
}

/**
 * Applique les migrations à toutes les bases de données utilisateur
 * @param {string} databasesPath - Chemin vers le dossier databases
 * @returns {Object} Résultat avec le nombre de bases migrées
 */
function migrateAllDatabases(databasesPath) {
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

        // Appliquer toutes les migrations
        migrateDatabaseSchema(db);

        // Vérifier que la colonne titre_original est bien présente (indication supplémentaire)
        try {
          const hasTitreOriginal = columnExists(db, 'manga_series', 'titre_original');
          if (hasTitreOriginal) {
            console.log(`ℹ️ colonne 'titre_original' présente dans ${dbFile}`);
          } else {
            console.warn(`⚠️ colonne 'titre_original' absente après migration dans ${dbFile}`);
          }
        } catch (e) {
          console.warn(`⚠️ Impossible de vérifier titre_original dans ${dbFile}:`, e.message);
        }

        // Synchroniser les relations existantes
        try {
          const { propagateAllRelations } = require('./relations/relation-propagator');
          propagateAllRelations(db);
        } catch (relError) {
          console.warn(`⚠️ Erreur propagation relations pour ${dbFile}:`, relError.message);
        }

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

module.exports = {
  migrateDatabaseSchema,
  migrateAllDatabases,
  ensureColumn,
  columnExists,
  tableExists
};
