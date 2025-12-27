const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    auth: {
        login: () => ipcRenderer.invoke('auth:login'),
        logout: () => ipcRenderer.invoke('auth:logout'),
        getUser: () => ipcRenderer.invoke('auth:getUser'),
        isAuthenticated: () => ipcRenderer.invoke('auth:isAuthenticated'),
    },
    browser: {
        navigate: (url: string) => ipcRenderer.invoke('browser:navigate', url),
        goBack: () => ipcRenderer.invoke('browser:goBack'),
        goForward: () => ipcRenderer.invoke('browser:goForward'),
        reload: () => ipcRenderer.invoke('browser:reload'),
        stop: () => ipcRenderer.invoke('browser:stop'),
    },
    tabs: {
        create: (url?: string) => ipcRenderer.invoke('tabs:create', url),
        close: (tabId: string) => ipcRenderer.invoke('tabs:close', tabId),
        switch: (tabId: string) => ipcRenderer.invoke('tabs:switch', tabId),
        getAll: () => ipcRenderer.invoke('tabs:getAll'),
    },
});
