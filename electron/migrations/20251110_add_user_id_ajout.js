module.exports = {
  id: '20251110_add_user_id_ajout',
  description: 'Ajoute la colonne user_id_ajout sur les tables series et anime_series',
  up(db) {
    const seriesColumns = db.prepare(`PRAGMA table_info(series)`).all();
    const hasSerieUserIdColumn = seriesColumns.some(column => column.name === 'user_id_ajout');
    if (!hasSerieUserIdColumn) {
      db.exec(`ALTER TABLE series ADD COLUMN user_id_ajout INTEGER`);
    }

    const animeColumns = db.prepare(`PRAGMA table_info(anime_series)`).all();
    const hasAnimeUserIdColumn = animeColumns.some(column => column.name === 'user_id_ajout');
    if (!hasAnimeUserIdColumn) {
      db.exec(`ALTER TABLE anime_series ADD COLUMN user_id_ajout INTEGER`);
    }
  }
};
