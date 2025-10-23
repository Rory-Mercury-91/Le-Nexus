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
        nbTomesParProprietaire: {},
        nbTomesParProprietaireParType: {}, // Nouveau : nombre de tomes par type par propriétaire
        users: [] // Nouveau : liste des utilisateurs avec leurs couleurs
      };

      // Récupérer tous les utilisateurs
      const users = db.prepare('SELECT id, name, color, emoji FROM users').all();
      stats.users = users;

      // Initialiser les totaux pour chaque utilisateur
      users.forEach(user => {
        stats.totaux[user.id] = 0;
        stats.nbTomesParProprietaire[user.id] = 0;
        stats.nbTomesParProprietaireParType[user.id] = {};
      });

      // Calcul dynamique des coûts et tomes par propriétaire
      const tomes = db.prepare(`
        SELECT t.id, t.prix, s.type_volume 
        FROM tomes t
        JOIN series s ON t.serie_id = s.id
      `).all();
      
      tomes.forEach(tome => {
        // Récupérer les propriétaires de ce tome
        const proprietaires = db.prepare(`
          SELECT user_id FROM tomes_proprietaires WHERE tome_id = ?
        `).all(tome.id);

        if (proprietaires.length > 0) {
          // Diviser le coût entre tous les propriétaires
          const coutParProprietaire = tome.prix / proprietaires.length;
          
          proprietaires.forEach(prop => {
            stats.totaux[prop.user_id] = (stats.totaux[prop.user_id] || 0) + coutParProprietaire;
            stats.nbTomesParProprietaire[prop.user_id] = (stats.nbTomesParProprietaire[prop.user_id] || 0) + 1;
            
            // Compter par type
            const typeVolume = tome.type_volume || 'Broché';
            if (!stats.nbTomesParProprietaireParType[prop.user_id][typeVolume]) {
              stats.nbTomesParProprietaireParType[prop.user_id][typeVolume] = 0;
            }
            stats.nbTomesParProprietaireParType[prop.user_id][typeVolume]++;
          });
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

      const dateLecture = lu ? new Date().toISOString().replace('T', ' ').replace('Z', '') : null;

      // Utiliser INSERT OR REPLACE pour gérer l'insertion ou la mise à jour
      db.prepare(`
        INSERT INTO lecture_tomes (tome_id, utilisateur, lu, date_lecture)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(tome_id, utilisateur) 
        DO UPDATE SET lu = ?, date_lecture = ?
      `).run(tomeId, currentUser, lu ? 1 : 0, dateLecture, lu ? 1 : 0, dateLecture);


      return { success: true };
    } catch (error) {
      console.error('Erreur toggle-tome-lu:', error);
      throw error;
    }
  });

  // Obtenir les données d'évolution temporelle
  ipcMain.handle('get-evolution-statistics', () => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // Récupérer tous les tomes avec leur date d'achat
      const tomes = db.prepare(`
        SELECT t.id, t.prix, t.date_achat, s.type_volume
        FROM tomes t
        JOIN series s ON t.serie_id = s.id
        WHERE t.date_achat IS NOT NULL
        ORDER BY t.date_achat ASC
      `).all();

      // Grouper par mois
      const parMois = {};
      const parAnnee = {};

      tomes.forEach(tome => {
        const date = new Date(tome.date_achat);
        const mois = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const annee = date.getFullYear().toString();

        // Par mois
        if (!parMois[mois]) {
          parMois[mois] = { count: 0, total: 0 };
        }
        parMois[mois].count++;
        parMois[mois].total += tome.prix;

        // Par année
        if (!parAnnee[annee]) {
          parAnnee[annee] = { count: 0, total: 0 };
        }
        parAnnee[annee].count++;
        parAnnee[annee].total += tome.prix;
      });

      return {
        parMois,
        parAnnee,
        totalTomes: tomes.length
      };
    } catch (error) {
      console.error('Erreur get-evolution-statistics:', error);
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

      // Récupérer tous les tomes de la série, triés par numéro
      const tomes = db.prepare('SELECT id FROM tomes WHERE serie_id = ? ORDER BY numero ASC').all(serieId);
      
      // Marquer tous les tomes comme lus avec des timestamps espacés de quelques secondes
      // pour conserver l'ordre chronologique (1 seconde entre chaque tome)
      const stmt = db.prepare(`
        INSERT INTO lecture_tomes (tome_id, utilisateur, lu, date_lecture)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(tome_id, utilisateur) 
        DO UPDATE SET lu = 1, date_lecture = ?
      `);

      const baseDate = new Date();
      tomes.forEach((tome, index) => {
        const dateLecture = new Date(baseDate.getTime() + (index * 1000)); // +1 seconde par tome
        const dateLectureStr = dateLecture.toISOString().replace('T', ' ').replace('Z', '');
        stmt.run(tome.id, currentUser, dateLectureStr, dateLectureStr);
      });


      return { success: true, tomesMarques: tomes.length };
    } catch (error) {
      console.error('Erreur marquer-serie-lue:', error);
      throw error;
    }
  });
}

module.exports = { registerStatisticsHandlers };
