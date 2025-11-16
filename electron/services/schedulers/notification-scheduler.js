const cron = require('node-cron');
const { Notification } = require('electron');
const fetch = require('electron-fetch').default;
const { getAniListIdFromMAL } = require('../../apis/anilist');
const { getUserIdByName } = require('../../handlers/common-helpers');

class NotificationScheduler {
  constructor() {
    this.task = null;
    this.config = null;
    this.db = null;
    this.store = null;
    this.context = {
      getDb: null,
      getMainWindow: null,
      getPathManager: null,
    };
  }

  /**
   * Initialise le scheduler de notifications
   * @param {object} config - Configuration utilisateur des notifications
   * @param {object} db - Instance courante de la base de données
   * @param {object} store - Instance electron-store
   * @param {object} context - Fournisseurs optionnels { getDb, getMainWindow, getPathManager }
   */
  init(config, db, store, context = {}) {
    this.config = {
      ...config,
      frequency: config.frequency || '12h',
    };
    this.db = db;
    this.store = store;
    this.context = {
      getDb: context.getDb || null,
      getMainWindow: context.getMainWindow || null,
      getPathManager: context.getPathManager || null,
    };

    if (this.task) {
      this.task.stop();
    }

    if (this.config.enabled && this.config.frequency !== 'manual') {
      const cronExpression = this.getCronExpression(this.config.frequency);

      this.task = cron.schedule(cronExpression, async () => {
        console.log('🔔 Vérification notifications programmée...');
        await this.checkForUpdates();
      });

      console.log(`✅ Notification scheduler initialisé (fréquence: ${this.config.frequency})`);
    } else {
      console.log('⏸️  Notification scheduler désactivé (mode manuel ou service inactif)');
    }

    if (this.config.enabled && this.config.checkOnStartup) {
      setTimeout(async () => {
        await this.performStartupChecks();
        await this.checkForUpdates();
      }, 5000);
    }
  }

  getCronExpression(frequency) {
    switch (frequency) {
      case '6h':
        return '0 */6 * * *';
      case '12h':
        return '0 */12 * * *';
      case 'daily':
        return '0 9 * * *';
      default:
        return '0 9 * * *';
    }
  }

  async performStartupChecks() {
    try {
      const tasks = [];

      // Synchronisation MAL si nécessaire
      if (this.config.checkAnimes || this.config.notifyMalSync || this.config.notifyEnrichment) {
        const malScheduler = require('./mal-sync-scheduler');
        tasks.push(
          malScheduler
            .syncOnStartup(
              this.db,
              this.store,
              this.context.getDb || null,
              this.context.getPathManager || null,
              this.context.getMainWindow || null
            )
            .catch((err) => console.warn('⚠️ Sync MAL au démarrage (notifications) ignorée:', err.message))
        );
      }

      // Vérification MAJ jeux adultes si nécessaire
      if (this.config.checkAdulteGame) {
        const adulteGameScheduler = require('./adulte-game-update-scheduler');
        const { performAdulteGameUpdatesCheck } = require('../../handlers/adulte-game/adulte-game-updates-check-handlers');
        tasks.push(
          adulteGameScheduler
            .checkOnStartup(() => performAdulteGameUpdatesCheck(this.db, this.store, null))
            .catch((err) => console.warn('⚠️ Vérification jeux adultes au démarrage ignorée:', err.message))
        );
      }

      // Synchronisation Nautiljon si nécessaire
      if (this.config.notifyNautiljonSync) {
        const nautiljonScheduler = require('./nautiljon-sync-scheduler');
        const mainWindow = this.context.getMainWindow ? this.context.getMainWindow() : null;
        const pathManager = this.context.getPathManager ? this.context.getPathManager() : null;
        tasks.push(
          nautiljonScheduler
            .syncOnStartup(this.db, this.store, mainWindow, pathManager)
            .catch((err) => console.warn('⚠️ Sync Nautiljon au démarrage ignorée:', err.message))
        );
      }

      await Promise.allSettled(tasks);
    } catch (error) {
      console.warn('⚠️ Erreur lors des vérifications de démarrage (notifications):', error.message);
    }
  }

