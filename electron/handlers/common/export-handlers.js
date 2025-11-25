const fs = require('fs');
const path = require('path');
const { getPaths, safeJsonParse } = require('../common-helpers');
const { parseTags } = require('../adulte-game/adulte-game-helpers');

function getExportDirectory(app, getPathManager, store) {
  let baseDir = '';

  try {
    const resolvedPaths = getPaths(getPathManager, store);
    baseDir = resolvedPaths?.base || '';
  } catch (error) {
    baseDir = '';
  }

  if (!baseDir) {
    baseDir = app.isPackaged
      ? path.dirname(app.getPath('exe'))
      : path.resolve(process.cwd());
  }

  const exportDir = path.join(baseDir, '01_données');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  return exportDir;
}

function formatSection(title, data) {
  if (data === undefined || data === null) {
    return `${title} : null`;
  }

  return `${title}\n${JSON.stringify(data, null, 2)}`;
}

function registerExportHandlers(ipcMain, getDb, app, getPathManager, store) {
  ipcMain.handle('export-entity-data', async (event, { type, id }) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      if (!type || !id) {
        return { success: false, error: 'Paramètres invalides' };
      }

      let mainData = null;
      let extraSections = [];
      const exportDir = getExportDirectory(app, getPathManager, store);
      const typeDir = path.join(exportDir, type);
      if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
      }
      const filePath = path.join(typeDir, `ID_${id}.txt`);

      if (type === 'manga') {
        mainData = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(id);
        if (!mainData) {
          return { success: false, error: `Manga introuvable (ID ${id})` };
        }
        const manga_tomes = db.prepare('SELECT * FROM manga_tomes WHERE serie_id = ? ORDER BY numero ASC').all(id);
        extraSections.push({ title: `Tomes (${manga_tomes.length})`, data: manga_tomes });
        // Récupérer les données utilisateur depuis manga_user_data
        const userData = db.prepare('SELECT * FROM manga_user_data WHERE serie_id = ?').all(id);
        if (userData.length > 0) {
          extraSections.push({ title: `Données utilisateur (${userData.length})`, data: userData });
        }
      } else if (type === 'anime') {
        mainData = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(id);
        if (!mainData) {
          return { success: false, error: `Anime introuvable (ID ${id})` };
        }
        // Récupérer les données utilisateur depuis anime_user_data
        const userData = db.prepare('SELECT * FROM anime_user_data WHERE anime_id = ?').all(id);
        if (userData.length > 0) {
          extraSections.push({ title: `Données utilisateur (${userData.length})`, data: userData });
        }
        const streamingLinks = db.prepare('SELECT * FROM anime_streaming_links WHERE anime_id = ?').all(id);
        extraSections.push({ title: `Liens de streaming (${streamingLinks.length})`, data: streamingLinks });
      } else if (type === 'adulte-game') {
        mainData = db.prepare('SELECT * FROM adulte_game_games WHERE id = ?').get(id);
        if (!mainData) {
          return { success: false, error: `Jeu adulte introuvable (ID ${id})` };
        }
        
        // Parser les tags (peuvent être JSON ou chaîne séparée par virgules)
        mainData.tags_parsed = parseTags(mainData.tags);
        
        const userData = db.prepare('SELECT * FROM adulte_game_user_data WHERE game_id = ?').all(id);
        let labels = [];
        if (userData.length > 0 && userData[0].labels) {
          labels = safeJsonParse(userData[0].labels, []);
        }
        extraSections.push({ title: `Tags (${mainData.tags_parsed.length})`, data: mainData.tags_parsed });
        extraSections.push({ title: `Données utilisateur (${userData.length})`, data: userData });
        extraSections.push({ title: `Labels personnalisés (${labels.length})`, data: labels });
      } else if (type === 'movie') {
        mainData = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
        if (!mainData) {
          return { success: false, error: `Film introuvable (ID ${id})` };
        }
        // Récupérer les données utilisateur depuis movie_user_data
        const userData = db.prepare('SELECT * FROM movie_user_data WHERE movie_id = ?').all(id);
        for (const userDataRow of userData) {
          // Parser les JSON arrays
          const userImages = userDataRow.user_images ? safeJsonParse(userDataRow.user_images, []) : [];
          const userVideos = userDataRow.user_videos ? safeJsonParse(userDataRow.user_videos, []) : [];
          
          const userId = userDataRow.user_id;
          const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
          const userName = user ? user.name : `User ${userId}`;
          
          extraSections.push({ title: `Données utilisateur - ${userName}`, data: {
            statut_visionnage: userDataRow.statut_visionnage,
            score: userDataRow.score,
            date_visionnage: userDataRow.date_visionnage,
            is_favorite: userDataRow.is_favorite,
            is_hidden: userDataRow.is_hidden,
            notes_privees: userDataRow.notes_privees
          }});
          extraSections.push({ title: `Images utilisateur - ${userName} (${userImages.length})`, data: userImages });
          extraSections.push({ title: `Vidéos utilisateur - ${userName} (${userVideos.length})`, data: userVideos });
        }
      } else if (type === 'manga_series' || type === 'tv-show' || type === 'serie') {
        mainData = db.prepare('SELECT * FROM tv_shows WHERE id = ?').get(id);
        if (!mainData) {
          return { success: false, error: `Série TV introuvable (ID ${id})` };
        }
        const seasons = db.prepare('SELECT * FROM tv_seasons WHERE show_id = ? ORDER BY numero ASC').all(id);
        const episodes = db.prepare('SELECT * FROM tv_episodes WHERE show_id = ? ORDER BY saison_numero ASC, episode_numero ASC').all(id);
        
        // Récupérer les données utilisateur depuis tv_show_user_data
        const userData = db.prepare('SELECT * FROM tv_show_user_data WHERE show_id = ?').all(id);
        
        // Parser les JSON pour chaque utilisateur
        for (const ud of userData) {
          let userImages = [];
          let userVideos = [];
          let episodeVideos = {};
          let episodeProgress = {};
          
          if (ud.user_images) userImages = safeJsonParse(ud.user_images, []);
          if (ud.user_videos) userVideos = safeJsonParse(ud.user_videos, []);
          if (ud.episode_videos) episodeVideos = safeJsonParse(ud.episode_videos, {});
          if (ud.episode_progress) episodeProgress = safeJsonParse(ud.episode_progress, {});
          
          // Compter les vidéos d'épisode
          const episodeVideosCount = Object.values(episodeVideos).reduce((sum, videos) => sum + (videos?.length || 0), 0);
          const episodeProgressCount = Object.keys(episodeProgress).length;
          
          extraSections.push({ title: `Données utilisateur (User ID: ${ud.user_id})`, data: {
            statut_visionnage: ud.statut_visionnage,
            score: ud.score,
            saisons_vues: ud.saisons_vues,
            episodes_vus: ud.episodes_vus,
            date_debut: ud.date_debut,
            date_fin: ud.date_fin,
            is_favorite: ud.is_favorite,
            is_hidden: ud.is_hidden,
            notes_privees: ud.notes_privees
          }});
          extraSections.push({ title: `Images utilisateur (User ID: ${ud.user_id}) (${userImages.length})`, data: userImages });
          extraSections.push({ title: `Vidéos série utilisateur (User ID: ${ud.user_id}) (${userVideos.length})`, data: userVideos });
          extraSections.push({ title: `Vidéos épisodes utilisateur (User ID: ${ud.user_id}) (${episodeVideosCount})`, data: episodeVideos });
          extraSections.push({ title: `Progression épisodes (User ID: ${ud.user_id}) (${episodeProgressCount})`, data: episodeProgress });
        }
        
        extraSections.push({ title: `Saisons (${seasons.length})`, data: seasons });
        extraSections.push({ title: `Épisodes (${episodes.length})`, data: episodes });
      } else {
        return { success: false, error: `Type ${type} non supporté` };
      }

      // Ajouter toutes les tables globales
      const globalSections = [];
      
      // Table users (tous les utilisateurs)
      const allUsers = db.prepare('SELECT * FROM users ORDER BY id ASC').all();
      globalSections.push({ title: `Utilisateurs (${allUsers.length})`, data: allUsers });
      
      // Table user_preferences (toutes les préférences)
      const allUserPreferences = db.prepare('SELECT * FROM user_preferences ORDER BY user_id ASC, content_type ASC').all();
      globalSections.push({ title: `Préférences utilisateur (${allUserPreferences.length})`, data: allUserPreferences });
      
      // Schémas des tables user_data (colonnes uniquement, pas les données)
      const userDataTables = [
        { name: 'manga_user_data', label: 'Manga User Data' },
        { name: 'anime_user_data', label: 'Anime User Data' },
        { name: 'movie_user_data', label: 'Movie User Data' },
        { name: 'tv_show_user_data', label: 'TV Show User Data' },
        { name: 'adulte_game_user_data', label: 'Adulte Game User Data' }
      ];
      
      for (const table of userDataTables) {
        try {
          const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
          const columnNames = columns.map(col => ({
            name: col.name,
            type: col.type,
            notnull: col.notnull,
            dflt_value: col.dflt_value,
            pk: col.pk
          }));
          globalSections.push({ 
            title: `Schéma table ${table.label} (${columnNames.length} colonnes)`, 
            data: columnNames 
          });
        } catch (error) {
          // Table n'existe pas ou erreur, on ignore
          console.log(`⚠️ Table ${table.name} non accessible pour l'export`);
        }
      }
      
      // Autres tables globales importantes
      try {
        const mangaTomesProprietaires = db.prepare('SELECT * FROM manga_manga_tomes_proprietaires ORDER BY tome_id ASC').all();
        if (mangaTomesProprietaires.length > 0) {
          globalSections.push({ 
            title: `Propriétaires de tomes manga (${mangaTomesProprietaires.length})`, 
            data: mangaTomesProprietaires 
          });
        }
      } catch (error) {
        // Table n'existe pas, on ignore
      }

      const now = new Date().toISOString();
      const sections = [
        `Type : ${type}`,
        `ID : ${id}`,
        `Généré le : ${now}`,
        '',
        formatSection('=== Données principales ===', mainData),
        '',
        ...extraSections.flatMap(section => [
          formatSection(`=== ${section.title} ===`, section.data),
          ''
        ]),
        '=== TABLES GLOBALES ===',
        '',
        ...globalSections.flatMap(section => [
          formatSection(`=== ${section.title} ===`, section.data),
          ''
        ])
      ];

      fs.writeFileSync(filePath, sections.join('\n'), 'utf-8');

      return { success: true, filePath };
    } catch (error) {
      console.error('❌ Erreur export-entity-data:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerExportHandlers };
