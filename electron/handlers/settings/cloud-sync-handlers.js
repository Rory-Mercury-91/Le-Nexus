/**
 * Handlers IPC pour la synchronisation cloud (Cloudflare R2)
 */

const { uploadDatabase, downloadDatabase, listDatabases, testConnection } = require('../../services/cloud-sync/r2-service');
const { uploadAvatar, syncAllAvatars } = require('../../services/cloud-sync/r2-avatars-service');
const { uploadAllCovers, downloadMissingCovers, checkCoverExists, getCoverHash } = require('../../services/cloud-sync/r2-covers-service');
const cloudSyncScheduler = require('../../services/schedulers/cloud-sync-scheduler');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getPaths } = require('../common-helpers');

// Clé de chiffrement dérivée (spécifique à Nexus pour permettre le partage entre instances)
// Cette clé est dérivée d'une constante pour que toutes les instances de Nexus puissent déchiffrer
const ENCRYPTION_KEY = crypto.createHash('sha256').update('Nexus-CloudSync-Config-2024').digest();
const ALGORITHM = 'aes-256-gcm';

/**
 * Génère un UUID v4
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Récupère ou génère l'UUID de l'utilisateur actuel
 */
function getOrCreateUserUUID(db, userId) {
  const user = db.prepare('SELECT sync_uuid FROM users WHERE id = ?').get(userId);
  if (user && user.sync_uuid) {
    return user.sync_uuid;
  }
  
  // Générer un nouvel UUID
  const uuid = generateUUID();
  db.prepare('UPDATE users SET sync_uuid = ? WHERE id = ?').run(uuid, userId);
  return uuid;
}

/**
 * Génère des UUID pour tous les utilisateurs qui n'en ont pas
 */
