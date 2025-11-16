const { syncTraductions, syncTraductionsForExistingGames, searchTranslationForGame } = require('../../services/adulte-game/traduction-sync');
const { notifyGameUpdate } = require('../../services/adulte-game/discord-notifier');
const { fetchWithSession, fetchWithPuppeteer, parseF95ZoneGameData } = require('./utils');
const { recordSyncError } = require('../../utils/sync-error-reporter');

const PLATFORM_F95 = 'F95Zone';
const PLATFORM_LEWDCORNER = 'LewdCorner';

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
 * @returns {Promise<object>} Résultat de la vérification
 */
async function performAdulteGameUpdatesCheck(db, store, gameId = null, event = null) {
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
            notifyTranslationUpdates
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
        SELECT id, f95_thread_id, titre, version, statut_jeu, moteur, tags, couverture_url, maj_disponible, lien_f95, traducteur, traductions_multiples, plateforme
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
      
      for (let i = 0; i < games.length; i++) {
        if (i % 3 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
        
        const game = games[i];
        
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
            // Envoyer événement de progression
            if (event) {
              event.sender.send('adulte-game-updates-progress', {
                phase: 'scraping',
                total: games.length,
                current: i + 1,
                message: `Vérification: ${game.titre}`,
                gameTitle: game.titre
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
          const currentVersionValue = (game.version || '').trim();
          
          // Utiliser le moteur détecté, ou garder celui existant si pas trouvé
          const engine = gameData.engine !== 'Autre' ? gameData.engine : (game.moteur || 'Autre');
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
          const currentDeveloperValue = (game.developpeur || '').trim();
          const developerChanged = developerValueForCompare !== currentDeveloperValue;
          
          const versionChanged = versionValueForCompare !== currentVersionValue;
          const statusChanged = normalizeStatus(status) !== normalizeStatus(game.statut_jeu);
          const engineChanged = engine !== game.moteur;
          const tagsChanged = tagsString !== (game.tags || '');
          const imageChanged = !hasLocalImage && (image !== game.couverture_url);
          const titleChanged = titleToSave !== game.titre;
          const platformChanged = platformLabel !== (game.plateforme || platformLabel);
          
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
            if (versionChanged) console.log(`  - Version: ${game.version || '—'} → ${versionValueForCompare || '—'}`);
            if (statusChanged) console.log(`  - Statut: ${game.statut_jeu} → ${status}`);
            if (engineChanged) console.log(`  - Moteur: ${game.moteur} → ${engine}`);
            if (tagsChanged) console.log(`  - Tags mis à jour`);
            if (imageChanged) console.log(`  - Image mise à jour`);
            if (developerChanged) console.log(`  - Développeur: ${currentDeveloperValue || '—'} → ${developerValueForCompare || '—'}`);
            if (platformChanged) console.log(`  - Plateforme: ${game.plateforme || '—'} → ${platformLabel}`);
            if (hasLocalImage) console.log(`  ℹ️ Image locale conservée (non écrasée)`);
            
            if (game.maj_disponible === 0) {
              updatedCount++;
              console.log(`  ✅ Nouvelle mise à jour signalée`);

            if (discordWebhookUrl && versionChanged && notifyGameUpdates) {
              const mentionMap = Object.fromEntries(
                Object.entries(discordMentions).map(([key, value]) => [
                  key.trim().toLowerCase(),
                  String(value || '').replace(/[^0-9]/g, '').trim()
                ]).filter(([key, value]) => key.length > 0 && value.length > 0)
              );

              let traducteurString = game.traducteur || '';
              if (!traducteurString && game.traductions_multiples) {
                try {
                  const parsed = JSON.parse(game.traductions_multiples);
                  const names = parsed
                    .map(entry => entry.traducteur)
                    .filter(Boolean);
                  if (names.length > 0) {
                    traducteurString = Array.from(new Set(names)).join(', ');
                  }
                } catch (error) {
                  // ignore parse error
                }
              }

                await notifyGameUpdate({
                  webhookUrl: discordWebhookUrl,
                  gameTitle: titleToSave,
                  changes: [{
                    label: 'Version du jeu',
                    oldValue: game.version || 'Aucune',
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
            } else {
              console.log(`  ℹ️ Mise à jour déjà signalée, mise à jour des données uniquement`);
            }
            
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
            
            const imageToSave = hasLocalImage ? game.couverture_url : image;
            
            db.prepare(`
              UPDATE adulte_game_games 
              SET titre = ?,
                  version = ?,
                  version_disponible = ?,
                  statut_jeu = ?,
                  moteur = ?,
                  developpeur = ?,
                  plateforme = ?,
                  tags = ?,
                  couverture_url = ?,
                  maj_disponible = 1,
                  derniere_verif = datetime('now'),
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(
              titleToSave,
              versionDbValue,
              versionDbValue, // Mettre à jour version_disponible avec la nouvelle version
              statutJeu,
              engine,
              developerDbValue,
              platformLabel,
              tagsString,
              imageToSave,
              game.id
            );
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
        
        // Envoyer événement de fin
        if (event) {
          event.sender.send('adulte-game-updates-progress', {
            phase: 'complete',
            total: games.length,
            current: games.length,
            message: `Terminé: ${updatedCount} mise(s) à jour détectée(s)`,
            updated: updatedCount,
            sheetSynced: sheetResult.matched
          });
        }
      }
      
      const summary = { 
        checked: games.length, 
        updated: updatedCount,
        sheetSynced: sheetResult.matched
      };
      
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
    }
}

/**
 * Enregistre les handlers IPC pour la vérification des mises à jour
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerAdulteGameUpdatesCheckHandlers(ipcMain, getDb, store) {
  
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
      
      console.log(`✅ MAJ marquée comme vue pour jeu adulte (ID: ${id})`);
      
      return { success: true };
      
    } catch (error) {
      console.error('Erreur mark-adulte-game-update-seen:', error);
      throw error;
    }
  });
  
  // VÉRIFICATION MAJ - Vérifier mises à jour via scraping
  ipcMain.handle('check-adulte-game-updates', async (event, gameId = null) => {
    try {
      const db = getDb();
      return await performAdulteGameUpdatesCheck(db, store, gameId, event);
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
}

module.exports = { registerAdulteGameUpdatesCheckHandlers, performAdulteGameUpdatesCheck };
