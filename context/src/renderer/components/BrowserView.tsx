import React, { useState } from 'react';
import './BrowserView.css';

interface GoogleUser {
    id: string;
    email: string;
    name: string;
    picture: string;
}

interface BrowserViewProps {
    user: GoogleUser;
    onLogout: () => void;
}

interface Tab {
    id: string;
    url: string;
    title: string;
    active: boolean;
}

const BrowserView: React.FC<BrowserViewProps> = ({ user, onLogout }) => {
    const [tabs, setTabs] = useState<Tab[]>([
        { id: '1', url: 'https://www.google.com', title: 'Google', active: true },
    ]);
    const [currentUrl, setCurrentUrl] = useState('https://www.google.com');
    const [showUserMenu, setShowUserMenu] = useState(false);

    const activeTab = tabs.find((tab) => tab.active);

    const handleAddTab = () => {
        const newTab: Tab = {
            id: Date.now().toString(),
            url: 'https://www.google.com',
            title: 'New Tab',
            active: true,
        };
        setTabs((prev) => prev.map((tab) => ({ ...tab, active: false })).concat(newTab));
        setCurrentUrl(newTab.url);
    };

    const handleCloseTab = (tabId: string) => {
        setTabs((prev) => {
            const filtered = prev.filter((tab) => tab.id !== tabId);
            if (filtered.length === 0) {
                return [{ id: Date.now().toString(), url: 'https://www.google.com', title: 'New Tab', active: true }];
            }
            if (prev.find((tab) => tab.id === tabId)?.active && filtered.length > 0) {
                filtered[0].active = true;
                setCurrentUrl(filtered[0].url);
            }
            return filtered;
        });
    };

    const handleSwitchTab = (tabId: string) => {
        setTabs((prev) =>
            prev.map((tab) => ({
                ...tab,
                active: tab.id === tabId,
            }))
        );
        const tab = tabs.find((t) => t.id === tabId);
        if (tab) {
            setCurrentUrl(tab.url);
        }
    };

    const handleNavigate = (url: string) => {
        let finalUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            finalUrl = 'https://' + url;
        }
        setCurrentUrl(finalUrl);
        setTabs((prev) =>
            prev.map((tab) =>
                tab.active ? { ...tab, url: finalUrl, title: new URL(finalUrl).hostname } : tab
            )
        );
    };

    const handleGoBack = () => {
        console.log('Go back');
    };

    const handleGoForward = () => {
        console.log('Go forward');
    };

    const handleReload = () => {
        console.log('Reload');
    };

    return (
        <div className="browser-container">
            {/* Header */}
            <div className="browser-header">
                <div className="tabs-container">
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className={`tab ${tab.active ? 'active' : ''}`}
                            onClick={() => handleSwitchTab(tab.id)}
                        >
                            <span className="tab-favicon">🌐</span>
                            <span className="tab-title">{tab.title}</span>
                            <button
                                className="tab-close"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCloseTab(tab.id);
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    <button className="new-tab-btn" onClick={handleAddTab}>
                        +
                    </button>
                </div>

                <div className="user-section">
                    <button className="user-avatar" onClick={() => setShowUserMenu(!showUserMenu)}>
                        <img src={user.picture} alt={user.name} />
                    </button>
                    {showUserMenu && (
                        <div className="user-menu glass animate-fadeIn">
                            <div className="user-info">
                                <img src={user.picture} alt={user.name} className="user-menu-avatar" />
                                <div>
                                    <div className="user-name">{user.name}</div>
                                    <div className="user-email">{user.email}</div>
                                </div>
                            </div>
                            <div className="user-menu-divider"></div>
                            <button className="logout-btn" onClick={onLogout}>
                                <span>🚪</span>
                                <span>Sign out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Bar */}
            <div className="navigation-bar">
                <div className="nav-controls">
                    <button className="nav-btn" onClick={handleGoBack} title="Back">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M12 4l-8 6 8 6V4z" />
                        </svg>
                    </button>
                    <button className="nav-btn" onClick={handleGoForward} title="Forward">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 4l8 6-8 6V4z" />
                        </svg>
                    </button>
                    <button className="nav-btn" onClick={handleReload} title="Reload">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M14.66 15.66A8 8 0 1117 10h-2a6 6 0 10-1.76 4.24l1.42 1.42zM12 10h8l-4 4-4-4z" />
                        </svg>
                    </button>
                </div>

                <div className="address-bar-container">
                    <div className="address-bar glass">
                        <span className="lock-icon">🔒</span>
                        <input
                            type="text"
                            className="url-input"
                            value={currentUrl}
                            onChange={(e) => setCurrentUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleNavigate(currentUrl);
                                }
                            }}
                            placeholder="Search or enter website"
                        />
                        <button className="bookmark-btn" title="Bookmark">
                            ⭐
                        </button>
                    </div>
                </div>
            </div>

            {/* Browser Content */}
            <div className="browser-content">
                <div className="content-placeholder">
                    <div className="placeholder-icon">🌐</div>
                    <h2>Browser View</h2>
                    <p className="text-secondary">Current URL: {activeTab?.url}</p>
                    <div className="info-box glass">
                        <p>
                            <strong>Note:</strong> This is a demo browser interface. To implement actual web
                            browsing, you would need to integrate Electron's BrowserView or webview component.
                        </p>
                        <p style={{ marginTop: '12px' }}>
                            The Google OAuth authentication is fully functional. You are logged in as{' '}
                            <strong>{user.email}</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrowserView;
