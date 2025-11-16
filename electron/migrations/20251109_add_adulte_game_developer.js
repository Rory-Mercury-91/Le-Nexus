module.exports = {
  id: '20251109_add_adulte_game_developer',
  description: 'Ajoute la colonne developpeur aux jeux adultes',
  up(db) {
    const columns = db.prepare(`PRAGMA table_info(adulte_game_games)`).all();
    const hasDeveloperColumn = columns.some((column) => column.name === 'developpeur');
    if (!hasDeveloperColumn) {
      db.exec(`ALTER TABLE adulte_game_games ADD COLUMN developpeur TEXT`);
    }
  }
};