function ensureAllUsersHaveUUID(getDb, getPathManager, store) {
  const Database = require('better-sqlite3');
  const paths = getPaths(getPathManager);
  
  if (!paths.databases || !fs.existsSync(paths.databases)) {
    return;
  }

  const dbFiles = fs.readdirSync(paths.databases).filter(f => 
    f.endsWith('.db') && !f.startsWith('temp_')
  );

  for (const dbFile of dbFiles) {
    try {
      const dbPath = path.join(paths.databases, dbFile);
      const db = new Database(dbPath);
      
      const users = db.prepare('SELECT id, sync_uuid FROM users').all();
      for (const user of users) {
        if (!user.sync_uuid) {
          const uuid = generateUUID();
          db.prepare('UPDATE users SET sync_uuid = ? WHERE id = ?').run(uuid, user.id);
          console.log(`✅ UUID généré pour utilisateur ${user.id}: ${uuid}`);
        }
      }
      
      db.close();
    } catch (error) {
      console.error(`⚠️ Erreur génération UUID pour ${dbFile}:`, error.message);
    }
  }
}

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
 * Enregistre les handlers IPC pour la synchronisation cloud
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 */
function registerCloudSyncHandlers(ipcMain, getDb, store, getPathManager, dialog, getMainWindow) {
  const getPathsLocal = () => getPaths(getPathManager);

  // S'assurer que tous les utilisateurs ont un UUID au démarrage
  ensureAllUsersHaveUUID(getDb, getPathManager, store);
  
  // Variable pour stocker la référence à performCloudSyncInternal (sera assignée plus tard)
  let performCloudSyncInternalRef = null;

  // Récupérer la configuration de synchronisation cloud
  ipcMain.handle('get-cloud-sync-config', () => {
    const config = store.get('cloudSyncConfig', {
      enabled: false,
      endpoint: '',
      bucketName: '',
      accessKeyId: '',
      secretAccessKey: '',
      syncFrequency: '24h', // 6h, 12h, 24h, 7d, 30d, manual
      syncedUsers: [], // Liste des UUIDs à synchroniser
      mergePriority: 'current-user' // 'current-user' | 'source' | 'newest' | 'oldest'
      // 'current-user' : La base de l'utilisateur actuel a toujours la priorité (par défaut)
      // 'source' : Les données de la source (téléchargée) écrasent toujours
      // 'newest' : Les données les plus récentes (updated_at) ont la priorité
      // 'oldest' : Les données les plus anciennes ont la priorité
    });
    return config;
  });

  // Récupérer l'historique de synchronisation cloud
  ipcMain.handle('get-cloud-sync-history', () => {
    const history = store.get('cloudSyncHistory', {});
    return history;
  });

  // Sauvegarder la configuration de synchronisation cloud
  ipcMain.handle('save-cloud-sync-config', (event, config) => {
    try {
      store.set('cloudSyncConfig', config);
      
      // Initialiser/mettre à jour le scheduler avec la nouvelle configuration
      if (performCloudSyncInternalRef) {
        cloudSyncScheduler.init(config, performCloudSyncInternalRef);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur sauvegarde config cloud sync:', error);
      return { success: false, error: error.message };
    }
  });

  // Fonction interne pour télécharger (réutilisée par perform-cloud-sync)
  async function downloadCloudSyncDatabaseInternal(targetUUID, config, paths, store) {
    try {
      const tempPath = path.join(paths.databases, `temp_${targetUUID}.db`);
      const result = await downloadDatabase(
        tempPath,
        config.bucketName,
        config.endpoint,
        config.accessKeyId,
        config.secretAccessKey,
        targetUUID
      );

      if (!result.success) {
        return result;
      }

      // Déterminer le nom d'utilisateur depuis le fichier téléchargé
      const Database = require('better-sqlite3');
      const tempDb = new Database(tempPath, { readonly: true });
      const users = tempDb.prepare('SELECT name FROM users LIMIT 1').all();
      tempDb.close();

      if (users.length === 0) {
        fs.unlinkSync(tempPath);
        return { success: false, error: 'Base de données vide ou invalide' };
      }

      const userName = users[0].name;
      const finalPath = path.join(paths.databases, `${userName.toLowerCase()}.db`);

      // Si le fichier existe déjà, le renommer en backup
      if (fs.existsSync(finalPath)) {
        const backupPath = `${finalPath}.backup.${Date.now()}`;
        fs.renameSync(finalPath, backupPath);
        console.log(`📦 Backup créé: ${backupPath}`);
      }

      // Déplacer le fichier temporaire vers l'emplacement final
      fs.renameSync(tempPath, finalPath);
      console.log(`✅ Base téléchargée: ${finalPath}`);

      // Mettre à jour la date de dernière synchronisation
      const syncHistory = store.get('cloudSyncHistory', {});
      if (!syncHistory.downloads) {
        syncHistory.downloads = {};
      }
      syncHistory.downloads[targetUUID] = new Date().toISOString();
      store.set('cloudSyncHistory', syncHistory);

      return { success: true };
    } catch (error) {
      console.error('Erreur download cloud sync interne:', error);
      const tempPath = path.join(paths.databases, `temp_${targetUUID}.db`);
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {
          console.error('Erreur suppression fichier temp:', e);
        }
      }
      return { success: false, error: error.message };
    }
  }

  // Fonction helper pour émettre les événements de progression
  function emitProgress(phase, current, total, item = null, details = {}) {
    // Utiliser setImmediate pour permettre à l'interface de se mettre à jour
    setImmediate(() => {
      const mainWindow = getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cloud-sync-progress', {
          phase, // 'upload', 'upload-covers', 'download-db', 'download-covers', 'complete'
          current,
          total,
          item,
          percentage: total > 0 ? Math.round((current / total) * 100) : 0,
          ...details
        });
      }
    });
  }

  // Fonction interne pour la synchronisation (réutilisée par le scheduler)
  async function performCloudSyncInternal() {
    const config = store.get('cloudSyncConfig', {});
    if (!config.enabled || !config.endpoint || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
      return { success: false, error: 'Configuration cloud sync incomplète' };
    }

    const results = {
      upload: { success: false },
      downloads: []
    };
    
    // Émettre le début de la synchronisation
    emitProgress('start', 0, 100, null, { message: 'Démarrage de la synchronisation...' });

    const currentUser = store.get('currentUser', '');
    if (!currentUser) {
      return { success: false, error: 'Aucun utilisateur connecté' };
    }

    const db = getDb();
    if (!db) {
      return { success: false, error: 'Base de données non disponible' };
    }

    const user = db.prepare('SELECT id, sync_uuid FROM users WHERE name = ?').get(currentUser);
    if (!user) {
      return { success: false, error: 'Utilisateur non trouvé' };
    }

    const currentUUID = getOrCreateUserUUID(db, user.id);
    const dbPath = path.join(getPathsLocal().databases, `${currentUser.toLowerCase()}.db`);

    if (fs.existsSync(dbPath)) {
      // Fusionner les bases avant l'upload
      if (global.performDatabaseMerge) {
        console.log('🔄 Fusion des bases de données avant upload cloud...');
        emitProgress('upload', 0, 100, null, { message: 'Fusion des bases de données...' });
        global.performDatabaseMerge();
      }

      emitProgress('upload', 0, 100, null, { message: 'Téléversement de la base de données...' });
      const uploadResult = await uploadDatabase(
        dbPath,
        config.bucketName,
        config.endpoint,
        config.accessKeyId,
        config.secretAccessKey,
        currentUUID
      );
      results.upload = uploadResult;
      
      if (uploadResult.success) {
        emitProgress('upload', 100, 100, null, { message: 'Base de données téléversée avec succès' });
      }

      if (uploadResult.success) {
        // Uploader aussi l'avatar si l'utilisateur en a un
        const userFull = db.prepare('SELECT avatar_path, sync_uuid FROM users WHERE id = ?').get(user.id);
        if (userFull && userFull.avatar_path && fs.existsSync(userFull.avatar_path)) {
          const avatarResult = await uploadAvatar(
            userFull.avatar_path,
            config.bucketName,
            config.endpoint,
            config.accessKeyId,
            config.secretAccessKey,
            currentUUID
          );
          if (avatarResult.success) {
            console.log(`✅ Avatar uploadé pour ${currentUser}`);
            results.avatarUpload = { success: true };
          } else {
            console.warn(`⚠️ Erreur upload avatar pour ${currentUser}:`, avatarResult.error);
            results.avatarUpload = { success: false, error: avatarResult.error };
          }
        }
        
        // Uploader les images de couverture
        const pathManager = getPathManager();
        if (pathManager) {
          console.log('🔄 Upload des images de couverture...');
          
          // Callback de progression pour l'upload des couvertures
          const onCoversUploadProgress = (current, total, item) => {
            emitProgress('upload-covers', current, total, item, { 
              message: `Vérification et upload des couvertures: ${current}/${total}` 
            });
          };
          
          emitProgress('upload-covers', 0, 0, null, { message: 'Vérification des couvertures à uploader...' });
          const coversResult = await uploadAllCovers(
            db,
            pathManager,
            config.bucketName,
            config.endpoint,
            config.accessKeyId,
            config.secretAccessKey,
            onCoversUploadProgress
          );
          if (coversResult.success) {
            if (coversResult.uploaded > 0 || coversResult.alreadyUploaded > 0) {
              const uploadMsg = coversResult.uploaded > 0 ? `${coversResult.uploaded} uploadée(s)` : '';
              const skipMsg = coversResult.alreadyUploaded > 0 ? `${coversResult.alreadyUploaded} déjà présente(s) (skippées)` : '';
              const messages = [uploadMsg, skipMsg].filter(m => m).join(', ');
              console.log(`✅ Couvertures: ${messages}`);
            } else {
              console.log(`ℹ️ Aucune couverture à uploader (${coversResult.notFound || 0} fichiers non trouvés localement)`);
            }
            results.coversUpload = coversResult;
          } else {
            console.warn(`⚠️ Erreur upload couvertures:`, coversResult.error);
            results.coversUpload = { success: false, error: coversResult.error };
          }
        } else {
          console.warn('⚠️ PathManager non disponible, impossible d\'uploader les couvertures');
          results.coversUpload = { success: false, error: 'PathManager non disponible' };
        }
        
        const syncHistory = store.get('cloudSyncHistory', {});
        syncHistory.lastUpload = new Date().toISOString();
        store.set('cloudSyncHistory', syncHistory);
      }
    }

    // Download de toutes les bases configurées (sauf la nôtre)
    if (Array.isArray(config.syncedUsers)) {
      const usersToDownload = config.syncedUsers.filter(uuid => uuid !== currentUUID);
      const totalDownloads = usersToDownload.length;
      
      if (totalDownloads > 0) {
        emitProgress('download-db', 0, totalDownloads, null, { message: `Téléchargement de ${totalDownloads} base(s) de données...` });
        
        for (let i = 0; i < usersToDownload.length; i++) {
          const targetUUID = usersToDownload[i];
          emitProgress('download-db', i, totalDownloads, targetUUID, { message: `Téléchargement base ${i + 1}/${totalDownloads}...` });
          const downloadResult = await downloadCloudSyncDatabaseInternal(targetUUID, config, getPathsLocal(), store);
          results.downloads.push({ uuid: targetUUID, ...downloadResult });
          emitProgress('download-db', i + 1, totalDownloads, targetUUID, { message: `Base ${i + 1}/${totalDownloads} téléchargée` });
        }
      }
    }

    // Fusionner les bases téléchargées
    if (global.performDatabaseMerge) {
      console.log('🔄 Fusion des bases de données après synchronisation cloud...');
      const mergePriority = config.mergePriority || 'current-user';
      const mergeResult = global.performDatabaseMerge(mergePriority);
      if (mergeResult.merged) {
        results.merge = mergeResult;
      }
    }

    // Synchroniser les avatars de tous les utilisateurs (télécharger ceux qui manquent)
    const paths = getPathsLocal();
    const currentDb = getDb();
    if (currentDb && paths.profiles) {
      const syncAvatarsResult = await syncAllAvatars(
        currentDb,
        paths.profiles,
        config.bucketName,
        config.endpoint,
        config.accessKeyId,
        config.secretAccessKey
      );
      if (syncAvatarsResult.success && syncAvatarsResult.downloaded > 0) {
        console.log(`✅ ${syncAvatarsResult.downloaded} avatar(s) téléchargé(s)`);
        results.avatarsSync = syncAvatarsResult;
      }
    }
    
    // Télécharger les images de couverture manquantes
    const pathManager = getPathManager();
    if (currentDb && pathManager) {
      console.log('🔄 Téléchargement des images de couverture manquantes...');
      
      // Callback de progression pour les couvertures
      const onCoversProgress = (current, total, item) => {
        emitProgress('download-covers', current, total, item, { 
          message: `Téléchargement des couvertures: ${current}/${total}` 
        });
      };
      
      emitProgress('download-covers', 0, 0, null, { message: 'Vérification des couvertures manquantes...' });
      const coversResult = await downloadMissingCovers(
        currentDb,
        pathManager,
        config.bucketName,
        config.endpoint,
        config.accessKeyId,
        config.secretAccessKey,
        onCoversProgress
      );
      if (coversResult.success && coversResult.downloaded > 0) {
        console.log(`✅ ${coversResult.downloaded} couverture(s) téléchargée(s)`);
        results.coversSync = coversResult;
      } else if (coversResult.success) {
        console.log('ℹ️ Toutes les couvertures sont à jour');
        results.coversSync = coversResult;
      } else {
        console.warn(`⚠️ Erreur téléchargement couvertures:`, coversResult.error);
        results.coversSync = { success: false, error: coversResult.error };
      }
    }

    // Mettre à jour la date de dernière synchronisation
    const syncHistory = store.get('cloudSyncHistory', {});
    syncHistory.lastSync = new Date().toISOString();
    store.set('cloudSyncHistory', syncHistory);

    // Émettre la fin de la synchronisation
    emitProgress('complete', 100, 100, null, { 
      message: 'Synchronisation terminée',
      results: {
        upload: results.upload.success,
        downloadsCount: results.downloads.filter(d => d.success).length,
        coversDownloaded: results.coversSync?.downloaded || 0
      }
    });

    return { success: true, results };
  }
  
  // Stocker la référence pour pouvoir l'utiliser dans les handlers
  performCloudSyncInternalRef = performCloudSyncInternal;
  
  // Initialiser le scheduler au démarrage si la config existe
  const initialConfig = store.get('cloudSyncConfig', {});
  if (initialConfig.enabled && initialConfig.syncFrequency && initialConfig.syncFrequency !== 'manual') {
    cloudSyncScheduler.init(initialConfig, performCloudSyncInternal);
  }

  // Exposer la fonction de synchronisation au démarrage pour qu'elle puisse être appelée depuis main.js
  // Note: Cette fonction sera appelée après l'initialisation complète de l'application
  global.syncCloudSyncOnStartup = () => {
    syncCloudSyncOnStartup(store, performCloudSyncInternal);
  };

  // Tester la connexion R2
  ipcMain.handle('test-cloud-sync-connection', async (event, config) => {
    try {
      const result = await testConnection(
        config.bucketName,
        config.endpoint,
        config.accessKeyId,
        config.secretAccessKey
      );
      return result;
    } catch (error) {
      console.error('Erreur test connexion cloud sync:', error);
      return { success: false, error: error.message };
    }
  });

  // Récupérer l'UUID de l'utilisateur actuel
  ipcMain.handle('get-current-user-uuid', (event) => {
    try {
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non disponible' };
      }

      const user = db.prepare('SELECT id, sync_uuid FROM users WHERE name = ?').get(currentUser);
      if (!user) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      const uuid = getOrCreateUserUUID(db, user.id);
      return { success: true, uuid };
    } catch (error) {
      console.error('Erreur récupération UUID:', error);
      return { success: false, error: error.message };
    }
  });

  // Récupérer le nom d'utilisateur à partir d'un UUID
  ipcMain.handle('get-user-name-from-uuid', (event, uuid) => {
    try {
      if (!uuid) {
        return { success: false, error: 'UUID non fourni' };
      }

      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non disponible' };
      }

      const user = db.prepare('SELECT name FROM users WHERE sync_uuid = ?').get(uuid);
      if (!user) {
        return { success: false, error: 'Utilisateur non trouvé pour cet UUID' };
      }

      return { success: true, name: user.name };
    } catch (error) {
      console.error('Erreur récupération nom utilisateur:', error);
      return { success: false, error: error.message };
    }
  });

  // Lister les bases disponibles sur R2
  ipcMain.handle('list-cloud-sync-databases', async (event) => {
    try {
      const config = store.get('cloudSyncConfig', {});
      if (!config.enabled || !config.endpoint || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
        return { success: false, error: 'Configuration cloud sync incomplète' };
      }

      const result = await listDatabases(
        config.bucketName,
        config.endpoint,
        config.accessKeyId,
        config.secretAccessKey
      );

      return result;
    } catch (error) {
      console.error('Erreur liste bases cloud sync:', error);
      return { success: false, error: error.message };
    }
  });

  // Upload de la base de données actuelle
  ipcMain.handle('upload-cloud-sync-database', async (event) => {
    try {
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const config = store.get('cloudSyncConfig', {});
      if (!config.enabled || !config.endpoint || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
        return { success: false, error: 'Configuration cloud sync incomplète' };
      }

      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non disponible' };
      }

      const user = db.prepare('SELECT id, sync_uuid FROM users WHERE name = ?').get(currentUser);
      if (!user) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      const uuid = getOrCreateUserUUID(db, user.id);
      const dbPath = path.join(getPathsLocal().databases, `${currentUser.toLowerCase()}.db`);

      if (!fs.existsSync(dbPath)) {
        return { success: false, error: 'Base de données utilisateur introuvable' };
      }

      // Fusionner les bases avant l'upload pour s'assurer que toutes les données sont à jour
      console.log('🔄 Fusion des bases de données avant upload cloud...');
      if (global.performDatabaseMerge) {
        const mergeResult = global.performDatabaseMerge();
        if (mergeResult.merged && (mergeResult.seriesCount > 0 || mergeResult.tomesCount > 0 || mergeResult.animesCount > 0 || mergeResult.gamesCount > 0)) {
          console.log(`✅ Fusion avant upload: ${mergeResult.seriesCount} séries, ${mergeResult.tomesCount} tomes, ${mergeResult.animesCount} animes, ${mergeResult.gamesCount} jeux`);
        }
      }

      const result = await uploadDatabase(
        dbPath,
        config.bucketName,
        config.endpoint,
        config.accessKeyId,
        config.secretAccessKey,
        uuid
      );

      if (result.success) {
        // Uploader aussi l'avatar si l'utilisateur en a un
        const userFull = db.prepare('SELECT avatar_path, sync_uuid FROM users WHERE id = ?').get(user.id);
        if (userFull && userFull.avatar_path && fs.existsSync(userFull.avatar_path)) {
          const avatarResult = await uploadAvatar(
            userFull.avatar_path,
            config.bucketName,
            config.endpoint,
            config.accessKeyId,
            config.secretAccessKey,
            uuid
          );
          if (avatarResult.success) {
            console.log(`✅ Avatar uploadé pour ${currentUser}`);
          } else {
            console.warn(`⚠️ Erreur upload avatar pour ${currentUser}:`, avatarResult.error);
          }
        }
        
        // Mettre à jour la date de dernière synchronisation
        const syncHistory = store.get('cloudSyncHistory', {});
        syncHistory.lastUpload = new Date().toISOString();
        store.set('cloudSyncHistory', syncHistory);
      }

      return result;
    } catch (error) {
      console.error('Erreur upload cloud sync:', error);
      return { success: false, error: error.message };
    }
  });

  // Fonction interne pour télécharger (réutilisée par perform-cloud-sync)
  async function downloadCloudSyncDatabaseInternal(targetUUID, config, paths, store) {
    try {
      const tempPath = path.join(paths.databases, `temp_${targetUUID}.db`);
      const result = await downloadDatabase(
        tempPath,
        config.bucketName,
        config.endpoint,
        config.accessKeyId,
        config.secretAccessKey,
        targetUUID
      );

      if (!result.success) {
        return result;
      }

      // Déterminer le nom d'utilisateur depuis le fichier téléchargé
      const Database = require('better-sqlite3');
      const tempDb = new Database(tempPath, { readonly: true });
      const users = tempDb.prepare('SELECT name FROM users LIMIT 1').all();
      tempDb.close();

      if (users.length === 0) {
        fs.unlinkSync(tempPath);
        return { success: false, error: 'Base de données vide ou invalide' };
      }

      const userName = users[0].name;
      const finalPath = path.join(paths.databases, `${userName.toLowerCase()}.db`);

      // Si le fichier existe déjà, le renommer en backup
      if (fs.existsSync(finalPath)) {
        const backupPath = `${finalPath}.backup.${Date.now()}`;
        fs.renameSync(finalPath, backupPath);
        console.log(`📦 Backup créé: ${backupPath}`);
      }

      // Déplacer le fichier temporaire vers l'emplacement final
      fs.renameSync(tempPath, finalPath);
      console.log(`✅ Base téléchargée: ${finalPath}`);

      // Mettre à jour la date de dernière synchronisation
      const syncHistory = store.get('cloudSyncHistory', {});
      if (!syncHistory.downloads) {
        syncHistory.downloads = {};
      }
      syncHistory.downloads[targetUUID] = new Date().toISOString();
      store.set('cloudSyncHistory', syncHistory);

      return { success: true };
    } catch (error) {
      console.error('Erreur download cloud sync interne:', error);
      const tempPath = path.join(paths.databases, `temp_${targetUUID}.db`);
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {
          console.error('Erreur suppression fichier temp:', e);
        }
      }
      return { success: false, error: error.message };
    }
  }

  // Download d'une base de données depuis R2
  ipcMain.handle('download-cloud-sync-database', async (event, targetUUID) => {
    try {
      const config = store.get('cloudSyncConfig', {});
      if (!config.enabled || !config.endpoint || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
        return { success: false, error: 'Configuration cloud sync incomplète' };
      }

      const paths = getPathsLocal();
      if (!paths.databases) {
        return { success: false, error: 'Répertoire bases de données non configuré' };
      }

      return await downloadCloudSyncDatabaseInternal(targetUUID, config, paths, store);
    } catch (error) {
      console.error('Erreur download cloud sync:', error);
      return { success: false, error: error.message };
    }
  });

  // Synchronisation complète (upload + download de toutes les bases configurées)
  ipcMain.handle('perform-cloud-sync', async (event) => {
    try {
      return await performCloudSyncInternal();
    } catch (error) {
      console.error('Erreur synchronisation cloud:', error);
      return { success: false, error: error.message };
    }
  });

  // Générer des UUID pour tous les utilisateurs existants
  ipcMain.handle('generate-all-user-uuids', () => {
    try {
      ensureAllUsersHaveUUID(getDb, getPathManager, store);
      return { success: true };
    } catch (error) {
      console.error('Erreur génération UUIDs:', error);
      return { success: false, error: error.message };
    }
  });

  // Exporter la configuration chiffrée
  ipcMain.handle('export-cloud-sync-config', async (event) => {
    try {
      const config = store.get('cloudSyncConfig', {});
      
      if (!config.endpoint || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
        return { success: false, error: 'Configuration incomplète. Veuillez configurer R2 d\'abord.' };
      }

      const encryptedData = encryptConfig(config);
      const exportData = {
        version: '1.0',
        encrypted: encryptedData,
        createdAt: new Date().toISOString()
      };

      const result = await dialog.showSaveDialog(getMainWindow(), {
        title: 'Exporter la configuration R2',
        defaultPath: 'nexus-r2-config.nexus',
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
      console.error('Erreur export config cloud sync:', error);
      return { success: false, error: error.message };
    }
  });

  // Importer la configuration chiffrée
  ipcMain.handle('import-cloud-sync-config', async (event) => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Importer la configuration R2',
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

      if (!importData.encrypted || !importData.encrypted.encrypted || !importData.encrypted.iv || !importData.encrypted.authTag) {
        return { success: false, error: 'Format de fichier invalide.' };
      }

      const decryptedConfig = decryptConfig(importData.encrypted);

      // Valider que la config contient les champs nécessaires
      if (!decryptedConfig.endpoint || !decryptedConfig.bucketName || !decryptedConfig.accessKeyId || !decryptedConfig.secretAccessKey) {
        return { success: false, error: 'Configuration invalide ou incomplète.' };
      }

      // Conserver la fréquence et les utilisateurs synchronisés actuels si la config importée n'en a pas
      const currentConfig = store.get('cloudSyncConfig', {});
      const mergedConfig = {
        ...decryptedConfig,
        syncFrequency: decryptedConfig.syncFrequency || currentConfig.syncFrequency || '24h',
        syncedUsers: decryptedConfig.syncedUsers || currentConfig.syncedUsers || []
      };

      store.set('cloudSyncConfig', mergedConfig);
      return { success: true, config: mergedConfig };
    } catch (error) {
      console.error('Erreur import config cloud sync:', error);
      return { success: false, error: error.message };
    }
  });

  // Vérifier si une image de couverture existe dans R2
  ipcMain.handle('check-cover-exists-r2', async (event, relativePath) => {
    try {
      const config = store.get('cloudSyncConfig', {});
      if (!config.enabled || !config.endpoint || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
        return { success: false, error: 'Configuration cloud sync incomplète' };
      }

      const result = await checkCoverExists(
        relativePath,
        config.bucketName,
        config.endpoint,
        config.accessKeyId,
        config.secretAccessKey
      );

      return { success: true, ...result };
    } catch (error) {
      console.error('Erreur vérification couverture R2:', error);
      return { success: false, error: error.message };
    }
  });

  // Obtenir le hash R2 d'un chemin de couverture
  ipcMain.handle('get-cover-r2-hash', (event, relativePath) => {
    try {
      const hash = getCoverHash(relativePath);
      const ext = path.extname(relativePath) || '.png';
      const r2Path = `covers/${hash}${ext}`;
      return { success: true, hash, r2Path };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

/**
 * Synchronise au démarrage si nécessaire (dev mode ou temps dépassé)
 * @param {Store} store - Instance d'electron-store
 * @param {Function} performCloudSyncInternal - Fonction de synchronisation
 */
async function syncCloudSyncOnStartup(store, performCloudSyncInternal) {
  const config = store.get('cloudSyncConfig', {});
  
  if (!config.enabled || !config.endpoint || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
    return;
  }

  // Vérifier si une synchronisation est nécessaire
  if (!cloudSyncScheduler.shouldSyncOnStartup(store)) {
    console.log('⏭️  Synchronisation cloud non nécessaire au démarrage');
    return;
  }

  const devMode = store.get('devMode', false);
  
  if (devMode) {
    // En mode dev, synchroniser immédiatement
    console.log('🚀 Synchronisation cloud au démarrage (mode dev activé)...');
    try {
      await performCloudSyncInternal();
      console.log('✅ Synchronisation cloud au démarrage terminée');
    } catch (error) {
      console.error('❌ Erreur synchronisation cloud au démarrage:', error);
    }
  } else {
    // Sinon, attendre un délai avant de synchroniser
    const MIN_STARTUP_DELAY_MS = 5 * 60 * 1000; // 5 minutes
    let startupDelayMs = store.get('cloudSync_startup_delay_ms', MIN_STARTUP_DELAY_MS);
    
    if (typeof startupDelayMs !== 'number' || startupDelayMs < MIN_STARTUP_DELAY_MS) {
      startupDelayMs = MIN_STARTUP_DELAY_MS;
      store.set('cloudSync_startup_delay_ms', startupDelayMs);
    }

    if (startupDelayMs > 0) {
      console.log(`⏳ Attente de ${(startupDelayMs / 60000).toFixed(1)} minute(s) avant la synchronisation cloud au démarrage.`);
      setTimeout(async () => {
        try {
          console.log('🚀 Synchronisation cloud au démarrage...');
          await performCloudSyncInternal();
          console.log('✅ Synchronisation cloud au démarrage terminée');
        } catch (error) {
          console.error('❌ Erreur synchronisation cloud au démarrage:', error);
        }
      }, startupDelayMs);
    } else {
      // Pas de délai, synchroniser immédiatement
      console.log('🚀 Synchronisation cloud au démarrage...');
      try {
        await performCloudSyncInternal();
        console.log('✅ Synchronisation cloud au démarrage terminée');
      } catch (error) {
        console.error('❌ Erreur synchronisation cloud au démarrage:', error);
      }
    }
  }
}

module.exports = { registerCloudSyncHandlers, syncCloudSyncOnStartup };
