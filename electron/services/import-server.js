const http = require('http');

/**
 * Crée un serveur HTTP local pour recevoir les imports depuis le navigateur
 * @param {number} port - Port du serveur (défaut: 51234)
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {BrowserWindow} mainWindow - Fenêtre principale pour envoyer des événements
 * @param {PathManager} pathManager - Gestionnaire de chemins pour les couvertures
 */
function createImportServer(port, getDb, store, mainWindow, pathManager) {
  const server = http.createServer((req, res) => {
    // CORS headers pour accepter les requêtes depuis le navigateur
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Répondre aux requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Route: POST /api/import-start (déclencher l'overlay avant le scraping)
    if (req.method === 'POST' && req.url === '/api/import-start') {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('manga-import-start', {
          message: 'Extraction des données en cours...'
        });
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // Route: POST /api/import-tomes-only (importer uniquement les tomes manquants)
    if (req.method === 'POST' && req.url === '/api/import-tomes-only') {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const mangaData = JSON.parse(body);
          console.log('📖 Import tomes uniquement pour:', mangaData.titre);

          // Valider les données
          if (!mangaData.titre) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'Le titre est obligatoire' 
            }));
            return;
          }

          if (!mangaData.volumes || !Array.isArray(mangaData.volumes)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'Aucun tome à importer' 
            }));
            return;
          }

          // Récupérer la DB et l'utilisateur actuel
          const db = getDb();
          const currentUser = store.get('currentUser', '');

          if (!db) {
            throw new Error('Base de données non initialisée');
          }

          if (!currentUser) {
            throw new Error('Aucun utilisateur connecté');
          }

          // Chercher la série existante par titre (exacte ou partielle)
          // Inclut maintenant les titres alternatifs MAL
          let serie = db.prepare('SELECT * FROM series WHERE titre = ?').get(mangaData.titre);

          // Si pas trouvée exactement, chercher avec les titres alternatifs MAL
          if (!serie) {
            console.log(`⚠️ Série "${mangaData.titre}" non trouvée (recherche exacte)`);
            console.log('🔍 Recherche dans les titres alternatifs MAL...');
            
            // Recherche dans titre_romaji, titre_anglais, et titres_alternatifs (JSON)
            const altSearch = db.prepare(`
              SELECT * FROM series 
              WHERE titre LIKE ? 
                OR titre_romaji LIKE ?
                OR titre_anglais LIKE ?
                OR titres_alternatifs LIKE ?
              ORDER BY 
                CASE 
                  WHEN titre = ? THEN 1
                  WHEN titre_romaji = ? THEN 2
                  WHEN titre_anglais = ? THEN 3
                  ELSE 4
                END
              LIMIT 1
            `).get(
              `%${mangaData.titre}%`,
              `%${mangaData.titre}%`,
              `%${mangaData.titre}%`,
              `%${mangaData.titre}%`,
              mangaData.titre,
              mangaData.titre,
              mangaData.titre
            );

            if (altSearch) {
              serie = altSearch;
              console.log(`✅ Série trouvée via titres alternatifs: "${serie.titre}" (ID: ${serie.id})`);
            } else {
              // Chercher dans l'autre sens (le titre de la DB contient le titre recherché)
              console.log('🔍 Recherche inverse...');
              const reverseSimilar = db.prepare(
                'SELECT * FROM series WHERE ? LIKE \'%\' || titre || \'%\' ORDER BY titre'
              ).all(mangaData.titre);
              
              if (reverseSimilar.length > 0) {
                serie = reverseSimilar[0];
                console.log(`✅ Série similaire trouvée (inverse): "${serie.titre}" (ID: ${serie.id})`);
              } else {
                // Aucune correspondance trouvée
                const allSeries = db.prepare('SELECT titre FROM series ORDER BY titre LIMIT 10').all();
                const suggestions = allSeries.map(s => s.titre).join('", "');
                
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  success: false, 
                  error: `Série "${mangaData.titre}" introuvable. Séries existantes: "${suggestions}"...` 
                }));
                return;
              }
            }
          } else {
            console.log(`✅ Série trouvée (exacte): "${serie.titre}" (ID: ${serie.id})`);
          }

          // Récupérer les tomes existants
          const existingTomes = db.prepare('SELECT numero FROM tomes WHERE serie_id = ?').all(serie.id);
          const existingNumeros = new Set(existingTomes.map(t => t.numero));
          
          console.log(`📚 Tomes existants: ${Array.from(existingNumeros).sort((a, b) => a - b).join(', ') || 'aucun'}`);

          // Filtrer les tomes à ajouter (seulement ceux qui n'existent pas ET qui ont une date de sortie VF)
          const tomesToAdd = mangaData.volumes.filter(vol => 
            !existingNumeros.has(vol.numero) && vol.date_sortie
          );
          
          const tomesIgnored = mangaData.volumes.filter(vol => 
            !existingNumeros.has(vol.numero) && !vol.date_sortie
          ).length;
          
          if (tomesIgnored > 0) {
            console.log(`⏭️ ${tomesIgnored} tome(s) ignoré(s) (pas de date VF)`);
          }

          if (tomesToAdd.length === 0) {
            console.log('✅ Tous les tomes sont déjà présents, aucun ajout nécessaire');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              serieId: serie.id,
              tomesCreated: 0,
              message: 'Tous les tomes sont déjà présents'
            }));
            
            // Notifier la fin de l'import
            if (mainWindow && !mainWindow.isDestroyed()) {
              setTimeout(() => {
                mainWindow.webContents.send('manga-import-complete');
              }, 500);
            }
            return;
          }

          console.log(`📖 ${tomesToAdd.length} tome(s) manquant(s) à ajouter: ${tomesToAdd.map(t => t.numero).sort((a, b) => a - b).join(', ')}`);

          // Ajouter les tomes manquants
          const coverManager = require('./cover-manager');
          const stmtTome = db.prepare(`
            INSERT INTO tomes (serie_id, numero, prix, date_sortie, couverture_url)
            VALUES (?, ?, ?, ?, ?)
          `);
          
          const stmtProprietaire = db.prepare(`
            INSERT INTO tomes_proprietaires (tome_id, user_id) VALUES (?, ?)
          `);

          // Récupérer l'ID de l'utilisateur connecté
          const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
          if (!user) {
            throw new Error(`Utilisateur "${currentUser}" introuvable dans la BDD`);
          }

          let tomesCreated = 0;
          for (const volume of tomesToAdd) {
            try {
              // Télécharger et sauvegarder la couverture avec le bon nom (tome-X.ext)
              let localCoverPath = null;
              if (volume.couverture_url && pathManager) {
                const coverResult = await coverManager.downloadCover(
                  pathManager,
                  volume.couverture_url,
                  serie.titre,
                  'tome',
                  volume.numero
                );
                
                if (coverResult.success && coverResult.localPath) {
                  localCoverPath = coverResult.localPath;
                  console.log(`Image téléchargée: ${localCoverPath}`);
                }
              }

              const result = stmtTome.run(
                serie.id,
                volume.numero,
                volume.prix || 0.00, // Prix du tome ou 0.00 par défaut
                volume.date_sortie || null,
                localCoverPath
              );

              // Ajouter l'utilisateur comme propriétaire
              stmtProprietaire.run(result.lastInsertRowid, user.id);

              tomesCreated++;
              console.log(`✅ Tome ${volume.numero} créé → Propriétaire: ${currentUser}`);
            } catch (error) {
              console.error(`❌ Erreur tome ${volume.numero}:`, error.message);
            }
          }

          console.log(`📚 ${tomesCreated}/${tomesToAdd.length} tome(s) ajouté(s) avec succès`);

          // Écraser la couverture série avec celle du tome 1 (si disponible et si série vient de MAL)
          if (mangaData.couverture_url && serie.source_donnees === 'mal') {
            try {
              const coverManager = require('./cover-manager');
              
              // Télécharger la couverture série depuis Nautiljon
              const serieSlug = pathManager.createSlug(serie.titre);
              const serieDir = pathManager.getSerieDirectory(serieSlug);
              
              const coverResult = await coverManager.downloadCover(
                mangaData.couverture_url,
                serieDir,
                `${serieSlug}-cover`
              );
              
              if (coverResult.success) {
                // Mettre à jour la base de données
                db.prepare(`
                  UPDATE series
                  SET couverture_url = ?,
                      source_donnees = 'mal+nautiljon',
                      updated_at = datetime('now')
                  WHERE id = ?
                `).run(coverResult.path, serie.id);
                
                console.log(`📸 Couverture série écrasée par Nautiljon: ${coverResult.path}`);
              }
            } catch (error) {
              console.warn('⚠️ Impossible d\'écraser la couverture série:', error.message);
            }
          }

          // Envoyer un événement IPC pour rafraîchir l'UI
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('manga-imported', {
              serieId: serie.id,
              titre: serie.titre,
              tomesCreated
            });
          }

          // Répondre au client
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            serieId: serie.id,
            tomesCreated,
            volumesIgnored: tomesIgnored
          }));

          // Notifier la fin de l'import
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('manga-import-complete');
            }
          }, 500);

        } catch (error) {
          console.error('Erreur import tomes:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: error.message 
          }));

          // Notifier la fin de l'import même en cas d'erreur
          if (mainWindow && !mainWindow.isDestroyed()) {
            setTimeout(() => {
              mainWindow.webContents.send('manga-import-complete');
            }, 500);
          }
        }
      });
      return;
    }

    // Route: POST /api/import-manga
    if (req.method === 'POST' && req.url === '/api/import-manga') {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const mangaData = JSON.parse(body);
          console.log('📥 Import reçu depuis le navigateur:', mangaData.titre);

          // Valider les données
          if (!mangaData.titre) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'Le titre est obligatoire' 
            }));
            return;
          }

          // Récupérer la DB et l'utilisateur actuel
          const db = getDb();
          const currentUser = store.get('currentUser', '');

          if (!db) {
            throw new Error('Base de données non initialisée');
          }

          if (!currentUser) {
            throw new Error('Aucun utilisateur connecté');
          }

          // Vérifier si la série existe déjà (par titre exact ou mal_id)
          let existingSerie = db.prepare('SELECT id, source_donnees FROM series WHERE titre = ?').get(mangaData.titre);
          
          let serieId;
          let isUpdate = false;

          if (existingSerie) {
            // ========== MISE À JOUR : Écraser avec données françaises ==========
            isUpdate = true;
            serieId = existingSerie.id;
            
            console.log(`🔄 Série existante trouvée (ID ${serieId}), écrasement avec données Nautiljon...`);
            
            // Déterminer la nouvelle source
            const newSource = existingSerie.source_donnees && existingSerie.source_donnees.includes('mal')
                            ? 'mal+nautiljon'
                            : 'nautiljon';
            
            // Écraser TOUTES les données françaises
            db.prepare(`
              UPDATE series 
              SET titre = ?,
                  type_volume = ?,
                  type_contenu = ?,
                  description = ?,
                  statut_publication = ?,
                  annee_publication = ?,
                  genres = ?,
                  nb_chapitres = ?,
                  editeur = ?,
                  rating = ?,
                  source_donnees = ?,
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(
              mangaData.titre, // Titre VF
              mangaData.type_volume || 'Broché',
              mangaData.type_contenu || 'volume',
              mangaData.description,
              mangaData.statut_publication,
              mangaData.annee_publication, // Année VF
              mangaData.genres,
              mangaData.nb_chapitres, // Nb volumes/chapitres VF
              mangaData._editeur || null, // Éditeur VF
              mangaData.rating,
              newSource,
              serieId
            );
            
            console.log(`✅ Série "${mangaData.titre}" mise à jour avec données Nautiljon (ID ${serieId})`);
          } else {
            // ========== CRÉATION : Nouvelle série ==========
            const stmt = db.prepare(`
              INSERT INTO series (
                titre, statut, type_volume, type_contenu, couverture_url, description,
                statut_publication, annee_publication, genres, nb_chapitres,
                langue_originale, demographie, editeur, rating, source_donnees
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nautiljon')
            `);

            const result = stmt.run(
              mangaData.titre,
              mangaData.statut || 'En cours',
              mangaData.type_volume || 'Broché',
              mangaData.type_contenu || 'volume',
              mangaData.couverture_url,
              mangaData.description,
              mangaData.statut_publication,
              mangaData.annee_publication,
              mangaData.genres,
              mangaData.nb_chapitres,
              mangaData.langue_originale,
              mangaData.demographie,
              mangaData._editeur || null,
              mangaData.rating
            );

            serieId = result.lastInsertRowid;
            console.log(`✅ Série "${mangaData.titre}" ajoutée avec l'ID ${serieId}`);
          }

          // Télécharger la couverture de la série en local si une URL est fournie
          if (mangaData.couverture_url && pathManager) {
            try {
              console.log(`📥 Téléchargement de la couverture de la série depuis: ${mangaData.couverture_url}`);
              const coverManager = require('./cover-manager');
              const coverResult = await coverManager.downloadCover(
                pathManager,
                mangaData.couverture_url,
                mangaData.titre,
                'serie',
                serieId
              );

              if (coverResult.success && coverResult.localPath) {
                // Mettre à jour l'URL de la couverture avec le chemin local
                db.prepare('UPDATE series SET couverture_url = ? WHERE id = ?')
                  .run(coverResult.localPath, serieId);
                console.log(`✅ Couverture de la série téléchargée: ${coverResult.localPath}`);
              } else {
                console.warn(`⚠️ Échec du téléchargement de la couverture de la série:`, coverResult.error || 'Raison inconnue');
              }
            } catch (error) {
              console.error(`❌ Erreur téléchargement couverture série:`, error);
              // On continue même si le téléchargement échoue
            }
          }

          // Créer les tomes automatiquement si fournis (uniquement ceux avec date de sortie VF)
          let tomesCreated = 0;
          let volumesIgnored = 0;
          
          if (mangaData.volumes && Array.isArray(mangaData.volumes) && mangaData.volumes.length > 0) {
            const volumesWithDate = mangaData.volumes.filter(vol => vol.date_sortie);
            volumesIgnored = mangaData.volumes.length - volumesWithDate.length;
            
            console.log(`📚 Création de ${volumesWithDate.length} tome(s)...`);
            if (volumesIgnored > 0) {
              console.log(`⏭️ ${volumesIgnored} tome(s) ignoré(s) (pas de date VF)`);
            }
            
            const coverManager = require('./cover-manager');
            
            const stmtTome = db.prepare(`
              INSERT INTO tomes (serie_id, numero, prix, date_sortie, couverture_url)
              VALUES (?, ?, ?, ?, ?)
            `);
            
            const stmtProprietaire = db.prepare(`
              INSERT INTO tomes_proprietaires (tome_id, user_id) VALUES (?, ?)
            `);

            // Récupérer l'ID de l'utilisateur connecté
            const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
            if (!user) {
              throw new Error(`Utilisateur "${currentUser}" introuvable dans la BDD`);
            }

            for (const volume of volumesWithDate) {
              try {
                // Télécharger et sauvegarder la couverture avec le bon nom (tome-X.ext)
                let localCoverPath = null;
                if (volume.couverture_url && pathManager) {
                  const coverResult = await coverManager.downloadCover(
                    pathManager,
                    volume.couverture_url,
                    mangaData.titre,
                    'tome',
                    volume.numero // ✨ Passer le numéro pour nommage automatique
                  );
                  if (coverResult.success && coverResult.localPath) {
                    localCoverPath = coverResult.localPath;
                  }
                }

                // Insérer le tome
                const result = stmtTome.run(
                  serieId,
                  volume.numero,
                  volume.prix || 0.00, // prix du tome ou 0.00 par défaut
                  volume.date_sortie || null, // date de sortie VF
                  localCoverPath
                );

                // Ajouter l'utilisateur comme propriétaire
                stmtProprietaire.run(result.lastInsertRowid, user.id);

                tomesCreated++;
                console.log(`  ✅ Tome ${volume.numero} créé → Propriétaire: ${currentUser}`);
              } catch (error) {
                console.error(`  ⚠️ Erreur création tome ${volume.numero}:`, error.message);
              }
            }

            console.log(`📚 ${tomesCreated}/${volumesWithDate.length} tomes créés avec succès`);
          }

          // Notifier la fenêtre principale pour rafraîchir l'UI
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('manga-imported', {
              id: serieId,
              titre: mangaData.titre,
              tomesCreated: tomesCreated
            });
            
            // Notifier la fin de l'import (après un court délai pour l'animation)
            setTimeout(() => {
              if (!mainWindow.isDestroyed()) {
                mainWindow.webContents.send('manga-import-complete');
              }
            }, 500);
          }

          // Répondre avec succès
          res.writeHead(200, { 'Content-Type': 'application/json' });
          const successMessage = volumesIgnored > 0 
            ? `Série "${mangaData.titre}" ajoutée avec ${tomesCreated} tome(s) (${volumesIgnored} ignoré(s) sans date VF)`
            : `Série "${mangaData.titre}" ajoutée avec ${tomesCreated} tome(s) !`;
          
          res.end(JSON.stringify({ 
            success: true, 
            id: serieId,
            tomesCreated: tomesCreated,
            volumesIgnored: volumesIgnored,
            message: successMessage
          }));

        } catch (error) {
          console.error('❌ Erreur import-manga:', error);
          
          // Notifier la fin de l'import même en cas d'erreur
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('manga-import-complete');
          }
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: error.message 
          }));
        }
      });

      return;
    }

    // Route: POST /api/import-anime (importer un anime depuis sources externes)
    if (req.method === 'POST' && req.url === '/api/import-anime') {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const animeData = JSON.parse(body);
          console.log('🎬 Import anime:', animeData.titre);

          // Notifier le début de l'import
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('manga-import-start', {
              message: `Import anime: ${animeData.titre}...`
            });
          }

          // Valider les données
          if (!animeData.titre) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'Le titre est obligatoire' 
            }));
            return;
          }

          // Récupérer la DB et l'utilisateur actuel
          const db = getDb();
          const currentUser = store.get('currentUser', '');

          if (!db) {
            throw new Error('Base de données non initialisée');
          }

          if (!currentUser) {
            throw new Error('Aucun utilisateur connecté');
          }

          // Vérifier si l'anime existe déjà (par MAL ID ou titre)
          let existingAnime = null;
          if (animeData.mal_id) {
            existingAnime = db.prepare('SELECT * FROM anime_series WHERE mal_id = ?').get(animeData.mal_id);
          }
          if (!existingAnime) {
            existingAnime = db.prepare('SELECT * FROM anime_series WHERE titre = ?').get(animeData.titre);
          }

          let animeId;
          
          if (existingAnime) {
            // Mettre à jour l'anime existant
            console.log(`♻️ Mise à jour de l'anime existant: ${existingAnime.titre}`);
            
            animeId = existingAnime.id;
            
            db.prepare(`
              UPDATE anime_series 
              SET titre = ?, titre_natif = ?, couverture_url = ?, description = ?, 
                  statut_diffusion = ?, type = ?, genres = ?, studios = ?, annee = ?, 
                  mal_id = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              animeData.titre,
              animeData.titre_natif || null,
              animeData.couverture_url || null,
              animeData.description || null,
              animeData.statut || 'En cours',
              animeData.type || 'TV',
              animeData.genres || null,
              animeData.studios || null,
              animeData.annee || null,
              animeData.mal_id || null,
              animeId
            );
            
          } else {
            // Créer un nouvel anime
            console.log(`✨ Création d'un nouvel anime: ${animeData.titre}`);
            
            // Détection automatique de la source si non fournie
            let sourceImport = animeData.source_import;
            if (!sourceImport) {
              // Essayer de deviner depuis l'URL de couverture ou définir 'manual'
              if (animeData.couverture_url) {
                if (animeData.couverture_url.includes('crunchyroll')) sourceImport = 'crunchyroll';
                else if (animeData.couverture_url.includes('animationdigitalnetwork') || animeData.couverture_url.includes('adn')) sourceImport = 'adn';
                else if (animeData.couverture_url.includes('adkami')) sourceImport = 'adkami';
                else if (animeData.mal_id) sourceImport = 'myanimelist';
              }
              // Si toujours pas de source, définir 'manual' (ajout manuel)
              if (!sourceImport) sourceImport = 'manual';
            }
            
            const insertResult = db.prepare(`
              INSERT INTO anime_series (
                titre, titre_natif, couverture_url, description, statut_diffusion, type, 
                nb_episodes, genres, studios, annee, mal_id, source_import, utilisateur_ajout
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              animeData.titre,
              animeData.titre_natif || null,
              animeData.couverture_url || null,
              animeData.description || null,
              animeData.statut || 'En cours',
              animeData.type || 'TV',
              animeData.nb_episodes || 0,
              animeData.genres || null,
              animeData.studios || null,
              animeData.annee || null,
              animeData.mal_id || null,
              sourceImport,
              currentUser
            );
            
            animeId = insertResult.lastInsertRowid;
          }

          // Télécharger la couverture en local si une URL est fournie
          if (animeData.couverture_url && pathManager) {
            try {
              console.log(`📥 Tentative de téléchargement de la couverture depuis: ${animeData.couverture_url}`);
              const coverManager = require('./cover-manager');
              const coverResult = await coverManager.downloadCover(
                pathManager,
                animeData.couverture_url,
                animeData.titre,
                'anime',
                animeId
              );

              console.log(`📦 Résultat du téléchargement:`, coverResult);

              if (coverResult.success && coverResult.localPath) {
                // Mettre à jour l'URL de la couverture avec le chemin local
                db.prepare('UPDATE anime_series SET couverture_url = ? WHERE id = ?')
                  .run(coverResult.localPath, animeId);
                console.log(`✅ Couverture d'anime téléchargée et mise à jour en BDD: ${coverResult.localPath}`);
              } else {
                console.warn(`⚠️ Échec du téléchargement de la couverture:`, coverResult.error || 'Raison inconnue');
              }
            } catch (error) {
              console.error(`❌ Erreur téléchargement couverture:`, error);
              // On continue même si le téléchargement échoue
            }
          } else {
            console.log(`⚠️ Pas de téléchargement de couverture: URL=${animeData.couverture_url ? 'OK' : 'MANQUANT'}, pathManager=${pathManager ? 'OK' : 'MANQUANT'}`);
          }

          // Créer les saisons si fournies
          let saisonsCreated = 0;
          if (animeData.saisons && Array.isArray(animeData.saisons) && animeData.saisons.length > 0) {
            console.log(`📊 Données saisons reçues:`, JSON.stringify(animeData.saisons));
            
            // Trouver le numéro de saison le plus élevé
            const maxSeasonNumber = Math.max(...animeData.saisons.map(s => s.numero_saison));
            console.log(`🔢 Numéro de saison max détecté: ${maxSeasonNumber}`);
            // Calculer le nombre total d'épisodes à partir des saisons
            let totalEpisodes = 0;
            for (let seasonNum = 1; seasonNum <= maxSeasonNumber; seasonNum++) {
              const saisonData = animeData.saisons.find(s => s.numero_saison === seasonNum);
              const nbEpisodes = saisonData?.nb_episodes || 12;
              totalEpisodes += nbEpisodes;
              console.log(`📊 Saison ${seasonNum}: ${nbEpisodes} épisodes`);
            }
            
            // Mettre à jour le nombre total d'épisodes dans anime_series
            db.prepare('UPDATE anime_series SET nb_episodes = ? WHERE id = ?')
              .run(totalEpisodes, animeId);
            
            console.log(`✅ Nombre total d'épisodes: ${totalEpisodes}`);
          } else {
            console.log('📋 Aucune saison fournie lors de l\'import (seront créées au marquage d\'épisode)');
          }

          // Notifier la fin de l'import
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('manga-import-complete');
          }

          // Succès
          const message = existingAnime 
            ? `Anime "${animeData.titre}" mis à jour avec ${saisonsCreated} saison(s)` 
            : `Anime "${animeData.titre}" ajouté avec ${saisonsCreated} saison(s)`;

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            animeId: animeId,
            saisonsCreated: saisonsCreated,
            message: message
          }));

        } catch (error) {
          console.error('❌ Erreur import-anime:', error);
          
          // Notifier la fin de l'import même en cas d'erreur
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('manga-import-complete');
          }
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: error.message 
          }));
        }
      });

      return;
    }

    // Route: POST /api/mark-episode-watched (marquer un épisode comme vu)
    if (req.method === 'POST' && req.url === '/api/mark-episode-watched') {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const episodeInfo = JSON.parse(body);
          console.log('✅ Marquer épisode comme vu:', episodeInfo);

          // Valider les données
          if (!episodeInfo.titre || !episodeInfo.saison_numero || !episodeInfo.episode_numero) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'Données manquantes (titre, saison_numero, episode_numero)' 
            }));
            return;
          }

          // Récupérer la DB et l'utilisateur actuel
          const db = getDb();
          const currentUser = store.get('currentUser', '');

          if (!db) {
            throw new Error('Base de données non initialisée');
          }

          if (!currentUser) {
            throw new Error('Aucun utilisateur connecté');
          }

          // Chercher l'anime par titre ou MAL ID
          let anime = null;
          
          // 1. Recherche par MAL ID (le plus fiable)
          if (episodeInfo.mal_id) {
            anime = db.prepare('SELECT * FROM anime_series WHERE mal_id = ?').get(episodeInfo.mal_id);
            if (anime) {
              console.log('✅ Anime trouvé par MAL ID:', anime.id);
            }
          }
          
          // 2. Recherche exacte par titre
          if (!anime) {
            anime = db.prepare(`
              SELECT * FROM anime_series 
              WHERE titre = ? OR titre_natif = ? OR titre_romaji = ?
              LIMIT 1
            `).get(episodeInfo.titre, episodeInfo.titre, episodeInfo.titre);
            if (anime) {
              console.log('✅ Anime trouvé par correspondance exacte:', anime.id);
            }
          }
          
          // 3. Recherche LIKE (plus flexible)
          if (!anime) {
            anime = db.prepare(`
              SELECT * FROM anime_series 
              WHERE titre LIKE ? 
                OR titre_natif LIKE ? 
                OR titre_romaji LIKE ?
              LIMIT 1
            `).get(`%${episodeInfo.titre}%`, `%${episodeInfo.titre}%`, `%${episodeInfo.titre}%`);
            if (anime) {
              console.log('✅ Anime trouvé par recherche LIKE:', anime.id);
            }
          }
          
          // 4. Recherche partielle normalisée (sans ponctuation)
          if (!anime) {
            const normalizedTitle = episodeInfo.titre.replace(/[^\w\s]/g, '').toLowerCase();
            const allAnimes = db.prepare('SELECT * FROM anime_series').all();
            
            for (const a of allAnimes) {
              const normalizedDbTitle = (a.titre || '').replace(/[^\w\s]/g, '').toLowerCase();
              const normalizedNativeTitle = (a.titre_natif || '').replace(/[^\w\s]/g, '').toLowerCase();
              
              if (normalizedDbTitle === normalizedTitle || normalizedNativeTitle === normalizedTitle) {
                anime = a;
                console.log(`✅ Anime trouvé par titre normalisé: ${anime.id} (${anime.titre})`);
                break;
              }
            }
          }

          if (!anime) {
            console.error('❌ Anime non trouvé. Recherche:', episodeInfo.titre);
            console.log('📋 Animes disponibles:', db.prepare('SELECT id, titre FROM anime_series').all());
            
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: `Anime "${episodeInfo.titre}" non trouvé dans votre collection` 
            }));
            return;
          }

      // Étendre automatiquement le nombre d'épisodes si nécessaire
      if (episodeInfo.episode_numero > anime.nb_episodes) {
        console.log(`📈 Extension du nombre d'épisodes: ${anime.nb_episodes} → ${episodeInfo.episode_numero} épisodes`);
        db.prepare(`
          UPDATE anime_series 
          SET nb_episodes = ? 
          WHERE id = ?
        `).run(episodeInfo.episode_numero, anime.id);
        
        anime.nb_episodes = episodeInfo.episode_numero;
      }

      // Auto-incrémentation : marquer tous les épisodes précédents comme vus
      const baseDate = new Date();
      
      if (episodeInfo.episode_numero > 1) {
        console.log(`🔄 Auto-incrémentation: marquage des épisodes 1 à ${episodeInfo.episode_numero - 1} comme vus`);
        
        // Marquer tous les épisodes précédents avec des timestamps espacés
        for (let ep = 1; ep < episodeInfo.episode_numero; ep++) {
          const dateVisionnage = new Date(baseDate.getTime() + ((ep - 1) * 1000)); // +1 seconde par épisode
          const dateVisionnageStr = dateVisionnage.toISOString().replace('T', ' ').replace('Z', '');
          db.prepare(`
            INSERT OR REPLACE INTO anime_episodes_vus (anime_id, utilisateur, episode_numero, vu, date_visionnage)
            VALUES (?, ?, ?, 1, ?)
          `).run(anime.id, currentUser, ep, dateVisionnageStr);
        }
        
        console.log(`✅ Épisodes 1-${episodeInfo.episode_numero - 1} auto-marqués comme vus`);
      }
      
      // Marquer l'épisode actuel comme vu
      const dateVisionnageActuel = new Date(baseDate.getTime() + ((episodeInfo.episode_numero - 1) * 1000));
      const dateVisionnageActuelStr = dateVisionnageActuel.toISOString().replace('T', ' ').replace('Z', '');
      db.prepare(`
        INSERT OR REPLACE INTO anime_episodes_vus (anime_id, utilisateur, episode_numero, vu, date_visionnage)
        VALUES (?, ?, ?, 1, ?)
      `).run(anime.id, currentUser, episodeInfo.episode_numero, dateVisionnageActuelStr);

      console.log(`✅ Épisode ${episodeInfo.episode_numero} de "${anime.titre}" marqué comme vu`);

      // Vérifier si tous les épisodes de la série sont vus pour mettre à jour le statut
      const stats = db.prepare(`
        SELECT 
          a.nb_episodes as nb_episodes_total,
          (
            SELECT COUNT(*) 
            FROM anime_episodes_vus 
            WHERE anime_id = ? AND utilisateur = ? AND vu = 1
          ) as nb_episodes_vus
        FROM anime_series a
        WHERE a.id = ?
      `).get(anime.id, currentUser, anime.id);

      const isComplete = stats.nb_episodes_total > 0 && stats.nb_episodes_vus === stats.nb_episodes_total;

      if (isComplete) {
        db.prepare(`
          INSERT OR REPLACE INTO anime_statut_utilisateur (anime_id, utilisateur, statut_visionnage, date_modification)
          VALUES (?, ?, 'Terminé', CURRENT_TIMESTAMP)
        `).run(anime.id, currentUser);
        console.log(`🎉 Anime "${anime.titre}" marqué comme "Terminé" automatiquement`);
      }

          // Succès
          const totalMarked = episodeInfo.episode_numero > 1 ? episodeInfo.episode_numero : 1;
          const message = episodeInfo.episode_numero > 1 ? 
            `${totalMarked} épisodes marqués comme vus (auto-incrémentation 1-${episodeInfo.episode_numero})` :
            `Épisode ${episodeInfo.episode_numero} marqué comme vu`;
            
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: message,
            totalMarked: totalMarked,
            isComplete: isComplete
          }));

        } catch (error) {
          console.error('❌ Erreur mark-episode-watched:', error);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: error.message 
          }));
        }
      });

      return;
    }

    // Route: POST /api/update-anime (mettre à jour un anime existant)
    if (req.method === 'POST' && req.url === '/api/update-anime') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const animeData = JSON.parse(body);
          console.log('📝 Mise à jour anime:', animeData.id);

          const db = require('./database').getDatabase();
          const currentUser = require('./user-service').getCurrentUser();

          if (!db) {
            throw new Error('Base de données non initialisée');
          }

          // Vérifier que l'anime existe
          const anime = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(animeData.id);
          if (!anime) {
            throw new Error(`Anime avec l'ID ${animeData.id} non trouvé`);
          }

          // Mettre à jour les données de l'anime
          db.prepare(`
            UPDATE anime_series 
            SET titre = ?, titre_natif = ?, description = ?, statut = ?, 
                type = ?, genres = ?, studios = ?, annee = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            animeData.titre,
            animeData.titre_natif || null,
            animeData.description || null,
            animeData.statut || 'En cours',
            animeData.type || 'TV',
            animeData.genres || null,
            animeData.studios || null,
            animeData.annee || null,
            animeData.id
          );

          console.log(`✅ Anime "${animeData.titre}" mis à jour`);

          // Mettre à jour les saisons si fournies
          if (animeData.saisons && Array.isArray(animeData.saisons)) {
            // Calculer le nombre total d'épisodes
            let totalEpisodes = 0;
            for (const saison of animeData.saisons) {
              totalEpisodes += saison.nb_episodes || 0;
            }
            if (totalEpisodes > 0) {
              db.prepare('UPDATE anime_series SET nb_episodes = ? WHERE id = ?')
                .run(totalEpisodes, animeData.id);
              console.log(`✅ Nombre total d'épisodes mis à jour: ${totalEpisodes}`);
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: `Anime "${animeData.titre}" mis à jour avec succès`
          }));

        } catch (error) {
          console.error('❌ Erreur update-anime:', error);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: error.message 
          }));
        }
      });

      return;
    }

    // Route: POST /add-anime (import rapide via MAL ID depuis Tampermonkey)
    if (req.method === 'POST' && req.url === '/add-anime') {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const malId = data.mal_id;
          
          if (!malId || isNaN(parseInt(malId))) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'MAL ID invalide' 
            }));
            return;
          }

          console.log(`🎬 Import rapide MAL ID: ${malId} depuis Tampermonkey`);

          // Notifier le début de l'import
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('manga-import-start', {
              message: `Import anime MAL ID: ${malId}...`
            });
          }

          // Appeler directement le handler add-anime-by-mal-id via webContents.executeJavaScript
          // pour déclencher l'IPC depuis le renderer et attendre le résultat
          if (mainWindow && !mainWindow.isDestroyed()) {
            const result = await mainWindow.webContents.executeJavaScript(`
              window.electronAPI.addAnimeByMalId(${malId})
            `);

            // Notifier la fin de l'import
            setTimeout(() => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('manga-import-complete');
                // Rafraîchir la liste des animes
                mainWindow.webContents.send('refresh-anime-list');
              }
            }, 1000);

            if (result.success) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: true, 
                anime: result.anime,
                message: `${result.anime.titre} ajouté avec succès !`
              }));
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                error: result.error || 'Erreur lors de l\'import'
              }));
            }
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'Fenêtre principale non disponible'
            }));
          }

        } catch (error) {
          console.error('❌ Erreur add-anime:', error);
          
          // Notifier la fin de l'import même en cas d'erreur
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('manga-import-complete');
          }
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: error.message 
          }));
        }
      });

      return;
    }

    // Route: POST /import-avn (importer un jeu AVN depuis F95Zone)
    if (req.method === 'POST' && req.url === '/import-avn') {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const avnData = JSON.parse(body);
          console.log('🎮 Import AVN:', avnData.titre || avnData.name);

          const db = getDb();
          const currentUser = store.get('currentUser', '');

          if (!currentUser) {
            throw new Error('Aucun utilisateur actuel sélectionné');
          }

          // Normaliser les données (compatible avec Tool Extractor format)
          const gameData = {
            f95_thread_id: avnData.id || avnData.f95_thread_id,
            titre: avnData.name || avnData.titre,
            version: avnData.version,
            statut_jeu: avnData.status || avnData.statut_jeu || 'EN COURS',
            moteur: avnData.type || avnData.moteur,
            couverture_url: avnData.image || avnData.couverture_url,
            tags: avnData.tags || [],
            lien_f95: avnData.link || avnData.lien_f95,
            lien_traduction: avnData.lien_traduction || null,
            lien_jeu: avnData.lien_jeu || null,
            statut_perso: avnData.statut_perso || 'À jouer',
            notes_privees: avnData.notes_privees || null,
            chemin_executable: avnData.chemin_executable || null
          };

          // Vérifier si le jeu existe déjà
          let existingGame = null;
          if (gameData.f95_thread_id) {
            existingGame = db.prepare('SELECT * FROM avn_games WHERE f95_thread_id = ?').get(gameData.f95_thread_id);
          }

          if (existingGame) {
            // Mise à jour du jeu existant
            db.prepare(`
              UPDATE avn_games 
              SET version = ?,
                  statut_jeu = ?,
                  moteur = ?,
                  couverture_url = ?,
                  tags = ?,
                  lien_f95 = ?,
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(
              gameData.version,
              gameData.statut_jeu,
              gameData.moteur,
              gameData.couverture_url,
              JSON.stringify(gameData.tags),
              gameData.lien_f95,
              existingGame.id
            );

            console.log(`✅ Jeu AVN mis à jour: "${gameData.titre}" (ID: ${existingGame.id})`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              message: `Jeu mis à jour: ${gameData.titre}`,
              id: existingGame.id,
              action: 'updated'
            }));
          } else {
            // Créer un nouveau jeu
            const result = db.prepare(`
              INSERT INTO avn_games (
                f95_thread_id, titre, version, statut_jeu, moteur,
                couverture_url, tags, lien_f95, lien_traduction, lien_jeu,
                statut_perso, notes_privees, chemin_executable,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `).run(
              gameData.f95_thread_id,
              gameData.titre,
              gameData.version,
              gameData.statut_jeu,
              gameData.moteur,
              gameData.couverture_url,
              JSON.stringify(gameData.tags),
              gameData.lien_f95,
              gameData.lien_traduction,
              gameData.lien_jeu,
              gameData.statut_perso,
              gameData.notes_privees,
              gameData.chemin_executable
            );

            const gameId = result.lastInsertRowid;

            // Ajouter le propriétaire actuel
            db.prepare(`
              INSERT INTO avn_proprietaires (game_id, utilisateur)
              VALUES (?, ?)
            `).run(gameId, currentUser);

            console.log(`✅ Jeu AVN créé: "${gameData.titre}" (ID: ${gameId})`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              message: `Jeu ajouté: ${gameData.titre}`,
              id: gameId,
              action: 'created'
            }));
          }

        } catch (error) {
          console.error('❌ Erreur import AVN:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: error.message 
          }));
        }
      });

      return;
    }

    // Route: GET / (healthcheck)
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        message: 'Le Nexus Import Server',
        version: '1.0.0'
      }));
      return;
    }

    // Route: GET /api/proxy-image?url=... (Proxy pour images protégées)
    if (req.method === 'GET' && req.url.startsWith('/api/proxy-image')) {
      const { net } = require('electron');
      const urlParams = new URLSearchParams(req.url.split('?')[1]);
      const imageUrl = urlParams.get('url');
      
      if (!imageUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'URL manquante' }));
        return;
      }

      console.log(`🖼️ Proxy image: ${imageUrl}`);

      const request = net.request({
        url: imageUrl,
        method: 'GET',
        redirect: 'follow'
      });

      // Headers pour contourner les protections
      request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      request.setHeader('Accept', 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8');
      request.setHeader('Accept-Language', 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7');
      
      if (imageUrl.includes('lewdcorner')) {
        request.setHeader('Referer', 'https://lewdcorner.com/');
      } else if (imageUrl.includes('f95zone')) {
        request.setHeader('Referer', 'https://f95zone.to/');
      }

      const chunks = [];

      request.on('response', (response) => {
        // Transférer les headers pertinents
        res.writeHead(response.statusCode, {
          'Content-Type': response.headers['content-type'] || 'image/jpeg',
          'Access-Control-Allow-Origin': '*'
        });

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          res.end(buffer);
        });

        response.on('error', (error) => {
          console.error('❌ Erreur response proxy image:', error);
          res.writeHead(500);
          res.end();
        });
      });

      request.on('error', (error) => {
        console.error('❌ Erreur request proxy image:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      });

      request.end();
      return;
    }

    // Route non trouvée
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route non trouvée' }));
  });

  // Démarrer le serveur
  server.listen(port, 'localhost', () => {
    console.log(`🌐 Serveur d'import démarré sur http://localhost:${port}`);
  });

  // Gestion des erreurs
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`⚠️ Le port ${port} est déjà utilisé. Import depuis le navigateur désactivé.`);
    } else {
      console.error('❌ Erreur serveur d\'import:', error);
    }
  });

  return server;
}

module.exports = { createImportServer };
