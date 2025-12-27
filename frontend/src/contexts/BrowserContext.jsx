import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const BrowserContext = createContext(null);

export const useBrowser = () => {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error('useBrowser must be used within BrowserProvider');
  }
  return context;
};

export const BrowserProvider = ({ children }) => {
  const [tabs, setTabs] = useState([
    {
      id: 'dashboard',
      title: 'Dashboard',
      url: 'espot://dashboard',
      type: 'dashboard',
      active: true,
      canGoBack: false,
      canGoForward: false,
      loading: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('dashboard');
  const webviewRefs = useRef({});

  /**
   * Open a new tab with optional autofill credentials
   * @param {Object} options
   * @param {string} options.url - URL to load
   * @param {string} [options.title] - Tab title
   * @param {string} [options.serviceId] - Service ID for isolated session
   * @param {string} [options.userId] - User ID for session sharing (all tabs for same user share cookies)
   * @param {Object} [options.credentials] - Autofill credentials {username, password}
   * @param {string} [options.userAgent] - Custom user agent
   */
  const openTab = useCallback((options) => {
    const { url, title, serviceId, userId, credentials, userAgent } = options;

    const newTabId = serviceId || crypto.randomUUID();
    const newTab = {
      id: newTabId,
      title: title || 'Loading...',
      url,
      type: 'web',
      active: true,
      canGoBack: false,
      canGoForward: false,
      loading: true,
      userAgent: userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      credentials, // Store for injection
      serviceId,
      userId, // Store userId for session partitioning
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);

    return newTabId;
  }, []);

  /**
   * Close a tab by ID
   */
  const closeTab = useCallback((tabId) => {
    if (tabId === 'dashboard') return;

    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        const index = prev.findIndex((t) => t.id === tabId);
        const nextTab = newTabs[index - 1] || newTabs[0];
        setActiveTabId(nextTab.id);
      }
      delete webviewRefs.current[tabId];
      return newTabs;
    });
  }, [activeTabId]);

  /**
   * Switch to a tab
   */
  const switchToTab = useCallback((tabId) => {
    setActiveTabId(tabId);
  }, []);

  /**
   * Update tab state
   */
  const updateTab = useCallback((tabId, updates) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, ...updates } : t)));
  }, []);

  const value = {
    tabs,
    activeTabId,
    webviewRefs,
    openTab,
    closeTab,
    switchToTab,
    updateTab,
    setActiveTabId,
    setTabs,
  };

  return <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>;
};

