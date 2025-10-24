const fs = require('fs');
const path = require('path');
const { createSlug } = require('../utils/slug');
const { 
  renameSerieFolder, 
  renameTomeCover, 
  renameSerieCover 
} = require('../services/cover-manager');

/**
 * Enregistre tous les handlers IPC pour les mangas (séries et tomes)
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Store} store - Instance d'electron-store
 */
function registerMangaHandlers(ipcMain, getDb, getPathManager, store) {
  
  // ========== SÉRIES ==========
  
  // Récupérer la liste des séries avec filtres
  ipcMain.handle('get-series', (event, filters = {}) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      
      // Récupérer l'ID de l'utilisateur actuel
      const user = currentUser ? db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser) : null;
      const userId = user ? user.id : null;

      let query = `
        SELECT 
          s.*,
          (SELECT COUNT(*) FROM tomes WHERE serie_id = s.id) as tome_count,
          st.tag as manual_tag,
          st.is_favorite as is_favorite
        FROM series s 
        LEFT JOIN serie_tags st ON s.id = st.serie_id AND st.user_id = ?
        WHERE 1=1
      `;
      const params = [userId];

      // Filtrer les séries masquées (sauf si on demande explicitement à les afficher)
      if (currentUser && !filters.afficherMasquees) {
        query += ` AND s.id NOT IN (
          SELECT serie_id FROM series_masquees WHERE utilisateur = ?
        )`;
        params.push(currentUser);
      }

      if (filters.statut) {
        query += ' AND s.statut = ?';
        params.push(filters.statut);
      }

      if (filters.type_volume) {
        query += ' AND s.type_volume = ?';
        params.push(filters.type_volume);
      }

      if (filters.search) {
        query += ' AND s.titre LIKE ?';
        params.push(`%${filters.search}%`);
      }

      // Filtre par tag
      if (filters.tag) {
        if (filters.tag === 'aucun') {
          query += ' AND st.tag IS NULL AND (st.is_favorite IS NULL OR st.is_favorite = 0)';
        } else if (filters.tag === 'favori') {
          query += ' AND st.is_favorite = 1';
        } else if (filters.tag === 'en_cours' || filters.tag === 'lu') {
          // Pour les tags automatiques, on filtre après la requête
          // car ils dépendent du calcul de la progression
        } else {
          query += ' AND st.tag = ?';
          params.push(filters.tag);
        }
      }

      query += ' ORDER BY s.titre ASC';

      const stmt = db.prepare(query);
      const series = stmt.all(...params);
      
      // Calculer le tag effectif pour chaque série en fonction de la progression
      let seriesWithTags = series.map(serie => {
        let effectiveTag = serie.manual_tag || null;
        
        // Récupérer les tomes avec leur statut de lecture pour l'utilisateur actuel
        let tomesWithLecture = [];
        if (currentUser && serie.tome_count > 0) {
          tomesWithLecture = db.prepare(`
            SELECT 
              t.id,
              t.numero,
              CASE WHEN lt.lu = 1 THEN 1 ELSE 0 END as lu
            FROM tomes t
            LEFT JOIN lecture_tomes lt ON t.id = lt.tome_id AND lt.utilisateur = ?
            WHERE t.serie_id = ?
            ORDER BY t.numero ASC
          `).all(currentUser, serie.id);
          
          // Calculer automatiquement les tags en_cours et lu
          const nbTomesLus = tomesWithLecture.filter(t => t.lu === 1).length;
          
          // Si pas de tag manuel (a_lire ou abandonne), calculer automatiquement
          if (!serie.manual_tag || serie.manual_tag === null) {
            if (nbTomesLus === serie.tome_count && nbTomesLus > 0) {
              effectiveTag = 'lu';
            } else if (nbTomesLus > 0) {
              effectiveTag = 'en_cours';
            }
          }
        }
        
        return {
          ...serie,
          tomes: tomesWithLecture,
          tag: effectiveTag,
          is_favorite: serie.is_favorite ? true : false
        };
      });
      
      // Filtrer par tag automatique si nécessaire
      if (filters.tag === 'en_cours') {
        seriesWithTags = seriesWithTags.filter(s => s.tag === 'en_cours');
      } else if (filters.tag === 'lu') {
        seriesWithTags = seriesWithTags.filter(s => s.tag === 'lu');
      }
      
      return seriesWithTags;
    } catch (error) {
      console.error('Erreur get-series:', error);
      throw error;
    }
  });

  // Récupérer une série avec ses tomes
  ipcMain.handle('get-serie', (event, id) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const serie = db.prepare('SELECT * FROM series WHERE id = ?').get(id);
      if (!serie) return null;

      const tomes = db.prepare('SELECT * FROM tomes WHERE serie_id = ? ORDER BY numero ASC').all(id);
      
      // Récupérer l'utilisateur actuel
      const currentUser = store.get('currentUser', '');
      
      // Récupérer le tag de la série pour l'utilisateur actuel
      const user = currentUser ? db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser) : null;
      const userId = user ? user.id : null;
      const tagData = userId ? db.prepare('SELECT tag, is_favorite FROM serie_tags WHERE serie_id = ? AND user_id = ?').get(id, userId) : null;
      
      // Calculer le tag effectif (manuel ou automatique)
      let effectiveTag = tagData ? tagData.tag : null;
      if (!effectiveTag || effectiveTag === null) {
        if (currentUser && tomes.length > 0) {
          const tomesLus = db.prepare(`
            SELECT COUNT(*) as count 
            FROM lecture_tomes lt
            JOIN tomes t ON lt.tome_id = t.id
            WHERE t.serie_id = ? AND lt.utilisateur = ? AND lt.lu = 1
          `).get(id, currentUser);
          
          const nbTomesLus = tomesLus ? tomesLus.count : 0;
          
          if (nbTomesLus === tomes.length && nbTomesLus > 0) {
            effectiveTag = 'lu';
          } else if (nbTomesLus > 0) {
            effectiveTag = 'en_cours';
          }
        }
      }
      
      // Enrichir chaque tome avec son statut de lecture et ses propriétaires
      const tomesAvecLecture = tomes.map(tome => {
        const lecture = db.prepare('SELECT lu, date_lecture FROM lecture_tomes WHERE tome_id = ? AND utilisateur = ?')
          .get(tome.id, currentUser);
        
        // Récupérer les propriétaires de ce tome
        const proprietaires = db.prepare(`
          SELECT u.id, u.name, u.color
          FROM tomes_proprietaires tp
          JOIN users u ON tp.user_id = u.id
          WHERE tp.tome_id = ?
        `).all(tome.id);
        
        return {
          ...tome,
          lu: lecture ? lecture.lu : 0,
          date_lecture: lecture ? lecture.date_lecture : null,
          proprietaires: proprietaires,
          proprietaireIds: proprietaires.map(p => p.id)
        };
      });
      
      return { 
        ...serie, 
        tomes: tomesAvecLecture, 
        tag: effectiveTag,
        manual_tag: tagData ? tagData.tag : null,
        is_favorite: tagData ? (tagData.is_favorite ? true : false) : false
      };
    } catch (error) {
      console.error('Erreur get-serie:', error);
      throw error;
    }
  });

  // Créer une série
  ipcMain.handle('create-serie', (event, serie) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // Détecter si un dossier temporaire existe (créé avec un titre différent)
      let finalCouvertureUrl = serie.couverture_url || null;
      
      if (finalCouvertureUrl) {
        // Extraire l'ancien slug du chemin (ex: "covers/old_slug/cover.webp")
        const match = finalCouvertureUrl.match(/^covers\/([^/]+)\//);
        if (match) {
          const oldSlug = match[1];
          const newSlug = createSlug(serie.titre);
          
          // Si le slug a changé, renommer le dossier
          if (oldSlug !== newSlug) {
            const coversDir = store.get('coversDirectory', '');
            if (coversDir) {
              const oldFolderPath = path.join(coversDir, oldSlug);
              const newFolderPath = path.join(coversDir, newSlug);
              
              if (fs.existsSync(oldFolderPath) && !fs.existsSync(newFolderPath)) {
                fs.renameSync(oldFolderPath, newFolderPath);

                
                // Mettre à jour le chemin de la couverture
                finalCouvertureUrl = finalCouvertureUrl.replace(`covers/${oldSlug}/`, `covers/${newSlug}/`);
              }
            }
          }
        }
        
        // Renommer l'image de la série en cover.ext
        const pm = getPathManager();
        if (pm) finalCouvertureUrl = renameSerieCover(pm, finalCouvertureUrl, serie.titre);
      }
      
      const stmt = db.prepare(`
        INSERT INTO series (titre, statut, type_volume, couverture_url, description, statut_publication, annee_publication, genres, nb_chapitres, langue_originale, demographie, editeur, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        serie.titre, 
        serie.statut, 
        serie.type_volume, 
        finalCouvertureUrl,
        serie.description || null,
        serie.statut_publication || null,
        serie.annee_publication || null,
        serie.genres || null,
        serie.nb_chapitres || null,
        serie.langue_originale || null,
        serie.demographie || null,
        serie.editeur || null,
        serie.rating || null
      );
      
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Erreur create-serie:', error);
      throw error;
    }
  });

  // Mettre à jour une série
  ipcMain.handle('update-serie', (event, id, serie) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // Si le titre change, renommer le dossier
      if (serie.titre !== undefined) {
        const currentSerie = db.prepare('SELECT titre FROM series WHERE id = ?').get(id);
        if (currentSerie && currentSerie.titre !== serie.titre) {
          const pm = getPathManager();
          if (pm) renameSerieFolder(db, pm, currentSerie.titre, serie.titre, id);
        }
      }
      
      // Si la couverture change, la renommer en cover.ext
      if (serie.couverture_url !== undefined && serie.couverture_url) {
        const currentSerie = db.prepare('SELECT titre FROM series WHERE id = ?').get(id);
        if (currentSerie) {
          const pm = getPathManager();
          if (pm) serie.couverture_url = renameSerieCover(pm, serie.couverture_url, currentSerie.titre);
        }
      }
      
      // Construction dynamique de la requête pour mise à jour partielle
      const fields = [];
      const values = [];
      
      if (serie.titre !== undefined) {
        fields.push('titre = ?');
        values.push(serie.titre);
      }
      if (serie.statut !== undefined) {
        fields.push('statut = ?');
        values.push(serie.statut);
      }
      if (serie.type_volume !== undefined) {
        fields.push('type_volume = ?');
        values.push(serie.type_volume);
      }
      if (serie.couverture_url !== undefined) {
        fields.push('couverture_url = ?');
        values.push(serie.couverture_url || null);
      }
      if (serie.description !== undefined) {
        fields.push('description = ?');
        values.push(serie.description || null);
      }
      if (serie.statut_publication !== undefined) {
        fields.push('statut_publication = ?');
        values.push(serie.statut_publication || null);
      }
      if (serie.annee_publication !== undefined) {
        fields.push('annee_publication = ?');
        values.push(serie.annee_publication || null);
      }
      if (serie.genres !== undefined) {
        fields.push('genres = ?');
        values.push(serie.genres || null);
      }
      if (serie.nb_chapitres !== undefined) {
        fields.push('nb_chapitres = ?');
        values.push(serie.nb_chapitres || null);
      }
      if (serie.chapitres_lus !== undefined) {
        fields.push('chapitres_lus = ?');
        values.push(serie.chapitres_lus || null);
      }
      if (serie.langue_originale !== undefined) {
        fields.push('langue_originale = ?');
        values.push(serie.langue_originale || null);
      }
      if (serie.demographie !== undefined) {
        fields.push('demographie = ?');
        values.push(serie.demographie || null);
      }
      if (serie.editeur !== undefined) {
        fields.push('editeur = ?');
        values.push(serie.editeur || null);
      }
      if (serie.rating !== undefined) {
        fields.push('rating = ?');
        values.push(serie.rating || null);
      }
      
      // Toujours mettre à jour le timestamp
      fields.push('updated_at = CURRENT_TIMESTAMP');
      
      // Ajouter l'ID à la fin pour le WHERE
      values.push(id);
      
      const query = `UPDATE series SET ${fields.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(query);
      stmt.run(...values);
      
      return true;
    } catch (error) {
      console.error('Erreur update-serie:', error);
      throw error;
    }
  });

  // Supprimer une série (avec gestion multi-utilisateur)
  ipcMain.handle('delete-serie', async (event, id) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      const paths = getPathManager().getPaths();

      // Récupérer les infos de la série avant suppression
      const serie = db.prepare('SELECT titre FROM series WHERE id = ?').get(id);
      if (!serie) {
        console.warn(`⚠️ Série ${id} introuvable`);
        return true;
      }



      // Récupérer tous les tome_id de cette série depuis manga.db
      const tomeIds = db.prepare('SELECT id FROM tomes WHERE serie_id = ?').all(id).map(t => t.id);
      
      if (tomeIds.length === 0) {

      }

      // Vérifier si d'autres utilisateurs ont cette série
      let otherUsersHaveSerie = false;
      const dbFolder = paths.databases;
      
      if (fs.existsSync(dbFolder) && tomeIds.length > 0) {
        const userDbs = fs.readdirSync(dbFolder).filter(f => f.endsWith('.db'));
        
        for (const userDbFile of userDbs) {
          // Ignorer la base de l'utilisateur actuel
          const userName = path.basename(userDbFile, '.db');
          if (userName.toLowerCase() === currentUser.toLowerCase()) {
            continue;
          }

          // Ouvrir la base de cet utilisateur et vérifier s'il a des données de lecture pour cette série
          const userDbPath = path.join(dbFolder, userDbFile);
          try {
            const userDb = require('better-sqlite3')(userDbPath, { readonly: true });
            
            // Vérifier si cet utilisateur a des lectures pour les tomes de cette série
            // On utilise les tome_id qu'on a récupérés depuis manga.db
            const placeholders = tomeIds.map(() => '?').join(',');
            const hasLecture = userDb.prepare(`
              SELECT COUNT(*) as count 
              FROM lecture_tomes 
              WHERE tome_id IN (${placeholders})
            `).get(...tomeIds);
            userDb.close();

            if (hasLecture && hasLecture.count > 0) {
              otherUsersHaveSerie = true;

              break;
            }
          } catch (err) {
            console.warn(`⚠️ Impossible de lire la base de ${userName}:`, err.message);
          }
        }
      }

      if (otherUsersHaveSerie) {
        // D'autres utilisateurs ont cette série → supprimer SEULEMENT les données de lecture de l'utilisateur actuel

        
        // Supprimer les données de lecture de l'utilisateur actuel pour tous les tomes de cette série
        db.prepare(`
          DELETE FROM lecture_tomes 
          WHERE tome_id IN (SELECT id FROM tomes WHERE serie_id = ?) 
          AND utilisateur = ?
        `).run(id, currentUser);

        
        return { success: true, partial: true, message: 'Série retirée de votre collection (conservée pour les autres utilisateurs)' };
      } else {
        // Aucun autre utilisateur n'a cette série → suppression complète

        
        // 1. Supprimer les images (dossier complet)
        const slug = createSlug(serie.titre);
        const serieFolderPath = path.join(paths.covers, 'series', slug);
        
        if (fs.existsSync(serieFolderPath)) {
          try {
            // Suppression robuste avec retry (Proton Drive peut causer des verrous de fichiers)
            let retries = 3;
            let deleted = false;
            
            while (retries > 0 && !deleted) {
              try {
                // Supprimer d'abord tous les fichiers dans les sous-dossiers
                const deleteFolderRecursive = (folderPath) => {
                  if (fs.existsSync(folderPath)) {
                    fs.readdirSync(folderPath).forEach((file) => {
                      const curPath = path.join(folderPath, file);
                      if (fs.lstatSync(curPath).isDirectory()) {
                        deleteFolderRecursive(curPath);
                      } else {
                        fs.unlinkSync(curPath);
                      }
                    });
                    fs.rmdirSync(folderPath);
                  }
                };
                
                deleteFolderRecursive(serieFolderPath);
                deleted = true;

              } catch (err) {
                retries--;
                if (retries > 0) {

                  // Attendre un peu avant de réessayer (pour Proton Drive)
                  await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                  throw err;
                }
              }
            }
          } catch (err) {
            console.warn(`⚠️ Impossible de supprimer complètement le dossier (peut-être verrouillé par Proton Drive) : ${err.message}`);

            // Ne pas throw, continuer la suppression en BDD
          }
        }

        // 2. Supprimer les données de lecture (cascade via FK sur tomes)
        // Pas besoin de supprimer manuellement lecture_tomes, le ON DELETE CASCADE le fera
        
        // 3. Supprimer la série de manga.db (cascade supprime aussi les tomes)
        db.prepare('DELETE FROM series WHERE id = ?').run(id);

        
        return { success: true, partial: false, message: 'Série supprimée complètement' };
      }
    } catch (error) {
      console.error('❌ Erreur delete-serie:', error);
      throw error;
    }
  });

  // Masquer une série (supprime les données de lecture + cache de l'interface)
  ipcMain.handle('masquer-serie', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }



      // 1. Supprimer les données de lecture de l'utilisateur
      db.prepare(`
        DELETE FROM lecture_tomes 
        WHERE tome_id IN (SELECT id FROM tomes WHERE serie_id = ?) 
        AND utilisateur = ?
      `).run(serieId, currentUser);

      // 2. Ajouter dans la table series_masquees
      db.prepare(`
        INSERT OR IGNORE INTO series_masquees (serie_id, utilisateur) 
        VALUES (?, ?)
      `).run(serieId, currentUser);


      return { success: true };
    } catch (error) {
      console.error('❌ Erreur masquer-serie:', error);
      throw error;
    }
  });

  // Démasquer une série (réaffiche dans l'interface)
  ipcMain.handle('demasquer-serie', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }



      // Retirer de la table series_masquees
      db.prepare(`
        DELETE FROM series_masquees 
        WHERE serie_id = ? AND utilisateur = ?
      `).run(serieId, currentUser);


      return { success: true };
    } catch (error) {
      console.error('❌ Erreur demasquer-serie:', error);
      throw error;
    }
  });

  // Vérifier si une série est masquée pour l'utilisateur actuel
  ipcMain.handle('is-serie-masquee', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        return false;
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return false;
      }

      const result = db.prepare(`
        SELECT COUNT(*) as count 
        FROM series_masquees 
        WHERE serie_id = ? AND utilisateur = ?
      `).get(serieId, currentUser);

      return result && result.count > 0;
    } catch (error) {
      console.error('❌ Erreur is-serie-masquee:', error);
      return false;
    }
  });

  // ========== TOMES ==========
  
  // Créer un tome
  ipcMain.handle('create-tome', (event, tome) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // Récupérer le titre de la série pour le renommage
      const serie = db.prepare('SELECT titre, couverture_url FROM series WHERE id = ?').get(tome.serie_id);
      let finalCouvertureUrl = tome.couverture_url || null;
      
      // Renommer l'image du tome en tome-X.ext
      if (finalCouvertureUrl && serie) {
        const pm = getPathManager();
        if (pm) finalCouvertureUrl = renameTomeCover(pm, finalCouvertureUrl, tome.numero, serie.titre);
      }
      
      // Si c'est le tome 1, synchroniser avec la couverture de la série
      if (tome.numero === 1 && serie) {
        if (!finalCouvertureUrl && serie.couverture_url) {
          // Le tome 1 n'a pas de couverture, mais la série oui : copier celle de la série
          finalCouvertureUrl = serie.couverture_url;

        } else if (finalCouvertureUrl && !serie.couverture_url) {
          // Le tome 1 a une couverture, mais pas la série : mettre à jour la série
          db.prepare('UPDATE series SET couverture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(finalCouvertureUrl, tome.serie_id);

        }
      }
      
      const stmt = db.prepare(`
        INSERT INTO tomes (serie_id, numero, prix, proprietaire, date_sortie, date_achat, couverture_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        tome.serie_id,
        tome.numero,
        tome.prix,
        null, // proprietaire maintenant NULL (géré dans tomes_proprietaires)
        tome.date_sortie || null,
        tome.date_achat || null,
        finalCouvertureUrl
      );
      
      const tomeId = result.lastInsertRowid;
      
      // Ajouter les propriétaires dans la table de liaison
      if (tome.proprietaireIds && tome.proprietaireIds.length > 0) {
        const insertProprietaire = db.prepare(`
          INSERT INTO tomes_proprietaires (tome_id, user_id) VALUES (?, ?)
        `);
        tome.proprietaireIds.forEach(userId => {
          insertProprietaire.run(tomeId, userId);
        });

      } else {
        // Si aucun propriétaire n'est spécifié, ajouter l'utilisateur connecté par défaut
        const currentUser = store.get('currentUser', '');
        if (currentUser) {
          const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
          if (user) {
            db.prepare(`
              INSERT INTO tomes_proprietaires (tome_id, user_id) VALUES (?, ?)
            `).run(tomeId, user.id);

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
        FROM tomes t
        JOIN series s ON t.serie_id = s.id
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
      
      // Ajouter l'ID à la fin pour le WHERE
      values.push(id);
      
      if (fields.length > 0) {
        const query = `UPDATE tomes SET ${fields.join(', ')} WHERE id = ?`;
        const stmt = db.prepare(query);
        stmt.run(...values);
      }
      
      // Mettre à jour les propriétaires si fournis
      if (tome.proprietaireIds !== undefined) {
        // Supprimer les anciens propriétaires
        db.prepare('DELETE FROM tomes_proprietaires WHERE tome_id = ?').run(id);
        
        // Ajouter les nouveaux propriétaires
        if (tome.proprietaireIds.length > 0) {
          const insertProprietaire = db.prepare(`
            INSERT INTO tomes_proprietaires (tome_id, user_id) VALUES (?, ?)
          `);
          tome.proprietaireIds.forEach(userId => {
            insertProprietaire.run(id, userId);
          });

        }
      }
      
      // Si c'est le tome 1 et qu'on change sa couverture, synchroniser avec la série
      if (tome.couverture_url !== undefined && finalNumero === 1 && currentTome) {
        const serie = db.prepare('SELECT couverture_url FROM series WHERE id = ?').get(currentTome.serie_id);
        
        if (serie && !serie.couverture_url && finalCouvertureUrl) {
          // La série n'a pas de couverture, copier celle du tome 1
          db.prepare('UPDATE series SET couverture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(finalCouvertureUrl, currentTome.serie_id);

        }
      }
      
      // Si c'est le tome 1 et qu'on modifie le prix, propager aux autres tomes
      if (finalNumero === 1 && currentTome && tome.prix !== undefined) {
        // Propager uniquement aux tomes encore à 0.00€ (non personnalisés)
        const propagationQuery = `
          UPDATE tomes 
          SET prix = ? 
          WHERE serie_id = ? 
            AND id != ? 
            AND prix = 0.00
        `;
        
        const propagationResult = db.prepare(propagationQuery).run(tome.prix, currentTome.serie_id, id);
        
        if (propagationResult.changes > 0) {

        }
      }
      
      // Si c'est le tome 1 et qu'on modifie les propriétaires, propager aux autres tomes sans propriétaires
      if (finalNumero === 1 && currentTome && tome.proprietaireIds !== undefined && tome.proprietaireIds.length > 0) {
        // Trouver les tomes de la série qui n'ont aucun propriétaire
        const tomesWithoutOwners = db.prepare(`
          SELECT t.id
          FROM tomes t
          LEFT JOIN tomes_proprietaires tp ON t.id = tp.tome_id
          WHERE t.serie_id = ?
            AND t.id != ?
            AND tp.tome_id IS NULL
        `).all(currentTome.serie_id, id);
        
        if (tomesWithoutOwners.length > 0) {
          const insertProprietaire = db.prepare(`
            INSERT INTO tomes_proprietaires (tome_id, user_id) VALUES (?, ?)
          `);
          
          tomesWithoutOwners.forEach(tomeRow => {
            tome.proprietaireIds.forEach(userId => {
              insertProprietaire.run(tomeRow.id, userId);
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
        FROM tomes t
        WHERE t.id = ?
      `).get(id);
      
      if (tome && tome.couverture_url) {
        // Construire le chemin absolu de l'image
        // couverture_url est stocké comme "series/slug/tomes/tome-X.jpg" (relatif à covers/)
        const paths = getPathManager().getPaths();
        const tomeImagePath = path.join(paths.covers, tome.couverture_url);
        
        if (fs.existsSync(tomeImagePath)) {
          fs.unlinkSync(tomeImagePath);

        } else {
          console.warn(`⚠️ Image du tome introuvable : ${tomeImagePath}`);
        }
      }
      
      // Supprimer le tome de la base de données
      db.prepare('DELETE FROM tomes WHERE id = ?').run(id);

      return true;
    } catch (error) {
      console.error('❌ Erreur delete-tome:', error);
      throw error;
    }
  });

  // ========== TAGS DE SÉRIES ==========

  // Définir ou modifier le tag d'une série pour un utilisateur
  ipcMain.handle('set-serie-tag', async (event, serieId, userId, tag) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      if (tag && !['a_lire', 'abandonne'].includes(tag)) {
        throw new Error(`Tag invalide: ${tag}`);
      }

      // Vérifier si une entrée existe déjà
      const existing = db.prepare('SELECT id FROM serie_tags WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
      
      if (existing) {
        // Mettre à jour le tag existant
        db.prepare('UPDATE serie_tags SET tag = ?, updated_at = CURRENT_TIMESTAMP WHERE serie_id = ? AND user_id = ?')
          .run(tag, serieId, userId);

      } else {
        // Créer une nouvelle entrée
        db.prepare('INSERT INTO serie_tags (serie_id, user_id, tag, is_favorite) VALUES (?, ?, ?, 0)')
          .run(serieId, userId, tag);

      }
      
      return { success: true, tag };
    } catch (error) {
      console.error('❌ Erreur set-serie-tag:', error);
      throw error;
    }
  });

  // Basculer le statut favori d'une série pour un utilisateur
  ipcMain.handle('toggle-serie-favorite', async (event, serieId, userId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }


      
      // Vérifier si une entrée existe déjà
      const existing = db.prepare('SELECT id, is_favorite FROM serie_tags WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
      
      if (existing) {
        // Inverser le statut favori
        const newFavorite = existing.is_favorite ? 0 : 1;
        db.prepare('UPDATE serie_tags SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE serie_id = ? AND user_id = ?')
          .run(newFavorite, serieId, userId);

        return { success: true, is_favorite: newFavorite === 1 };
      } else {
        // Créer une nouvelle entrée avec favori activé
        db.prepare('INSERT INTO serie_tags (serie_id, user_id, tag, is_favorite) VALUES (?, ?, NULL, 1)')
          .run(serieId, userId);

        return { success: true, is_favorite: true };
      }
    } catch (error) {
      console.error('❌ Erreur toggle-serie-favorite:', error);
      throw error;
    }
  });

  // Récupérer le tag d'une série pour un utilisateur
  ipcMain.handle('get-serie-tag', async (event, serieId, userId) => {
    try {
      const db = getDb();
      if (!db) return null;

      const result = db.prepare('SELECT tag, is_favorite FROM serie_tags WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
      return result ? { tag: result.tag, is_favorite: result.is_favorite === 1 } : null;
    } catch (error) {
      console.error('❌ Erreur get-serie-tag:', error);
      return null;
    }
  });

  // Supprimer le tag d'une série pour un utilisateur (mais garder favori si présent)
  ipcMain.handle('remove-serie-tag', async (event, serieId, userId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }


      
      // Vérifier si c'est un favori
      const existing = db.prepare('SELECT is_favorite FROM serie_tags WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
      
      if (existing && existing.is_favorite) {
        // Si c'est un favori, on garde l'entrée mais on supprime juste le tag
        db.prepare('UPDATE serie_tags SET tag = NULL, updated_at = CURRENT_TIMESTAMP WHERE serie_id = ? AND user_id = ?')
          .run(serieId, userId);

      } else {
        // Sinon on supprime l'entrée complète
        db.prepare('DELETE FROM serie_tags WHERE serie_id = ? AND user_id = ?').run(serieId, userId);

      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur remove-serie-tag:', error);
      throw error;
    }
  });
}

module.exports = { registerMangaHandlers };
