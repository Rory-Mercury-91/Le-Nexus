/**
 * Enregistre tous les handlers IPC pour les statistiques et la lecture
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerStatisticsHandlers(ipcMain, getDb, store) {
  
  // Récupérer les statistiques générales
  ipcMain.handle('get-statistics', () => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const stats = {
        totaux: {},
        parType: {},
        parStatut: {},
        nbSeries: 0,
        nbTomes: 0,
        nbTomesParProprietaire: {
          'Céline': 0,
          'Sébastien': 0,
          'Alexandre': 0,
          'Commun': 0
        }
      };

      // Calcul des totaux et nombre de tomes par propriétaire
      const tomes = db.prepare('SELECT proprietaire, COUNT(*) as count, SUM(prix) as total FROM tomes GROUP BY proprietaire').all();
      
      tomes.forEach(row => {
        if (row.proprietaire === 'Commun') {
          // Diviser le coût par 3 pour chaque personne
          const montantParPersonne = row.total / 3;
          stats.totaux['Céline'] = (stats.totaux['Céline'] || 0) + montantParPersonne;
          stats.totaux['Sébastien'] = (stats.totaux['Sébastien'] || 0) + montantParPersonne;
          stats.totaux['Alexandre'] = (stats.totaux['Alexandre'] || 0) + montantParPersonne;
          stats.totaux['Commun'] = row.total;
          
          // Les tomes communs sont comptés une seule fois dans "Commun"
          stats.nbTomesParProprietaire['Commun'] = row.count;
        } else {
          // ✅ ADDITIONNER au lieu d'écraser pour ne pas perdre les tomes communs
          stats.totaux[row.proprietaire] = (stats.totaux[row.proprietaire] || 0) + row.total;
          stats.nbTomesParProprietaire[row.proprietaire] = stats.nbTomesParProprietaire[row.proprietaire] + row.count;
        }
      });

      // Nombre de tomes par type
      const parType = db.prepare(`
        SELECT s.type_volume, COUNT(t.id) as count, SUM(t.prix) as total
        FROM tomes t
        JOIN series s ON t.serie_id = s.id
        GROUP BY s.type_volume
      `).all();
      
      parType.forEach(row => {
        stats.parType[row.type_volume] = {
          count: row.count,
          total: row.total
        };
      });

      // Nombre de séries par statut
      const parStatut = db.prepare('SELECT statut, COUNT(*) as count FROM series GROUP BY statut').all();
      parStatut.forEach(row => {
        stats.parStatut[row.statut] = row.count;
      });

      // Totaux généraux
      stats.nbSeries = db.prepare('SELECT COUNT(*) as count FROM series').get().count;
      stats.nbTomes = db.prepare('SELECT COUNT(*) as count FROM tomes').get().count;

      return stats;
    } catch (error) {
      console.error('Erreur get-statistics:', error);
      throw error;
    }
  });

  // Obtenir les statistiques de lecture
  ipcMain.handle('get-lecture-statistics', () => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return {
          tomesLus: 0,
          tomesTotal: 0,
          seriesCompletes: 0,
          seriesTotal: 0,
          progression: 0,
          dernierTomeLu: null
        };
      }

      // Nombre total de tomes
      const tomesTotal = db.prepare('SELECT COUNT(*) as count FROM tomes').get().count;
      
      // Nombre de tomes lus par l'utilisateur
      const tomesLus = db.prepare(`
        SELECT COUNT(*) as count 
        FROM lecture_tomes 
        WHERE utilisateur = ? AND lu = 1
      `).get(currentUser).count;

      // Nombre total de séries
      const seriesTotal = db.prepare('SELECT COUNT(*) as count FROM series').get().count;

      // Nombre de séries complètes (toutes lues)
      const seriesCompletes = db.prepare(`
        SELECT COUNT(DISTINCT s.id) as count
        FROM series s
        WHERE (
          SELECT COUNT(*) 
          FROM tomes t 
          WHERE t.serie_id = s.id
        ) = (
          SELECT COUNT(*) 
          FROM tomes t 
          LEFT JOIN lecture_tomes lt ON t.id = lt.tome_id AND lt.utilisateur = ?
          WHERE t.serie_id = s.id AND lt.lu = 1
        )
        AND (SELECT COUNT(*) FROM tomes WHERE serie_id = s.id) > 0
      `).get(currentUser).count;

      // Derniers tomes lus (les 10 plus récents)
      const derniersTomesLus = db.prepare(`
        SELECT t.id, t.numero, t.couverture_url, s.titre as serie_titre, s.id as serie_id, lt.date_lecture
        FROM lecture_tomes lt
        JOIN tomes t ON lt.tome_id = t.id
        JOIN series s ON t.serie_id = s.id
        WHERE lt.utilisateur = ? AND lt.lu = 1
        ORDER BY lt.date_lecture DESC
        LIMIT 10
      `).all(currentUser);

      const progression = tomesTotal > 0 ? (tomesLus / tomesTotal) * 100 : 0;

      return {
        tomesLus,
        tomesTotal,
        seriesCompletes,
        seriesTotal,
        progression,
        derniersTomesLus: derniersTomesLus.map(tome => ({
          id: tome.id,
          serieId: tome.serie_id,
          serieTitre: tome.serie_titre,
          numero: tome.numero,
          couvertureUrl: tome.couverture_url,
          dateLecture: tome.date_lecture
        }))
      };
    } catch (error) {
      console.error('Erreur get-lecture-statistics:', error);
      throw error;
    }
  });

  // Marquer un tome comme lu/non lu
  ipcMain.handle('toggle-tome-lu', (event, tomeId, lu) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      const dateLecture = lu ? new Date().toISOString().split('T')[0] : null;

      // Utiliser INSERT OR REPLACE pour gérer l'insertion ou la mise à jour
      db.prepare(`
        INSERT INTO lecture_tomes (tome_id, utilisateur, lu, date_lecture)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(tome_id, utilisateur) 
        DO UPDATE SET lu = ?, date_lecture = ?
      `).run(tomeId, currentUser, lu ? 1 : 0, dateLecture, lu ? 1 : 0, dateLecture);

      console.log(`Tome ${tomeId} marqué comme ${lu ? 'lu' : 'non lu'} pour ${currentUser}`);
      return { success: true };
    } catch (error) {
      console.error('Erreur toggle-tome-lu:', error);
      throw error;
    }
  });

  // Marquer toute une série comme lue
  ipcMain.handle('marquer-serie-lue', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      // Récupérer tous les tomes de la série
      const tomes = db.prepare('SELECT id FROM tomes WHERE serie_id = ?').all(serieId);
      const dateLecture = new Date().toISOString().split('T')[0];

      // Marquer tous les tomes comme lus
      const stmt = db.prepare(`
        INSERT INTO lecture_tomes (tome_id, utilisateur, lu, date_lecture)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(tome_id, utilisateur) 
        DO UPDATE SET lu = 1, date_lecture = ?
      `);

      tomes.forEach(tome => {
        stmt.run(tome.id, currentUser, dateLecture, dateLecture);
      });

      console.log(`Série ${serieId} (${tomes.length} tomes) marquée comme lue pour ${currentUser}`);
      return { success: true, tomesMarques: tomes.length };
    } catch (error) {
      console.error('Erreur marquer-serie-lue:', error);
      throw error;
    }
  });
}

module.exports = { registerStatisticsHandlers };
