const { app, BrowserWindow, ipcMain, dialog, protocol, shell, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Détection du mode développement : vérifier si Vite est en cours d'exécution
const isDev = !app.isPackaged;

// Services
const { initDatabase } = require('./services/database');
const { createImportServer } = require('./services/import-server');

// Handlers
const { registerMangaHandlers } = require('./handlers/manga-handlers');
const { registerAnimeHandlers } = require('./handlers/anime-handlers');
const { registerStatisticsHandlers } = require('./handlers/statistics-handlers');
const { registerSettingsHandlers } = require('./handlers/settings-handlers');
const { registerSearchHandlers } = require('./handlers/search-handlers');
const { registerUserHandlers } = require('./handlers/user-handlers');

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
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.ico');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Afficher Ma Mangathèque',
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

  tray.setToolTip('Ma Mangathèque');
  tray.setContextMenu(contextMenu);

  // Double-clic sur l'icône pour afficher la fenêtre
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  console.log('📌 Icône ajoutée dans la zone de notification');
}

/**
 * Crée la fenêtre principale de l'application
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico')
  });

  // Intercepter la fermeture pour minimiser dans le tray au lieu de quitter
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Afficher une notification la première fois (Windows uniquement)
      if (!store.get('trayNotificationShown') && process.platform === 'win32') {
        try {
          tray.displayBalloon({
            title: 'Ma Mangathèque',
            content: 'L\'application continue de fonctionner en arrière-plan. Clic droit sur l\'icône pour quitter.',
            iconType: 'info'
          });
        } catch (error) {
          console.log('ℹ️ Notification tray non disponible');
        }
        store.set('trayNotificationShown', true);
      }
      
      return false;
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

/**
 * Récupère ou crée automatiquement le dossier racine de l'application
 * Ne demande JAMAIS à l'utilisateur - utilise le chemin par défaut
 */
async function getBaseDirectory() {
  let storedPath = store.get('baseDirectory');

  // Si un chemin existe et qu'il est valide, l'utiliser
  if (storedPath && fs.existsSync(storedPath)) {
    const tempManager = new PathManager(storedPath);
    if (tempManager.isValidStructure()) {
      console.log(`✅ Ma Mangathèque trouvée: ${storedPath}`);
      return storedPath;
    }
  }

  // Premier lancement : utiliser automatiquement le chemin par défaut
  // L'utilisateur choisira l'emplacement définitif dans l'OnboardingWizard
  const defaultPath = path.join(userDataPath, 'Ma Mangatheque');
  store.set('baseDirectory', defaultPath);
  console.log(`📁 Création automatique dans l'emplacement par défaut: ${defaultPath}`);
  return defaultPath;
}

/**
 * Enregistre le protocole manga:// pour servir les fichiers locaux de manière sécurisée
 */
function registerMangaProtocol() {
  protocol.registerFileProtocol('manga', (request, callback) => {
    try {
      // Extraire le chemin du fichier depuis l'URL manga://
      const url = request.url.replace('manga://', '');
      
      // Décoder l'URL pour gérer les espaces et caractères spéciaux
      const decodedPath = decodeURIComponent(url);
      
      // Retourner le chemin du fichier
      callback({ path: decodedPath });
    } catch (error) {
      console.error('Erreur protocole manga:', error);
      callback({ error: -2 }); // FILE_NOT_FOUND
    }
  });
}

/**
 * Point d'entrée de l'application
 */
app.whenReady().then(async () => {
  // Enregistrer le protocole personnalisé
  registerMangaProtocol();

  // Logs de démarrage
  console.log('='.repeat(50));
  console.log('🚀 Ma Mangathèque - Démarrage');
  console.log('📁 Chemin userData:', userDataPath);
  console.log('🔧 Mode:', isDev ? 'Développement' : 'Production');
  console.log('='.repeat(50));

  // Créer l'icône dans la zone de notification
  createTray();

  // Créer des fonctions pour récupérer les variables (seront initialisées plus tard)
  const getPathManager = () => pathManager;
  const getMainWindow = () => mainWindow;
  const getDb = () => db;

  // Enregistrer tous les handlers IPC AVANT de créer la fenêtre
  console.log('🔌 Enregistrement des handlers IPC...');
  
  registerMangaHandlers(ipcMain, getDb, getPathManager, store);
  registerAnimeHandlers(ipcMain, getDb, store);
  registerStatisticsHandlers(ipcMain, getDb, store);
  registerSettingsHandlers(ipcMain, dialog, getMainWindow, getDb, store, getPathManager, () => {
    const paths = pathManager?.getPaths();
    if (paths) db = initDatabase(paths.database);
  });
  registerSearchHandlers(ipcMain, shell);
  registerUserHandlers(ipcMain, dialog, getMainWindow, getDb, getPathManager);
  
  console.log('✅ Handlers IPC enregistrés');

  // Créer la fenêtre principale (nécessaire pour les dialogs)
  createWindow();

  // Récupérer ou demander le dossier racine
  const baseDirectory = await getBaseDirectory();

  // Initialiser le gestionnaire de chemins
  pathManager = new PathManager(baseDirectory);
  
  // Créer l'arborescence si nécessaire
  pathManager.initializeStructure();

  // Récupérer les chemins
  const paths = pathManager.getPaths();
  
  console.log('📂 Ma Mangathèque:', paths.base);
  console.log('📦 Base de données:', paths.database);

  // Initialiser la base de données
  console.log('📦 Initialisation de la base de données...');
  db = initDatabase(paths.database);
  console.log('✅ Base de données initialisée');

  // Démarrer le serveur d'import (pour le script Tampermonkey)
  const IMPORT_PORT = 51234;
  try {
    importServer = createImportServer(IMPORT_PORT, getDb, store, mainWindow, pathManager);
  } catch (error) {
    console.warn('⚠️ Serveur d\'import non démarré:', error.message);
  }

  // Handler IPC pour minimiser dans le tray
  ipcMain.handle('minimize-to-tray', () => {
    if (mainWindow) {
      mainWindow.hide();
      console.log('🔽 Fenêtre minimisée dans le tray');
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
  console.log('🔄 Fenêtre fermée, application en arrière-plan');
});

// Sauvegarder la base de données avant de quitter
app.on('before-quit', (event) => {
  try {
    // Fermer le serveur d'import
    if (importServer) {
      importServer.close(() => {
        console.log('🌐 Serveur d\'import arrêté');
      });
    }
    
    const currentUser = store.get('currentUser', '');
    if (currentUser && db && pathManager) {
      console.log('💾 Sauvegarde finale de la base de données...');
      
      const paths = pathManager.getPaths();
      const userDbPath = path.join(paths.databases, `${currentUser.toLowerCase()}.db`);
      
      fs.copyFileSync(paths.database, userDbPath);
      
      console.log('✅ Sauvegarde terminée');
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
