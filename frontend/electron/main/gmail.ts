/**
 * Gmail Window Service
 * 
 * Opens Gmail in windows that share the Google session.
 */

import { BrowserWindow, ipcMain, session } from 'electron';

// Gmail URL
const GMAIL_URL = 'https://mail.google.com';

// Track open Gmail windows (allow multiple)
const gmailWindows = new Map<number, BrowserWindow>();

// Maximum Gmail windows allowed
const MAX_GMAIL_WINDOWS = 5;

/**
 * Open Gmail in a window with persistent session
 */
export function openGmail(): BrowserWindow | null {
  // Check if we've hit the limit
  if (gmailWindows.size >= MAX_GMAIL_WINDOWS) {
    console.warn(`[Gmail] Maximum ${MAX_GMAIL_WINDOWS} Gmail windows reached`);
    // Focus the first window instead
    const firstWindow = gmailWindows.values().next().value;
    if (firstWindow && !firstWindow.isDestroyed()) {
      firstWindow.focus();
      return firstWindow;
    }
  }
  
  console.log('[Gmail] Opening Gmail with persistent session...');
  
  // Use a simple persistent session for Google
  const googleSession = session.fromPartition('persist:google-simple');
  
  const gmailWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Gmail',
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: googleSession,
      spellcheck: true,
    },
  });
  
  // Track window
  const windowId = gmailWindow.id;
  gmailWindows.set(windowId, gmailWindow);
  
  // Clean up on close
  gmailWindow.on('closed', () => {
    gmailWindows.delete(windowId);
    console.log(`[Gmail] Window ${windowId} closed. ${gmailWindows.size} remaining.`);
  });
  
  // Show when ready
  gmailWindow.once('ready-to-show', () => {
    gmailWindow.show();
  });
  
  // Load Gmail
  gmailWindow.loadURL(GMAIL_URL);
  
  console.log(`[Gmail] ✅ Gmail window ${windowId} created`);
  
  return gmailWindow;
}

/**
 * Close a Gmail window
 */
export function closeGmail(windowId?: number): boolean {
  if (windowId) {
    const win = gmailWindows.get(windowId);
    if (win && !win.isDestroyed()) {
      win.close();
      return true;
    }
    return false;
  }
  
  // Close all Gmail windows
  gmailWindows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.close();
    }
  });
  gmailWindows.clear();
  return true;
}

/**
 * Focus or open Gmail
 */
export function focusOrOpenGmail(): BrowserWindow | null {
  // Try to focus existing window
  for (const win of gmailWindows.values()) {
    if (!win.isDestroyed()) {
      win.focus();
      return win;
    }
  }
  
  // No existing window, open new one
  return openGmail();
}

/**
 * Get count of open Gmail windows
 */
export function getGmailCount(): number {
  // Clean up destroyed windows
  for (const [id, win] of gmailWindows.entries()) {
    if (win.isDestroyed()) {
      gmailWindows.delete(id);
    }
  }
  return gmailWindows.size;
}

/**
 * Set up Gmail IPC handlers
 */
export function setupGmailIpcHandlers(): void {
  ipcMain.handle('gmail:open', async () => {
    const win = openGmail();
    return win ? { success: true, windowId: win.id } : { success: false };
  });
  
  ipcMain.handle('gmail:close', async (_event, windowId?: number) => {
    return { success: closeGmail(windowId) };
  });
  
  ipcMain.handle('gmail:focusOrOpen', async () => {
    const win = focusOrOpenGmail();
    return win ? { success: true, windowId: win.id } : { success: false };
  });
  
  ipcMain.handle('gmail:getCount', async () => {
    return { count: getGmailCount() };
  });
  
  console.log('[Gmail] ✅ Gmail IPC handlers registered');
}
