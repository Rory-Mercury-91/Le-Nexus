/**
 * Logique de synchronisation des traductions jeux adultes
 * Orchestration principale de la synchronisation depuis Google Sheets vers la base de données
 */

const { fetchGoogleSheet } = require('./traduction-google-sheets');
const { extractF95Id } = require('./traduction-parsers');
const {
  ensureTranslationColumns,
  updateGameWithTranslation,
  createGameWithTranslation,
  updateGameTranslationsOnly,
  updateExistingGameTranslations,
  isGameBlacklisted,
  deleteGame
} = require('./traduction-db-operations');
const {
  filterByTraducteurs,
  groupTranslationsById,
  buildTranslationsArray,
  determinePlateforme,
  findActiveEntry,
  filterCoverImageUrl,
  separateActiveInactive,
  getPlatformKeyFromSite,
  getPlatformKeyFromLink,
  resolveEntryPlatformKey
} = require('./traduction-data-processor');
const { notifyGameUpdate } = require('./discord-notifier');
const { recordSyncError } = require('../../utils/sync-error-reporter');
const { generateReport } = require('../../utils/report-generator');

/**
 * Normalise la version depuis le Google Sheet
 * Retourne la version telle quelle (sans transformation)
 * @param {string|null|undefined} version - Version à normaliser
 * @returns {string|null} - Version normalisée ou null
 */
function normalizeVersionFromSheet(version) {
  if (!version || typeof version !== 'string') {
    return null;
  }
  
  const trimmed = version.trim();
  
  // Si vide, retourner null
  if (trimmed === '') {
    return null;
  }
  
  // Retourner la version telle quelle (support de "Final", "Completed", etc.)
  return trimmed;
}

function normalizePlatform(value, link = '') {
  const normalized = (value || '').toString().toLowerCase();
  if (normalized.includes('lewd')) return 'lewdcorner';
  if (normalized.includes('f95')) return 'f95zone';
  if (normalized.includes('itch')) return 'itch';
  const linkKey = getPlatformKeyFromLink(link);
  if (linkKey !== 'unknown') return linkKey;
  return 'unknown';
}


function computeChanges(existingGame, activeEntry) {
  if (!existingGame || !activeEntry) {
    return [];
  }

  const changes = [];
  const previousVersion = existingGame.version || '';
  // Normaliser la nouvelle version (conserver telle quelle)
  const rawNewVersion = activeEntry.version || '';
  const normalizedNewVersion = normalizeVersionFromSheet(rawNewVersion);
  const fallbackTraducteur = activeEntry.traducteur || existingGame.traducteur || null;

  if (normalizedNewVersion && normalizedNewVersion !== previousVersion) {
    changes.push({
      label: 'Version du jeu',
      oldValue: previousVersion,
      newValue: normalizedNewVersion,
      type: 'version',
      traducteur: fallbackTraducteur
    });
  }

  const previousTranslationVersion = existingGame.version_traduite || '';
  const newTranslationVersion = activeEntry.versionTraduite || '';

  if (newTranslationVersion && newTranslationVersion !== previousTranslationVersion) {
    const traducteur = fallbackTraducteur || '';
    const translationLink = activeEntry.lienTraduction || existingGame.lien_traduction || '';
    changes.push({
      label: 'Version de traduction',
      oldValue: previousTranslationVersion || 'Aucune',
      newValue: newTranslationVersion,
      type: 'translation',
      traducteur: traducteur || null,
      link: translationLink || null
    });
  }

  return changes;
}

function resolveThreadUrl(existingGame, fallbackLink) {
  if (existingGame?.lien_f95 && /^https?:\/\//i.test(existingGame.lien_f95)) {
    return existingGame.lien_f95;
  }
  return fallbackLink || null;
}

function buildMentionMap(rawMentions = {}) {
  const mentionMap = {};
  Object.entries(rawMentions).forEach(([key, value]) => {
    const normalizedKey = typeof key === 'string' ? key.trim().toLowerCase() : '';
    const normalizedValue = typeof value === 'string' || typeof value === 'number'
      ? String(value).trim()
      : '';
    if (normalizedKey && normalizedValue) {
      mentionMap[normalizedKey] = normalizedValue;
    }
  });
  return mentionMap;
}

