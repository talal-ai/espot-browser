import React from 'react';
import TabBar from './TabBar';
import BrowserToolbar from './BrowserToolbar';
import WebView from './WebView';
import { useBrowser } from '../../contexts/BrowserContext';
import { useAuth } from '../../contexts/AuthContext';

const BrowserShell = ({ children }) => {
    const { tabs, activeTabId, webviewRefs, openTab, closeTab, switchToTab, updateTab } = useBrowser();
    const { user } = useAuth();

    // Check if user is signed in via Google OAuth
    // If so, we want to share the main session (cookies) with the browser tabs
    const isGoogleUser = user?.provider === 'google' || user?.app_metadata?.provider === 'google';

    const activeTab = tabs.find(t => t.id === activeTabId);

    // Admins always allowed; others only when browser_shell_enabled is explicitly true (default is false)
    const allowNewTab = user?.role === 'admin' || user?.browser_shell_enabled === true;

    const handleNewTab = () => {
        if (!allowNewTab) return;
        openTab({
            url: 'https://www.google.com',
            title: 'New Tab',
            userId: user?.id  // Pass user ID for session sharing
        });
    };

    const handleCloseTab = (tabId) => {
        closeTab(tabId);
    };

    const handleTabClick = (tabId) => {
        switchToTab(tabId);
    };

    const updateTabState = (tabId, updates) => {
        updateTab(tabId, updates);
    };

    const handleNavigate = (url) => {
        if (activeTabId === 'dashboard') return;
        updateTabState(activeTabId, { url });
        if (webviewRefs.current[activeTabId]) {
            webviewRefs.current[activeTabId].loadURL(url);
        }
    };

    const handleReload = () => {
        if (activeTabId === 'dashboard') {
            window.location.reload();
        } else if (webviewRefs.current[activeTabId]) {
            webviewRefs.current[activeTabId].reload();
        }
    };

    const handleStop = () => {
        if (activeTabId !== 'dashboard' && webviewRefs.current[activeTabId]) {
            webviewRefs.current[activeTabId].stop();
        }
    };

    const handleBack = () => {
        if (activeTabId !== 'dashboard' && webviewRefs.current[activeTabId]) {
            webviewRefs.current[activeTabId].goBack();
        } else {
            window.history.back();
        }
    };

    const handleForward = () => {
        if (activeTabId !== 'dashboard' && webviewRefs.current[activeTabId]) {
            webviewRefs.current[activeTabId].goForward();
        } else {
            window.history.forward();
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
            <div className="relative z-50">
                <TabBar
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabClick={handleTabClick}
                    onTabClose={handleCloseTab}
                    onNewTab={handleNewTab}
                    allowNewTab={allowNewTab}
                />
            </div>

            <div className="relative z-40">
                <BrowserToolbar
                    activeTab={activeTab}
                    canGoBack={activeTab?.canGoBack}
                    canGoForward={activeTab?.canGoForward}
                    loading={activeTab?.loading}
                    onBack={handleBack}
                    onForward={handleForward}
                    onReload={handleReload}
                    onStop={handleStop}
                    onNavigate={handleNavigate}
                />
            </div>

            <div className="flex-1 relative w-full h-full overflow-hidden">
                <div
                    className="absolute inset-0 w-full h-full bg-white dark:bg-gray-900 transition-opacity duration-200"
                    style={{
                        opacity: activeTabId === 'dashboard' ? 1 : 0,
                        pointerEvents: activeTabId === 'dashboard' ? 'auto' : 'none',
                        zIndex: activeTabId === 'dashboard' ? 10 : 0,
                        transform: 'translate(0)', // Fixes 'fixed' elements (Header/Sidebar) to be relative to this container
                        overflow: 'hidden' // MainLayout will handle content scrolling
                    }}
                >
                    {children}
                </div>

                {tabs.filter(t => t.type === 'web').map(tab => (
                    <div
                        key={tab.id}
                        className="absolute inset-0 w-full h-full bg-white"
                        style={{
                            visibility: activeTabId === tab.id ? 'visible' : 'hidden',
                            zIndex: activeTabId === tab.id ? 20 : 1
                        }}
                    >
                        <WebView
                            ref={el => webviewRefs.current[tab.id] = el}
                            url={tab.url}
                            userId={tab.userId}
                            isActive={activeTabId === tab.id}
                            // If Google user, use default session (null) to share cookies
                            // Otherwise, maintain isolation per tab
                            partition={isGoogleUser ? null : 'persist:' + tab.id}
                            userAgent={tab.userAgent}
                            onTitleChange={(title) => updateTabState(tab.id, { title })}
                            onUrlChange={(url) => updateTabState(tab.id, { url })}
                            onLoadingChange={(loading) => updateTabState(tab.id, { loading })}
                            onHistoryChange={(historyState) => updateTabState(tab.id, historyState)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BrowserShell;
