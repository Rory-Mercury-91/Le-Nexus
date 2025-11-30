const { getUserIdByName } = require('../common-helpers');

function ensureBookUserDataRow(db, bookId, userId) {
  const existing = db.prepare('SELECT id FROM book_user_data WHERE book_id = ? AND user_id = ?').get(bookId, userId);
  if (!existing) {
    db.prepare(`
      INSERT INTO book_user_data (book_id, user_id, statut_lecture, score, date_debut, date_fin, is_favorite, is_hidden, notes_privees, labels, display_preferences, created_at, updated_at)
      VALUES (?, ?, 'À lire', NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, datetime('now'), datetime('now'))
    `).run(bookId, userId);
  }
}

module.exports = { ensureBookUserDataRow };