  async checkForUpdates() {
    try {
      const notifications = [];
      const rawState = this.store.get('notificationState', {});
      const state = {
        lastNautiljonNotified: rawState.lastNautiljonNotified || null,
        lastMalSyncNotified: rawState.lastMalSyncNotified || null,
        lastBackupNotified: rawState.lastBackupNotified || null,
        enrichment: {
          anime: rawState.enrichment?.anime || null,
          manga: rawState.enrichment?.manga || null,
        },
      };
      const stateUpdates = {
        ...state,
        enrichment: { ...state.enrichment },
      };

      if (this.config.checkAnimes) {
        const animeNotifs = await this.checkAnimeUpdates();
        notifications.push(...animeNotifs);
      }

      if (this.config.checkAdulteGame) {
        const adulteGameNotifs = await this.checkAdulteGameUpdates();
        notifications.push(...adulteGameNotifs);
      }

      if (this.config.notifyNautiljonSync) {
        const nautNotif = this.buildNautiljonNotification(state.lastNautiljonNotified);
        if (nautNotif) {
          notifications.push(nautNotif);
          stateUpdates.lastNautiljonNotified = nautNotif.metaTimestamp;
        }
      }

      if (this.config.notifyMalSync) {
        const malNotif = this.buildMalNotification(state.lastMalSyncNotified);
        if (malNotif) {
          notifications.push(malNotif);
          stateUpdates.lastMalSyncNotified = malNotif.metaTimestamp;
        }
      }

      if (this.config.notifyEnrichment) {
        const enrichmentNotifs = this.buildEnrichmentNotifications(state.enrichment);
        enrichmentNotifs.forEach((notif) => {
          notifications.push(notif);
          if (notif.metaType && notif.metaTimestamp) {
            stateUpdates.enrichment[notif.metaType] = notif.metaTimestamp;
          }
        });
      }

      if (this.config.notifyBackup) {
        const backupNotif = this.buildBackupNotification(state.lastBackupNotified);
        if (backupNotif) {
          notifications.push(backupNotif);
          stateUpdates.lastBackupNotified = backupNotif.metaTimestamp;
        }
      }

      notifications.forEach((notif) => this.sendNotification(notif));
      this.store.set('notificationState', stateUpdates);

      console.log(`✅ Vérification terminée: ${notifications.length} notification(s) envoyée(s)`);
      return { success: true, count: notifications.length };
    } catch (error) {
      console.error('❌ Erreur vérification notifications:', error);
      return { success: false, error: error.message };
    }
  }

