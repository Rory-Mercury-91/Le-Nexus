const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { getUserIdByName, getPaths: getPathsHelper } = require('./settings-helpers');
const { safeJsonParse } = require('../common-helpers');
const { normalizeTitle } = require('../../services/mangas/import-utils');

/**
 * Enregistre les handlers IPC pour la gestion des bases de données
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Function} initDatabase - Fonction pour réinitialiser la base de données
 */
function registerDatabaseHandlers(ipcMain, dialog, getMainWindow, getDb, store, getPathManager, initDatabase) {
  const getPaths = () => getPathsHelper(getPathManager, store);

  // Fonction de fusion réutilisable (pour scheduler et IPC)
  function performMerge(mergePriority = null) {
    try {
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        console.log('⚠️ Aucun utilisateur connecté, pas de fusion');
        return { merged: false, manga_seriesCount: 0, manga_tomesCount: 0, animesCount: 0, gamesCount: 0 };
      }

      // Récupérer la priorité de fusion depuis la config cloud sync si non spécifiée
      if (mergePriority === null) {
        const cloudSyncConfig = store.get('cloudSyncConfig', {});
        mergePriority = cloudSyncConfig.mergePriority || 'current-user';
      }

      console.log(`🔄 Fusion avec priorité: ${mergePriority}`);

      const dbFolder = getPaths().databases;
      if (!fs.existsSync(dbFolder)) {
        return { merged: false, manga_seriesCount: 0, manga_tomesCount: 0, animesCount: 0, gamesCount: 0 };
      }

      const currentUserDbFile = `${currentUser.toLowerCase()}.db`;
      const currentUserDbPath = path.join(dbFolder, currentUserDbFile);

      // Vérifier que la base utilisateur existe (elle doit avoir été créée dans set-current-user)
      if (!fs.existsSync(currentUserDbPath)) {
        console.warn(`⚠️ Base utilisateur introuvable: ${currentUserDbFile}. La fusion ne peut pas être effectuée.`);
        return { merged: false, manga_seriesCount: 0, manga_tomesCount: 0, animesCount: 0, gamesCount: 0, error: 'Base utilisateur introuvable' };
      }

      // Vérifier si un enrichissement est en cours avant de fermer la connexion
      const { isEnrichmentRunning: isAnimeEnrichmentRunning } = require('../../services/animes/anime-enrichment-queue');
      const { isEnrichmentRunning: isMangaEnrichmentRunning } = require('../../services/mangas/manga-enrichment-queue');

      if (isAnimeEnrichmentRunning() || isMangaEnrichmentRunning()) {
        console.log('⏸️  Enrichissement en cours, report de la synchronisation des bases de données');
        return { merged: false, manga_seriesCount: 0, manga_tomesCount: 0, animesCount: 0, gamesCount: 0, skipped: true, reason: 'enrichment-in-progress' };
      }

      // S'assurer que la base utilisateur est chargée
      const { initDatabase } = require('../../services/database');
      const currentDb = getDb();

      // Vérifier si la base actuelle est déjà la bonne base utilisateur
      let targetDb = currentDb;
      let needsReload = false;

      if (currentDb) {
        // Vérifier si la base actuelle correspond à la base utilisateur
        try {
          const currentPath = currentDb.name; // better-sqlite3 expose le chemin via .name
          if (currentPath !== currentUserDbPath) {
            needsReload = true;
          }
        } catch (error) {
          // Si on ne peut pas vérifier, on suppose qu'il faut recharger
          needsReload = true;
        }
      } else {
        needsReload = true;
      }

      if (needsReload) {
        // Fermer la base actuelle si elle existe
        if (currentDb) {
          try {
            currentDb.close();
          } catch (error) {
            console.warn('⚠️ Erreur fermeture base actuelle:', error.message);
          }
        }

        // Charger la base utilisateur (source de vérité)
        console.log(`📂 Chargement de la base utilisateur: ${currentUserDbFile}`);
        targetDb = initDatabase(currentUserDbPath);

        // Mettre à jour la référence globale
        if (global.setDbMain) {
          global.setDbMain(targetDb);
          console.log(`✅ Base utilisateur chargée: ${currentUserDbFile}`);
        }
      } else {
        console.log(`ℹ️ Base utilisateur déjà chargée: ${currentUserDbFile}`);
      }

      // Lister toutes les bases SAUF la base utilisateur actuelle et les bases temporaires
      const files = fs.readdirSync(dbFolder).filter(f => {
        if (!f.endsWith('.db')) return false;
        if (f === currentUserDbFile) return false; // Exclure la base utilisateur actuelle
        if (f.startsWith('temp_')) return false; // Exclure les bases temporaires
        return true;
      });

      if (files.length === 0) {
        console.log('ℹ️ Aucune autre base à fusionner');
        return { merged: true, manga_seriesCount: 0, manga_tomesCount: 0, animesCount: 0, gamesCount: 0 };
      }

      let manga_seriesCount = 0;
      let manga_tomesCount = 0;
      let animesCount = 0;
      let gamesCount = 0;

      console.log(`🔄 Fusion de ${files.length} base(s) dans ${currentUserDbFile}...`);
      console.log(`📊 Priorité de fusion: ${mergePriority}`);

      files.forEach(file => {
        const userDbPath = path.join(dbFolder, file);

        // Vérifier l'intégrité de la base de données avant de la fusionner
        let userDb;
        try {
          userDb = new Database(userDbPath, { readonly: true });

          // Vérifier l'intégrité de la base de données
          const integrityCheck = userDb.pragma('integrity_check');
          if (integrityCheck && integrityCheck.length > 0 && integrityCheck[0].integrity_check !== 'ok') {
            console.error(`  ❌ Base de données corrompue détectée: ${file}`);
            console.error(`    → Résultat de l'intégrité: ${integrityCheck[0].integrity_check}`);
            userDb.close();
            return; // Passer à la base suivante
          }
        } catch (openError) {
          console.error(`  ❌ Impossible d'ouvrir la base de données ${file}:`, openError.message);
          if (openError.message.includes('database disk image is malformed') ||
            openError.message.includes('database is locked') ||
            openError.message.includes('not a database')) {
            console.error(`    → La base de données ${file} semble corrompue ou verrouillée. Elle sera ignorée.`);
          }
          return; // Passer à la base suivante
        }

        try {
          // ========================================
          // TABLES À NE PAS FUSIONNER (données utilisateur spécifiques)
          // ========================================
          // - user_preferences : préférences d'affichage, tags, blacklist (spécifiques à chaque utilisateur)
          // - *_user_data : toutes les tables *_user_data (données de progression, notes, etc.)
          // ========================================
          // TABLES À FUSIONNER (partage des coûts et données générales)
          // ========================================
          // - *_proprietaires : tables de propriété (fusionnées pour partager les coûts entre utilisateurs)
          // - manga_manga_tomes_proprietaires : qui possède quels tomes (pour partage des coûts)
          // ========================================

          // === FUSION DES UTILISATEURS (users) ===
          // Fusionner les utilisateurs pour partager les UUIDs et permettre la synchronisation
          // Chaque utilisateur garde son propre profil dans sa base, mais on fusionne pour partager les UUIDs
          const sourceUsersColumns = userDb.pragma('table_info(users)').map(col => col.name).filter(name => name !== 'id');
          const targetUsersColumns = targetDb.pragma('table_info(users)').map(col => col.name).filter(name => name !== 'id');
          const usersCommonColumns = sourceUsersColumns.filter(col => targetUsersColumns.includes(col));

          if (usersCommonColumns.length > 0) {
            const usersSelectColumns = usersCommonColumns.map(col => `"${col}"`).join(', ');
            try {
              const users = userDb.prepare(`SELECT ${usersSelectColumns} FROM users`).all();
              users.forEach(user => {
                // Vérifier si l'utilisateur existe déjà par name
                const existing = targetDb.prepare('SELECT id, sync_uuid FROM users WHERE name = ?').get(user.name);

                if (existing) {
                  // Utilisateur existe : mettre à jour le sync_uuid si présent dans la source
                  if (user.sync_uuid && !existing.sync_uuid) {
                    targetDb.prepare('UPDATE users SET sync_uuid = ?, updated_at = datetime(\'now\') WHERE id = ?')
                      .run(user.sync_uuid, existing.id);
                    console.log(`  ✓ UUID synchronisé pour utilisateur: ${user.name}`);
                  }
                } else {
                  // Nouvel utilisateur : l'insérer (mais sans l'ID)
                  const insertColumns = usersCommonColumns.filter(col => col !== 'id');
                  const quotedInsertColumns = insertColumns.map(col => `"${col}"`).join(', ');
                  const placeholders = insertColumns.map(() => '?').join(', ');
                  const values = insertColumns.map(col => user[col] !== undefined ? user[col] : null);

                  try {
                    targetDb.prepare(`INSERT INTO users (${quotedInsertColumns}) VALUES (${placeholders})`).run(...values);
                    console.log(`  ✓ Utilisateur ajouté: ${user.name}`);
                  } catch (insertError) {
                    // Si erreur UNIQUE sur name, c'est normal (utilisateur existe déjà)
                    if (!insertError.message.includes('UNIQUE constraint')) {
                      console.warn(`  ⚠️ Erreur insertion utilisateur ${user.name}:`, insertError.message);
                    }
                  }
                }
              });
            } catch (usersError) {
              console.warn(`  ⚠️ Erreur fusion utilisateurs depuis ${file}:`, usersError.message);
            }
          }

          // === FUSION DES MANGAS ===
          // Colonnes utilisateur à EXCLURE de la fusion (données spécifiques à chaque utilisateur)
          const mangaExcludeColumns = [
            'chapitres_lus',
            'volumes_lus',
            'statut_lecture',
            'score_utilisateur',
            'date_debut_lecture',
            'date_fin_lecture'
          ];

          // Récupérer les colonnes de la source et de la destination
          const sourceColumns = userDb.pragma('table_info(manga_series)').map(col => col.name).filter(name => name !== 'id');
          const targetColumns = targetDb.pragma('table_info(manga_series)').map(col => col.name).filter(name => name !== 'id');

          console.log(`  📊 ${file} - Source: ${sourceColumns.length} colonnes, Destination: ${targetColumns.length} colonnes`);

          // Utiliser seulement les colonnes communes (colonnes qui existent dans les deux tables)
          // ET exclure les colonnes utilisateur
          const commonColumns = sourceColumns.filter(col =>
            targetColumns.includes(col) && !mangaExcludeColumns.includes(col)
          );

          // Vérifier que nous avons bien des colonnes communes
          if (commonColumns.length === 0) {
            console.warn(`  ⚠️ Aucune colonne commune trouvée pour la table manga_series entre ${file} et la base cible`);
            return;
          }

          console.log(`  📊 ${file} - Colonnes communes: ${commonColumns.length}`);

          // Vérifier que titre et mal_id sont disponibles pour la vérification des doublons
          const hasTitre = commonColumns.includes('titre');
          const hasMalId = commonColumns.includes('mal_id');
          const hasTitreAlternatif = commonColumns.includes('titre_alternatif');
          const hasTitreOriginal = commonColumns.includes('titre_original');

          if (!hasTitre && !hasMalId) {
            console.warn(`  ⚠️ Impossible de vérifier les doublons pour ${file}: ni titre ni mal_id ne sont disponibles`);
            return;
          }

          // Construire la requête SELECT avec seulement les colonnes communes
          // Utiliser des guillemets pour protéger les noms de colonnes
          const selectColumns = commonColumns.map(col => `"${col}"`).join(', ');
          let manga_series = [];
          try {
            manga_series = userDb.prepare(`SELECT ${selectColumns} FROM manga_series`).all();
          } catch (selectError) {
            console.error(`  ❌ Erreur lors de la sélection des séries depuis ${file}:`, selectError.message);
            console.error(`    → Colonnes demandées: ${selectColumns}`);
            throw selectError; // Re-lancer pour être capturé par le catch global
          }

          // Fonction helper pour extraire tous les titres normalisés d'une série (utilise normalizeTitle existant)
          const extractAllTitlesNormalized = (serie) => {
            const titles = new Set();

            // Titre principal
            if (serie.titre) {
              const titreParts = String(serie.titre).split(/[\/|]+/).map(t => normalizeTitle(t.trim())).filter(Boolean);
              titreParts.forEach(t => titles.add(t));
            }

            // Titre alternatif
            if (serie.titre_alternatif) {
              const altParts = String(serie.titre_alternatif).split(/[\/|]+/).map(t => normalizeTitle(t.trim())).filter(Boolean);
              altParts.forEach(t => titles.add(t));
            }

            // Titre original (important pour la détection des doublons)
            if (serie.titre_original) {
              const origParts = String(serie.titre_original).split(/[\/|]+/).map(t => normalizeTitle(t.trim())).filter(Boolean);
              origParts.forEach(t => titles.add(t));
            }

            return Array.from(titles);
          };

          manga_series.forEach((serie, index) => {
            try {
              // Vérifier par titre, mal_id, titre_alternatif ou titre_original pour éviter les doublons
              const serieTitre = hasTitre ? serie.titre : null;
              const serieMalId = hasMalId ? serie.mal_id : null;
              const serieTitreAlternatif = hasTitreAlternatif ? serie.titre_alternatif : null;
              const serieTitreOriginal = hasTitreOriginal ? serie.titre_original : null;

              let existing = null;

              // D'abord essayer par mal_id (le plus fiable)
              if (hasMalId && serieMalId) {
                existing = targetDb.prepare('SELECT id FROM manga_series WHERE mal_id = ?').get(serieMalId);
              }

              // Sinon, chercher par titre
              if (!existing && hasTitre && serieTitre) {
                existing = targetDb.prepare('SELECT id FROM manga_series WHERE titre = ?').get(serieTitre);
              }

              // Si pas trouvé, chercher dans titre_alternatif et titre_original (avec normalisation)
              if (!existing) {
                // Extraire tous les titres normalisés de la série source
                const sourceTitles = extractAllTitlesNormalized(serie);

                if (sourceTitles.length > 0) {
                  // Chercher dans toutes les séries de la base cible
                  const allTargetSeries = targetDb.prepare('SELECT id, titre, titre_alternatif, titre_original FROM manga_series').all();

                  for (const targetSerie of allTargetSeries) {
                    const targetTitles = extractAllTitlesNormalized(targetSerie);
                    // Vérifier si au moins un titre normalisé correspond exactement
                    const hasMatch = sourceTitles.some(sourceTitle =>
                      targetTitles.some(targetTitle => sourceTitle === targetTitle)
                    );
                    if (hasMatch) {
                      existing = { id: targetSerie.id };
                      break;
                    }
                  }
                }
              }

              if (existing) {
                // Série existante : fusionner selon la priorité configurée
                const existingSerie = targetDb.prepare('SELECT * FROM manga_series WHERE id = ?').get(existing.id);
                const updateFields = [];
                const updateValues = [];

                // Récupérer source_donnees pour les deux séries
                const sourceSourceDonnees = serie.source_donnees || null;
                const targetSourceDonnees = existingSerie.source_donnees || null;

                // Fonction helper pour déterminer quelle valeur utiliser selon la priorité
                const preferValue = (sourceValue, targetValue, sourceUpdatedAt, targetUpdatedAt, columnName) => {
                  // PRIORITÉ 1 : Les données avec source_donnees='nautiljon' ou 'mal+nautiljon' ont toujours la priorité
                  const sourceIsNautiljon = sourceSourceDonnees === 'nautiljon' || sourceSourceDonnees === 'mal+nautiljon';
                  const targetIsNautiljon = targetSourceDonnees === 'nautiljon' || targetSourceDonnees === 'mal+nautiljon';

                  if (sourceIsNautiljon && !targetIsNautiljon) {
                    // Source = Nautiljon, Target ≠ Nautiljon → Source a priorité
                    return sourceValue !== undefined && sourceValue !== null ? sourceValue : targetValue;
                  } else if (!sourceIsNautiljon && targetIsNautiljon) {
                    // Source ≠ Nautiljon, Target = Nautiljon → Target a priorité
                    return targetValue !== undefined && targetValue !== null ? targetValue : sourceValue;
                  } else if (sourceIsNautiljon && targetIsNautiljon) {
                    // Les deux sont Nautiljon → utiliser la logique de priorité normale
                    // (continue avec la logique ci-dessous)
                  }
                  // Si aucun n'est Nautiljon, continuer avec la logique normale

                  // PRIORITÉ 2 : Logique de fusion normale selon mergePriority
                  if (mergePriority === 'current-user') {
                    // La base cible (utilisateur actuel) a toujours la priorité
                    return targetValue !== undefined && targetValue !== null ? targetValue : sourceValue;
                  } else if (mergePriority === 'source') {
                    // La source (base téléchargée) a toujours la priorité
                    return sourceValue !== undefined && sourceValue !== null ? sourceValue : targetValue;
                  } else if (mergePriority === 'newest') {
                    // Les données les plus récentes ont la priorité
                    const sourceTime = sourceUpdatedAt ? new Date(sourceUpdatedAt).getTime() : 0;
                    const targetTime = targetUpdatedAt ? new Date(targetUpdatedAt).getTime() : 0;
                    return sourceTime > targetTime ? sourceValue : targetValue;
                  } else if (mergePriority === 'oldest') {
                    // Les données les plus anciennes ont la priorité
                    const sourceTime = sourceUpdatedAt ? new Date(sourceUpdatedAt).getTime() : Infinity;
                    const targetTime = targetUpdatedAt ? new Date(targetUpdatedAt).getTime() : Infinity;
                    return sourceTime < targetTime ? sourceValue : targetValue;
                  }
                  // Par défaut, préférer la cible (current-user)
                  return targetValue !== undefined && targetValue !== null ? targetValue : sourceValue;
                };

                const sourceUpdatedAt = serie.updated_at || null;
                const targetUpdatedAt = existingSerie.updated_at || null;

                commonColumns.forEach(col => {
                  // Exclure les colonnes utilisateur et les colonnes de métadonnées
                  if (col === 'id' || col === 'created_at' || col === 'updated_at') {
                    return;
                  }

                  const sourceValue = serie[col] !== undefined ? serie[col] : null;
                  const targetValue = existingSerie[col] !== undefined ? existingSerie[col] : null;

                  // Déterminer la valeur à utiliser selon la priorité
                  const finalValue = preferValue(sourceValue, targetValue, sourceUpdatedAt, targetUpdatedAt, col);

                  // Ne mettre à jour que si la valeur finale est différente de la valeur cible
                  // et qu'elle n'est pas null/undefined
                  if (finalValue !== undefined && finalValue !== null && finalValue !== targetValue) {
                    updateFields.push(`"${col}" = ?`);
                    updateValues.push(finalValue);
                  }
                });

                // Toujours mettre à jour updated_at avec la date actuelle
                if (updateFields.length > 0) {
                  updateFields.push(`"updated_at" = datetime('now')`);
                  updateValues.push(existing.id);
                  const updateSql = `UPDATE manga_series SET ${updateFields.join(', ')} WHERE id = ?`;
                  targetDb.prepare(updateSql).run(...updateValues);
                  // Ne pas compter les updates, seulement les nouveaux inserts
                }
              } else {
                // Nouvelle série : l'insérer
                const placeholders = commonColumns.map(() => '?').join(', ');
                // Extraire les valeurs dans le même ordre que commonColumns
                const values = commonColumns.map(col => {
                  const value = serie[col];
                  // Gérer les valeurs undefined/null correctement
                  return value !== undefined && value !== null ? value : null;
                });

                // Vérifier que le nombre de valeurs correspond au nombre de colonnes
                if (values.length !== commonColumns.length) {
                  console.warn(`  ⚠️ [${file}] Série ${index + 1}/${manga_series.length}: Nombre de valeurs (${values.length}) ne correspond pas au nombre de colonnes (${commonColumns.length})`);
                  console.warn(`    → Titre: "${serieTitre || 'sans titre'}"`);
                  return;
                }

                // Utiliser des guillemets pour protéger les noms de colonnes dans l'INSERT
                const quotedColumns = commonColumns.map(col => `"${col}"`).join(', ');
                const insertSerie = targetDb.prepare(`
                  INSERT INTO manga_series (${quotedColumns})
                  VALUES (${placeholders})
                `);
                insertSerie.run(...values);
                manga_seriesCount++;
              }
            } catch (insertError) {
              console.warn(`  ⚠️ [${file}] Erreur insertion série ${index + 1}/${manga_series.length}:`, insertError.message);
              // Si l'erreur est "X values for Y columns", logger plus de détails
              if (insertError.message.includes('values for') && insertError.message.includes('columns')) {
                console.warn(`    → Colonnes communes: ${commonColumns.length}, Valeurs extraites: ${commonColumns.map(col => serie[col] !== undefined ? '✓' : '✗').join(' ')}`);
                console.warn(`    → Colonnes: ${commonColumns.join(', ')}`);
              }
            }
          });

          // === FUSION DES MANGA TOMES ===
          // Récupérer les colonnes de la source et de la destination
          const tomeSourceColumns = userDb.pragma('table_info(manga_tomes)').map(col => col.name).filter(name => name !== 'id');
          const tomeTargetColumns = targetDb.pragma('table_info(manga_tomes)').map(col => col.name).filter(name => name !== 'id');

          // Utiliser seulement les colonnes communes (toutes les colonnes sont générales, y compris date_achat pour partager les coûts)
          const tomeCommonColumns = tomeSourceColumns.filter(col => tomeTargetColumns.includes(col));

          if (tomeCommonColumns.length > 0) {
            // Vérifier si la colonne updated_at existe dans la table manga_tomes
            const tomeColumns = userDb.prepare('PRAGMA table_info(manga_tomes)').all();
            const hasUpdatedAt = tomeColumns.some(col => col.name === 'updated_at');

            const tomeSelectColumns = tomeCommonColumns.map(col => `"${col}"`).join(', ');
            let manga_tomes = [];
            try {
              manga_tomes = userDb.prepare(`SELECT ${tomeSelectColumns} FROM manga_tomes`).all();
            } catch (selectError) {
              console.warn(`  ⚠️ Erreur sélection manga_tomes depuis ${file}:`, selectError.message);
              // Continuer même en cas d'erreur
              manga_tomes = [];
            }

            manga_tomes.forEach(tome => {
              try {
                // Trouver la série correspondante dans la base de destination
                const sourceSerie = userDb.prepare('SELECT titre, mal_id FROM manga_series WHERE id = ?').get(tome.serie_id);
                if (!sourceSerie) {
                  return; // Série source introuvable, skip ce tome
                }

                const targetSerie = targetDb.prepare('SELECT id FROM manga_series WHERE titre = ? OR mal_id = ?').get(sourceSerie.titre, sourceSerie.mal_id || -1);
                if (!targetSerie) {
                  return; // Série cible introuvable, skip ce tome
                }

                // Vérifier si le tome existe déjà (par serie_id + numero)
                const existing = targetDb.prepare('SELECT id FROM manga_tomes WHERE serie_id = ? AND numero = ?').get(targetSerie.id, tome.numero);

                if (existing) {
                  // Tome existant : fusionner selon la priorité configurée (y compris date_achat pour partager les coûts)
                  const existingTome = targetDb.prepare('SELECT * FROM manga_tomes WHERE id = ?').get(existing.id);
                  const updateFields = [];
                  const updateValues = [];

                  // Fonction helper pour déterminer quelle valeur utiliser selon la priorité
                  const preferValue = (sourceValue, targetValue, sourceUpdatedAt, targetUpdatedAt) => {
                    if (mergePriority === 'current-user') {
                      return targetValue !== undefined && targetValue !== null ? targetValue : sourceValue;
                    } else if (mergePriority === 'source') {
                      return sourceValue !== undefined && sourceValue !== null ? sourceValue : targetValue;
                    } else if (mergePriority === 'newest') {
                      const sourceTime = sourceUpdatedAt ? new Date(sourceUpdatedAt).getTime() : 0;
                      const targetTime = targetUpdatedAt ? new Date(targetUpdatedAt).getTime() : 0;
                      return sourceTime > targetTime ? sourceValue : targetValue;
                    } else if (mergePriority === 'oldest') {
                      const sourceTime = sourceUpdatedAt ? new Date(sourceUpdatedAt).getTime() : Infinity;
                      const targetTime = targetUpdatedAt ? new Date(targetUpdatedAt).getTime() : Infinity;
                      return sourceTime < targetTime ? sourceValue : targetValue;
                    }
                    return targetValue !== undefined && targetValue !== null ? targetValue : sourceValue;
                  };

                  // Vérifier si la colonne updated_at existe avant de l'utiliser
                  const sourceUpdatedAt = hasUpdatedAt && (tome.updated_at !== undefined) ? tome.updated_at : null;
                  const targetUpdatedAt = hasUpdatedAt && (existingTome.updated_at !== undefined) ? existingTome.updated_at : null;

                  // Mapper serie_id vers le nouvel ID de la série cible
                  if (tomeCommonColumns.includes('serie_id')) {
                    updateFields.push(`"serie_id" = ?`);
                    updateValues.push(targetSerie.id);
                  }

                  // Mettre à jour les autres colonnes (sauf id) avec priorité
                  tomeCommonColumns.forEach(col => {
                    // Exclure les colonnes de métadonnées
                    if (col === 'id' || col === 'created_at' || col === 'updated_at' || col === 'serie_id') {
                      return;
                    }

                    const sourceValue = tome[col] !== undefined ? tome[col] : null;
                    const targetValue = existingTome[col] !== undefined ? existingTome[col] : null;

                    // Déterminer la valeur à utiliser selon la priorité
                    const finalValue = preferValue(sourceValue, targetValue, sourceUpdatedAt, targetUpdatedAt);

                    // Ne mettre à jour que si la valeur finale est différente de la valeur cible
                    // Inclure date_achat pour partager les informations d'achat
                    if (finalValue !== undefined && finalValue !== null && finalValue !== targetValue) {
                      updateFields.push(`"${col}" = ?`);
                      updateValues.push(finalValue);
                    }
                  });

                  if (updateFields.length > 0) {
                    updateFields.push(`updated_at = datetime('now')`);
                    updateValues.push(existing.id);
                    const updateSql = `UPDATE manga_tomes SET ${updateFields.join(', ')} WHERE id = ?`;
                    targetDb.prepare(updateSql).run(...updateValues);
                    // Ne pas compter les updates, seulement les nouveaux inserts
                  }
                } else {
                  // Nouveau tome : l'insérer
                  const insertColumns = tomeCommonColumns.map(col => col === 'serie_id' ? 'serie_id' : col);
                  const quotedInsertColumns = insertColumns.map(col => `"${col}"`).join(', ');
                  const placeholders = insertColumns.map(() => '?').join(', ');
                  const values = insertColumns.map(col => {
                    if (col === 'serie_id') {
                      return targetSerie.id; // Utiliser l'ID de la série cible
                    }
                    const value = tome[col];
                    return value !== undefined && value !== null ? value : null;
                  });

                  try {
                    const insertTome = targetDb.prepare(`
                      INSERT INTO manga_tomes (${quotedInsertColumns})
                      VALUES (${placeholders})
                  `);
                    insertTome.run(...values);
                    manga_tomesCount++;
                  } catch (insertError) {
                    // Si erreur UNIQUE, c'est normal (tome existe déjà)
                    if (!insertError.message.includes('UNIQUE constraint')) {
                      console.warn(`  ⚠️ Erreur insertion tome ${tome.numero}:`, insertError.message);
                    }
                  }
                }
              } catch (tomeError) {
                console.warn(`  ⚠️ Erreur traitement tome:`, tomeError.message);
              }
            });
          }

          // === FUSION DES MANGA TOMES PROPRIETAIRES ===
          // Fusionner les propriétaires pour partager les informations de coûts entre utilisateurs
          try {
            // Vérifier que la table existe dans les deux bases
            const sourcePropColumns = userDb.pragma('table_info(manga_manga_tomes_proprietaires)').map(col => col.name).filter(name => name !== 'id');
            const targetPropColumns = targetDb.pragma('table_info(manga_manga_tomes_proprietaires)').map(col => col.name).filter(name => name !== 'id');
            const propCommonColumns = sourcePropColumns.filter(col => targetPropColumns.includes(col));

            // Vérifier que les colonnes essentielles existent
            if (propCommonColumns.includes('serie_id') && propCommonColumns.includes('tome_id') && propCommonColumns.includes('user_id')) {
              const propSelectColumns = propCommonColumns.map(col => `"${col}"`).join(', ');
              const proprietaires = userDb.prepare(`SELECT ${propSelectColumns} FROM manga_manga_tomes_proprietaires`).all();

              proprietaires.forEach(proprietaire => {
                try {
                  // Trouver les IDs correspondants dans la base cible
                  // 1. Trouver la série (par titre ou mal_id)
                  const sourceSerie = userDb.prepare('SELECT titre, mal_id FROM manga_series WHERE id = ?').get(proprietaire.serie_id);
                  if (!sourceSerie) {
                    return; // Série source introuvable
                  }

                  const targetSerie = targetDb.prepare('SELECT id FROM manga_series WHERE titre = ? OR mal_id = ?').get(sourceSerie.titre, sourceSerie.mal_id || -1);
                  if (!targetSerie) {
                    return; // Série cible introuvable
                  }

                  // 2. Trouver le tome (par numero dans la série)
                  const sourceTome = userDb.prepare('SELECT numero FROM manga_tomes WHERE id = ?').get(proprietaire.tome_id);
                  if (!sourceTome) {
                    return; // Tome source introuvable
                  }

                  const targetTome = targetDb.prepare('SELECT id FROM manga_tomes WHERE serie_id = ? AND numero = ?').get(targetSerie.id, sourceTome.numero);
                  if (!targetTome) {
                    return; // Tome cible introuvable
                  }

                  // 3. Trouver l'utilisateur (par name via la table users)
                  const sourceUser = userDb.prepare('SELECT name FROM users WHERE id = ?').get(proprietaire.user_id);
                  if (!sourceUser) {
                    return; // Utilisateur source introuvable
                  }

                  const targetUser = targetDb.prepare('SELECT id FROM users WHERE name = ?').get(sourceUser.name);
                  if (!targetUser) {
                    return; // Utilisateur cible introuvable (sera créé lors de la fusion des users)
                  }

                  // Vérifier si cette relation existe déjà (UNIQUE(tome_id, user_id))
                  const existing = targetDb.prepare(`
                    SELECT id FROM manga_manga_tomes_proprietaires 
                    WHERE tome_id = ? AND user_id = ?
                  `).get(targetTome.id, targetUser.id);

                  if (!existing) {
                    // Construire les colonnes et valeurs pour l'INSERT
                    const insertColumns = ['serie_id', 'tome_id', 'user_id'];
                    const insertValues = [targetSerie.id, targetTome.id, targetUser.id];

                    // Ajouter created_at et updated_at si présents
                    if (propCommonColumns.includes('created_at')) {
                      insertColumns.push('created_at');
                      insertValues.push(proprietaire.created_at || new Date().toISOString());
                    }
                    if (propCommonColumns.includes('updated_at')) {
                      insertColumns.push('updated_at');
                      insertValues.push(proprietaire.updated_at || new Date().toISOString());
                    }

                    const quotedInsertColumns = insertColumns.map(col => `"${col}"`).join(', ');
                    const placeholders = insertColumns.map(() => '?').join(', ');

                    // Insérer la nouvelle relation
                    targetDb.prepare(`
                      INSERT INTO manga_manga_tomes_proprietaires (${quotedInsertColumns})
                      VALUES (${placeholders})
                    `).run(...insertValues);
                  }
                  // Si existant, ne rien faire (relation déjà présente)
                } catch (propError) {
                  console.warn(`  ⚠️ Erreur fusion propriétaire tome:`, propError.message);
                }
              });
            }
          } catch (proprietairesError) {
            console.warn(`  ⚠️ Erreur fusion manga_manga_tomes_proprietaires depuis ${file}:`, proprietairesError.message);
          }

          // === FUSION DES ANIMES ===
          // Récupérer les colonnes de la source et de la destination
          const animeSourceColumns = userDb.pragma('table_info(anime_series)').map(col => col.name).filter(name => name !== 'id');
          const animeTargetColumns = targetDb.pragma('table_info(anime_series)').map(col => col.name).filter(name => name !== 'id');

          // Utiliser seulement les colonnes communes
          const animeCommonColumns = animeSourceColumns.filter(col => animeTargetColumns.includes(col));

          // Initialiser animes avant le if pour qu'il soit accessible après
          let animes = [];

          // Vérifier que nous avons bien des colonnes communes
          if (animeCommonColumns.length === 0) {
            console.warn(`  ⚠️ Aucune colonne commune trouvée pour la table anime_series entre ${file} et la base cible`);
          } else {
            // Construire la requête SELECT avec seulement les colonnes communes
            const animeSelectColumns = animeCommonColumns.map(col => `"${col}"`).join(', ');
            try {
              animes = userDb.prepare(`SELECT ${animeSelectColumns} FROM anime_series`).all();
            } catch (selectError) {
              console.error(`  ❌ Erreur lors de la sélection des animes depuis ${file}:`, selectError.message);
              console.error(`    → Colonnes demandées: ${animeSelectColumns}`);
              throw selectError;
            }

            // Vérifier que mal_id ou titre sont disponibles pour la vérification des doublons
            const hasAnimeMalId = animeCommonColumns.includes('mal_id');
            const hasAnimeTitre = animeCommonColumns.includes('titre');

            animes.forEach((anime, index) => {
              try {
                // Vérifier par mal_id, anilist_id ou titre pour trouver les doublons
                const animeMalId = hasAnimeMalId && animeCommonColumns.includes('mal_id') ? anime.mal_id : null;
                const animeAnilistId = animeCommonColumns.includes('anilist_id') ? anime.anilist_id : null;
                const animeTitre = hasAnimeTitre ? anime.titre : null;

                let existing = null;
                if (animeMalId) {
                  // Si mal_id existe, vérifier par mal_id (plus fiable)
                  existing = targetDb.prepare('SELECT id FROM anime_series WHERE mal_id = ?').get(animeMalId);
                } else if (animeAnilistId) {
                  // Sinon, vérifier par anilist_id
                  existing = targetDb.prepare('SELECT id FROM anime_series WHERE anilist_id = ?').get(animeAnilistId);
                } else if (animeTitre) {
                  // En dernier recours, vérifier par titre
                  existing = targetDb.prepare('SELECT id FROM anime_series WHERE titre = ?').get(animeTitre);
                }

                if (existing) {
                  // UPDATE existing anime (toutes les colonnes sont générales, donc tout est fusionné)
                  const updateFields = [];
                  const updateValues = [];

                  animeCommonColumns.forEach(col => {
                    const value = anime[col] !== undefined ? anime[col] : null;
                    if (value !== undefined && value !== null) {
                      updateFields.push(`"${col}" = ?`);
                      updateValues.push(value);
                    }
                  });

                  updateFields.push(`updated_at = datetime('now')`);
                  if (updateFields.length > 1) { // Plus que updated_at
                    updateValues.push(existing.id);
                    const updateAnime = targetDb.prepare(`
                      UPDATE anime_series SET ${updateFields.join(', ')} WHERE id = ?
                    `);
                    updateAnime.run(...updateValues);
                  }
                } else {
                  // INSERT new anime
                  const placeholders = animeCommonColumns.map(() => '?').join(', ');
                  // Extraire les valeurs dans le même ordre que animeCommonColumns
                  const values = animeCommonColumns.map(col => {
                    const value = anime[col] !== undefined ? anime[col] : null;
                    // Gérer les valeurs undefined/null correctement
                    return value !== undefined && value !== null ? value : null;
                  });

                  // Vérifier que le nombre de valeurs correspond au nombre de colonnes
                  if (values.length !== animeCommonColumns.length) {
                    console.warn(`  ⚠️ [${file}] Anime ${index + 1}/${animes.length}: Nombre de valeurs (${values.length}) ne correspond pas au nombre de colonnes (${animeCommonColumns.length})`);
                    return;
                  }

                  // Utiliser des guillemets pour protéger les noms de colonnes dans l'INSERT
                  const quotedAnimeColumns = animeCommonColumns.map(col => `"${col}"`).join(', ');
                  try {
                    const insertAnime = targetDb.prepare(`
                      INSERT INTO anime_series (${quotedAnimeColumns})
                      VALUES (${placeholders})
                    `);
                    insertAnime.run(...values);
                    animesCount++;
                  } catch (insertError) {
                    // Si l'erreur est une contrainte UNIQUE, c'est normal (doublon)
                    if (insertError.message.includes('UNIQUE constraint')) {
                      // Ignorer silencieusement, c'est un doublon
                      return;
                    }
                    // Sinon, re-lancer l'erreur pour qu'elle soit capturée par le catch externe
                    throw insertError;
                  }
                }
              } catch (error) {
                console.warn(`  ⚠️ [${file}] Erreur fusion anime ${index + 1}/${animes.length}:`, error.message);
                // Si l'erreur est "X values for Y columns", logger plus de détails
                if (error.message.includes('values for') && error.message.includes('columns')) {
                  console.warn(`    → Colonnes communes: ${animeCommonColumns.length}, Valeurs extraites: ${animeCommonColumns.map(col => anime[col] !== undefined ? '✓' : '✗').join(' ')}`);
                  console.warn(`    → Colonnes: ${animeCommonColumns.join(', ')}`);
                }
              }
            });
          }

          // === FUSION DES JEUX ADULTES ===
          // Récupérer les colonnes disponibles dans la source
          const gameSourceColumns = userDb.pragma('table_info(adulte_game_games)').map(col => col.name).filter(name => name !== 'id');
          const gameTargetColumns = targetDb.pragma('table_info(adulte_game_games)').map(col => col.name).filter(name => name !== 'id');

          // Utiliser seulement les colonnes communes
          const gameCommonColumns = gameSourceColumns.filter(col => gameTargetColumns.includes(col));

          // Sélectionner seulement les colonnes qui existent
          const gameSelectColumns = gameCommonColumns.map(col => `"${col}"`).join(', ');
          let games = [];
          try {
            games = userDb.prepare(`SELECT ${gameSelectColumns} FROM adulte_game_games`).all();
          } catch (selectError) {
            console.error(`  ❌ Erreur lors de la sélection des jeux depuis ${file}:`, selectError.message);
            throw selectError;
          }

          games.forEach(game => {
            // Normaliser game_site (gérer ancien et nouveau schéma)
            // Vérifier d'abord si la colonne existe dans l'objet game avant d'y accéder
            const gameSite = (game.game_site !== undefined ? game.game_site : null) ||
              (game.plateforme !== undefined ? game.plateforme : null) ||
              'F95Zone';
            const f95Id = game.f95_thread_id;
            const lewdcornerId = game.Lewdcorner_thread_id;
            const rawgId = game.rawg_id;

            // Normaliser les valeurs depuis l'ancien schéma si nécessaire
            const gameVersion = game.game_version || game.version || null;
            const gameStatut = game.game_statut || game.statut_jeu || null;
            const gameEngine = game.game_engine || game.moteur || null;
            const gameDeveloper = game.game_developer || game.developer || null;

            // Chercher le jeu existant
            let existing = null;

            // Pour les jeux RAWG, chercher par rawg_id
            if (rawgId && gameSite === 'RAWG') {
              existing = targetDb.prepare(`
                SELECT id FROM adulte_game_games 
                WHERE rawg_id = ? AND game_site = 'RAWG'
              `).get(rawgId);
            }

            // Pour les jeux F95Zone/LewdCorner, chercher par f95_thread_id + game_site
            if (!existing && f95Id) {
              // Vérifier d'abord par game_site (nouveau schéma)
              existing = targetDb.prepare(`
                SELECT id FROM adulte_game_games 
                WHERE f95_thread_id = ? AND game_site = ?
              `).get(f95Id, gameSite);
              // Fallback pour l'ancien schéma (si plateforme existe dans la cible)
              if (!existing && gameTargetColumns.includes('plateforme')) {
                existing = targetDb.prepare(`
                  SELECT id FROM adulte_game_games 
                  WHERE f95_thread_id = ? AND plateforme = ?
              `).get(f95Id, gameSite);
              }
            }
            // Si pas trouvé, chercher par Lewdcorner_thread_id + game_site
            if (!existing && lewdcornerId) {
              existing = targetDb.prepare(`
                SELECT id FROM adulte_game_games 
                WHERE Lewdcorner_thread_id = ? AND game_site = ?
              `).get(lewdcornerId, gameSite);
              // Fallback pour l'ancien schéma
              if (!existing && gameTargetColumns.includes('plateforme')) {
                existing = targetDb.prepare(`
                SELECT id FROM adulte_game_games 
                  WHERE Lewdcorner_thread_id = ? AND plateforme = ?
                `).get(lewdcornerId, gameSite);
              }
            }

            // Colonnes générales à fusionner (exclure les données utilisateur)
            // Utiliser gameCommonColumns qui contient déjà les colonnes communes
            const generalColumnsToMerge = [
              'titre', 'game_version', 'game_statut', 'game_engine', 'game_developer', 'game_site',
              'couverture_url', 'tags', 'lien_f95', 'lien_lewdcorner',
              'f95_thread_id', 'Lewdcorner_thread_id',
              'statut_traduction', 'type_traduction', 'traduction_fr_disponible',
              'version_traduite', 'traducteur', 'derniere_sync_trad', 'traductions_multiples',
              'maj_disponible', 'derniere_verif',
              'rawg_id', 'rawg_rating', 'rawg_released', 'rawg_platforms', 'rawg_description', 'rawg_website', 'esrb_rating'
            ];

            // Ajouter les anciennes colonnes pour le mapping
            const oldColumnNames = ['version', 'statut_jeu', 'moteur', 'developer', 'plateforme'];

            // Filtrer pour garder seulement les colonnes qui existent dans les deux tables
            const columnsToMerge = generalColumnsToMerge.filter(col => {
              // Vérifier si la colonne existe dans les colonnes communes (qui existent dans les deux tables)
              return gameCommonColumns.includes(col);
            });

            // Ajouter aussi les anciennes colonnes si elles existent dans les deux tables
            const oldColumnsToMerge = oldColumnNames.filter(col => {
              return gameCommonColumns.includes(col) && !columnsToMerge.includes(col);
            });

            if (existing) {
              // Jeu existant : mettre à jour les données générales
              const updateFields = [];
              const updateValues = [];

              columnsToMerge.forEach(col => {
                // Vérifier si la colonne existe dans game (vérifier existence avant accès)
                let value = game[col] !== undefined ? game[col] : null;

                // Normaliser game_site si nécessaire (vérifier existence de plateforme avant accès)
                if (col === 'game_site') {
                  const plateformeValue = game.plateforme !== undefined ? game.plateforme : null;
                  value = value || plateformeValue || 'F95Zone';
                }

                // Ne mettre à jour que si la valeur existe et est non-null
                if (value !== undefined && value !== null) {
                  updateFields.push(`"${col}" = ?`);
                  updateValues.push(value);
                }
              });

              // Gérer le mapping des anciennes colonnes vers les nouvelles (si elles existent dans la source mais pas dans columnsToMerge)
              if (gameCommonColumns.includes('version') && !columnsToMerge.includes('game_version')) {
                const versionValue = game.version !== undefined ? game.version : null;
                if (versionValue !== null && gameTargetColumns.includes('game_version')) {
                  updateFields.push(`"game_version" = ?`);
                  updateValues.push(versionValue);
                }
              }
              if (gameCommonColumns.includes('statut_jeu') && !columnsToMerge.includes('game_statut')) {
                const statutValue = game.statut_jeu !== undefined ? game.statut_jeu : null;
                if (statutValue !== null && gameTargetColumns.includes('game_statut')) {
                  updateFields.push(`"game_statut" = ?`);
                  updateValues.push(statutValue);
                }
              }
              if (gameCommonColumns.includes('moteur') && !columnsToMerge.includes('game_engine')) {
                const engineValue = game.moteur !== undefined ? game.moteur : null;
                if (engineValue !== null && gameTargetColumns.includes('game_engine')) {
                  updateFields.push(`"game_engine" = ?`);
                  updateValues.push(engineValue);
                }
              }
              if (gameCommonColumns.includes('developer') && !columnsToMerge.includes('game_developer')) {
                const devValue = game.developer !== undefined ? game.developer : null;
                if (devValue !== null && gameTargetColumns.includes('game_developer')) {
                  updateFields.push(`"game_developer" = ?`);
                  updateValues.push(devValue);
                }
              }
              if (gameCommonColumns.includes('plateforme') && !columnsToMerge.includes('game_site')) {
                const platformValue = game.plateforme !== undefined ? game.plateforme : null;
                if (platformValue !== null && gameTargetColumns.includes('game_site')) {
                  updateFields.push(`"game_site" = ?`);
                  updateValues.push(platformValue || 'F95Zone');
                }
              }

              // Toujours mettre à jour updated_at
              updateFields.push(`updated_at = datetime('now')`);

              if (updateFields.length > 1) { // Plus que updated_at
                updateValues.push(existing.id);
                const updateSql = `UPDATE adulte_game_games SET ${updateFields.join(', ')} WHERE id = ?`;
                targetDb.prepare(updateSql).run(...updateValues);
              }
            } else {
              // Nouveau jeu : l'insérer
              const insertColumns = [];
              const insertValues = [];

              columnsToMerge.forEach(col => {
                // Vérifier si la colonne existe dans game
                let value = game[col] !== undefined ? game[col] : null;

                // Normaliser game_site si nécessaire (vérifier existence de plateforme avant accès)
                if (col === 'game_site') {
                  const plateformeValue = game.plateforme !== undefined ? game.plateforme : null;
                  value = value || plateformeValue || 'F95Zone';
                }

                // Inclure la colonne si elle existe dans les colonnes communes
                if (gameCommonColumns.includes(col)) {
                  insertColumns.push(col);
                  insertValues.push(value !== undefined ? value : null);
                }
              });

              // Mapper les anciennes colonnes vers les nouvelles pour l'insertion
              const columnMapping = {
                'version': 'game_version',
                'statut_jeu': 'game_statut',
                'moteur': 'game_engine',
                'developer': 'game_developer',
                'plateforme': 'game_site'
              };

              Object.entries(columnMapping).forEach(([oldCol, newCol]) => {
                // Si l'ancienne colonne existe dans la source mais pas la nouvelle
                if (gameCommonColumns.includes(oldCol) && !insertColumns.includes(newCol) && gameTargetColumns.includes(newCol)) {
                  const oldValue = game[oldCol] !== undefined ? game[oldCol] : null;
                  if (oldValue !== null || oldCol === 'plateforme') {
                    insertColumns.push(newCol);
                    insertValues.push(oldCol === 'plateforme' ? (oldValue || 'F95Zone') : oldValue);
                  }
                }
              });

              if (insertColumns.length > 0) {
                const placeholders = insertColumns.map(() => '?').join(', ');
                const insertSql = `INSERT OR IGNORE INTO adulte_game_games (${insertColumns.join(', ')}) VALUES (${placeholders})`;
                const result = targetDb.prepare(insertSql).run(...insertValues);
                if (result.changes > 0) {
                  gamesCount++;
                }
              }
            }
          });

          // === FUSION DES JEUX ADULTES PROPRIETAIRES ===
          // Fusionner les propriétaires pour partager les informations de coûts entre utilisateurs
          try {
            const propSourceColumns = userDb.pragma('table_info(adulte_game_proprietaires)').map(col => col.name).filter(name => name !== 'id');
            const propTargetColumns = targetDb.pragma('table_info(adulte_game_proprietaires)').map(col => col.name).filter(name => name !== 'id');
            const propCommonColumns = propSourceColumns.filter(col => propTargetColumns.includes(col));

            if (propCommonColumns.includes('game_id') && propCommonColumns.includes('user_id')) {
              const propSelectColumns = propCommonColumns.map(col => `"${col}"`).join(', ');
              const proprietaires = userDb.prepare(`SELECT ${propSelectColumns} FROM adulte_game_proprietaires`).all();

              proprietaires.forEach(proprietaire => {
                try {
                  // Trouver le jeu correspondant dans la base de destination
                  const sourceGame = userDb.prepare('SELECT f95_thread_id, Lewdcorner_thread_id, game_site FROM adulte_game_games WHERE id = ?').get(proprietaire.game_id);
                  if (!sourceGame) return;

                  // Chercher le jeu dans la base cible
                  let targetGame = null;
                  if (sourceGame.f95_thread_id) {
                    targetGame = targetDb.prepare('SELECT id FROM adulte_game_games WHERE f95_thread_id = ? AND (game_site = ? OR plateforme = ?)').get(sourceGame.f95_thread_id, sourceGame.game_site || 'F95Zone', sourceGame.game_site || 'F95Zone');
                  }
                  if (!targetGame && sourceGame.Lewdcorner_thread_id) {
                    targetGame = targetDb.prepare('SELECT id FROM adulte_game_games WHERE Lewdcorner_thread_id = ? AND (game_site = ? OR plateforme = ?)').get(sourceGame.Lewdcorner_thread_id, sourceGame.game_site || 'LewdCorner', sourceGame.game_site || 'LewdCorner');
                  }

                  if (!targetGame) return;

                  // Trouver l'utilisateur correspondant
                  const sourceUser = userDb.prepare('SELECT name FROM users WHERE id = ?').get(proprietaire.user_id);
                  if (!sourceUser) return;
                  const targetUser = targetDb.prepare('SELECT id FROM users WHERE name = ?').get(sourceUser.name);
                  if (!targetUser) return;

                  // Vérifier si la propriété existe déjà (par game_id + user_id, car UNIQUE(game_id, user_id))
                  const existing = targetDb.prepare('SELECT id FROM adulte_game_proprietaires WHERE game_id = ? AND user_id = ?').get(targetGame.id, targetUser.id);

                  if (!existing) {
                    // INSERT new proprietaire (ne pas faire UPDATE pour éviter d'écraser les données existantes)
                    const insertColumns = propCommonColumns.filter(col => col !== 'id');
                    const quotedInsertColumns = insertColumns.map(col => `"${col}"`).join(', ');
                    const placeholders = insertColumns.map(() => '?').join(', ');
                    const values = insertColumns.map(col => {
                      if (col === 'game_id') return targetGame.id;
                      if (col === 'user_id') return targetUser.id;
                      return proprietaire[col] !== undefined ? proprietaire[col] : null;
                    });
                    try {
                      targetDb.prepare(`INSERT INTO adulte_game_proprietaires (${quotedInsertColumns}) VALUES (${placeholders})`).run(...values);
                    } catch (insertError) {
                      if (!insertError.message.includes('UNIQUE constraint')) {
                        console.warn(`  ⚠️ Erreur insertion proprietaire jeu:`, insertError.message);
                      }
                    }
                  }
                } catch (propError) {
                  console.warn(`  ⚠️ Erreur traitement proprietaire jeu:`, propError.message);
                }
              });
            }
          } catch (propError) {
            console.warn(`  ⚠️ Erreur fusion adulte_game_proprietaires depuis ${file}:`, propError.message);
          }

          // === FUSION DES FILMS ===
          // Récupérer les colonnes de la source et de la destination
          const movieSourceColumns = userDb.pragma('table_info(movies)').map(col => col.name).filter(name => name !== 'id');
          const movieTargetColumns = targetDb.pragma('table_info(movies)').map(col => col.name).filter(name => name !== 'id');

          // Utiliser seulement les colonnes communes
          const movieCommonColumns = movieSourceColumns.filter(col => movieTargetColumns.includes(col));

          if (movieCommonColumns.length > 0) {
            const movieSelectColumns = movieCommonColumns.map(col => `"${col}"`).join(', ');
            let movies = [];
            try {
              movies = userDb.prepare(`SELECT ${movieSelectColumns} FROM movies`).all();
            } catch (selectError) {
              console.warn(`  ⚠️ Erreur sélection movies depuis ${file}:`, selectError.message);
              movies = [];
            }

            movies.forEach(movie => {
              try {
                // Vérifier par tmdb_id (UNIQUE) pour identifier les doublons
                const movieTmdbId = movieCommonColumns.includes('tmdb_id') ? movie.tmdb_id : null;

                let existing = null;
                if (movieTmdbId) {
                  existing = targetDb.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(movieTmdbId);
                }

                if (existing) {
                  // UPDATE existing movie (toutes les colonnes sont générales)
                  const updateFields = [];
                  const updateValues = [];

                  movieCommonColumns.forEach(col => {
                    const value = movie[col] !== undefined ? movie[col] : null;
                    if (value !== undefined && value !== null) {
                      updateFields.push(`"${col}" = ?`);
                      updateValues.push(value);
                    }
                  });

                  updateFields.push(`updated_at = datetime('now')`);
                  if (updateFields.length > 1) { // Plus que updated_at
                    updateValues.push(existing.id);
                    const updateMovie = targetDb.prepare(`
                      UPDATE movies SET ${updateFields.join(', ')} WHERE id = ?
                    `);
                    updateMovie.run(...updateValues);
                  }
                } else {
                  // INSERT new movie
                  const placeholders = movieCommonColumns.map(() => '?').join(', ');
                  const values = movieCommonColumns.map(col => {
                    const value = movie[col] !== undefined ? movie[col] : null;
                    return value !== undefined && value !== null ? value : null;
                  });

                  if (values.length !== movieCommonColumns.length) {
                    console.warn(`  ⚠️ [${file}] Movie: Nombre de valeurs (${values.length}) ne correspond pas au nombre de colonnes (${movieCommonColumns.length})`);
                    return;
                  }

                  const quotedMovieColumns = movieCommonColumns.map(col => `"${col}"`).join(', ');
                  try {
                    const insertMovie = targetDb.prepare(`
                      INSERT INTO movies (${quotedMovieColumns})
                VALUES (${placeholders})
              `);
                    insertMovie.run(...values);
                  } catch (insertError) {
                    // Si erreur UNIQUE, c'est normal (doublon)
                    if (!insertError.message.includes('UNIQUE constraint')) {
                      console.warn(`  ⚠️ Erreur insertion movie:`, insertError.message);
                    }
                  }
                }
              } catch (movieError) {
                console.warn(`  ⚠️ Erreur traitement movie:`, movieError.message);
              }
            });
          }

          // === FUSION DES SÉRIES TV ===
          // Récupérer les colonnes de la source et de la destination
          const tvShowSourceColumns = userDb.pragma('table_info(tv_shows)').map(col => col.name).filter(name => name !== 'id');
          const tvShowTargetColumns = targetDb.pragma('table_info(tv_shows)').map(col => col.name).filter(name => name !== 'id');

          // Utiliser seulement les colonnes communes
          const tvShowCommonColumns = tvShowSourceColumns.filter(col => tvShowTargetColumns.includes(col));

          if (tvShowCommonColumns.length > 0) {
            const tvShowSelectColumns = tvShowCommonColumns.map(col => `"${col}"`).join(', ');
            let tv_shows = [];
            try {
              tv_shows = userDb.prepare(`SELECT ${tvShowSelectColumns} FROM tv_shows`).all();
            } catch (selectError) {
              console.warn(`  ⚠️ Erreur sélection tv_shows depuis ${file}:`, selectError.message);
              tv_shows = [];
            }

            tv_shows.forEach(tvShow => {
              try {
                // Vérifier par tmdb_id (UNIQUE) pour identifier les doublons
                const tvShowTmdbId = tvShowCommonColumns.includes('tmdb_id') ? tvShow.tmdb_id : null;

                let existing = null;
                if (tvShowTmdbId) {
                  existing = targetDb.prepare('SELECT id FROM tv_shows WHERE tmdb_id = ?').get(tvShowTmdbId);
                }

                if (existing) {
                  // UPDATE existing tv_show (toutes les colonnes sont générales)
                  const updateFields = [];
                  const updateValues = [];

                  tvShowCommonColumns.forEach(col => {
                    const value = tvShow[col] !== undefined ? tvShow[col] : null;
                    if (value !== undefined && value !== null) {
                      updateFields.push(`"${col}" = ?`);
                      updateValues.push(value);
                    }
                  });

                  updateFields.push(`updated_at = datetime('now')`);
                  if (updateFields.length > 1) { // Plus que updated_at
                    updateValues.push(existing.id);
                    const updateTvShow = targetDb.prepare(`
                      UPDATE tv_shows SET ${updateFields.join(', ')} WHERE id = ?
                    `);
                    updateTvShow.run(...updateValues);
                  }
                } else {
                  // INSERT new tv_show
                  const placeholders = tvShowCommonColumns.map(() => '?').join(', ');
                  const values = tvShowCommonColumns.map(col => {
                    const value = tvShow[col] !== undefined ? tvShow[col] : null;
                    return value !== undefined && value !== null ? value : null;
                  });

                  if (values.length !== tvShowCommonColumns.length) {
                    console.warn(`  ⚠️ [${file}] TV Show: Nombre de valeurs (${values.length}) ne correspond pas au nombre de colonnes (${tvShowCommonColumns.length})`);
                    return;
                  }

                  const quotedTvShowColumns = tvShowCommonColumns.map(col => `"${col}"`).join(', ');
                  try {
                    const insertTvShow = targetDb.prepare(`
                      INSERT INTO tv_shows (${quotedTvShowColumns})
                      VALUES (${placeholders})
                    `);
                    insertTvShow.run(...values);
                  } catch (insertError) {
                    // Si erreur UNIQUE, c'est normal (doublon)
                    if (!insertError.message.includes('UNIQUE constraint')) {
                      console.warn(`  ⚠️ Erreur insertion tv_show:`, insertError.message);
                    }
                  }
                }
              } catch (tvShowError) {
                console.warn(`  ⚠️ Erreur traitement tv_show:`, tvShowError.message);
              }
            });
          }

          // === FUSION DES SAISONS TV ===
          const seasonSourceColumns = userDb.pragma('table_info(tv_seasons)').map(col => col.name).filter(name => name !== 'id');
          const seasonTargetColumns = targetDb.pragma('table_info(tv_seasons)').map(col => col.name).filter(name => name !== 'id');
          const seasonCommonColumns = seasonSourceColumns.filter(col => seasonTargetColumns.includes(col));

          if (seasonCommonColumns.length > 0 && seasonCommonColumns.includes('show_id') && seasonCommonColumns.includes('numero')) {
            const seasonSelectColumns = seasonCommonColumns.map(col => `"${col}"`).join(', ');
            let tv_seasons = [];
            try {
              tv_seasons = userDb.prepare(`SELECT ${seasonSelectColumns} FROM tv_seasons`).all();
            } catch (selectError) {
              console.warn(`  ⚠️ Erreur sélection tv_seasons depuis ${file}:`, selectError.message);
              tv_seasons = [];
            }

            tv_seasons.forEach(season => {
              try {
                // Trouver la série TV correspondante dans la base de destination
                const sourceShow = userDb.prepare('SELECT tmdb_id FROM tv_shows WHERE id = ?').get(season.show_id);
                if (!sourceShow) return;

                const targetShow = targetDb.prepare('SELECT id FROM tv_shows WHERE tmdb_id = ?').get(sourceShow.tmdb_id);
                if (!targetShow) return;

                // Vérifier si la saison existe déjà (par show_id + numero, car UNIQUE(show_id, numero))
                const existing = targetDb.prepare('SELECT id FROM tv_seasons WHERE show_id = ? AND numero = ?').get(targetShow.id, season.numero);

                if (existing) {
                  // UPDATE existing season
                  const updateFields = [];
                  const updateValues = [];

                  if (seasonCommonColumns.includes('show_id')) {
                    updateFields.push(`"show_id" = ?`);
                    updateValues.push(targetShow.id);
                  }

                  seasonCommonColumns.forEach(col => {
                    if (col !== 'show_id') {
                      const value = season[col] !== undefined ? season[col] : null;
                      if (value !== undefined && value !== null) {
                        updateFields.push(`"${col}" = ?`);
                        updateValues.push(value);
                      }
                    }
                  });

                  updateFields.push(`updated_at = datetime('now')`);
                  if (updateFields.length > 1) {
                    updateValues.push(existing.id);
                    targetDb.prepare(`UPDATE tv_seasons SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
                  }
                } else {
                  // INSERT new season
                  const insertColumns = seasonCommonColumns.map(col => col === 'show_id' ? 'show_id' : col);
                  const quotedInsertColumns = insertColumns.map(col => `"${col}"`).join(', ');
                  const placeholders = insertColumns.map(() => '?').join(', ');
                  const values = insertColumns.map(col => col === 'show_id' ? targetShow.id : (season[col] !== undefined ? season[col] : null));
                  try {
                    targetDb.prepare(`INSERT INTO tv_seasons (${quotedInsertColumns}) VALUES (${placeholders})`).run(...values);
                  } catch (insertError) {
                    if (!insertError.message.includes('UNIQUE constraint')) {
                      console.warn(`  ⚠️ Erreur insertion saison:`, insertError.message);
                    }
                  }
                }
              } catch (seasonError) {
                console.warn(`  ⚠️ Erreur traitement saison:`, seasonError.message);
              }
            });
          }

          // === FUSION DES ÉPISODES TV ===
          const episodeSourceColumns = userDb.pragma('table_info(tv_episodes)').map(col => col.name).filter(name => name !== 'id');
          const episodeTargetColumns = targetDb.pragma('table_info(tv_episodes)').map(col => col.name).filter(name => name !== 'id');
          const episodeCommonColumns = episodeSourceColumns.filter(col => episodeTargetColumns.includes(col));

          if (episodeCommonColumns.length > 0 && episodeCommonColumns.includes('show_id') && episodeCommonColumns.includes('saison_numero') && episodeCommonColumns.includes('episode_numero')) {
            const episodeSelectColumns = episodeCommonColumns.map(col => `"${col}"`).join(', ');
            let tv_episodes = [];
            try {
              tv_episodes = userDb.prepare(`SELECT ${episodeSelectColumns} FROM tv_episodes`).all();
            } catch (selectError) {
              console.warn(`  ⚠️ Erreur sélection tv_episodes depuis ${file}:`, selectError.message);
              tv_episodes = [];
            }

            tv_episodes.forEach(episode => {
              try {
                // Trouver la série TV correspondante dans la base de destination
                const sourceShow = userDb.prepare('SELECT tmdb_id FROM tv_shows WHERE id = ?').get(episode.show_id);
                if (!sourceShow) return;

                const targetShow = targetDb.prepare('SELECT id FROM tv_shows WHERE tmdb_id = ?').get(sourceShow.tmdb_id);
                if (!targetShow) return;

                // Trouver la saison correspondante si season_id existe
                let targetSeasonId = null;
                if (episodeCommonColumns.includes('season_id') && episode.season_id) {
                  const sourceSeason = userDb.prepare('SELECT numero FROM tv_seasons WHERE id = ?').get(episode.season_id);
                  if (sourceSeason) {
                    const targetSeason = targetDb.prepare('SELECT id FROM tv_seasons WHERE show_id = ? AND numero = ?').get(targetShow.id, sourceSeason.numero);
                    if (targetSeason) {
                      targetSeasonId = targetSeason.id;
                    }
                  }
                }

                // Vérifier si l'épisode existe déjà (par show_id + saison_numero + episode_numero, car UNIQUE)
                const existing = targetDb.prepare('SELECT id FROM tv_episodes WHERE show_id = ? AND saison_numero = ? AND episode_numero = ?').get(targetShow.id, episode.saison_numero, episode.episode_numero);

                if (existing) {
                  // UPDATE existing episode
                  const updateFields = [];
                  const updateValues = [];

                  if (episodeCommonColumns.includes('show_id')) {
                    updateFields.push(`"show_id" = ?`);
                    updateValues.push(targetShow.id);
                  }
                  if (episodeCommonColumns.includes('season_id') && targetSeasonId !== null) {
                    updateFields.push(`"season_id" = ?`);
                    updateValues.push(targetSeasonId);
                  }

                  episodeCommonColumns.forEach(col => {
                    if (col !== 'show_id' && col !== 'season_id') {
                      const value = episode[col] !== undefined ? episode[col] : null;
                      if (value !== undefined && value !== null) {
                        updateFields.push(`"${col}" = ?`);
                        updateValues.push(value);
                      }
                    }
                  });

                  updateFields.push(`updated_at = datetime('now')`);
                  if (updateFields.length > 1) {
                    updateValues.push(existing.id);
                    targetDb.prepare(`UPDATE tv_episodes SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
                  }
                } else {
                  // INSERT new episode
                  const insertColumns = episodeCommonColumns.map(col => col === 'show_id' ? 'show_id' : (col === 'season_id' ? 'season_id' : col));
                  const quotedInsertColumns = insertColumns.map(col => `"${col}"`).join(', ');
                  const placeholders = insertColumns.map(() => '?').join(', ');
                  const values = insertColumns.map(col => {
                    if (col === 'show_id') return targetShow.id;
                    if (col === 'season_id') return targetSeasonId;
                    return episode[col] !== undefined ? episode[col] : null;
                  });
                  try {
                    targetDb.prepare(`INSERT INTO tv_episodes (${quotedInsertColumns}) VALUES (${placeholders})`).run(...values);
                  } catch (insertError) {
                    if (!insertError.message.includes('UNIQUE constraint')) {
                      console.warn(`  ⚠️ Erreur insertion épisode:`, insertError.message);
                    }
                  }
                }
              } catch (episodeError) {
                console.warn(`  ⚠️ Erreur traitement épisode:`, episodeError.message);
              }
            });
          }

          // === FUSION DES LIVRES ===
          // Récupérer les colonnes de la source et de la destination
          const bookSourceColumns = userDb.pragma('table_info(books)').map(col => col.name).filter(name => name !== 'id');
          const bookTargetColumns = targetDb.pragma('table_info(books)').map(col => col.name).filter(name => name !== 'id');

          // Utiliser seulement les colonnes communes
          const bookCommonColumns = bookSourceColumns.filter(col => bookTargetColumns.includes(col));

          if (bookCommonColumns.length > 0) {
            const bookSelectColumns = bookCommonColumns.map(col => `"${col}"`).join(', ');
            let books = [];
            try {
              books = userDb.prepare(`SELECT ${bookSelectColumns} FROM books`).all();
            } catch (selectError) {
              console.warn(`  ⚠️ Erreur sélection books depuis ${file}:`, selectError.message);
              books = [];
            }

            books.forEach(book => {
              try {
                // Identifier les doublons par isbn, isbn13, titre, ou google_books_id/open_library_id/bnf_id
                let existing = null;

                if (bookCommonColumns.includes('isbn') && book.isbn) {
                  existing = targetDb.prepare('SELECT id FROM books WHERE isbn = ?').get(book.isbn);
                }
                if (!existing && bookCommonColumns.includes('isbn13') && book.isbn13) {
                  existing = targetDb.prepare('SELECT id FROM books WHERE isbn13 = ?').get(book.isbn13);
                }
                if (!existing && bookCommonColumns.includes('google_books_id') && book.google_books_id) {
                  existing = targetDb.prepare('SELECT id FROM books WHERE google_books_id = ?').get(book.google_books_id);
                }
                if (!existing && bookCommonColumns.includes('open_library_id') && book.open_library_id) {
                  existing = targetDb.prepare('SELECT id FROM books WHERE open_library_id = ?').get(book.open_library_id);
                }
                if (!existing && bookCommonColumns.includes('bnf_id') && book.bnf_id) {
                  existing = targetDb.prepare('SELECT id FROM books WHERE bnf_id = ?').get(book.bnf_id);
                }
                if (!existing && bookCommonColumns.includes('titre') && book.titre) {
                  // En dernier recours, vérifier par titre + auteur
                  if (bookCommonColumns.includes('auteur') && book.auteur) {
                    existing = targetDb.prepare('SELECT id FROM books WHERE titre = ? AND auteur = ?').get(book.titre, book.auteur);
                  } else {
                    existing = targetDb.prepare('SELECT id FROM books WHERE titre = ?').get(book.titre);
                  }
                }

                if (existing) {
                  // UPDATE existing book (toutes les colonnes sont générales)
                  const updateFields = [];
                  const updateValues = [];

                  bookCommonColumns.forEach(col => {
                    const value = book[col] !== undefined ? book[col] : null;
                    if (value !== undefined && value !== null) {
                      updateFields.push(`"${col}" = ?`);
                      updateValues.push(value);
                    }
                  });

                  updateFields.push(`updated_at = datetime('now')`);
                  if (updateFields.length > 1) { // Plus que updated_at
                    updateValues.push(existing.id);
                    const updateBook = targetDb.prepare(`
                      UPDATE books SET ${updateFields.join(', ')} WHERE id = ?
                    `);
                    updateBook.run(...updateValues);
                  }
                } else {
                  // INSERT new book
                  const placeholders = bookCommonColumns.map(() => '?').join(', ');
                  const values = bookCommonColumns.map(col => {
                    const value = book[col] !== undefined ? book[col] : null;
                    return value !== undefined && value !== null ? value : null;
                  });

                  if (values.length !== bookCommonColumns.length) {
                    console.warn(`  ⚠️ [${file}] Book: Nombre de valeurs (${values.length}) ne correspond pas au nombre de colonnes (${bookCommonColumns.length})`);
                    return;
                  }

                  const quotedBookColumns = bookCommonColumns.map(col => `"${col}"`).join(', ');
                  try {
                    const insertBook = targetDb.prepare(`
                      INSERT INTO books (${quotedBookColumns})
                      VALUES (${placeholders})
                    `);
                    insertBook.run(...values);
                  } catch (insertError) {
                    // Si erreur UNIQUE, c'est normal (doublon)
                    if (!insertError.message.includes('UNIQUE constraint')) {
                      console.warn(`  ⚠️ Erreur insertion book:`, insertError.message);
                    }
                  }
                }
              } catch (bookError) {
                console.warn(`  ⚠️ Erreur traitement book:`, bookError.message);
              }
            });
          }

          // === FUSION DES LIVRES PROPRIETAIRES ===
          // Fusionner les propriétaires pour partager les informations de coûts entre utilisateurs
          try {
            const propSourceColumns = userDb.pragma('table_info(book_proprietaires)').map(col => col.name).filter(name => name !== 'id');
            const propTargetColumns = targetDb.pragma('table_info(book_proprietaires)').map(col => col.name).filter(name => name !== 'id');
            const propCommonColumns = propSourceColumns.filter(col => propTargetColumns.includes(col));

            if (propCommonColumns.includes('book_id') && propCommonColumns.includes('user_id')) {
              const propSelectColumns = propCommonColumns.map(col => `"${col}"`).join(', ');
              const proprietaires = userDb.prepare(`SELECT ${propSelectColumns} FROM book_proprietaires`).all();

              proprietaires.forEach(proprietaire => {
                try {
                  // Trouver le livre correspondant dans la base de destination
                  const sourceBook = userDb.prepare('SELECT isbn, isbn13, titre, auteur, google_books_id, open_library_id, bnf_id FROM books WHERE id = ?').get(proprietaire.book_id);
                  if (!sourceBook) return;

                  // Chercher le livre dans la base cible
                  let targetBook = null;
                  if (sourceBook.isbn) {
                    targetBook = targetDb.prepare('SELECT id FROM books WHERE isbn = ?').get(sourceBook.isbn);
                  }
                  if (!targetBook && sourceBook.isbn13) {
                    targetBook = targetDb.prepare('SELECT id FROM books WHERE isbn13 = ?').get(sourceBook.isbn13);
                  }
                  if (!targetBook && sourceBook.google_books_id) {
                    targetBook = targetDb.prepare('SELECT id FROM books WHERE google_books_id = ?').get(sourceBook.google_books_id);
                  }
                  if (!targetBook && sourceBook.open_library_id) {
                    targetBook = targetDb.prepare('SELECT id FROM books WHERE open_library_id = ?').get(sourceBook.open_library_id);
                  }
                  if (!targetBook && sourceBook.bnf_id) {
                    targetBook = targetDb.prepare('SELECT id FROM books WHERE bnf_id = ?').get(sourceBook.bnf_id);
                  }
                  if (!targetBook && sourceBook.titre) {
                    if (sourceBook.auteur) {
                      targetBook = targetDb.prepare('SELECT id FROM books WHERE titre = ? AND auteur = ?').get(sourceBook.titre, sourceBook.auteur);
                    } else {
                      targetBook = targetDb.prepare('SELECT id FROM books WHERE titre = ?').get(sourceBook.titre);
                    }
                  }

                  if (!targetBook) return;

                  // Trouver l'utilisateur correspondant
                  const sourceUser = userDb.prepare('SELECT name FROM users WHERE id = ?').get(proprietaire.user_id);
                  if (!sourceUser) return;
                  const targetUser = targetDb.prepare('SELECT id FROM users WHERE name = ?').get(sourceUser.name);
                  if (!targetUser) return;

                  // Vérifier si la propriété existe déjà (par book_id + user_id, car UNIQUE(book_id, user_id))
                  const existing = targetDb.prepare('SELECT id FROM book_proprietaires WHERE book_id = ? AND user_id = ?').get(targetBook.id, targetUser.id);

                  if (!existing) {
                    // INSERT new proprietaire (ne pas faire UPDATE pour éviter d'écraser les données existantes)
                    const insertColumns = propCommonColumns.filter(col => col !== 'id');
                    const quotedInsertColumns = insertColumns.map(col => `"${col}"`).join(', ');
                    const placeholders = insertColumns.map(() => '?').join(', ');
                    const values = insertColumns.map(col => {
                      if (col === 'book_id') return targetBook.id;
                      if (col === 'user_id') return targetUser.id;
                      return proprietaire[col] !== undefined ? proprietaire[col] : null;
                    });
                    try {
                      targetDb.prepare(`INSERT INTO book_proprietaires (${quotedInsertColumns}) VALUES (${placeholders})`).run(...values);
                    } catch (insertError) {
                      if (!insertError.message.includes('UNIQUE constraint')) {
                        console.warn(`  ⚠️ Erreur insertion proprietaire livre:`, insertError.message);
                      }
                    }
                  }
                } catch (propError) {
                  console.warn(`  ⚠️ Erreur traitement proprietaire livre:`, propError.message);
                }
              });
            }
          } catch (propError) {
            console.warn(`  ⚠️ Erreur fusion book_proprietaires depuis ${file}:`, propError.message);
          }

          // === FUSION DES ABONNEMENTS ===
          // Récupérer les colonnes de la source et de la destination
          const subscriptionSourceColumns = userDb.pragma('table_info(subscriptions)').map(col => col.name).filter(name => name !== 'id');
          const subscriptionTargetColumns = targetDb.pragma('table_info(subscriptions)').map(col => col.name).filter(name => name !== 'id');
          const subscriptionCommonColumns = subscriptionSourceColumns.filter(col => subscriptionTargetColumns.includes(col));

          if (subscriptionCommonColumns.length > 0) {
            const subscriptionSelectColumns = subscriptionCommonColumns.map(col => `"${col}"`).join(', ');
            let subscriptions = [];
            try {
              subscriptions = userDb.prepare(`SELECT ${subscriptionSelectColumns} FROM subscriptions`).all();
            } catch (selectError) {
              console.warn(`  ⚠️ Erreur sélection subscriptions depuis ${file}:`, selectError.message);
              subscriptions = [];
            }

            subscriptions.forEach(subscription => {
              try {
                // Identifier les doublons par name (nom unique pour chaque abonnement)
                let existing = null;
                if (subscriptionCommonColumns.includes('name') && subscription.name) {
                  existing = targetDb.prepare('SELECT id FROM subscriptions WHERE name = ?').get(subscription.name);
                }

                if (existing) {
                  // UPDATE existing subscription avec priorité de fusion
                  const existingSubscription = targetDb.prepare('SELECT * FROM subscriptions WHERE id = ?').get(existing.id);
                  const updateFields = [];
                  const updateValues = [];

                  // Fonction helper pour déterminer quelle valeur utiliser selon la priorité
                  const preferValue = (sourceValue, targetValue, sourceUpdatedAt, targetUpdatedAt) => {
                    if (mergePriority === 'current-user') {
                      return targetValue !== undefined && targetValue !== null ? targetValue : sourceValue;
                    } else if (mergePriority === 'source') {
                      return sourceValue !== undefined && sourceValue !== null ? sourceValue : targetValue;
                    } else if (mergePriority === 'newest') {
                      const sourceTime = sourceUpdatedAt ? new Date(sourceUpdatedAt).getTime() : 0;
                      const targetTime = targetUpdatedAt ? new Date(targetUpdatedAt).getTime() : 0;
                      return sourceTime > targetTime ? sourceValue : targetValue;
                    } else if (mergePriority === 'oldest') {
                      const sourceTime = sourceUpdatedAt ? new Date(sourceUpdatedAt).getTime() : Infinity;
                      const targetTime = targetUpdatedAt ? new Date(targetUpdatedAt).getTime() : Infinity;
                      return sourceTime < targetTime ? sourceValue : targetValue;
                    }
                    return targetValue !== undefined && targetValue !== null ? targetValue : sourceValue;
                  };

                  const sourceUpdatedAt = subscription.updated_at || null;
                  const targetUpdatedAt = existingSubscription.updated_at || null;

                  subscriptionCommonColumns.forEach(col => {
                    // Exclure les colonnes de métadonnées
                    if (col === 'id' || col === 'created_at' || col === 'updated_at') {
                      return;
                    }

                    const sourceValue = subscription[col] !== undefined ? subscription[col] : null;
                    const targetValue = existingSubscription[col] !== undefined ? existingSubscription[col] : null;

                    // Déterminer la valeur à utiliser selon la priorité
                    const finalValue = preferValue(sourceValue, targetValue, sourceUpdatedAt, targetUpdatedAt);

                    // Ne mettre à jour que si la valeur finale est différente de la valeur cible
                    if (finalValue !== undefined && finalValue !== null && finalValue !== targetValue) {
                      updateFields.push(`"${col}" = ?`);
                      updateValues.push(finalValue);
                    }
                  });

                  updateFields.push(`updated_at = datetime('now')`);
                  if (updateFields.length > 1) {
                    updateValues.push(existing.id);
                    targetDb.prepare(`UPDATE subscriptions SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
                  }
                } else {
                  // INSERT new subscription
                  const placeholders = subscriptionCommonColumns.map(() => '?').join(', ');
                  const values = subscriptionCommonColumns.map(col => subscription[col] !== undefined ? subscription[col] : null);
                  const quotedColumns = subscriptionCommonColumns.map(col => `"${col}"`).join(', ');
                  try {
                    targetDb.prepare(`INSERT INTO subscriptions (${quotedColumns}) VALUES (${placeholders})`).run(...values);
                  } catch (insertError) {
                    if (!insertError.message.includes('UNIQUE constraint')) {
                      console.warn(`  ⚠️ Erreur insertion subscription:`, insertError.message);
                    }
                  }
                }
              } catch (subscriptionError) {
                console.warn(`  ⚠️ Erreur traitement subscription:`, subscriptionError.message);
              }
            });
          }

          // === FUSION DES ABONNEMENTS PROPRIETAIRES ===
          try {
            const propSourceColumns = userDb.pragma('table_info(subscription_proprietaires)').map(col => col.name).filter(name => name !== 'id');
            const propTargetColumns = targetDb.pragma('table_info(subscription_proprietaires)').map(col => col.name).filter(name => name !== 'id');
            const propCommonColumns = propSourceColumns.filter(col => propTargetColumns.includes(col));

            if (propCommonColumns.includes('subscription_id') && propCommonColumns.includes('user_id')) {
              const propSelectColumns = propCommonColumns.map(col => `"${col}"`).join(', ');
              const proprietaires = userDb.prepare(`SELECT ${propSelectColumns} FROM subscription_proprietaires`).all();

              proprietaires.forEach(proprietaire => {
                try {
                  // Trouver l'abonnement correspondant dans la base de destination
                  const sourceSubscription = userDb.prepare('SELECT name FROM subscriptions WHERE id = ?').get(proprietaire.subscription_id);
                  if (!sourceSubscription) return;

                  const targetSubscription = targetDb.prepare('SELECT id FROM subscriptions WHERE name = ?').get(sourceSubscription.name);
                  if (!targetSubscription) return;

                  // Trouver l'utilisateur correspondant
                  const sourceUser = userDb.prepare('SELECT name FROM users WHERE id = ?').get(proprietaire.user_id);
                  if (!sourceUser) return;
                  const targetUser = targetDb.prepare('SELECT id FROM users WHERE name = ?').get(sourceUser.name);
                  if (!targetUser) return;

                  // Vérifier si la propriété existe déjà (par subscription_id + user_id, car UNIQUE)
                  const existing = targetDb.prepare('SELECT id FROM subscription_proprietaires WHERE subscription_id = ? AND user_id = ?').get(targetSubscription.id, targetUser.id);

                  if (!existing) {
                    // INSERT new proprietaire
                    const insertColumns = propCommonColumns.filter(col => col !== 'id');
                    const quotedInsertColumns = insertColumns.map(col => `"${col}"`).join(', ');
                    const placeholders = insertColumns.map(() => '?').join(', ');
                    const values = insertColumns.map(col => {
                      if (col === 'subscription_id') return targetSubscription.id;
                      if (col === 'user_id') return targetUser.id;
                      return proprietaire[col] !== undefined ? proprietaire[col] : null;
                    });
                    try {
                      targetDb.prepare(`INSERT INTO subscription_proprietaires (${quotedInsertColumns}) VALUES (${placeholders})`).run(...values);
                    } catch (insertError) {
                      if (!insertError.message.includes('UNIQUE constraint')) {
                        console.warn(`  ⚠️ Erreur insertion proprietaire subscription:`, insertError.message);
                      }
                    }
                  }
                } catch (propError) {
                  console.warn(`  ⚠️ Erreur traitement proprietaire subscription:`, propError.message);
                }
              });
            }
          } catch (propError) {
            console.warn(`  ⚠️ Erreur fusion subscription_proprietaires depuis ${file}:`, propError.message);
          }

          // === FUSION DES SITES D'ACHAT ===
          const siteSourceColumns = userDb.pragma('table_info(purchase_sites)').map(col => col.name).filter(name => name !== 'id');
          const siteTargetColumns = targetDb.pragma('table_info(purchase_sites)').map(col => col.name).filter(name => name !== 'id');
          const siteCommonColumns = siteSourceColumns.filter(col => siteTargetColumns.includes(col));

          if (siteCommonColumns.length > 0) {
            const siteSelectColumns = siteCommonColumns.map(col => `"${col}"`).join(', ');
            let purchase_sites = [];
            try {
              purchase_sites = userDb.prepare(`SELECT ${siteSelectColumns} FROM purchase_sites`).all();
            } catch (selectError) {
              console.warn(`  ⚠️ Erreur sélection purchase_sites depuis ${file}:`, selectError.message);
              purchase_sites = [];
            }

            purchase_sites.forEach(site => {
              try {
                // Identifier les doublons par name (UNIQUE)
                let existing = null;
                if (siteCommonColumns.includes('name') && site.name) {
                  existing = targetDb.prepare('SELECT id FROM purchase_sites WHERE name = ?').get(site.name);
                }

                if (!existing) {
                  // INSERT new site (name est UNIQUE, donc INSERT OR IGNORE suffit)
                  const placeholders = siteCommonColumns.map(() => '?').join(', ');
                  const values = siteCommonColumns.map(col => site[col] !== undefined ? site[col] : null);
                  const quotedColumns = siteCommonColumns.map(col => `"${col}"`).join(', ');
                  try {
                    targetDb.prepare(`INSERT OR IGNORE INTO purchase_sites (${quotedColumns}) VALUES (${placeholders})`).run(...values);
                  } catch (insertError) {
                    if (!insertError.message.includes('UNIQUE constraint')) {
                      console.warn(`  ⚠️ Erreur insertion purchase_site:`, insertError.message);
                    }
                  }
                }
              } catch (siteError) {
                console.warn(`  ⚠️ Erreur traitement purchase_site:`, siteError.message);
              }
            });
          }

          // === FUSION DES ACHATS PONCTUELS ===
          const purchaseSourceColumns = userDb.pragma('table_info(one_time_purchases)').map(col => col.name).filter(name => name !== 'id');
          const purchaseTargetColumns = targetDb.pragma('table_info(one_time_purchases)').map(col => col.name).filter(name => name !== 'id');
          const purchaseCommonColumns = purchaseSourceColumns.filter(col => purchaseTargetColumns.includes(col));

          if (purchaseCommonColumns.length > 0) {
            const purchaseSelectColumns = purchaseCommonColumns.map(col => `"${col}"`).join(', ');
            let one_time_purchases = [];
            try {
              one_time_purchases = userDb.prepare(`SELECT ${purchaseSelectColumns} FROM one_time_purchases`).all();
            } catch (selectError) {
              console.warn(`  ⚠️ Erreur sélection one_time_purchases depuis ${file}:`, selectError.message);
              one_time_purchases = [];
            }

            one_time_purchases.forEach(purchase => {
              try {
                // Identifier les doublons par purchase_date + amount + site_name (combinaison probablement unique)
                let existing = null;
                if (purchaseCommonColumns.includes('purchase_date') && purchaseCommonColumns.includes('amount') && purchaseCommonColumns.includes('site_name')) {
                  existing = targetDb.prepare('SELECT id FROM one_time_purchases WHERE purchase_date = ? AND amount = ? AND site_name = ?').get(purchase.purchase_date, purchase.amount, purchase.site_name || '');
                }

                if (existing) {
                  // UPDATE existing purchase avec priorité de fusion
                  const existingPurchase = targetDb.prepare('SELECT * FROM one_time_purchases WHERE id = ?').get(existing.id);
                  const updateFields = [];
                  const updateValues = [];

                  // Fonction helper pour déterminer quelle valeur utiliser selon la priorité
                  const preferValue = (sourceValue, targetValue, sourceUpdatedAt, targetUpdatedAt) => {
                    if (mergePriority === 'current-user') {
                      return targetValue !== undefined && targetValue !== null ? targetValue : sourceValue;
                    } else if (mergePriority === 'source') {
                      return sourceValue !== undefined && sourceValue !== null ? sourceValue : targetValue;
                    } else if (mergePriority === 'newest') {
                      const sourceTime = sourceUpdatedAt ? new Date(sourceUpdatedAt).getTime() : 0;
                      const targetTime = targetUpdatedAt ? new Date(targetUpdatedAt).getTime() : 0;
                      return sourceTime > targetTime ? sourceValue : targetValue;
                    } else if (mergePriority === 'oldest') {
                      const sourceTime = sourceUpdatedAt ? new Date(sourceUpdatedAt).getTime() : Infinity;
                      const targetTime = targetUpdatedAt ? new Date(targetUpdatedAt).getTime() : Infinity;
                      return sourceTime < targetTime ? sourceValue : targetValue;
                    }
                    return targetValue !== undefined && targetValue !== null ? targetValue : sourceValue;
                  };

                  const sourceUpdatedAt = purchase.updated_at || null;
                  const targetUpdatedAt = existingPurchase.updated_at || null;

                  // Mapper site_name vers site_id si nécessaire
                  let targetSiteId = null;
                  if (purchaseCommonColumns.includes('site_id') && purchase.site_id) {
                    const sourceSite = userDb.prepare('SELECT name FROM purchase_sites WHERE id = ?').get(purchase.site_id);
                    if (sourceSite) {
                      const targetSite = targetDb.prepare('SELECT id FROM purchase_sites WHERE name = ?').get(sourceSite.name);
                      if (targetSite) {
                        targetSiteId = targetSite.id;
                      }
                    }
                  }

                  purchaseCommonColumns.forEach(col => {
                    // Exclure les colonnes de métadonnées
                    if (col === 'id' || col === 'created_at' || col === 'updated_at') {
                      return;
                    }

                    if (col === 'site_id') {
                      // Gérer site_id séparément
                      const finalSiteId = preferValue(targetSiteId, existingPurchase.site_id, sourceUpdatedAt, targetUpdatedAt);
                      if (finalSiteId !== existingPurchase.site_id) {
                        updateFields.push(`"site_id" = ?`);
                        updateValues.push(finalSiteId);
                      }
                    } else {
                      const sourceValue = purchase[col] !== undefined ? purchase[col] : null;
                      const targetValue = existingPurchase[col] !== undefined ? existingPurchase[col] : null;

                      // Déterminer la valeur à utiliser selon la priorité
                      const finalValue = preferValue(sourceValue, targetValue, sourceUpdatedAt, targetUpdatedAt);

                      // Ne mettre à jour que si la valeur finale est différente de la valeur cible
                      if (finalValue !== undefined && finalValue !== null && finalValue !== targetValue) {
                        updateFields.push(`"${col}" = ?`);
                        updateValues.push(finalValue);
                      }
                    }
                  });

                  updateFields.push(`updated_at = datetime('now')`);
                  if (updateFields.length > 1) {
                    updateValues.push(existing.id);
                    targetDb.prepare(`UPDATE one_time_purchases SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
                  }
                } else {
                  // INSERT new purchase
                  const insertColumns = purchaseCommonColumns.map(col => col === 'site_id' ? 'site_id' : col);
                  const quotedInsertColumns = insertColumns.map(col => `"${col}"`).join(', ');
                  const placeholders = insertColumns.map(() => '?').join(', ');

                  // Mapper site_id si nécessaire
                  let targetSiteId = null;
                  if (insertColumns.includes('site_id') && purchase.site_id) {
                    const sourceSite = userDb.prepare('SELECT name FROM purchase_sites WHERE id = ?').get(purchase.site_id);
                    if (sourceSite) {
                      const targetSite = targetDb.prepare('SELECT id FROM purchase_sites WHERE name = ?').get(sourceSite.name);
                      if (targetSite) {
                        targetSiteId = targetSite.id;
                      }
                    }
                  }

                  const values = insertColumns.map(col => {
                    if (col === 'site_id') return targetSiteId;
                    return purchase[col] !== undefined ? purchase[col] : null;
                  });
                  try {
                    targetDb.prepare(`INSERT INTO one_time_purchases (${quotedInsertColumns}) VALUES (${placeholders})`).run(...values);
                  } catch (insertError) {
                    if (!insertError.message.includes('UNIQUE constraint')) {
                      console.warn(`  ⚠️ Erreur insertion one_time_purchase:`, insertError.message);
                    }
                  }
                }
              } catch (purchaseError) {
                console.warn(`  ⚠️ Erreur traitement one_time_purchase:`, purchaseError.message);
              }
            });
          }

          // === FUSION DES ACHATS PONCTUELS PROPRIETAIRES ===
          try {
            const propSourceColumns = userDb.pragma('table_info(one_time_purchase_proprietaires)').map(col => col.name).filter(name => name !== 'id');
            const propTargetColumns = targetDb.pragma('table_info(one_time_purchase_proprietaires)').map(col => col.name).filter(name => name !== 'id');
            const propCommonColumns = propSourceColumns.filter(col => propTargetColumns.includes(col));

            if (propCommonColumns.includes('purchase_id') && propCommonColumns.includes('user_id')) {
              const propSelectColumns = propCommonColumns.map(col => `"${col}"`).join(', ');
              const proprietaires = userDb.prepare(`SELECT ${propSelectColumns} FROM one_time_purchase_proprietaires`).all();

              proprietaires.forEach(proprietaire => {
                try {
                  // Trouver l'achat correspondant dans la base de destination
                  const sourcePurchase = userDb.prepare('SELECT purchase_date, amount, site_name FROM one_time_purchases WHERE id = ?').get(proprietaire.purchase_id);
                  if (!sourcePurchase) return;

                  // Chercher l'achat dans la base cible par purchase_date + amount + site_name
                  const targetPurchase = targetDb.prepare('SELECT id FROM one_time_purchases WHERE purchase_date = ? AND amount = ? AND site_name = ?').get(sourcePurchase.purchase_date, sourcePurchase.amount, sourcePurchase.site_name || '');
                  if (!targetPurchase) return;

                  // Trouver l'utilisateur correspondant
                  const sourceUser = userDb.prepare('SELECT name FROM users WHERE id = ?').get(proprietaire.user_id);
                  if (!sourceUser) return;
                  const targetUser = targetDb.prepare('SELECT id FROM users WHERE name = ?').get(sourceUser.name);
                  if (!targetUser) return;

                  // Vérifier si la propriété existe déjà (par purchase_id + user_id, car UNIQUE)
                  const existing = targetDb.prepare('SELECT id FROM one_time_purchase_proprietaires WHERE purchase_id = ? AND user_id = ?').get(targetPurchase.id, targetUser.id);

                  if (!existing) {
                    // INSERT new proprietaire
                    const insertColumns = propCommonColumns.filter(col => col !== 'id');
                    const quotedInsertColumns = insertColumns.map(col => `"${col}"`).join(', ');
                    const placeholders = insertColumns.map(() => '?').join(', ');
                    const values = insertColumns.map(col => {
                      if (col === 'purchase_id') return targetPurchase.id;
                      if (col === 'user_id') return targetUser.id;
                      return proprietaire[col] !== undefined ? proprietaire[col] : null;
                    });
                    try {
                      targetDb.prepare(`INSERT INTO one_time_purchase_proprietaires (${quotedInsertColumns}) VALUES (${placeholders})`).run(...values);
                    } catch (insertError) {
                      if (!insertError.message.includes('UNIQUE constraint')) {
                        console.warn(`  ⚠️ Erreur insertion proprietaire one_time_purchase:`, insertError.message);
                      }
                    }
                  }
                } catch (propError) {
                  console.warn(`  ⚠️ Erreur traitement proprietaire one_time_purchase:`, propError.message);
                }
              });
            }
          } catch (propError) {
            console.warn(`  ⚠️ Erreur fusion one_time_purchase_proprietaires depuis ${file}:`, propError.message);
          }

          console.log(`  ✓ ${file}: ${manga_seriesCount} séries, ${manga_tomesCount} manga_tomes, ${animesCount} animes, ${gamesCount} jeux`);
        } catch (error) {
          console.error(`  ❌ Erreur fusion ${file}:`, error.message);
          // Logger plus de détails pour les erreurs de colonnes
          if (error.message.includes('values for') && error.message.includes('columns')) {
            console.error(`    → Détails de l'erreur:`, error);
            // Essayer de déterminer quelle table cause le problème
            try {
              const sourceSeriesCols = userDb.pragma('table_info(manga_series)').map(col => col.name).filter(name => name !== 'id');
              const targetSeriesCols = targetDb.pragma('table_info(manga_series)').map(col => col.name).filter(name => name !== 'id');
              console.error(`    → Table manga_series - Source: ${sourceSeriesCols.length} colonnes, Destination: ${targetSeriesCols.length} colonnes`);
            } catch (e) {
              console.error(`    → Impossible de vérifier les colonnes:`, e.message);
            }
          }
        } finally {
          userDb.close();
        }
      });

      console.log(`✅ Fusion terminée: ${manga_seriesCount} séries, ${manga_tomesCount} manga_tomes, ${animesCount} animes, ${gamesCount} jeux`);
      return { merged: true, manga_seriesCount, manga_tomesCount, animesCount, gamesCount };
    } catch (error) {
      console.error('Erreur merge-database:', error);
      return { merged: false, manga_seriesCount: 0, manga_tomesCount: 0, animesCount: 0, gamesCount: 0, error: error.message };
    }
  }

  // Handler IPC pour fusionner les bases de données
  ipcMain.handle('merge-database', (event, priority = null) => {
    return performMerge(priority);
  });

  // Exporter la fonction pour utilisation dans le scheduler
  global.performDatabaseMerge = performMerge;

  // Définir l'utilisateur actuel et recharger sa base de données
  ipcMain.handle('set-current-user', (event, userName) => {
    // Si userName est vide, juste nettoyer le store sans charger de base
    if (!userName || userName.trim() === '') {
      store.set('currentUser', '');
      console.log('ℹ️ Utilisateur actuel effacé (sélecteur sera affiché)');
      return;
    }

    store.set('currentUser', userName);

    // Recharger la base de données de l'utilisateur
    const { initDatabase } = require('../../services/database');
    const paths = getPaths();
    const userDbPath = path.join(paths.databases, `${userName.toLowerCase()}.db`);

    // Créer le dossier databases s'il n'existe pas
    if (!fs.existsSync(paths.databases)) {
      fs.mkdirSync(paths.databases, { recursive: true });
    }

    // Si la base de données utilisateur n'existe pas, la créer
    const isNewDb = !fs.existsSync(userDbPath);
    if (isNewDb) {
      console.log(`📂 Création de la base de données utilisateur: ${userDbPath}`);
      // La base sera créée par initDatabase
    } else {
      console.log(`📂 Chargement de la base de données utilisateur: ${userDbPath}`);
    }

    // Recharger la base de données
    const oldDb = getDb();
    if (oldDb) {
      try {
        oldDb.close();
        console.log('✅ Ancienne base de données fermée');
      } catch (error) {
        console.warn('⚠️ Erreur fermeture ancienne base:', error);
      }
    }

    // Initialiser la base de données de l'utilisateur (créera la base si elle n'existe pas)
    const newDb = initDatabase(userDbPath);

    // S'assurer que l'utilisateur existe dans la base chargée (cas d'anciens profils sans entrée users)
    try {
      const existingUser = newDb.prepare('SELECT id FROM users WHERE name = ?').get(userName);
      if (!existingUser) {
        console.log(`➕ Création automatique de l'utilisateur "${userName}" (ancienne base sans entrée users)`);
        newDb.prepare(`
          INSERT INTO users (name, emoji, color)
          VALUES (?, ?, ?)
        `).run(userName, '👤', '#8b5cf6');
      }
    } catch (error) {
      console.warn(`⚠️ Impossible de valider l'utilisateur "${userName}" dans ${userDbPath}:`, error.message);
    }

    if (global.setDbMain) {
      global.setDbMain(newDb);
      console.log(`✅ Base de données utilisateur chargée: ${userDbPath}`);
    } else {
      console.warn('⚠️ setDbMain non disponible, base de données non rechargée');
    }

    // Si c'est une nouvelle base, supprimer toutes les bases temporaires
    if (isNewDb) {
      try {
        const dbFiles = fs.readdirSync(paths.databases).filter(f => f.endsWith('.db') && f.startsWith('temp_'));
        if (dbFiles.length > 0) {
          console.log(`🗑️ Suppression de ${dbFiles.length} base(s) temporaire(s)...`);
          dbFiles.forEach(tempFile => {
            try {
              const tempDbPath = path.join(paths.databases, tempFile);
              fs.unlinkSync(tempDbPath);
              console.log(`  ✓ Base temporaire supprimée: ${tempFile}`);
            } catch (error) {
              console.warn(`  ⚠️ Impossible de supprimer ${tempFile}:`, error.message);
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors de la suppression des bases temporaires:', error.message);
      }
    }
  });

  // Gérer les préférences de contenu
  const defaultContentPreferences = {
    showMangas: true,
    showAnimes: true,
    showMovies: true,
    showSeries: true,
    showVideos: true, // Option pour masquer/afficher toute la section Vidéos
    showAdulteGame: true,
    showBooks: true,
    showSubscriptions: true
  };

  ipcMain.handle('set-content-preferences', (event, userName, preferences = {}) => {
    const userPrefs = store.get('contentPreferences', {});
    const mergedPrefs = {
      ...defaultContentPreferences,
      ...(userPrefs[userName] || {}),
      ...preferences
    };

    // Synchroniser showBooks avec showMangas : si on change showMangas, showBooks suit
    if (preferences.hasOwnProperty('showMangas')) {
      mergedPrefs.showBooks = preferences.showMangas;
    }

    // Synchroniser showVideos avec les 3 anciennes valeurs : si on change showVideos, mettre à jour les 3
    if (preferences.hasOwnProperty('showVideos')) {
      mergedPrefs.showAnimes = preferences.showVideos;
      mergedPrefs.showMovies = preferences.showVideos;
      mergedPrefs.showSeries = preferences.showVideos;
    }

    // Migration automatique : si showVideos n'existe pas, le calculer à partir des 3 anciennes valeurs
    if (mergedPrefs.showVideos === undefined) {
      mergedPrefs.showVideos = mergedPrefs.showAnimes || mergedPrefs.showMovies || mergedPrefs.showSeries;
    }

    userPrefs[userName] = mergedPrefs;
    store.set('contentPreferences', userPrefs);

    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('content-preferences-changed', userName, mergedPrefs);
    }

    return mergedPrefs;
  });

  ipcMain.handle('get-content-preferences', (event, userName) => {
    const userPrefs = store.get('contentPreferences', {});
    return {
      ...defaultContentPreferences,
      ...(userPrefs[userName] || {})
    };
  });


  // Sauvegarder la base de données pour l'utilisateur actuel
  ipcMain.handle('save-user-database', () => {
    try {
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        console.warn('Aucun utilisateur connecté, sauvegarde ignorée');
        return;
      }

      // La base de l'utilisateur est déjà sauvegardée automatiquement
      // Pas besoin de copie supplémentaire
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  });

  // Export de la base de données de l'utilisateur actuel
  ipcMain.handle('export-database', async () => {
    try {
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userDbPath = path.join(getPaths().databases, `${currentUser.toLowerCase()}.db`);
      if (!fs.existsSync(userDbPath)) {
        return { success: false, error: 'Base de données utilisateur introuvable' };
      }

      const { filePath } = await dialog.showSaveDialog(getMainWindow(), {
        title: 'Exporter la base de données',
        defaultPath: `${currentUser}-backup-${new Date().toISOString().split('T')[0]}.db`,
        filters: [
          { name: 'Base de données', extensions: ['db'] }
        ]
      });

      if (filePath) {
        fs.copyFileSync(userDbPath, filePath);
        return { success: true, path: filePath };
      }
      return { success: false };
    } catch (error) {
      console.error('Erreur export-database:', error);
      return { success: false, error: error.message };
    }
  });

  // Import de la base de données (fusionne dans la base de l'utilisateur actuel)
  ipcMain.handle('import-database', async () => {
    try {
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const { filePaths } = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Importer une base de données',
        filters: [
          { name: 'Base de données', extensions: ['db'] }
        ],
        properties: ['openFile']
      });

      if (filePaths && filePaths.length > 0) {
        // Fusionner la base importée dans la base de l'utilisateur actuel
        const userDbPath = path.join(getPaths().databases, `${currentUser.toLowerCase()}.db`);
        const Database = require('better-sqlite3');
        const sourceDb = new Database(filePaths[0], { readonly: true });
        const targetDb = getDb();

        // Utiliser la logique de fusion pour importer
        // (simplifié - on pourrait réutiliser performMerge)
        console.log('🔄 Import de la base de données...');
        // Pour l'instant, on copie simplement si la base utilisateur n'existe pas
        if (!fs.existsSync(userDbPath)) {
          fs.copyFileSync(filePaths[0], userDbPath);
          console.log('✅ Base importée');
        } else {
          // Fusionner les données
          console.log('ℹ️ Base utilisateur existante, fusion des données...');
          // Note: La fusion complète est gérée par le scheduler de synchronisation automatique
          // qui s'exécute périodiquement et au démarrage de l'application
          sourceDb.close();
        }

        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Erreur import-database:', error);
      return { success: false, error: error.message };
    }
  });

  // Analyser une base de données (pour vérification)
  ipcMain.handle('analyze-database', async (event, dbPath) => {
    try {
      const Database = require('better-sqlite3');
      const db = new Database(dbPath, { readonly: true });

      const analysis = {
        tables: [],
        obsoleteTables: [],
        newTables: [],
        stats: {},
        structure: {}
      };

      // 1. Lister toutes les tables
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
      `).all();

      tables.forEach(table => {
        try {
          const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
          analysis.tables.push({ name: table.name, count: count.count });
        } catch (e) {
          analysis.tables.push({ name: table.name, count: 0, error: e.message });
        }
      });

      // 2. Vérifier les tables obsolètes
      const obsoleteTables = [
        'adulte_game_user_games',
        'adulte_game_proprietaires',
        'adulte_game_labels',
        'adulte_game_masquees',
        'adulte_game_display_preferences',
        'user_adulte_game_display_settings',
        'adulte_game_tag_preferences',
        'adulte_game_blacklist'
      ];

      obsoleteTables.forEach(tableName => {
        const exists = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(tableName);

        if (exists) {
          analysis.obsoleteTables.push(tableName);
        }
      });

      // 3. Vérifier les nouvelles tables
      const newTables = ['adulte_game_games', 'adulte_game_user_data', 'user_preferences'];
      newTables.forEach(tableName => {
        const exists = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(tableName);

        if (exists) {
          try {
            const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
            analysis.newTables.push({ name: tableName, count: count.count });
          } catch (e) {
            analysis.newTables.push({ name: tableName, count: 0, error: e.message });
          }
        }
      });

      // 4. Statistiques principales
      try {
        analysis.stats.manga_series = db.prepare('SELECT COUNT(*) as count FROM manga_series').get().count;
      } catch (e) { analysis.stats.manga_series = 0; }

      try {
        analysis.stats.manga_tomes = db.prepare('SELECT COUNT(*) as count FROM manga_tomes').get().count;
      } catch (e) { analysis.stats.manga_tomes = 0; }

      try {
        analysis.stats.animes = db.prepare('SELECT COUNT(*) as count FROM anime_series').get().count;
      } catch (e) { analysis.stats.animes = 0; }

      try {
        analysis.stats.games = db.prepare('SELECT COUNT(*) as count FROM adulte_game_games').get().count;
      } catch (e) { analysis.stats.games = 0; }

      try {
        analysis.stats.users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      } catch (e) { analysis.stats.users = 0; }

      // 5. Structure des tables principales
      try {
        const manga_seriesColumns = db.pragma('table_info(manga_series)');
        analysis.structure.manga_series = {
          columnCount: manga_seriesColumns.length,
          columns: manga_seriesColumns.map(c => c.name)
        };
      } catch (e) { analysis.structure.manga_series = { error: e.message }; }

      try {
        const animeColumns = db.pragma('table_info(anime_series)');
        analysis.structure.anime_series = {
          columnCount: animeColumns.length,
          columns: animeColumns.map(c => c.name)
        };
      } catch (e) { analysis.structure.anime_series = { error: e.message }; }

      try {
        const gameColumns = db.pragma('table_info(adulte_game_games)');
        analysis.structure.adulte_game_games = {
          columnCount: gameColumns.length,
          columns: gameColumns.map(c => c.name)
        };
      } catch (e) { analysis.structure.adulte_game_games = { error: e.message }; }

      db.close();
      return { success: true, analysis };
    } catch (error) {
      console.error('Erreur analyze-database:', error);
      return { success: false, error: error.message };
    }
  });

  // Supprimer les données d'un utilisateur (lecture uniquement)
  ipcMain.handle('delete-user-data', async (event, userName) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      console.log(`🗑️ Suppression des données de l'utilisateur: ${userName}`);

      const userId = getUserIdByName(db, userName);
      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      const deleteMangaUserData = db.prepare('DELETE FROM manga_user_data WHERE user_id = ?');
      const resultMangaUserData = deleteMangaUserData.run(userId);
      console.log(`  ✓ ${resultMangaUserData.changes} données utilisateur mangas supprimées`);

      const deleteAnimeUserData = db.prepare('DELETE FROM anime_user_data WHERE user_id = ?');
      const resultAnimeUserData = deleteAnimeUserData.run(userId);
      console.log(`  ✓ ${resultAnimeUserData.changes} données utilisateur animes supprimées`);

      const deleteAdulteGameMasquees = db.prepare('UPDATE adulte_game_user_data SET is_hidden = 0 WHERE user_id = ? AND is_hidden = 1');
      const resultAdulteGameMasquees = deleteAdulteGameMasquees.run(userId);
      console.log(`  ✓ ${resultAdulteGameMasquees.changes} jeux adultes masqués réinitialisés`);

      const dbFolder = getPaths().databases;
      const userDbPath = path.join(dbFolder, `${userName.toLowerCase()}.db`);
      if (fs.existsSync(userDbPath)) {
        fs.unlinkSync(userDbPath);
        console.log(`  ✓ Base de données utilisateur supprimée: ${userDbPath}`);
      }

      console.log(`✅ Toutes les données de ${userName} ont été supprimées`);
      return { success: true };
    } catch (error) {
      console.error('Erreur delete-user-data:', error);
      return { success: false, error: error.message };
    }
  });

  // Supprimer TOUTES les données (réinitialiser l'application)
  ipcMain.handle('delete-all-data', async () => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      try {
        db.close();
      } catch (err) {
        console.warn('⚠️ Erreur lors de la fermeture de la DB:', err.message);
      }

      const configsDir = getPaths().configs;
      if (fs.existsSync(configsDir)) {
        fs.rmSync(configsDir, { recursive: true, force: true });
      }

      const coversDir = getPaths().covers;
      if (fs.existsSync(coversDir)) {
        fs.rmSync(coversDir, { recursive: true, force: true });
      }

      const configPath = store.path;
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur delete-all-data:', error);
      return { success: false, error: error.message };
    }
  });

  // Quitter l'application (avec option de redémarrage)
  ipcMain.handle('quit-app', async (event, options = {}) => {
    try {
      const { shouldRelaunch = false } = options;

      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const dbFolder = getPaths().databases;
        if (!fs.existsSync(dbFolder)) {
          fs.mkdirSync(dbFolder, { recursive: true });
        }

        const userDbPath = path.join(dbFolder, `${currentUser.toLowerCase()}.db`);
        // La base utilisateur est déjà créée, pas besoin de copie
      }

      setTimeout(() => {
        const { app } = require('electron');

        if (shouldRelaunch) {
          app.relaunch();
          app.exit(0);
        } else {
          app.exit(0);
        }
      }, 500);

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde finale:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerDatabaseHandlers };
