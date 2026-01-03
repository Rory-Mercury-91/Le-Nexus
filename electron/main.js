const { app, BrowserWindow, ipcMain, dialog, protocol, shell, Tray, Menu, session, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const Store = require('electron-store');

// Détection du mode développement : vérifier si Vite est en cours d'exécution
const isDev = !app.isPackaged;

// IMPORTANT: Initialiser le système de logging AVANT de désactiver les logs
// Cela permet d'intercepter tous les logs même s'ils sont désactivés en production
const { initBackendLogger, setVerboseMode, getVerboseMode } = require('./utils/backend-logger');

// Réduire le bruit des logs en production
// NOTE: Les logs seront toujours interceptés par backend-logger, même s'ils sont désactivés ici
if (!isDev && process.env.DEBUG_LOGS !== 'true') {
  ['log', 'info', 'debug'].forEach(method => {
    console[method] = () => { };
  });
}

// Services
const { initDatabase } = require('./services/database');
const { createImportServer } = require('./services/import-server');
const { startScheduler, syncOnStartup } = require('./services/schedulers/mal-sync-scheduler');
const { startScheduler: startNautiljonScheduler } = require('./services/schedulers/nautiljon-sync-scheduler');
const { startDatabaseSyncScheduler } = require('./services/schedulers/database-sync-scheduler');
const sessionTracker = require('./services/adulte-game/session-tracker');
const { startStreamingServer, getStreamingUrl, needsTranscoding } = require('./services/video-streaming-server');

// Handlers
const { registerMangaHandlers } = require('./handlers/mangas/manga-handlers');
const { registerAnimeHandlers } = require('./handlers/animes/anime-handlers');
const { registerStatisticsHandlers } = require('./handlers/statistics/statistics-handlers');
const { registerSettingsHandlers } = require('./handlers/settings/settings-handlers');
const { registerSearchHandlers } = require('./handlers/search/search-handlers');
const { registerAllMovieHandlers } = require('./handlers/movies/movie-handlers');
const { registerAllTvHandlers } = require('./handlers/tv/tv-handlers');
const { registerUserHandlers } = require('./handlers/users/user-handlers');
const { registerMalSyncHandlers } = require('./handlers/mal/mal-sync-handlers');
const { registerAniListSyncHandlers } = require('./handlers/anilist/anilist-sync-handlers');
const { registerAdulteGameHandlers } = require('./handlers/adulte-game/adulte-game-handlers');
const { registerBookHandlers } = require('./handlers/books/book-handlers');
const { registerLecturesHandlers } = require('./handlers/lectures/lectures-handlers');
const { registerSubscriptionHandlers } = require('./handlers/subscriptions/subscription-handlers');
const { registerPurchaseHandlers } = require('./handlers/subscriptions/purchase-handlers');
const { registerExportHandlers } = require('./handlers/common/export-handlers');
const { registerImageDownloadHandlers } = require('./handlers/common/image-download-handlers');

// Configuration
// IMPORTANT : Forcer le même chemin userData en dev et production pour que les cookies soient au même endroit
// En dev, Electron utilise le nom du package ("le-nexus"), en production il utilise productName ("Le Nexus")
// On force l'utilisation de "Le Nexus" pour garantir la cohérence des cookies entre dev et production
// NOTE: userData (cookies, cache) est différent de baseDirectory (données utilisateur personnalisées)
// Les cookies sont toujours dans userData, même si l'utilisateur a choisi un chemin personnalisé pour baseDirectory
if (!app.isPackaged) {
  const os = require('os');
  const targetUserDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Le Nexus');
  try {
    const currentUserDataPath = app.getPath('userData');
    if (currentUserDataPath !== targetUserDataPath) {
      app.setPath('userData', targetUserDataPath);
      console.log(`📁 Chemin userData forcé pour cohérence dev/prod: ${targetUserDataPath}`);
      console.log(`   (Ancien chemin: ${currentUserDataPath})`);
      console.log(`   ℹ️  Note: Les cookies sont stockés dans userData, indépendamment du baseDirectory personnalisé`);
    }
  } catch (error) {
    console.warn('⚠️ Impossible de forcer le chemin userData:', error.message);
  }
}

const store = new Store();
const userDataPath = app.getPath('userData');
const { PathManager } = require('./utils/paths');
const sessionLogger = require('./utils/session-logger');

// Variables globales
let mainWindow;
let tray;
let db;
let pathManager;
let importServer;

/**
 * Crée l'icône dans la zone de notification (system tray)
 */
function createTray() {
  // En production, les assets sont dans app.asar.unpacked grâce à asarUnpack
  const iconPath = isDev
    ? path.join(__dirname, '..', 'assets', 'icon.ico')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icon.ico');

  console.log('🖼️ Chemin icône tray:', iconPath);
  console.log('🖼️ Existe?', fs.existsSync(iconPath));

  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Afficher Nexus',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quitter',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Nexus');
  tray.setContextMenu(contextMenu);

  // Double-clic sur l'icône pour afficher la fenêtre
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });


}

/**
 * Crée la fenêtre principale de l'application
 */
