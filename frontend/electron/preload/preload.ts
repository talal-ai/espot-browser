import { contextBridge, ipcRenderer } from 'electron';
import { PROXY_IPC_CHANNELS } from '../shared/proxy-ipc-contract';

const invokeProxySafely = async (channel: string, ...args: any[]) => {
  try {
    return await ipcRenderer.invoke(channel, ...args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `IPC channel unavailable: ${channel}. ${message}`,
    };
  }
};

// Define the API exposed to the renderer process
const api = {
  // Generic IPC invoke (for flexibility)
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getAppPath: (name: string) => ipcRenderer.invoke('app:getPath', name),

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    openUrl: (url: string, userId?: string) => ipcRenderer.invoke('window:openUrl', url, userId),
    createForUser: (userId: string, url?: string) => ipcRenderer.invoke('window:createForUser', userId, url),
  },

  // Fingerprint profile API
  fingerprint: {
    setActive: (profile: any, userId: string) => ipcRenderer.invoke('fingerprint:setActive', profile, userId),
    getActive: () => ipcRenderer.invoke('fingerprint:getActive'),
    clear: () => ipcRenderer.invoke('fingerprint:clear'),
  },

  // Browser launch with fingerprint spoofing + Google cookie injection
  browser: {
    launch: (url: string, profileId?: string, userId?: string, authToken?: string) =>
      ipcRenderer.invoke('browser:launch', url, profileId, userId, authToken),
  },

  // Admin API
  admin: {
    getUsers: () => ipcRenderer.invoke('admin:getUsers'),
    createUser: (userData: any) => ipcRenderer.invoke('admin:createUser', userData),
    updateUser: (userId: string, userData: any) => ipcRenderer.invoke('admin:updateUser', userId, userData),
    deleteUser: (userId: string) => ipcRenderer.invoke('admin:deleteUser', userId),
  },

  // Proxy API
  proxy: {
    getProxies: () => ipcRenderer.invoke('proxy:getProxies'),
    createProxy: (proxyData: any) => ipcRenderer.invoke('proxy:createProxy', proxyData),
    updateProxy: (proxyId: string, proxyData: any) => ipcRenderer.invoke('proxy:updateProxy', proxyId, proxyData),
    deleteProxy: (proxyId: string) => ipcRenderer.invoke('proxy:deleteProxy', proxyId),
    testProxy: (proxyId: string) => ipcRenderer.invoke('proxy:testProxy', proxyId),

    // Global proxy configuration (Step 2-3)
    activate: (proxyConfig: any) => invokeProxySafely(PROXY_IPC_CHANNELS.activate, proxyConfig),
    deactivate: () => invokeProxySafely(PROXY_IPC_CHANNELS.deactivate),
    getStatus: () => invokeProxySafely(PROXY_IPC_CHANNELS.getStatus),
    verify: () => invokeProxySafely(PROXY_IPC_CHANNELS.verify),

    // Per-user proxy configuration (Step 4)
    activateForUser: (userId: string, proxyConfig: any) => invokeProxySafely(PROXY_IPC_CHANNELS.activateForUser, userId, proxyConfig),
    deactivateForUser: (userId: string) => invokeProxySafely(PROXY_IPC_CHANNELS.deactivateForUser, userId),
    getUserStatus: (userId: string) => invokeProxySafely(PROXY_IPC_CHANNELS.getUserStatus, userId),
    getAllUserSessions: () => invokeProxySafely(PROXY_IPC_CHANNELS.getAllUserSessions),
  },

  // System API
  system: {
    getStats: () => ipcRenderer.invoke('system:getStats'),
    getHealth: () => ipcRenderer.invoke('system:getHealth'),
  },

  // Service Launch API (for autofill)
  service: {
    launch: (launchData: { serviceId: string; url: string; username: string; password: string; userId?: string; showUrlBar?: boolean }) =>
      ipcRenderer.invoke('service:launch', launchData),
    updateUrlBar: (serviceId: string, showUrlBar: boolean) =>
      ipcRenderer.invoke('service:updateUrlBar', serviceId, showUrlBar),
  },

  // Auto-Update API
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
    
    onStatusChange: (callback: (status: string) => void) => {
      const listener = (_: any, status: string) => callback(status);
      ipcRenderer.on('updater:status', listener);
      return () => ipcRenderer.removeListener('updater:status', listener);
    },
    
    onUpdateAvailable: (callback: (info: any) => void) => {
      const listener = (_: any, info: any) => callback(info);
      ipcRenderer.on('updater:available', listener);
      return () => ipcRenderer.removeListener('updater:available', listener);
    },
    
    onUpdateNotAvailable: (callback: (info: any) => void) => {
      const listener = (_: any, info: any) => callback(info);
      ipcRenderer.on('updater:not-available', listener);
      return () => ipcRenderer.removeListener('updater:not-available', listener);
    },
    
    onDownloadProgress: (callback: (progress: any) => void) => {
      const listener = (_: any, progress: any) => callback(progress);
      ipcRenderer.on('updater:download-progress', listener);
      return () => ipcRenderer.removeListener('updater:download-progress', listener);
    },
    
    onUpdateDownloaded: (callback: (info: any) => void) => {
      const listener = (_: any, info: any) => callback(info);
      ipcRenderer.on('updater:downloaded', listener);
      return () => ipcRenderer.removeListener('updater:downloaded', listener);
    },
    
    onError: (callback: (error: string) => void) => {
      const listener = (_: any, error: string) => callback(error);
      ipcRenderer.on('updater:error', listener);
      return () => ipcRenderer.removeListener('updater:error', listener);
    },
    
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('updater:status');
      ipcRenderer.removeAllListeners('updater:available');
      ipcRenderer.removeAllListeners('updater:not-available');
      ipcRenderer.removeAllListeners('updater:download-progress');
      ipcRenderer.removeAllListeners('updater:downloaded');
      ipcRenderer.removeAllListeners('updater:error');
    }
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', api);
// Also expose as 'electron' for simpler access
contextBridge.exposeInMainWorld('electron', api);

