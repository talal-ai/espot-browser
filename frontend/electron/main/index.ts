import { app, BrowserWindow, ipcMain, Menu, shell, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { applySpoofingProfile, createSpoofedWindow, FingerprintProfile } from './fingerprint-injector';
import axios from 'axios';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if in development mode
const isDev = process.env.NODE_ENV === 'development';

// API Base URL
const API_BASE_URL = process.env.API_BASE_URL ?? (isDev ? 'http://localhost:8000' : 'https://espot-browser.onrender.com');

// Global reference to mainWindow to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

// Create the main window
function createMainWindow() {
  // Resolve dev icon for Windows/Linux from project assets
  const devIconPath = path.join(process.cwd(), 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f172a',
    show: false,
    frame: true,
    titleBarStyle: 'default',
    icon: isDev ? (nativeImage.createFromPath(devIconPath) || undefined) : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // TEMP: Disabled for testing - remove in production
      preload: path.join(__dirname, isDev ? '../preload/index.js' : './preload.js'),
      spellcheck: false,
      devTools: isDev,
    },
  });

  // Set window title
  mainWindow.setTitle('ESPOT Browser');

  // Add listeners to catch renderer process errors
  mainWindow.webContents.on('crashed', () => {
    console.error('[ESPOT] Renderer process crashed');
  });
  
  mainWindow.webContents.on('console-message', (level, message, line, sourceId) => {
    console.log(`[RENDERER] [${level}] ${message} (${sourceId}:${line})`);
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.error('Failed to load URL:', err);
      setTimeout(() => {
        mainWindow?.loadURL('http://localhost:5173');
      }, 1000);
    });
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from dist folder
    const fs = require('fs');
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('[ESPOT] __dirname:', __dirname);
    console.log('[ESPOT] Attempting to load:', indexPath);
    console.log('[ESPOT] File exists:', fs.existsSync(indexPath));
    
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[ESPOT] Failed to load index.html:', err);
    });
    
    // Open DevTools for debugging
    setTimeout(() => {
      mainWindow?.webContents.openDevTools();
    }, 1000);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Browser Launch Handler (Modified for Spoofing)
  ipcMain.handle('browser:launch', async (_event, url: string, profileId?: string, userId?: string) => {
    try {
      console.log(`[ESPOT] Launching browser for User: ${userId}, Profile: ${profileId}`);
      
      // 1. Fetch Fingerprint Profile from Backend
      let profile: FingerprintProfile | null = null;
      
      if (profileId) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/fingerprints/${profileId}`);
          profile = response.data;
          console.log('[ESPOT] ✅ Fetched profile from backend:', profile?.name);
        } catch (error) {
          console.error('[ESPOT] ❌ Failed to fetch profile:', error instanceof Error ? error.message : String(error));
        }
      }
      
      // 2. If no profile specified or fetch failed, get user's default profile
      if (!profile && userId) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/admin/users/${userId}/fingerprints`);
          const userProfiles = response.data;
          
          // Find default profile
          const defaultProfile = userProfiles.find((p: any) => p.is_default);
          if (defaultProfile && defaultProfile.profile) {
            profile = defaultProfile.profile;
            console.log('[ESPOT] ✅ Using default profile for user');
          }
        } catch (error) {
          console.error('[ESPOT] ❌ Failed to fetch user profiles:', error instanceof Error ? error.message : String(error));
        }
      }
      
      // 3. Create window with or without spoofing
      if (profile) {
        // Create spoofed window
        const child = await createSpoofedWindow(profile, url, {
          width: 1200,
          height: 800,
          show: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload/index.js'),
            spellcheck: false,
            devTools: isDev,
          },
        });
        
        console.log(`[ESPOT] ✅ Launched spoofed browser with profile: ${profile.name || profile.id}`);
        return { success: true, windowId: child.id, profileApplied: true };
        
      } else {
        // Fallback: create normal window without spoofing
        console.warn('[ESPOT] ⚠️ No profile available, launching without spoofing');
        
        const child = new BrowserWindow({
          width: 1200,
          height: 800,
          show: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload/index.js'),
            spellcheck: false,
            devTools: isDev,
          },
        });
        
        child.loadURL(url);
        return { success: true, windowId: child.id, profileApplied: false };
      }
    } catch (error) {
      console.error('[ESPOT] ❌ Error launching browser:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // This catches window.open() calls from the renderer
    // We can intercept this to apply the default profile for the current user
    
    const child = new BrowserWindow({
      width: 1200,
      height: 800,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/index.js'),
        spellcheck: false,
        devTools: isDev,
      },
    });
    child.loadURL(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
}

// App ready event
app.whenReady().then(() => {
  createMainWindow();

  // Re-create window on activation (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  // Set up IPC handlers
  setupIpcHandlers();
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Set up IPC handlers
function setupIpcHandlers() {
  // App info
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getPath', (_, name) => app.getPath(name as any));

  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.close());

  ipcMain.handle('window:openUrl', (_event, url: string) => {
    const child = new BrowserWindow({
      width: 1200,
      height: 800,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/index.js'),
        spellcheck: false,
        devTools: isDev,
      },
    });
    child.loadURL(url);
  });

  // Admin API
  ipcMain.handle('admin:getUsers', async () => {
    // TODO: Implement API call to backend
    return { success: true, data: [] };
  });

  ipcMain.handle('admin:createUser', async (_, userData) => {
    // TODO: Implement API call to backend
    return { success: true, data: userData };
  });

  // Proxy API
  ipcMain.handle('proxy:getProxies', async () => {
    // TODO: Implement API call to backend
    return { success: true, data: [] };
  });

  ipcMain.handle('proxy:testProxy', async (_, proxyId) => {
    // TODO: Implement API call to backend
    return { success: true, data: { status: 'success', latency: 120 } };
  });

  // System API
  ipcMain.handle('system:getStats', async () => {
    // TODO: Implement API call to backend
    return { success: true, data: { users: 0, proxies: 0, sessions: 0 } };
  });

  ipcMain.handle('system:getHealth', async () => {
    // TODO: Implement API call to backend
    return { success: true, data: { status: 'healthy' } };
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
