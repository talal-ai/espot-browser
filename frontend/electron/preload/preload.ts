import { contextBridge, ipcRenderer } from 'electron';

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
    activate: (proxyConfig: any) => ipcRenderer.invoke('proxy:activate', proxyConfig),
    deactivate: () => ipcRenderer.invoke('proxy:deactivate'),
    getStatus: () => ipcRenderer.invoke('proxy:getStatus'),
    verify: () => ipcRenderer.invoke('proxy:verify'),

    // Per-user proxy configuration (Step 4)
    activateForUser: (userId: string, proxyConfig: any) => ipcRenderer.invoke('proxy:activateForUser', userId, proxyConfig),
    deactivateForUser: (userId: string) => ipcRenderer.invoke('proxy:deactivateForUser', userId),
    getUserStatus: (userId: string) => ipcRenderer.invoke('proxy:getUserStatus', userId),
    getAllUserSessions: () => ipcRenderer.invoke('proxy:getAllUserSessions'),
  },

  // System API
  system: {
    getStats: () => ipcRenderer.invoke('system:getStats'),
    getHealth: () => ipcRenderer.invoke('system:getHealth'),
  },

  // Service Launch API (for autofill)
  service: {
    launch: (launchData: { serviceId: string; url: string; username: string; password: string }) =>
      ipcRenderer.invoke('service:launch', launchData),
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
    launch: (launchData: { serviceId: string; url: string; username: string; password: string }) =>
      Promise<{ success: boolean; message?: string; error?: string }>;
  };
}