function filterChangesByNotifications(changes, { notifyGameUpdates = true, notifyTranslationUpdates = true } = {}) {
  if (!Array.isArray(changes)) {
    return [];
  }

  return changes.filter(change => {
    if (change?.type === 'version' && !notifyGameUpdates) {
      return false;
    }
    if (change?.type === 'translation' && !notifyTranslationUpdates) {
      return false;
    }
    return true;
  });
}

/**
 * Synchronise les traductions avec la base de données
 * @param {object} db - Instance de la base de données
 * @param {Array<string>} traducteurs - Liste des traducteurs à suivre
 * @param {object} [options]
 * @param {string} [options.discordWebhookUrl]
 * @returns {Promise<object>} Résultat de la synchronisation
 */
async function syncTraductions(db, traducteurs, options = {}) {
  const syncStart = Date.now();
  try {
    console.log('🔄 Début synchronisation traductions...');
    const {
      discordWebhookUrl = '',
      discordMentions = {},
      notifyGameUpdates = true,
      notifyTranslationUpdates = true,
      getPathManager = null
    } = options;
    const mentionMap = buildMentionMap(discordMentions);
    
    // Créer les colonnes si elles n'existent pas
    ensureTranslationColumns(db);
    
    // Récupérer les données du sheet
    const sheetData = await fetchGoogleSheet();
    
    // Récupérer tous les jeux adultes pour détecter si première sync
    const adulteGames = db.prepare(`
      SELECT 
        id,
        f95_thread_id,
        Lewdcorner_thread_id,
        lien_f95,
        lien_lewdcorner,
        titre,
        traductions_multiples,
        game_version as version,
        version_traduite,
        traducteur,
        game_site as plateforme,
        couverture_url
      FROM adulte_game_games
    `).all();
    
    const isFirstSync = adulteGames.length === 0;
    
    console.log(isFirstSync 
      ? '🆕 Première synchronisation détectée (import complet)'
      : '🔄 Synchronisation incrémentale (TRUE + FALSE)'
    );
    
    // Filtrer par traducteurs
    let filteredData = filterByTraducteurs(sheetData, traducteurs);
    
    // NE PLUS filtrer par actif=TRUE car :
    // - TRUE = version actuelle pour auto-check et mise à jour du jeu
    // - FALSE = anciennes versions, autres saisons, plateformes sans auto-check (LewdCorner)
    console.log(`📋 ${filteredData.length} traductions récupérées (TRUE + FALSE)`);
    
    // Séparer TRUE et FALSE pour traitement différencié
    separateActiveInactive(filteredData);
    
    if (filteredData.length === 0) {
      return {
        success: true,
        matched: 0,
        updated: 0,
        notFound: 0,
        message: 'Aucune traduction trouvée pour les traducteurs sélectionnés'
      };
    }
    
    let matched = 0;
    let updated = 0;
    let notFound = 0;
    let created = 0;
    const reportData = {
      created: [],
      updated: [],
      failed: [],
      ignored: [],
      matched: []
    };
    
    // ÉTAPE 1 : Synchronisation TOUTES PLATEFORMES (LewdCorner, F95Zone, autres)
    // Grouper par ID pour traiter toutes les traductions d'un même jeu ensemble
    console.log('📋 Synchronisation des jeux depuis le sheet...');
    
    const gamesById = groupTranslationsById(filteredData);
    
    for (const [compositeId, entries] of Object.entries(gamesById)) {
      const [rawId, platformKeyRaw] = compositeId.split('::');
      const basePlatformKey = platformKeyRaw || 'unknown';
      const gameThreadId = parseInt(rawId, 10);
      if (!gameThreadId) continue;
      
      // Prendre la première entrée pour les infos générales
      const firstEntry = entries[0];
      const { plateforme, threadLink, platformKey: entryPlatformKey } = determinePlateforme({ ...firstEntry, id: gameThreadId });
      const normalizedPlateforme = normalizePlatform(plateforme, threadLink);
      const entryHostKey = entryPlatformKey !== 'unknown' ? entryPlatformKey : normalizedPlateforme;
      if (basePlatformKey !== 'unknown' && entryHostKey !== basePlatformKey) {
        console.log(`ℹ️ Correction plateforme ${entryHostKey.toUpperCase()} → ${basePlatformKey.toUpperCase()} pour ID ${gameThreadId}`);
      }
      const effectivePlatformKey = basePlatformKey !== 'unknown' ? basePlatformKey : entryHostKey;
      const platformLabel = effectivePlatformKey === 'lewdcorner' ? 'LewdCorner' : 'F95Zone';
      const effectiveThreadLink = effectivePlatformKey === 'lewdcorner'
        ? `https://lewdcorner.com/threads/${gameThreadId}/`
        : `https://f95zone.to/threads/${gameThreadId}/`;
      const targetHostKey = effectivePlatformKey;
      
      // Trouver l'entrée active (TRUE) pour les infos principales du jeu
      const activeEntry = findActiveEntry(entries);
      
      // Chercher si le jeu existe déjà
      const existingGame = adulteGames.find(g => {
        // Vérifier selon la plateforme
        if (targetHostKey === 'f95zone') {
          const linkId = extractF95Id(g.lien_f95);
          const storedId = g.f95_thread_id ? parseInt(g.f95_thread_id) : null;
          const sameId = (storedId && storedId === gameThreadId) || (linkId && linkId === gameThreadId);
          if (!sameId) return false;
          if (g.lien_f95) {
            const normalizedLink = g.lien_f95.toString().toLowerCase();
            if (!normalizedLink.includes(String(gameThreadId))) {
              return false;
            }
          }
          return true;
        } else if (targetHostKey === 'lewdcorner') {
          const linkId = extractF95Id(g.lien_lewdcorner);
          const storedId = g.Lewdcorner_thread_id ? parseInt(g.Lewdcorner_thread_id) : null;
          const sameId = (storedId && storedId === gameThreadId) || (linkId && linkId === gameThreadId);
          if (!sameId) return false;
          if (g.lien_lewdcorner) {
            const normalizedLink = g.lien_lewdcorner.toString().toLowerCase();
            if (!normalizedLink.includes(String(gameThreadId))) {
              return false;
            }
          }
          return true;
        }
        return false;
      });
      
      // Construire le tableau des traductions avec le flag "actif"
      let existingTranslations = [];
      if (existingGame) {
        try {
          existingTranslations = existingGame.traductions_multiples ? JSON.parse(existingGame.traductions_multiples) : [];
        } catch (e) {
          existingTranslations = [];
        }
      }
      
      const traductions = buildTranslationsArray(entries, existingTranslations);
      
      const imageUrl = filterCoverImageUrl(activeEntry.imageUrl || null);
      
      // Vérifier si le jeu est dans la liste noire (avant toute action)
      if (isGameBlacklisted(db, gameThreadId, platformLabel)) {
        // Si le jeu est en liste noire et existe encore, le supprimer
        if (existingGame) {
          deleteGame(db, existingGame.id);
          console.log(`🗑️ ${platformLabel} supprimé (en liste noire): ${activeEntry.nom} (ID: ${gameThreadId})`);
        } else {
          console.log(`🚫 ${platformLabel} en liste noire (ignoré): ${activeEntry.nom} (ID: ${gameThreadId})`);
        }
        continue;
      }
      
      if (existingGame) {
        try {
          // Mettre à jour le jeu existant avec les données de l'entrée ACTIVE
          updateGameWithTranslation(db, existingGame.id, activeEntry, traductions, imageUrl);
          
          updated++;
          reportData.updated.push({
            titre: activeEntry.nom || existingGame.titre,
            id: existingGame.id,
            f95_thread_id: gameThreadId,
            plateforme: platformLabel,
            traducteur: activeEntry.traducteur || null,
            traductions: traductions.length
          });
          console.log(`🔄 ${platformLabel} mis à jour: ${activeEntry.nom} (${traductions.length} traduction(s))`);

          const changes = computeChanges(existingGame, activeEntry);
          const filteredChanges = filterChangesByNotifications(changes, { notifyGameUpdates, notifyTranslationUpdates });
          if (filteredChanges.length > 0) {
            await notifyGameUpdate({
              webhookUrl: discordWebhookUrl,
              gameTitle: activeEntry.nom || existingGame.titre,
              changes: filteredChanges,
              threadUrl: resolveThreadUrl(existingGame, effectiveThreadLink),
              platform: existingGame.plateforme || platformLabel,
              coverUrl: imageUrl || existingGame.couverture_url || null,
              mentionMap
            });
          }
        } catch (error) {
          reportData.failed.push({
            titre: activeEntry.nom || 'Sans titre',
            error: error.message || String(error),
            f95_thread_id: gameThreadId,
            plateforme: platformLabel
          });
          console.error(`❌ Erreur mise à jour "${activeEntry.nom}":`, error.message);
        }
      } else {
        try {
          // Créer un nouveau jeu avec les données de l'entrée ACTIVE
          const newGameId = createGameWithTranslation(db, gameThreadId, activeEntry, platformLabel, effectiveThreadLink, traductions, imageUrl);
          
          if (newGameId) {
            // Ajouter à la liste pour la suite
            adulteGames.push({
              id: newGameId,
              f95_thread_id: gameThreadId,
              lien_f95: effectiveThreadLink,
              lien_traduction: activeEntry.lienTraduction || null,
              titre: activeEntry.nom,
              traductions_multiples: JSON.stringify(traductions),
              version: activeEntry.version || null,
              version_traduite: activeEntry.versionTraduite || null,
              traducteur: activeEntry.traducteur || null,
              plateforme: platformLabel,
              couverture_url: imageUrl || null
            });
            
            created++;
            reportData.created.push({
              titre: activeEntry.nom,
              id: newGameId,
              f95_thread_id: gameThreadId,
              plateforme: platformLabel,
              traducteur: activeEntry.traducteur || null,
              traductions: traductions.length
            });
            console.log(`🆕 ${platformLabel} créé: ${activeEntry.nom} (ID: ${gameThreadId}, ${traductions.length} traduction(s))`);
          }
        } catch (error) {
          reportData.failed.push({
            titre: activeEntry.nom || 'Sans titre',
            error: error.message || String(error),
            f95_thread_id: gameThreadId,
            plateforme: platformLabel
          });
          console.error(`❌ Erreur création "${activeEntry.nom}":`, error.message);
        }
      }
    }
    
    // ÉTAPE 3 : Vérifier les jeux existants dans la BDD (recherche par ID, peu importe le traducteur)
    console.log('\n🔍 ÉTAPE 3 : Vérification des jeux existants dans la BDD...');
    let additionalUpdated = 0;
    
    for (const game of adulteGames) {
      // Extraire l'ID F95/LewdCorner (priorité aux IDs stockés, puis extraction depuis les liens)
      const gameThreadId = game.f95_thread_id || game.Lewdcorner_thread_id || extractF95Id(game.lien_f95) || extractF95Id(game.lien_lewdcorner);
      if (!gameThreadId) continue;
      // Utiliser lien_f95 ou lien_lewdcorner pour déterminer la plateforme
      const gameLink = game.lien_f95 || game.lien_lewdcorner;
      const gamePlatformKey = normalizePlatform(game.plateforme, gameLink);
      const gameHostKey = getPlatformKeyFromLink(gameLink) || gamePlatformKey;
      
      // Chercher ce jeu dans le Sheet complet (pas seulement traducteurs suivis)
      const gameTranslations = sheetData.filter(item => {
        const entryKey = resolveEntryPlatformKey(item, 'unknown');
        const effectiveKey = entryKey === 'unknown' ? gameHostKey : entryKey;
        if (effectiveKey !== gamePlatformKey) return false;
        return item.id === parseInt(gameThreadId);
      });
      
      if (gameTranslations.length > 0) {
        // Vérifier si on a déjà ces traductions (pour éviter de re-traiter)
        const alreadyProcessed = filteredData.some(item => {
          if (item.id !== parseInt(gameThreadId)) return false;
          const entryKey = resolveEntryPlatformKey(item, 'unknown');
          const effectiveKey = entryKey === 'unknown' ? gameHostKey : entryKey;
          return effectiveKey === gamePlatformKey;
        });
        if (alreadyProcessed) continue;
        
        // Ce jeu a une traduction mais par un traducteur non suivi
        const activeEntry = findActiveEntry(gameTranslations);
        const traductions = gameTranslations.map(t => ({
          version: t.versionTraduite,
          type: t.typeTraduction,
          traducteur: t.traducteur,
          lien: t.lienTraduction,
          actif: t.actif
        }));
        
        try {
          updateGameTranslationsOnly(db, game.id, activeEntry, traductions);
          
          additionalUpdated++;
          reportData.updated.push({
            titre: game.titre,
            id: game.id,
            f95_thread_id: gameThreadId,
            plateforme: game.plateforme || (gamePlatformKey === 'lewdcorner' ? 'LewdCorner' : 'F95Zone'),
            traducteur: activeEntry.traducteur || null,
            traductions: traductions.length
          });
          console.log(`🔄 Traduction trouvée pour "${game.titre}" (traducteur: ${activeEntry.traducteur}, ${traductions.length} traduction(s))`);

          const changes = computeChanges(game, activeEntry);
          const filteredChanges = filterChangesByNotifications(changes, { notifyGameUpdates, notifyTranslationUpdates });
          if (filteredChanges.length > 0) {
            const fallbackThreadUrl = game.lien_f95 || (
              gamePlatformKey === 'lewdcorner'
                ? `https://lewdcorner.com/threads/${gameThreadId}/`
                : `https://f95zone.to/threads/${gameThreadId}/`
            );
            await notifyGameUpdate({
              webhookUrl: discordWebhookUrl,
              gameTitle: activeEntry.nom || game.titre,
              changes: filteredChanges,
              threadUrl: resolveThreadUrl(game, fallbackThreadUrl),
              platform: game.plateforme || (gamePlatformKey === 'lewdcorner' ? 'LewdCorner' : 'F95Zone'),
              coverUrl: game.couverture_url || null,
              mentionMap
            });
          }
        } catch (error) {
          console.error(`❌ Erreur MAJ traduction "${game.titre}":`, error.message);
          reportData.failed.push({
            titre: game.titre,
            error: error.message || String(error),
            id: game.id,
            f95_thread_id: gameThreadId,
            plateforme: game.plateforme || (gamePlatformKey === 'lewdcorner' ? 'LewdCorner' : 'F95Zone')
          });
          recordSyncError({
            entityType: 'adulte-game',
            entityId: game.id,
            entityName: game.titre,
            operation: 'syncTraductions:update-existing-translations',
            error,
            context: {
              gameId: game.id,
              threadId: gameThreadId,
              platform: gamePlatformKey,
              activeEntry,
              traductions
            }
          });
        }
      }
    }
    
    if (additionalUpdated > 0) {
      console.log(`✅ ${additionalUpdated} jeu(x) existant(s) complété(s) avec leurs traductions`);
    }
    
    console.log(`\n✅ Synchronisation terminée: ${updated} mis à jour, ${created} créés, ${additionalUpdated} complétés`);
    
    const durationMs = Date.now() - syncStart;
    
    // Générer le rapport d'état
    if (getPathManager) {
      generateReport(getPathManager, {
        type: 'adulte-game-sync',
        stats: {
          total: filteredData.length,
          created: created,
          updated: updated + additionalUpdated,
          errors: reportData.failed.length,
          matched: matched,
          ignored: (reportData.ignored || []).length
        },
        created: reportData.created,
        updated: reportData.updated,
        failed: reportData.failed,
        ignored: reportData.ignored || [],
        matched: reportData.matched || [],
        metadata: {
          traducteurs: traducteurs || [],
          duration: durationMs,
          additional: additionalUpdated
        }
      });
    }
    
    return {
      success: true,
      matched: filteredData.length,
      updated,
      created,
      additional: additionalUpdated,
      notFound: 0,
      total: filteredData.length
    };
  } catch (error) {
    console.error('❌ Erreur sync traductions:', error);
    recordSyncError({
      entityType: 'adulte-game',
      entityId: 'GLOBAL',
      entityName: 'Synchronisation traductions',
      operation: 'syncTraductions:global',
      error
    });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Synchronise les traductions UNIQUEMENT pour les jeux existants
 * Recherche TOUTES les traductions (sans filtre traducteur) pour les jeux déjà dans la BDD
 * Ne crée JAMAIS de nouveaux jeux
 * @param {object} db - Instance de la base de données
 * @param {object} [options]
 * @param {string} [options.discordWebhookUrl]
 * @returns {Promise<object>} Résultat de la synchronisation
 */
async function syncTraductionsForExistingGames(db, options = {}) {
  const syncStart = Date.now();
  try {
    console.log('🔄 Synchronisation traductions pour jeux existants (tous traducteurs)...');
    const {
      discordWebhookUrl = '',
      discordMentions = {},
      notifyGameUpdates = true,
      notifyTranslationUpdates = true,
      getPathManager = null,
      skipReport = false
    } = options;
    const mentionMap = buildMentionMap(discordMentions);
    
    // Créer les colonnes si elles n'existent pas
    ensureTranslationColumns(db);
    
    // Récupérer toutes les données du sheet (sans filtre traducteur)
    const sheetData = await fetchGoogleSheet();
    console.log(`📋 ${sheetData.length} traductions récupérées du Google Sheet (tous traducteurs)`);
    
    // Récupérer tous les jeux adultes existants
    const adulteGames = db.prepare(`
      SELECT 
        id,
        f95_thread_id,
        Lewdcorner_thread_id,
        lien_f95,
        lien_lewdcorner,
        titre,
        traductions_multiples,
        game_version as version,
        version_traduite,
        traducteur,
        game_site as plateforme,
        couverture_url
      FROM adulte_game_games
    `).all();
    
    console.log(`🎮 ${adulteGames.length} jeu(x) existant(s) à vérifier`);
    
    let matched = 0;
    let updated = 0;
    const reportData = {
      created: [],
      updated: [],
      failed: [],
      ignored: [],
      matched: [],
      notFound: []
    };
    
    // Pour chaque jeu existant, chercher ses traductions dans le sheet
    for (const game of adulteGames) {
      // Extraire l'ID F95/LewdCorner (priorité aux IDs stockés, puis extraction depuis les liens)
      const gameThreadId = game.f95_thread_id || game.Lewdcorner_thread_id || extractF95Id(game.lien_f95) || extractF95Id(game.lien_lewdcorner);
      if (!gameThreadId) continue;
      
      // Utiliser lien_f95 ou lien_lewdcorner pour déterminer la plateforme
      const gameLink = game.lien_f95 || game.lien_lewdcorner;
      const gamePlatformKey = normalizePlatform(game.plateforme, gameLink);
      const gameHostKey = getPlatformKeyFromLink(gameLink) || gamePlatformKey;
      
      // Chercher toutes les traductions pour cet ID (tous traducteurs) correspondant à la même plateforme
      const gameTranslations = sheetData.filter(item => {
        if (item.id !== parseInt(gameThreadId)) return false;
        const entryKey = resolveEntryPlatformKey(item, 'unknown');
        const effectiveKey = entryKey === 'unknown' ? gameHostKey : entryKey;
        return effectiveKey === gamePlatformKey;
      });
      
      if (gameTranslations.length === 0) {
        // Aucune traduction trouvée pour ce jeu
        reportData.notFound = reportData.notFound || [];
        reportData.notFound.push({
          titre: game.titre,
          id: game.id,
          f95_thread_id: gameThreadId,
          plateforme: game.plateforme || (gamePlatformKey === 'lewdcorner' ? 'LewdCorner' : 'F95Zone'),
          reason: 'Aucune traduction trouvée dans le Google Sheet'
        });
        continue;
      }
      
      matched++;
      
      // Prendre l'entrée active pour les infos principales
      const activeEntry = findActiveEntry(gameTranslations);
      
      // Construire le tableau des traductions avec le flag "actif"
      let existingTranslations = [];
      try {
        existingTranslations = game.traductions_multiples ? JSON.parse(game.traductions_multiples) : [];
      } catch (e) {
        existingTranslations = [];
      }
      
      const traductions = buildTranslationsArray(gameTranslations, existingTranslations);
      
      // Ajouter au rapport des matches
      reportData.matched = reportData.matched || [];
      reportData.matched.push({
        titre: game.titre,
        id: game.id,
        f95_thread_id: gameThreadId,
        plateforme: game.plateforme || (gamePlatformKey === 'lewdcorner' ? 'LewdCorner' : 'F95Zone'),
        traducteur: activeEntry.traducteur || null,
        traductions: traductions.length,
        matchMethod: 'f95_thread_id'
      });
      
      // Filtrer l'URL de couverture si c'est LewdCorner
      const imageUrl = filterCoverImageUrl(activeEntry.imageUrl || null);
      
      // Mettre à jour le jeu avec les traductions trouvées
      try {
        updateExistingGameTranslations(db, game.id, activeEntry, traductions, imageUrl);
        
        updated++;
        reportData.updated.push({
          titre: game.titre,
          id: game.id,
          f95_thread_id: gameThreadId,
          plateforme: game.plateforme || (gamePlatformKey === 'lewdcorner' ? 'LewdCorner' : 'F95Zone'),
          traducteur: activeEntry.traducteur || null,
          traductions: traductions.length,
          version: activeEntry.version || null,
          version_traduite: activeEntry.versionTraduite || null,
          lien_traduction: activeEntry.lienTraduction || null
        });
        console.log(`✅ "${game.titre}" : ${traductions.length} traduction(s) synchronisée(s) (${gameTranslations.length} trouvée(s), traducteur: ${activeEntry.traducteur})`);

        const changes = computeChanges(game, activeEntry);
        const filteredChanges = filterChangesByNotifications(changes, { notifyGameUpdates, notifyTranslationUpdates });
        if (filteredChanges.length > 0) {
          const fallbackThreadUrl = game.lien_f95 || (game.f95_thread_id ? `https://f95zone.to/threads/${game.f95_thread_id}/` : null);
          await notifyGameUpdate({
            webhookUrl: discordWebhookUrl,
            gameTitle: activeEntry.nom || game.titre,
            changes: filteredChanges,
            threadUrl: resolveThreadUrl(game, fallbackThreadUrl),
            platform: game.plateforme || (game.lien_f95 && game.lien_f95.includes('lewdcorner') ? 'LewdCorner' : 'F95Zone'),
            coverUrl: imageUrl || game.couverture_url || null,
            mentionMap
          });
        }
      } catch (error) {
        console.error(`❌ Erreur MAJ "${game.titre}":`, error.message);
        reportData.failed.push({
          titre: game.titre,
          error: error.message || String(error),
          id: game.id,
          f95_thread_id: gameThreadId,
          plateforme: game.plateforme || (gamePlatformKey === 'lewdcorner' ? 'LewdCorner' : 'F95Zone')
        });
        recordSyncError({
          entityType: 'adulte-game',
          entityId: game.id,
          entityName: game.titre,
          operation: 'syncTraductionsForExistingGames:update-existing',
          error,
          context: {
            gameId: game.id,
            threadId: gameThreadId,
            platform: gamePlatformKey,
            translationsCount: traductions.length,
            activeEntry
          }
        });
      }
    }
    
    console.log(`\n✅ Synchronisation terminée: ${matched} jeu(x) avec traduction(s), ${updated} mis à jour`);
    
    const durationMs = Date.now() - syncStart;
    
    // Générer le rapport d'état uniquement si skipReport est false
    if (getPathManager && !skipReport) {
      generateReport(getPathManager, {
        type: 'adulte-game-sync-existing',
        stats: {
          total: adulteGames.length,
          matched: matched,
          updated: updated,
          errors: reportData.failed.length,
          notFound: (reportData.notFound || []).length,
          ignored: (reportData.ignored || []).length
        },
        created: reportData.created,
        updated: reportData.updated,
        failed: reportData.failed,
        ignored: reportData.ignored || [],
        matched: reportData.matched || [],
        metadata: {
          duration: durationMs
        }
      });
    }
    
    return {
      success: true,
      matched,
      updated,
      notFound: (reportData.notFound || []).length,
      total: adulteGames.length,
      reportData: reportData // Retourner les données du rapport pour accumulation
    };
  } catch (error) {
    console.error('❌ Erreur sync traductions pour jeux existants:', error);
    recordSyncError({
      entityType: 'adulte-game',
      entityId: 'GLOBAL',
      entityName: 'Synchronisation jeux existants',
      operation: 'syncTraductionsForExistingGames:global',
      error
    });
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  syncTraductions,
  syncTraductionsForExistingGames,
  filterByTraducteurs
};
