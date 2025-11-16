module.exports = {
  id: '20250112_add_enrichment_tracking',
  description: 'Ajoute le tracking de l\'enrichissement et la protection des champs modifiés par l\'utilisateur',
  up(db) {
    // Ajouter les champs pour les mangas (series)
    db.exec(`
      ALTER TABLE series ADD COLUMN enriched_at DATETIME;
      ALTER TABLE series ADD COLUMN user_modified_fields TEXT;
    `);

    // Ajouter les champs pour les animes
    db.exec(`
      ALTER TABLE anime_series ADD COLUMN enriched_at DATETIME;
      ALTER TABLE anime_series ADD COLUMN user_modified_fields TEXT;
    `);

    // Ajouter les champs pour les films
    db.exec(`
      ALTER TABLE movies ADD COLUMN enriched_at DATETIME;
      ALTER TABLE movies ADD COLUMN user_modified_fields TEXT;
    `);

    // Ajouter les champs pour les séries TV
    db.exec(`
      ALTER TABLE tv_shows ADD COLUMN enriched_at DATETIME;
      ALTER TABLE tv_shows ADD COLUMN user_modified_fields TEXT;
    `);

    // Ajouter les champs pour les jeux adultes
    db.exec(`
      ALTER TABLE adulte_game_games ADD COLUMN enriched_at DATETIME;
      ALTER TABLE adulte_game_games ADD COLUMN user_modified_fields TEXT;
    `);

    console.log('✅ Migration 20250112: Champs d\'enrichissement et protection utilisateur ajoutés');
  }
};
