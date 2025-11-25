const { syncTraductions, syncTraductionsForExistingGames, searchTranslationForGame } = require('../../services/adulte-game/traduction-sync');
const { notifyGameUpdate } = require('../../services/adulte-game/discord-notifier');
const { fetchWithSession, fetchWithPuppeteer, parseF95ZoneGameData } = require('./utils');
const { recordSyncError } = require('../../utils/sync-error-reporter');
const { generateReport } = require('../../utils/report-generator');
const { updateFieldIfNotUserModified } = require('../../utils/enrichment-helpers');

const PLATFORM_F95 = 'F95Zone';
const PLATFORM_LEWDCORNER = 'LewdCorner';

// État global pour la gestion pause/resume/stop
let currentUpdateCheckToken = null;
let cancelUpdateCheckRequested = false;
let pausedUpdateCheck = false;

const createUpdateCheckToken = () => Symbol('adulte-game-update-check-run');

const isCancellationRequested = (token) => cancelUpdateCheckRequested && currentUpdateCheckToken === token;
const isPaused = () => pausedUpdateCheck;

function resetUpdateCheckState(token) {
  if (currentUpdateCheckToken === token) {
    currentUpdateCheckToken = null;
    cancelUpdateCheckRequested = false;
    pausedUpdateCheck = false;
  }
}

function cancelUpdateCheck() {
  if (!currentUpdateCheckToken) {
    return { success: false, reason: 'no-run' };
  }
  cancelUpdateCheckRequested = true;
  console.log('🛑 [Vérification MAJ] Demande d\'arrêt reçue pour la vérification des mises à jour jeux adultes.');
  return { success: true };
}

function pauseUpdateCheck() {
  if (!currentUpdateCheckToken) {
    return { success: false, reason: 'no-run' };
  }
  pausedUpdateCheck = true;
  console.log('⏸️ [Vérification MAJ] Vérification des mises à jour mise en pause.');
  return { success: true };
}

function resumeUpdateCheck() {
  if (!currentUpdateCheckToken) {
    return { success: false, reason: 'no-run' };
  }
  pausedUpdateCheck = false;
  console.log('▶️ [Vérification MAJ] Reprise de la vérification des mises à jour.');
  return { success: true };
}

function normalizeString(value) {
  return (value || '').toString().trim().toLowerCase();
}

function resolvePlatformInfo(game) {
  const normalizedPlatform = normalizeString(game?.plateforme);
  const normalizedLink = normalizeString(game?.lien_f95);

  const containsLewd = (str) => str.includes('lewd');
  const containsF95 = (str) => str.includes('f95');

  if (containsLewd(normalizedPlatform)) {
    return { platform: PLATFORM_LEWDCORNER, baseUrl: 'https://lewdcorner.com/threads/', source: 'plateforme' };
  }

  if (containsF95(normalizedPlatform)) {
    return { platform: PLATFORM_F95, baseUrl: 'https://f95zone.to/threads/', source: 'plateforme' };
  }

  if (containsLewd(normalizedLink)) {
    return { platform: PLATFORM_LEWDCORNER, baseUrl: 'https://lewdcorner.com/threads/', source: 'lien_f95' };
  }

  if (containsF95(normalizedLink)) {
    return { platform: PLATFORM_F95, baseUrl: 'https://f95zone.to/threads/', source: 'lien_f95' };
  }

  if (game?.f95_thread_id) {
    // Par défaut, considérer les jeux inconnus comme F95Zone pour ne pas casser les anciens enregistrements,
    // tout en continuant à ignorer LewdCorner explicitement détecté.
    return { platform: PLATFORM_F95, baseUrl: 'https://f95zone.to/threads/', source: 'fallback' };
  }

  return { platform: null, baseUrl: null, source: null };
}

/**
 * Fonction interne pour vérifier les MAJ (Google Sheet + F95Zone) pour tous les jeux existants
 * @param {object} db - Instance de la base de données
 * @param {object} store - Instance electron-store
 * @param {number|null} gameId - ID du jeu spécifique (null pour tous les jeux)
 * @param {object} event - Objet event d'Electron pour envoyer des événements de progression (optionnel)
 * @param {Function} getPathManager - Fonction pour obtenir le PathManager (optionnel)
 * @param {boolean} force - Si true, ignore user_modified_fields (force vérification)
 * @returns {Promise<object>} Résultat de la vérification
 */
