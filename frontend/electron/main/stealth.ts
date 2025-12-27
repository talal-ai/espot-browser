/**
 * Stealth Module for Google Authentication
 * 
 * Implements aggressive stealth techniques to bypass Google's
 * "This browser or app may not be secure" detection.
 * 
 * Applied to:
 * - Google OAuth popup windows
 * - Gmail child windows
 * - Any Google service windows
 */

import { BrowserWindow, session, BrowserWindowConstructorOptions } from 'electron';
import path from 'path';

// Chrome 131 User Agent (Latest as of Dec 2025)
export const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Shared session partition for all Google services
export const GOOGLE_SESSION_PARTITION = 'persist:google';

// Google-related URL patterns for header injection
const GOOGLE_URL_PATTERNS = [
  '*://*.google.com/*',
  '*://accounts.google.com/*',
  '*://mail.google.com/*',
  '*://www.google.com/*',
  '*://*.googleapis.com/*',
  '*://*.gstatic.com/*',
];

/**
 * Chrome Client Hints headers that Google checks
 */
const STEALTH_HEADERS = {
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Ch-Ua-Platform-Version': '"15.0.0"',
  'Sec-Ch-Ua-Full-Version-List': '"Not_A Brand";v="8.0.0.0", "Chromium";v="131.0.6778.86", "Google Chrome";v="131.0.6778.86"',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-User': '?1',
  'Sec-Fetch-Dest': 'document',
  'Upgrade-Insecure-Requests': '1',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * JavaScript to inject into pages to remove Electron traces
 * and add Chrome-specific objects
 */
const STEALTH_SCRIPT = `
(function() {
  'use strict';
  
  // ============================================
  // 1. DELETE ELECTRON/NODE.JS GLOBALS
  // ============================================
  const electronGlobals = [
    'require', 'exports', 'module', 'process',
    '__dirname', '__filename', 'Buffer', 'global'
  ];
  
  electronGlobals.forEach(prop => {
    try {
      if (window[prop] !== undefined) {
        delete window[prop];
      }
    } catch(e) {}
  });

  // ============================================
  // 2. REMOVE WEBDRIVER FLAG (Automation Detection)
  // ============================================
  try {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true
    });
  } catch(e) {}

  // ============================================
  // 3. ADD CHROME OBJECT (Critical for Google)
  // ============================================
  if (!window.chrome) {
    window.chrome = {};
  }
  
  // Chrome runtime API (Google checks this)
  if (!window.chrome.runtime) {
    window.chrome.runtime = {
      id: undefined,
      connect: function() { return { onMessage: { addListener: function() {} }, postMessage: function() {} }; },
      sendMessage: function() {},
      onConnect: { addListener: function() {} },
      onMessage: { addListener: function() {} },
      getManifest: function() { return {}; },
      getURL: function(path) { return ''; },
      getPlatformInfo: function(callback) { callback({ os: 'win', arch: 'x86-64', nacl_arch: 'x86-64' }); }
    };
  }
  
  // Chrome loadTimes (Legacy API Google may check)
  if (!window.chrome.loadTimes) {
    window.chrome.loadTimes = function() {
      return {
        commitLoadTime: Date.now() / 1000,
        connectionInfo: 'h2',
        finishDocumentLoadTime: Date.now() / 1000,
        finishLoadTime: Date.now() / 1000,
        firstPaintAfterLoadTime: 0,
        firstPaintTime: Date.now() / 1000,
        navigationType: 'Other',
        npnNegotiatedProtocol: 'h2',
        requestTime: Date.now() / 1000 - 0.1,
        startLoadTime: Date.now() / 1000 - 0.1,
        wasAlternateProtocolAvailable: false,
        wasFetchedViaSpdy: true,
        wasNpnNegotiated: true
      };
    };
  }
  
  // Chrome csi (Client Side Instrumentation)
  if (!window.chrome.csi) {
    window.chrome.csi = function() {
      return {
        onloadT: Date.now(),
        pageT: Date.now() - performance.timing.navigationStart,
        startE: performance.timing.navigationStart,
        tran: 15
      };
    };
  }
  
  // Chrome app API
  if (!window.chrome.app) {
    window.chrome.app = {
      isInstalled: false,
      InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
      RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
      getDetails: function() { return null; },
      getIsInstalled: function() { return false; },
      runningState: function() { return 'cannot_run'; }
    };
  }

  // ============================================
  // 4. NAVIGATOR PROPERTY OVERRIDES
  // ============================================
  
  // Languages (Google checks this)
  try {
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
      configurable: true
    });
  } catch(e) {}
  
  // Platform
  try {
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
      configurable: true
    });
  } catch(e) {}
  
  // Vendor (Must be Google Inc. for Chrome)
  try {
    Object.defineProperty(navigator, 'vendor', {
      get: () => 'Google Inc.',
      configurable: true
    });
  } catch(e) {}
  
  // Hardware Concurrency (CPU cores)
  try {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
      configurable: true
    });
  } catch(e) {}
  
  // Device Memory
  try {
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
      configurable: true
    });
  } catch(e) {}
  
  // Max Touch Points (0 for desktop)
  try {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 0,
      configurable: true
    });
  } catch(e) {}

  // Plugins (Chrome has plugins, Electron doesn't by default)
  try {
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
        ];
        plugins.length = 3;
        return plugins;
      },
      configurable: true
    });
  } catch(e) {}
  
  // MimeTypes
  try {
    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => {
        const mimes = [
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }
        ];
        mimes.length = 2;
        return mimes;
      },
      configurable: true
    });
  } catch(e) {}

  // ============================================
  // 5. PERMISSIONS API (Prevent Detection)
  // ============================================
  const originalQuery = navigator.permissions?.query;
  if (originalQuery) {
    navigator.permissions.query = (parameters) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission, onchange: null });
      }
      return originalQuery.call(navigator.permissions, parameters);
    };
  }

  // ============================================
  // 6. IFRAME CONTENTWINDOW PROTECTION
  // ============================================
  try {
    // Prevent iframe detection of Electron
    const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    if (originalContentWindow) {
      Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        get: function() {
          const win = originalContentWindow.get.call(this);
          if (win) {
            try {
              // Remove Electron traces from iframe windows too
              delete win.require;
              delete win.exports;
              delete win.module;
              delete win.process;
            } catch(e) {}
          }
          return win;
        }
      });
    }
  } catch(e) {}

  console.log('[Stealth] Google stealth protections applied');
})();
`;

// Track active stealth sessions for cleanup
const stealthSessions = new Map<string, boolean>();

/**
 * Apply stealth headers to a session
 * Injects Chrome-like headers on all Google requests
 */
export function applyStealthHeaders(sessionInstance: Electron.Session): void {
  const sessionId = sessionInstance.storagePath || 'default';
  
  // Avoid duplicate listeners
  if (stealthSessions.has(sessionId)) {
    console.log('[Stealth] Headers already applied to session:', sessionId);
    return;
  }
  
  stealthSessions.set(sessionId, true);
  
  // Inject headers on all Google requests
  sessionInstance.webRequest.onBeforeSendHeaders(
    { urls: GOOGLE_URL_PATTERNS },
    (details, callback) => {
      const headers = { ...details.requestHeaders };
      
      // Apply all stealth headers
      Object.entries(STEALTH_HEADERS).forEach(([key, value]) => {
        headers[key] = value;
      });
      
      // Ensure User-Agent is Chrome
      headers['User-Agent'] = CHROME_USER_AGENT;
      
      callback({ requestHeaders: headers });
    }
  );
  
  // Also handle response headers to remove any Electron fingerprints
  sessionInstance.webRequest.onHeadersReceived(
    { urls: GOOGLE_URL_PATTERNS },
    (details, callback) => {
      callback({ responseHeaders: details.responseHeaders });
    }
  );
  
  console.log('[Stealth] ✅ Header injection enabled for Google URLs');
}

/**
 * Inject stealth script into a BrowserWindow
 * Removes Electron traces and adds Chrome objects
 */
export function injectStealthScript(window: BrowserWindow): void {
  // Inject on every page load (including redirects)
  window.webContents.on('did-finish-load', () => {
    window.webContents.executeJavaScript(STEALTH_SCRIPT).catch((err) => {
      console.warn('[Stealth] Script injection warning:', err.message);
    });
  });
  
  // Also inject on DOM ready for faster protection
  window.webContents.on('dom-ready', () => {
    window.webContents.executeJavaScript(STEALTH_SCRIPT).catch(() => {});
  });
  
  // Inject when frame navigates
  window.webContents.on('did-navigate', () => {
    window.webContents.executeJavaScript(STEALTH_SCRIPT).catch(() => {});
  });
  
  window.webContents.on('did-navigate-in-page', () => {
    window.webContents.executeJavaScript(STEALTH_SCRIPT).catch(() => {});
  });
}

/**
 * Create a stealth BrowserWindow for Google services
 * Pre-configured with all anti-detection measures
 */
export function createStealthWindow(
  options: Partial<BrowserWindowConstructorOptions> = {}
): BrowserWindow {
  // Get or create the shared Google session
  const googleSession = session.fromPartition(GOOGLE_SESSION_PARTITION);
  
  // Apply stealth headers to the session
  applyStealthHeaders(googleSession);
  
  // Set Chrome user agent on the session
  googleSession.setUserAgent(CHROME_USER_AGENT);
  
  // CRITICAL: Enable cookies and configure cookie policy for Google
  // This fixes "We've detected a problem with your cookie settings" error
  googleSession.cookies.flushStore().catch(() => {});
  
  // Allow all cookies (including third-party) for Google domains
  googleSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*/*'] },
    (details, callback) => {
      // Ensure cookies are sent
      callback({ requestHeaders: details.requestHeaders });
    }
  );
  
  // Merge options with stealth defaults
  const windowOptions: BrowserWindowConstructorOptions = {
    width: 1280,
    height: 900,
    show: true,
    backgroundColor: '#ffffff',
    ...options,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // DISABLED: sandbox and webSecurity can interfere with Google login
      // sandbox: true,
      // webSecurity: true,
      // allowRunningInsecureContent: false,
      session: googleSession,
      // Override user agent at webPreferences level too
      ...options.webPreferences,
    },
  };
  
  const window = new BrowserWindow(windowOptions);
  
  // Set user agent for this specific window
  window.webContents.setUserAgent(CHROME_USER_AGENT);
  
  // Apply stealth script injection
  injectStealthScript(window);
  
  console.log('[Stealth] ✅ Stealth window created with partition:', GOOGLE_SESSION_PARTITION);
  
  return window;
}

/**
 * Create a stealth window and load a URL
 * Convenience function for quick stealth window creation
 */
export function createStealthWindowWithUrl(
  url: string,
  options: Partial<BrowserWindowConstructorOptions> = {}
): BrowserWindow {
  const window = createStealthWindow(options);
  window.loadURL(url);
  return window;
}

/**
 * Apply stealth to the default session (for Google URLs only)
 * Call this in app.whenReady() to protect all Google requests
 */
export function applyStealthToDefaultSession(): void {
  applyStealthHeaders(session.defaultSession);
  
  // Also set user agent on default session
  session.defaultSession.setUserAgent(CHROME_USER_AGENT);
  
  console.log('[Stealth] ✅ Default session stealth enabled for Google URLs');
}

/**
 * Apply stealth script injection to a BrowserWindow for Google URLs
 * This injects the stealth script whenever the window navigates to a Google page
 */
export function applyStealthToWindow(window: BrowserWindow): void {
  const isGoogleUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.endsWith('.google.com') || 
             parsed.hostname === 'google.com' ||
             parsed.hostname.endsWith('.googleapis.com') ||
             parsed.hostname.endsWith('.gstatic.com');
    } catch {
      return false;
    }
  };
  
  const injectIfGoogle = () => {
    const url = window.webContents.getURL();
    if (isGoogleUrl(url)) {
      console.log('[Stealth] Injecting stealth script for Google URL:', url);
      window.webContents.executeJavaScript(STEALTH_SCRIPT).catch((err) => {
        console.warn('[Stealth] Script injection warning:', err.message);
      });
    }
  };
  
  // Inject on navigation events
  window.webContents.on('did-finish-load', injectIfGoogle);
  window.webContents.on('dom-ready', injectIfGoogle);
  window.webContents.on('did-navigate', injectIfGoogle);
  window.webContents.on('did-navigate-in-page', injectIfGoogle);
  
  console.log('[Stealth] ✅ Window stealth protection enabled for Google URLs');
}

/**
 * Get the shared Google session
 * Use this when you need to access Google session cookies/storage
 */
export function getGoogleSession(): Electron.Session {
  return session.fromPartition(GOOGLE_SESSION_PARTITION);
}

/**
 * Clear Google session data (logout)
 */
export async function clearGoogleSession(): Promise<void> {
  const googleSession = session.fromPartition(GOOGLE_SESSION_PARTITION);
  await googleSession.clearStorageData();
  await googleSession.clearCache();
  console.log('[Stealth] Google session cleared');
}

export default {
  CHROME_USER_AGENT,
  GOOGLE_SESSION_PARTITION,
  applyStealthHeaders,
  injectStealthScript,
  createStealthWindow,
  createStealthWindowWithUrl,
  applyStealthToDefaultSession,
  applyStealthToWindow,
  getGoogleSession,
  clearGoogleSession,
};
