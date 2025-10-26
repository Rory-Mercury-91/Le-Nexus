const { app, BrowserWindow, ipcMain, dialog, protocol, shell, Tray, Menu, session } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Détection du mode développement : vérifier si Vite est en cours d'exécution
const isDev = !app.isPackaged;

// Services
const { initDatabase } = require('./services/database');
const { createImportServer } = require('./services/import-server');
const { startScheduler, syncOnStartup } = require('./services/mal-sync-scheduler');

// Handlers
const { registerMangaHandlers } = require('./handlers/manga-handlers');
const { registerAnimeHandlers } = require('./handlers/anime-handlers');
const { registerStatisticsHandlers } = require('./handlers/statistics-handlers');
const { registerSettingsHandlers } = require('./handlers/settings-handlers');
const { registerSearchHandlers } = require('./handlers/search-handlers');
const { registerUserHandlers } = require('./handlers/user-handlers');
const { registerMalSyncHandlers } = require('./handlers/mal-sync-handlers');
const { registerAvnHandlers } = require('./handlers/avn-handlers');
const { registerLewdCornerHandlers } = require('./handlers/lewdcorner-handlers');
const { registerF95ZoneHandlers } = require('./handlers/f95zone-handlers');

// Configuration
const store = new Store();
const userDataPath = app.getPath('userData');
const fs = require('fs');
const { PathManager } = require('./utils/paths');

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
      label: 'Afficher Le Nexus',
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

  tray.setToolTip('Le Nexus');
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
      session: persistentSession
    },
    autoHideMenuBar: true,
    icon: windowIconPath
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
            title: 'Le Nexus',
            content: 'L\'application continue de fonctionner en arrière-plan. Clic droit sur l\'icône pour quitter.',
            iconType: 'info'
          });
        } catch (error) {

        }
        store.set('trayNotificationShown', true);
      }
      
      return false;
    }
  });

  // Charger l'application
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('📂 Chemin index.html:', indexPath);
    console.log('📂 Existe?', fs.existsSync(indexPath));
    
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('❌ Erreur chargement index.html:', err);
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
 * Récupère ou crée automatiquement le dossier racine de l'application
 * Ne demande JAMAIS à l'utilisateur - utilise le chemin par défaut
 */
