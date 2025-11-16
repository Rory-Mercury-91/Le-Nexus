const fs = require('fs');
const path = require('path');
const { getPaths } = require('../common-helpers');

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
        mainData = db.prepare('SELECT * FROM series WHERE id = ?').get(id);
        if (!mainData) {
          return { success: false, error: `Manga introuvable (ID ${id})` };
        }
        const tomes = db.prepare('SELECT * FROM tomes WHERE serie_id = ? ORDER BY numero ASC').all(id);
        extraSections.push({ title: `Tomes (${tomes.length})`, data: tomes });
      } else if (type === 'anime') {
        mainData = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(id);
        if (!mainData) {
          return { success: false, error: `Anime introuvable (ID ${id})` };
        }
        const episodesVus = db.prepare('SELECT * FROM anime_episodes_vus WHERE anime_id = ? ORDER BY episode_numero ASC').all(id);
        const streamingLinks = db.prepare('SELECT * FROM anime_streaming_links WHERE anime_id = ?').all(id);
        extraSections.push({ title: `Episodes vus (${episodesVus.length})`, data: episodesVus });
        extraSections.push({ title: `Liens de streaming (${streamingLinks.length})`, data: streamingLinks });
      } else if (type === 'adulte-game') {
        mainData = db.prepare('SELECT * FROM adulte_game_games WHERE id = ?').get(id);
        if (!mainData) {
          return { success: false, error: `Jeu adulte introuvable (ID ${id})` };
        }
        
        // Parser les tags si c'est une chaîne JSON
        if (mainData.tags) {
          try {
            const parsedTags = typeof mainData.tags === 'string' ? JSON.parse(mainData.tags) : mainData.tags;
            mainData.tags_parsed = Array.isArray(parsedTags) ? parsedTags : (typeof parsedTags === 'string' ? parsedTags.split(',').map(t => t.trim()) : []);
          } catch (e) {
            // Si ce n'est pas du JSON, traiter comme une chaîne simple
            mainData.tags_parsed = typeof mainData.tags === 'string' ? mainData.tags.split(',').map(t => t.trim()) : [];
          }
        } else {
          mainData.tags_parsed = [];
        }
        
        const userGames = db.prepare('SELECT * FROM adulte_game_user_games WHERE game_id = ?').all(id);
        const labels = db.prepare('SELECT * FROM adulte_game_labels WHERE game_id = ?').all(id);
        const proprietaires = db.prepare('SELECT * FROM adulte_game_proprietaires WHERE game_id = ?').all(id);
        extraSections.push({ title: `Tags (${mainData.tags_parsed.length})`, data: mainData.tags_parsed });
        extraSections.push({ title: `Paramètres utilisateurs (${userGames.length})`, data: userGames });
        extraSections.push({ title: `Labels personnalisés (${labels.length})`, data: labels });
        extraSections.push({ title: `Propriétaires (${proprietaires.length})`, data: proprietaires });
      } else {
        return { success: false, error: `Type ${type} non supporté` };
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