function createWindow() {
  // Charger les dimensions/position sauvegardées
  const windowState = store.get('windowState', {
    width: 1400,
    height: 900,
    x: undefined,
    y: undefined,
    isMaximized: false,
    isFullScreen: false
  });

  const windowIconPath = isDev
    ? path.join(__dirname, '..', 'assets', 'icon.ico')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icon.ico');

  // IMPORTANT : Utiliser une partition persistante pour les cookies
  // Cela permet aux cookies de persister entre les redémarrages
  const persistentSession = session.fromPartition('persist:lenexus');

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1200,
    minHeight: 700,
    show: false, // Cacher d'abord pour éviter le flash
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Vider le cache en mode dev pour éviter les erreurs de cache
      cache: isDev ? false : true,
      // Utiliser une session persistante pour conserver les cookies
      session: persistentSession,
      // Autoriser l'autoplay avec son
      autoplayPolicy: 'no-user-gesture-required'
    },
    autoHideMenuBar: true,
    icon: windowIconPath
  });

  // Ouvrir tous les liens externes dans le navigateur par défaut
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Ouvrir dans le navigateur par défaut de l'utilisateur
    shell.openExternal(url);
    return { action: 'deny' }; // Empêcher l'ouverture dans Electron
  });

  // Handler pour ouvrir un fichier local avec l'application par défaut du système
  ipcMain.handle('open-path', async (event, filePath) => {
    try {
      if (!filePath) {
        return { success: false, error: 'Chemin de fichier requis' };
      }
      
      // Convertir le protocole manga:// en chemin de fichier si nécessaire
      let actualPath = filePath;
      if (filePath.startsWith('manga://')) {
        const urlPath = filePath.replace('manga://', '');
        try {
          actualPath = decodeURIComponent(urlPath);
        } catch (e) {
          actualPath = urlPath;
        }
      }
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(actualPath)) {
        return { success: false, error: 'Fichier introuvable' };
      }
      
      // Ouvrir avec l'application par défaut du système
      const result = await shell.openPath(actualPath);
      if (result) {
        // Si result n'est pas vide, c'est une erreur
        return { success: false, error: result };
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur open-path:', error);
      return { success: false, error: error.message };
    }
  });

  // Restaurer l'état maximisé/plein écran
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }
  if (windowState.isFullScreen) {
    mainWindow.setFullScreen(true);
  }

  // Sauvegarder l'état de la fenêtre (avec debounce pour éviter trop d'écritures)
  let saveStateTimeout;
  const saveWindowState = () => {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = setTimeout(() => {
      if (!mainWindow) return;

      const bounds = mainWindow.getBounds();
      store.set('windowState', {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: mainWindow.isMaximized(),
        isFullScreen: mainWindow.isFullScreen()
      });
    }, 500); // Attendre 500ms après le dernier changement
  };

  // Écouter les changements de taille/position
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);
  mainWindow.on('enter-full-screen', saveWindowState);
  mainWindow.on('leave-full-screen', saveWindowState);

  // Raccourci F12 pour ouvrir/fermer la console de développement
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
      event.preventDefault();
    }
  });

  // Intercepter la fermeture pour minimiser dans le tray au lieu de quitter
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();

      // Sauvegarder immédiatement l'état avant de cacher
      if (mainWindow) {
        const bounds = mainWindow.getBounds();
        store.set('windowState', {
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
          isMaximized: mainWindow.isMaximized(),
          isFullScreen: mainWindow.isFullScreen()
        });
      }

      mainWindow.hide();

      // Afficher une notification la première fois (Windows uniquement)
      if (!store.get('trayNotificationShown') && process.platform === 'win32') {
        try {
          tray.displayBalloon({
            title: 'Nexus',
            content: 'L\'application continue de fonctionner en arrière-plan. Clic droit sur l\'icône pour quitter.',
            iconType: 'info'
          });
        } catch (error) {
          console.error('Erreur affichage notification tray:', error);
        }
        store.set('trayNotificationShown', true);
      }

      return false;
    }
  });

  // Charger l'application
  if (isDev) {
    const { URLS } = require('./config/constants');
    mainWindow.loadURL(URLS.DEV_SERVER);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('📂 Chemin index.html:', indexPath);
    console.log('📂 Existe?', fs.existsSync(indexPath));

    mainWindow.loadFile(indexPath).catch(err => {
      console.error('❌ Erreur chargement index.html:', err);
    });
  }

  // Ouvrir les DevTools si le mode développeur est activé (même en production)
  const devModeEnabled = store.get('devMode', false);
  if (devModeEnabled) {
    mainWindow.webContents.once('did-finish-load', () => {
      if (!mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    });
  }

  // Logs de débogage pour le chargement
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Échec chargement page:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page chargée avec succès');
  });

  // S'assurer que la fenêtre est visible au démarrage
  mainWindow.once('ready-to-show', () => {
    console.log('👁️ ready-to-show déclenché');
    mainWindow.show();
    mainWindow.focus();
  });
}

/**
 * Lit une valeur du registre Windows
 * @param {string} key - Clé du registre (ex: "HKCU\\Software\\Le Nexus")
 * @param {string} valueName - Nom de la valeur (ex: "DatabasePath")
 * @returns {string|null} La valeur lue ou null si elle n'existe pas
 */
