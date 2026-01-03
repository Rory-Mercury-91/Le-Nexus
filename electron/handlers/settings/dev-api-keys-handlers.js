/**
 * Handlers IPC pour l'export/import des clés API (mode développeur uniquement)
 */

const fs = require('fs');
const crypto = require('crypto');

// Clé de chiffrement dérivée (spécifique à Nexus pour permettre le partage entre instances)
const ENCRYPTION_KEY = crypto.createHash('sha256').update('Nexus-APIKeys-Config-2024').digest();
const ALGORITHM = 'aes-256-gcm';

/**
 * Chiffre la configuration avec AES-256-GCM
 */
function encryptConfig(config) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  const jsonString = JSON.stringify(config);
  let encrypted = cipher.update(jsonString, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Déchiffre la configuration
 */
function decryptConfig(encryptedData) {
  try {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error('Impossible de déchiffrer la configuration. Le fichier est peut-être corrompu ou n\'a pas été créé par Nexus.');
  }
}

/**
 * Enregistre les handlers IPC pour l'export/import des clés API
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Store} store - Instance d'electron-store
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 */
function registerDevApiKeysHandlers(ipcMain, store, dialog, getMainWindow) {
  // Exporter toutes les clés API chiffrées
  ipcMain.handle('export-api-keys', async (event) => {
    try {
      // Récupérer toutes les clés API
      const cloudSyncConfig = store.get('cloudSyncConfig', {});
      const apiKeys = {
        groqApiKey: store.get('groqApiKey', ''),
        tmdbApiKey: store.get('tmdb.apiKey', ''),
        tmdbApiToken: store.get('tmdb.apiToken', ''),
        rawgApiKey: store.get('rawg.apiKey', ''),
        // Clés R2 (Cloudflare)
        r2Endpoint: cloudSyncConfig.endpoint || '',
        r2BucketName: cloudSyncConfig.bucketName || '',
        r2AccessKeyId: cloudSyncConfig.accessKeyId || '',
        r2SecretAccessKey: cloudSyncConfig.secretAccessKey || '',
        // Clés MyAnimeList
        malClientId: store.get('mal.clientId', ''),
        // Clés AniList
        anilistClientId: store.get('anilist.clientId', ''),
        anilistClientSecret: store.get('anilist.clientSecret', '')
      };

      // Vérifier qu'au moins une clé est présente
      const hasAnyKey = Object.values(apiKeys).some(key => key && key.trim() !== '');
      if (!hasAnyKey) {
        return { success: false, error: 'Aucune clé API à exporter.' };
      }

      const encryptedData = encryptConfig(apiKeys);
      const exportData = {
        version: '1.0',
        type: 'api-keys',
        encrypted: encryptedData,
        createdAt: new Date().toISOString()
      };

      const result = await dialog.showSaveDialog(getMainWindow(), {
        title: 'Exporter les clés API',
        defaultPath: 'nexus-api-keys.nexus',
        filters: [
          { name: 'Fichiers Nexus Config', extensions: ['nexus'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf8');
      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('Erreur export clés API:', error);
      return { success: false, error: error.message };
    }
  });

  // Importer les clés API chiffrées
  ipcMain.handle('import-api-keys', async (event) => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Importer les clés API',
        filters: [
          { name: 'Fichiers Nexus Config', extensions: ['nexus'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const importData = JSON.parse(fileContent);

      // Vérifier le type de fichier
      if (importData.type !== 'api-keys') {
        return { success: false, error: 'Ce fichier n\'est pas un fichier de clés API Nexus.' };
      }

      if (!importData.encrypted || !importData.encrypted.encrypted || !importData.encrypted.iv || !importData.encrypted.authTag) {
        return { success: false, error: 'Format de fichier invalide.' };
      }

      const decryptedKeys = decryptConfig(importData.encrypted);

      // Valider que la structure est correcte
      if (typeof decryptedKeys !== 'object' || decryptedKeys === null) {
        return { success: false, error: 'Configuration invalide ou incomplète.' };
      }

      // Sauvegarder les clés (seulement celles qui sont présentes et non vides)
      if (decryptedKeys.groqApiKey !== undefined) {
        const groqValue = decryptedKeys.groqApiKey || '';
        store.set('groqApiKey', groqValue);
        console.log('[Export/Import API Keys] Clé Groq sauvegardée:', groqValue ? `${groqValue.substring(0, 8)}...` : '(vide)');
      } else {
        console.log('[Export/Import API Keys] Clé Groq non trouvée dans le fichier importé');
      }
      if (decryptedKeys.tmdbApiKey !== undefined) {
        store.set('tmdb.apiKey', decryptedKeys.tmdbApiKey || '');
      }
      if (decryptedKeys.tmdbApiToken !== undefined) {
        store.set('tmdb.apiToken', decryptedKeys.tmdbApiToken || '');
      }
      if (decryptedKeys.rawgApiKey !== undefined) {
        store.set('rawg.apiKey', decryptedKeys.rawgApiKey || '');
      }

      // Sauvegarder les clés R2 (Cloudflare)
      if (decryptedKeys.r2Endpoint !== undefined || decryptedKeys.r2BucketName !== undefined ||
        decryptedKeys.r2AccessKeyId !== undefined || decryptedKeys.r2SecretAccessKey !== undefined) {
        const currentCloudSyncConfig = store.get('cloudSyncConfig', {});
        const updatedCloudSyncConfig = {
          ...currentCloudSyncConfig,
          ...(decryptedKeys.r2Endpoint !== undefined && { endpoint: decryptedKeys.r2Endpoint || '' }),
          ...(decryptedKeys.r2BucketName !== undefined && { bucketName: decryptedKeys.r2BucketName || '' }),
          ...(decryptedKeys.r2AccessKeyId !== undefined && { accessKeyId: decryptedKeys.r2AccessKeyId || '' }),
          ...(decryptedKeys.r2SecretAccessKey !== undefined && { secretAccessKey: decryptedKeys.r2SecretAccessKey || '' })
        };
        store.set('cloudSyncConfig', updatedCloudSyncConfig);
      }

      // Sauvegarder les clés MyAnimeList
      if (decryptedKeys.malClientId !== undefined) {
        store.set('mal.clientId', decryptedKeys.malClientId || '');
      }

      // Sauvegarder les clés AniList
      if (decryptedKeys.anilistClientId !== undefined) {
        store.set('anilist.clientId', decryptedKeys.anilistClientId || '');
      }
      if (decryptedKeys.anilistClientSecret !== undefined) {
        store.set('anilist.clientSecret', decryptedKeys.anilistClientSecret || '');
      }

      return { success: true, keys: decryptedKeys };
    } catch (error) {
      console.error('Erreur import clés API:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerDevApiKeysHandlers };
