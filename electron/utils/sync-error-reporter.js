const fs = require('fs');
const path = require('path');
const Store = require('electron-store');
const { PathManager } = require('./paths');

let cachedDirectories = null;
let cachedBaseDir = null;

function resolveAppBaseDirectory() {
  try {
    const electron = require('electron');
    const app = electron?.app;
    if (app) {
      try {
        if (typeof app.isPackaged === 'function' && app.isPackaged) {
          return path.dirname(app.getPath('exe'));
        }
        if (typeof app.isReady === 'function' && app.isReady()) {
          return path.resolve(app.getAppPath(), '..');
        }
      } catch {
        // Fallback handled below
      }
    }
  } catch {
    // Module electron non disponible (tests)
  }
  return path.resolve(process.cwd());
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function normalizeSegment(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const strValue = String(value).trim();
  if (!strValue) {
    return fallback;
  }
  return strValue.replace(/[^0-9A-Za-z_-]/g, '_');
}

function safeSerialize(data) {
  if (data === undefined || data === null) {
    return 'null';
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return `"[non sérialisable] ${error.message || error}"`;
  }
}

function formatErrorEntry({ timestamp, operation, entityName, error, context }) {
  const lines = [
    '==============================',
    `Horodatage : ${timestamp}`,
    `Opération : ${operation || 'inconnue'}`,
    entityName ? `Nom : ${entityName}` : null,
    '',
    '--- Message d\'erreur ---',
    error?.message ? error.message : String(error || 'Erreur inconnue'),
    error?.stack ? `\n--- Stack ---\n${error.stack}` : null,
    context ? `\n--- Contexte ---\n${safeSerialize(context)}` : null
  ].filter(Boolean);
  return `${lines.join('\n')}\n`;
}

function resolveBaseDirectoryFromStore() {
  try {
    const store = new Store();
    const storedPath = store.get('baseDirectory');
    if (storedPath && fs.existsSync(storedPath)) {
      return storedPath;
    }
  } catch (error) {
    console.warn('[sync-error-reporter] Impossible de lire baseDirectory depuis le store:', error.message);
  }
  return null;
}

function resolveStorageDirectories() {
  const baseDirFromStore = resolveBaseDirectoryFromStore();
  const baseDir = baseDirFromStore || resolveAppBaseDirectory();
  const normalizedBaseDir = path.resolve(baseDir);

  if (cachedDirectories && cachedBaseDir === normalizedBaseDir && fs.existsSync(cachedDirectories.baseDir)) {
    return cachedDirectories;
  }

  let databasesDir = path.join(baseDir, 'databases');

  try {
    const pm = new PathManager(baseDir);
    const paths = pm.getPaths?.();
    if (paths?.databases) {
      databasesDir = paths.databases;
    }
  } catch (error) {
    console.warn('[sync-error-reporter] PathManager indisponible, fallback sur baseDirectory:', error.message);
  }

  ensureDirectoryExists(databasesDir);

  const reportsDir = path.join(databasesDir, 'reports');
  const extractedDir = path.join(databasesDir, 'extracted');
  ensureDirectoryExists(reportsDir);
  ensureDirectoryExists(extractedDir);

  cachedDirectories = {
    baseDir,
    databasesDir,
    reportsDir,
    extractedDir
  };
  cachedBaseDir = normalizedBaseDir;

  return cachedDirectories;
}

function getReportFilePath(entityType, entityId) {
  const { reportsDir } = resolveStorageDirectories();

  const typeSegment = normalizeSegment(entityType || 'general', 'general');
  const typeDir = path.join(reportsDir, typeSegment);
  ensureDirectoryExists(typeDir);

  const idSegment = normalizeSegment(entityId, 'UNKNOWN');
  const fileName = `ID_${idSegment}.txt`;
  return path.join(typeDir, fileName);
}

function getExtractedFilePath(entityType, entityId) {
  const { extractedDir } = resolveStorageDirectories();

  const typeSegment = normalizeSegment(entityType || 'general', 'general');
  const typeDir = path.join(extractedDir, typeSegment);
  ensureDirectoryExists(typeDir);

  const idSegment = normalizeSegment(entityId, 'UNKNOWN');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `ID_${idSegment}_${timestamp}.json`;
  return path.join(typeDir, fileName);
}

/**
 * Enregistre un rapport d'erreur lié à une synchronisation.
 * @param {object} options
 * @param {string} options.entityType - Type d'entité (ex: adulte-game, manga).
 * @param {string|number} options.entityId - Identifiant de l'entité.
 * @param {string} [options.entityName] - Nom lisible de l'entité.
 * @param {string} [options.operation] - Nom de l'opération (sync étape, scraping, etc.).
 * @param {Error|string} options.error - Erreur rencontrée.
 * @param {any} [options.context] - Données supplémentaires pour faciliter le diagnostic.
 */
function recordSyncError({ entityType, entityId, entityName, operation, error, context }) {
  const filePath = getReportFilePath(entityType, entityId);
  const entry = formatErrorEntry({
    timestamp: new Date().toISOString(),
    operation,
    entityName,
    error,
    context
  });

  fs.appendFileSync(filePath, `${entry}\n`, { encoding: 'utf-8' });
}

function recordExtractedData({ entityType, entityId, data, metadata }) {
  try {
    const filePath = getExtractedFilePath(entityType, entityId);
    const payload = {
      timestamp: new Date().toISOString(),
      entityType: entityType || null,
      entityId: entityId ?? null,
      data,
      metadata: metadata || null
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), { encoding: 'utf-8' });
  } catch (error) {
    console.warn('[sync-error-reporter] Impossible d\'enregistrer les données extraites:', error.message);
  }
}

module.exports = { recordSyncError, recordExtractedData, resolveStorageDirectories };