// TypeScript interface for the exposed API
export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getAppPath: (name: string) => Promise<string>;

  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    openUrl: (url: string) => Promise<void>;
    createForUser: (userId: string, url?: string) => Promise<{ success: boolean; message?: string; userId?: string; error?: string }>;
  };

  admin: {
    getUsers: () => Promise<{ success: boolean; data: any[] }>;
    createUser: (userData: any) => Promise<{ success: boolean; data: any }>;
    updateUser: (userId: string, userData: any) => Promise<{ success: boolean; data: any }>;
    deleteUser: (userId: string) => Promise<{ success: boolean; data: any }>;
  };

  proxy: {
    getProxies: () => Promise<{ success: boolean; data: any[] }>;
    createProxy: (proxyData: any) => Promise<{ success: boolean; data: any }>;
    updateProxy: (proxyId: string, proxyData: any) => Promise<{ success: boolean; data: any }>;
    deleteProxy: (proxyId: string) => Promise<{ success: boolean; data: any }>;
    testProxy: (proxyId: string) => Promise<{ success: boolean; data: any }>;

    // Global proxy configuration (Step 2-3)
    activate: (proxyConfig: any) => Promise<{ success: boolean; message?: string; error?: string; config?: any }>;
    deactivate: () => Promise<{ success: boolean; message?: string; error?: string }>;
    getStatus: () => Promise<{ success: boolean; data?: { isActive: boolean; config: any | null }; error?: string }>;
    verify: () => Promise<{ success: boolean; data?: { working: boolean; currentIp?: string; error?: string }; error?: string }>;

    // Per-user proxy configuration (Step 4)
    activateForUser: (userId: string, proxyConfig: any) => Promise<{ success: boolean; message?: string; userId?: string; config?: any; error?: string }>;
    deactivateForUser: (userId: string) => Promise<{ success: boolean; message?: string; userId?: string; error?: string }>;
    getUserStatus: (userId: string) => Promise<{ success: boolean; data?: { isActive: boolean; config: any | null }; error?: string }>;
    getAllUserSessions: () => Promise<{ success: boolean; data?: Array<{ userId: string; hasProxy: boolean; proxyHost?: string }>; error?: string }>;
  };

  system: {
    getStats: () => Promise<{ success: boolean; data: any }>;
    getHealth: () => Promise<{ success: boolean; data: any }>;
  };

  service: {
    launch: (launchData: { serviceId: string; url: string; username: string; password: string; userId?: string; showUrlBar?: boolean }) =>
      Promise<{ success: boolean; message?: string; error?: string }>;
    updateUrlBar: (serviceId: string, showUrlBar: boolean) => Promise<{ success: boolean }>;
  };

  updater: {
    checkForUpdates: () => Promise<any>;
    downloadUpdate: () => Promise<void>;
    quitAndInstall: () => Promise<void>;
    onStatusChange: (callback: (status: string) => void) => () => void;
    onUpdateAvailable: (callback: (info: any) => void) => () => void;
    onUpdateNotAvailable: (callback: (info: any) => void) => () => void;
    onDownloadProgress: (callback: (progress: any) => void) => () => void;
    onUpdateDownloaded: (callback: (info: any) => void) => () => void;
    onError: (callback: (error: string) => void) => () => void;
    removeAllListeners: () => void;
  };
}