  async checkAnimeUpdates() {
    try {
      const notifications = [];
      const currentUser = this.store.get('currentUser', '');

      if (!currentUser) return notifications;

      const userId = getUserIdByName(this.db, currentUser);
      if (!userId) return notifications;

      const animes = this.db
        .prepare(
          `
        SELECT 
          a.id,
          a.mal_id,
          a.titre,
          a.nb_episodes,
          COALESCE(
            (SELECT COUNT(DISTINCT episode_numero) 
             FROM anime_episodes_vus 
             WHERE anime_id = a.id AND user_id = ? AND vu = 1),
            0
          ) as episodes_vus
        FROM anime_series a
        LEFT JOIN anime_statut_utilisateur asu ON a.id = asu.anime_id AND asu.user_id = ?
        WHERE a.user_id_ajout = ?
        AND (asu.statut_visionnage = 'watching' OR asu.statut_visionnage IS NULL)
        AND a.mal_id IS NOT NULL
      `
        )
        .all(userId, userId, userId);

      console.log(`🔍 Vérification de ${animes.length} animes en cours...`);

      for (const anime of animes) {
        try {
          const anilistId = await getAniListIdFromMAL(anime.mal_id);
          if (!anilistId) continue;

          const latestEpisode = await this.getLatestEpisodeFromAniList(anilistId);

          if (latestEpisode && latestEpisode > anime.episodes_vus) {
            notifications.push({
              type: 'anime',
              title: '🎬 Nouvel épisode disponible !',
              body: `${anime.titre} - Épisode ${latestEpisode}`,
              animeId: anime.id,
            });
          }
        } catch (error) {
          console.error(`Erreur vérification anime ${anime.titre}:`, error);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return notifications;
    } catch (error) {
      console.error('❌ Erreur checkAnimeUpdates:', error);
      return [];
    }
  }

  async getLatestEpisodeFromAniList(anilistId) {
    try {
      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            nextAiringEpisode {
              episode
            }
            episodes
          }
        }
      `;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { id: anilistId } }),
      });

      const data = await response.json();
      const media = data.data?.Media;

      if (!media) return null;

      if (media.nextAiringEpisode) {
        return media.nextAiringEpisode.episode - 1;
      }

      return media.episodes || null;
    } catch (error) {
      console.error('Erreur getLatestEpisodeFromAniList:', error);
      return null;
    }
  }

  async checkAdulteGameUpdates() {
    try {
      const notifications = [];
      const currentUser = this.store.get('currentUser', '');

      if (!currentUser) return notifications;

      const userId = getUserIdByName(this.db, currentUser);
      if (!userId) return notifications;

      const games = this.db
        .prepare(
          `
        SELECT DISTINCT g.id, g.titre, g.version, g.version_disponible
        FROM adulte_game_games g
        INNER JOIN adulte_game_proprietaires p ON g.id = p.game_id
        WHERE p.user_id = ?
        AND g.maj_disponible = 1
      `
        )
        .all(userId);

      console.log(`🔍 ${games.length} jeux adultes avec MAJ disponible`);

      games.forEach((game) => {
        // Utiliser version_disponible si disponible, sinon version (qui a été mise à jour)
        const currentVersion = game.version || '—';
        const newVersion = game.version_disponible || game.version || '—';
        
        // Si les versions sont identiques, afficher simplement qu'une MAJ est disponible
        const versionText = currentVersion === newVersion 
          ? `Version: ${currentVersion}`
          : `v${currentVersion} → v${newVersion}`;
        
        notifications.push({
          type: 'adulte-game',
          title: '🎮 Mise à jour jeu adulte disponible !',
          body: `${game.titre}\n${versionText}`,
          adulteGameId: game.id,
        });
      });

      return notifications;
    } catch (error) {
      console.error('❌ Erreur checkAdulteGameUpdates:', error);
      return [];
    }
  }

  buildNautiljonNotification(lastNotified) {
    const lastSync = this.store.get('nautiljon_last_sync', null);
    if (!lastSync || !lastSync.timestamp) {
      return null;
    }

    if (lastNotified === lastSync.timestamp) {
      return null;
    }

    const synced = lastSync.synced ?? lastSync.gamesSynced ?? 0;
    const errors = lastSync.errors ?? 0;
    const total = lastSync.total ?? synced;

    return {
      type: 'nautiljon-sync',
      title: '📚 Synchronisation Nautiljon terminée',
      body: `${synced} série(s) synchronisée(s) / ${total}${errors > 0 ? ` • ${errors} erreur(s)` : ''}`,
      metaTimestamp: lastSync.timestamp,
    };
  }

  buildMalNotification(lastNotified) {
    const lastSync = this.store.get('mal_last_sync', null);
    if (!lastSync || !lastSync.timestamp) {
      return null;
    }

    if (lastNotified === lastSync.timestamp) {
      return null;
    }

    const mangas = lastSync.mangas ?? 0;
    const animes = lastSync.animes ?? 0;

    return {
      type: 'mal-sync',
      title: '🤝 Synchronisation MAL terminée',
      body: `Mangas synchronisés : ${mangas} • Animes synchronisés : ${animes}`,
      metaTimestamp: lastSync.timestamp,
    };
  }

  buildEnrichmentNotifications(lastEnrichmentState) {
    const notifications = [];
    const anime = this.store.get('anime_enrichment_last', null);
    const manga = this.store.get('manga_enrichment_last', null);

    if (anime?.timestamp && lastEnrichmentState.anime !== anime.timestamp) {
      notifications.push({
        type: 'enrichment-anime',
        title: '✨ Enrichissement anime terminé',
        body: `${anime.stats?.enriched || 0} anime(s) enrichi(s)` + (anime.stats?.errors ? ` • ${anime.stats.errors} erreur(s)` : ''),
        metaTimestamp: anime.timestamp,
        metaType: 'anime',
      });
    }

    if (manga?.timestamp && lastEnrichmentState.manga !== manga.timestamp) {
      notifications.push({
        type: 'enrichment-manga',
        title: '✨ Enrichissement manga terminé',
        body: `${manga.stats?.enriched || 0} manga(s) enrichi(s)` + (manga.stats?.errors ? ` • ${manga.stats.errors} erreur(s)` : ''),
        metaTimestamp: manga.timestamp,
        metaType: 'manga',
      });
    }

    return notifications;
  }

  buildBackupNotification(lastNotified) {
    const backupConfig = this.store.get('backupConfig', {});
    const lastBackup = backupConfig.lastBackup;
    if (!lastBackup) {
      return null;
    }

    if (lastNotified === lastBackup) {
      return null;
    }

    return {
      type: 'backup',
      title: '💾 Sauvegarde automatique terminée',
      body: `Sauvegarde réalisée le ${new Date(lastBackup).toLocaleString()}`,
      metaTimestamp: lastBackup,
    };
  }

  sendNotification(notif) {
    try {
      const notification = new Notification({
        title: notif.title,
        body: notif.body,
        icon: null,
        silent: !this.config.soundEnabled,
      });

      notification.show();
      notification.on('click', () => {
        console.log('Notification cliquée:', notif.type || notif.title);
      });

      console.log(`🔔 Notification envoyée: ${notif.title}`);
    } catch (error) {
      console.error('❌ Erreur envoi notification:', error);
    }
  }

  stop() {
    if (this.task) {
      this.task.stop();
      console.log('🛑 Notification scheduler arrêté');
    }
  }
}

module.exports = new NotificationScheduler();
