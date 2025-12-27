const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SupabaseAuth } = require('./auth');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let mainWindow: typeof BrowserWindow | null = null;
let authManager: InstanceType<typeof SupabaseAuth>;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
        },
        backgroundColor: '#0f0f1e',
        show: false,
        frame: true,
        titleBarStyle: 'default',
    });

    // Show window when ready to prevent flickering
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    // Load the app
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Initialize auth manager
function initializeAuth() {
    authManager = new SupabaseAuth();
}

// IPC Handlers
function setupIpcHandlers() {
    // Auth handlers
    ipcMain.handle('auth:login', async () => {
        try {
            return await authManager.login();
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    });

    ipcMain.handle('auth:logout', async () => {
        try {
            await authManager.logout();
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    });

    ipcMain.handle('auth:getUser', async () => {
        try {
            return await authManager.getUser();
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    });

    ipcMain.handle('auth:isAuthenticated', async () => {
        try {
            return await authManager.isAuthenticated();
        } catch (error) {
            console.error('Is authenticated error:', error);
            return false;
        }
    });

    // Browser navigation handlers
    ipcMain.handle('browser:navigate', async (_event: any, url: string) => {
        // This would be implemented with BrowserView or webview
        console.log('Navigate to:', url);
    });

    ipcMain.handle('browser:goBack', async () => {
        console.log('Go back');
    });

    ipcMain.handle('browser:goForward', async () => {
        console.log('Go forward');
    });

    ipcMain.handle('browser:reload', async () => {
        console.log('Reload');
    });

    ipcMain.handle('browser:stop', async () => {
        console.log('Stop');
    });
}

// App lifecycle
app.whenReady().then(() => {
    initializeAuth();
    setupIpcHandlers();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle any uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

export { };
