import fs from 'node:fs';
import { app, BrowserWindow, ipcMain, Menu, shell, nativeImage, session, net } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { FingerprintProfile, createSpoofedWindow, applySpoofingProfile } from './fingerprint-injector';
import { generateModernAutofillScript } from './autofill-generator';
import axios from 'axios';
import contextMenu from 'electron-context-menu';



const APP_ID = 'com.espot.browser.v2';
const APP_NAME = 'ESPOT Browser';

// API Base URL for fetching profiles
const API_BASE_URL = process.env.API_BASE_URL ?? (process.env.NODE_ENV === 'development'
  ? 'http://localhost:8000'
  : 'https://espot-browser.onrender.com');

// Check if in development mode
const isDev = process.env.NODE_ENV === 'development';

// Enable context menu (Copy, Paste, etc.)
contextMenu({
  showLookUpSelection: false,
  showSearchWithGoogle: false,
  showInspectElement: false,
});
// DISABLED: Browser feature restrictions (was causing Google login issues)
// process.env.STRICT_WEBRTC = process.env.STRICT_WEBRTC || '1';
// const STRICT_WEBRTC_ENABLED = process.env.STRICT_WEBRTC === '1';
const STRICT_WEBRTC_ENABLED = false; // Disabled for Google login compatibility

// Chrome User Agent (stealth files deleted, keeping just the UA)
const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Crash handlers to debug ACCESS_VIOLATION errors
process.on('uncaughtException', (error) => {
  console.error('[ESPOT] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ESPOT] Unhandled Rejection at:', promise, 'reason:', reason);
});

app.on('render-process-gone', (event, webContents, details) => {
  console.error('[ESPOT] Render process gone:', details);
});

app.on('child-process-gone', (event, details) => {
  console.error('[ESPOT] Child process gone:', details);
});

// NOTE: NO command line switches or global user agent
// The working app doesn't use these - they trigger Google detection
// Stealth is applied per-window in the IPC handlers instead

// Ensure OS-level identity is branded before windows are created
if (app.setName) app.setName(APP_NAME);
if (app.setAppUserModelId) app.setAppUserModelId(APP_ID);

// Global reference to mainWindow to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

// Global fingerprint profile tracking
let activeProfile: FingerprintProfile | null = null;
let activeUserId: string | null = null;

// Function to set active profile
function setActiveProfile(profile: FingerprintProfile | null, userId: string | null) {
  try {
    // Safely copy the profile to avoid reference issues
    if (profile) {
      activeProfile = {
        id: profile.id || '',
        name: profile.name || '',
        user_agent: profile.user_agent || '',
        platform: profile.platform || 'Win32',
        hardware_concurrency: profile.hardware_concurrency || 8,
        device_memory: profile.device_memory || 8,
        screen_width: profile.screen_width || 1920,
        screen_height: profile.screen_height || 1080,
        color_depth: profile.color_depth || 24,
        pixel_ratio: profile.pixel_ratio || 1,
        timezone: profile.timezone || 'America/New_York',
        language: profile.language || 'en-US',
        locale: profile.locale || 'en-US',
        webgl_vendor: profile.webgl_vendor || '',
        webgl_renderer: profile.webgl_renderer || '',
        webgl_params: profile.webgl_params || {},
        audio_context: profile.audio_context || {},
        seed: profile.seed || Math.floor(Math.random() * 1000000),
        max_touch_points: profile.max_touch_points || 0,
      };
    } else {
      activeProfile = null;
    }
    activeUserId = userId;
    console.log('[ESPOT] Active profile set:', activeProfile?.name || activeProfile?.id || 'none');
  } catch (err) {
    console.error('[ESPOT] Error in setActiveProfile:', err);
    activeProfile = null;
    activeUserId = null;
  }
}

// Global proxy configuration state
interface ProxyConfig {
  protocol: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
}

let activeProxyConfig: ProxyConfig | null = null;

// Session management for per-user proxy isolation (Step 4)
interface UserSession {
  userId: string;
  sessionPartition: string;
  proxyConfig: ProxyConfig | null;
  window?: BrowserWindow;
}

const userSessions = new Map<string, UserSession>();