function readRegistryValue(key, valueName) {
  if (process.platform !== 'win32') {
    return null;
  }

  try {
    const command = `reg query "${key}" /v "${valueName}"`;
    const output = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const match = output.match(new RegExp(`${valueName}\\s+REG_SZ\\s+(.+)`));
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (error) {
    // La clé ou la valeur n'existe pas
    return null;
  }

  return null;
}

/**
 * Récupère le dossier racine de l'application depuis le store (défini lors de l'onboarding)
 * Retourne null si aucun chemin n'est stocké (premier lancement)
 * 
 * Le registre Windows est utilisé uniquement comme fallback pour les anciennes installations
 * qui n'ont pas encore passé par l'onboarding.
 */
async function getBaseDirectory() {
  // 1. Utiliser le store (défini lors de l'onboarding ou depuis les paramètres)
  const storedPath = store.get('baseDirectory');
  console.log('🔍 Base directory stocké dans store:', storedPath || '(non défini)');

  // Si un chemin existe et qu'il est valide, l'utiliser
  if (storedPath && fs.existsSync(storedPath)) {
    console.log('✅ Chemin stocké existe:', storedPath);
    const tempManager = new PathManager(storedPath);

    if (!tempManager.isValidStructure()) {
      console.warn('⚠️ Structure invalide pour le chemin stocké, tentative de réparation...');
      try {
        tempManager.initializeStructure();
      } catch (error) {
        console.error('❌ Réparation de la structure impossible:', error.message);
      }
    }

    if (tempManager.isValidStructure()) {
      console.log('✅ Structure valide, utilisation du chemin stocké');
      return storedPath;
    } else {
      console.warn('⚠️ Structure toujours invalide après réparation');
    }
  } else if (storedPath) {
    console.warn('⚠️ Chemin stocké n\'existe pas:', storedPath);
  }

  // 2. Fallback : essayer de lire depuis le registre Windows (pour compatibilité avec très anciennes installations)
  // Note: Ce fallback ne sera utilisé que pour les installations antérieures à l'onboarding
  if (process.platform === 'win32') {
    const registryPath = readRegistryValue('HKCU\\Software\\Le Nexus', 'DatabasePath');
    if (registryPath && fs.existsSync(registryPath)) {
      console.log('✅ Emplacement trouvé dans le registre Windows (fallback pour anciennes installations):', registryPath);
      // Synchroniser avec le store pour cohérence
      if (store.get('baseDirectory') !== registryPath) {
        store.set('baseDirectory', registryPath);
      }

      const tempManager = new PathManager(registryPath);
      if (!tempManager.isValidStructure()) {
        console.warn('⚠️ Structure invalide pour le chemin du registre, tentative de réparation...');
        try {
          tempManager.initializeStructure();
        } catch (error) {
          console.error('❌ Réparation de la structure impossible:', error.message);
        }
      }

      if (tempManager.isValidStructure()) {
        console.log('✅ Structure valide, utilisation du chemin du registre (fallback)');
        return registryPath;
      }
    }
  }

  // Premier lancement : aucun chemin défini, retourner null
  // L'utilisateur devra choisir l'emplacement lors de l'onboarding
  console.log('ℹ️ Premier lancement - aucun emplacement défini');
  return null;
}

/**
 * Enregistre le protocole manga:// pour servir les fichiers locaux de manière sécurisée
 * @param {Electron.Session} targetSession - Session sur laquelle enregistrer le protocole
 */
function registerMangaProtocol(targetSession = null) {
  const ses = targetSession || session.defaultSession;

  ses.protocol.registerFileProtocol('manga', (request, callback) => {
    try {
      // Extraire le chemin du fichier depuis l'URL manga://
      let url = request.url.replace('manga://', '');
      
      // Si l'URL est déjà encodée, la décoder
      if (url.includes('%')) {
        url = decodeURIComponent(url);
      }

      console.log(`📁 [manga://] Accès à: ${url}`);

      // Vérifier que le fichier existe
      const fs = require('fs');
      if (!fs.existsSync(url)) {
        console.error(`❌ Fichier introuvable: ${url}`);
        callback({ error: -2 }); // FILE_NOT_FOUND
        return;
      }

      // Déterminer le mime type basé sur l'extension
      const path = require('path');
      let ext = path.extname(url).toLowerCase();
      
      // Si pas d'extension, détecter depuis les magic bytes
      if (!ext) {
        try {
          const buffer = fs.readFileSync(url, { start: 0, end: 12 });
          // MKV/WebM: 1A 45 DF A3
          if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
            ext = '.mkv';
          }
          // AVI: RIFF...AVI 
          else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && 
                   buffer[8] === 0x41 && buffer[9] === 0x56 && buffer[10] === 0x49 && buffer[11] === 0x20) {
            ext = '.avi';
          }
          // MP4: ftyp
          else if ((buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) ||
                   (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x00 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70)) {
            ext = '.mp4';
          }
          // Images
          else if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
            ext = '.jpg';
          }
          else if (buffer[0] === 0x89 && buffer[1] === 0x50) {
            ext = '.png';
          }
          else if (buffer[0] === 0x47 && buffer[1] === 0x49) {
            ext = '.gif';
          }
          else if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            ext = '.webp';
          }
        } catch (detectError) {
          console.warn('[manga://] Impossible de détecter le type de fichier:', detectError);
        }
      }
      
      const mimeTypes = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.m4v': 'video/x-m4v',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp'
      };
      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      // Retourner le chemin du fichier avec le mime type
      callback({ path: url, mimeType });
    } catch (error) {
      console.error('❌ Erreur protocole manga:', error);
      callback({ error: -2 }); // FILE_NOT_FOUND
    }
  });
}

/**
 * Point d'entrée de l'application
 */
