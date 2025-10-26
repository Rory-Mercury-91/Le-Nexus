const cron = require('node-cron');
const { Notification } = require('electron');
const fetch = require('electron-fetch').default;

class NotificationScheduler {
  constructor() {
    this.task = null;
    this.config = null;
    this.db = null;
    this.store = null;
  }

  /**
   * Initialise le scheduler de notifications
   * @param {object} config - Configuration { enabled, checkAnimes, checkAvn, frequency, soundEnabled, checkOnStartup }
   * @param {object} db - Instance de la base de données
   * @param {object} store - Instance electron-store
   */
  init(config, db, store) {
    this.config = config;
    this.db = db;
    this.store = store;

    if (this.task) {
      this.task.stop();
    }

    if (config.enabled && config.frequency !== 'manual') {
      const cronExpression = this.getCronExpression(config.frequency);
      
      this.task = cron.schedule(cronExpression, async () => {
        console.log('🔔 Vérification notifications programmée...');
        await this.checkForUpdates();
      });

      console.log(`✅ Notification scheduler initialisé (fréquence: ${config.frequency})`);
    }

    // Vérification au démarrage si activé
    if (config.checkOnStartup) {
      setTimeout(() => this.checkForUpdates(), 5000); // Attendre 5s après le démarrage
    }
  }

  /**
   * Convertit la fréquence en expression cron
   * @param {string} frequency - '6h', '12h', 'daily'
   * @returns {string} Expression cron
   */
  getCronExpression(frequency) {
    switch (frequency) {
      case '6h':
        return '0 */6 * * *'; // Toutes les 6 heures
      case '12h':
        return '0 */12 * * *'; // Toutes les 12 heures
      case 'daily':
        return '0 9 * * *'; // Tous les jours à 9h
      default:
        return '0 9 * * *';
    }
  }

  /**
   * Vérifie les mises à jour (animes + AVN)
   */
  async checkForUpdates() {
    try {
      const notifications = [];

      if (this.config.checkAnimes) {
        const animeNotifs = await this.checkAnimeUpdates();
        notifications.push(...animeNotifs);
      }

      if (this.config.checkAvn) {
        const avnNotifs = await this.checkAvnUpdates();
        notifications.push(...avnNotifs);
      }

      // Envoyer les notifications
      notifications.forEach(notif => this.sendNotification(notif));

      console.log(`✅ Vérification terminée: ${notifications.length} notification(s)`);
      
      return { success: true, count: notifications.length };
    } catch (error) {
      console.error('❌ Erreur vérification notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vérifie les nouveaux épisodes d'animes
   */
  async checkAnimeUpdates() {
    try {
      const notifications = [];
      const currentUser = this.store.get('currentUser', '');

      if (!currentUser) return notifications;

      // Récupérer les animes "En cours" de l'utilisateur
      const animes = this.db.prepare(`
        SELECT 
          a.id,
          a.mal_id,
          a.titre,
          a.nb_episodes,
          COALESCE(
            (SELECT COUNT(DISTINCT episode_numero) 
             FROM anime_episodes_vus 
             WHERE anime_id = a.id AND utilisateur = ? AND vu = 1),
            0
          ) as episodes_vus
        FROM anime_series a
        LEFT JOIN anime_statut_utilisateur asu ON a.id = asu.anime_id AND asu.utilisateur = ?
        WHERE a.utilisateur_ajout = ?
        AND (asu.statut_visionnage = 'watching' OR asu.statut_visionnage IS NULL)
        AND a.mal_id IS NOT NULL
      `).all(currentUser, currentUser, currentUser);

      console.log(`🔍 Vérification de ${animes.length} animes en cours...`);

      // Vérifier chaque anime via AniList
      for (const anime of animes) {
        try {
          const anilistId = await this.getAniListIdFromMAL(anime.mal_id);
          if (!anilistId) continue;

          const latestEpisode = await this.getLatestEpisodeFromAniList(anilistId);
          
          if (latestEpisode && latestEpisode > anime.episodes_vus) {
            notifications.push({
              type: 'anime',
              title: '🎬 Nouvel épisode disponible !',
              body: `${anime.titre} - Épisode ${latestEpisode}`,
              animeId: anime.id
            });
          }
        } catch (error) {
          console.error(`Erreur vérification anime ${anime.titre}:`, error);
        }

        // Attendre un peu entre chaque requête API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return notifications;
    } catch (error) {
      console.error('❌ Erreur checkAnimeUpdates:', error);
      return [];
    }
  }

  /**
   * Récupère l'ID AniList depuis un MAL ID
   */
  async getAniListIdFromMAL(malId) {
    try {
      const query = `
        query ($malId: Int) {
          Media(idMal: $malId, type: ANIME) {
            id
          }
        }
      `;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { malId } })
      });

      const data = await response.json();
      return data.data?.Media?.id || null;
    } catch (error) {
      console.error('Erreur getAniListIdFromMAL:', error);
      return null;
    }
  }

  /**
   * Récupère le dernier épisode disponible depuis AniList
   */
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
        body: JSON.stringify({ query, variables: { id: anilistId } })
      });

      const data = await response.json();
      const media = data.data?.Media;

      if (!media) return null;

      // Si nextAiringEpisode existe, le dernier épisode sorti est episode - 1
      if (media.nextAiringEpisode) {
        return media.nextAiringEpisode.episode - 1;
      }

      // Sinon, tous les épisodes sont sortis
      return media.episodes || null;
    } catch (error) {
      console.error('Erreur getLatestEpisodeFromAniList:', error);
      return null;
    }
  }

  /**
   * Vérifie les mises à jour AVN
   */
  async checkAvnUpdates() {
    try {
      const notifications = [];
      const currentUser = this.store.get('currentUser', '');

      if (!currentUser) return notifications;

      // Récupérer les jeux AVN avec MAJ disponible et non encore notifiés
      const games = this.db.prepare(`
        SELECT DISTINCT g.id, g.titre, g.version, g.version_disponible
        FROM avn_games g
        INNER JOIN avn_proprietaires p ON g.id = p.game_id
        WHERE p.utilisateur = ?
        AND g.maj_disponible = 1
      `).all(currentUser);

      console.log(`🔍 ${games.length} AVN avec MAJ disponible`);

      games.forEach(game => {
        notifications.push({
          type: 'avn',
          title: '🎮 Mise à jour AVN disponible !',
          body: `${game.titre}\nv${game.version} → v${game.version_disponible}`,
          avnId: game.id
        });
      });

      return notifications;
    } catch (error) {
      console.error('❌ Erreur checkAvnUpdates:', error);
      return [];
    }
  }

  /**
   * Envoie une notification desktop
   */
  sendNotification(notif) {
    try {
      const notification = new Notification({
        title: notif.title,
        body: notif.body,
        icon: null, // Peut être personnalisé avec l'icône de l'app
        silent: !this.config.soundEnabled
      });

      notification.show();

      // Gérer le clic sur la notification
      notification.on('click', () => {
        console.log('Notification cliquée:', notif);
        // TODO: Ouvrir la page correspondante dans l'app
      });

      console.log(`🔔 Notification envoyée: ${notif.title}`);
    } catch (error) {
      console.error('❌ Erreur envoi notification:', error);
    }
  }

  /**
   * Arrête le scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      console.log('🛑 Notification scheduler arrêté');
    }
  }
}

module.exports = new NotificationScheduler();