// Create the main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f172a',
    show: false,
    frame: true,
    titleBarStyle: 'default',
    fullscreen: false,
    fullscreenable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false,
      devTools: isDev,
      webviewTag: true, // Enable <webview> tag for browser-like tab functionality
      ...(STRICT_WEBRTC_ENABLED ? { webSecurity: true, sandbox: true } : {}),
    },
    icon: (() => {
      const iconPath = path.join(__dirname, '../assets/icon.ico');
      console.log('[ESPOT] Icon path:', iconPath);
      console.log('[ESPOT] Icon exists:', fs.existsSync(iconPath));
      return iconPath;
    })(),
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server (dashboard will be loaded by React Router)
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.error('Failed to load URL:', err);
      // Retry after a short delay if Vite server isn't ready yet
      setTimeout(() => {
        mainWindow?.loadURL('http://localhost:5173');
      }, 1000);
    });
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    const htmlPath = path.join(__dirname, '../dist/index.html');
    console.log('Production mode - Loading from:', htmlPath);
    console.log('__dirname:', __dirname);
    mainWindow.loadFile(htmlPath).catch((err) => {
      console.error('Failed to load HTML file:', err);
    });
    
    // Open DevTools in production for debugging
    setTimeout(() => {
      mainWindow?.webContents.openDevTools();
    }, 1000);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.maximize();
  });

  // Log renderer console messages
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`);
  });

  // Log renderer crashes
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('Renderer process crashed:', { killed });
  });

  if (mainWindow && STRICT_WEBRTC_ENABLED) {
    hardenWebRTC(mainWindow);
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Check if this is a Google URL
    const isGoogleUrl = url.includes('google.com') ||
      url.includes('accounts.google.com') ||
      url.includes('googleapis.com');

    // Create child window with spoofing if we have an active profile
    (async () => {
      try {
        // Determine session partition: use active user's partition if available
        let sessionPartition = undefined;
        if (activeUserId) {
          const userSession = userSessions.get(activeUserId);
          if (userSession) {
            sessionPartition = userSession.sessionPartition;
            console.log(`[ESPOT] Using session partition for user ${activeUserId}:`, sessionPartition);
          }
        }

        // For Google URLs, use stealth window (same as working app)
        if (isGoogleUrl) {
          console.log('[ESPOT] Opening Google URL with stealth window:', url);
          const googleChild = new BrowserWindow({
            width: 600,
            height: 700,
            show: true,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              preload: path.join(__dirname, 'preload.js'),
              spellcheck: false,
              devTools: isDev,
              webSecurity: true,  // Keep enabled for Google trust
              partition: sessionPartition, // Use user's session partition with proxy
            },
          });



          // Inject stealth headers for ALL URLs
          googleChild.webContents.session.webRequest.onBeforeSendHeaders(
            { urls: ['<all_urls>'] },
            (details, callback) => {
              details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
              details.requestHeaders['Accept-Language'] = 'en-US,en;q=0.9';
              details.requestHeaders['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"';
              details.requestHeaders['Sec-Ch-Ua-Mobile'] = '?0';
              details.requestHeaders['Sec-Ch-Ua-Platform'] = '"Windows"';
              details.requestHeaders['Sec-Fetch-Site'] = 'none';
              details.requestHeaders['Sec-Fetch-Mode'] = 'navigate';
              details.requestHeaders['Sec-Fetch-User'] = '?1';
              details.requestHeaders['Sec-Fetch-Dest'] = 'document';
              callback({ requestHeaders: details.requestHeaders });
            }
          );

          // Stealth script - compact version
          const script = `(function(){delete window.require;delete window.exports;delete window.module;delete window.process;delete window.Buffer;delete window.global;Object.defineProperty(navigator,'platform',{get:()=>'Win32',configurable:false});Object.defineProperty(navigator,'vendor',{get:()=>'Google Inc.',configurable:false});Object.defineProperty(navigator,'webdriver',{get:()=>undefined,configurable:false});if(!window.chrome)window.chrome={runtime:{},loadTimes:function(){},csi:function(){},app:{}};})();`;

          googleChild.webContents.on('dom-ready', () => {
            googleChild.webContents.executeJavaScript(script).catch(() => { });
          });

          googleChild.webContents.on('did-finish-load', () => {
            googleChild.webContents.executeJavaScript(script).catch(() => { });
          });

          googleChild.loadURL(url);
          return;
        }

        if (activeProfile) {
          // ✅ Apply fingerprint spoofing to child window!
          console.log('[ESPOT] Opening child window with spoofing profile:', activeProfile.id);
          const child = await createSpoofedWindow(activeProfile, url, {
            width: 1200,
            height: 800,
            show: true,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              preload: path.join(__dirname, 'preload.js'),
              spellcheck: false,
              devTools: isDev,
              webviewTag: true,
              partition: sessionPartition, // Use user's session partition with proxy
              ...(STRICT_WEBRTC_ENABLED ? { webSecurity: true, sandbox: true } : {}),
            },
          });
          if (STRICT_WEBRTC_ENABLED) hardenWebRTC(child);
        } else {
          // No active profile - create plain window (less secure)
          console.warn('[ESPOT] ⚠️ No active profile, opening child WITHOUT spoofing');
          const child = new BrowserWindow({
            width: 1200,
            height: 800,
            show: true,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              preload: path.join(__dirname, 'preload.js'),
              partition: sessionPartition, // Use user's session partition with proxy
              spellcheck: false,
              devTools: isDev,
              webviewTag: true,
              ...(STRICT_WEBRTC_ENABLED ? { webSecurity: true, sandbox: true } : {}),
            },
          });

          // At least remove webdriver flag
          child.webContents.on('did-finish-load', () => {
            child.webContents.executeJavaScript(`
              Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
              });
            `);
          });

          child.loadURL(url);
          if (STRICT_WEBRTC_ENABLED) hardenWebRTC(child);
        }
      } catch (error) {
        console.error('[ESPOT] Error opening child window:', error);
      }
    })();

    return { action: 'deny' };
  });

  // Create application menu
  // createMenu(); // DISABLED: Remove top bar
  Menu.setApplicationMenu(null); // Explicitly remove menu
}

// Create application menu (UNUSED)
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
  // IMPORTANT: Set up IPC handlers BEFORE creating windows
  // This prevents race conditions where renderer calls IPC before handlers are registered
  setupIpcHandlers();

  // Set up proxy authentication handler
  setupProxyAuthHandler();

  // Now create the main window (after handlers are ready)
  createMainWindow();

  // Initialize auto-updater after window is created
  setupAutoUpdater();

  // Re-create window on activation (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  if (STRICT_WEBRTC_ENABLED) {
    applyStrictPermissions(session.defaultSession);
  }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Set up global proxy authentication handler
 * This handles authentication for both global and per-user proxies
 */
function setupProxyAuthHandler() {
  app.on('login', (event, webContents, details, authInfo, callback) => {
    if (authInfo.isProxy) {
      event.preventDefault();

      // Check if there's an active global proxy with credentials
      if (activeProxyConfig && activeProxyConfig.username && activeProxyConfig.password) {
        console.log('🔐 Providing proxy authentication (global)');
        callback(activeProxyConfig.username, activeProxyConfig.password);
        return;
      }

      // Check if the webContents belongs to a user session with proxy credentials
      const browserWindow = BrowserWindow.fromWebContents(webContents);
      if (browserWindow) {
        for (const [userId, userSession] of userSessions) {
          if (userSession.window === browserWindow &&
            userSession.proxyConfig &&
            userSession.proxyConfig.username &&
            userSession.proxyConfig.password) {
            console.log(`🔐 Providing proxy authentication for user ${userId}`);
            callback(userSession.proxyConfig.username, userSession.proxyConfig.password);
            return;
          }
        }
      }

      // No credentials available
      console.warn('⚠️ Proxy authentication requested but no credentials configured');
      callback('', ''); // Provide empty credentials
    }
  });
}


// Set up IPC handlers
function setupIpcHandlers() {
  // ============================================================================
  // FINGERPRINT PROFILE HANDLERS
  // ============================================================================

  ipcMain.handle('fingerprint:setActive', async (_event, profile: FingerprintProfile | null, userId: string | null) => {
    try {
      console.log('[ESPOT] IPC fingerprint:setActive received');
      setActiveProfile(profile, userId);
      return { success: true };
    } catch (err) {
      console.error('[ESPOT] Error in fingerprint:setActive handler:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('fingerprint:getActive', async () => {
    return { profile: activeProfile, userId: activeUserId };
  });

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

  ipcMain.handle('window:openUrl', (_event, url: string, userId?: string) => {
    // If userId is provided, use their session partition (which has proxy configured)
    let webPreferences: any = {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false,
      devTools: isDev,
      ...(STRICT_WEBRTC_ENABLED ? { webSecurity: true, sandbox: true } : {}),
    };

    // Use user's session partition if userId provided (inherits proxy settings)
    if (userId) {
      const userSession = userSessions.get(userId);
      if (userSession) {
        webPreferences.partition = userSession.sessionPartition;
        console.log(`🔒 Opening URL with user ${userId}'s session (proxy: ${userSession.proxyConfig ? 'active' : 'none'})`);
      } else {
        // Create new session partition for this user
        webPreferences.partition = `persist:user-${userId}`;
        console.log(`🔒 Opening URL with new session partition for user ${userId}`);
      }
    }

    const child = new BrowserWindow({
      width: 1200,
      height: 800,
      show: true,
      webPreferences,
    });
    
    // If user has proxy configured, ensure it's applied to this window's session
    if (userId) {
      const userSession = userSessions.get(userId);
      if (userSession?.proxyConfig) {
        const ses = session.fromPartition(webPreferences.partition);
        const proxyRules = `${userSession.proxyConfig.protocol}://${userSession.proxyConfig.host}:${userSession.proxyConfig.port}`;
        ses.setProxy({ proxyRules, proxyBypassRules: '<local>' }).then(() => {
          console.log(`✅ Proxy applied to child window for user ${userId}`);
        });
      }
    }
    
    child.loadURL(url);
  });

  // Clear app cache, cookies, and storage (useful when Google shows cookie errors)
  ipcMain.handle('app:clearCache', async () => {
    try {
      console.log('[ESPOT] Clearing app cache, cookies, and storage...');

      // 1) Clear default session storage (cookies, localStorage, etc.)
      try {
        await session.defaultSession.clearStorageData();
        await session.defaultSession.clearCache();
        console.log('[ESPOT] Default session storage and cache cleared');
      } catch (err) {
        console.warn('[ESPOT] Warning clearing default session:', err);
      }

      // 2) Flush any cookies to disk then remove cookie store entries
      try {
        await session.defaultSession.cookies.flushStore();
        const cookies = await session.defaultSession.cookies.get({});
        for (const c of cookies) {
          await session.defaultSession.cookies.remove((c.secure ? 'https://' : 'http://') + c.domain + (c.path || '/'), c.name).catch(() => { });
        }
        console.log('[ESPOT] Cookies removed from default session');
      } catch (err) {
        console.warn('[ESPOT] Warning removing cookies:', err);
      }

      // 3) Remove userData cache folders on disk (best-effort)
      try {
        const userDataPath = app.getPath('userData');
        const cachePath = path.join(userDataPath, 'Cache');
        const GPUCache = path.join(userDataPath, 'GPUCache');
        const storages = [cachePath, GPUCache];
        const fs = await import('fs');
        for (const p of storages) {
          try {
            if (fs.existsSync(p)) {
              // remove recursively
              fs.rmSync(p, { recursive: true, force: true });
              console.log('[ESPOT] Removed', p);
            }
          } catch (err) {
            console.warn('[ESPOT] Warning removing folder', p, err);
          }
        }
      } catch (err) {
        console.warn('[ESPOT] Warning cleaning userData cache folders:', err);
      }

      // 4) Optionally reload main window to apply changes
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      } catch { }

      return { success: true };
    } catch (err) {
      console.error('[ESPOT] Error in app:clearCache handler:', err);
      return { success: false, error: String(err) };
    }
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

  // ============================================================================
  // PROXY CONFIGURATION HANDLERS (New - Step 2)
  // ============================================================================

  /**
   * Activate proxy for browser traffic
   * Called when user clicks "Activate" in UI
   */
  ipcMain.handle('proxy:activate', async (_, proxyConfig: ProxyConfig) => {
    try {
      console.log('🔄 IPC: Received proxy activation request');
      await applyProxyToSession(proxyConfig);
      return {
        success: true,
        message: 'Proxy activated successfully',
        config: proxyConfig
      };
    } catch (error) {
      console.error('❌ IPC: Failed to activate proxy:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Deactivate proxy for browser traffic
   * Called when user clicks "Deactivate" in UI
   */
  ipcMain.handle('proxy:deactivate', async () => {
    try {
      console.log('🔄 IPC: Received proxy deactivation request');
      await deactivateProxy();
      return {
        success: true,
        message: 'Proxy deactivated successfully'
      };
    } catch (error) {
      console.error('❌ IPC: Failed to deactivate proxy:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get current proxy status
   * Called by UI to check if proxy is active
   */
  ipcMain.handle('proxy:getStatus', async () => {
    try {
      const status = getProxyStatus();
      return {
        success: true,
        data: status
      };
    } catch (error) {
      console.error('❌ IPC: Failed to get proxy status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Verify proxy is working
   * Called to check if traffic is actually being routed through proxy
   */
  ipcMain.handle('proxy:verify', async () => {
    try {
      console.log('🔄 IPC: Verifying proxy is working...');
      const result = await verifyProxyWorking();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ IPC: Failed to verify proxy:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================================================
  // PER-USER SESSION PROXY HANDLERS (Step 4)
  // ============================================================================

  /**
   * Activate proxy for a specific user (isolated session)
   * Allows different users to use different proxies
   */
  ipcMain.handle('proxy:activateForUser', async (_, userId: string, proxyConfig: ProxyConfig) => {
    try {
      console.log(`🔄 IPC: Activating proxy for user ${userId}`);
      await applyProxyToUserSession(userId, proxyConfig);
      return {
        success: true,
        message: `Proxy activated for user ${userId}`,
        userId,
        config: proxyConfig
      };
    } catch (error) {
      console.error(`❌ IPC: Failed to activate proxy for user ${userId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Deactivate proxy for a specific user
   */
  ipcMain.handle('proxy:deactivateForUser', async (_, userId: string) => {
    try {
      console.log(`🔄 IPC: Deactivating proxy for user ${userId}`);
      await deactivateUserProxy(userId);
      return {
        success: true,
        message: `Proxy deactivated for user ${userId}`,
        userId
      };
    } catch (error) {
      console.error(`❌ IPC: Failed to deactivate proxy for user ${userId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get proxy status for a specific user
   */
  ipcMain.handle('proxy:getUserStatus', async (_, userId: string) => {
    try {
      const status = getUserProxyStatus(userId);
      return {
        success: true,
        data: status
      };
    } catch (error) {
      console.error(`❌ IPC: Failed to get user proxy status:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Create a browser window for a specific user with isolated session
   */
  ipcMain.handle('window:createForUser', async (_, userId: string, url?: string) => {
    try {
      console.log(`🔄 IPC: Creating window for user ${userId}`);
      const window = createUserWindow(userId, url);
      return {
        success: true,
        message: `Window created for user ${userId}`,
        userId
      };
    } catch (error) {
      console.error(`❌ IPC: Failed to create user window:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Get all user sessions (for admin monitoring)
   */
  ipcMain.handle('proxy:getAllUserSessions', async () => {
    try {
      const sessions = getAllUserSessions();
      return {
        success: true,
        data: sessions
      };
    } catch (error) {
      console.error('❌ IPC: Failed to get user sessions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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

  // ============================================================================
  // GOOGLE AUTH HANDLERS (Stealth files deleted)
  // ============================================================================

  /**
   * Open Google OAuth with stealth techniques (from working app)
   * Uses Chrome headers + script injection to bypass Google detection
   */
  ipcMain.handle('google:openAuth', async (_, url: string) => {
    try {
      console.log('[Google] Opening stealth auth window for:', url);

      const authWindow = new BrowserWindow({
        width: 600,
        height: 700,
        resizable: true,
        minimizable: false,
        maximizable: false,
        title: 'Sign in with Google',
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          // CRITICAL: Keep webSecurity enabled - Google trusts this more
          webSecurity: true,
          // User agent is set via session headers below
        },
      });

      // CRITICAL: Inject Chrome Client Hints headers (Google checks these)
      // Apply to ALL requests in this window's session
      authWindow.webContents.session.webRequest.onBeforeSendHeaders(
        { urls: ['<all_urls>'] },  // Explicitly apply to all URLs
        (details, callback) => {
          details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
          details.requestHeaders['Accept-Language'] = 'en-US,en;q=0.9';
          details.requestHeaders['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"';
          details.requestHeaders['Sec-Ch-Ua-Mobile'] = '?0';
          details.requestHeaders['Sec-Ch-Ua-Platform'] = '"Windows"';
          details.requestHeaders['Sec-Fetch-Site'] = 'none';
          details.requestHeaders['Sec-Fetch-Mode'] = 'navigate';
          details.requestHeaders['Sec-Fetch-User'] = '?1';
          details.requestHeaders['Sec-Fetch-Dest'] = 'document';
          callback({ requestHeaders: details.requestHeaders });
        }
      );

      // JavaScript to inject - removes ALL Electron traces
      const stealthScript = `
        (function() {
          // Remove Electron-specific objects
          delete window.require;
          delete window.exports;
          delete window.module;
          delete window.process;
          delete window.Buffer;
          delete window.global;
          delete window.setImmediate;
          delete window.clearImmediate;
          
          // Override navigator properties
          Object.defineProperty(navigator, 'platform', {
            get: () => 'Win32',
            configurable: false
          });
          
          Object.defineProperty(navigator, 'vendor', {
            get: () => 'Google Inc.',
            configurable: false
          });
          
          Object.defineProperty(navigator, 'userAgent', {
            get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            configurable: false
          });
          
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
            configurable: false
          });
          
          Object.defineProperty(navigator, 'appVersion', {
            get: () => '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            configurable: false
          });
          
          // Add window.chrome object
          if (!window.chrome) {
            window.chrome = {
              runtime: {},
              loadTimes: function() {
                return {
                  commitLoadTime: Date.now() / 1000,
                  connectionInfo: 'h2',
                  finishDocumentLoadTime: Date.now() / 1000,
                  finishLoadTime: Date.now() / 1000,
                  firstPaintTime: Date.now() / 1000,
                  navigationType: 'Other',
                  requestTime: Date.now() / 1000 - 0.1,
                  startLoadTime: Date.now() / 1000 - 0.1
                };
              },
              csi: function() {
                return {
                  onloadT: Date.now(),
                  pageT: Date.now(),
                  startE: Date.now(),
                  tran: 15
                };
              },
              app: {}
            };
          }
        })();
      `;

      // Inject on both dom-ready (fast) and did-finish-load (complete)
      authWindow.webContents.on('dom-ready', () => {
        authWindow.webContents.executeJavaScript(stealthScript).catch(() => { });
      });

      authWindow.webContents.on('did-finish-load', () => {
        authWindow.webContents.executeJavaScript(stealthScript).catch(() => { });
      });

      authWindow.loadURL(url);

      // Return window ID so renderer can track it
      return {
        success: true,
        windowId: authWindow.id,
        message: 'Google auth window opened'
      };
    } catch (error) {
      console.error('[Google] Error opening auth window:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Clear Google session (logout from Google services)
   * Stealth files deleted - using standard session clearing
   */
  ipcMain.handle('google:clearSession', async () => {
    try {
      // Clear cookies and storage for Google domains
      await session.defaultSession.clearStorageData({
        origin: 'https://accounts.google.com',
      });
      await session.defaultSession.clearStorageData({
        origin: 'https://google.com',
      });
      console.log('[Google] Session cleared');
      return { success: true, message: 'Google session cleared' };
    } catch (error) {
      console.error('[Google] Error clearing session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================================================
  // BROWSER LAUNCH WITH FINGERPRINT SPOOFING
  // ============================================================================

  ipcMain.handle('browser:launch', async (_event, url: string, profileId?: string, userId?: string) => {
    try {
      console.log(`[ESPOT] browser:launch called - URL: ${url}, Profile: ${profileId}, User: ${userId}`);

      // 1. Use active profile if set, otherwise fetch from backend
      let profile: FingerprintProfile | null = activeProfile;

      // 2. If no active profile and profileId provided, fetch it
      if (!profile && profileId) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/fingerprints/${profileId}`);
          profile = response.data;
          console.log('[ESPOT] ✅ Fetched profile from backend:', profile?.name);
        } catch (error: any) {
          console.error('[ESPOT] ❌ Failed to fetch profile:', error.message);
        }
      }

      // 3. If still no profile and userId provided, get user's default profile
      if (!profile && userId) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/admin/users/${userId}/fingerprints`);
          const userProfiles = response.data;
          const defaultProfile = userProfiles.find((p: any) => p.is_default);
          if (defaultProfile && defaultProfile.profile) {
            profile = defaultProfile.profile;
            console.log('[ESPOT] ✅ Using default profile for user');
          }
        } catch (error: any) {
          console.error('[ESPOT] ❌ Failed to fetch user profiles:', error.message);
        }
      }

      // 4. Create window with or without spoofing
      if (profile) {
        // Set as active profile for child windows
        setActiveProfile(profile, userId || null);

        const child = await createSpoofedWindow(profile, url, {
          width: 1200,
          height: 800,
          show: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            spellcheck: false,
            devTools: isDev,
          },
        });

        if (STRICT_WEBRTC_ENABLED) hardenWebRTC(child);

        console.log(`[ESPOT] ✅ Launched spoofed browser with profile: ${profile.name || profile.id}`);
        return { success: true, windowId: child.id, profileApplied: true, profileName: profile.name };
      } else {
        // Fallback: plain window
        console.warn('[ESPOT] ⚠️ No profile available, launching WITHOUT spoofing');

        const child = new BrowserWindow({
          width: 1200,
          height: 800,
          show: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            spellcheck: false,
            devTools: isDev,
          },
        });

        child.loadURL(url);
        if (STRICT_WEBRTC_ENABLED) hardenWebRTC(child);

        return { success: true, windowId: child.id, profileApplied: false };
      }
    } catch (error: any) {
      console.error('[ESPOT] ❌ Error in browser:launch:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================================================
  // SERVICE LAUNCH WITH AUTOFILL + FINGERPRINT SPOOFING
  // ============================================================================

  ipcMain.handle('service:launch', async (_, launchData: {
    serviceId: string;
    url: string;
    username: string;
    password: string;
    userId?: string;  // Optional user ID to apply their fingerprint profile
  }) => {
    try {
      console.log(`🚀 Launching service: ${launchData.url}`);

      // Get active fingerprint profile for spoofing
      let profile: FingerprintProfile | null = activeProfile;

      // If no active profile, try to get user's default
      if (!profile && launchData.userId) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/admin/users/${launchData.userId}/fingerprints`);
          const userProfiles = response.data;
          const defaultProfile = userProfiles.find((p: any) => p.is_default);
          if (defaultProfile && defaultProfile.profile) {
            profile = defaultProfile.profile;
            setActiveProfile(profile, launchData.userId);
            console.log('[ESPOT] Using default fingerprint profile for service launch');
          }
        } catch (error) {
          console.warn('[ESPOT] Could not fetch user fingerprint profile');
        }
      }

      // Create isolated browser window - STARTS HIDDEN
      // If we have a profile, use spoofed window; otherwise plain window
      let serviceWindow: BrowserWindow;

      if (profile) {
        serviceWindow = await createSpoofedWindow(profile, launchData.url, {
          width: 1280,
          height: 900,
          show: false,  // CRITICAL: Start hidden to prevent any flash
          backgroundColor: '#0a0a0a',
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            partition: `persist:service-${launchData.serviceId}`,
            spellcheck: false,
            devTools: isDev,
            ...(STRICT_WEBRTC_ENABLED ? { webSecurity: true, sandbox: true } : {}),
          },
        });
        console.log('[ESPOT] ✅ Service window created with fingerprint spoofing');
      } else {
        serviceWindow = new BrowserWindow({
          width: 1280,
          height: 900,
          show: false,
          backgroundColor: '#0a0a0a',
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            partition: `persist:service-${launchData.serviceId}`,
            spellcheck: false,
            devTools: isDev,
            ...(STRICT_WEBRTC_ENABLED ? { webSecurity: true, sandbox: true } : {}),
          },
        });
        console.warn('[ESPOT] ⚠️ Service window created WITHOUT fingerprint spoofing');
      }

      console.log(`[${launchData.serviceId}] ✅ Service window created (hidden)`);

      // Apply proxy if active (check user-specific proxy first, then global proxy)
      let proxyToApply = activeProxyConfig;
      
      // Check for user-specific proxy (from user session)
      if (launchData.userId) {
        const userSession = userSessions.get(launchData.userId);
        if (userSession?.proxyConfig) {
          proxyToApply = userSession.proxyConfig;
          console.log(`[${launchData.serviceId}] 🔒 Using user-specific proxy: ${userSession.proxyConfig.host}:${userSession.proxyConfig.port}`);
        }
      }
      
      if (proxyToApply) {
        const proxyRules = `${proxyToApply.protocol}://${proxyToApply.host}:${proxyToApply.port}`;
        const ses = session.fromPartition(`persist:service-${launchData.serviceId}`);
        await ses.setProxy({ proxyRules, proxyBypassRules: '<local>' });
        console.log(`[${launchData.serviceId}] 🛡️ Proxy applied to service window`);
      }

      // Apply WebRTC hardening
      if (STRICT_WEBRTC_ENABLED) {
        hardenWebRTC(serviceWindow);
        const ses = session.fromPartition(`persist:service-${launchData.serviceId}`);
        applyStrictPermissions(ses);
      }

      // Track states
      const shouldInjectCredentials = !!(launchData.username && launchData.password);
      let overlayRemoved = false;
      let autofillInjected = false;
      let windowShown = false;

      // Overlay injection script
      const overlayScript = `
        (function() {
          if (document.getElementById('espot-loading-overlay')) return;
          
          const style = document.createElement('style');
          style.textContent = \`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
            #espot-loading-overlay {
              position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
              background: #0a0a0a; z-index: 2147483647;
              display: flex; align-items: center; justify-content: center;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              transition: opacity 0.4s ease;
            }
            .espot-container { text-align: center; }
            .espot-loader {
              width: 48px; height: 48px; margin: 0 auto 32px;
              border-radius: 50%; display: inline-block; position: relative;
              border: 3px solid; border-color: #fff #fff transparent transparent;
              box-sizing: border-box; animation: espotSpin 1s linear infinite;
            }
            .espot-loader::after, .espot-loader::before {
              content: ''; box-sizing: border-box; position: absolute;
              left: 0; right: 0; top: 0; bottom: 0; margin: auto;
              border: 3px solid; border-color: transparent transparent #666 #666;
              width: 40px; height: 40px; border-radius: 50%;
              animation: espotSpinBack 0.5s linear infinite;
            }
            .espot-loader::before {
              width: 32px; height: 32px;
              border-color: #fff #fff transparent transparent;
              animation: espotSpin 1.5s linear infinite;
            }
            @keyframes espotSpin { to { transform: rotate(360deg); } }
            @keyframes espotSpinBack { to { transform: rotate(-360deg); } }
            .espot-text {
              font-size: 14px; font-weight: 500; color: #fff;
              letter-spacing: 0.5px; text-transform: uppercase;
            }
          \`;
          document.head.appendChild(style);
          
          const overlay = document.createElement('div');
          overlay.id = 'espot-loading-overlay';
          overlay.innerHTML = '<div class="espot-container"><span class="espot-loader"></span><div class="espot-text">Secure Login</div></div>';
          document.body.appendChild(overlay);
          
          window.removeEspotOverlay = function() {
            const el = document.getElementById('espot-loading-overlay');
            if (el) {
              el.style.opacity = '0';
              setTimeout(() => el.remove(), 400);
            }
          };
          
          window.espotOverlayTimeout = setTimeout(() => {
            if (window.removeEspotOverlay) window.removeEspotOverlay();
          }, 30000);
        })();
      `;

      // Generate autofill script using the modern flow orchestrator
      const autofillScript = generateModernAutofillScript(launchData.username, launchData.password, launchData.url);
      const initialUrl = new URL(launchData.url);
      const initialPath = initialUrl.pathname.toLowerCase();

      // Navigation check - ONLY works after autofill is injected
      const checkLoginSuccess = (url: string) => {
        if (overlayRemoved || !autofillInjected) return;

        try {
          const currentUrl = new URL(url);
          const currentPath = currentUrl.pathname.toLowerCase();

          const isLoginPage = currentPath.includes('login') ||
            currentPath.includes('signin') ||
            currentPath.includes('auth');

          if (!isLoginPage && currentPath !== initialPath) {
            console.log(`[${launchData.serviceId}] 🎉 Login successful! → ${currentPath}`);
            overlayRemoved = true;
            serviceWindow.webContents.executeJavaScript(`
              if (window.espotOverlayTimeout) clearTimeout(window.espotOverlayTimeout);
              if (window.removeEspotOverlay) window.removeEspotOverlay();
            `).catch(() => { });
          }
        } catch (e) { }
      };

      // Set up event handlers BEFORE loading URL
      serviceWindow.webContents.on('dom-ready', async () => {
        // Inject overlay immediately ONLY if we have credentials
        if (shouldInjectCredentials) {
          await serviceWindow.webContents.executeJavaScript(overlayScript).catch(() => { });

          // Show window ONLY after overlay is injected
          if (!windowShown) {
            windowShown = true;
            serviceWindow.show();
            console.log(`[${launchData.serviceId}] 🎨 Overlay visible, window shown`);
          }
        } else {
          // No credentials = No overlay = Show immediately
          if (!windowShown) {
            windowShown = true;
            serviceWindow.show();
            console.log(`[${launchData.serviceId}] ✅ Window shown (No credentials)`);
          }
        }
      });

      serviceWindow.webContents.on('did-finish-load', async () => {
        // Remove webdriver detection
        await serviceWindow.webContents.executeJavaScript(`
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        `).catch(() => { });

        // Inject autofill
        if (shouldInjectCredentials) {
          try {
            await serviceWindow.webContents.executeJavaScript(autofillScript);
            autofillInjected = true;
            console.log(`[${launchData.serviceId}] ✅ Autofill injected`);
          } catch (e) { }
        }
      });

      serviceWindow.webContents.on('did-navigate', (_, url) => {
        if (shouldInjectCredentials) checkLoginSuccess(url);
      });
      serviceWindow.webContents.on('did-navigate-in-page', (_, url) => {
        if (shouldInjectCredentials) {
          checkLoginSuccess(url);
          // Re-inject autofill for multi-step logins using modern flow
          const reinjectedScript = generateModernAutofillScript(launchData.username, launchData.password, launchData.url);
          serviceWindow.webContents.executeJavaScript(reinjectedScript).catch(() => { });
        }
      });

      // Load the service URL
      console.log(`[${launchData.serviceId}] 🌐 Loading: ${launchData.url}`);
      await serviceWindow.loadURL(launchData.url);

      console.log(`[${launchData.serviceId}] ✅ Service launched`);

      return { success: true, message: 'Service launched with autofill' };

    } catch (error) {
      console.error('❌ Failed to launch service:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // ============================================================================
  // AUTO-UPDATE HANDLERS
  // ============================================================================
  ipcMain.handle('updater:check', async () => {
    // Temporarily disabled for testing
    // if (isDev) {
    //   return { success: false, error: 'Updates disabled in development' };
    // }
    
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('updater:quit-and-install', () => {
    // Temporarily disabled for testing
    // if (isDev) {
    //   return { success: false, error: 'Updates disabled in development' };
    // }
    
    // Quit and install the update
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  });
}

/**
 * Generate autofill script for login forms
 */
function generateAutofillScript(username: string, password: string, url: string): string {
  const escapedUsername = username.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
  const escapedPassword = password.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
  const isGoogle = url.includes('google.com') || url.includes('accounts.google');

  return `
(function() {
  'use strict';
  
  const USERNAME = "${escapedUsername}";
  const PASSWORD = "${escapedPassword}";
  const IS_GOOGLE = ${isGoogle};
  
  // Priority-ordered username selectors
  const usernameSelectors = [
    'input[autocomplete="username"]',
    'input[autocomplete="email"]',
    'input[type="email"]',
    'input[name="identifier"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[name="login"]',
    'input[name="user"]',
    'input[id*="email" i]',
    'input[id*="user" i]',
    'input[id*="login" i]',
    'input[placeholder*="email" i]',
    'input[placeholder*="user" i]',
    'input[aria-label*="email" i]',
    'input[aria-label*="user" i]',
    'input[type="text"]'
  ];
  
  // Password selectors
  const passwordSelectors = [
    'input[type="password"]',
    'input[autocomplete="current-password"]',
    'input[autocomplete="new-password"]',
    'input[name*="pass" i]',
    'input[id*="pass" i]'
  ];

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           el.offsetParent !== null;
  }

  function findField(selectors) {
    for (const selector of selectors) {
      try {
        const fields = document.querySelectorAll(selector);
        for (const field of fields) {
          if (isVisible(field) && !field.disabled && !field.readOnly) {
            return field;
          }
        }
      } catch (e) {}
    }
    return null;
  }

  function findByLabel(labelText) {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.textContent && label.textContent.toLowerCase().includes(labelText.toLowerCase())) {
        const forId = label.getAttribute('for');
        if (forId) {
          const input = document.getElementById(forId);
          if (input && isVisible(input)) return input;
        }
        const input = label.querySelector('input');
        if (input && isVisible(input)) return input;
      }
    }
    return null;
  }

  function fillField(field, value) {
    if (!field || !value) return false;
    
    field.focus();
    field.value = '';
    
    // Native value setter for React/Angular/Vue
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    if (nativeSetter) {
      nativeSetter.call(field, value);
    } else {
      field.value = value;
    }
    
    // Trigger all events
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    return true;
  }

  // Sign-in button selectors (priority ordered)
  const submitSelectors = [
    // Netflix specific
    'button[data-uia="login-submit-button"]',
    'button[data-uia*="login"]',
    'button[data-uia*="submit"]',
    // Generic submit
    'button[type="submit"]',
    'input[type="submit"]',
    // Data attributes
    'button[data-testid*="login" i]',
    'button[data-testid*="signin" i]',
    'button[data-testid*="sign-in" i]',
    // Name/ID
    'button[name*="login" i]',
    'button[name*="signin" i]',
    'button[id*="login" i]',
    'button[id*="signin" i]',
    'button[id*="sign-in" i]',
    // Class
    'button[class*="login" i]',
    'button[class*="signin" i]',
    'button[class*="submit" i]',
    'button[class*="btn-submit" i]',
    // Input values
    'input[value*="sign in" i]',
    'input[value*="login" i]',
    'input[value*="log in" i]',
    // Role buttons
    'a[role="button"][href*="login"]',
    'div[role="button"][data-testid*="login"]',
  ];

  // Text-based button finder - more aggressive
  function findButtonByText(texts) {
    // Look for ALL clickable elements
    const clickables = document.querySelectorAll('button, input[type="submit"], input[type="button"], a, div[role="button"], span[role="button"]');
    for (const el of clickables) {
      if (!isVisible(el)) continue;
      const elText = (el.textContent || el.value || el.innerText || '').toLowerCase().trim();
      for (const text of texts) {
        if (elText === text.toLowerCase() || elText.includes(text.toLowerCase())) {
          console.log('[ESPOT] Found button by text:', elText);
          return el;
        }
      }
    }
    return null;
  }

  function findSubmitButton() {
    console.log('[ESPOT] Searching for submit button...');
    
    // First try CSS selectors
    for (const selector of submitSelectors) {
      try {
        const btns = document.querySelectorAll(selector);
        for (const btn of btns) {
          if (isVisible(btn) && !btn.disabled) {
            console.log('[ESPOT] Found by selector:', selector);
            return btn;
          }
        }
      } catch (e) {}
    }
    
    // Then try text-based search (exact matches first)
    const exactTexts = ['sign in', 'signin'];
    let btn = findButtonByText(exactTexts);
    if (btn) return btn;
    
    // Broader text search
    const textMatches = ['log in', 'login', 'submit', 'continue', 'next', 'entrar', 'connexion'];
    return findButtonByText(textMatches);
  }

  function clickSubmit() {
    const submitBtn = findSubmitButton();
    if (submitBtn) {
      console.log('[ESPOT] Found submit button:', submitBtn.tagName, submitBtn.textContent || submitBtn.value || '');
      
      // Ensure button is in view
      submitBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
      
      // Focus and click with multiple methods
      submitBtn.focus();
      
      // Method 1: Direct click
      submitBtn.click();
      
      // Method 2: MouseEvent
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        button: 0
      });
      submitBtn.dispatchEvent(clickEvent);
      
      // Method 3: Pointer events (for modern sites)
      submitBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      submitBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      
      // Method 4: If it's a form, submit the form
      const form = submitBtn.closest('form');
      if (form) {
        console.log('[ESPOT] Also submitting parent form');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
      
      console.log('[ESPOT] ✅ Clicked sign-in button');
      return true;
    }
    console.log('[ESPOT] ❌ No submit button found');
    return false;
  }

  function autofill() {
    console.log('[ESPOT] Starting autofill...');
    
    // Find username field
    let usernameField = findByLabel('email') || findByLabel('username') || findByLabel('user') || findField(usernameSelectors);
    
    // Find password field
    let passwordField = findByLabel('password') || findField(passwordSelectors);
    
    let usernameFilled = false;
    let passwordFilled = false;
    
    // Fill username
    if (usernameField && !usernameField.value) {
      fillField(usernameField, USERNAME);
      console.log('[ESPOT] Username filled');
      usernameFilled = true;
    } else if (usernameField && usernameField.value) {
      usernameFilled = true; // Already filled
    }
    
    // Fill password
    if (passwordField && !passwordField.value) {
      fillField(passwordField, PASSWORD);
      console.log('[ESPOT] Password filled');
      passwordFilled = true;
    } else if (passwordField && passwordField.value) {
      passwordFilled = true; // Already filled
    } else if (!passwordField) {
      // Store for multi-step login
      sessionStorage.setItem('ESPOT_PASS', PASSWORD);
      console.log('[ESPOT] Password stored for next step');
    }
    
    // Auto-click sign-in if both fields are filled
    if (usernameFilled && passwordFilled) {
      setTimeout(() => {
        clickSubmit();
      }, 500); // Small delay to ensure form is ready
    } else if (usernameFilled && !passwordField) {
      // Multi-step login: click next/continue for username step
      setTimeout(() => {
        clickSubmit();
      }, 500);
    }
    
    return { username: !!usernameField, password: !!passwordField };
  }

  // Watch for password field on multi-step logins
  function watchForPassword() {
    const stored = sessionStorage.getItem('ESPOT_PASS');
    if (!stored) return;
    
    const observer = new MutationObserver(() => {
      const pwField = findField(passwordSelectors);
      if (pwField && !pwField.value) {
        fillField(pwField, stored);
        sessionStorage.removeItem('ESPOT_PASS');
        console.log('[ESPOT] Password filled (delayed)');
        
        // Click submit after filling password
        setTimeout(() => {
          clickSubmit();
        }, 500);
        
        observer.disconnect();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 60000);
  }

  // Track if we've already clicked submit
  let submitClicked = false;
  
  function tryClickSubmit() {
    if (submitClicked) return;
    const success = clickSubmit();
    if (success) submitClicked = true;
  }

  // Execute
  const result = autofill();
  if (!result.password) watchForPassword();
  
  // Multiple attempts to click submit button (pages load differently)
  if (result.username && result.password) {
    // Try clicking at different intervals
    setTimeout(tryClickSubmit, 500);
    setTimeout(tryClickSubmit, 1000);
    setTimeout(tryClickSubmit, 1500);
    setTimeout(tryClickSubmit, 2000);
    setTimeout(tryClickSubmit, 3000);
  }
  
  // Retry autofill for slow-loading forms
  let retryCount = 0;
  function retryAutofill() {
    retryCount++;
    console.log('[ESPOT] Retry autofill attempt', retryCount);
    const r = autofill();
    if (r.username && r.password && !submitClicked) {
      setTimeout(tryClickSubmit, 500);
    }
  }
  
  setTimeout(retryAutofill, 1500);
  setTimeout(retryAutofill, 3000);
  
  console.log('[ESPOT] Autofill script initialized');
})();
`;
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// ============================================================================
// PROXY MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Apply proxy configuration to Electron session
 * This routes ALL browser traffic through the specified proxy
 */
async function applyProxyToSession(proxyConfig: ProxyConfig): Promise<void> {
  try {
    const ses = session.defaultSession;

    // Build proxy URL WITHOUT authentication in the URL
    // Electron doesn't support username:password@host format
    // Authentication is handled via app login event handler
    const proxyRules = `${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`;

    // Apply proxy to session
    await ses.setProxy({
      proxyRules: proxyRules,
      proxyBypassRules: '<local>' // Don't proxy localhost/127.0.0.1
    });

    // Store active config
    activeProxyConfig = proxyConfig;

    // Set up proxy authentication if credentials are provided
    if (proxyConfig.username && proxyConfig.password) {
      // Note: The 'login' event handler is set up globally in setupProxyAuth()
      // It will use activeProxyConfig to provide credentials
      console.log('🔐 Proxy authentication will be provided automatically');
    }

    console.log('✅ Proxy activated successfully for all browser traffic');
    console.log(`   Protocol: ${proxyConfig.protocol}`);
    console.log(`   Host: ${proxyConfig.host}`);
    console.log(`   Port: ${proxyConfig.port}`);
    console.log(`   Authentication: ${proxyConfig.username ? 'Yes' : 'No'}`);
    // Apply same proxy to all existing user partition sessions
    for (const [, userSession] of userSessions) {
      try {
        const userSes = session.fromPartition(userSession.sessionPartition);
        await userSes.setProxy({
          proxyRules,
          proxyBypassRules: '<local>'
        });
        userSession.proxyConfig = proxyConfig;
        console.log(`   Applied global proxy to user session ${userSession.userId}`);
      } catch (e) {
        console.warn(`   Failed to apply proxy to user session ${userSession.userId}:`, e);
      }
    }

  } catch (error) {
    console.error('❌ Failed to apply proxy:', error);
    throw error;
  }
}

/**
 * Deactivate proxy and revert to direct connection
 */
async function deactivateProxy(): Promise<void> {
  try {
    const ses = session.defaultSession;

    // Clear proxy configuration (empty string = direct connection)
    await ses.setProxy({
      proxyRules: ''
    });

    activeProxyConfig = null;

    console.log('✅ Proxy deactivated - using direct connection');

    // Clear proxy on all user partition sessions
    for (const [, userSession] of userSessions) {
      try {
        const userSes = session.fromPartition(userSession.sessionPartition);
        await userSes.setProxy({ proxyRules: '' });
        userSession.proxyConfig = null;
        console.log(`   Cleared proxy for user session ${userSession.userId}`);
      } catch (e) {
        console.warn(`   Failed to clear proxy for user session ${userSession.userId}:`, e);
      }
    }

  } catch (error) {
    console.error('❌ Failed to deactivate proxy:', error);
    throw error;
  }
}

/**
 * Get current proxy status
 */
function getProxyStatus(): { isActive: boolean; config: ProxyConfig | null } {
  return {
    isActive: activeProxyConfig !== null,
    config: activeProxyConfig
  };
}

/**
 * Verify proxy is working by checking IP address
 */
async function verifyProxyWorking(): Promise<{ success: boolean; working?: boolean; originalIP?: string; proxiedIP?: string; currentIp?: string; error?: string }> {
  try {
    const req = net.request({ method: 'GET', url: 'https://api.ipify.org?format=json' });
    const body: string = await new Promise((resolve, reject) => {
      let data = '';
      req.on('response', (response) => {
        response.on('data', (chunk) => {
          data += chunk.toString();
        });
        response.on('end', () => resolve(data));
      });
      req.on('error', (err) => reject(err));
      req.end();
    });
    const parsed = JSON.parse(body) as { ip: string };
    return { success: true, working: true, proxiedIP: parsed.ip, currentIp: parsed.ip };
  } catch (error: any) {
    return { success: false, working: false, error: error.message };
  }
}

// ============================================================================
// PER-USER SESSION PROXY MANAGEMENT (Step 4)
// ============================================================================

/**
 * Create or get a session for a specific user
 * Uses session partitions to isolate cookies, cache, and proxy settings per user
 */
function getUserSession(userId: string): UserSession {
  let userSession = userSessions.get(userId);

  if (!userSession) {
    userSession = {
      userId,
      sessionPartition: `persist:user-${userId}`,
      proxyConfig: null
    };
    userSessions.set(userId, userSession);
    console.log(`✅ Created new session partition for user: ${userId}`);
  }

  return userSession;
}

/**
 * Apply proxy to a specific user's session (isolated from other users)
 * This allows different users to use different proxies simultaneously
 * 
 * CRITICAL FIX: Also apply to default session so ALL windows are proxied
 * (matches admin behavior - any child window uses default session)
 */
async function applyProxyToUserSession(userId: string, proxyConfig: ProxyConfig): Promise<void> {
  try {
    const userSession = getUserSession(userId);
    const proxyRules = `${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`;

    // 1. Apply to user's specific partition
    const userSes = session.fromPartition(userSession.sessionPartition);
    await userSes.setProxy({
      proxyRules: proxyRules,
      proxyBypassRules: '<local>'
    });

    // 2. CRITICAL: Also apply to DEFAULT session (like admin does)
    // This ensures ALL child windows are proxied, not just ones with explicit partition
    const defaultSes = session.defaultSession;
    await defaultSes.setProxy({
      proxyRules: proxyRules,
      proxyBypassRules: '<local>'
    });

    // Store config
    userSession.proxyConfig = proxyConfig;
    activeProxyConfig = proxyConfig; // Set global config so service windows get it

    console.log(`✅ Proxy activated for user ${userId}`);
    console.log(`   Protocol: ${proxyConfig.protocol}`);
    console.log(`   Host: ${proxyConfig.host}`);
    console.log(`   Port: ${proxyConfig.port}`);
    console.log(`   Applied to: DEFAULT session + user partition`);
    console.log(`   All browser windows will now use this proxy`);

  } catch (error: any) {
    console.error(`❌ Failed to apply proxy to user ${userId}:`, error);
    throw error;
  }
}

/**
 * Deactivate proxy for a specific user's session
 * CRITICAL: Also clear from default session
 */
async function deactivateUserProxy(userId: string): Promise<void> {
  try {
    const userSession = userSessions.get(userId);
    
    // Clear from user's specific partition
    if (userSession) {
      const ses = session.fromPartition(userSession.sessionPartition);
      await ses.setProxy({ proxyRules: '' });
      userSession.proxyConfig = null;
    }

    // CRITICAL: Also clear from DEFAULT session
    const defaultSes = session.defaultSession;
    await defaultSes.setProxy({ proxyRules: '' });
    activeProxyConfig = null; // Clear global config

    console.log(`✅ Proxy deactivated for user ${userId}`);
    console.log(`   Cleared from: DEFAULT session + user partition`);

  } catch (error: any) {
    console.error(`❌ Failed to deactivate proxy for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get proxy status for a specific user
 */
function getUserProxyStatus(userId: string): { isActive: boolean; config: ProxyConfig | null } {
  const userSession = userSessions.get(userId);

  if (!userSession) {
    return { isActive: false, config: null };
  }

  return {
    isActive: userSession.proxyConfig !== null,
    config: userSession.proxyConfig
  };
}

/**
 * Create a browser window for a specific user with isolated session
 * This window will use the user's specific proxy settings
 */
function createUserWindow(userId: string, url: string = 'about:blank'): BrowserWindow {
  const userSession = getUserSession(userId);

  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: userSession.sessionPartition, // Isolated session
      spellcheck: false,
      devTools: isDev,
      ...(STRICT_WEBRTC_ENABLED ? { webSecurity: true, sandbox: true } : {}),
    },
  });

  userSession.window = window;
  if (STRICT_WEBRTC_ENABLED) {
    const ses = session.fromPartition(userSession.sessionPartition);
    applyStrictPermissions(ses);
  }

  // Determine which proxy to use: user-specific proxy takes priority, then global proxy
  const proxyToApply = userSession.proxyConfig || activeProxyConfig;
  
  if (proxyToApply) {
    const proxyRules = `${proxyToApply.protocol}://${proxyToApply.host}:${proxyToApply.port}`;
    const userSes = session.fromPartition(userSession.sessionPartition);
    userSes.setProxy({ proxyRules, proxyBypassRules: '<local>' })
      .then(() => {
        console.log(`✅ Proxy applied to user window ${userId}: ${proxyToApply.host}:${proxyToApply.port}`);
      })
      .catch((e) => {
        console.warn(`⚠️ Failed to apply proxy to user window ${userId}:`, e);
      });
  }

  window.on('closed', () => {
    if (userSession.window === window) {
      userSession.window = undefined;
    }
  });

  window.loadURL(url);
  if (STRICT_WEBRTC_ENABLED) hardenWebRTC(window);

  console.log(`✅ Created window for user ${userId} with isolated session`);

  return window;
}

/**
 * Get all active user sessions (for admin monitoring)
 */
function getAllUserSessions(): Array<{ userId: string; hasProxy: boolean; proxyHost?: string }> {
  const sessions: Array<{ userId: string; hasProxy: boolean; proxyHost?: string }> = [];

  userSessions.forEach((session, userId) => {
    sessions.push({
      userId,
      hasProxy: session.proxyConfig !== null,
      proxyHost: session.proxyConfig ? `${session.proxyConfig.host}:${session.proxyConfig.port}` : undefined
    });
  });

  return sessions;
}
// DISABLED: WebRTC hardening (was causing Google login issues)
// function hardenWebRTC(win: BrowserWindow) {
//   const script = `
//     (function(){
//       var block = function(){ throw new Error('WebRTC is disabled'); };
//       try { Object.defineProperty(window, 'RTCPeerConnection', { get: function(){ return block; }, set: function(){}, configurable: false }); } catch(e) {}
//       try { Object.defineProperty(window, 'webkitRTCPeerConnection', { get: function(){ return block; }, set: function(){}, configurable: false }); } catch(e) {}
//       try { Object.defineProperty(window, 'RTCDataChannel', { get: function(){ return undefined; }, set: function(){}, configurable: false }); } catch(e) {}
//       try { Object.defineProperty(window, 'RTCIceCandidate', { get: function(){ return undefined; }, set: function(){}, configurable: false }); } catch(e) {}
//       try { Object.defineProperty(window, 'RTCSessionDescription', { get: function(){ return undefined; }, set: function(){}, configurable: false }); } catch(e) {}
//       if (navigator && navigator.mediaDevices) {
//         try { navigator.mediaDevices.getUserMedia = function(){ return Promise.reject(new Error('Media access disabled')); }; } catch(e) {}
//       }
//     })();
//   `;
//   win.webContents.on('dom-ready', () => {
//     win.webContents.executeJavaScript(script, true);
//   });
// }
function hardenWebRTC(_win: BrowserWindow) {
  // Disabled for Google login compatibility
}

// DISABLED: Permission blocking (was causing Google login issues)
// function applyStrictPermissions(ses: any) {
//   try {
//     ses.setPermissionRequestHandler((_wc: any, permission: string, callback: (allow: boolean) => void) => {
//       const blockedPermissions = ['media', 'geolocation', 'notifications'];
//       if (blockedPermissions.includes(permission)) {
//         callback(false);
//       } else {
//         callback(true);
//       }
//     });
//   } catch { }
// }
function applyStrictPermissions(_ses: any) {
  // Disabled for Google login compatibility - allow all permissions
}

// ============================================
// AUTO-UPDATER CONFIGURATION
// ============================================

/**
 * Initialize auto-updater (only in production builds)
 */
function setupAutoUpdater() {
  // Temporarily disabled for testing
  // if (isDev) {
  //   console.log('[AUTO-UPDATE] Skipping auto-updater in development mode');
  //   return;
  // }

  console.log('[AUTO-UPDATE] Initializing auto-updater...');
  
  // Configure update behavior
  autoUpdater.autoDownload = false; // Manual download
  autoUpdater.autoInstallOnAppQuit = true; // Install update when user quits app
  
  // If a local generic update server is configured for testing, use it
  if (process.env.UPDATE_SERVER_URL) {
    try {
      autoUpdater.setFeedURL({ provider: 'generic', url: process.env.UPDATE_SERVER_URL });
      console.log('[AUTO-UPDATE] Using generic feed URL:', process.env.UPDATE_SERVER_URL);
    } catch (err) {
      console.warn('[AUTO-UPDATE] Failed to set generic feed URL:', err);
    }
  }

  // Handle manual download request
  ipcMain.handle('updater:download-update', () => {
    console.log('[AUTO-UPDATE] Manual download requested');
    autoUpdater.downloadUpdate();
  });

  // Monitor autoUpdater events and send to renderer
  autoUpdater.on('checking-for-update', () => {
    console.log('[AUTO-UPDATE] Checking for updates...');
    sendUpdateEvents('updater:status', 'Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AUTO-UPDATE] Update available:', info.version);
    sendUpdateEvents('updater:available', info);
    sendUpdateEvents('updater:status', 'Update available. Downloading...');
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AUTO-UPDATE] No updates available.');
    sendUpdateEvents('updater:not-available', info);
    sendUpdateEvents('updater:status', 'Your app is up to date.');
  });

  autoUpdater.on('error', (err) => {
    console.error('[AUTO-UPDATE] Error:', err);
    sendUpdateEvents('updater:error', err.message);
    sendUpdateEvents('updater:status', 'Error: ' + err.message);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendUpdateEvents('updater:download-progress', progressObj);
    sendUpdateEvents('updater:status', `Downloading: ${Math.round(progressObj.percent)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AUTO-UPDATE] Update downloaded:', info.version);
    sendUpdateEvents('updater:downloaded', info);
    sendUpdateEvents('updater:status', 'Update ready to install.');
  });

  // Check for updates 10 seconds after app start
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('[AUTO-UPDATE] Failed to check for updates:', err);
    });
  }, 10000);
}

/**
 * Send update status to renderer process
 */
function sendUpdateEvents(eventName: string, ...args: any[]) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(eventName, ...args);
  }
}