async function performAdulteGameUpdatesCheck(db, store, gameId = null, event = null, getPathManager = null, force = false) {
    const runToken = createUpdateCheckToken();
    currentUpdateCheckToken = runToken;
    cancelUpdateCheckRequested = false;
    pausedUpdateCheck = false;
    
    const startTime = Date.now();
    
    try {
      if (!db) {
        console.warn('⚠️ Vérification MAJ: base de données indisponible, opération annulée');
        return { checked: 0, updated: 0, sheetSynced: 0, warning: 'db_unavailable' };
      }
      const traductionConfig = store ? store.get('traductionConfig', {
        discordWebhookUrl: '',
        discordMentions: {},
        discordNotifyGameUpdates: true,
        discordNotifyTranslationUpdates: true
      }) : { discordWebhookUrl: '', discordMentions: {}, discordNotifyGameUpdates: true, discordNotifyTranslationUpdates: true };
      const discordWebhookUrl = (traductionConfig.discordWebhookUrl || '').trim();
      const discordMentions = traductionConfig.discordMentions || {};
      const notifyGameUpdates = traductionConfig.discordNotifyGameUpdates !== false;
      const notifyTranslationUpdates = traductionConfig.discordNotifyTranslationUpdates !== false;
      
      if (gameId) {
        console.log('🔄 Vérification MAJ pour ce jeu...');
      } else {
        console.log('🔄 Vérification MAJ globale...');
      }
      
      // Envoyer événement de démarrage
      if (event && !gameId) {
        event.sender.send('adulte-game-updates-progress', {
          phase: 'start',
          total: 0,
          current: 0,
          message: 'Démarrage de la vérification...'
        });
      }
      
      // ÉTAPE 1 : Synchronisation Google Sheet
      console.log('\n📊 ÉTAPE 1/2 : Synchronisation Google Sheet...');
      
      // Envoyer événement pour la phase Google Sheet
      if (event && !gameId) {
        event.sender.send('adulte-game-updates-progress', {
          phase: 'sheet',
          total: 0,
          current: 0,
          message: 'Synchronisation Google Sheet...'
        });
      }
      let sheetResult = { matched: 0, notFound: 0 };
      try {
        if (gameId) {
          console.log(`🔍 Recherche de traduction pour le jeu ID ${gameId}...`);
          const searchResult = await searchTranslationForGame(db, gameId);
          
          if (searchResult.success && searchResult.found) {
            console.log(`✅ Traduction trouvée: ${searchResult.traductions} traduction(s)`);
            console.log(`   📝 Traducteur: ${searchResult.traducteur || 'N/A'}`);
            console.log(`   📝 Version: ${searchResult.version || 'N/A'}`);
            console.log(`   📝 Type: ${searchResult.type || 'N/A'}`);
            sheetResult = { matched: 1, notFound: 0 };
          } else {
            console.log(`ℹ️ Aucune traduction trouvée pour ce jeu dans le Google Sheet`);
            sheetResult = { matched: 0, notFound: 1 };
          }
        } else {
          // Synchronisation pour TOUS les traducteurs mais UNIQUEMENT pour les jeux existants
          console.log(`📊 Synchronisation traductions pour jeux existants (tous traducteurs)...`);
          const syncResult = await syncTraductionsForExistingGames(db, {
            discordWebhookUrl,
            discordMentions,
            notifyGameUpdates,
            notifyTranslationUpdates,
            getPathManager
          });
          if (syncResult.success) {
            sheetResult = syncResult;
            console.log(`✅ Google Sheet: ${syncResult.matched} jeux avec traduction(s), ${syncResult.updated} mis à jour`);
          } else {
            console.warn('⚠️ Google Sheet: Erreur de synchronisation');
          }
        }
      } catch (error) {
        console.error('❌ Google Sheet: Échec de la synchronisation', error.message);
        recordSyncError({
          entityType: 'adulte-game',
          entityId: gameId || 'GLOBAL',
          entityName: gameId ? `Jeu adulte ${gameId}` : 'Synchronisation Google Sheet',
          operation: gameId ? 'performUpdatesCheck:sheet-single' : 'performUpdatesCheck:sheet-all',
          error,
          context: {
            scope: gameId ? 'single' : 'global'
          }
        });
      }
      
      // ÉTAPE 2 : Scraping F95Zone
      console.log('\n🌐 ÉTAPE 2/2 : Scraping F95Zone...');
      
      let query = `
        SELECT id, f95_thread_id, titre, game_version, game_statut, game_engine, tags, couverture_url, maj_disponible, lien_f95, traducteur, traductions_multiples, game_site
        FROM adulte_game_games 
        WHERE f95_thread_id IS NOT NULL`;
      
      if (gameId) {
        query += ` AND id = ${gameId}`;
      }
      
      const games = db.prepare(query).all();
      
      if (games.length === 0) {
        console.log('⚠️ Aucun jeu adulte à vérifier (aucun f95_thread_id)');
        if (event && !gameId) {
          event.sender.send('adulte-game-updates-progress', {
            phase: 'complete',
            total: 0,
            current: 0,
            message: 'Aucun jeu à vérifier'
          });
        }
        return { checked: 0, updated: 0, sheetSynced: sheetResult.matched };
      }
      
      if (gameId) {
        console.log(`🎯 Vérification MAJ pour: ${games[0]?.titre || 'jeu inconnu'}`);
      } else {
        console.log(`🔍 Vérification des MAJ pour ${games.length} jeux adultes via scraping...`);
        // Envoyer événement pour la phase scraping avec le total
        if (event) {
          event.sender.send('adulte-game-updates-progress', {
            phase: 'scraping',
            total: games.length,
            current: 0,
            message: `Vérification de ${games.length} jeux...`
          });
        }
      }
      
      let updatedCount = 0;
      let scrapedCount = 0;
      const reportData = {
        updated: [],
        failed: [],
        sheetSynced: []
      };
      
      for (let i = 0; i < games.length; i++) {
        // Vérifier l'annulation
        if (isCancellationRequested(runToken)) {
          console.log('⏹️ [Vérification MAJ] Arrêt demandé, interruption de la vérification.');
          break;
        }

        // Attendre si en pause
        while (isPaused() && !isCancellationRequested(runToken)) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (isCancellationRequested(runToken)) {
          console.log('⏹️ [Vérification MAJ] Arrêt demandé pendant la pause.');
          break;
        }

        if (i % 3 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
        
        const game = games[i];
        
        // Calculer les statistiques de progression
        const elapsedMs = Date.now() - startTime;
        const processed = i + 1;
        const speed = processed / (elapsedMs / 60000); // jeux par minute
        const remainingCount = games.length - processed;
        const etaMs = isFinite(speed) && speed > 0 ? (remainingCount / speed) * 60000 : null;
        
        let resolvedPlatform = null;
        let baseUrl = null;
        let source = null;
        try {
          const f95Id = game.f95_thread_id;
          const platformInfo = resolvePlatformInfo(game);
          resolvedPlatform = platformInfo.platform;
          baseUrl = platformInfo.baseUrl;
          source = platformInfo.source;

          if (!resolvedPlatform) {
            const reason = source ? `source ${source}` : 'plateforme inconnue';
            console.log(`⏭️ ${game.titre}: plateforme non déterminée (${reason}), vérification ignorée`);
            continue;
          }

          if (resolvedPlatform === PLATFORM_LEWDCORNER) {
            console.log(`⏭️ ${game.titre}: plateforme LewdCorner détectée (${source || 'données'}), mise à jour via Google Sheet uniquement`);
            continue;
          }

          if (resolvedPlatform !== PLATFORM_F95) {
            console.log(`ℹ️ ${game.titre}: plateforme ${resolvedPlatform} non prise en charge pour le scraping automatique`);
            continue;
          }

          if (!baseUrl) {
            console.log(`⚠️ ${game.titre}: URL de base manquante pour la plateforme ${resolvedPlatform}, vérification ignorée`);
            continue;
          }

          const threadUrl = `${baseUrl}${f95Id}/`;
          const platformLabel = resolvedPlatform;
          
          if (gameId) {
            console.log(`🔍 Scraping ${platformLabel} en cours...`);
          } else {
            console.log(`🌐 Vérif MAJ [${i + 1}/${games.length}]: ${game.titre} (${platformLabel})`);
            // Envoyer événement de progression avec statistiques détaillées
            if (event) {
              event.sender.send('adulte-game-updates-progress', {
                phase: 'scraping',
                total: games.length,
                current: processed,
                message: `Vérification: ${game.titre}`,
                gameTitle: game.titre,
                elapsedMs: elapsedMs,
                etaMs: etaMs,
                speed: isFinite(speed) ? speed : null,
                updated: updatedCount,
                sheetSynced: sheetResult.matched
              });
            }
          }

          scrapedCount++;
          
          // Utiliser directement Puppeteer pour récupérer le DOM complet avec JavaScript exécuté
          // Cela garantit de récupérer tous les tags, même ceux chargés dynamiquement
          let html = await fetchWithPuppeteer(threadUrl);
          
          // Fallback vers fetch classique si Puppeteer échoue
          if (!html) {
            console.log(`  ⚠️ Puppeteer a échoué pour "${game.titre}", fallback vers fetch classique...`);
            const response = await fetchWithSession(threadUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (!response.ok) {
              console.warn(`⚠️ Erreur HTTP ${response.status} pour "${game.titre}"`);
              continue;
            }
            
            html = response.body;
          }
          
          // Utiliser la fonction commune de parsing
          let gameData;
          try {
            gameData = parseF95ZoneGameData(html);
          } catch (error) {
            console.warn(`⚠️ Erreur parsing pour "${game.titre}": ${error.message}`);
            continue;
          }
          
          const titleToSave = gameData.name.trim() || game.titre;
          const versionToSave = gameData.version || '';
          const developerToSave = gameData.developer || '';
          const versionValueForCompare = versionToSave;
          const versionDbValue = versionValueForCompare || null;
          const currentVersionValue = (game.game_version || '').trim();
          
          // Utiliser le moteur détecté, ou garder celui existant si pas trouvé
          const engine = gameData.engine !== 'Autre' ? gameData.engine : (game.game_engine || 'Autre');
          const status = gameData.status;
          const tags = gameData.tags;
          const tagsString = tags.join(',');
          
          // Utiliser l'image détectée, ou garder celle existante si pas trouvée
          let image = gameData.image || game.couverture_url;
          
          const normalizeStatus = (statutJeu) => {
            if (!statutJeu) return 'Ongoing';
            const upper = statutJeu.toUpperCase();
            if (upper === 'EN COURS' || upper === 'ONGOING') return 'Ongoing';
            if (upper === 'TERMINÉ' || upper === 'COMPLETED') return 'Completed';
            if (upper === 'ABANDONNÉ' || upper === 'ABANDONED') return 'Abandoned';
            return statutJeu;
          };
          
          const hasLocalImage = game.couverture_url && !game.couverture_url.startsWith('http://') && !game.couverture_url.startsWith('https://');
          
          const developerValueForCompare = developerToSave;
          const developerDbValue = developerValueForCompare || null;
          const currentDeveloperValue = (game.game_developer || '').trim();
          const developerChanged = developerValueForCompare !== currentDeveloperValue;
          
          const versionChanged = versionValueForCompare !== currentVersionValue;
          const statusChanged = normalizeStatus(status) !== normalizeStatus(game.game_statut);
          const engineChanged = engine !== game.game_engine;
          const tagsChanged = tagsString !== (game.tags || '');
          const imageChanged = !hasLocalImage && (image !== game.couverture_url);
          const titleChanged = titleToSave !== game.titre;
          const platformChanged = platformLabel !== (game.game_site || platformLabel);
          
          // Seuls ces changements déclenchent une notification de mise à jour
          const shouldSignalUpdate = versionChanged || statusChanged || titleChanged;
          
          // Tous les changements sont enregistrés, mais seuls certains signalent une mise à jour
          const hasChanges =
            versionChanged ||
            statusChanged ||
            engineChanged ||
            tagsChanged ||
            imageChanged ||
            developerChanged ||
            titleChanged ||
            platformChanged;
          
          if (hasChanges) {
            console.log(`🔄 MAJ détectée pour "${game.titre}":`);
            if (titleChanged) console.log(`  - Titre: ${game.titre} → ${titleToSave}`);
            if (versionChanged) console.log(`  - Version: ${game.game_version || '—'} → ${versionValueForCompare || '—'}`);
            if (statusChanged) console.log(`  - Statut: ${game.game_statut || '—'} → ${status}`);
            if (engineChanged) console.log(`  - Moteur: ${game.game_engine || '—'} → ${engine} (mise à jour silencieuse)`);
            if (tagsChanged) console.log(`  - Tags mis à jour (mise à jour silencieuse)`);
            if (imageChanged) console.log(`  - Image mise à jour (mise à jour silencieuse)`);
            if (developerChanged) console.log(`  - Développeur: ${currentDeveloperValue || '—'} → ${developerValueForCompare || '—'} (mise à jour silencieuse)`);
            if (platformChanged) console.log(`  - Plateforme: ${game.game_site || '—'} → ${platformLabel} (mise à jour silencieuse)`);
            if (hasLocalImage) console.log(`  ℹ️ Image locale conservée (non écrasée)`);
            
            // Normaliser le statut avant utilisation
            let statutJeu;
            switch (status) {
              case 'Completed':
                statutJeu = 'TERMINÉ';
                break;
              case 'Abandoned':
                statutJeu = 'ABANDONNÉ';
                break;
              default:
                statutJeu = 'EN COURS';
            }
            
            // Ne signaler une mise à jour que pour les changements importants
            if (shouldSignalUpdate && game.maj_disponible === 0) {
              updatedCount++;
              const changes = [];
              if (versionChanged) {
                changes.push(`Version: ${game.game_version || '—'} → ${versionValueForCompare || '—'}`);
              }
              if (statusChanged) {
                changes.push(`Statut: ${game.game_statut || '—'} → ${statutJeu || '—'}`);
              }
              if (titleChanged) {
                changes.push(`Titre: ${game.titre || '—'} → ${titleToSave || '—'}`);
              }
              if (engineChanged) {
                changes.push(`Moteur: ${game.game_engine || '—'} → ${engine || '—'}`);
              }
              if (developerChanged) {
                changes.push(`Développeur: ${currentDeveloperValue || '—'} → ${developerValueForCompare || '—'}`);
              }
              if (tagsChanged) {
                changes.push('Tags mis à jour');
              }
              if (imageChanged) {
                changes.push('Image mise à jour');
              }
              if (platformChanged) {
                changes.push(`Plateforme: ${game.game_site || '—'} → ${platformLabel || '—'}`);
              }
              
              reportData.updated.push({
                titre: game.titre,
                id: game.id,
                f95_thread_id: game.f95_thread_id,
                plateforme: platformLabel,
                version: versionValueForCompare || game.game_version || null,
                statut: statutJeu || game.game_statut || null,
                changes: changes
              });
              console.log(`  ✅ Nouvelle mise à jour signalée (${versionChanged ? 'Version' : ''}${versionChanged && statusChanged ? ', ' : ''}${statusChanged ? 'Statut' : ''}${(versionChanged || statusChanged) && titleChanged ? ', ' : ''}${titleChanged ? 'Titre' : ''})`);

            if (discordWebhookUrl && versionChanged && notifyGameUpdates) {
              const mentionMap = Object.fromEntries(
                Object.entries(discordMentions).map(([key, value]) => [
                  key.trim().toLowerCase(),
                  String(value || '').replace(/[^0-9]/g, '').trim()
                ]).filter(([key, value]) => key.length > 0 && value.length > 0)
              );

              let traducteurString = game.traducteur || '';
              if (!traducteurString && game.traductions_multiples) {
                const { safeJsonParse } = require('../common-helpers');
                const parsed = safeJsonParse(game.traductions_multiples, []);
                const names = parsed
                  .map(entry => entry.traducteur)
                  .filter(Boolean);
                if (names.length > 0) {
                  traducteurString = Array.from(new Set(names)).join(', ');
                }
              }

                await notifyGameUpdate({
                  webhookUrl: discordWebhookUrl,
                  gameTitle: titleToSave,
                  changes: [{
                    label: 'Version du jeu',
                    oldValue: game.game_version || 'Aucune',
                    newValue: versionValueForCompare || 'Aucune',
                    type: 'version',
                    traducteur: traducteurString
                  }],
                  threadUrl: threadUrl,
                  platform: platformLabel,
                  coverUrl: image || game.couverture_url || null,
                  mentionMap
                });
              }
            } else if (shouldSignalUpdate && game.maj_disponible === 1) {
              console.log(`  ℹ️ Mise à jour déjà signalée, mise à jour des données uniquement`);
              // Ajouter quand même au rapport mais sans incrémenter updatedCount
              const changes = [];
              if (versionChanged) {
                changes.push(`Version: ${game.game_version || '—'} → ${versionValueForCompare || '—'}`);
              }
              if (statusChanged) {
                changes.push(`Statut: ${game.game_statut || '—'} → ${statutJeu || '—'}`);
              }
              if (titleChanged) {
                changes.push(`Titre: ${game.titre || '—'} → ${titleToSave || '—'}`);
              }
              if (engineChanged) {
                changes.push(`Moteur: ${game.game_engine || '—'} → ${engine || '—'}`);
              }
              if (developerChanged) {
                changes.push(`Développeur: ${currentDeveloperValue || '—'} → ${developerValueForCompare || '—'}`);
              }
              if (tagsChanged) {
                changes.push('Tags mis à jour');
              }
              if (imageChanged) {
                changes.push('Image mise à jour');
              }
              if (platformChanged) {
                changes.push(`Plateforme: ${game.game_site || '—'} → ${platformLabel || '—'}`);
              }
              
              reportData.updated.push({
                titre: game.titre,
                id: game.id,
                f95_thread_id: game.f95_thread_id,
                plateforme: platformLabel,
                version: versionValueForCompare || game.game_version || null,
                statut: statutJeu || game.game_statut || null,
                changes: changes,
                alreadySignaled: true
              });
            } else if (!shouldSignalUpdate) {
              console.log(`  ℹ️ Changements mineurs détectés, mise à jour silencieuse (pas de signalement)`);
              // Ajouter quand même au rapport pour visibilité complète
              const changes = [];
              if (engineChanged) {
                changes.push(`Moteur: ${game.game_engine || '—'} → ${engine || '—'}`);
              }
              if (developerChanged) {
                changes.push(`Développeur: ${currentDeveloperValue || '—'} → ${developerValueForCompare || '—'}`);
              }
              if (tagsChanged) {
                changes.push('Tags mis à jour');
              }
              if (imageChanged) {
                changes.push('Image mise à jour');
              }
              if (platformChanged) {
                changes.push(`Plateforme: ${game.game_site || '—'} → ${platformLabel || '—'}`);
              }
              
              if (changes.length > 0) {
                reportData.updated.push({
                  titre: game.titre,
                  id: game.id,
                  f95_thread_id: game.f95_thread_id,
                  plateforme: platformLabel,
                  changes: changes,
                  minor: true
                });
              }
            }
            
            const imageToSave = hasLocalImage ? game.couverture_url : image;
            
            // Ne mettre maj_disponible à 1 que si un changement important est détecté
            const majDisponibleValue = shouldSignalUpdate ? 1 : (game.maj_disponible || 0);
            
            // Récupérer les champs protégés par l'utilisateur
            const currentGame = db.prepare('SELECT user_modified_fields FROM adulte_game_games WHERE id = ?').get(game.id);
            const userModifiedFields = currentGame?.user_modified_fields || null;
            
            // Utiliser updateFieldIfNotUserModified pour respecter les champs protégés (sauf si force)
            const fieldsUpdated = [];
            if (updateFieldIfNotUserModified(db, 'adulte_game_games', game.id, 'titre', titleToSave, userModifiedFields, force)) {
              fieldsUpdated.push('titre');
            }
            if (updateFieldIfNotUserModified(db, 'adulte_game_games', game.id, 'game_version', versionDbValue, userModifiedFields, force)) {
              fieldsUpdated.push('game_version');
            }
            if (updateFieldIfNotUserModified(db, 'adulte_game_games', game.id, 'game_statut', statutJeu, userModifiedFields, force)) {
              fieldsUpdated.push('game_statut');
            }
            if (updateFieldIfNotUserModified(db, 'adulte_game_games', game.id, 'game_engine', engine, userModifiedFields, force)) {
              fieldsUpdated.push('game_engine');
            }
            if (updateFieldIfNotUserModified(db, 'adulte_game_games', game.id, 'game_developer', developerDbValue, userModifiedFields, force)) {
              fieldsUpdated.push('game_developer');
            }
            if (updateFieldIfNotUserModified(db, 'adulte_game_games', game.id, 'game_site', platformLabel, userModifiedFields, force)) {
              fieldsUpdated.push('game_site');
            }
            if (updateFieldIfNotUserModified(db, 'adulte_game_games', game.id, 'tags', tagsString, userModifiedFields, force)) {
              fieldsUpdated.push('tags');
            }
            if (updateFieldIfNotUserModified(db, 'adulte_game_games', game.id, 'couverture_url', imageToSave, userModifiedFields, force)) {
              fieldsUpdated.push('couverture_url');
            }
            
            // Toujours mettre à jour maj_disponible, derniere_verif et updated_at
            db.prepare(`
              UPDATE adulte_game_games 
              SET maj_disponible = ?,
                  derniere_verif = datetime('now'),
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(majDisponibleValue, game.id);
            
            if (fieldsUpdated.length > 0) {
              console.log(`  ✅ Champs mis à jour: ${fieldsUpdated.join(', ')}`);
            }
          } else {
            db.prepare(`
              UPDATE adulte_game_games 
              SET maj_disponible = 0,
                  derniere_verif = datetime('now')
              WHERE id = ?
            `).run(game.id);
            console.log(`  ✅ Aucun changement détecté`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Erreur vérif MAJ "${game.titre}":`, error.message);
          reportData.failed.push({
            titre: game.titre || 'Sans titre',
            error: error.message || String(error),
            id: game.id,
            f95_thread_id: game.f95_thread_id,
            plateforme: resolvedPlatform || 'Inconnue'
          });
          recordSyncError({
            entityType: 'adulte-game',
            entityId: game.id,
            entityName: game.titre,
            operation: 'performUpdatesCheck:scraping',
            error,
            context: {
              gameId: game.id,
              f95ThreadId: game.f95_thread_id,
              platform: resolvedPlatform,
              platformSource: source,
              baseUrl
            }
          });
        }
      }
      
      if (gameId) {
        if (updatedCount > 0) {
          console.log(`\n✅ Mise à jour détectée !`);
        } else {
          console.log(`\n✅ Aucune mise à jour disponible`);
        }
      } else {
        console.log(`\n✅ === RÉCAPITULATIF === `);
        console.log(`📊 Google Sheet: ${sheetResult.matched} jeux synchronisés`);
        console.log(`🌐 Scraping F95: ${scrapedCount} jeux vérifiés, ${updatedCount} MAJ détectées`);
        console.log(`✅ Vérification MAJ terminée`);
        
        // Envoyer événement de fin avec statistiques complètes
        const totalElapsedMs = Date.now() - startTime;
        if (event) {
          event.sender.send('adulte-game-updates-progress', {
            phase: 'complete',
            total: games.length,
            current: games.length,
            message: `Terminé: ${updatedCount} mise(s) à jour détectée(s)`,
            updated: updatedCount,
            sheetSynced: sheetResult.matched,
            elapsedMs: totalElapsedMs,
            speed: scrapedCount > 0 && totalElapsedMs > 0 ? (scrapedCount / (totalElapsedMs / 60000)) : null
          });
        }
      }
      
      const summary = { 
        checked: games.length, 
        updated: updatedCount,
        sheetSynced: sheetResult.matched
      };
      
      // Générer le rapport d'état
      if (getPathManager && !gameId) {
        const durationMs = Date.now() - startTime;
        generateReport(getPathManager, {
          type: 'adulte-game-updates-check',
          stats: {
            total: games.length,
            checked: games.length,
            updated: updatedCount,
            sheetSynced: sheetResult.matched,
            scraped: scrapedCount,
            errors: reportData.failed.length
          },
          created: [],
          updated: reportData.updated,
          failed: reportData.failed,
          metadata: {
            duration: durationMs
          }
        });
      }
      
      if (store) {
        store.set('adulte_game_last_check', {
          timestamp: new Date().toISOString(),
          ...summary
        });
      }
      
      return summary;
      
    } catch (error) {
      console.error('Erreur check-adulte-game-updates:', error);
      recordSyncError({
        entityType: 'adulte-game',
        entityId: gameId || 'GLOBAL',
        entityName: gameId ? `Jeu adulte ${gameId}` : 'Vérification MAJ jeux adultes',
        operation: 'performUpdatesCheck:global',
        error
      });
      throw error;
    } finally {
      resetUpdateCheckState(runToken);
    }
}

/**
 * Enregistre les handlers IPC pour la vérification des mises à jour
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerAdulteGameUpdatesCheckHandlers(ipcMain, getDb, store, getPathManager) {
  
  // MARQUER COMME VU - Réinitialiser le flag MAJ
  ipcMain.handle('mark-adulte-game-update-seen', (event, id) => {
    try {
      const db = getDb();
      
      db.prepare(`
        UPDATE adulte_game_games 
        SET maj_disponible = 0,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(id);
      
      // Retirer l'ID de la liste des notifications déjà envoyées
      const rawState = store.get('notificationState', {});
      const notifiedGameIds = new Set(rawState.notifiedAdulteGameIds || []);
      if (notifiedGameIds.has(id)) {
        notifiedGameIds.delete(id);
        const updatedState = {
          ...rawState,
          notifiedAdulteGameIds: Array.from(notifiedGameIds)
        };
        store.set('notificationState', updatedState);
        console.log(`  ✅ Notification retirée de l'historique pour jeu (ID: ${id})`);
      }
      
      console.log(`✅ MAJ marquée comme vue pour jeu adulte (ID: ${id})`);
      
      return { success: true };
      
    } catch (error) {
      console.error('Erreur mark-adulte-game-update-seen:', error);
      throw error;
    }
  });
  
  // VÉRIFICATION MAJ - Vérifier mises à jour via scraping
  ipcMain.handle('check-adulte-game-updates', async (event, gameId = null, force = false) => {
    try {
      const db = getDb();
      return await performAdulteGameUpdatesCheck(db, store, gameId, event, getPathManager, force);
    } catch (error) {
      console.error('Erreur check-adulte-game-updates:', error);
      // Envoyer événement d'erreur
      if (event) {
        event.sender.send('adulte-game-updates-progress', {
          phase: 'error',
          total: 0,
          current: 0,
          message: `Erreur: ${error.message}`
        });
      }
      throw error;
    }
  });

  // ARRÊTER la vérification des mises à jour
  ipcMain.handle('stop-adulte-game-updates-check', async () => {
    try {
      const result = cancelUpdateCheck();
      if (!result.success) {
        return { success: false, error: 'Aucune vérification en cours' };
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur arrêt vérification MAJ jeux adultes:', error);
      return { success: false, error: error.message };
    }
  });

  // METTRE EN PAUSE la vérification des mises à jour
  ipcMain.handle('pause-adulte-game-updates-check', async () => {
    try {
      const result = pauseUpdateCheck();
      if (!result.success) {
        return { success: false, error: 'Aucune vérification en cours' };
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur pause vérification MAJ jeux adultes:', error);
      return { success: false, error: error.message };
    }
  });

  // REPRENDRE la vérification des mises à jour
  ipcMain.handle('resume-adulte-game-updates-check', async () => {
    try {
      const result = resumeUpdateCheck();
      if (!result.success) {
        return { success: false, error: 'Aucune vérification en pause' };
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur reprise vérification MAJ jeux adultes:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { 
  registerAdulteGameUpdatesCheckHandlers, 
  performAdulteGameUpdatesCheck,
  cancelUpdateCheck,
  pauseUpdateCheck,
  resumeUpdateCheck
};