app.whenReady().then(async () => {
  // Récupérer la session persistante
  // Les cookies seront stockés dans userData/Partitions/persist_lenexus/Cookies
  // Ce chemin est indépendant du baseDirectory personnalisé choisi par l'utilisateur
  const persistentSession = session.fromPartition('persist:lenexus');

  // Configurer les permissions globales de la session pour autoriser l'autoplay avec son
  persistentSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    // Autoriser automatiquement les permissions audio/vidéo
    if (permission === 'media' || permission === 'autoplay-media' || permission === 'microphone' || permission === 'camera') {
      callback(true);
    } else {
      callback(false);
    }
  });

  persistentSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    // Autoriser les permissions média pour tous les sites
    if (permission === 'media' || permission === 'autoplay-media' || permission === 'microphone' || permission === 'camera') {
      return true;
    }
    return false;
  });

  // Configurer les en-têtes HTTP pour améliorer la compatibilité avec YouTube
  // L'erreur 153 de YouTube est souvent liée à des problèmes d'en-têtes Referer
  // L'erreur 4 est liée aux Permissions-Policy avec 'ch-ua-form-factors' non reconnu
  persistentSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // Si c'est une requête vers YouTube, ajouter un Referer valide
    if (details.url.includes('youtube.com') || details.url.includes('youtu.be')) {
      details.requestHeaders['Referer'] = 'https://www.youtube.com/';
      details.requestHeaders['Origin'] = 'https://www.youtube.com';
      // Ne pas supprimer Sec-CH-UA-Form-Factors car il peut être nécessaire
      // delete details.requestHeaders['Sec-CH-UA-Form-Factors'];
    }
    
    
    callback({ requestHeaders: details.requestHeaders });
  });
  
  // Intercepter les erreurs de console liées aux Permissions-Policy pour les ignorer (non bloquantes)
  persistentSession.webRequest.onErrorOccurred((details) => {
    // Ignorer silencieusement les erreurs liées aux Permissions-Policy pour YouTube
    if (details.url.includes('youtube.com') || details.url.includes('youtu.be')) {
      if (details.error && details.error.includes('Permissions-Policy')) {
        // Erreur connue et non bloquante, ne pas logger
        return;
      }
    }
  });

  // Intercepter les en-têtes de réponse pour filtrer les Permissions-Policy non reconnus
  // Note: En production Electron, les iframes YouTube peuvent avoir des problèmes avec certains en-têtes
  // On filtre uniquement les directives problématiques sans casser les fonctionnalités YouTube
  persistentSession.webRequest.onHeadersReceived((details, callback) => {
    let responseHeaders = details.responseHeaders || {};
    
    // Si c'est une réponse de YouTube embed, filtrer uniquement les Permissions-Policy problématiques
    if ((details.url.includes('youtube.com') || details.url.includes('youtu.be')) && details.url.includes('/embed/')) {
      // Ne filtrer que si c'est une page embed (pas les API ou autres endpoints)
      if (responseHeaders['Permissions-Policy']) {
        const policies = Array.isArray(responseHeaders['Permissions-Policy']) 
          ? responseHeaders['Permissions-Policy'] 
          : [responseHeaders['Permissions-Policy']];
        
        const cleanedPolicies = policies.map(policy => {
          if (typeof policy === 'string') {
            // Supprimer uniquement les directives contenant 'ch-ua-form-factors' qui causent l'erreur 4
            // Garder toutes les autres directives importantes pour YouTube
            return policy.split(',').map(part => {
              const trimmed = part.trim();
              // Si la directive contient ch-ua-form-factors ET qu'elle est dans la partie droite (=value), l'exclure
              if (trimmed.includes('ch-ua-form-factors') && !trimmed.startsWith('ch-ua-form-factors=')) {
                // C'est une directive qui permet 'ch-ua-form-factors' dans sa valeur, on la supprime
                return '';
              }
              // Si c'est la directive elle-même (ch-ua-form-factors=...), on la supprime aussi
              if (trimmed.trim().startsWith('ch-ua-form-factors=')) {
                return '';
              }
              return trimmed;
            }).filter(p => p.length > 0).join(', ');
          }
          return policy;
        }).filter(p => p && (typeof p === 'string' ? p.length > 0 : true));
        
        if (cleanedPolicies.length > 0) {
          responseHeaders['Permissions-Policy'] = cleanedPolicies;
        } else {
          // Si on a supprimé toutes les directives, garder un Permissions-Policy minimal pour éviter les erreurs
          responseHeaders['Permissions-Policy'] = 'autoplay=(self), encrypted-media=(self), picture-in-picture=(self)';
        }
      }
    }
    
    callback({ responseHeaders });
  });

  // Log pour information sur les cookies et les chemins
  const cookiesPath = path.join(userDataPath, 'Partitions', 'persist_lenexus', 'Cookies');
  const cookiesDir = path.dirname(cookiesPath);
  const cookiesDirExists = fs.existsSync(cookiesDir);
  const cookiesFileExists = fs.existsSync(cookiesPath);

  // Utiliser console.warn pour que les logs soient visibles en production
  console.warn(`🍪 Configuration des cookies:`);
  console.warn(`   📁 userData: ${userDataPath}`);
  console.warn(`   📁 Cookies path: ${cookiesPath}`);
  console.warn(`   ${cookiesDirExists ? '✅' : '❌'} Dossier cookies existe: ${cookiesDirExists}`);
  console.warn(`   ${cookiesFileExists ? '✅' : '⚠️'} Fichier cookies existe: ${cookiesFileExists}`);

  // Vérifier les permissions d'écriture
  try {
    const testFile = path.join(userDataPath, 'test-write-permissions.tmp');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.warn(`   ✅ Permissions d'écriture: OK`);
  } catch (error) {
    console.error(`   ❌ Permissions d'écriture: ÉCHEC - ${error.message}`);
    console.error(`   ⚠️  Les cookies peuvent ne pas être sauvegardés correctement !`);
  }

  // Vérifier les cookies F95Zone existants
  try {
    const f95Cookies = await persistentSession.cookies.get({ domain: 'f95zone.to' });
    const f95CookiesWww = await persistentSession.cookies.get({ domain: '.f95zone.to' });
    const allF95Cookies = [...f95Cookies, ...f95CookiesWww];
    const uniqueF95Cookies = Array.from(
      new Map(allF95Cookies.map(cookie => [cookie.name, cookie])).values()
    );
    console.warn(`   🍪 Cookies F95Zone trouvés: ${uniqueF95Cookies.length}`);
    if (uniqueF95Cookies.length > 0) {
      const hasSession = uniqueF95Cookies.some(c =>
        c.name === 'xf_session' || c.name === 'xf_user' || c.name.includes('session')
      );
      console.warn(`   ${hasSession ? '✅' : '⚠️'} Cookie de session présent: ${hasSession}`);
    } else {
      console.warn(`   ⚠️  Aucun cookie F95Zone trouvé - l'utilisateur doit se connecter via l'application`);
    }
  } catch (error) {
    console.error(`   ⚠️  Erreur vérification cookies F95Zone: ${error.message}`);
  }

  // Précharger YouTube pour établir une session et récupérer les cookies nécessaires
  // Cela permet d'éviter l'erreur 4 lors du chargement d'embeds YouTube
  async function preloadYouTubeSession() {
    try {
      // Vérifier si on a déjà des cookies YouTube
      const youtubeCookies = await persistentSession.cookies.get({ domain: 'youtube.com' });
      const youtubeCookiesWww = await persistentSession.cookies.get({ domain: '.youtube.com' });
      const allYoutubeCookies = [...youtubeCookies, ...youtubeCookiesWww];
      
      // Si on a déjà des cookies YouTube récents (moins de 24h), on peut sauter le préchargement
      const recentCookies = allYoutubeCookies.filter(c => {
        const cookieAge = Date.now() - (c.expirationDate ? c.expirationDate * 1000 : 0);
        return cookieAge < 24 * 60 * 60 * 1000; // 24 heures
      });
      
      if (recentCookies.length > 0) {
        console.log('✅ Cookies YouTube déjà présents, pas besoin de préchargement');
        return;
      }
      
      // Charger YouTube dans une fenêtre cachée pour établir une session
      console.log('🔄 Préchargement de YouTube pour établir une session...');
      const hiddenWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          session: persistentSession
        }
      });
      
      // Charger la page d'accueil YouTube avec un User-Agent standard
      hiddenWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await hiddenWindow.loadURL('https://www.youtube.com/');
      
      // Attendre que la page soit chargée (mais pas trop longtemps)
      await new Promise((resolve) => {
        hiddenWindow.webContents.once('did-finish-load', () => {
          // Attendre un peu plus pour que les cookies soient établis
          setTimeout(() => {
            hiddenWindow.close();
            console.log('✅ Session YouTube établie');
            resolve();
          }, 2000);
        });
        
        // Timeout de sécurité
        setTimeout(() => {
          hiddenWindow.close();
          console.log('⚠️ Timeout lors du préchargement YouTube (mais ce n\'est pas critique)');
          resolve();
        }, 10000);
      });
    } catch (error) {
      console.warn('⚠️ Erreur lors du préchargement YouTube (non bloquant):', error.message);
      // Ne pas bloquer l'application si le préchargement échoue
    }
  }
  
  // Précharger YouTube en arrière-plan (non bloquant)
  preloadYouTubeSession().catch(err => {
    console.warn('⚠️ Erreur préchargement YouTube:', err.message);
  });

  // Log pour information (seulement si baseDirectory est défini)
  const storedBaseDirectory = store.get('baseDirectory');
  if (storedBaseDirectory) {
    console.log(`📁 Données utilisateur (baseDirectory): ${storedBaseDirectory}`);
    console.log(`   ℹ️  Les cookies et les données utilisateur sont dans des emplacements différents`);
  }

  // Enregistrer le protocole personnalisé sur la session persistante ET la session par défaut
  console.log('🔧 Enregistrement du protocole manga:// sur la session persistante...');
  registerMangaProtocol(persistentSession);
  registerMangaProtocol(session.defaultSession); // Pour compatibilité

  // Message de bienvenue
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║                                                    ║');
  console.log('║              🌐 Bienvenue dans Nexus ! 🌐          ║');
  console.log('║                                                    ║');
  console.log('║        Votre collection de mangas & animes         ║');
  console.log('║           organisée avec passion ! ✨              ║');
  console.log('║                                                    ║');
  console.log('╚════════════════════════════════════════════════════╝\n');


  // Créer l'icône dans la zone de notification
  createTray();

  sessionLogger.start(store, {
    appVersion: app.getVersion()
  });

  // Créer des fonctions pour récupérer les variables (seront initialisées plus tard)
  const getPathManager = () => {
    // Si le PathManager n'est pas encore initialisé, essayer de le créer depuis le store
    if (!pathManager) {
      const baseDirectory = store.get('baseDirectory');
      if (baseDirectory && fs.existsSync(baseDirectory)) {
        console.log('📂 PathManager non initialisé, création depuis baseDirectory stocké');
        pathManager = new PathManager(baseDirectory);
        // Créer l'arborescence si nécessaire
        try {
          pathManager.initializeStructure();
        } catch (error) {
          console.warn('⚠️ Erreur lors de l\'initialisation de la structure:', error.message);
        }
      }
    }
    return pathManager;
  };
  const getMainWindow = () => mainWindow;
  const getDb = () => db;
  const setDb = (newDb) => { db = newDb; };
  const setPathManager = (newPathManager) => { pathManager = newPathManager; };

  // Exporter pour que les handlers puissent recharger la base de données et le PathManager
  // Ces fonctions seront disponibles après l'initialisation
  global.getDbMain = getDb;
  global.setDbMain = setDb;
  global.setPathManagerMain = setPathManager;

  // Enregistrer tous les handlers IPC AVANT de créer la fenêtre

  // Initialiser automatiquement les configurations d'enrichissement si elles n'existent pas
  if (!store.has('animeEnrichmentConfig')) {
    const defaultAnimeConfig = {
      enabled: true,
      imageSource: 'anilist',
      autoTranslate: false,
      fields: {
        titre_romaji: true,
        titre_natif: true,
        titre_anglais: true,
        titres_alternatifs: true,
        source: true,
        duree: true,
        saison_diffusion: true,
        date_debut: true,
        date_fin: true,
        en_cours_diffusion: true,
        genres: true,
        themes: true,
        demographics: true,
        rating: true,
        score: true,
        rank: true,
        popularity: true,
        scored_by: true,
        favorites: true,
        producteurs: true,
        diffuseurs: true,
        franchise: true,
        synopsis: true,
        background: true
      }
    };
    store.set('animeEnrichmentConfig', defaultAnimeConfig);
    console.log('✅ Configuration enrichissement anime initialisée par défaut');
  }

  if (!store.has('mangaEnrichmentConfig')) {
    const defaultMangaConfig = {
      enabled: true,
      autoTranslate: false,
      fields: {
        titre_romaji: true,
        titre_natif: true,
        titre_anglais: true,
        titres_alternatifs: true,
        date_debut: true,
        date_fin: true,
        serialization: true,
        themes: true,
        demographics: true,
        genres: true,
        score: true,
        rank: true,
        popularity: true,
        auteurs: true,
        synopsis: true,
        background: true
      }
    };
    store.set('mangaEnrichmentConfig', defaultMangaConfig);
    console.log('✅ Configuration enrichissement manga initialisée par défaut');
  }

  registerMangaHandlers(ipcMain, getDb, getPathManager, store, getMainWindow, dialog);
  registerAnimeHandlers(ipcMain, getDb, store);
  registerStatisticsHandlers(ipcMain, getDb, store);
  registerMalSyncHandlers(ipcMain, getDb, store, getMainWindow, getPathManager);
  registerAniListSyncHandlers(ipcMain, getDb, store, getMainWindow, getPathManager);
  registerAdulteGameHandlers(ipcMain, getDb, store, getPathManager, dialog, () => mainWindow);
  registerBookHandlers(ipcMain, getDb, store);
  registerLecturesHandlers(ipcMain, getDb, store);
  registerSubscriptionHandlers(ipcMain, getDb, store);
  registerPurchaseHandlers(ipcMain, getDb, store);
  registerAllMovieHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager);
  registerAllTvHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager);
  registerImageDownloadHandlers(ipcMain, dialog, getMainWindow);
  registerExportHandlers(ipcMain, getDb, app, getPathManager, store);
  
  // Démarrer le serveur de streaming vidéo pour transcoder les MKV
  try {
    startStreamingServer();
    console.log('✅ Serveur de streaming vidéo démarré');
  } catch (error) {
    console.error('❌ Erreur démarrage serveur de streaming:', error);
  }

  // Télécharger/mettre à jour l'index des sources au démarrage (en arrière-plan)
  // Attendre que le baseDirectory soit défini (ou utiliser userData comme fallback)
  const downloadIndexIfReady = async () => {
    try {
      // Vérifier si PathManager est disponible
      const pm = getPathManager();
      if (!pm) {
        // Si PathManager n'est pas encore disponible (premier lancement),
        // utiliser userData comme emplacement temporaire pour le cache
        console.log('ℹ️ PathManager non disponible, utilisation de userData pour le cache de l\'index');
        const { ensureSourceIndex } = require('./services/mihon-source-index-manager');
        
        // Créer un PathManager temporaire avec userData pour pouvoir télécharger l'index
        const tempPathManager = new PathManager(userDataPath);
        try {
          tempPathManager.initializeStructure();
        } catch (error) {
          console.warn('⚠️ Impossible d\'initialiser structure temporaire:', error.message);
        }
        
        const indexResult = await ensureSourceIndex(() => tempPathManager, (progress) => {
          if (progress.step === 'downloading') {
            console.log(`📥 ${progress.message} (${Math.round(progress.progress || 0)}%)`);
          }
        }, store);
        
        if (indexResult.success) {
          const sourceNames = {
            'current': '✅ Index actuel (téléchargé depuis GitHub)',
            'previous': '✅ Index précédent (cache de secours)',
            'embedded': '✅ Index embarqué (fallback final)'
          };
          console.log(`${sourceNames[indexResult.source] || '✅ Index disponible'}`);
          console.log(`   📊 Source: ${indexResult.source}`);
        } else {
          console.warn(`⚠️ Index des sources non disponible: ${indexResult.error || 'Inconnu'}`);
        }
        return;
      }
      
      // PathManager disponible, télécharger normalement
      const { ensureSourceIndex } = require('./services/mihon-source-index-manager');
      console.log('🔄 Vérification de l\'index des sources...');
      
      const indexResult = await ensureSourceIndex(getPathManager, (progress) => {
        if (progress.step === 'downloading') {
          console.log(`📥 ${progress.message} (${Math.round(progress.progress || 0)}%)`);
        }
      }, store);
      
      if (indexResult.success) {
        const sourceNames = {
          'current': '✅ Index actuel (téléchargé depuis GitHub)',
          'previous': '✅ Index précédent (cache de secours)',
          'embedded': '✅ Index embarqué (fallback final)'
        };
        console.log(`${sourceNames[indexResult.source] || '✅ Index disponible'}`);
        console.log(`   📊 Source: ${indexResult.source}`);
      } else {
        console.warn(`⚠️ Index des sources non disponible: ${indexResult.error || 'Inconnu'}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de l\'index des sources:', error);
    }
  };

  // Essayer immédiatement, puis réessayer après le chargement du baseDirectory
  setTimeout(downloadIndexIfReady, 2000);
  
  // Réessayer après que le baseDirectory soit chargé (dans le code ci-dessous)
  // Handler pour copier dans le presse-papiers
  ipcMain.handle('copy-to-clipboard', (_event, text) => {
    try {
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      console.error('Erreur copie presse-papiers:', error);
      return { success: false, error: error.message };
    }
  });

  registerSettingsHandlers(ipcMain, dialog, getMainWindow, getDb, store, getPathManager, (dbPath) => {
    const resolvePaths = () => {
      try {
        const pm = getPathManager();
        if (pm) {
          return pm.getPaths();
        }
        const baseDirectory = store.get('baseDirectory');
        if (baseDirectory) {
          const tempPm = new PathManager(baseDirectory);
          tempPm.initializeStructure();
          pathManager = tempPm;
          return tempPm.getPaths();
        }
      } catch (error) {
        console.warn('⚠️ Impossible de récupérer les chemins lors de la réinitialisation:', error);
      }
      return null;
    };

    // Fonction pour réinitialiser la base de données
    if (db) {
      try {
        db.close(); // Fermer l'ancienne connexion
        console.log('✅ Ancienne base de données fermée');
      } catch (error) {
        console.warn('⚠️ Erreur fermeture ancienne base:', error);
      }
    }

    let targetDbPath = dbPath;
    if (!targetDbPath) {
      const paths = resolvePaths();
      if (paths && paths.databases && fs.existsSync(paths.databases)) {
        const dbFiles = fs.readdirSync(paths.databases).filter(f => f.endsWith('.db') && !f.startsWith('temp_'));
        if (dbFiles.length === 1) {
          targetDbPath = path.join(paths.databases, dbFiles[0]);
        } else {
          console.log('ℹ️ Aucun chargement automatique (0 ou plusieurs bases présentes)');
        }
      }
    }

    if (!targetDbPath) {
      db = null;
      console.log('ℹ️ Aucune base à initialiser pour le moment');
      return null;
    }

    if (!pathManager) {
      const baseDirFromStore = store.get('baseDirectory');
      if (baseDirFromStore) {
        pathManager = new PathManager(baseDirFromStore);
        pathManager.initializeStructure();
      }
    }

    // Initialiser la nouvelle base de données
    const newDb = initDatabase(targetDbPath);
    db = newDb; // Mettre à jour la variable globale
    console.log('✅ Nouvelle base de données initialisée:', targetDbPath);

    return newDb;
  }, app);
  registerSearchHandlers(ipcMain, shell, getDb, store);
  registerUserHandlers(ipcMain, dialog, getMainWindow, getDb, getPathManager, store);

  // Handler pour le plein écran de la fenêtre
  ipcMain.handle('toggle-fullscreen', () => {
    if (mainWindow) {
      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);
      return { success: true, isFullScreen: !isFullScreen };
    }
    return { success: false, error: 'Fenêtre non disponible' };
  });

  ipcMain.handle('is-fullscreen', () => {
    if (mainWindow) {
      return { success: true, isFullScreen: mainWindow.isFullScreen() };
    }
    return { success: false, isFullScreen: false };
  });



  // Créer la fenêtre principale (nécessaire pour les dialogs)
  createWindow();

  // Initialiser le système de logging backend vers frontend
  // Doit être fait après la création de la fenêtre
  initBackendLogger(mainWindow);

  // Récupérer le dossier racine depuis le store
  const baseDirectory = await getBaseDirectory();

  // Si aucun emplacement n'est défini (premier lancement), ne pas créer de base de données
  // La base sera créée après que l'utilisateur ait choisi son emplacement dans l'onboarding
  if (!baseDirectory) {
    console.log('ℹ️ Premier lancement - aucune base de données créée (attente du choix de l\'emplacement)');
    db = null; // Pas de base de données pour l'instant
  } else {
    // Si baseDirectory vient d'être défini, essayer de télécharger l'index maintenant
    // (en plus de la tentative initiale)
    setTimeout(() => {
      downloadIndexIfReady();
    }, 1000);
    console.log('📁 Base directory utilisé:', baseDirectory);

    // Initialiser le gestionnaire de chemins
    pathManager = new PathManager(baseDirectory);
    console.log('📂 PathManager initialisé avec:', baseDirectory);

    // Créer l'arborescence si nécessaire
    pathManager.initializeStructure();

    // Récupérer les chemins
    const paths = pathManager.getPaths();

    // Au démarrage, détecter les bases utilisateur disponibles
    const currentUser = store.get('currentUser', '');
    let dbPath = null;

    console.log(`🔍 Initialisation au démarrage`);
    console.log(`📁 Dossier databases: ${paths.databases}`);

    // Appliquer les migrations à toutes les bases trouvées AVANT de les utiliser
    if (fs.existsSync(paths.databases)) {
      const { migrateAllDatabases } = require('./services/database');
      migrateAllDatabases(paths.databases);
    }

    // Lister toutes les bases utilisateur disponibles
    let dbFiles = [];
    if (fs.existsSync(paths.databases)) {
      dbFiles = fs.readdirSync(paths.databases).filter(f =>
        f.endsWith('.db') && !f.startsWith('temp_')
      );
      console.log(`📋 ${dbFiles.length} base(s) utilisateur trouvée(s): ${dbFiles.join(', ')}`);
    }

    if (dbFiles.length === 0) {
      // Aucune base trouvée, l'onboarding créera la base
      console.log(`ℹ️ Aucune base de données trouvée - l'onboarding créera la base après le choix de l'emplacement`);
      db = null;
    } else if (dbFiles.length === 1) {
      // Une seule base : charger automatiquement
      dbPath = path.join(paths.databases, dbFiles[0]);
      console.log(`📂 Une seule base trouvée, chargement automatique: ${dbFiles[0]}`);
      db = initDatabase(dbPath);
      console.log(`✅ Base de données initialisée: ${dbPath}`);
    } else {
      // Plusieurs bases : ne JAMAIS charger automatiquement, toujours afficher le sélecteur
      console.log(`ℹ️ Plusieurs utilisateurs disponibles (${dbFiles.length}): ${dbFiles.join(', ')}`);
      console.log(`ℹ️ Affichage du sélecteur utilisateur - pas de chargement automatique`);
      // Ne pas charger de base, laisser App.tsx afficher le sélecteur
      db = null;
    }
  }


  // Démarrer le serveur d'import (pour le script Tampermonkey)
  const { PORTS } = require('./config/constants');
  try {
    importServer = createImportServer(PORTS.IMPORT_SERVER, getDb, store, mainWindow, getPathManager);
  } catch (error) {
    console.warn('⚠️ Serveur d\'import non démarré:', error.message);
  }

  // Démarrer le scheduler de synchronisation MAL
  try {
    startScheduler(getDb(), store, mainWindow, getDb, getPathManager, getMainWindow);
    startAniListScheduler(getDb(), store, mainWindow, getDb, getPathManager, getMainWindow);

    // Démarrer le scheduler Nautiljon
    startNautiljonScheduler(getDb(), store, mainWindow, getPathManager);

    // Effectuer une sync au démarrage si nécessaire
    syncOnStartup(getDb(), store, getDb, getPathManager, getMainWindow).catch(err => {
      console.error('Erreur sync MAL au démarrage:', err);
    });
    syncAniListOnStartup(getDb(), store, getDb, getPathManager, getMainWindow).catch(err => {
      console.error('Erreur sync AniList au démarrage:', err);
    });
    syncAniListOnStartup(getDb(), store, getDb, getPathManager, getMainWindow).catch(err => {
      console.warn('⚠️ Sync MAL au démarrage échouée:', err.message);
    });

    // Démarrer le tracking automatique des sessions de jeux
    sessionTracker.initScheduler(getDb, store);
    console.log('✅ Session tracker initialisé');

    // Démarrer la synchronisation périodique des bases de données
    // Note: doit être démarré après l'enregistrement des handlers pour avoir accès à performDatabaseMerge
    setTimeout(() => {
      startDatabaseSyncScheduler(getDb, store);
    }, 2000); // Délai pour laisser le temps aux handlers de s'enregistrer

    // Synchroniser cloud sync au démarrage si nécessaire (dev mode ou temps dépassé)
    // Note: doit être appelé après l'enregistrement des handlers cloud sync
    setTimeout(() => {
      if (global.syncCloudSyncOnStartup) {
        global.syncCloudSyncOnStartup().catch(err => {
          console.error('Erreur sync cloud au démarrage:', err);
        });
      }
    }, 3000); // Délai pour laisser le temps aux handlers cloud sync de s'enregistrer
  } catch (error) {
    console.warn('⚠️ Scheduler MAL non démarré:', error.message);
  }

  // Handler IPC pour minimiser dans le tray
  ipcMain.handle('minimize-to-tray', () => {
    if (mainWindow) {
      mainWindow.hide();

    }
  });

  // Sur macOS, recréer la fenêtre si on clique sur l'icône du dock
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Fermer l'application quand toutes les fenêtres sont fermées (sauf sur macOS)
app.on('window-all-closed', () => {
  // Ne pas quitter l'application, elle continue en arrière-plan dans le tray
  // L'utilisateur peut quitter via le menu contextuel du tray

});

// Sauvegarder la base de données avant de quitter
app.on('before-quit', async (event) => {
  try {
    // Arrêter le serveur de streaming
    const { stopStreamingServer } = require('./services/video-streaming-server');
    stopStreamingServer();
    
    // Fusionner les bases de données avant de quitter
    if (global.performDatabaseMerge) {
      console.log('🔄 Fusion des bases de données avant fermeture...');
      const result = global.performDatabaseMerge();
      if (result.merged) {
        console.log(`✅ Fusion terminée: ${result.seriesCount} séries, ${result.tomesCount} tomes, ${result.animesCount} animes, ${result.gamesCount} jeux`);
      }
    }
  } catch (error) {
    console.error('❌ Erreur fusion avant fermeture:', error);
  }

  try {
    // Backup automatique à la fermeture si activé
    const backupConfig = store.get('backupConfig', {});
    if (backupConfig.backupOnShutdown) {
      event.preventDefault(); // Empêcher la fermeture immédiate
      const backupScheduler = require('./services/schedulers/backup-scheduler');
      await backupScheduler.createBackupOnShutdown();
      // Une fois le backup terminé, on peut quitter
      app.exit(0);
      return;
    }

    // Fermer le serveur d'import
    if (importServer) {
      importServer.close(() => {

      });
    }

    const currentUser = store.get('currentUser', '');
    if (currentUser && db && pathManager) {
      // La base de l'utilisateur est déjà sauvegardée automatiquement
      // Pas besoin de copie supplémentaire
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde finale:', error);
  } finally {
    sessionLogger.end();
    if (db) {
      db.close();
    }
  }
});

// Les logs de démarrage sont maintenant affichés après l'initialisation
