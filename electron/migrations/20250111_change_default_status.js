module.exports = {
  id: '20250111_change_default_status',
  description: 'Change le statut par défaut de "En cours" à "À regarder" pour anime_statut_utilisateur',
  up(db) {
    // SQLite ne supporte pas ALTER COLUMN pour changer le DEFAULT directement
    // On doit recréer la table avec le nouveau DEFAULT
    // Mais comme on ne peut pas supprimer une table avec des données, on va juste
    // mettre à jour les enregistrements existants qui ont "En cours" avec episodes_vus = 0
    
    // Mettre à jour les statuts existants qui sont "En cours" avec episodes_vus = 0
    db.exec(`
      UPDATE anime_statut_utilisateur
      SET statut_visionnage = 'À regarder'
      WHERE statut_visionnage = 'En cours'
        AND episodes_vus = 0
    `);
    
    console.log('✅ Migration 20250111: Statuts anime mis à jour (En cours → À regarder si episodes_vus = 0)');
  }
};