async function getBaseDirectory() {
  let storedPath = store.get('baseDirectory');
  console.log('🔍 Base directory stocké dans store:', storedPath || '(non défini)');

  // Si un chemin existe et qu'il est valide, l'utiliser
  if (storedPath && fs.existsSync(storedPath)) {
    console.log('✅ Chemin stocké existe:', storedPath);
    const tempManager = new PathManager(storedPath);
    if (tempManager.isValidStructure()) {
      console.log('✅ Structure valide, utilisation du chemin stocké');
      return storedPath;
    } else {
      console.warn('⚠️ Structure invalide pour le chemin stocké');
    }
  } else if (storedPath) {
    console.warn('⚠️ Chemin stocké n\'existe pas:', storedPath);
  }

  // Premier lancement : utiliser automatiquement le chemin par défaut
  // L'utilisateur choisira l'emplacement définitif dans l'OnboardingWizard
  const defaultPath = path.join(userDataPath, 'Le Nexus');
  console.log('📁 Utilisation du chemin par défaut:', defaultPath);
  store.set('baseDirectory', defaultPath);

  return defaultPath;
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
      const url = request.url.replace('manga://', '');
      
      // Décoder l'URL pour gérer les espaces et caractères spéciaux
      const decodedPath = decodeURIComponent(url);
      
      console.log(`📁 [manga://] Accès à: ${decodedPath}`);
      
      // Retourner le chemin du fichier
      callback({ path: decodedPath });
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
  const persistentSession = session.fromPartition('persist:lenexus');
  
  // Enregistrer le protocole personnalisé sur la session persistante ET la session par défaut
  console.log('🔧 Enregistrement du protocole manga:// sur la session persistante...');
  registerMangaProtocol(persistentSession);
  registerMangaProtocol(session.defaultSession); // Pour compatibilité

  // Configurer les intercepteurs (LewdCorner et F95Zone)
  const { setupLewdCornerInterceptor } = require('./apis/lewdcorner-interceptor');
  const { setupF95ZoneInterceptor } = require('./apis/f95zone-interceptor');
  setupLewdCornerInterceptor();
  setupF95ZoneInterceptor();

  // Message de bienvenue
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║                                                    ║');
  console.log('║              🌐 Bienvenue dans Le Nexus ! 🌐           ║');
  console.log('║                                                    ║');
  console.log('║        Votre collection de mangas & animes         ║');
  console.log('║           organisée avec passion ! ✨              ║');
  console.log('║                                                    ║');
  console.log('╚════════════════════════════════════════════════════╝\n');


  // Créer l'icône dans la zone de notification
  createTray();

  // Créer des fonctions pour récupérer les variables (seront initialisées plus tard)
  const getPathManager = () => pathManager;
  const getMainWindow = () => mainWindow;
  const getDb = () => db;

  // Enregistrer tous les handlers IPC AVANT de créer la fenêtre

  
  registerMangaHandlers(ipcMain, getDb, getPathManager, store);
  registerAnimeHandlers(ipcMain, getDb, store);
  registerStatisticsHandlers(ipcMain, getDb, store);
  registerMalSyncHandlers(ipcMain, getDb, store, getMainWindow);
  registerAvnHandlers(ipcMain, getDb, store, getPathManager);
  registerLewdCornerHandlers();
  registerF95ZoneHandlers();
  registerSettingsHandlers(ipcMain, dialog, getMainWindow, getDb, store, getPathManager, () => {
    // Recharger le baseDirectory depuis le store
    const newBaseDirectory = store.get('baseDirectory');
    if (newBaseDirectory) {
      console.log('🔄 Recréation du PathManager avec le nouveau baseDirectory:', newBaseDirectory);
      pathManager = new PathManager(newBaseDirectory);
      pathManager.initializeStructure();
      
      const paths = pathManager.getPaths();
      if (db) {
        db.close(); // Fermer l'ancienne connexion
      }
      db = initDatabase(paths.database);
      console.log('✅ PathManager et base de données réinitialisés !');
    }
  }, app);
  registerSearchHandlers(ipcMain, shell);
  registerUserHandlers(ipcMain, dialog, getMainWindow, getDb, getPathManager);
  


  // Créer la fenêtre principale (nécessaire pour les dialogs)
  createWindow();

  // Récupérer ou demander le dossier racine
  const baseDirectory = await getBaseDirectory();
  console.log('📁 Base directory final utilisé:', baseDirectory);

  // Initialiser le gestionnaire de chemins
  pathManager = new PathManager(baseDirectory);
  console.log('📂 PathManager initialisé avec:', baseDirectory);
  
  // Créer l'arborescence si nécessaire
  pathManager.initializeStructure();

  // Récupérer les chemins
  const paths = pathManager.getPaths();
  



  // Initialiser la base de données

  db = initDatabase(paths.database);


  // Démarrer le serveur d'import (pour le script Tampermonkey)
  const IMPORT_PORT = 51234;
  try {
    importServer = createImportServer(IMPORT_PORT, getDb, store, mainWindow, pathManager);
  } catch (error) {
    console.warn('⚠️ Serveur d\'import non démarré:', error.message);
  }

  // Démarrer le scheduler de synchronisation MAL
  try {
    startScheduler(getDb(), store, mainWindow);
    
    // Effectuer une sync au démarrage si nécessaire
    syncOnStartup(getDb(), store).catch(err => {
      console.warn('⚠️ Sync MAL au démarrage échouée:', err.message);
    });
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
app.on('before-quit', (event) => {
  try {
    // Fermer le serveur d'import
    if (importServer) {
      importServer.close(() => {

      });
    }
    
    const currentUser = store.get('currentUser', '');
    if (currentUser && db && pathManager) {

      
      const paths = pathManager.getPaths();
      const userDbPath = path.join(paths.databases, `${currentUser.toLowerCase()}.db`);
      
      fs.copyFileSync(paths.database, userDbPath);
      

    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde finale:', error);
  } finally {
    if (db) {
      db.close();
    }
  }
});

// Les logs de démarrage sont maintenant affichés après l'initialisation
