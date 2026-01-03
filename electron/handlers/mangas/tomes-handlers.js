const fs = require('fs');
const path = require('path');
// Import des fonctions communes
const { getPaths } = require('../common-helpers');
const { renameTomeCover } = require('../../services/cover/cover-manager');
const { getSerieTitle, getSerieCover, updateSerieCover, getUserIdByName, setExclusiveSerieOwnership } = require('./manga-helpers');
const { getUserUuidById, getUserUuidByName } = require('../common-helpers');

/**
 * Enregistre les handlers IPC pour les opérations CRUD sur les manga_tomes
 */
function registerMangaTomesHandlers(ipcMain, getDb, getPathManager, store) {
  // Créer un tome
  ipcMain.handle('create-tome', (event, tome) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // Récupérer le titre et la couverture de la série pour le renommage
      const serieTitle = getSerieTitle(db, tome.serie_id);
      const serieCover = getSerieCover(db, tome.serie_id);
      let finalCouvertureUrl = tome.couverture_url || null;
      
      // Renommer l'image du tome en tome-X.ext
      if (finalCouvertureUrl && serieTitle) {
        const pm = getPathManager();
        if (pm) finalCouvertureUrl = renameTomeCover(pm, finalCouvertureUrl, tome.numero, serieTitle);
      }
      
      // Si c'est le tome 1, synchroniser avec la couverture de la série
      if (tome.numero === 1 && serieTitle) {
        if (!finalCouvertureUrl && serieCover) {
          // Le tome 1 n'a pas de couverture, mais la série oui : copier celle de la série
          finalCouvertureUrl = serieCover;
        } else if (finalCouvertureUrl && !serieCover) {
          // Le tome 1 a une couverture, mais pas la série : mettre à jour la série
          updateSerieCover(db, tome.serie_id, finalCouvertureUrl);
        }
      }
      
      const stmt = db.prepare(`
        INSERT INTO manga_tomes (serie_id, numero, prix, date_sortie, date_achat, couverture_url, type_tome)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        tome.serie_id,
        tome.numero,
        tome.prix,
        tome.date_sortie || null,
        tome.date_achat || null,
        finalCouvertureUrl,
        tome.type_tome || 'Standard'
      );
      
      const tomeId = result.lastInsertRowid;
      
      // Ajouter les propriétaires dans la table de liaison
      if (tome.proprietaireIds && tome.proprietaireIds.length > 0) {
        const insertProprietaire = db.prepare(`
          INSERT INTO manga_manga_tomes_proprietaires (serie_id, tome_id, user_id, user_uuid) VALUES (?, ?, ?, ?)
        `);
        tome.proprietaireIds.forEach(userId => {
          const userUuid = getUserUuidById(db, userId);
          if (userUuid) {
            insertProprietaire.run(tome.serie_id, tomeId, userId, userUuid);
          }
        });
      } else {
        // Si aucun propriétaire n'est spécifié, ajouter l'utilisateur connecté par défaut
        const currentUser = store.get('currentUser', '');
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          const userUuid = getUserUuidByName(db, currentUser);
          if (userUuid) {
            db.prepare(`
              INSERT INTO manga_manga_tomes_proprietaires (serie_id, tome_id, user_id, user_uuid) VALUES (?, ?, ?, ?)
            `).run(tome.serie_id, tomeId, userId, userUuid);
            db.prepare('DELETE FROM manga_manga_tomes_proprietaires WHERE tome_id = ? AND user_uuid != ?')
              .run(tomeId, userUuid);
            setExclusiveSerieOwnership(db, tome.serie_id, userId);
          }
        }
      }

      return tomeId;
    } catch (error) {
      console.error('Erreur create-tome:', error);
      throw error;
    }
  });

  // Mettre à jour un tome
  ipcMain.handle('update-tome', (event, id, tome) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // Récupérer les infos actuelles du tome et de la série pour le renommage
      const currentTome = db.prepare(`
        SELECT t.numero, t.couverture_url, s.titre as serie_titre, t.serie_id
        FROM manga_tomes t
        JOIN manga_series s ON t.serie_id = s.id
        WHERE t.id = ?
      `).get(id);
      
      // Construction dynamique de la requête pour mise à jour partielle
      const fields = [];
      const values = [];
      
      // Déterminer la couverture et le numéro finaux
      let finalCouvertureUrl = tome.couverture_url !== undefined ? tome.couverture_url : currentTome.couverture_url;
      const finalNumero = tome.numero !== undefined ? tome.numero : currentTome.numero;
      
      // Si la couverture ou le numéro change, renommer l'image
      if (finalCouvertureUrl && currentTome) {
        const needsRename = (tome.numero !== undefined && tome.numero !== currentTome.numero) ||
                            (tome.couverture_url !== undefined && tome.couverture_url !== currentTome.couverture_url);
        
        if (needsRename) {
          const pm = getPathManager();
          if (pm) finalCouvertureUrl = renameTomeCover(pm, finalCouvertureUrl, finalNumero, currentTome.serie_titre);
          // Forcer la mise à jour de la couverture dans la BDD
          tome.couverture_url = finalCouvertureUrl;
        }
      }
      
      if (tome.numero !== undefined) {
        fields.push('numero = ?');
        values.push(tome.numero);
      }
      if (tome.prix !== undefined) {
        fields.push('prix = ?');
        values.push(tome.prix);
      }
      if (tome.date_sortie !== undefined) {
        fields.push('date_sortie = ?');
        values.push(tome.date_sortie || null);
      }
      if (tome.date_achat !== undefined) {
        fields.push('date_achat = ?');
        values.push(tome.date_achat || null);
      }
      if (tome.couverture_url !== undefined) {
        fields.push('couverture_url = ?');
        values.push(tome.couverture_url || null);
      }
      if (tome.type_tome !== undefined) {
        fields.push('type_tome = ?');
        values.push(tome.type_tome || 'Standard');
      }
      
      // Ajouter l'ID à la fin pour le WHERE
      values.push(id);
      
      if (fields.length > 0) {
        const query = `UPDATE manga_tomes SET ${fields.join(', ')} WHERE id = ?`;
        const stmt = db.prepare(query);
        stmt.run(...values);
      }
      
      // Mettre à jour les propriétaires si fournis
      if (tome.proprietaireIds !== undefined) {
        // Supprimer les anciens propriétaires
        db.prepare('DELETE FROM manga_manga_tomes_proprietaires WHERE tome_id = ?').run(id);
        
        // Ajouter les nouveaux propriétaires
        if (tome.proprietaireIds.length > 0) {
          const insertProprietaire = db.prepare(`
            INSERT INTO manga_manga_tomes_proprietaires (serie_id, tome_id, user_id, user_uuid) VALUES (?, ?, ?, ?)
          `);
          tome.proprietaireIds.forEach(userId => {
            const userUuid = getUserUuidById(db, userId);
            if (userUuid) {
              insertProprietaire.run(currentTome.serie_id, id, userId, userUuid);
            }
          });
        }
      } else if (tome.date_achat !== undefined && tome.date_achat) {
        // Si date_achat est renseignée et qu'aucun propriétaire n'est spécifié, ajouter l'utilisateur actuel automatiquement
        const currentUser = store.get('currentUser', '');
        if (currentUser) {
          const userId = getUserIdByName(db, currentUser);
          if (userId) {
            const userUuid = getUserUuidByName(db, currentUser);
            if (userUuid) {
              db.prepare(`
                INSERT OR IGNORE INTO manga_manga_tomes_proprietaires (serie_id, tome_id, user_id, user_uuid)
                VALUES (?, ?, ?, ?)
              `).run(currentTome.serie_id, id, userId, userUuid);
            }
          }
        }
      }
      
      // Si c'est le tome 1 et qu'on change sa couverture, synchroniser avec la série
      if (tome.couverture_url !== undefined && finalNumero === 1 && currentTome) {
        const serieCover = getSerieCover(db, currentTome.serie_id);
        
        if (!serieCover && finalCouvertureUrl) {
          // La série n'a pas de couverture, copier celle du tome 1
          updateSerieCover(db, currentTome.serie_id, finalCouvertureUrl);
        }
      }
      
      // Si c'est le tome 1 et qu'on modifie le prix, propager aux autres manga_tomes
      if (finalNumero === 1 && currentTome && tome.prix !== undefined) {
        // Propager uniquement aux manga_tomes encore à 0.00€ (non personnalisés)
        const propagationQuery = `
          UPDATE manga_tomes 
          SET prix = ? 
          WHERE serie_id = ? 
            AND id != ? 
            AND prix = 0.00
        `;
        
        const propagationResult = db.prepare(propagationQuery).run(tome.prix, currentTome.serie_id, id);
        
        if (propagationResult.changes > 0) {
          // Propagation effectuée
        }
      }
      
      // Si c'est le tome 1 et qu'on modifie les propriétaires, propager aux autres manga_tomes sans propriétaires
      if (finalNumero === 1 && currentTome && tome.proprietaireIds !== undefined && tome.proprietaireIds.length > 0) {
        // Trouver les manga_tomes de la série qui n'ont aucun propriétaire
        const manga_tomesWithoutOwners = db.prepare(`
          SELECT t.id, t.serie_id
          FROM manga_tomes t
          LEFT JOIN manga_manga_tomes_proprietaires tp ON t.id = tp.tome_id
          WHERE t.serie_id = ?
            AND t.id != ?
            AND tp.tome_id IS NULL
        `).all(currentTome.serie_id, id);
        
        if (manga_tomesWithoutOwners.length > 0) {
          const insertProprietaire = db.prepare(`
            INSERT INTO manga_manga_tomes_proprietaires (serie_id, tome_id, user_id, user_uuid) VALUES (?, ?, ?, ?)
          `);

          manga_tomesWithoutOwners.forEach(tomeRow => {
            tome.proprietaireIds.forEach(userId => {
              const userUuid = getUserUuidById(db, userId);
              if (userUuid) {
                insertProprietaire.run(tomeRow.serie_id, tomeRow.id, userId, userUuid);
              }
            });
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Erreur update-tome:', error);
      throw error;
    }
  });

  // Supprimer un tome
  ipcMain.handle('delete-tome', (event, id) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // Récupérer les infos du tome avant suppression
      const tome = db.prepare(`
        SELECT t.couverture_url
        FROM manga_tomes t
        WHERE t.id = ?
      `).get(id);
      
      if (tome && tome.couverture_url) {
        // Construire le chemin absolu de l'image
        // couverture_url est stocké comme "manga_series/slug/manga_tomes/tome-X.jpg" (relatif à covers/)
        const paths = getPaths(getPathManager);
        const tomeImagePath = path.join(paths.covers, tome.couverture_url);
        
        if (fs.existsSync(tomeImagePath)) {
          fs.unlinkSync(tomeImagePath);
        } else {
          console.warn(`⚠️ Image du tome introuvable : ${tomeImagePath}`);
        }
      }
      
      // Supprimer le tome de la base de données
      db.prepare('DELETE FROM manga_tomes WHERE id = ?').run(id);

      return true;
    } catch (error) {
      console.error('❌ Erreur delete-tome:', error);
      throw error;
    }
  });

  ipcMain.handle('normalize-serie-ownership', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }

      setExclusiveSerieOwnership(db, serieId, userId);
      return { success: true };
    } catch (error) {
      console.error('Erreur normalize-serie-ownership:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerMangaTomesHandlers };
